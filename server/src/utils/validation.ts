/**
 * Defensive helpers for untrusted Socket.IO payloads.
 */
import type { ErrorCode, ProgressPayload } from '@shared/types';
import type { GameSocket } from '../types';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  if (!isFiniteNumber(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (!isFiniteNumber(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

/** Validates the shape of a progress/finish payload (values are clamped later). */
export function parseProgressPayload(value: unknown): ProgressPayload | null {
  if (!isRecord(value)) return null;
  const keys: (keyof ProgressPayload)[] = [
    'correctChars',
    'bonusChars',
    'wpm',
    'accuracy',
    'errors',
    'combo',
    'maxCombo',
    'nitro',
  ];
  for (const key of keys) {
    if (!isFiniteNumber(value[key]) || (value[key] as number) < 0) return null;
  }
  return {
    correctChars: value.correctChars as number,
    bonusChars: value.bonusChars as number,
    wpm: value.wpm as number,
    accuracy: value.accuracy as number,
    errors: value.errors as number,
    combo: value.combo as number,
    maxCombo: value.maxCombo as number,
    nitro: value.nitro as number,
  };
}

export function emitError(socket: GameSocket, code: ErrorCode, message: string): void {
  socket.emit('error', { code, message });
}
