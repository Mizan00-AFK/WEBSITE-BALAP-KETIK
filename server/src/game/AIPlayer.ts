/**
 * AI bot that can fill an empty slot in a multiplayer room.
 * It wraps the shared AITypist simulation (no machine learning - just a
 * human-like typing simulation based on WPM and accuracy ranges).
 */
import { AI_NAMES, AITypist, type AIEvent } from '@shared/ai';
import type { Difficulty } from '@shared/types';

export class AIPlayer {
  private readonly typist: AITypist;

  constructor(totalChars: number, difficulty: Difficulty) {
    this.typist = new AITypist(totalChars, difficulty);
  }

  step(dtMs: number): AIEvent[] {
    return this.typist.step(dtMs);
  }

  get state() {
    const t = this.typist;
    return {
      correctChars: t.correctChars,
      bonusChars: t.bonusChars,
      progress: t.progress,
      wpm: t.wpm,
      accuracy: t.accuracy,
      errors: t.errors,
      combo: t.combo,
      maxCombo: t.maxCombo,
      nitro: t.nitro,
      nitroUsed: t.nitroUsed,
      nitroRemainingMs: t.nitroRemainingMs,
      finished: t.finished,
      /** Race time (ms since GO) when the bot crossed the line. */
      finishTime: t.finishTime,
      elapsedMs: t.elapsedMs,
    };
  }
}

/** Picks a bot name that is not used in the room yet. */
export function pickBotName(takenNames: Set<string>): string {
  const free = AI_NAMES.filter((name) => !takenNames.has(`AI ${name}`.toLowerCase()));
  const pool = free.length > 0 ? free : AI_NAMES;
  return `AI ${pool[Math.floor(Math.random() * pool.length)]}`;
}
