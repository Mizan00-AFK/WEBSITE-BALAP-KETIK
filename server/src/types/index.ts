/**
 * Server-side (in-memory) game state. Nothing here is persisted anywhere:
 * when the process restarts every room disappears - by design.
 */
import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  Difficulty,
  RoomStatus,
  ServerToClientEvents,
  TextCategory,
  TextCategoryChoice,
  TextDifficulty,
  TextDifficultyChoice,
  TextLength,
  TextLengthChoice,
} from '@shared/types';
import type { AIPlayer } from '../game/AIPlayer';
import type { RateLimiter } from '../utils/rateLimiter';

export interface Player {
  id: string;
  /** Secret that lets the same browser re-join after a short disconnect. */
  token: string;
  name: string;
  motorcycleId: string;
  slot: number;
  isBot: boolean;
  difficulty: Difficulty | null;
  socketId: string | null;
  connected: boolean;
  ready: boolean;
  joinedAt: number;
  disconnectTimer: NodeJS.Timeout | null;

  // ---- race state (reset before every race) ----
  progress: number;
  correctChars: number;
  /** Highest character count the client has claimed (may be ahead of the validated value). */
  claimedChars: number;
  bonusChars: number;
  claimedBonus: number;
  /** Token bucket used to validate typing speed. */
  charAllowance: number;
  lastUpdateAt: number;
  wpm: number;
  accuracy: number;
  errors: number;
  combo: number;
  maxCombo: number;
  nitro: number;
  nitroUsed: number;
  nitroActiveUntil: number;
  finished: boolean;
  /** Client said it finished; the server finishes it once validation catches up. */
  pendingFinish: boolean;
  finishTime: number | null;
  finishPosition: number | null;
  progressAt: number;
  ai: AIPlayer | null;
}

export interface Room {
  /** The room id is the shareable room code, e.g. "AB12CD". */
  id: string;
  hostId: string;
  maxPlayers: number;
  status: RoomStatus;
  players: Map<string, Player>;
  /** Host settings: which kind of text the server should pick. */
  category: TextCategoryChoice;
  textDifficulty: TextDifficultyChoice;
  textLength: TextLengthChoice;
  trackId: string;
  /** The text chosen by the server for the current race (same for everybody). */
  text: string;
  textId: number;
  textCategory: TextCategory;
  textDifficultyActual: TextDifficulty;
  textLengthActual: TextLength;
  raceNumber: number;
  startTime: number | null;
  timeLimitMs: number;
  finishOrder: string[];
  createdAt: number;
  lastActivity: number;
  dirty: boolean;
  lastTickAt: number;
  timers: {
    countdown: NodeJS.Timeout | null;
    tick: NodeJS.Timeout | null;
  };
}

export interface SocketData {
  playerId: string | null;
  roomCode: string | null;
  limiter: RateLimiter;
}

export type InterServerEvents = Record<string, never>;

export type GameServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
export type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
