/**
 * Membuat RaceSetup untuk layar balapan: solo & latihan (dibuat di browser) serta
 * multiplayer (dari snapshot race_countdown milik server).
 */
import { COUNTDOWN_TOTAL_MS, raceTimeLimitMs } from '@shared/gameConfig';
import type { RaceSnapshot } from '@shared/types';
import { getTextLengthTier, type TypingText } from '../data/typingTexts';
import type { PracticeConfig, RaceSetup, RacerInfo, SoloConfig } from '../types/Race';
import { createAIRoster, getRandomText } from './randomText';

export const LOCAL_PLAYER_ID = 'local-player';

function localRacer(nickname: string, motorcycleId: string): RacerInfo {
  return {
    id: LOCAL_PLAYER_ID,
    name: nickname,
    motorcycleId,
    slot: 0,
    isBot: false,
    difficulty: null,
    isLocal: true,
  };
}

function baseSetup(mode: 'solo' | 'practice', text: TypingText, trackId: string, racers: RacerInfo[]): RaceSetup {
  return {
    id: `${mode}-${Date.now()}`,
    mode,
    text: text.text,
    textId: text.id,
    category: text.category,
    textDifficulty: text.difficulty,
    textLength: getTextLengthTier(text),
    trackId,
    // Re-based when the race screen mounts, see Race.tsx
    startAt: Date.now() + COUNTDOWN_TOTAL_MS,
    timeLimitMs: raceTimeLimitMs(text.text.length),
    racers,
    localPlayerId: LOCAL_PLAYER_ID,
    roomCode: null,
    raceNumber: 1,
  };
}

export function createSoloRace(config: SoloConfig): RaceSetup {
  const text = getRandomText(config);
  const roster = createAIRoster(config.opponents, config.motorcycleId);
  const racers: RacerInfo[] = [
    localRacer(config.nickname, config.motorcycleId),
    ...roster.map((ai, index) => ({
      id: `ai-${index + 1}`,
      name: ai.name,
      motorcycleId: ai.motorcycleId,
      slot: index + 1,
      isBot: true,
      difficulty: config.difficulty,
      isLocal: false,
    })),
  ];
  return baseSetup('solo', text, config.trackId, racers);
}

/** Latihan: hanya pemain sendiri, tanpa lawan dan tanpa multiplayer. */
export function createPracticeRace(config: PracticeConfig): RaceSetup {
  const text = getRandomText(config);
  return baseSetup('practice', text, config.trackId, [localRacer(config.nickname, config.motorcycleId)]);
}

export function multiRaceId(roomCode: string, raceNumber: number): string {
  return `${roomCode}-${raceNumber}`;
}

export function raceSetupFromSnapshot(snapshot: RaceSnapshot, localPlayerId: string): RaceSetup {
  return {
    id: multiRaceId(snapshot.roomCode, snapshot.raceNumber),
    mode: 'multi',
    text: snapshot.text,
    textId: snapshot.textId,
    category: snapshot.category,
    textDifficulty: snapshot.textDifficulty,
    textLength: snapshot.textLength,
    trackId: snapshot.trackId,
    startAt: snapshot.startAt,
    timeLimitMs: snapshot.timeLimitMs,
    racers: snapshot.participants.map((p) => ({ ...p, isLocal: p.id === localPlayerId })),
    localPlayerId,
    roomCode: snapshot.roomCode,
    raceNumber: snapshot.raceNumber,
  };
}
