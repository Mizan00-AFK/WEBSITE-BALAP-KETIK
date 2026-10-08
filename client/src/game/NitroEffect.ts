/**
 * Nitro + speed effects: generated textures, exhaust flame and speed lines.
 */
import * as Phaser from 'phaser';
import { drawCanvasTexture } from './Track';

/** Small effect textures (independent of the screen size, created once). */
export function createEffectTextures(scene: Phaser.Scene): void {
  if (!scene.textures.exists('fx-flame')) {
    drawCanvasTexture(scene, 'fx-flame', 96, 32, (ctx, w, h) => {
      const g = ctx.createLinearGradient(w, 0, 0, 0);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.15, 'rgba(253,224,71,1)');
      g.addColorStop(0.5, 'rgba(249,115,22,0.85)');
      g.addColorStop(1, 'rgba(239,68,68,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(w, h * 0.2);
      ctx.quadraticCurveTo(w * 0.35, h * 0.05, 0, h / 2);
      ctx.quadraticCurveTo(w * 0.35, h * 0.95, w, h * 0.8);
      ctx.closePath();
      ctx.fill();
    });
  }
  if (!scene.textures.exists('fx-flame-core')) {
    drawCanvasTexture(scene, 'fx-flame-core', 64, 16, (ctx, w, h) => {
      const g = ctx.createLinearGradient(w, 0, 0, 0);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.3, 'rgba(103,232,249,0.95)');
      g.addColorStop(1, 'rgba(34,211,238,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(w, h * 0.15);
      ctx.quadraticCurveTo(w * 0.3, h * 0.2, 0, h / 2);
      ctx.quadraticCurveTo(w * 0.3, h * 0.8, w, h * 0.85);
      ctx.closePath();
      ctx.fill();
    });
  }
  if (!scene.textures.exists('fx-glow')) {
    drawCanvasTexture(scene, 'fx-glow', 64, 64, (ctx, w, h) => {
      const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      g.addColorStop(0, 'rgba(255,255,255,0.9)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });
  }
  if (!scene.textures.exists('fx-puff')) {
    drawCanvasTexture(scene, 'fx-puff', 32, 32, (ctx, w, h) => {
      const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      g.addColorStop(0, 'rgba(255,255,255,0.75)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });
  }
  if (!scene.textures.exists('fx-speedline')) {
    drawCanvasTexture(scene, 'fx-speedline', 256, 4, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.7, 'rgba(255,255,255,0.9)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });
  }
  if (!scene.textures.exists('fx-spark')) {
    drawCanvasTexture(scene, 'fx-spark', 8, 8, (ctx, w, h) => {
      const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });
  }
  if (!scene.textures.exists('fx-confetti')) {
    drawCanvasTexture(scene, 'fx-confetti', 6, 10, (ctx, w, h) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
    });
  }
}

/** Exhaust flame shown behind a motorcycle while nitro is active. */
export class NitroFlame {
  readonly flame: Phaser.GameObjects.Image;
  readonly core: Phaser.GameObjects.Image;
  private readonly flameScaleX: number;
  private readonly coreScaleX: number;
  private intensity = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, length: number) {
    this.flame = scene.add.image(x, y, 'fx-flame').setOrigin(1, 0.5).setBlendMode(Phaser.BlendModes.ADD);
    this.flame.setDisplaySize(length, length * 0.36);
    this.core = scene.add.image(x, y, 'fx-flame-core').setOrigin(1, 0.5).setBlendMode(Phaser.BlendModes.ADD);
    this.core.setDisplaySize(length * 0.55, length * 0.16);
    this.flameScaleX = this.flame.scaleX;
    this.coreScaleX = this.core.scaleX;
    this.flame.setAlpha(0);
    this.core.setAlpha(0);
  }

  update(dt: number, active: boolean): void {
    const target = active ? 1 : 0;
    this.intensity += (target - this.intensity) * Math.min(1, dt * (active ? 18 : 8));
    const i = this.intensity;
    this.flame.setAlpha(i);
    this.core.setAlpha(i);
    // Flicker: the flame length jitters every frame
    this.flame.scaleX = this.flameScaleX * (0.3 + 0.7 * i) * (0.8 + Math.random() * 0.45);
    this.core.scaleX = this.coreScaleX * (0.3 + 0.7 * i) * (0.85 + Math.random() * 0.3);
  }
}

interface SpeedLine {
  image: Phaser.GameObjects.Image;
  speed: number;
  active: boolean;
}

/** Horizontal speed streaks - more of them the faster the local player types. */
export class SpeedLines {
  private readonly lines: SpeedLine[] = [];
  private spawnBudget = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly area: { top: number; bottom: number; width: number; u: number },
    depth: number,
    poolSize = 36,
  ) {
    for (let i = 0; i < poolSize; i += 1) {
      const image = scene.add
        .image(-9999, 0, 'fx-speedline')
        .setOrigin(0, 0.5)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(depth)
        .setVisible(false);
      this.lines.push({ image, speed: 0, active: false });
    }
  }

  /** intensity: 0 (none) .. ~2 (nitro at full speed). */
  update(dt: number, intensity: number, tint: number): void {
    const { top, bottom, width, u } = this.area;
    if (intensity > 0.02) this.spawnBudget += dt * intensity * 28;
    while (this.spawnBudget >= 1) {
      this.spawnBudget -= 1;
      const line = this.lines.find((l) => !l.active);
      if (!line) {
        this.spawnBudget = 0;
        break;
      }
      line.active = true;
      line.speed = (1600 + Math.random() * 1400) * u * (0.7 + intensity * 0.4);
      const length = (80 + Math.random() * 180) * u;
      line.image
        .setVisible(true)
        .setPosition(width + Math.random() * width * 0.2, top + Math.random() * (bottom - top))
        .setDisplaySize(length, Math.max(1, (1 + Math.random() * 1.5) * u))
        .setTint(Math.random() < 0.6 ? 0xffffff : tint)
        .setAlpha(0.12 + Math.random() * 0.35 * Math.min(1, intensity));
    }
    for (const line of this.lines) {
      if (!line.active) continue;
      line.image.x -= line.speed * dt;
      if (line.image.x + line.image.displayWidth < 0) {
        line.active = false;
        line.image.setVisible(false);
      }
    }
  }
}
