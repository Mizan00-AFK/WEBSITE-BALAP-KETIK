/**
 * AI typing racer - NO machine learning.
 *
 * The AI only simulates how a human types:
 *  - a base WPM picked from the difficulty range
 *  - the speed drifts up and down every 1-2.6 s so it does not look robotic
 *  - every keystroke has a chance to be wrong (accuracy range); a mistake costs
 *    a short "notice & fix" pause and resets the combo
 *  - combos earn nitro exactly like a human player, and the AI fires nitro
 *    after a random delay once it has enough
 *
 * Progress is always derived from the simulated typing (characters / text length).
 * Used by solo mode (client) and by AI bots in multiplayer rooms (server).
 */
import { GAME_CONFIG } from './gameConfig';
import { calcAccuracy, calcProgress, calcWpm, clamp, nitroRewardForCombo } from './stats';
import type { Difficulty } from './types';

export interface AIProfile {
  label: string;
  description: string;
  /** WPM range [min, max]. */
  wpm: readonly [number, number];
  /** Accuracy range [min, max] as 0..1. */
  accuracy: readonly [number, number];
}

export const AI_PROFILES: Record<Difficulty, AIProfile> = {
  easy: { label: 'MUDAH', description: 'Pembalap santai', wpm: [25, 35], accuracy: [0.9, 0.94] },
  normal: { label: 'SEDANG', description: 'Pembalap akhir pekan', wpm: [40, 50], accuracy: [0.93, 0.96] },
  hard: { label: 'SULIT', description: 'Langganan sirkuit', wpm: [55, 70], accuracy: [0.95, 0.98] },
  expert: { label: 'AHLI', description: 'Juara kejuaraan', wpm: [75, 100], accuracy: [0.97, 0.99] },
};

export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard', 'expert'];

export function isValidDifficulty(value: unknown): value is Difficulty {
  return typeof value === 'string' && (DIFFICULTIES as readonly string[]).includes(value);
}

export const AI_NAMES: readonly string[] = [
  'GARUDA',
  'KOMODO',
  'RAJAWALI',
  'HARIMAU',
  'BADAI',
  'KILAT',
  'PETIR',
  'ELANG',
  'TOPAN',
  'BANTENG',
  'MERAPI',
  'BAYU',
];

/** Average pause (ms) an AI needs to notice and fix a typo. */
const ERROR_PAUSE_MIN = 160;
const ERROR_PAUSE_MAX = 380;
const ERROR_PAUSE_AVG = (ERROR_PAUSE_MIN + ERROR_PAUSE_MAX) / 2;

type Rng = () => number;

function between(min: number, max: number, rng: Rng): number {
  return min + (max - min) * rng();
}

/** Normal distribution sample (Box-Muller). */
function gaussian(rng: Rng): number {
  const u = Math.max(rng(), 1e-9);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export type AIEvent = 'error' | 'nitro' | 'finish';

export class AITypist {
  readonly baseWpm: number;
  readonly accuracyTarget: number;

  elapsedMs = 0;
  correctChars = 0;
  bonusChars = 0;
  keystrokes = 0;
  correctKeystrokes = 0;
  errors = 0;
  combo = 0;
  maxCombo = 0;
  nitro = 0;
  nitroUsed = 0;
  finished = false;
  finishTime: number | null = null;

  private currentWpm: number;
  private targetWpm: number;
  private nextVariationIn: number;
  private reactionDelay: number;
  private readonly initialReaction: number;
  private pauseMs = 0;
  private budget = 0;
  private nitroActiveMs = 0;
  private nitroDecisionIn = -1;

  constructor(
    readonly totalChars: number,
    readonly difficulty: Difficulty,
    private readonly rng: Rng = Math.random,
  ) {
    const profile = AI_PROFILES[difficulty];
    // Base speed from the inner part of the range, so the natural speed swings
    // still end the race inside the advertised WPM range.
    const margin = (profile.wpm[1] - profile.wpm[0]) * 0.1;
    this.baseWpm = between(profile.wpm[0] + margin, profile.wpm[1] - margin, rng);
    this.accuracyTarget = between(profile.accuracy[0], profile.accuracy[1], rng);
    this.currentWpm = this.baseWpm * between(0.92, 1, rng);
    this.targetWpm = this.baseWpm;
    this.nextVariationIn = between(800, 2000, rng);
    // Human reaction time after "GO!"
    this.reactionDelay = between(250, 700, rng);
    this.initialReaction = this.reactionDelay;
  }

  get progress(): number {
    return calcProgress(this.correctChars, this.bonusChars, this.totalChars);
  }

  get wpm(): number {
    return calcWpm(this.correctChars, this.finishTime ?? this.elapsedMs);
  }

  get accuracy(): number {
    return calcAccuracy(this.correctKeystrokes, this.keystrokes);
  }

  get nitroActive(): boolean {
    return this.nitroActiveMs > 0;
  }

  get nitroRemainingMs(): number {
    return this.nitroActiveMs;
  }

  /**
   * Burst speed (keystrokes per ms). It is a bit faster than the current WPM so
   * that, after the typo pauses and the reaction time at the start, the measured
   * WPM lands on the current WPM.
   *
   *   net time per correct char = msPerKey * (1/p + q/4) + q * pause
   *   (1/p keys per correct char, q = typos per correct char, each typo also
   *    wastes ~a quarter keystroke of budget and a "notice & fix" pause)
   */
  private keysPerMs(): number {
    const p = this.accuracyTarget;
    const q = (1 - p) / p;
    const netMsPerChar = 60_000 / (this.currentWpm * 5) - this.initialReaction / this.totalChars;
    const msPerKey = Math.max(25, (netMsPerChar - q * ERROR_PAUSE_AVG) / (1 / p + q / 4));
    return 1 / msPerKey;
  }

  private activateNitro(): void {
    this.nitro = Math.max(0, this.nitro - GAME_CONFIG.nitroCost);
    this.nitroUsed += 1;
    this.nitroActiveMs = GAME_CONFIG.nitroDuration;
    this.nitroDecisionIn = -1;
  }

  /** Advances the simulation by `dtMs` and returns what happened. */
  step(dtMs: number): AIEvent[] {
    const events: AIEvent[] = [];
    if (this.finished || dtMs <= 0) return events;

    this.elapsedMs += dtMs;
    if (this.nitroActiveMs > 0) this.nitroActiveMs = Math.max(0, this.nitroActiveMs - dtMs);

    // Natural speed variation (e.g. base 65 -> 61, 68, 64, 70, 63 ...)
    this.nextVariationIn -= dtMs;
    if (this.nextVariationIn <= 0) {
      const swing = clamp(gaussian(this.rng) * 0.06, -0.14, 0.14);
      this.targetWpm = this.baseWpm * (1 + swing);
      this.nextVariationIn = between(1000, 2600, this.rng);
    }
    this.currentWpm += (this.targetWpm - this.currentWpm) * Math.min(1, dtMs / 700);

    // Fire nitro after a short "human" hesitation once enough is stored.
    if (!this.nitroActive && this.nitro >= GAME_CONFIG.nitroCost) {
      if (this.nitroDecisionIn < 0) this.nitroDecisionIn = between(300, 2500, this.rng);
      this.nitroDecisionIn -= dtMs;
      if (this.nitroDecisionIn <= 0) {
        this.activateNitro();
        events.push('nitro');
      }
    }

    let available = dtMs;
    if (this.reactionDelay > 0) {
      const used = Math.min(available, this.reactionDelay);
      this.reactionDelay -= used;
      available -= used;
    }
    if (this.pauseMs > 0) {
      const used = Math.min(available, this.pauseMs);
      this.pauseMs -= used;
      available -= used;
    }
    if (available <= 0) return events;

    this.budget += available * this.keysPerMs();
    while (this.budget >= 1 && !this.finished) {
      this.budget -= 1;
      this.keystrokes += 1;

      if (this.rng() < this.accuracyTarget) {
        this.correctKeystrokes += 1;
        this.correctChars += 1;
        this.combo += 1;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        if (this.nitroActive) this.bonusChars += GAME_CONFIG.nitroMultiplier - 1;
        const gain = nitroRewardForCombo(this.combo);
        if (gain > 0) this.nitro = Math.min(GAME_CONFIG.nitroMax, this.nitro + gain);

        if (this.correctChars + this.bonusChars >= this.totalChars || this.correctChars >= this.totalChars) {
          this.finished = true;
          this.finishTime = this.elapsedMs;
          events.push('finish');
        }
      } else {
        this.errors += 1;
        this.combo = 0;
        this.pauseMs = between(ERROR_PAUSE_MIN, ERROR_PAUSE_MAX, this.rng);
        this.budget = 0;
        events.push('error');
        break;
      }
    }
    return events;
  }
}
