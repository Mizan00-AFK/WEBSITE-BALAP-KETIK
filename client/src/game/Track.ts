/**
 * Track - layout maths + procedurally generated race track.
 *
 * Layers (back to front): sky, stars, far scenery, near scenery, road lights,
 * asphalt, lanes, barriers, start line, finish line, lane labels.
 * Scenery, lights, asphalt and lane dividers scroll (parallax) with the local
 * player's speed. Everything is drawn with canvas textures, so no image assets
 * are needed. To add a track: add an id to shared/tracks.ts and a theme below.
 */
import * as Phaser from 'phaser';
import { VISUAL_CONFIG } from './GameConfig';
import type { RacerVisual } from './RaceManager';

export interface TrackTheme {
  skyTop: string;
  skyBottom: string;
  horizonGlow: string;
  celestial: 'moon' | 'sun' | 'aurora';
  stars: boolean;
  scenery: 'city' | 'mountains';
  farColor: string;
  nearColor: string;
  windowColors: string[];
  accent: number;
  accentCss: string;
  road: string;
  roadSpeck: string;
  divider: string;
  barrierA: string;
  barrierB: string;
  lampColor: string;
  shoulder: string;
}

export const TRACK_THEMES: Record<string, TrackTheme> = {
  'neon-city': {
    skyTop: '#03040a',
    skyBottom: '#1d1140',
    horizonGlow: 'rgba(168, 85, 247, 0.38)',
    celestial: 'moon',
    stars: true,
    scenery: 'city',
    farColor: '#17122d',
    nearColor: '#0c0a1d',
    windowColors: ['#22d3ee', '#a855f7', '#fb923c', '#f472b6'],
    accent: 0x22d3ee,
    accentCss: '#22d3ee',
    road: '#141821',
    roadSpeck: '#232a3a',
    divider: '#e2e8f0',
    barrierA: '#22d3ee',
    barrierB: '#0b1220',
    lampColor: '#67e8f9',
    shoulder: '#0a0d14',
  },
  'sunset-highway': {
    skyTop: '#1e1b4b',
    skyBottom: '#fb7185',
    horizonGlow: 'rgba(251, 146, 60, 0.6)',
    celestial: 'sun',
    stars: false,
    scenery: 'mountains',
    farColor: '#5b2a86',
    nearColor: '#2a0f45',
    windowColors: ['#fde68a'],
    accent: 0xfb923c,
    accentCss: '#fb923c',
    road: '#1b1720',
    roadSpeck: '#2b2430',
    divider: '#fde68a',
    barrierA: '#fb923c',
    barrierB: '#1c1917',
    lampColor: '#fdba74',
    shoulder: '#120c10',
  },
  'aurora-pass': {
    skyTop: '#01030a',
    skyBottom: '#0d3540',
    horizonGlow: 'rgba(34, 197, 94, 0.28)',
    celestial: 'aurora',
    stars: true,
    scenery: 'mountains',
    farColor: '#11303a',
    nearColor: '#061a1f',
    windowColors: ['#86efac'],
    accent: 0x22c55e,
    accentCss: '#22c55e',
    road: '#10161d',
    roadSpeck: '#1d2733',
    divider: '#d1fae5',
    barrierA: '#22c55e',
    barrierB: '#052e16',
    lampColor: '#86efac',
    shoulder: '#06110f',
  },
};

export function getTrackTheme(id: string): TrackTheme {
  return TRACK_THEMES[id] ?? TRACK_THEMES['neon-city'];
}

export interface TrackLayout {
  width: number;
  height: number;
  /** Device pixel ratio - multiply CSS sizes by this. */
  u: number;
  skyH: number;
  roadTop: number;
  roadBottom: number;
  barrierH: number;
  laneTop: number;
  laneBottom: number;
  laneH: number;
  laneCount: number;
  labelW: number;
  wide: boolean;
  startX: number;
  finishX: number;
  bikeW: number;
  bikeH: number;
}

export function computeLayout(width: number, height: number, dpr: number, laneCount: number): TrackLayout {
  const u = dpr;
  const cssWidth = width / u;
  const cssHeight = height / u;
  const lanes = Math.max(1, laneCount);
  const shoulderH = Math.round(Math.max(6 * u, height * 0.05));
  const roadBottom = height - shoulderH;
  let roadTop = Math.round(height * (cssHeight < 300 ? 0.2 : 0.26));
  const barrierH = Math.round(Math.max(4 * u, (roadBottom - roadTop) * 0.03));
  const wide = cssWidth >= VISUAL_CONFIG.wideBreakpoint;
  const labelW = (wide ? VISUAL_CONFIG.laneLabelWide : VISUAL_CONFIG.laneLabelNarrow) * u;
  const finishX = width - Math.max(40 * u, width * 0.05);
  const maxBikeW = (finishX - labelW) * (wide ? 0.16 : 0.24);

  // Few lanes (e.g. practice = 1 lane): keep lanes a sensible height and give the
  // remaining space to the sky instead of drawing one giant lane.
  const maxLaneH = ((maxBikeW * 110) / 200 / 0.92) * 1.2;
  if ((roadBottom - roadTop - 2 * barrierH) / lanes > maxLaneH) {
    roadTop = Math.round(roadBottom - 2 * barrierH - maxLaneH * lanes);
  }
  const skyH = roadTop;
  const laneTop = roadTop + barrierH;
  const laneBottom = roadBottom - barrierH;
  const laneH = (laneBottom - laneTop) / lanes;

  let bikeH = laneH * 0.92;
  let bikeW = (bikeH * 200) / 110;
  if (bikeW > maxBikeW) {
    bikeW = maxBikeW;
    bikeH = (bikeW * 110) / 200;
  }
  const startX = labelW + bikeW + 8 * u;

  return {
    width,
    height,
    u,
    skyH,
    roadTop,
    roadBottom,
    barrierH,
    laneTop,
    laneBottom,
    laneH,
    laneCount: lanes,
    labelW,
    wide,
    startX,
    finishX,
    bikeW,
    bikeH,
  };
}

/** Y coordinate where a bike in `lane` touches the asphalt. */
export function laneGroundY(layout: TrackLayout, lane: number): number {
  return layout.laneTop + layout.laneH * (lane + 1) - layout.laneH * 0.06;
}

export function laneCenterY(layout: TrackLayout, lane: number): number {
  return layout.laneTop + layout.laneH * (lane + 0.5);
}

/** Creates (or replaces) a texture drawn with the 2D canvas API. */
export function drawCanvasTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
): void {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const texture = scene.textures.createCanvas(key, w, h);
  if (!texture) return;
  draw(texture.getContext(), w, h);
  texture.refresh();
}

/** Deterministic random numbers so the scenery does not change on resize. */
function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DEPTH = {
  sky: 0,
  stars: 1,
  far: 2,
  near: 3,
  lamps: 4,
  road: 5,
  laneTint: 6,
  dividers: 7,
  barriers: 8,
  edges: 9,
  lines: 10,
  labels: 11,
} as const;

interface LaneLabel {
  tag: Phaser.GameObjects.Text;
  name: Phaser.GameObjects.Text | null;
  result: Phaser.GameObjects.Text | null;
}

export class TrackView {
  private readonly scrollLayers: { sprite: Phaser.GameObjects.TileSprite; factor: number }[] = [];
  private readonly labels: LaneLabel[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly theme: TrackTheme,
    private readonly layout: TrackLayout,
    racers: RacerVisual[],
  ) {
    this.buildSky();
    this.buildScenery();
    this.buildRoad(racers);
    this.buildLines();
    this.buildLabels(racers);
  }

  /** Scrolls every parallax layer by `scrollPx` (physical pixels). */
  update(scrollPx: number): void {
    if (scrollPx === 0) return;
    for (const layer of this.scrollLayers) {
      layer.sprite.tilePositionX = (layer.sprite.tilePositionX + scrollPx * layer.factor) % 100000;
    }
  }

  /** Shows "1ST", "2ND" ... next to a lane once that racer finished. */
  setLaneResult(lane: number, text: string, color: string): void {
    const label = this.labels[lane];
    if (!label) return;
    if (label.result) {
      label.result.setText(text).setColor(color).setVisible(true);
    } else {
      label.tag.setText(text).setColor(color);
    }
  }

  private addScroll(sprite: Phaser.GameObjects.TileSprite, factor: number): void {
    this.scrollLayers.push({ sprite, factor });
  }

  private buildSky(): void {
    const { scene, theme: t, layout: L } = this;
    const u = L.u;
    drawCanvasTexture(scene, 'trk-sky', L.width, L.skyH, (ctx, w, h) => {
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, t.skyTop);
      sky.addColorStop(1, t.skyBottom);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      const glow = ctx.createRadialGradient(w * 0.55, h * 1.05, 0, w * 0.55, h * 1.05, Math.max(w * 0.55, h));
      glow.addColorStop(0, t.horizonGlow);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      if (t.celestial === 'moon') {
        const r = h * 0.13;
        const cx = w * 0.82;
        const cy = h * 0.3;
        const halo = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 3);
        halo.addColorStop(0, 'rgba(226,232,240,0.28)');
        halo.addColorStop(1, 'rgba(226,232,240,0)');
        ctx.fillStyle = halo;
        ctx.fillRect(cx - r * 3, cy - r * 3, r * 6, r * 6);
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(148,163,184,0.45)';
        ctx.beginPath();
        ctx.arc(cx - r * 0.3, cy - r * 0.2, r * 0.22, 0, Math.PI * 2);
        ctx.arc(cx + r * 0.35, cy + r * 0.3, r * 0.15, 0, Math.PI * 2);
        ctx.fill();
      } else if (t.celestial === 'sun') {
        const r = h * 0.45;
        const cx = w * 0.68;
        const cy = h * 0.95;
        const sun = ctx.createLinearGradient(0, cy - r, 0, cy + r * 0.2);
        sun.addColorStop(0, '#fde68a');
        sun.addColorStop(0.5, '#fb923c');
        sun.addColorStop(1, '#db2777');
        ctx.fillStyle = sun;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        // Retro stripes cut with the sky colour
        ctx.fillStyle = sky;
        for (let k = 0; k < 6; k += 1) {
          const y = cy - r * 0.32 + k * r * 0.15;
          ctx.fillRect(cx - r, y, r * 2, (1 + k) * 1.2 * u);
        }
      } else {
        // Aurora ribbons
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.shadowBlur = 24 * u;
        const colors = ['rgba(34,197,94,0.22)', 'rgba(45,212,191,0.18)', 'rgba(168,85,247,0.12)'];
        colors.forEach((color, i) => {
          ctx.strokeStyle = color;
          ctx.shadowColor = color;
          ctx.lineWidth = h * (0.12 - i * 0.025);
          ctx.beginPath();
          const base = h * (0.25 + i * 0.12);
          ctx.moveTo(-20, base);
          for (let x = 0; x <= w + 40; x += w / 6) {
            ctx.quadraticCurveTo(x + w / 12, base + Math.sin(x * 0.01 + i) * h * 0.18, x + w / 6, base);
          }
          ctx.stroke();
        });
        ctx.restore();
      }
    });
    scene.add.image(0, 0, 'trk-sky').setOrigin(0, 0).setDepth(DEPTH.sky);

    if (t.stars) {
      const rand = seededRandom(7);
      drawCanvasTexture(scene, 'trk-stars', 512 * u, L.skyH, (ctx, w, h) => {
        for (let i = 0; i < 90; i += 1) {
          ctx.fillStyle = `rgba(255,255,255,${0.25 + rand() * 0.65})`;
          const size = (0.5 + rand() * 1.1) * u;
          ctx.fillRect(rand() * w, rand() * h * 0.8, size, size);
        }
      });
      const stars = scene.add.tileSprite(0, 0, L.width, L.skyH, 'trk-stars').setOrigin(0, 0).setDepth(DEPTH.stars);
      this.addScroll(stars, 0.02);
    }
  }

  private buildScenery(): void {
    const { scene, theme: t, layout: L } = this;
    const u = L.u;
    const texW = Math.min(2048, Math.round(1024 * u));
    const farH = Math.round(Math.min(L.skyH * 0.72, 190 * u));
    const nearH = Math.round(Math.min(L.skyH * 0.5, 130 * u));

    drawCanvasTexture(scene, 'trk-far', texW, farH, (ctx, w, h) => {
      const rand = seededRandom(11);
      ctx.fillStyle = t.farColor;
      if (t.scenery === 'city') {
        let x = 0;
        while (x < w) {
          const bw = (24 + rand() * 60) * u;
          const bh = h * (0.35 + rand() * 0.6);
          ctx.fillStyle = t.farColor;
          ctx.fillRect(x, h - bh, bw - 2 * u, bh);
          for (let wy = h - bh + 6 * u; wy < h - 4 * u; wy += 7 * u) {
            for (let wx = x + 4 * u; wx < x + bw - 6 * u; wx += 6 * u) {
              if (rand() < 0.14) {
                ctx.fillStyle = t.windowColors[Math.floor(rand() * t.windowColors.length)];
                ctx.globalAlpha = 0.5;
                ctx.fillRect(wx, wy, 2 * u, 2.5 * u);
                ctx.globalAlpha = 1;
              }
            }
          }
          x += bw;
        }
      } else {
        const p1 = rand() * 6;
        const p2 = rand() * 6;
        const p3 = rand() * 6;
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 4) {
          const k = (x / w) * Math.PI * 2;
          const y = h * (0.42 + 0.18 * Math.sin(k * 2 + p1) + 0.12 * Math.sin(k * 5 + p2) + 0.05 * Math.sin(k * 11 + p3));
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();
      }
    });
    const far = this.scene.add
      .tileSprite(0, L.skyH - farH, L.width, farH, 'trk-far')
      .setOrigin(0, 0)
      .setDepth(DEPTH.far);
    this.addScroll(far, 0.12);

    drawCanvasTexture(scene, 'trk-near', texW, nearH, (ctx, w, h) => {
      const rand = seededRandom(23);
      if (t.scenery === 'city') {
        let x = 0;
        while (x < w) {
          const bw = (40 + rand() * 80) * u;
          const bh = h * (0.4 + rand() * 0.6);
          ctx.fillStyle = t.nearColor;
          ctx.fillRect(x, h - bh, bw - 3 * u, bh);
          ctx.fillStyle = t.accentCss;
          ctx.globalAlpha = 0.35;
          ctx.fillRect(x, h - bh, bw - 3 * u, 1.2 * u);
          if (rand() < 0.35) {
            ctx.globalAlpha = 0.75;
            ctx.fillStyle = t.windowColors[Math.floor(rand() * t.windowColors.length)];
            ctx.fillRect(x + bw * 0.2, h - bh + 8 * u, bw * 0.4, 4 * u);
          }
          ctx.globalAlpha = 1;
          x += bw;
        }
      } else {
        const p1 = rand() * 6;
        const p2 = rand() * 6;
        ctx.fillStyle = t.nearColor;
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 4) {
          const k = (x / w) * Math.PI * 2;
          ctx.lineTo(x, h * (0.62 + 0.12 * Math.sin(k * 3 + p1) + 0.06 * Math.sin(k * 8 + p2)));
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();
        for (let i = 0; i < 40; i += 1) {
          const tx = rand() * w;
          const th = h * (0.25 + rand() * 0.35);
          const tw = th * 0.45;
          for (const offset of [-w, 0, w]) {
            ctx.beginPath();
            ctx.moveTo(tx + offset, h - th - h * 0.15);
            ctx.lineTo(tx + offset - tw / 2, h);
            ctx.lineTo(tx + offset + tw / 2, h);
            ctx.closePath();
            ctx.fill();
          }
        }
      }
    });
    const near = this.scene.add
      .tileSprite(0, L.skyH - nearH, L.width, nearH, 'trk-near')
      .setOrigin(0, 0)
      .setDepth(DEPTH.near);
    this.addScroll(near, 0.32);

    // Road lights (scroll with the road)
    const spacing = Math.round(230 * u);
    const lampH = Math.round(Math.min(L.skyH * 0.78, 96 * u));
    drawCanvasTexture(scene, 'trk-lamps', spacing, lampH, (ctx, w, h) => {
      const x = w * 0.5;
      const top = h * 0.12;
      const glow = ctx.createRadialGradient(x + 16 * u, top + 2 * u, 0, x + 16 * u, top + 2 * u, 22 * u);
      glow.addColorStop(0, t.lampColor);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = t.lampColor;
      ctx.beginPath();
      ctx.moveTo(x + 12 * u, top + 3 * u);
      ctx.lineTo(x - 6 * u, h);
      ctx.lineTo(x + 46 * u, h);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#334155';
      ctx.fillRect(x - 1.5 * u, top, 3 * u, h - top);
      ctx.fillRect(x - 1.5 * u, top, 18 * u, 2.5 * u);
      ctx.fillStyle = t.lampColor;
      ctx.fillRect(x + 10 * u, top + 2 * u, 12 * u, 3 * u);
    });
    const lamps = this.scene.add
      .tileSprite(0, L.roadTop - lampH, L.width, lampH, 'trk-lamps')
      .setOrigin(0, 0)
      .setDepth(DEPTH.lamps);
    this.addScroll(lamps, 1);
  }

  private buildRoad(racers: RacerVisual[]): void {
    const { scene, theme: t, layout: L } = this;
    const u = L.u;
    const roadH = L.roadBottom - L.roadTop;

    drawCanvasTexture(scene, 'trk-asphalt', 128 * u, 128 * u, (ctx, w, h) => {
      const rand = seededRandom(5);
      ctx.fillStyle = t.road;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 420; i += 1) {
        ctx.fillStyle = t.roadSpeck;
        ctx.globalAlpha = 0.35 + rand() * 0.6;
        const size = (0.6 + rand() * 1.4) * u;
        ctx.fillRect(rand() * w, rand() * h, size, size);
      }
      ctx.globalAlpha = 0.05;
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 6; i += 1) ctx.fillRect(rand() * w, rand() * h, (20 + rand() * 40) * u, 0.8 * u);
      ctx.globalAlpha = 1;
    });
    const road = scene.add
      .tileSprite(0, L.roadTop, L.width, roadH, 'trk-asphalt')
      .setOrigin(0, 0)
      .setDepth(DEPTH.road);
    this.addScroll(road, 1);

    // Shoulder below the road
    const shoulderH = L.height - L.roadBottom;
    if (shoulderH > 0) {
      drawCanvasTexture(scene, 'trk-shoulder', 120 * u, shoulderH, (ctx, w, h) => {
        ctx.fillStyle = t.shoulder;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = t.accentCss;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(w * 0.5, h * 0.35, 6 * u, Math.max(1, 1.5 * u));
        ctx.globalAlpha = 1;
      });
      const shoulder = scene.add
        .tileSprite(0, L.roadBottom, L.width, shoulderH, 'trk-shoulder')
        .setOrigin(0, 0)
        .setDepth(DEPTH.road);
      this.addScroll(shoulder, 1);
    }

    // Lane tint + coloured start boxes
    const tint = scene.add.graphics().setDepth(DEPTH.laneTint);
    racers.forEach((racer, lane) => {
      const y = L.laneTop + L.laneH * lane;
      if (lane % 2 === 1) {
        tint.fillStyle(0xffffff, 0.018);
        tint.fillRect(0, y, L.width, L.laneH);
      }
      tint.fillStyle(racer.color, 0.1);
      tint.fillRect(L.labelW, y, L.startX - L.labelW, L.laneH);
    });

    // Lane dividers
    const dashH = Math.max(2, Math.round(3 * u));
    drawCanvasTexture(scene, 'trk-dash', 72 * u, dashH, (ctx, w, h) => {
      ctx.fillStyle = t.divider;
      ctx.fillRect(0, 0, 40 * u, h);
      void w;
    });
    for (let i = 1; i < L.laneCount; i += 1) {
      const y = L.laneTop + L.laneH * i - dashH / 2;
      const dash = scene.add
        .tileSprite(0, y, L.width, dashH, 'trk-dash')
        .setOrigin(0, 0)
        .setAlpha(0.45)
        .setDepth(DEPTH.dividers);
      this.addScroll(dash, 1);
    }

    // Barriers
    drawCanvasTexture(scene, 'trk-barrier', 40 * u, L.barrierH, (ctx, w, h) => {
      ctx.fillStyle = t.barrierA;
      ctx.fillRect(0, 0, w / 2, h);
      ctx.fillStyle = t.barrierB;
      ctx.fillRect(w / 2, 0, w / 2, h);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(0, 0, w, Math.max(1, u));
    });
    for (const y of [L.roadTop, L.roadBottom - L.barrierH]) {
      const barrier = scene.add
        .tileSprite(0, y, L.width, L.barrierH, 'trk-barrier')
        .setOrigin(0, 0)
        .setDepth(DEPTH.barriers);
      this.addScroll(barrier, 1);
    }

    // Neon road edges
    const edges = scene.add.graphics().setDepth(DEPTH.edges);
    for (const y of [L.laneTop, L.laneBottom]) {
      edges.lineStyle(6 * u, t.accent, 0.16);
      edges.lineBetween(0, y, L.width, y);
      edges.lineStyle(1.5 * u, t.accent, 0.9);
      edges.lineBetween(0, y, L.width, y);
    }
  }

  private buildLines(): void {
    const { scene, theme: t, layout: L } = this;
    const u = L.u;
    const g = scene.add.graphics().setDepth(DEPTH.lines);

    const checker = (x: number, columns: number, size: number) => {
      for (let row = 0; L.laneTop + row * size < L.laneBottom; row += 1) {
        for (let col = 0; col < columns; col += 1) {
          g.fillStyle((row + col) % 2 === 0 ? 0xf8fafc : 0x0f172a, 0.92);
          const h = Math.min(size, L.laneBottom - (L.laneTop + row * size));
          g.fillRect(x + col * size, L.laneTop + row * size, size, h);
        }
      }
    };

    // Start line
    checker(L.startX - 2 * 5 * u, 2, 5 * u);

    // Finish line with glow
    g.fillStyle(t.accent, 0.14);
    g.fillRect(L.finishX - 8 * u, L.laneTop, 34 * u, L.laneBottom - L.laneTop);
    checker(L.finishX, 3, 6 * u);

    // Checkered flag above the finish line
    const poleTop = L.roadTop - Math.min(L.skyH * 0.6, 44 * u);
    g.fillStyle(0xe2e8f0, 1);
    g.fillRect(L.finishX, poleTop, 2 * u, L.roadTop - poleTop);
    const flagSize = 4 * u;
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        g.fillStyle((row + col) % 2 === 0 ? 0xf8fafc : 0x0f172a, 1);
        g.fillRect(L.finishX + 2 * u + col * flagSize, poleTop + row * flagSize, flagSize, flagSize);
      }
    }

    const fontSize = Math.round(10 * u);
    scene.add
      .text(L.finishX - 4 * u, poleTop - 2 * u, 'FINIS', {
        fontFamily: 'Orbitron, Rajdhani, sans-serif',
        fontSize: `${fontSize}px`,
        fontStyle: '700',
        color: '#f8fafc',
      })
      .setOrigin(1, 0)
      .setAlpha(0.85)
      .setDepth(DEPTH.lines);
    scene.add
      .text(L.startX + 4 * u, L.roadTop - 3 * u, 'MULAI', {
        fontFamily: 'Orbitron, Rajdhani, sans-serif',
        fontSize: `${fontSize}px`,
        fontStyle: '700',
        color: '#cbd5e1',
      })
      .setOrigin(0, 1)
      .setAlpha(0.7)
      .setDepth(DEPTH.lines);
  }

  private buildLabels(racers: RacerVisual[]): void {
    const { scene, layout: L } = this;
    const u = L.u;
    const g = scene.add.graphics().setDepth(DEPTH.labels);
    g.fillStyle(0x0b1020, 0.86);
    g.fillRect(0, L.laneTop, L.labelW, L.laneBottom - L.laneTop);
    g.lineStyle(Math.max(1, u), 0x334155, 0.6);
    g.lineBetween(L.labelW, L.laneTop, L.labelW, L.laneBottom);

    const tagSize = Math.round(Math.min(11 * u, L.laneH * 0.22));
    const nameSize = Math.round(Math.min(15 * u, L.laneH * 0.28));

    racers.forEach((racer, lane) => {
      const top = L.laneTop + L.laneH * lane;
      const cy = top + L.laneH / 2;
      g.fillStyle(racer.color, 1);
      g.fillRect(0, top + 2 * u, 4 * u, L.laneH - 4 * u);
      if (lane > 0) {
        g.lineStyle(Math.max(1, u), 0x334155, 0.5);
        g.lineBetween(0, top, L.labelW, top);
      }

      const tag = scene.add
        .text(L.wide ? 12 * u : L.labelW / 2 + 2 * u, L.wide ? cy - nameSize * 0.55 : cy, `P${lane + 1}`, {
          fontFamily: 'Orbitron, Rajdhani, sans-serif',
          fontSize: `${tagSize}px`,
          fontStyle: '700',
          color: racer.colorHex,
        })
        .setOrigin(L.wide ? 0 : 0.5, 0.5)
        .setDepth(DEPTH.labels);

      let name: Phaser.GameObjects.Text | null = null;
      let result: Phaser.GameObjects.Text | null = null;
      if (L.wide) {
        const label = racer.isLocal ? `${racer.name} (KAMU)` : racer.name;
        name = scene.add
          .text(12 * u, cy + tagSize * 0.55, label.length > 13 ? `${label.slice(0, 12)}...` : label, {
            fontFamily: 'Rajdhani, Inter, sans-serif',
            fontSize: `${nameSize}px`,
            fontStyle: '700',
            color: racer.isLocal ? '#ffffff' : '#cbd5e1',
          })
          .setOrigin(0, 0.5)
          .setDepth(DEPTH.labels);
        result = scene.add
          .text(L.labelW - 6 * u, cy - nameSize * 0.55, '', {
            fontFamily: 'Orbitron, Rajdhani, sans-serif',
            fontSize: `${tagSize}px`,
            fontStyle: '800',
            color: '#fbbf24',
          })
          .setOrigin(1, 0.5)
          .setVisible(false)
          .setDepth(DEPTH.labels);
      }
      this.labels.push({ tag, name, result });
    });
  }
}
