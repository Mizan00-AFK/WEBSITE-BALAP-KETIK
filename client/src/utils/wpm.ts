/**
 * Rumus WPM / akurasi (sama dengan server dan AI) + format tampilan Bahasa Indonesia.
 *
 *   WPM     = (karakterBenar / 5) / menitBerlalu
 *   akurasi = ketukanBenar / totalKetukan x 100
 */
export { calcAccuracy, calcProgress, calcWpm } from '@shared/stats';

export function formatWpm(wpm: number): string {
  return Math.round(wpm).toString();
}

/** 97.44 -> "97,4%" (koma sebagai pemisah desimal). */
export function formatAccuracy(accuracy: number): string {
  return `${accuracy >= 99.95 ? '100' : accuracy.toFixed(1).replace('.', ',')}%`;
}

/** 83450 -> "1:23,4" */
export function formatRaceTime(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return '--';
  const safe = Math.max(0, ms);
  const minutes = Math.floor(safe / 60000);
  const seconds = Math.floor((safe % 60000) / 1000);
  const tenths = Math.floor((safe % 1000) / 100);
  return `${minutes}:${seconds.toString().padStart(2, '0')},${tenths}`;
}

/** 83450 -> "1:23" */
export function formatClock(ms: number): string {
  const safe = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(safe / 60)}:${(safe % 60).toString().padStart(2, '0')}`;
}

/** 1 -> "ke-1" */
export function ordinal(position: number): string {
  return `ke-${position}`;
}

export function percent(progress: number): string {
  return `${Math.floor(progress * 100)}%`;
}
