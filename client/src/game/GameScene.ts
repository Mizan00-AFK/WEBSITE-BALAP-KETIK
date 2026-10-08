/**
 * GameScene - renders the race. It never decides anything about the race; it only
 * reads RaceManager (written by React) and turns it into motion:
 *
 *   target progress -> smoothly interpolated bike position (works for 15 Hz network updates)
 *   local speed     -> parallax scroll, speed lines, engine bob, light camera shake
 *   nitro           -> flame, sparks, shake, speed lines
 *   finish          -> wheelie + confetti + lane result
 */
import * as Phaser from 'phaser';
import { getMotorcycle } from '@shared/motorcycles';
import { VISUAL_CONFIG } from './GameConfig';
import { createPlaceholderBike, motoTextureKey, MotorcycleView } from './Motorcycle';
import { createEffectTextures, SpeedLines } from './NitroEffect';
import type { RaceManager, RaceVisualEvent } from './RaceManager';
import { computeLayout, getTrackTheme, laneGroundY, TrackView, type TrackLayout } from './Track';

export interface GameSceneData {
  manager: RaceManager;
}

const POSITION_COLORS = ['#fbbf24', '#e2e8f0', '#f59e0b', '#94a3b8'];

export class GameScene extends Phaser.Scene {
  private manager!: RaceManager;
  private dpr = 1;
  private layout!: TrackLayout;
  private track!: TrackView;
  private bikes = new Map<string, MotorcycleView>();
  private speedLines!: SpeedLines;
  private smoke!: Phaser.GameObjects.Particles.ParticleEmitter;
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  private confetti!: Phaser.GameObjects.Particles.ParticleEmitter;
  private roadSpeed = 0;
  private shakeCooldown = 0;
  private resizeTimer: Phaser.Time.TimerEvent | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: GameSceneData): void {
    this.manager = data.manager;
    this.dpr = (this.registry.get('dpr') as number | undefined) ?? 1;
    this.bikes = new Map();
    this.roadSpeed = 0;
  }

  private rasterWidth(layout: TrackLayout): number {
    return Math.max(64, Math.ceil(layout.bikeW / 32) * 32);
  }

  preload(): void {
    const layout = computeLayout(this.scale.width, this.scale.height, this.dpr, this.manager.racers.length);
    const width = this.rasterWidth(layout);
    const height = Math.round((width * 110) / 200);
    const ids = new Set(this.manager.racers.map((r) => r.motorcycleId));
    for (const id of ids) {
      const key = motoTextureKey(id, width);
      if (!this.textures.exists(key)) {
        this.load.svg(key, `${import.meta.env.BASE_URL}${getMotorcycle(id).sprite}`, { width, height });
      }
    }
  }

  create(): void {
    const { width, height } = this.scale;
    const L = computeLayout(width, height, this.dpr, this.manager.racers.length);
    this.layout = L;
    const u = L.u;

    createEffectTextures(this);
    this.track = new TrackView(this, getTrackTheme(this.manager.trackId), L, this.manager.racers);

    const rasterWidth = this.rasterWidth(L);
    this.manager.racers.forEach((racer, lane) => {
      const key = motoTextureKey(racer.motorcycleId, rasterWidth);
      if (!this.textures.exists(key)) createPlaceholderBike(this, key, racer.motorcycleId, rasterWidth);
      const bike = new MotorcycleView(this, {
        textureKey: key,
        bikeW: L.bikeW,
        bikeH: L.bikeH,
        color: racer.color,
        colorHex: racer.colorHex,
        isLocal: racer.isLocal,
        u,
        depth: 20 + lane,
      });
      bike.setFaded(racer.left);
      if (racer.finished && racer.display >= 0.995) {
        bike.finishPlayed = true;
        bike.finishOffset = this.finishOffsetTarget();
        if (racer.finishPosition) {
          this.track.setLaneResult(lane, `#${racer.finishPosition}`, POSITION_COLORS[racer.finishPosition - 1] ?? '#94a3b8');
        }
      }
      this.bikes.set(racer.id, bike);
    });

    this.smoke = this.add.particles(0, 0, 'fx-puff', {
      lifespan: 650,
      speedX: { min: -110 * u, max: -40 * u },
      speedY: { min: -14 * u, max: 4 * u },
      scale: { start: 0.25 * u, end: 0.9 * u },
      alpha: { start: 0.28, end: 0 },
      tint: 0x94a3b8,
      emitting: false,
    });
    this.smoke.setDepth(19);

    this.sparks = this.add.particles(0, 0, 'fx-spark', {
      lifespan: 320,
      speedX: { min: -420 * u, max: -160 * u },
      speedY: { min: -60 * u, max: 60 * u },
      scale: { start: 0.9 * u, end: 0 },
      tint: [0xfde047, 0xfb923c, 0xffffff],
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
    this.sparks.setDepth(28);

    this.confetti = this.add.particles(0, 0, 'fx-confetti', {
      lifespan: 1400,
      speed: { min: 180 * u, max: 460 * u },
      angle: { min: 200, max: 340 },
      gravityY: 700 * u,
      rotate: { min: 0, max: 360 },
      scale: { start: 0.9 * u, end: 0.5 * u },
      tint: [0x22d3ee, 0xfb923c, 0xa855f7, 0x22c55e, 0xfacc15, 0xffffff],
      emitting: false,
    });
    this.confetti.setDepth(40);

    this.speedLines = new SpeedLines(this, { top: 0, bottom: L.height, width: L.width, u }, 30);

    this.unsubscribe = this.manager.on((event) => this.onRaceEvent(event));
    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribe?.();
      this.unsubscribe = null;
      this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this);
    });
  }

  /** Rebuild the whole scene for the new size (progress is kept in RaceManager). */
  private onResize(): void {
    this.resizeTimer?.remove();
    this.resizeTimer = this.time.delayedCall(120, () => {
      this.scene.restart({ manager: this.manager } satisfies GameSceneData);
    });
  }

  /** How far a finished bike rolls past the line (its front stays on screen). */
  private finishOffsetTarget(): number {
    const L = this.layout;
    return Math.max(0, Math.min(L.bikeW * 0.42, L.width - L.finishX - 6 * L.u));
  }

  private onRaceEvent(event: RaceVisualEvent): void {
    if (event.type === 'go') {
      for (const bike of this.bikes.values()) {
        const p = bike.exhaustWorld();
        this.smoke.emitParticleAt(p.x, p.y, 6);
      }
      return;
    }
    const bike = this.bikes.get(event.id);
    const racer = this.manager.get(event.id);
    if (!bike || !racer) return;
    if (event.type === 'error') {
      bike.playError();
      // A typo costs the local rider a bit of momentum.
      if (racer.isLocal) this.roadSpeed *= 0.55;
    } else if (event.type === 'nitro') {
      bike.playNitro();
      if (racer.isLocal) this.cameras.main.shake(260, 0.0045);
    }
  }

  update(_time: number, deltaMs: number): void {
    if (!this.layout) return;
    const dt = Math.min(deltaMs, 50) / 1000;
    const L = this.layout;
    const u = L.u;
    const now = performance.now();
    const trackLength = L.finishX - L.startX;
    const smoothing = 1 - Math.exp(-dt * VISUAL_CONFIG.progressSmoothing);
    const speedSmoothing = 1 - Math.exp(-dt * VISUAL_CONFIG.speedSmoothing);
    const racing = this.manager.phase === 'racing';
    const finishTarget = this.finishOffsetTarget();

    this.manager.racers.forEach((racer, lane) => {
      const bike = this.bikes.get(racer.id);
      if (!bike) return;
      const before = racer.display;
      racer.display += (racer.target - racer.display) * smoothing;
      if (Math.abs(racer.target - racer.display) < 0.0004) racer.display = racer.target;
      const velocity = dt > 0 ? (racer.display - before) / dt : 0;
      racer.speed += (velocity - racer.speed) * speedSmoothing;

      if (racer.finished && racer.display >= 0.995) {
        if (!bike.finishPlayed) {
          bike.playFinish();
          this.confetti.explode(28, L.finishX, laneGroundY(L, lane) - L.bikeH * 0.6);
          if (racer.finishPosition) {
            this.track.setLaneResult(
              lane,
              `#${racer.finishPosition}`,
              POSITION_COLORS[racer.finishPosition - 1] ?? '#94a3b8',
            );
          }
        }
        bike.finishOffset += (finishTarget - bike.finishOffset) * Math.min(1, dt * 2.5);
      }

      const x = L.startX - L.bikeW / 2 + racer.display * trackLength + bike.finishOffset;
      const y = laneGroundY(L, lane);
      const nitroActive = now < racer.nitroUntil;
      const screenSpeed = Math.max(0, racer.speed * trackLength);
      bike.setFaded(racer.left);
      bike.update(dt, x, y, screenSpeed, racing ? this.roadSpeed : this.roadSpeed * 0.5, nitroActive);

      // Exhaust smoke + nitro sparks
      bike.smokeTimer -= dt;
      const moving = screenSpeed > 2 * u || this.roadSpeed > 20 * u;
      if (bike.smokeTimer <= 0 && !racer.left) {
        bike.smokeTimer = moving ? 0.08 : 0.35;
        const p = bike.exhaustWorld();
        this.smoke.emitParticleAt(p.x, p.y, 1);
      }
      if (nitroActive) {
        const p = bike.exhaustWorld();
        this.sparks.emitParticleAt(p.x - 8 * u, p.y, 2);
      }
    });

    // Local rider speed drives the parallax, speed lines and engine feel.
    const local = this.manager.local;
    const localNitro = local ? now < local.nitroUntil : false;
    const cps = local ? Math.max(0, local.speed) * this.manager.textLength : 0;
    const factor = Math.min(1.6, cps / VISUAL_CONFIG.fullSpeedCps);
    let targetRoad = 0;
    if (racing) {
      targetRoad = factor * VISUAL_CONFIG.roadScrollAtFullSpeed * u * (localNitro ? 1.6 : 1);
      if (local?.finished) targetRoad = 0.12 * VISUAL_CONFIG.roadScrollAtFullSpeed * u;
    }
    this.roadSpeed += (targetRoad - this.roadSpeed) * (1 - Math.exp(-dt * 2.5));
    this.track.update(this.roadSpeed * dt);

    const lineIntensity =
      Math.max(0, (factor - VISUAL_CONFIG.speedLinesThreshold) / 0.8) + (localNitro ? 0.9 : 0);
    this.speedLines.update(dt, racing ? lineIntensity : 0, local?.color ?? 0x22d3ee);

    // Very light camera shake at high speed
    this.shakeCooldown -= dt;
    if (racing && factor > 1.05 && this.shakeCooldown <= 0) {
      this.shakeCooldown = 0.45;
      this.cameras.main.shake(140, 0.0009 * Math.min(2, factor));
    }
  }
}
