import type {
  Difficulty,
  RaceResultPayload,
  TextCategory,
  TextCategoryChoice,
  TextDifficulty,
  TextDifficultyChoice,
  TextLength,
  TextLengthChoice,
} from '@shared/types';

/** solo = lawan AI, multi = online, practice = latihan tanpa lawan. */
export type RaceMode = 'solo' | 'multi' | 'practice';
export type RacePhase = 'countdown' | 'racing' | 'finished';

export interface RacerInfo {
  id: string;
  name: string;
  motorcycleId: string;
  slot: number;
  isBot: boolean;
  difficulty: Difficulty | null;
  isLocal: boolean;
}

/** Everything needed to start the race screen (solo, multiplayer or practice). */
export interface RaceSetup {
  /** Unique per race - the race screen remounts when it changes. */
  id: string;
  mode: RaceMode;
  text: string;
  textId: number;
  category: TextCategory;
  textDifficulty: TextDifficulty;
  textLength: TextLength;
  trackId: string;
  /** Timestamp (ms) of "GAS!" - server time in multiplayer, local time otherwise. */
  startAt: number;
  /** Time limit of the race (ms). */
  timeLimitMs: number;
  racers: RacerInfo[];
  localPlayerId: string;
  roomCode: string | null;
  raceNumber: number;
}

/** Pilihan teks (kategori, tingkat kesulitan, panjang). */
export interface TextOptionsValue {
  category: TextCategoryChoice;
  textDifficulty: TextDifficultyChoice;
  textLength: TextLengthChoice;
}

export interface SoloConfig extends TextOptionsValue {
  nickname: string;
  motorcycleId: string;
  difficulty: Difficulty;
  opponents: number;
  trackId: string;
}

export interface PracticeConfig extends TextOptionsValue {
  nickname: string;
  motorcycleId: string;
  trackId: string;
}

/** Live state of one racer on the client. */
export interface LiveRacer extends RacerInfo {
  progress: number;
  correctChars: number;
  wpm: number;
  accuracy: number;
  errors: number;
  combo: number;
  maxCombo: number;
  nitro: number;
  nitroUsed: number;
  nitroActiveUntil: number;
  finished: boolean;
  finishTime: number | null;
  finishPosition: number | null;
  progressAt: number;
  connected: boolean;
  left: boolean;
}

export interface HudSnapshot {
  wpm: number;
  accuracy: number;
  errors: number;
  combo: number;
  maxCombo: number;
  nitro: number;
  nitroActive: boolean;
  nitroReady: boolean;
  progress: number;
  elapsedMs: number;
  timeLeftMs: number;
  position: number;
  totalRacers: number;
}

export interface TypingView {
  pos: number;
  errorActive: boolean;
  /** Increments on every mistake (re-triggers the shake animation). */
  errorTick: number;
  completed: boolean;
}

export interface RaceResult extends RaceResultPayload {
  mode: RaceMode;
  localPlayerId: string;
}
