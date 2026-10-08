/**
 * Socket.IO client singleton + server clock synchronisation.
 *
 * The countdown and race start are based on SERVER timestamps. Each client
 * measures its clock offset (NTP-style, lowest round-trip wins) so "GO!" appears
 * at the same moment on every device.
 */
import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@shared/types';

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: GameSocket | null = null;
let clockOffset = 0;
let clockSynced = false;

export function getSocket(): GameSocket {
  if (!socket) {
    const url = import.meta.env.VITE_SERVER_URL;
    const options = {
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 4000,
      timeout: 8000,
    };
    // Same origin by default (Vite proxy in development, Express in production).
    socket = url ? io(url, options) : io(options);
    socket.on('connect', () => {
      void syncClock();
    });
  }
  return socket;
}

/** Connects lazily - solo mode never opens a connection. */
export function ensureConnected(): GameSocket {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function serverNow(): number {
  return Date.now() + clockOffset;
}

/** Rough fallback offset from a server timestamp, used until a proper sync finished. */
export function hintServerTime(serverTime: number): void {
  if (!clockSynced) clockOffset = serverTime - Date.now();
}

export async function syncClock(samples = 5): Promise<void> {
  const s = getSocket();
  let bestRtt = Number.POSITIVE_INFINITY;
  for (let i = 0; i < samples; i += 1) {
    if (!s.connected) return;
    const t0 = Date.now();
    const serverTime = await new Promise<number | null>((resolve) => {
      s.timeout(2000).emit('time_sync', t0, (err: Error | null, time: number) => resolve(err ? null : time));
    });
    const t1 = Date.now();
    if (serverTime === null) continue;
    const rtt = t1 - t0;
    if (rtt < bestRtt) {
      bestRtt = rtt;
      clockOffset = serverTime + rtt / 2 - t1;
      clockSynced = true;
    }
  }
}
