/**
 * GAME_CONFIG - the single source of truth for gameplay tuning.
 *
 * This file is imported by BOTH the client (React + Phaser) and the server
 * (Socket.IO). Change a value here and both sides follow. Do not hard-code
 * these numbers anywhere else.
 */
export const GAME_CONFIG = {
  /** Room size limits. */
  maxPlayers: 4,
  minPlayers: 2,

  /** Countdown numbers shown after "READY" (3, 2, 1). */
  countdown: 3,
  /** How long "SIAP" (ready) is shown before the numbers start (ms). */
  readyDuration: 1200,
  /** How long "GAS!" (go) stays on screen after the start (ms). */
  goDuration: 700,

  /** Time limit of one race (seconds) for normal texts. */
  maxRaceTime: 120,
  /** Long "maraton" texts get more time: at least textLength / minCharsPerSecond. */
  minCharsPerSecond: 2,
  /** Absolute upper limit for any race (seconds). */
  maxRaceTimeCap: 300,

  /** Client -> server progress updates per second. */
  socketUpdateRate: 15,
  /** Server -> clients state broadcasts per second. */
  serverTickRate: 15,

  /** Nitro. */
  nitroDuration: 1500,
  /** While nitro is active every correct character counts this many times. */
  nitroMultiplier: 1.5,
  nitroMax: 100,
  /** Nitro needed (and consumed) per boost. */
  nitroCost: 50,
  /** Keyboard key that fires nitro (SPACE is part of the text, so ENTER is used). */
  nitroKey: 'Enter',
  /** Combo milestones that award nitro. */
  nitroRewards: [
    { combo: 10, amount: 10 },
    { combo: 25, amount: 10 },
    { combo: 50, amount: 20 },
  ],
  /** After the last milestone, every N extra combo awards `nitroRepeatAmount`. */
  nitroRepeatEvery: 25,
  nitroRepeatAmount: 20,

  /** Rooms with no activity for this long are removed from memory (ms). */
  roomTimeout: 600_000,
  /** A disconnected player is removed after this grace period (ms). */
  disconnectTimeout: 20_000,
  /** How often the server scans for stale rooms (ms). */
  roomCleanupInterval: 30_000,

  /** Nickname rules. */
  nicknameMin: 2,
  nicknameMax: 16,
  roomCodeLength: 6,

  /** Solo mode: number of AI opponents. */
  soloOpponentsMin: 1,
  soloOpponentsMax: 3,
  soloOpponentsDefault: 3,

  /** Anti-cheat: fastest plausible human typing speed (WPM). */
  maxPlausibleWpm: 250,
  /** Extra characters tolerated on top of the plausible speed (network bursts). */
  progressBurstChars: 12,
  /** Socket.IO limits. */
  maxProgressUpdatesPerSecond: 30,
  maxEventsPerSecond: 12,
  maxPayloadBytes: 8_192,
} as const;

/**
 * Player identity colours (UI + lane identification only).
 * Slot 0 = Player 1, slot 1 = Player 2, ...
 */
export const PLAYER_COLORS = [
  { name: 'Cyan', hex: '#22d3ee', value: 0x22d3ee },
  { name: 'Orange', hex: '#fb923c', value: 0xfb923c },
  { name: 'Purple', hex: '#a855f7', value: 0xa855f7 },
  { name: 'Green', hex: '#22c55e', value: 0x22c55e },
] as const;

export function playerColor(slot: number) {
  return PLAYER_COLORS[((slot % PLAYER_COLORS.length) + PLAYER_COLORS.length) % PLAYER_COLORS.length];
}

/** Total countdown length from the moment the server announces the race (ms). */
export const COUNTDOWN_TOTAL_MS = GAME_CONFIG.readyDuration + GAME_CONFIG.countdown * 1000;

/** Fastest plausible typing speed in characters per second. */
export const MAX_PLAUSIBLE_CPS = (GAME_CONFIG.maxPlausibleWpm * 5) / 60;

/** Race time limit (ms) for a text: 120 s, or more for very long texts (max 300 s). */
export function raceTimeLimitMs(textLength: number): number {
  const needed = Math.ceil(textLength / GAME_CONFIG.minCharsPerSecond);
  return Math.min(GAME_CONFIG.maxRaceTimeCap, Math.max(GAME_CONFIG.maxRaceTime, needed)) * 1000;
}
