/**
 * RaceManager - a tiny bridge between React (typing, sockets, AI) and Phaser (visuals).
 *
 * React writes target progress / nitro / finish into this plain object; the Phaser
 * scene reads it every frame and interpolates. No React re-render is needed to move
 * a motorcycle, which keeps typing input fast.
 */
import { playerColor } from '@shared/gameConfig';
import type { RacePhase, RacerInfo } from '../types/Race';

export interface RacerVisual {
  id: string;
  name: string;
  slot: number;
  motorcycleId: string;
  isLocal: boolean;
  isBot: boolean;
  color: number;
  colorHex: string;
  /** Progress (0..1) the bike is moving towards. */
  target: number;
  /** Progress currently drawn (interpolated by Phaser). */
  display: number;
  /** Smoothed speed in progress units per second. */
  speed: number;
  /** performance.now() timestamp until which the nitro effect is shown. */
  nitroUntil: number;
  finished: boolean;
  finishPosition: number | null;
  left: boolean;
}

export type RaceVisualEvent =
  | { type: 'error'; id: string }
  | { type: 'nitro'; id: string }
  | { type: 'finish'; id: string; position: number | null }
  | { type: 'go' };

type Listener = (event: RaceVisualEvent) => void;

export class RaceManager {
  /** Racers sorted by slot = lane order (top to bottom). */
  readonly racers: RacerVisual[];
  phase: RacePhase = 'countdown';
  private readonly byId = new Map<string, RacerVisual>();
  private readonly listeners = new Set<Listener>();

  constructor(
    readonly trackId: string,
    readonly localId: string,
    readonly textLength: number,
    racers: RacerInfo[],
  ) {
    this.racers = [...racers]
      .sort((a, b) => a.slot - b.slot)
      .map((r) => {
        const color = playerColor(r.slot);
        return {
          id: r.id,
          name: r.name,
          slot: r.slot,
          motorcycleId: r.motorcycleId,
          isLocal: r.isLocal,
          isBot: r.isBot,
          color: color.value,
          colorHex: color.hex,
          target: 0,
          display: 0,
          speed: 0,
          nitroUntil: 0,
          finished: false,
          finishPosition: null,
          left: false,
        };
      });
    for (const racer of this.racers) this.byId.set(racer.id, racer);
  }

  get(id: string): RacerVisual | undefined {
    return this.byId.get(id);
  }

  get local(): RacerVisual | undefined {
    return this.byId.get(this.localId);
  }

  /** Progress never moves backwards on screen. */
  setProgress(id: string, progress: number): void {
    const racer = this.byId.get(id);
    if (!racer || !Number.isFinite(progress)) return;
    racer.target = Math.max(racer.target, Math.min(1, Math.max(0, progress)));
  }

  triggerNitro(id: string, durationMs: number): void {
    const racer = this.byId.get(id);
    if (!racer || durationMs <= 0) return;
    racer.nitroUntil = performance.now() + durationMs;
    this.emit({ type: 'nitro', id });
  }

  flagError(id: string): void {
    if (this.byId.has(id)) this.emit({ type: 'error', id });
  }

  setFinished(id: string, position: number | null): void {
    const racer = this.byId.get(id);
    if (!racer) return;
    if (racer.finished && (position === null || racer.finishPosition === position)) return;
    racer.finished = true;
    if (position !== null) racer.finishPosition = position;
    racer.target = 1;
    this.emit({ type: 'finish', id, position: racer.finishPosition });
  }

  setLeft(id: string): void {
    const racer = this.byId.get(id);
    if (racer) racer.left = true;
  }

  setPhase(phase: RacePhase): void {
    if (phase === this.phase) return;
    const wasCountdown = this.phase === 'countdown';
    this.phase = phase;
    if (wasCountdown && phase === 'racing') this.emit({ type: 'go' });
  }

  on(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: RaceVisualEvent): void {
    for (const listener of this.listeners) listener(event);
  }
}
