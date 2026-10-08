/**
 * Race events: start / progress / nitro / finish.
 */
import { GAME_CONFIG } from '@shared/gameConfig';
import type { RaceManager } from '../game/RaceManager';
import type { RoomManager } from '../game/RoomManager';
import type { GameSocket } from '../types';
import { emitError, parseProgressPayload } from '../utils/validation';
import type { GuardedOn } from './guard';

export function registerRaceSocket(socket: GameSocket, on: GuardedOn, rooms: RoomManager, races: RaceManager): void {
  on('start_race', () => {
    const session = rooms.getSession(socket);
    if (!session) return emitError(socket, 'NOT_IN_ROOM', 'Kamu tidak sedang berada di room.');
    const error = races.startRace(session.room, session.player);
    if (error) emitError(socket, error.code, error.message);
  });

  on(
    'player_progress',
    (payload) => {
      const session = rooms.getSession(socket);
      if (!session) return;
      const progress = parseProgressPayload(payload);
      if (!progress) return emitError(socket, 'INVALID_PROGRESS', 'Data progres tidak valid.');
      const error = races.handleProgress(session.room, session.player, progress);
      if (error) emitError(socket, error.code, error.message);
    },
    { limit: GAME_CONFIG.maxProgressUpdatesPerSecond, silent: true },
  );

  on('use_nitro', () => {
    const session = rooms.getSession(socket);
    if (!session) return;
    const error = races.handleNitro(session.room, session.player);
    if (error) emitError(socket, error.code, error.message);
  });

  on('player_finished', (payload) => {
    const session = rooms.getSession(socket);
    if (!session) return emitError(socket, 'NOT_IN_ROOM', 'Kamu tidak sedang berada di room.');
    const progress = parseProgressPayload(payload);
    if (!progress) return emitError(socket, 'INVALID_FINISH', 'Data finis tidak valid.');
    const error = races.handleFinish(session.room, session.player, progress);
    if (error) emitError(socket, error.code, error.message);
  });
}
