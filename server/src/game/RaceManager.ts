/**
 * RaceManager - the server is the single source of truth for:
 * countdown, race start time, validated progress, nitro, finish order and results.
 *
 * Clients compute their own typing locally and send ~15 updates/second.
 * The server never trusts those numbers blindly:
 *  - progress can never go backwards and never exceed the text length
 *  - characters are granted through a token bucket capped at a plausible
 *    human speed (GAME_CONFIG.maxPlausibleWpm)
 *  - nitro bonus distance is capped by the number of validated nitro uses
 *  - a player can only finish once, and only when the whole text is validated
 */
import { COUNTDOWN_TOTAL_MS, GAME_CONFIG, MAX_PLAUSIBLE_CPS, raceTimeLimitMs } from '@shared/gameConfig';
import { calcProgress, calcWpm, clamp, rankRacers, round } from '@shared/stats';
import { getTextLengthTier, pickTypingText } from '@shared/texts';
import type { ProgressPayload, RacePlayerState, RaceResultEntry, RaceSnapshot, ServerError } from '@shared/types';
import type { GameServer, Player, Room } from '../types';
import { logger } from '../utils/logger';
import { AIPlayer } from './AIPlayer';
import { resetRaceState, type RoomManager } from './RoomManager';

/** Max characters a player may "bank" (covers network hiccups of ~2 s). */
const ALLOWANCE_CAP = MAX_PLAUSIBLE_CPS * 2 + GAME_CONFIG.progressBurstChars;
/** Max bonus distance (characters) one nitro can produce. */
const MAX_BONUS_PER_NITRO =
  MAX_PLAUSIBLE_CPS * (GAME_CONFIG.nitroDuration / 1000) * (GAME_CONFIG.nitroMultiplier - 1) + 1;
/** Tolerance for a nitro request that overtakes the latest progress update. */
const NITRO_CHAR_SLACK = 10;
const NITRO_TIME_TOLERANCE = 300;
const FAST_FORWARD_STEP = 50;

export class RaceManager {
  constructor(
    private readonly io: GameServer,
    private readonly rooms: RoomManager,
  ) {
    rooms.hooks.onPlayerRemoved = (room) => {
      if (room.status === 'racing') {
        room.dirty = true;
        this.checkRaceEnd(room, Date.now());
      }
    };
    rooms.hooks.onRoomDeleted = (room) => this.stopTimers(room);
  }

  // ------------------------------------------------------------------ start

  canStart(room: Room): ServerError | null {
    const players = [...room.players.values()];
    if (room.status !== 'waiting') return { code: 'RACE_STARTED', message: 'Balapan sudah dimulai.' };
    if (players.length < GAME_CONFIG.minPlayers) {
      return { code: 'NOT_ENOUGH_PLAYERS', message: `Minimal ${GAME_CONFIG.minPlayers} pembalap untuk memulai balapan.` };
    }
    if (players.some((p) => !p.isBot && !p.connected)) {
      return { code: 'PLAYER_DISCONNECTED', message: 'Tunggu pemain yang terputus kembali (atau dikeluarkan).' };
    }
    if (players.some((p) => !p.isBot && p.id !== room.hostId && !p.ready)) {
      return { code: 'NOT_READY', message: 'Semua pemain harus SIAP sebelum balapan dimulai.' };
    }
    return null;
  }

  startRace(room: Room, requester: Player): ServerError | null {
    if (room.hostId !== requester.id) return { code: 'NOT_HOST', message: 'Hanya host yang dapat memulai balapan.' };
    const error = this.canStart(room);
    if (error) return error;

    // The server picks ONE text for everybody (the client never chooses it).
    const text = pickTypingText(
      { category: room.category, difficulty: room.textDifficulty, length: room.textLength },
      room.textId || null,
    );
    const now = Date.now();
    room.text = text.text;
    room.textId = text.id;
    room.textCategory = text.category;
    room.textDifficultyActual = text.difficulty;
    room.textLengthActual = getTextLengthTier(text);
    room.timeLimitMs = raceTimeLimitMs(text.text.length);
    room.raceNumber += 1;
    room.status = 'countdown';
    room.startTime = now + COUNTDOWN_TOTAL_MS;
    room.finishOrder = [];
    room.dirty = false;

    for (const player of room.players.values()) {
      resetRaceState(player);
      player.lastUpdateAt = room.startTime;
      player.progressAt = room.startTime;
      if (player.isBot && player.difficulty) player.ai = new AIPlayer(room.text.length, player.difficulty);
    }

    this.rooms.touch(room);
    const snapshot = this.snapshot(room);
    if (snapshot) this.io.to(room.id).emit('race_countdown', snapshot);
    this.rooms.broadcastRoom(room);

    room.timers.countdown = setTimeout(() => this.beginRacing(room), room.startTime - now);
    logger.info(`Room ${room.id}: race #${room.raceNumber} countdown (${text.id}, ${room.players.size} racers)`);
    return null;
  }

  /** Everything a client needs to render the race (also used on re-join). */
  snapshot(room: Room): RaceSnapshot | null {
    if ((room.status !== 'countdown' && room.status !== 'racing') || room.startTime === null) return null;
    return {
      roomCode: room.id,
      raceNumber: room.raceNumber,
      textId: room.textId,
      category: room.textCategory,
      textDifficulty: room.textDifficultyActual,
      textLength: room.textLengthActual,
      text: room.text,
      trackId: room.trackId,
      startAt: room.startTime,
      serverNow: Date.now(),
      timeLimitMs: room.timeLimitMs,
      participants: [...room.players.values()]
        .sort((a, b) => a.slot - b.slot)
        .map((p) => ({
          id: p.id,
          name: p.name,
          motorcycleId: p.motorcycleId,
          slot: p.slot,
          isBot: p.isBot,
          difficulty: p.difficulty,
        })),
    };
  }

  private beginRacing(room: Room): void {
    room.timers.countdown = null;
    if (room.status !== 'countdown' || this.rooms.get(room.id) !== room || room.startTime === null) return;
    room.status = 'racing';
    room.lastTickAt = room.startTime;
    const now = Date.now();
    this.io.to(room.id).emit('race_started', {
      startAt: room.startTime,
      serverNow: now,
      textId: room.textId,
      text: room.text,
    });
    this.rooms.broadcastRoom(room);
    room.timers.tick = setInterval(() => this.tick(room), 1000 / GAME_CONFIG.serverTickRate);
  }

  /** Progress may arrive a few ms before the countdown timer fires. */
  private isLive(room: Room, now: number): boolean {
    if (room.startTime === null) return false;
    return room.status === 'racing' || (room.status === 'countdown' && now >= room.startTime);
  }

  // ------------------------------------------------------------------ tick

  private tick(room: Room): void {
    if (room.status !== 'racing' || room.startTime === null) return;
    const now = Date.now();
    const dt = Math.max(0, now - room.lastTickAt);
    room.lastTickAt = now;

    for (const player of room.players.values()) {
      if (player.finished) continue;
      if (player.isBot) {
        if (player.ai) this.stepBot(room, player, dt, now);
      } else if (
        player.claimedChars > player.correctChars ||
        player.claimedBonus > player.bonusChars ||
        player.pendingFinish
      ) {
        this.catchUp(room, player, now);
      }
    }

    if (now - room.startTime >= room.timeLimitMs) {
      this.endRace(room, now);
      return;
    }

    if (room.dirty) {
      room.dirty = false;
      this.io.to(room.id).emit('player_updated', {
        serverNow: now,
        players: [...room.players.values()].map((p) => this.toRaceState(p)),
      });
    }

    this.checkRaceEnd(room, now);
  }

  private copyBotState(bot: Player): void {
    if (!bot.ai) return;
    const s = bot.ai.state;
    bot.correctChars = s.correctChars;
    bot.claimedChars = s.correctChars;
    bot.bonusChars = s.bonusChars;
    bot.wpm = s.wpm;
    bot.accuracy = s.accuracy;
    bot.errors = s.errors;
    bot.combo = s.combo;
    bot.maxCombo = s.maxCombo;
    bot.nitro = s.nitro;
    bot.nitroUsed = s.nitroUsed;
  }

  private stepBot(room: Room, bot: Player, dt: number, now: number): void {
    if (!bot.ai || room.startTime === null) return;
    const events = bot.ai.step(dt);
    this.copyBotState(bot);
    const s = bot.ai.state;
    if (s.progress !== bot.progress) {
      bot.progress = s.progress;
      bot.progressAt = now;
      room.dirty = true;
    }
    if (events.includes('nitro')) {
      bot.nitroActiveUntil = now + s.nitroRemainingMs;
      room.dirty = true;
      this.io.to(room.id).emit('nitro_activated', { playerId: bot.id, until: bot.nitroActiveUntil, serverNow: now });
    }
    if (s.finished) this.recordFinish(room, bot, room.startTime + (s.finishTime ?? s.elapsedMs));
  }

  // ------------------------------------------------------------------ client input

  handleProgress(room: Room, player: Player, payload: ProgressPayload): ServerError | null {
    const now = Date.now();
    if (!this.isLive(room, now) || player.finished || player.isBot) return null;
    this.applyProgress(room, player, payload, now);
    return null;
  }

  handleNitro(room: Room, player: Player): ServerError | null {
    const now = Date.now();
    if (!this.isLive(room, now) || player.finished || player.isBot) return null;
    if (now < player.nitroActiveUntil - NITRO_TIME_TOLERANCE) {
      return { code: 'NITRO_UNAVAILABLE', message: 'Nitro sedang aktif.' };
    }
    // Nitro can only be earned through correct characters (max 1 nitro per character).
    const needed = (player.nitroUsed + 1) * GAME_CONFIG.nitroCost;
    if (needed > player.claimedChars + NITRO_CHAR_SLACK) {
      return { code: 'NITRO_UNAVAILABLE', message: 'Nitro belum cukup.' };
    }
    player.nitroUsed += 1;
    player.nitro = Math.max(0, player.nitro - GAME_CONFIG.nitroCost);
    player.nitroActiveUntil = now + GAME_CONFIG.nitroDuration;
    room.dirty = true;
    this.io.to(room.id).emit('nitro_activated', { playerId: player.id, until: player.nitroActiveUntil, serverNow: now });
    return null;
  }

  handleFinish(room: Room, player: Player, payload: ProgressPayload): ServerError | null {
    const now = Date.now();
    if (!this.isLive(room, now)) {
      return room.status === 'finished' ? { code: 'RACE_FINISHED', message: 'Balapan sudah selesai.' } : null;
    }
    if (player.finished || player.isBot) return null;

    this.applyProgress(room, player, payload, now);
    const claimed = calcProgress(player.claimedChars, player.claimedBonus, room.text.length);
    if (claimed < 1 - 1e-9) {
      return { code: 'INVALID_FINISH', message: 'Finis ditolak - teks belum selesai diketik.' };
    }
    player.pendingFinish = true;
    this.catchUp(room, player, now);
    return null;
  }

  private applyProgress(room: Room, player: Player, p: ProgressPayload, now: number): void {
    const total = room.text.length;
    player.claimedChars = Math.max(player.claimedChars, Math.min(total, Math.floor(p.correctChars)));
    player.claimedBonus = Math.max(
      player.claimedBonus,
      Math.min(p.bonusChars, player.nitroUsed * MAX_BONUS_PER_NITRO, total),
    );
    player.accuracy = clamp(p.accuracy, 0, 100);
    player.errors = Math.max(player.errors, Math.min(Math.round(p.errors), 100_000));
    player.combo = clamp(Math.round(p.combo), 0, total);
    player.maxCombo = Math.max(player.maxCombo, clamp(Math.round(p.maxCombo), 0, total));
    player.nitro = clamp(p.nitro, 0, GAME_CONFIG.nitroMax);
    room.dirty = true;
    this.catchUp(room, player, now);
  }

  /**
   * Moves the validated progress towards what the client claimed, never faster
   * than a plausible human typing speed (token bucket).
   */
  private catchUp(room: Room, player: Player, now: number): void {
    if (room.startTime === null) return;
    const total = room.text.length;
    const since = Math.max(0, now - Math.max(player.lastUpdateAt, room.startTime));
    player.lastUpdateAt = now;
    player.charAllowance = Math.min(ALLOWANCE_CAP, player.charAllowance + (MAX_PLAUSIBLE_CPS * since) / 1000);

    const wanted = player.claimedChars - player.correctChars;
    if (wanted > 0) {
      const granted = Math.min(wanted, Math.floor(player.charAllowance));
      player.correctChars += granted;
      player.charAllowance -= granted;
    }
    player.bonusChars = Math.max(
      player.bonusChars,
      Math.min(player.claimedBonus, player.nitroUsed * MAX_BONUS_PER_NITRO),
    );

    const progress = calcProgress(player.correctChars, player.bonusChars, total);
    if (progress !== player.progress) {
      player.progress = progress;
      player.progressAt = now;
      room.dirty = true;
    }
    player.wpm = calcWpm(player.correctChars, now - room.startTime);

    if (player.pendingFinish && progress >= 1 - 1e-9) this.recordFinish(room, player, now);
  }

  // ------------------------------------------------------------------ finish

  private recordFinish(room: Room, player: Player, finishedAt: number): void {
    if (player.finished || room.startTime === null) return;
    player.finished = true;
    player.pendingFinish = false;
    player.progress = 1;
    player.finishTime = Math.max(0, Math.round(finishedAt - room.startTime));
    room.finishOrder.push(player.id);
    player.finishPosition = room.finishOrder.length;
    player.wpm = calcWpm(player.correctChars, player.finishTime);
    player.progressAt = finishedAt;
    room.dirty = true;
    this.io.to(room.id).emit('player_finished', {
      playerId: player.id,
      position: player.finishPosition,
      finishTime: player.finishTime,
    });
  }

  /** Ends the race once every connected human is done (bots are fast-forwarded). */
  checkRaceEnd(room: Room, now: number): void {
    if (room.status !== 'racing') return;
    const humans = [...room.players.values()].filter((p) => !p.isBot);
    const humansDone = humans.every((p) => p.finished || !p.connected);
    if (!humansDone) return;
    this.fastForwardBots(room);
    this.endRace(room, now);
  }

  /** Simulates the remaining part of the race for bots so nobody has to wait for them. */
  private fastForwardBots(room: Room): void {
    if (room.startTime === null) return;
    const limit = room.timeLimitMs;
    const finishers: { bot: Player; at: number }[] = [];
    for (const bot of room.players.values()) {
      if (!bot.isBot || bot.finished || !bot.ai) continue;
      while (!bot.ai.state.finished && bot.ai.state.elapsedMs < limit) bot.ai.step(FAST_FORWARD_STEP);
      this.copyBotState(bot);
      const s = bot.ai.state;
      bot.progress = s.progress;
      if (s.finished) finishers.push({ bot, at: room.startTime + (s.finishTime ?? s.elapsedMs) });
    }
    finishers.sort((a, b) => a.at - b.at).forEach(({ bot, at }) => this.recordFinish(room, bot, at));
  }

  private endRace(room: Room, now: number): void {
    if (room.status !== 'racing') return;
    this.stopTimers(room);
    room.status = 'finished';
    const startTime = room.startTime ?? now;
    const duration = Math.min(now - startTime, room.timeLimitMs);

    const entries: RaceResultEntry[] = rankRacers([...room.players.values()]).map((p, index) => ({
      id: p.id,
      name: p.name,
      motorcycleId: p.motorcycleId,
      slot: p.slot,
      isBot: p.isBot,
      difficulty: p.difficulty,
      position: index + 1,
      finished: p.finished,
      finishTime: p.finishTime,
      progress: round(p.progress, 4),
      wpm: round(p.finished && p.finishTime !== null ? calcWpm(p.correctChars, p.finishTime) : calcWpm(p.correctChars, duration), 1),
      accuracy: round(p.accuracy, 1),
      errors: p.errors,
      maxCombo: p.maxCombo,
      nitroUsed: p.nitroUsed,
    }));
    for (const player of room.players.values()) player.ai = null;

    this.io.to(room.id).emit('race_finished', {
      result: {
        roomCode: room.id,
        raceNumber: room.raceNumber,
        textId: room.textId,
        category: room.textCategory,
        textDifficulty: room.textDifficultyActual,
        textLength: room.text.length,
        trackId: room.trackId,
        duration,
        entries,
      },
    });
    this.rooms.broadcastRoom(room);
    logger.info(`Room ${room.id}: race #${room.raceNumber} finished - winner "${entries[0]?.name ?? '-'}"`);
  }

  stopTimers(room: Room): void {
    if (room.timers.countdown) clearTimeout(room.timers.countdown);
    if (room.timers.tick) clearInterval(room.timers.tick);
    room.timers.countdown = null;
    room.timers.tick = null;
  }

  toRaceState(p: Player): RacePlayerState {
    return {
      id: p.id,
      progress: round(p.progress, 4),
      correctChars: p.correctChars,
      wpm: round(p.wpm, 1),
      accuracy: round(p.accuracy, 1),
      errors: p.errors,
      combo: p.combo,
      maxCombo: p.maxCombo,
      nitro: Math.round(p.nitro),
      nitroUsed: p.nitroUsed,
      nitroActiveUntil: p.nitroActiveUntil,
      finished: p.finished,
      finishTime: p.finishTime,
      finishPosition: p.finishPosition,
      progressAt: p.progressAt,
      connected: p.connected,
    };
  }
}
