/**
 * Session store (Zustand).
 *
 *   currentPlayer -> nickname, motorcycleId, roomSession (temporary id + token)
 *   currentRoom   -> room
 *   currentRace   -> race, lastResult
 *   settings      -> sound on/off + volume
 *   sessionStats  -> statistik sementara (WPM terbaik, rata-rata, akurasi, balapan, menang)
 *
 * Storage rules (NO database, NO accounts):
 *   - sessionStorage: nickname, motorcycle, temporary room session and the session
 *     statistics. Closing the tab / leaving the website forgets everything.
 *   - localStorage: ONLY simple preferences (sound + volume).
 */
import { create } from 'zustand';
import { DEFAULT_MOTORCYCLE_ID, isValidMotorcycle } from '@shared/motorcycles';
import type { PublicRoom, ServerError } from '@shared/types';
import type { PracticeConfig, RaceResult, RaceSetup, SoloConfig } from '../types/Race';
import type { RoomSession } from '../types/Room';

const SESSION_KEY = 'balap-ketik:session';
const SETTINGS_KEY = 'balap-ketik:settings';

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'offline';
export type ToastTone = 'info' | 'success' | 'warning' | 'error';
export type PendingAction = 'create' | 'join' | 'rejoin' | null;

export interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

export interface Settings {
  soundOn: boolean;
  volume: number;
}

/** Statistik sesi - hanya hidup selama website dibuka (tidak ada database). */
export interface SessionStats {
  races: number;
  wins: number;
  bestWpm: number;
  totalWpm: number;
  bestAccuracy: number;
  /** Ids of the races already counted (prevents double counting). */
  recorded: string[];
}

const EMPTY_STATS: SessionStats = { races: 0, wins: 0, bestWpm: 0, totalWpm: 0, bestAccuracy: 0, recorded: [] };

interface SessionData {
  nickname: string;
  motorcycleId: string;
  roomSession: RoomSession | null;
  sessionStats: SessionStats;
}

function readJson<T>(storage: () => Storage, key: string): Partial<T> {
  try {
    const raw = storage().getItem(key);
    return raw ? (JSON.parse(raw) as Partial<T>) : {};
  } catch {
    return {};
  }
}

function writeJson(storage: () => Storage, key: string, value: unknown): void {
  try {
    storage().setItem(key, JSON.stringify(value));
  } catch {
    // storage may be unavailable (private mode) - the game still works without it
  }
}

const savedSession = readJson<SessionData>(() => sessionStorage, SESSION_KEY);
const savedSettings = readJson<Settings>(() => localStorage, SETTINGS_KEY);

function restoreStats(value: unknown): SessionStats {
  if (!value || typeof value !== 'object') return EMPTY_STATS;
  const v = value as Partial<SessionStats>;
  const num = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : 0);
  return {
    races: num(v.races),
    wins: num(v.wins),
    bestWpm: num(v.bestWpm),
    totalWpm: num(v.totalWpm),
    bestAccuracy: num(v.bestAccuracy),
    recorded: Array.isArray(v.recorded) ? v.recorded.filter((id) => typeof id === 'string').slice(-50) : [],
  };
}

interface GameStore {
  nickname: string;
  motorcycleId: string;
  roomSession: RoomSession | null;
  settings: Settings;
  connection: ConnectionState;
  room: PublicRoom | null;
  race: RaceSetup | null;
  soloConfig: SoloConfig | null;
  practiceConfig: PracticeConfig | null;
  lastResult: RaceResult | null;
  sessionStats: SessionStats;
  pending: PendingAction;
  lastError: (ServerError & { at: number }) | null;
  toasts: Toast[];

  setNickname: (nickname: string) => void;
  setMotorcycle: (motorcycleId: string) => void;
  setSettings: (settings: Partial<Settings>) => void;
  setConnection: (connection: ConnectionState) => void;
  setRoomSession: (session: RoomSession | null) => void;
  setRoom: (room: PublicRoom | null) => void;
  setRace: (race: RaceSetup | null) => void;
  setSoloConfig: (config: SoloConfig) => void;
  setPracticeConfig: (config: PracticeConfig) => void;
  setLastResult: (result: RaceResult | null) => void;
  /** Counts a finished race in the session statistics (once per race id). */
  recordResult: (raceId: string, result: RaceResult) => void;
  setPending: (pending: PendingAction) => void;
  setLastError: (error: ServerError | null) => void;
  /** Forget the multiplayer room (after leaving / room closed). */
  clearRoom: () => void;
  pushToast: (message: string, tone?: ToastTone) => void;
  dismissToast: (id: number) => void;
}

let toastId = 0;

export const useGameStore = create<GameStore>((set, get) => ({
  nickname: typeof savedSession.nickname === 'string' ? savedSession.nickname : '',
  motorcycleId: isValidMotorcycle(savedSession.motorcycleId) ? savedSession.motorcycleId : DEFAULT_MOTORCYCLE_ID,
  roomSession: savedSession.roomSession ?? null,
  settings: {
    soundOn: typeof savedSettings.soundOn === 'boolean' ? savedSettings.soundOn : true,
    volume: typeof savedSettings.volume === 'number' ? Math.min(1, Math.max(0, savedSettings.volume)) : 0.6,
  },
  connection: 'idle',
  room: null,
  race: null,
  soloConfig: null,
  practiceConfig: null,
  lastResult: null,
  sessionStats: restoreStats(savedSession.sessionStats),
  pending: null,
  lastError: null,
  toasts: [],

  setNickname: (nickname) => set({ nickname }),
  setMotorcycle: (motorcycleId) => set({ motorcycleId }),
  setSettings: (settings) => set({ settings: { ...get().settings, ...settings } }),
  setConnection: (connection) => set({ connection }),
  setRoomSession: (roomSession) => set({ roomSession }),
  setRoom: (room) => set({ room }),
  setRace: (race) => set({ race }),
  setSoloConfig: (soloConfig) => set({ soloConfig }),
  setPracticeConfig: (practiceConfig) => set({ practiceConfig }),
  setLastResult: (lastResult) => set({ lastResult }),
  recordResult: (raceId, result) => {
    const stats = get().sessionStats;
    if (stats.recorded.includes(raceId)) return;
    const me = result.entries.find((e) => e.id === result.localPlayerId);
    if (!me) return;
    const won = result.mode !== 'practice' && result.entries.length > 1 && me.position === 1;
    set({
      sessionStats: {
        races: stats.races + 1,
        wins: stats.wins + (won ? 1 : 0),
        bestWpm: Math.max(stats.bestWpm, me.wpm),
        totalWpm: stats.totalWpm + me.wpm,
        bestAccuracy: Math.max(stats.bestAccuracy, me.accuracy),
        recorded: [...stats.recorded, raceId].slice(-50),
      },
    });
  },
  setPending: (pending) => set({ pending }),
  setLastError: (error) => set({ lastError: error ? { ...error, at: Date.now() } : null }),
  clearRoom: () => {
    const race = get().race;
    set({ roomSession: null, room: null, race: race?.mode === 'multi' ? null : race, pending: null });
  },
  pushToast: (message, tone = 'info') => {
    const id = ++toastId;
    set({ toasts: [...get().toasts.slice(-3), { id, message, tone }] });
    window.setTimeout(() => get().dismissToast(id), tone === 'error' ? 5000 : 3600);
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

// Persist only the allowed, session-scoped data.
useGameStore.subscribe((state, prev) => {
  if (
    state.nickname !== prev.nickname ||
    state.motorcycleId !== prev.motorcycleId ||
    state.roomSession !== prev.roomSession ||
    state.sessionStats !== prev.sessionStats
  ) {
    writeJson(() => sessionStorage, SESSION_KEY, {
      nickname: state.nickname,
      motorcycleId: state.motorcycleId,
      roomSession: state.roomSession,
      sessionStats: state.sessionStats,
    } satisfies SessionData);
  }
  if (state.settings !== prev.settings) {
    writeJson(() => localStorage, SETTINGS_KEY, state.settings);
  }
});
