/**
 * Types shared by client and server (DTOs + Socket.IO event contracts).
 * Everything here is plain data - nothing is ever written to a database.
 */

export type Difficulty = 'easy' | 'normal' | 'hard' | 'expert';

export type RoomStatus = 'waiting' | 'countdown' | 'racing' | 'finished';

import type {
  TextCategory,
  TextCategoryChoice,
  TextDifficulty,
  TextDifficultyChoice,
  TextLength,
  TextLengthChoice,
} from '../client/src/data/typingTexts';

export type {
  TextCategory,
  TextCategoryChoice,
  TextDifficulty,
  TextDifficultyChoice,
  TextLength,
  TextLengthChoice,
} from '../client/src/data/typingTexts';

/** A player as everybody in the room sees it. */
export interface PublicPlayer {
  id: string;
  name: string;
  motorcycleId: string;
  /** Lane / colour slot (0..3). */
  slot: number;
  isHost: boolean;
  isBot: boolean;
  difficulty: Difficulty | null;
  ready: boolean;
  connected: boolean;
}

/** A room as everybody in the room sees it. */
export interface PublicRoom {
  code: string;
  hostId: string;
  maxPlayers: number;
  status: RoomStatus;
  players: PublicPlayer[];
  /** Pilihan teks dari host (server memilih teksnya). */
  category: TextCategoryChoice;
  textDifficulty: TextDifficultyChoice;
  textLength: TextLengthChoice;
  trackId: string;
  raceNumber: number;
}

/** A racer taking part in one race. */
export interface RaceParticipant {
  id: string;
  name: string;
  motorcycleId: string;
  slot: number;
  isBot: boolean;
  difficulty: Difficulty | null;
}

/** Sent by the server when a race is announced (countdown starts). */
export interface RaceSnapshot {
  roomCode: string;
  raceNumber: number;
  textId: number;
  category: TextCategory;
  textDifficulty: TextDifficulty;
  textLength: TextLength;
  text: string;
  trackId: string;
  /** Server timestamp (ms) when typing is allowed ("GAS!"). */
  startAt: number;
  /** Time limit of this race (ms) - longer texts get more time. */
  timeLimitMs: number;
  /** Server timestamp (ms) when this payload was created. */
  serverNow: number;
  participants: RaceParticipant[];
}

/** Live race state of one player (server -> clients, ~15x per second). */
export interface RacePlayerState {
  id: string;
  progress: number;
  correctChars: number;
  wpm: number;
  accuracy: number;
  errors: number;
  combo: number;
  maxCombo: number;
  nitro: number;
  nitroUsed: number;
  /** Server timestamp until which nitro is active (0 = not active). */
  nitroActiveUntil: number;
  finished: boolean;
  finishTime: number | null;
  finishPosition: number | null;
  /** Server timestamp of the last progress change (tie breaker). */
  progressAt: number;
  connected: boolean;
}

export interface RaceResultEntry {
  id: string;
  name: string;
  motorcycleId: string;
  slot: number;
  isBot: boolean;
  difficulty: Difficulty | null;
  position: number;
  finished: boolean;
  /** Race time in ms (null = did not finish). */
  finishTime: number | null;
  progress: number;
  wpm: number;
  accuracy: number;
  errors: number;
  maxCombo: number;
  nitroUsed: number;
}

export interface RaceResultPayload {
  roomCode: string | null;
  raceNumber: number;
  textId: number;
  category: TextCategory;
  textDifficulty: TextDifficulty;
  textLength: number;
  trackId: string;
  /** Race duration in ms. */
  duration: number;
  entries: RaceResultEntry[];
}

export type ErrorCode =
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'RACE_STARTED'
  | 'RACE_FINISHED'
  | 'INVALID_NICKNAME'
  | 'INVALID_ROOM_CODE'
  | 'INVALID_PAYLOAD'
  | 'INVALID_PROGRESS'
  | 'INVALID_FINISH'
  | 'INVALID_MOTORCYCLE'
  | 'NOT_IN_ROOM'
  | 'NOT_HOST'
  | 'NOT_READY'
  | 'NOT_ENOUGH_PLAYERS'
  | 'PLAYER_DISCONNECTED'
  | 'NITRO_UNAVAILABLE'
  | 'SESSION_EXPIRED'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR';

export interface ServerError {
  code: ErrorCode;
  message: string;
}

export interface CreateRoomPayload {
  nickname: string;
  motorcycleId: string;
  maxPlayers: number;
}

export interface JoinRoomPayload {
  code: string;
  nickname: string;
  motorcycleId: string;
}

export interface RejoinRoomPayload {
  code: string;
  playerId: string;
  token: string;
}

export interface RoomSettingsPayload {
  category: TextCategoryChoice;
  textDifficulty: TextDifficultyChoice;
  textLength: TextLengthChoice;
  trackId: string;
}

export interface ProgressPayload {
  correctChars: number;
  bonusChars: number;
  wpm: number;
  accuracy: number;
  errors: number;
  combo: number;
  maxCombo: number;
  nitro: number;
}

export type FinishPayload = ProgressPayload;

/** Sent to a client that created / joined / re-joined a room. */
export interface SessionPayload {
  room: PublicRoom;
  playerId: string;
  /** Secret used to re-join after a short disconnect (session only). */
  token: string;
  /** Present when the room is currently counting down or racing. */
  race: RaceSnapshot | null;
}

export type LeaveReason = 'left' | 'timeout' | 'removed';

export interface ClientToServerEvents {
  create_room: (payload: CreateRoomPayload) => void;
  join_room: (payload: JoinRoomPayload) => void;
  rejoin_room: (payload: RejoinRoomPayload) => void;
  leave_room: () => void;
  player_ready: (payload: { ready: boolean }) => void;
  add_bot: (payload: { difficulty: Difficulty }) => void;
  remove_bot: (payload: { playerId: string }) => void;
  update_room_settings: (payload: RoomSettingsPayload) => void;
  start_race: () => void;
  player_progress: (payload: ProgressPayload) => void;
  use_nitro: () => void;
  player_finished: (payload: FinishPayload) => void;
  restart_race: () => void;
  time_sync: (clientTime: number, ack: (serverTime: number) => void) => void;
}

export interface ServerToClientEvents {
  room_created: (payload: SessionPayload) => void;
  room_joined: (payload: SessionPayload) => void;
  room_updated: (payload: { room: PublicRoom }) => void;
  player_joined: (payload: { player: PublicPlayer }) => void;
  player_left: (payload: { playerId: string; name: string; reason: LeaveReason }) => void;
  notice: (payload: { message: string; tone: 'info' | 'success' | 'warning' }) => void;
  race_countdown: (payload: RaceSnapshot) => void;
  /** Repeats the server-chosen text so every racer types exactly the same text. */
  race_started: (payload: { startAt: number; serverNow: number; textId: number; text: string }) => void;
  player_updated: (payload: { serverNow: number; players: RacePlayerState[] }) => void;
  nitro_activated: (payload: { playerId: string; until: number; serverNow: number }) => void;
  player_finished: (payload: { playerId: string; position: number; finishTime: number }) => void;
  race_finished: (payload: { result: RaceResultPayload }) => void;
  room_closed: (payload: { reason: string }) => void;
  error: (payload: ServerError) => void;
}
