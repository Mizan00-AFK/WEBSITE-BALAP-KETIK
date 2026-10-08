/**
 * Input validation shared by client (instant feedback) and server (authority).
 */
import { GAME_CONFIG } from './gameConfig';

/** Room codes avoid look-alike characters (0/O, 1/I). */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const NICKNAME_PATTERN = /^[\p{L}\p{N} _.\-]+$/u;

/** Returns a clean nickname or null when it is not acceptable. */
export function sanitizeNickname(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const cleaned = raw
    .normalize('NFKC')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned.length < GAME_CONFIG.nicknameMin || cleaned.length > GAME_CONFIG.nicknameMax) return null;
  if (!NICKNAME_PATTERN.test(cleaned)) return null;
  return cleaned;
}

export function nicknameError(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length < GAME_CONFIG.nicknameMin) return `Nama minimal ${GAME_CONFIG.nicknameMin} karakter.`;
  if (trimmed.length > GAME_CONFIG.nicknameMax) return `Nama maksimal ${GAME_CONFIG.nicknameMax} karakter.`;
  if (!sanitizeNickname(raw)) return 'Gunakan huruf, angka, spasi, titik, tanda hubung, atau garis bawah saja.';
  return null;
}

/** Upper-cases and validates a room code. Returns null when invalid. */
export function normalizeRoomCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const code = raw.replace(/\s+/g, '').toUpperCase();
  const pattern = new RegExp(`^[A-Z0-9]{${GAME_CONFIG.roomCodeLength}}$`);
  return pattern.test(code) ? code : null;
}
