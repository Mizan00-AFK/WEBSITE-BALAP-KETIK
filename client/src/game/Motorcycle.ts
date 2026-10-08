/**
 * MotorcycleView - one animated motorcycle in Phaser.
 *
 * States:
 *  - idle     : gentle bobbing on the start line
 *  - running  : spinning wheels + faster bobbing, proportional to speed
 *  - nitro    : exhaust flame + brighter underglow
 *  - finish   : wheelie
 * A typing mistake makes the bike wobble and lose a bit of momentum.
 *
 * The sprite is a static SVG/PNG (client/public/assets/motorcycles); the spokes,
 * flame and glow are drawn on top, so replacing the art is just swapping a file.
 */
import * as Phaser from 'phaser';
import { getMotorcycle, MOTORCYCLE_GEOMETRY as G } from '@shared/motorcycles';
import { NitroFlame } from './NitroEffect';
import { drawCanvasTexture } from './Track';

export function motoTextureKey(motorcycleId: string, rasterWidth: number): string {
  return `moto-${motorcycleId}-${rasterWidth}`;
}

/** Simple generated bike used when the sprite file is missing. */
export function createPlaceholderBike(scene: Phaser.Scene, key: string, motorcycleId: string, width: number): void {
  const color = getMotorcycle(motorcycleId).color;
  const height = Math.round((width * G.height) / G.width);
  const s = width / G.width;
  drawCanvasTexture(scene, key, width, height, (ctx) => {
    ctx.scale(s, s);
    for (const wheel of [G.rearWheel, G.frontWheel]) {
      ctx.fillStyle = '#05070c';
      ctx.beginPath();
      ctx.arc(wheel.x, wheel.y, G.wheelRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(wheel.x, wheel.y, G.rimRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(16, 46);
    ctx.lineTo(90, 40);
    ctx.lineTo(140, 36);
    ctx.lineTo(172, 54);
    ctx.lineTo(134, 76);
    ctx.lineTo(70, 74);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(80, 24, 34, 22);
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(120, 22, 11, 0, Math.PI * 2);
    ctx.fill();
  });
}

export interface MotorcycleOptions {
  textureKey: string;
  bikeW: number;
  bikeH: number;
  color: number;
  colorHex: string;
  isLocal: boolean;
  u: number;
  depth: number;
}

export class MotorcycleView {
  readonly container: Phaser.GameObjects.Container;
  /** Rotation (radians) of the wheelie - animated by a tween. */
  wheelie = 0;
  finishOffset = 0;
  finishPlayed = false;
  smokeTimer = Math.random() * 0.1;

  private readonly rig: Phaser.GameObjects.Container;
  private readonly spokes: Phaser.GameObjects.Graphics[];
  private readonly glow: Phaser.GameObjects.Image;
  private readonly flame: NitroFlame;
  private readonly s: number;
  private readonly exhaustLocal: { x: number; y: number };
  private readonly rearX: number;
  private wheelAngle = Math.random() * Math.PI;
  private bobTime = Math.random() * 10;
  private recoil = 0;
  private recoilTime = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly opts: MotorcycleOptions,
  ) {
    const { bikeW, bikeH, u } = opts;
    const s = bikeW / G.width;
    this.s = s;
    this.container = scene.add.container(0, 0).setDepth(opts.depth);

    // Player colour underglow (lane identification) + shadow
    this.glow = scene.add
      .image(0, -2 * u, 'fx-glow')
      .setDisplaySize(bikeW * 1.15, 16 * s + 6 * u)
      .setTint(opts.color)
      .setAlpha(0.5)
      .setBlendMode(Phaser.BlendModes.ADD);
    const shadow = scene.add.ellipse(0, 0, bikeW * 0.92, 9 * s, 0x000000, 0.45);

    // The rig pivots on the rear wheel's contact point so wheelies look right.
    this.rearX = (G.rearWheel.x - G.width / 2) * s;
    this.rig = scene.add.container(this.rearX, 0);
    const toRig = (sx: number, sy: number) => ({ x: (sx - G.width / 2) * s - this.rearX, y: (sy - G.height) * s });

    this.exhaustLocal = toRig(G.exhaust.x, G.exhaust.y);
    this.flame = new NitroFlame(scene, this.exhaustLocal.x, this.exhaustLocal.y, 74 * s);
    const body = scene.add.image(-this.rearX, 0, opts.textureKey).setOrigin(0.5, 1).setDisplaySize(bikeW, bikeH);

    this.spokes = [G.rearWheel, G.frontWheel].map((wheel) => {
      const p = toRig(wheel.x, wheel.y);
      const g = scene.add.graphics({ x: p.x, y: p.y });
      g.lineStyle(Math.max(1, 1.8 * s), 0xe2e8f0, 0.8);
      const r = G.rimRadius * s * 0.9;
      for (let k = 0; k < 5; k += 1) {
        const a = (k * Math.PI * 2) / 5;
        g.lineBetween(0, 0, Math.cos(a) * r, Math.sin(a) * r);
      }
      return g;
    });

    this.rig.add([this.flame.flame, this.flame.core, body, ...this.spokes]);
    this.container.add([this.glow, shadow, this.rig]);

    if (opts.isLocal) {
      const markerSize = 6 * u;
      const marker = scene.add.container((120 - G.width / 2) * s, -bikeH - 2 * u);
      const arrow = scene.add.triangle(0, 0, 0, 0, markerSize * 1.6, 0, markerSize * 0.8, markerSize, 0x22d3ee);
      arrow.setOrigin(0.5, 1);
      const label = scene.add
        .text(0, -markerSize - 1 * u, 'KAMU', {
          fontFamily: 'Orbitron, Rajdhani, sans-serif',
          fontSize: `${Math.round(8 * u)}px`,
          fontStyle: '800',
          color: '#22d3ee',
        })
        .setOrigin(0.5, 1);
      marker.add([arrow, label]);
      this.container.add(marker);
      scene.tweens.add({ targets: marker, y: marker.y - 3 * u, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  /**
   * @param screenSpeedPx how fast the bike moves across the screen (px/s)
   * @param roadSpeedPx   how fast the road scrolls (px/s)
   */
  update(dt: number, x: number, y: number, screenSpeedPx: number, roadSpeedPx: number, nitroActive: boolean): void {
    const u = this.opts.u;
    if (this.recoil > 0) {
      this.recoil = Math.max(0, this.recoil - dt * 3.2);
      this.recoilTime += dt;
    }
    const recoilX = -this.recoil * 10 * u;
    const wobble = Math.sin(this.recoilTime * 38) * this.recoil * 0.07;

    const groundSpeed = Math.max(0, screenSpeedPx) + roadSpeedPx;
    const speedFactor = Math.min(1.5, groundSpeed / (600 * u));
    this.bobTime += dt * (3 + speedFactor * 16);
    const bob = Math.sin(this.bobTime) * (0.35 + speedFactor * 0.9) * u;

    this.container.setPosition(x + recoilX, y + bob);
    this.rig.rotation = -this.wheelie + wobble;

    this.wheelAngle += (groundSpeed / (G.wheelRadius * this.s)) * dt;
    for (const spoke of this.spokes) spoke.rotation = this.wheelAngle;

    this.flame.update(dt, nitroActive);
    this.glow.setAlpha(nitroActive ? 0.95 : 0.5);
  }

  /** World position of the exhaust tip (for smoke / sparks). */
  exhaustWorld(): { x: number; y: number } {
    return {
      x: this.container.x + this.rearX + this.exhaustLocal.x,
      y: this.container.y + this.exhaustLocal.y,
    };
  }

  playError(): void {
    this.recoil = 1;
    this.recoilTime = 0;
  }

  playNitro(): void {
    this.scene.tweens.add({
      targets: this.glow,
      scaleX: this.glow.scaleX * 1.35,
      duration: 160,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }

  playFinish(): void {
    this.finishPlayed = true;
    this.scene.tweens.add({
      targets: this,
      wheelie: 0.26,
      duration: 260,
      hold: 650,
      yoyo: true,
      ease: 'Sine.easeOut',
    });
  }

  setFaded(faded: boolean): void {
    this.container.setAlpha(faded ? 0.3 : 1);
  }
}
