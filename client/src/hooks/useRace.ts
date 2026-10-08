/**
 * useRace - the race controller used by the race screen (solo, practice AND multiplayer).
 *
 *   keypress -> TypingEngine -> RaceManager (Phaser moves the bike instantly)
 *   every 50 ms  -> AI simulation (solo) / throttled progress to the server (multi)
 *   every 100 ms -> HUD + live ranking (React state, small re-render)
 *
 * In multiplayer the server decides the start time, the finish order and the end
 * of the race; the client only reports its own typing.
 */
import { useEffect, useState } from 'react';
import { AITypist, type AIEvent } from '@shared/ai';
import { GAME_CONFIG } from '@shared/gameConfig';
import { calcWpm, rankRacers, round } from '@shared/stats';
import type { ProgressPayload, RacePlayerState, RaceResultEntry, RaceResultPayload } from '@shared/types';
import { RaceManager } from '../game/RaceManager';
import { getSocket, serverNow } from '../services/socket';
import { sound } from '../services/sound';
import { useGameStore } from '../store/gameStore';
import type { HudSnapshot, LiveRacer, RacePhase, RaceResult, RaceSetup, RacerInfo, TypingView } from '../types/Race';
import { TypingEngine } from '../utils/typing';

const LOOP_MS = 50;
const HUD_MS = 100;

export interface LocalFinish {
  position: number | null;
  finishTime: number;
}

interface Setters {
  setPhase: (phase: RacePhase) => void;
  setTyping: (view: TypingView) => void;
  setHud: (hud: HudSnapshot) => void;
  setRanking: (ranking: LiveRacer[]) => void;
  setLocalFinish: (finish: LocalFinish) => void;
  setResult: (result: RaceResult) => void;
  setTimeUp: (timeUp: boolean) => void;
}

function createLiveRacer(info: RacerInfo, startAt: number): LiveRacer {
  return {
    ...info,
    progress: 0,
    correctChars: 0,
    wpm: 0,
    accuracy: 100,
    errors: 0,
    combo: 0,
    maxCombo: 0,
    nitro: 0,
    nitroUsed: 0,
    nitroActiveUntil: 0,
    finished: false,
    finishTime: null,
    finishPosition: null,
    progressAt: startAt,
    connected: true,
    left: false,
  };
}

function initialHud(setup: RaceSetup): HudSnapshot {
  return {
    wpm: 0,
    accuracy: 100,
    errors: 0,
    combo: 0,
    maxCombo: 0,
    nitro: 0,
    nitroActive: false,
    nitroReady: false,
    progress: 0,
    elapsedMs: 0,
    timeLeftMs: setup.timeLimitMs,
    position: 1,
    totalRacers: setup.racers.length,
  };
}

/** Plain (non-React) race runtime - created once per race. */
function createRuntime(setup: RaceSetup, set: Setters) {
  // Solo and practice run entirely in the browser; multiplayer follows the server.
  const isSolo = setup.mode !== 'multi';
  const MAX_RACE_MS = setup.timeLimitMs;
  const localId = setup.localPlayerId;
  const clock: () => number = isSolo ? () => Date.now() : serverNow;
  const engine = new TypingEngine(setup.text);
  const manager = new RaceManager(setup.trackId, localId, setup.text.length, setup.racers);
  const racers = new Map<string, LiveRacer>(setup.racers.map((r) => [r.id, createLiveRacer(r, setup.startAt)]));
  const bots = new Map<string, AITypist>();
  if (isSolo) {
    for (const r of setup.racers) {
      if (r.isBot) bots.set(r.id, new AITypist(setup.text.length, r.difficulty ?? 'normal'));
    }
  }

  let phase: RacePhase = 'countdown';
  let lastAiStep = setup.startAt;
  let lastHud = 0;
  let lastSend = 0;
  let sentVersion = -1;
  let timeUp = false;
  let finishCount = 0;
  let finalized = false;

  const local = () => racers.get(localId) as LiveRacer;

  const typingView = (): TypingView => ({
    pos: engine.pos,
    errorActive: engine.errorActive,
    errorTick: engine.errorTick,
    completed: engine.completed,
  });

  function syncLocalFromEngine(now: number): void {
    const r = local();
    const progress = engine.progress;
    if (progress !== r.progress) {
      r.progress = progress;
      r.progressAt = engine.finishTime ?? now;
    }
    r.correctChars = engine.correctChars;
    r.wpm = engine.wpm(now);
    r.accuracy = engine.accuracy();
    r.errors = engine.errors;
    r.combo = engine.combo;
    r.maxCombo = engine.maxCombo;
    r.nitro = engine.nitro;
    r.nitroUsed = engine.nitroUsed;
    r.nitroActiveUntil = engine.nitroActiveUntil;
  }

  function refreshHud(now: number): void {
    syncLocalFromEngine(now);
    const ranked = rankRacers([...racers.values()]);
    const sinceStart = Math.max(0, now - setup.startAt);
    const elapsed = phase === 'countdown' ? 0 : Math.min(MAX_RACE_MS, (engine.finishTime ?? now) - setup.startAt);
    set.setHud({
      wpm: engine.wpm(now),
      accuracy: engine.accuracy(),
      errors: engine.errors,
      combo: engine.combo,
      maxCombo: engine.maxCombo,
      nitro: engine.nitro,
      nitroActive: engine.isNitroActive(now),
      nitroReady: phase === 'racing' && !timeUp && engine.canUseNitro(now),
      progress: engine.progress,
      elapsedMs: Math.max(0, elapsed),
      timeLeftMs: phase === 'countdown' ? MAX_RACE_MS : Math.max(0, MAX_RACE_MS - sinceStart),
      position: ranked.findIndex((r) => r.id === localId) + 1,
      totalRacers: racers.size,
    });
    set.setRanking(ranked.map((r) => ({ ...r })));
  }

  function progressPayload(): ProgressPayload {
    return {
      correctChars: engine.correctChars,
      bonusChars: round(engine.bonusChars, 3),
      wpm: round(engine.wpm(clock()), 1),
      accuracy: round(engine.accuracy(), 2),
      errors: engine.errors,
      combo: engine.combo,
      maxCombo: engine.maxCombo,
      nitro: engine.nitro,
    };
  }

  /** ~15 updates per second, only when something changed. */
  function sendProgress(now: number, force = false): void {
    if (isSolo) return;
    if (!force && now - lastSend < 1000 / GAME_CONFIG.socketUpdateRate) return;
    if (!force && sentVersion === engine.version) return;
    lastSend = now;
    sentVersion = engine.version;
    getSocket().emit('player_progress', progressPayload());
  }

  // ------------------------------------------------------------ solo helpers

  function markFinished(id: string, finishAt: number): void {
    const r = racers.get(id);
    if (!r || r.finished) return;
    finishCount += 1;
    r.finished = true;
    r.finishTime = Math.max(0, finishAt - setup.startAt);
    r.finishPosition = finishCount;
    r.progress = 1;
    r.progressAt = finishAt;
    manager.setFinished(id, finishCount);
  }

  function copyBot(r: LiveRacer, ai: AITypist, now: number): void {
    if (ai.progress !== r.progress) {
      r.progress = ai.progress;
      r.progressAt = now;
    }
    r.correctChars = ai.correctChars;
    r.wpm = ai.wpm;
    r.accuracy = ai.accuracy;
    r.errors = ai.errors;
    r.combo = ai.combo;
    r.maxCombo = ai.maxCombo;
    r.nitro = ai.nitro;
    r.nitroUsed = ai.nitroUsed;
  }

  function stepBots(now: number): void {
    const dt = Math.min(5000, Math.max(0, now - lastAiStep));
    lastAiStep = now;
    for (const [id, ai] of bots) {
      const r = racers.get(id);
      if (!r || r.finished) continue;
      const events: AIEvent[] = [];
      let remaining = dt;
      while (remaining > 0 && !ai.finished) {
        const step = Math.min(LOOP_MS, remaining);
        events.push(...ai.step(step));
        remaining -= step;
      }
      copyBot(r, ai, now);
      manager.setProgress(id, ai.progress);
      if (events.includes('nitro')) {
        r.nitroActiveUntil = now + ai.nitroRemainingMs;
        manager.triggerNitro(id, ai.nitroRemainingMs);
      }
      if (events.includes('error')) manager.flagError(id);
      if (ai.finished) markFinished(id, setup.startAt + (ai.finishTime ?? ai.elapsedMs));
    }
  }

  function finishRace(result: RaceResult): void {
    phase = 'finished';
    manager.setPhase('finished');
    set.setPhase('finished');
    sound.stopEngine();
    set.setResult(result);
    const won = result.mode !== 'practice' && result.entries[0]?.id === localId;
    sound.play(won ? 'victory' : 'finish');
  }

  function finalizeSolo(now: number): void {
    if (finalized) return;
    finalized = true;
    syncLocalFromEngine(now);
    const duration = Math.min(MAX_RACE_MS, Math.max(0, now - setup.startAt));

    // The player is done: simulate the rest of the race for the AI instantly.
    if (!timeUp) {
      for (const [id, ai] of bots) {
        const r = racers.get(id);
        if (!r || r.finished) continue;
        while (!ai.finished && ai.elapsedMs < MAX_RACE_MS) ai.step(LOOP_MS);
        copyBot(r, ai, now);
        if (ai.finished) markFinished(id, setup.startAt + (ai.finishTime ?? ai.elapsedMs));
      }
    }

    // Final finish order strictly by race time.
    const finishers = [...racers.values()].filter((r) => r.finished).sort((a, b) => (a.finishTime ?? 0) - (b.finishTime ?? 0));
    finishers.forEach((r, i) => {
      r.finishPosition = i + 1;
      manager.setFinished(r.id, i + 1);
    });

    const entries: RaceResultEntry[] = rankRacers([...racers.values()]).map((r, index) => ({
      id: r.id,
      name: r.name,
      motorcycleId: r.motorcycleId,
      slot: r.slot,
      isBot: r.isBot,
      difficulty: r.difficulty,
      position: index + 1,
      finished: r.finished,
      finishTime: r.finishTime,
      progress: round(r.progress, 4),
      wpm: round(
        r.finished && r.finishTime !== null ? calcWpm(r.correctChars, r.finishTime) : calcWpm(r.correctChars, duration),
        1,
      ),
      accuracy: round(r.accuracy, 1),
      errors: r.errors,
      maxCombo: r.maxCombo,
      nitroUsed: r.nitroUsed,
    }));

    finishRace({
      mode: setup.mode,
      localPlayerId: localId,
      roomCode: null,
      raceNumber: setup.raceNumber,
      textId: setup.textId,
      category: setup.category,
      textDifficulty: setup.textDifficulty,
      textLength: setup.text.length,
      trackId: setup.trackId,
      duration,
      entries,
    });
  }

  function checkSoloEnd(now: number): void {
    if (finalized) return;
    if (timeUp || [...racers.values()].every((r) => r.finished)) finalizeSolo(now);
  }

  // ------------------------------------------------------------ player input

  function onLocalComplete(now: number): void {
    syncLocalFromEngine(now);
    manager.setProgress(localId, 1);
    sound.play('finish');
    if (isSolo) {
      markFinished(localId, engine.finishTime ?? now);
      const r = local();
      set.setLocalFinish({ position: r.finishPosition, finishTime: r.finishTime ?? 0 });
      checkSoloEnd(now);
    } else {
      sendProgress(now, true);
      getSocket().emit('player_finished', progressPayload());
      set.setLocalFinish({ position: null, finishTime: (engine.finishTime ?? now) - setup.startAt });
    }
    refreshHud(now);
  }

  function handleChar(char: string): void {
    if (phase !== 'racing' || engine.completed || timeUp) return;
    const now = clock();
    const result = engine.input(char, now);
    if (result.type === 'ignored') return;
    if (result.type === 'correct') {
      manager.setProgress(localId, engine.progress);
      sound.play('type');
      if (result.nitroGained > 0) sound.play('combo');
    } else {
      manager.flagError(localId);
      sound.play('error');
    }
    set.setTyping(typingView());
    if (result.completed) onLocalComplete(now);
    else if (result.type === 'error' || result.nitroGained > 0) refreshHud(now);
  }

  function handleBackspace(): void {
    if (phase !== 'racing') return;
    engine.backspace();
    set.setTyping(typingView());
  }

  function activateNitro(): void {
    if (phase !== 'racing' || timeUp) return;
    const now = clock();
    if (!engine.useNitro(now)) return;
    manager.triggerNitro(localId, GAME_CONFIG.nitroDuration);
    sound.play('nitro');
    if (!isSolo) {
      sendProgress(now, true);
      getSocket().emit('use_nitro');
    }
    refreshHud(now);
  }

  function skipToResults(): void {
    if (isSolo && engine.completed) finalizeSolo(clock());
  }

  // ------------------------------------------------------------ main loop

  function tick(): void {
    const now = clock();
    if (phase === 'countdown' && now >= setup.startAt) {
      phase = 'racing';
      engine.start(setup.startAt);
      lastAiStep = setup.startAt;
      manager.setPhase('racing');
      set.setPhase('racing');
      sound.play('go');
      sound.startEngine();
    }
    if (phase === 'racing') {
      if (isSolo) stepBots(now);
      else sendProgress(now);

      if (!timeUp && now - setup.startAt >= MAX_RACE_MS) {
        timeUp = true;
        set.setTimeUp(true);
      }
      if (isSolo) checkSoloEnd(now);

      const localVisual = manager.local;
      const cps = localVisual ? Math.max(0, localVisual.speed) * setup.text.length : 0;
      sound.setEngine(cps / 8, engine.isNitroActive(now));
    }
    if (now - lastHud >= HUD_MS) {
      lastHud = now;
      refreshHud(now);
    }
  }

  // ------------------------------------------------------------ multiplayer events

  function onPlayerUpdated({ players }: { serverNow: number; players: RacePlayerState[] }): void {
    for (const s of players) {
      const r = racers.get(s.id);
      if (!r) continue;
      r.connected = s.connected;
      if (s.id === localId) continue; // our own progress is local
      if (s.progress !== r.progress) r.progressAt = s.progressAt;
      r.progress = s.progress;
      r.correctChars = s.correctChars;
      r.wpm = s.wpm;
      r.accuracy = s.accuracy;
      r.errors = s.errors;
      r.combo = s.combo;
      r.maxCombo = s.maxCombo;
      r.nitro = s.nitro;
      r.nitroUsed = s.nitroUsed;
      manager.setProgress(s.id, s.progress);
      if (s.finished && !r.finished) {
        r.finished = true;
        r.finishTime = s.finishTime;
        r.finishPosition = s.finishPosition;
        manager.setFinished(s.id, s.finishPosition);
      }
    }
  }

  function onNitroActivated({ playerId, until, serverNow: sentAt }: { playerId: string; until: number; serverNow: number }): void {
    if (playerId === localId) return;
    const r = racers.get(playerId);
    if (!r) return;
    r.nitroActiveUntil = until;
    manager.triggerNitro(playerId, until - sentAt);
  }

  function onPlayerFinished({ playerId, position, finishTime }: { playerId: string; position: number; finishTime: number }): void {
    const r = racers.get(playerId);
    if (!r) return;
    r.finished = true;
    r.finishPosition = position;
    r.finishTime = finishTime;
    if (playerId !== localId) r.progress = 1;
    manager.setFinished(playerId, position);
    if (playerId === localId) set.setLocalFinish({ position, finishTime });
  }

  function onRaceFinished({ result }: { result: RaceResultPayload }): void {
    if (finalized) return;
    finalized = true;
    for (const entry of result.entries) {
      const r = racers.get(entry.id);
      if (r && entry.finished && !r.finished) {
        r.finished = true;
        r.finishPosition = entry.position;
        r.finishTime = entry.finishTime;
      }
      if (entry.finished) manager.setFinished(entry.id, entry.position);
    }
    finishRace({ ...result, mode: 'multi', localPlayerId: localId });
  }

  /** Racers that are no longer in the room are dimmed on the track. */
  function syncRoomMembers(memberIds: Set<string>): void {
    for (const r of racers.values()) {
      if (!memberIds.has(r.id) && !r.left) {
        r.left = true;
        r.connected = false;
        manager.setLeft(r.id);
      }
    }
  }

  return {
    manager,
    clock,
    engine,
    tick,
    handleChar,
    handleBackspace,
    activateNitro,
    skipToResults,
    onPlayerUpdated,
    onNitroActivated,
    onPlayerFinished,
    onRaceFinished,
    syncRoomMembers,
    committedWord: () => engine.committedWord(),
  };
}

export type RaceRuntime = ReturnType<typeof createRuntime>;

export function useRace(setup: RaceSetup) {
  const [phase, setPhase] = useState<RacePhase>('countdown');
  const [typing, setTyping] = useState<TypingView>({ pos: 0, errorActive: false, errorTick: 0, completed: false });
  const [hud, setHud] = useState<HudSnapshot>(() => initialHud(setup));
  const [ranking, setRanking] = useState<LiveRacer[]>([]);
  const [localFinish, setLocalFinish] = useState<LocalFinish | null>(null);
  const [result, setResult] = useState<RaceResult | null>(null);
  const [timeUp, setTimeUp] = useState(false);

  const [runtime] = useState(() =>
    createRuntime(setup, { setPhase, setTyping, setHud, setRanking, setLocalFinish, setResult, setTimeUp }),
  );

  // Main loop
  useEffect(() => {
    const id = window.setInterval(runtime.tick, LOOP_MS);
    runtime.tick();
    return () => {
      window.clearInterval(id);
      sound.stopEngine();
    };
  }, [runtime]);

  // Realtime multiplayer events
  useEffect(() => {
    if (setup.mode !== 'multi') return;
    const socket = getSocket();
    socket.on('player_updated', runtime.onPlayerUpdated);
    socket.on('nitro_activated', runtime.onNitroActivated);
    socket.on('player_finished', runtime.onPlayerFinished);
    socket.on('race_finished', runtime.onRaceFinished);
    return () => {
      socket.off('player_updated', runtime.onPlayerUpdated);
      socket.off('nitro_activated', runtime.onNitroActivated);
      socket.off('player_finished', runtime.onPlayerFinished);
      socket.off('race_finished', runtime.onRaceFinished);
    };
  }, [runtime, setup.mode]);

  // Players leaving the room mid-race
  const room = useGameStore((s) => s.room);
  useEffect(() => {
    if (setup.mode !== 'multi' || !room || room.code !== setup.roomCode) return;
    runtime.syncRoomMembers(new Set(room.players.map((p) => p.id)));
  }, [room, runtime, setup.mode, setup.roomCode]);

  return {
    manager: runtime.manager,
    clock: runtime.clock,
    phase,
    typing,
    hud,
    ranking,
    localFinish,
    result,
    timeUp,
    handleChar: runtime.handleChar,
    handleBackspace: runtime.handleBackspace,
    activateNitro: runtime.activateNitro,
    skipToResults: runtime.skipToResults,
    committedWord: runtime.committedWord,
  };
}

export type RaceController = ReturnType<typeof useRace>;
