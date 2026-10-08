/**
 * TypingEngine - pure, framework-free typing logic for one race.
 *
 * On every keypress it:
 *   1. checks the character            5. updates WPM (derived)
 *   2. updates correct characters      6. updates progress
 *   3. updates errors                  7. updates combo
 *   4. updates accuracy                8. updates nitro
 *
 * A wrong key turns the current character red; the player can NOT skip past it -
 * the cursor only advances when the correct key is pressed.
 */
import { GAME_CONFIG } from '@shared/gameConfig';
import { calcAccuracy, calcProgress, calcWpm, nitroRewardForCombo } from '@shared/stats';

export type KeyResultType = 'correct' | 'error' | 'ignored';

export interface KeyResult {
  type: KeyResultType;
  completed: boolean;
  nitroGained: number;
  combo: number;
}

const IGNORED: KeyResult = { type: 'ignored', completed: false, nitroGained: 0, combo: 0 };

/** Mobile keyboards often insert "smart" punctuation - map it back to plain ASCII. */
const CHAR_ALIASES: Record<string, string> = {
  ' ': ' ',
  '‘': "'",
  '’': "'",
  '‚': "'",
  '“': '"',
  '”': '"',
  '–': '-',
  '—': '-',
};

export function normalizeTypedChar(ch: string): string {
  return CHAR_ALIASES[ch] ?? ch;
}

export class TypingEngine {
  readonly text: string;
  readonly total: number;

  /** Index of the next character = number of correct characters. */
  pos = 0;
  errorActive = false;
  errorTick = 0;
  keystrokes = 0;
  correctKeystrokes = 0;
  errors = 0;
  combo = 0;
  maxCombo = 0;
  nitro = 0;
  nitroUsed = 0;
  nitroActiveUntil = 0;
  /** Extra distance earned while nitro is active. */
  bonusChars = 0;
  startTime = 0;
  finishTime: number | null = null;
  completed = false;
  /** Increments on every change (used to throttle network updates). */
  version = 0;

  constructor(text: string) {
    this.text = text;
    this.total = text.length;
  }

  start(startTime: number): void {
    this.startTime = startTime;
  }

  get correctChars(): number {
    return this.pos;
  }

  /** progress = correctCharacters / totalCharacters (+ small nitro bonus), max 1.0 */
  get progress(): number {
    return this.completed ? 1 : calcProgress(this.pos, this.bonusChars, this.total);
  }

  input(raw: string, now: number): KeyResult {
    if (this.completed || raw.length === 0) return IGNORED;
    const ch = normalizeTypedChar(raw);
    this.keystrokes += 1;
    this.version += 1;

    if (ch === this.text[this.pos]) {
      this.correctKeystrokes += 1;
      this.pos += 1;
      this.errorActive = false;
      this.combo += 1;
      this.maxCombo = Math.max(this.maxCombo, this.combo);

      let gained = 0;
      const reward = nitroRewardForCombo(this.combo);
      if (reward > 0) {
        const before = this.nitro;
        this.nitro = Math.min(GAME_CONFIG.nitroMax, this.nitro + reward);
        gained = this.nitro - before;
      }
      if (now < this.nitroActiveUntil) this.bonusChars += GAME_CONFIG.nitroMultiplier - 1;

      if (this.pos >= this.total || this.pos + this.bonusChars >= this.total) {
        this.completed = true;
        this.finishTime = now;
      }
      return { type: 'correct', completed: this.completed, nitroGained: gained, combo: this.combo };
    }

    this.errors += 1;
    this.combo = 0;
    this.errorActive = true;
    this.errorTick += 1;
    return { type: 'error', completed: false, nitroGained: 0, combo: 0 };
  }

  /** Backspace only clears the red error marker (correct characters stay locked). */
  backspace(): void {
    if (this.errorActive) {
      this.errorActive = false;
      this.version += 1;
    }
  }

  isNitroActive(now: number): boolean {
    return now < this.nitroActiveUntil;
  }

  canUseNitro(now: number): boolean {
    return !this.completed && this.nitro >= GAME_CONFIG.nitroCost && !this.isNitroActive(now);
  }

  useNitro(now: number): boolean {
    if (!this.canUseNitro(now)) return false;
    this.nitro -= GAME_CONFIG.nitroCost;
    this.nitroUsed += 1;
    this.nitroActiveUntil = now + GAME_CONFIG.nitroDuration;
    this.version += 1;
    return true;
  }

  wpm(now: number): number {
    if (!this.startTime) return 0;
    return calcWpm(this.pos, (this.finishTime ?? now) - this.startTime);
  }

  accuracy(): number {
    return calcAccuracy(this.correctKeystrokes, this.keystrokes);
  }

  /** Correctly typed part of the current word (what the input box should show). */
  committedWord(): string {
    const start = this.text.lastIndexOf(' ', this.pos - 1) + 1;
    return this.text.slice(start, this.pos);
  }
}
