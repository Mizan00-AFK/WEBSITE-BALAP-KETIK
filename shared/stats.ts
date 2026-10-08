/**
 * Race math shared by the client, the AI and the server.
 */
import { GAME_CONFIG } from './gameConfig';

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** WPM = (correctCharacters / 5) / elapsedMinutes */
export function calcWpm(correctChars: number, elapsedMs: number): number {
  if (correctChars <= 0) return 0;
  const minutes = Math.max(elapsedMs, 1000) / 60_000;
  return correctChars / 5 / minutes;
}

/** accuracy = correctKeystrokes / totalKeystrokes x 100 */
export function calcAccuracy(correctKeystrokes: number, totalKeystrokes: number): number {
  if (totalKeystrokes <= 0) return 100;
  return (correctKeystrokes / totalKeystrokes) * 100;
}

/**
 * progress = correctCharacters / totalCharacters (max 1.0)
 * Characters typed during nitro add a small bonus distance (`bonusChars`).
 */
export function calcProgress(correctChars: number, bonusChars: number, totalChars: number): number {
  if (totalChars <= 0) return 0;
  return clamp((correctChars + bonusChars) / totalChars, 0, 1);
}

/** Nitro earned when the combo reaches exactly `combo`. */
export function nitroRewardForCombo(combo: number): number {
  const rewards = GAME_CONFIG.nitroRewards;
  for (const reward of rewards) {
    if (reward.combo === combo) return reward.amount;
  }
  const last = rewards[rewards.length - 1].combo;
  if (combo > last && (combo - last) % GAME_CONFIG.nitroRepeatEvery === 0) {
    return GAME_CONFIG.nitroRepeatAmount;
  }
  return 0;
}

export interface RankableRacer {
  id: string;
  slot: number;
  finished: boolean;
  finishPosition: number | null;
  progress: number;
  progressAt: number;
}

/**
 * Live ranking: finished racers by finish order, then by progress,
 * then whoever reached that progress first (lane order when nobody moved yet).
 */
export function compareRacers(a: RankableRacer, b: RankableRacer): number {
  if (a.finished && b.finished) return (a.finishPosition ?? 99) - (b.finishPosition ?? 99);
  if (a.finished) return -1;
  if (b.finished) return 1;
  if (b.progress !== a.progress) return b.progress - a.progress;
  if (a.progress > 0 && a.progressAt !== b.progressAt) return a.progressAt - b.progressAt;
  if (a.slot !== b.slot) return a.slot - b.slot;
  return a.id < b.id ? -1 : 1;
}

export function rankRacers<T extends RankableRacer>(racers: readonly T[]): T[] {
  return [...racers].sort(compareRacers);
}

export function round(value: number, digits = 0): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}
