/**
 * Pemilihan teks + nama AI untuk mode SOLO dan LATIHAN (di browser).
 * Pada multiplayer teks selalu dipilih oleh server.
 */
import { AI_NAMES } from '@shared/ai';
import { MOTORCYCLES } from '@shared/motorcycles';
import { pickTypingText, type TextFilter, type TypingText } from '../data/typingTexts';
import type { TextOptionsValue } from '../types/Race';

export {
  getRandomTypingText,
  getTypingTextByCategory,
  getTypingTextByDifficulty,
  getTypingTextByLength,
} from '../data/typingTexts';

let lastTextId: number | null = null;

export function toTextFilter(options: TextOptionsValue): TextFilter {
  return { category: options.category, difficulty: options.textDifficulty, length: options.textLength };
}

/** Teks acak sesuai pilihan, berbeda dari teks balapan sebelumnya. */
export function getRandomText(options: TextOptionsValue): TypingText {
  const text = pickTypingText(toTextFilter(options), lastTextId);
  lastTextId = text.id;
  return text;
}

function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Nama AI + motor yang berbeda-beda (mengutamakan motor yang tidak dipilih pemain). */
export function createAIRoster(count: number, playerMotorcycleId: string): { name: string; motorcycleId: string }[] {
  const names = shuffle(AI_NAMES);
  const otherBikes = shuffle(MOTORCYCLES.filter((m) => m.id !== playerMotorcycleId).map((m) => m.id));
  const bikes = [...otherBikes, playerMotorcycleId];
  return Array.from({ length: count }, (_, i) => ({
    name: `AI ${names[i % names.length]}`,
    motorcycleId: bikes[i % bikes.length],
  }));
}
