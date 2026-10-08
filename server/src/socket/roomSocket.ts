/**
 * Room events: create / join / re-join / leave / ready / bots / settings / restart.
 */
import { isValidDifficulty } from '@shared/ai';
import { GAME_CONFIG } from '@shared/gameConfig';
import { isValidMotorcycle } from '@shared/motorcycles';
import { isValidCategoryChoice, isValidTextDifficultyChoice, isValidTextLengthChoice } from '@shared/texts';
import { isValidTrack } from '@shared/tracks';
import { normalizeRoomCode, sanitizeNickname } from '@shared/validation';
import type { RaceManager } from '../game/RaceManager';
import type { RoomManager } from '../game/RoomManager';
import type { GameSocket } from '../types';
import { clampInt, emitError, isRecord } from '../utils/validation';
import type { GuardedOn } from './guard';

export function registerRoomSocket(socket: GameSocket, on: GuardedOn, rooms: RoomManager, races: RaceManager): void {
  /** Returns the caller's room + player, or tells the client it is not in a room. */
  const requireSession = () => {
    const session = rooms.getSession(socket);
    if (!session) emitError(socket, 'NOT_IN_ROOM', 'Kamu tidak sedang berada di room.');
    return session;
  };

  on('create_room', (payload) => {
    if (!isRecord(payload)) return emitError(socket, 'INVALID_PAYLOAD', 'Permintaan tidak valid.');
    const name = sanitizeNickname(payload.nickname);
    if (!name) return emitError(socket, 'INVALID_NICKNAME', 'Nama tidak valid.');
    if (!isValidMotorcycle(payload.motorcycleId)) return emitError(socket, 'INVALID_MOTORCYCLE', 'Motor tidak dikenal.');
    const maxPlayers = clampInt(payload.maxPlayers, GAME_CONFIG.minPlayers, GAME_CONFIG.maxPlayers, GAME_CONFIG.maxPlayers);

    const { room, player } = rooms.createRoom(socket, name, payload.motorcycleId, maxPlayers);
    socket.emit('room_created', {
      room: rooms.toPublicRoom(room),
      playerId: player.id,
      token: player.token,
      race: null,
    });
  });

  on('join_room', (payload) => {
    if (!isRecord(payload)) return emitError(socket, 'INVALID_PAYLOAD', 'Permintaan tidak valid.');
    const code = normalizeRoomCode(payload.code);
    if (!code) return emitError(socket, 'INVALID_ROOM_CODE', 'Kode room tidak valid.');
    const name = sanitizeNickname(payload.nickname);
    if (!name) return emitError(socket, 'INVALID_NICKNAME', 'Nama tidak valid.');
    if (!isValidMotorcycle(payload.motorcycleId)) return emitError(socket, 'INVALID_MOTORCYCLE', 'Motor tidak dikenal.');

    const result = rooms.joinRoom(socket, code, name, payload.motorcycleId);
    if (!result.ok) return emitError(socket, result.error.code, result.error.message);

    const { room, player } = result;
    socket.emit('room_joined', {
      room: rooms.toPublicRoom(room),
      playerId: player.id,
      token: player.token,
      race: null,
    });
    socket.to(room.id).emit('player_joined', { player: rooms.toPublicPlayer(room, player) });
    rooms.broadcastRoom(room);
  });

  on('rejoin_room', (payload) => {
    if (!isRecord(payload)) return emitError(socket, 'INVALID_PAYLOAD', 'Permintaan tidak valid.');
    const code = normalizeRoomCode(payload.code);
    const { playerId, token } = payload;
    if (!code || typeof playerId !== 'string' || typeof token !== 'string' || token.length > 64) {
      return emitError(socket, 'SESSION_EXPIRED', 'Sesi sebelumnya sudah berakhir.');
    }
    const result = rooms.rejoin(socket, code, playerId, token);
    if (!result.ok) return emitError(socket, result.error.code, result.error.message);

    const { room, player, wasConnected } = result;
    socket.emit('room_joined', {
      room: rooms.toPublicRoom(room),
      playerId: player.id,
      token: player.token,
      race: races.snapshot(room),
    });
    if (!wasConnected) {
      socket.to(room.id).emit('notice', { message: `${player.name} tersambung kembali.`, tone: 'success' });
    }
    room.dirty = true;
    rooms.broadcastRoom(room);
  });

  on('leave_room', () => {
    rooms.leaveCurrentRoom(socket);
  });

  on('player_ready', (payload) => {
    const session = requireSession();
    if (!session) return;
    const ready = isRecord(payload) && payload.ready === true;
    const error = rooms.setReady(session.room, session.player, ready);
    if (error) emitError(socket, error.code, error.message);
  });

  on('add_bot', (payload) => {
    const session = requireSession();
    if (!session) return;
    const difficulty = isRecord(payload) ? payload.difficulty : null;
    if (!isValidDifficulty(difficulty)) return emitError(socket, 'INVALID_PAYLOAD', 'Tingkat kesulitan tidak dikenal.');
    const error = rooms.addBot(session.room, session.player, difficulty);
    if (error) emitError(socket, error.code, error.message);
  });

  on('remove_bot', (payload) => {
    const session = requireSession();
    if (!session) return;
    const botId = isRecord(payload) ? payload.playerId : null;
    if (typeof botId !== 'string') return emitError(socket, 'INVALID_PAYLOAD', 'Permintaan tidak valid.');
    const error = rooms.removeBot(session.room, session.player, botId);
    if (error) emitError(socket, error.code, error.message);
  });

  on('update_room_settings', (payload) => {
    const session = requireSession();
    if (!session) return;
    if (
      !isRecord(payload) ||
      !isValidCategoryChoice(payload.category) ||
      !isValidTextDifficultyChoice(payload.textDifficulty) ||
      !isValidTextLengthChoice(payload.textLength) ||
      !isValidTrack(payload.trackId)
    ) {
      return emitError(socket, 'INVALID_PAYLOAD', 'Pengaturan room tidak valid.');
    }
    const error = rooms.updateSettings(session.room, session.player, {
      category: payload.category,
      textDifficulty: payload.textDifficulty,
      textLength: payload.textLength,
      trackId: payload.trackId,
    });
    if (error) emitError(socket, error.code, error.message);
  });

  on('restart_race', () => {
    const session = requireSession();
    if (!session) return;
    rooms.resetForNewRace(session.room);
  });

  on('time_sync', (clientTime, ack) => {
    if (typeof ack === 'function' && typeof clientTime === 'number') ack(Date.now());
  });

  socket.on('disconnect', () => {
    rooms.handleDisconnect(socket);
  });
}
