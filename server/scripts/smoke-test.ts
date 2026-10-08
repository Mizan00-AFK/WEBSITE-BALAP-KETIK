/**
 * Multiplayer smoke test - runs two real Socket.IO clients against a running server.
 *
 *   1. npm run dev:server          (in one terminal)
 *   2. npm run test:smoke -w server (in another terminal)
 *
 * Covers: create/join room, error messages, AI bot, ready rules, synchronized
 * countdown, same text for everybody, progress validation, nitro, finish order,
 * results, race again, disconnect + re-join.
 */
import { io, type Socket } from 'socket.io-client';
import { GAME_CONFIG } from '@shared/gameConfig';
import { getTypingTextById } from '@shared/texts';
import type {
  ClientToServerEvents,
  RaceResultPayload,
  RaceSnapshot,
  ServerError,
  ServerToClientEvents,
  SessionPayload,
} from '@shared/types';

type Client = Socket<ServerToClientEvents, ClientToServerEvents>;

const URL = process.env.SERVER_URL ?? `http://localhost:${process.env.PORT ?? 3001}`;
let failures = 0;

function check(condition: unknown, label: string): void {
  if (condition) console.log(`  PASS  ${label}`);
  else {
    failures += 1;
    console.log(`  FAIL  ${label}`);
  }
}

function connect(): Promise<Client> {
  return new Promise((resolve, reject) => {
    const socket: Client = io(URL, { transports: ['websocket'], forceNew: true, reconnection: false });
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', reject);
  });
}

function once<E extends keyof ServerToClientEvents>(
  socket: Client,
  event: E,
  timeoutMs = 8000,
): Promise<Parameters<ServerToClientEvents[E]>[0]> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting for ${String(event)}`)), timeoutMs);
    const handler = (payload: unknown) => {
      clearTimeout(timer);
      resolve(payload as Parameters<ServerToClientEvents[E]>[0]);
    };
    (socket.once as (ev: string, fn: (p: unknown) => void) => void)(event as string, handler);
  });
}

/** Resolves with the first `event` payload that satisfies `predicate`. */
function waitFor<E extends keyof ServerToClientEvents>(
  socket: Client,
  event: E,
  predicate: (payload: Parameters<ServerToClientEvents[E]>[0]) => boolean,
  timeoutMs = 8000,
): Promise<Parameters<ServerToClientEvents[E]>[0]> {
  return new Promise((resolve, reject) => {
    const off = socket.off.bind(socket) as unknown as (ev: string, fn: (p: unknown) => void) => void;
    const on = socket.on.bind(socket) as unknown as (ev: string, fn: (p: unknown) => void) => void;
    const timer = setTimeout(() => {
      off(event as string, handler);
      reject(new Error(`timeout waiting for ${String(event)}`));
    }, timeoutMs);
    const handler = (payload: unknown) => {
      const typed = payload as Parameters<ServerToClientEvents[E]>[0];
      if (!predicate(typed)) return;
      clearTimeout(timer);
      off(event as string, handler);
      resolve(typed);
    };
    on(event as string, handler);
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Simulates a typist sending progress at GAME_CONFIG.socketUpdateRate. */
async function typeText(socket: Client, snapshot: RaceSnapshot, wpm: number, useNitro: boolean): Promise<void> {
  const total = snapshot.text.length;
  const cps = (wpm * 5) / 60;
  const started = Date.now();
  let usedNitro = 0;
  let bonus = 0;
  let nitroUntil = 0;
  let lastChars = 0;
  for (;;) {
    await sleep(1000 / GAME_CONFIG.socketUpdateRate);
    const elapsed = Date.now() - started;
    const chars = Math.min(total, Math.floor((cps * elapsed) / 1000));
    if (Date.now() < nitroUntil) bonus += (chars - lastChars) * (GAME_CONFIG.nitroMultiplier - 1);
    lastChars = chars;
    const payload = {
      correctChars: chars,
      bonusChars: bonus,
      wpm,
      accuracy: 98,
      errors: 1,
      combo: chars,
      maxCombo: chars,
      nitro: Math.max(0, Math.min(100, chars - usedNitro * GAME_CONFIG.nitroCost)),
    };
    socket.emit('player_progress', payload);
    if (useNitro && usedNitro === 0 && chars >= 60) {
      usedNitro = 1;
      nitroUntil = Date.now() + GAME_CONFIG.nitroDuration;
      socket.emit('use_nitro');
    }
    if (chars + bonus >= total) {
      socket.emit('player_finished', payload);
      return;
    }
  }
}

async function main(): Promise<void> {
  console.log(`Smoke test against ${URL}\n`);
  const ananda = await connect();
  const budi = await connect();
  const stranger = await connect();
  const errors: Record<string, ServerError[]> = { ananda: [], budi: [], stranger: [] };
  ananda.on('error', (e) => errors.ananda.push(e));
  budi.on('error', (e) => errors.budi.push(e));
  stranger.on('error', (e) => errors.stranger.push(e));

  console.log('Room system');
  const createdP = once(ananda, 'room_created');
  ananda.emit('create_room', { nickname: 'Ananda', motorcycleId: 'speedster', maxPlayers: 3 });
  const created: SessionPayload = await createdP;
  const code = created.room.code;
  check(/^[A-Z0-9]{6}$/.test(code), `room created with code ${code}`);
  check(created.room.hostId === created.playerId, 'creator is host');

  const notFoundP = once(stranger, 'error');
  stranger.emit('join_room', { code: 'ZZZZZZ', nickname: 'Citra', motorcycleId: 'blaze' });
  check((await notFoundP).message === 'Room tidak ditemukan.', '"Room tidak ditemukan." for unknown code');

  const badNickP = once(stranger, 'error');
  stranger.emit('join_room', { code, nickname: '<x>', motorcycleId: 'blaze' });
  check((await badNickP).code === 'INVALID_NICKNAME', 'invalid nickname rejected');

  const joinedP = once(budi, 'room_joined');
  const playerJoinedP = once(ananda, 'player_joined');
  budi.emit('join_room', { code: code.toLowerCase(), nickname: 'Budi', motorcycleId: 'thunder' });
  const joined = await joinedP;
  check(joined.room.players.length === 2, 'Budi joined (2 players)');
  check((await playerJoinedP).player.name === 'Budi', 'host notified with player_joined');

  const botP = waitFor(ananda, 'room_updated', ({ room }) => room.players.some((p) => p.isBot));
  ananda.emit('add_bot', { difficulty: 'hard' });
  const withBot = await botP;
  check(withBot.room.players.some((p) => p.isBot), 'AI bot added by host');

  const fullP = once(stranger, 'error');
  stranger.emit('join_room', { code, nickname: 'Citra', motorcycleId: 'blaze' });
  check((await fullP).message === 'Room sudah penuh.', '"Room sudah penuh." when max players reached');

  const notReadyP = once(ananda, 'error');
  ananda.emit('start_race');
  check((await notReadyP).code === 'NOT_READY', 'cannot start while Budi is not ready');

  const notHostP = once(budi, 'error');
  budi.emit('start_race');
  check((await notHostP).code === 'NOT_HOST', 'only host can start');

  const settingsP = waitFor(ananda, 'room_updated', ({ room }) => room.category === 'teknologi');
  ananda.emit('update_room_settings', {
    category: 'teknologi',
    textDifficulty: 'semua',
    textLength: 'long',
    trackId: 'neon-city',
  });
  check((await settingsP).room.textLength === 'long', 'host changed text settings (teknologi, panjang)');

  console.log('\nRace #1');
  budi.emit('player_ready', { ready: true });
  await sleep(150);
  const countdownA = once(ananda, 'race_countdown');
  const countdownB = once(budi, 'race_countdown');
  ananda.emit('start_race');
  const [snapA, snapB] = await Promise.all([countdownA, countdownB]);
  check(snapA.text === snapB.text && snapA.text.length > 50, 'both players got the SAME text');
  check(snapA.startAt === snapB.startAt, 'same server start timestamp');
  check(snapA.startAt - snapA.serverNow >= 4000, 'countdown SIAP + 3-2-1 before start');
  check(getTypingTextById(snapA.textId)?.text === snapA.text, `text #${snapA.textId} comes from the Indonesian text bank`);
  check(snapA.category === 'teknologi' && snapA.textLength === 'long', 'server respected category + length filter');
  check(snapA.timeLimitMs >= GAME_CONFIG.maxRaceTime * 1000, `race time limit ${snapA.timeLimitMs / 1000}s`);
  console.log(`  text: "${snapA.text.slice(0, 70)}..."`);

  const raceStartedP = once(budi, 'race_started', 10000);
  const startedRace = await raceStartedP;
  check(Math.abs(startedRace.serverNow - snapA.startAt) < 200, 'race_started fired on time');
  check(
    startedRace.textId === snapA.textId && startedRace.text === snapA.text,
    'race_started carries the same textId + text',
  );

  const lateP = once(stranger, 'error');
  stranger.emit('join_room', { code, nickname: 'Dimas', motorcycleId: 'phantom' });
  check((await lateP).code !== undefined, 'joining during race rejected');

  let nitroSeen = false;
  budi.on('nitro_activated', (p) => {
    if (p.playerId === created.playerId) nitroSeen = true;
  });
  const finishedEvents: string[] = [];
  budi.on('player_finished', (p) => finishedEvents.push(p.playerId));
  let updates = 0;
  budi.on('player_updated', () => {
    updates += 1;
  });

  const resultP = once(ananda, 'race_finished', 60000);
  await Promise.all([typeText(ananda, snapA, 200, true), typeText(budi, snapB, 140, false)]);
  const { result } = (await resultP) as { result: RaceResultPayload };
  check(nitroSeen, 'nitro_activated broadcast to other players');
  check(updates > 10, `player_updated broadcasts received (${updates})`);
  check(result.entries.length === 3, 'results contain all 3 racers');
  check(result.entries[0].id === created.playerId, `winner is Ananda (${result.entries[0].name})`);
  check(result.entries[0].nitroUsed === 1, 'nitro use recorded');
  check(finishedEvents[0] === created.playerId, 'server finish order: Ananda first');
  console.table(
    result.entries.map((e) => ({ pos: e.position, name: e.name, wpm: e.wpm, finished: e.finished, ms: e.finishTime })),
  );

  console.log('\nRace again + anti-cheat');
  const resetP = waitFor(ananda, 'room_updated', ({ room }) => room.status === 'waiting');
  ananda.emit('restart_race');
  const reset = await resetP;
  check(reset.room.status === 'waiting', 'room back to waiting (same room code)');
  budi.emit('player_ready', { ready: true });
  await sleep(150);
  const snap2P = once(budi, 'race_countdown');
  ananda.emit('start_race');
  const snap2 = await snap2P;
  await once(budi, 'race_started', 10000);
  await sleep(200);
  const nitroCheatP = once(budi, 'error');
  budi.emit('use_nitro');
  check((await nitroCheatP).code === 'NITRO_UNAVAILABLE', 'nitro without earning it is rejected');
  const cheatP = once(budi, 'error');
  budi.emit('player_finished', {
    correctChars: snap2.text.length,
    bonusChars: 0,
    wpm: 999,
    accuracy: 100,
    errors: 0,
    combo: 0,
    maxCombo: 0,
    nitro: 0,
  });
  const cheatOutcome = await Promise.race([cheatP.then((e) => e.code as string), sleep(400).then(() => 'pending')]);
  const updateAfterCheat = await once(ananda, 'player_updated');
  const budiState = updateAfterCheat.players.find((p) => p.id === joined.playerId);
  check(
    budiState !== undefined && !budiState.finished && budiState.progress < 0.5,
    `instant-finish cheat NOT accepted (progress ${budiState?.progress}, ${cheatOutcome})`,
  );

  console.log('\nDisconnect + re-join');
  const noticeP = once(ananda, 'notice');
  budi.disconnect();
  check((await noticeP).message === 'Pemain Budi terputus.', '"Pemain Budi terputus." notice');
  const budi2 = await connect();
  const rejoinP = once(budi2, 'room_joined');
  budi2.emit('rejoin_room', { code, playerId: joined.playerId, token: joined.token });
  const rejoined = await rejoinP;
  check(rejoined.room.players.find((p) => p.id === joined.playerId)?.connected === true, 'Budi re-joined with session token');
  check(rejoined.race?.text === snap2.text, 're-join receives the running race snapshot');

  const leftP = once(budi2, 'player_left');
  let latestRoom = rejoined.room;
  budi2.on('room_updated', ({ room }) => {
    latestRoom = room;
  });
  ananda.emit('leave_room');
  const left = await leftP;
  check(left.name === 'Ananda', 'player_left broadcast when host leaves');
  await sleep(250);
  check(latestRoom.hostId === joined.playerId, 'host transferred to Budi');

  for (const s of [ananda, budi2, stranger]) s.disconnect();
  console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('Smoke test crashed:', error);
  process.exit(1);
});
