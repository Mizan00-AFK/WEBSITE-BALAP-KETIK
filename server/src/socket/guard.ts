/**
 * Wraps Socket.IO handlers with rate limiting and error isolation so one bad
 * payload can never crash the server.
 */
import { GAME_CONFIG } from '@shared/gameConfig';
import type { ClientToServerEvents } from '@shared/types';
import type { GameSocket } from '../types';
import { logger } from '../utils/logger';
import { emitError } from '../utils/validation';

interface GuardOptions {
  /** Max calls per second for this event. */
  limit?: number;
  /** Drop over-limit calls silently (used for high-frequency progress updates). */
  silent?: boolean;
}

export type GuardedOn = <E extends keyof ClientToServerEvents>(
  event: E,
  handler: (...args: Parameters<ClientToServerEvents[E]>) => void,
  options?: GuardOptions,
) => void;

export function createGuard(socket: GameSocket): GuardedOn {
  return (event, handler, options = {}) => {
    const limit = options.limit ?? GAME_CONFIG.maxEventsPerSecond;
    const listener = (...args: unknown[]) => {
      if (!socket.data.limiter.allow(event, limit)) {
        if (!options.silent) emitError(socket, 'RATE_LIMITED', 'Terlalu banyak permintaan, pelan-pelan sedikit.');
        return;
      }
      try {
        (handler as (...a: unknown[]) => void)(...args);
      } catch (error) {
        logger.error(`Handler "${event}" failed:`, error);
        emitError(socket, 'SERVER_ERROR', 'Terjadi kesalahan di server.');
      }
    };
    // Socket.IO's typed `on` cannot express this generic wrapper; the payloads are validated inside each handler.
    const on = socket.on.bind(socket) as unknown as (ev: string, fn: (...args: unknown[]) => void) => void;
    on(event, listener);
  };
}
