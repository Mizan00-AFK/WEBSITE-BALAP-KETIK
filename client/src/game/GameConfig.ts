/**
 * Phaser configuration + visual tuning.
 * Gameplay numbers live in GAME_CONFIG (shared/gameConfig.ts) - re-exported here.
 */
import * as Phaser from 'phaser';

export { GAME_CONFIG, PLAYER_COLORS, playerColor } from '@shared/gameConfig';

export const VISUAL_CONFIG = {
  /** Canvas resolution cap (2 = crisp on retina without wasting GPU). */
  maxPixelRatio: 2,
  /** How fast a bike chases its target progress (higher = snappier). */
  progressSmoothing: 9,
  /** Smoothing of the measured speed used for effects. */
  speedSmoothing: 3,
  /** Characters per second treated as "full speed" for effects (8 cps = 96 WPM). */
  fullSpeedCps: 8,
  /** Speed factor (0..1.6) from which speed lines appear (~45 WPM). */
  speedLinesThreshold: 0.45,
  /** Road scroll at full speed, CSS px per second. */
  roadScrollAtFullSpeed: 1100,
  /** Lane label column width (CSS px) on wide / narrow screens. */
  laneLabelWide: 108,
  laneLabelNarrow: 34,
  wideBreakpoint: 720,
} as const;

export function createPhaserConfig(
  parent: HTMLElement,
  cssWidth: number,
  cssHeight: number,
  dpr: number,
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    // The canvas is rendered at device resolution and shown at CSS size (zoom = 1/dpr).
    width: Math.round(cssWidth * dpr),
    height: Math.round(cssHeight * dpr),
    backgroundColor: '#080B12',
    scale: { mode: Phaser.Scale.NONE, zoom: 1 / dpr },
    // pixelArt must be forced off, otherwise Phaser enables it when zoom !== 1.
    render: { antialias: true, pixelArt: false, roundPixels: false, powerPreference: 'high-performance' },
    banner: false,
    audio: { noAudio: true },
    // React owns all input (typing box), Phaser only renders.
    input: { keyboard: false, mouse: false, touch: false, gamepad: false },
    scene: [],
  };
}
