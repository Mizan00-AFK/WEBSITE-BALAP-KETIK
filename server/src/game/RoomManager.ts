/**
 * RoomManager - owns every room in SERVER MEMORY (a plain Map, no database).
 *
 * Responsibilities: create / join / re-join / leave, host transfer,
 * disconnect grace period, ready state, AI bots, room settings and cleanup.
 */
import { randomBytes, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { GAME_CONFIG } from '@shared/gameConfig';
import { MOTORCYCLES } from '@shared/motorcycles';
import { DEFAULT_TRACK_ID } from '@shared/tracks';
import { ROOM_CODE_ALPHABET } from '@shared/validation';
import type {
  Difficulty,
  LeaveReason,
  PublicPlayer,
  PublicRoom,
  RoomSettingsPayload,
  ServerError,
} from '@shared/types';
import type { GameServer, GameSocket, Player, Room } from '../types';
import { logger } from '../utils/logger';
import { pickBotName } from './AIPlayer';

type Result<T> = ({ ok: true } & T) | { ok: false; error: ServerError };

const fail = (code: ServerError['code'], message: string): { ok: false; error: ServerError } => ({
  ok: false,
  error: { code, message },
});

export interface RoomHooks {
  onPlayerRemoved?: (room: Room, player: Player) => void;
  onRoomDeleted?: (room: Room) => void;
}

/** Clears every per-race value of a player. */
export function resetRaceState(player: Player): void {
  player.progress = 0;
  player.correctChars = 0;
  player.claimedChars = 0;
  player.bonusChars = 0;
  player.claimedBonus = 0;
  player.charAllowance = GAME_CONFIG.progressBurstChars;
  player.lastUpdateAt = 0;
  player.wpm = 0;
  player.accuracy = 100;
  player.errors = 0;
  player.combo = 0;
  player.maxCombo = 0;
  player.nitro = 0;
  player.nitroUsed = 0;
  player.nitroActiveUntil = 0;
  player.finished = false;
  player.pendingFinish = false;
  player.finishTime = null;
  player.finishPosition = null;
  player.progressAt = 0;
  player.ai = null;
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export class RoomManager {
  private readonly rooms = new Map<string, Room>();
  readonly hooks: RoomHooks = {};
  private readonly cleanupTimer: NodeJS.Timeout;

  constructor(private readonly io: GameServer) {
    this.cleanupTimer = setInterval(() => this.cleanup(), GAME_CONFIG.roomCleanupInterval);
    this.cleanupTimer.unref();
  }

  get stats() {
    let players = 0;
    for (const room of this.rooms.values()) {
      for (const p of room.players.values()) if (!p.isBot) players += 1;
    }
    return { rooms: this.rooms.size, players };
  }

  get(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  // ------------------------------------------------------------------ create / join

  createRoom(socket: GameSocket, name: string, motorcycleId: string, maxPlayers: number): { room: Room; player: Player } {
    this.leaveCurrentRoom(socket);
    const now = Date.now();
    const code = this.generateCode();
    const player = this.createPlayer({ name, motorcycleId, slot: 0, socketId: socket.id });
    const room: Room = {
      id: code,
      hostId: player.id,
      maxPlayers,
      status: 'waiting',
      players: new Map([[player.id, player]]),
      category: 'semua',
      textDifficulty: 'semua',
      textLength: 'long',
      trackId: DEFAULT_TRACK_ID,
      text: '',
      textId: 0,
      textCategory: 'umum',
      textDifficultyActual: 'easy',
      textLengthActual: 'long',
      raceNumber: 0,
      startTime: null,
      timeLimitMs: 0,
      finishOrder: [],
      createdAt: now,
      lastActivity: now,
      dirty: false,
      lastTickAt: now,
      timers: { countdown: null, tick: null },
    };
    this.rooms.set(code, room);
    this.attachSocket(socket, room, player);
    logger.info(`Room ${code} created by "${name}" (max ${maxPlayers})`);
    return { room, player };
  }

  joinRoom(
    socket: GameSocket,
    code: string,
    name: string,
    motorcycleId: string,
  ): Result<{ room: Room; player: Player }> {
    const room = this.rooms.get(code);
    if (!room) return fail('ROOM_NOT_FOUND', 'Room tidak ditemukan.');

    const current = this.getSession(socket);
    if (current && current.room === room) return { ok: true, room, player: current.player };

    if (room.status === 'countdown' || room.status === 'racing') return fail('RACE_STARTED', 'Balapan sudah dimulai.');
    if (room.players.size >= room.maxPlayers) return fail('ROOM_FULL', 'Room sudah penuh.');

    this.leaveCurrentRoom(socket);
    const player = this.createPlayer({
      name: this.uniqueName(room, name),
      motorcycleId,
      slot: this.freeSlot(room),
      socketId: socket.id,
    });
    room.players.set(player.id, player);
    this.attachSocket(socket, room, player);
    this.touch(room);
    logger.info(`"${player.name}" joined room ${code} (${room.players.size}/${room.maxPlayers})`);
    return { ok: true, room, player };
  }

  rejoin(
    socket: GameSocket,
    code: string,
    playerId: string,
    token: string,
  ): Result<{ room: Room; player: Player; wasConnected: boolean }> {
    const room = this.rooms.get(code);
    const player = room?.players.get(playerId);
    if (!room || !player || player.isBot || !safeEqual(player.token, token)) {
      return fail('SESSION_EXPIRED', 'Sesi sebelumnya sudah berakhir. Silakan gabung ke room lagi.');
    }

    // Same player opened in another tab: the newest connection wins.
    if (player.socketId && player.socketId !== socket.id) {
      const old = this.io.sockets.sockets.get(player.socketId);
      if (old) {
        old.leave(room.id);
        old.data.roomCode = null;
        old.data.playerId = null;
        old.emit('room_closed', { reason: 'Pemain ini dibuka di tab atau perangkat lain.' });
      }
    }
    const current = this.getSession(socket);
    if (current && current.player !== player) this.leaveCurrentRoom(socket);

    const wasConnected = player.connected;
    this.attachSocket(socket, room, player);
    this.touch(room);
    return { ok: true, room, player, wasConnected };
  }

  getSession(socket: GameSocket): { room: Room; player: Player } | null {
    const { roomCode, playerId } = socket.data;
    if (!roomCode || !playerId) return null;
    const room = this.rooms.get(roomCode);
    const player = room?.players.get(playerId);
    if (!room || !player || player.socketId !== socket.id) return null;
    return { room, player };
  }

  leaveCurrentRoom(socket: GameSocket): void {
    const session = this.getSession(socket);
    if (session) this.removePlayer(session.room, session.player.id, 'left');
    socket.data.roomCode = null;
    socket.data.playerId = null;
  }

  // ------------------------------------------------------------------ disconnect / removal

  handleDisconnect(socket: GameSocket): void {
    const session = this.getSession(socket);
    if (!session) return;
    const { room, player } = session;

    player.connected = false;
    player.socketId = null;
    this.io.to(room.id).emit('notice', { message: `Pemain ${player.name} terputus.`, tone: 'warning' });
    if (room.hostId === player.id) this.transferHost(room, player.id, false);

    player.disconnectTimer = setTimeout(() => {
      player.disconnectTimer = null;
      const stillThere = this.rooms.get(room.id)?.players.get(player.id) === player;
      if (stillThere && !player.connected) this.removePlayer(room, player.id, 'timeout');
    }, GAME_CONFIG.disconnectTimeout);
    player.disconnectTimer.unref();

    room.dirty = true;
    this.broadcastRoom(room);
    logger.info(`"${player.name}" disconnected from room ${room.id}`);
  }

  removePlayer(room: Room, playerId: string, reason: LeaveReason): void {
    const player = room.players.get(playerId);
    if (!player) return;
    if (player.disconnectTimer) {
      clearTimeout(player.disconnectTimer);
      player.disconnectTimer = null;
    }
    room.players.delete(playerId);

    if (player.socketId) {
      const socket = this.io.sockets.sockets.get(player.socketId);
      if (socket) {
        socket.leave(room.id);
        if (socket.data.playerId === playerId) {
          socket.data.playerId = null;
          socket.data.roomCode = null;
        }
      }
    }

    const humans = [...room.players.values()].filter((p) => !p.isBot);
    if (humans.length === 0) {
      this.deleteRoom(room, 'Semua pemain telah keluar dari room.');
      return;
    }
    if (room.hostId === playerId) this.transferHost(room, playerId, true);

    this.io.to(room.id).emit('player_left', { playerId, name: player.name, reason });
    this.touch(room);
    room.dirty = true;
    this.hooks.onPlayerRemoved?.(room, player);
    this.broadcastRoom(room);
    if (!player.isBot) logger.info(`"${player.name}" removed from room ${room.id} (${reason})`);
  }

  /**
   * Moves the host role to the next human. On a plain disconnect (`force` = false)
   * the role only moves to a player who is still connected.
   */
  private transferHost(room: Room, previousHostId: string, force: boolean): void {
    const candidates = [...room.players.values()]
      .filter((p) => !p.isBot && p.id !== previousHostId)
      .sort((a, b) => Number(b.connected) - Number(a.connected) || a.joinedAt - b.joinedAt);
    const next = candidates[0];
    if (!next || (!force && !next.connected)) return;
    room.hostId = next.id;
    this.io.to(room.id).emit('notice', { message: `${next.name} sekarang menjadi host.`, tone: 'info' });
  }

  deleteRoom(room: Room, reason: string): void {
    if (this.rooms.get(room.id) !== room) return;
    this.hooks.onRoomDeleted?.(room);
    this.io.to(room.id).emit('room_closed', { reason });
    for (const player of room.players.values()) {
      if (player.disconnectTimer) clearTimeout(player.disconnectTimer);
      player.disconnectTimer = null;
      if (player.socketId) {
        const socket = this.io.sockets.sockets.get(player.socketId);
        if (socket && socket.data.roomCode === room.id) {
          socket.data.roomCode = null;
          socket.data.playerId = null;
        }
      }
    }
    this.io.in(room.id).socketsLeave(room.id);
    this.rooms.delete(room.id);
    logger.info(`Room ${room.id} deleted from memory (${reason})`);
  }

  // ------------------------------------------------------------------ lobby actions

  setReady(room: Room, player: Player, ready: boolean): ServerError | null {
    if (room.status !== 'waiting') return { code: 'RACE_STARTED', message: 'Balapan sudah dimulai.' };
    player.ready = ready;
    this.touch(room);
    this.broadcastRoom(room);
    return null;
  }

  addBot(room: Room, requester: Player, difficulty: Difficulty): ServerError | null {
    if (room.hostId !== requester.id) return { code: 'NOT_HOST', message: 'Hanya host yang dapat menambah pembalap AI.' };
    if (room.status !== 'waiting') return { code: 'RACE_STARTED', message: 'Balapan sudah dimulai.' };
    if (room.players.size >= room.maxPlayers) return { code: 'ROOM_FULL', message: 'Room sudah penuh.' };

    const taken = new Set([...room.players.values()].map((p) => p.name.toLowerCase()));
    const bot = this.createPlayer({
      name: pickBotName(taken),
      motorcycleId: MOTORCYCLES[randomInt(MOTORCYCLES.length)].id,
      slot: this.freeSlot(room),
      socketId: null,
    });
    bot.isBot = true;
    bot.difficulty = difficulty;
    bot.ready = true;
    bot.connected = true;
    bot.token = '';
    room.players.set(bot.id, bot);
    this.touch(room);
    this.io.to(room.id).emit('player_joined', { player: this.toPublicPlayer(room, bot) });
    this.broadcastRoom(room);
    return null;
  }

  removeBot(room: Room, requester: Player, botId: string): ServerError | null {
    if (room.hostId !== requester.id) return { code: 'NOT_HOST', message: 'Hanya host yang dapat menghapus pembalap AI.' };
    if (room.status !== 'waiting') return { code: 'RACE_STARTED', message: 'Balapan sudah dimulai.' };
    const bot = room.players.get(botId);
    if (!bot || !bot.isBot) return { code: 'INVALID_PAYLOAD', message: 'Pembalap AI tidak ditemukan.' };
    this.removePlayer(room, botId, 'removed');
    return null;
  }

  updateSettings(room: Room, requester: Player, settings: RoomSettingsPayload): ServerError | null {
    if (room.hostId !== requester.id) return { code: 'NOT_HOST', message: 'Hanya host yang dapat mengubah pengaturan room.' };
    if (room.status !== 'waiting') return { code: 'RACE_STARTED', message: 'Balapan sudah dimulai.' };
    room.category = settings.category;
    room.textDifficulty = settings.textDifficulty;
    room.textLength = settings.textLength;
    room.trackId = settings.trackId;
    this.touch(room);
    this.broadcastRoom(room);
    return null;
  }

  /** "Race again": same room, same players, fresh race state. */
  resetForNewRace(room: Room): void {
    if (room.status !== 'finished') return;
    room.status = 'waiting';
    room.startTime = null;
    room.finishOrder = [];
    for (const player of room.players.values()) {
      resetRaceState(player);
      player.ready = player.isBot;
    }
    this.touch(room);
    this.broadcastRoom(room);
  }

  // ------------------------------------------------------------------ serialisation

  toPublicPlayer(room: Room, player: Player): PublicPlayer {
    return {
      id: player.id,
      name: player.name,
      motorcycleId: player.motorcycleId,
      slot: player.slot,
      isHost: room.hostId === player.id,
      isBot: player.isBot,
      difficulty: player.difficulty,
      ready: player.isBot || room.hostId === player.id ? true : player.ready,
      connected: player.connected,
    };
  }

  toPublicRoom(room: Room): PublicRoom {
    return {
      code: room.id,
      hostId: room.hostId,
      maxPlayers: room.maxPlayers,
      status: room.status,
      players: [...room.players.values()].sort((a, b) => a.slot - b.slot).map((p) => this.toPublicPlayer(room, p)),
      category: room.category,
      textDifficulty: room.textDifficulty,
      textLength: room.textLength,
      trackId: room.trackId,
      raceNumber: room.raceNumber,
    };
  }

  broadcastRoom(room: Room): void {
    this.io.to(room.id).emit('room_updated', { room: this.toPublicRoom(room) });
  }

  touch(room: Room): void {
    room.lastActivity = Date.now();
  }

  // ------------------------------------------------------------------ cleanup

  /** Removes rooms that are empty or inactive for too long (GAME_CONFIG.roomTimeout). */
  cleanup(): void {
    const now = Date.now();
    for (const room of [...this.rooms.values()]) {
      const humans = [...room.players.values()].filter((p) => !p.isBot);
      if (humans.length === 0) {
        this.deleteRoom(room, 'Room kosong.');
      } else if (now - room.lastActivity > GAME_CONFIG.roomTimeout) {
        this.deleteRoom(room, 'Room ditutup karena terlalu lama tidak aktif.');
      }
    }
  }

  shutdown(): void {
    clearInterval(this.cleanupTimer);
    for (const room of [...this.rooms.values()]) this.deleteRoom(room, 'Server sedang dimulai ulang.');
    this.rooms.clear();
  }

  // ------------------------------------------------------------------ helpers

  private attachSocket(socket: GameSocket, room: Room, player: Player): void {
    if (player.disconnectTimer) {
      clearTimeout(player.disconnectTimer);
      player.disconnectTimer = null;
    }
    player.socketId = socket.id;
    player.connected = true;
    socket.join(room.id);
    socket.data.roomCode = room.id;
    socket.data.playerId = player.id;
  }

  private createPlayer(opts: { name: string; motorcycleId: string; slot: number; socketId: string | null }): Player {
    const player: Player = {
      id: randomUUID(),
      token: randomBytes(18).toString('base64url'),
      name: opts.name,
      motorcycleId: opts.motorcycleId,
      slot: opts.slot,
      isBot: false,
      difficulty: null,
      socketId: opts.socketId,
      connected: opts.socketId !== null,
      ready: false,
      joinedAt: Date.now(),
      disconnectTimer: null,
      progress: 0,
      correctChars: 0,
      claimedChars: 0,
      bonusChars: 0,
      claimedBonus: 0,
      charAllowance: 0,
      lastUpdateAt: 0,
      wpm: 0,
      accuracy: 100,
      errors: 0,
      combo: 0,
      maxCombo: 0,
      nitro: 0,
      nitroUsed: 0,
      nitroActiveUntil: 0,
      finished: false,
      pendingFinish: false,
      finishTime: null,
      finishPosition: null,
      progressAt: 0,
      ai: null,
    };
    resetRaceState(player);
    return player;
  }

  private generateCode(): string {
    for (;;) {
      let code = '';
      for (let i = 0; i < GAME_CONFIG.roomCodeLength; i += 1) {
        code += ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)];
      }
      if (!this.rooms.has(code)) return code;
    }
  }

  private freeSlot(room: Room): number {
    const used = new Set([...room.players.values()].map((p) => p.slot));
    for (let slot = 0; slot < GAME_CONFIG.maxPlayers; slot += 1) {
      if (!used.has(slot)) return slot;
    }
    return room.players.size;
  }

  /** Two players with the same nickname get a number suffix ("Budi 2"). */
  private uniqueName(room: Room, name: string): string {
    const taken = new Set([...room.players.values()].map((p) => p.name.toLowerCase()));
    if (!taken.has(name.toLowerCase())) return name;
    for (let n = 2; n < 10; n += 1) {
      const candidate = `${name.slice(0, GAME_CONFIG.nicknameMax - 2)} ${n}`;
      if (!taken.has(candidate.toLowerCase())) return candidate;
    }
    return `${name.slice(0, GAME_CONFIG.nicknameMax - 4)} ${randomInt(100, 999)}`;
  }
}
