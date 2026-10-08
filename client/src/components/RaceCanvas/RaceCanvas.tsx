import { memo, useEffect, useRef } from 'react';
import * as Phaser from 'phaser';
import { createPhaserConfig, VISUAL_CONFIG } from '../../game/GameConfig';
import { GameScene, type GameSceneData } from '../../game/GameScene';
import type { RaceManager } from '../../game/RaceManager';
import './RaceCanvas.css';

interface RaceCanvasProps {
  manager: RaceManager;
}

const pixelRatio = () => Math.min(window.devicePixelRatio || 1, VISUAL_CONFIG.maxPixelRatio);

/**
 * Hosts the Phaser game. It is created once per race and never re-rendered by
 * React - all motion comes from RaceManager.
 */
function RaceCanvas({ manager }: RaceCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let game: Phaser.Game | null = null;
    let disposed = false;
    let observer: ResizeObserver | null = null;
    let frame = 0;

    const start = async () => {
      // Make sure the HUD fonts are ready before Phaser draws text.
      try {
        await Promise.race([
          Promise.all([document.fonts.load('700 16px Rajdhani'), document.fonts.load('800 16px Orbitron')]),
          new Promise((resolve) => setTimeout(resolve, 1200)),
        ]);
      } catch {
        // fonts are optional
      }
      if (disposed) return;

      const dpr = pixelRatio();
      const rect = host.getBoundingClientRect();
      game = new Phaser.Game(createPhaserConfig(host, Math.max(200, rect.width), Math.max(120, rect.height), dpr));
      game.registry.set('dpr', dpr);
      game.scene.add('GameScene', GameScene, true, { manager } satisfies GameSceneData);

      observer = new ResizeObserver(() => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          if (!game) return;
          const r = host.getBoundingClientRect();
          if (r.width < 10 || r.height < 10) return;
          const ratio = pixelRatio();
          const width = Math.round(r.width * ratio);
          const height = Math.round(r.height * ratio);
          if (width === game.scale.width && height === game.scale.height && game.registry.get('dpr') === ratio) return;
          game.registry.set('dpr', ratio);
          game.scale.zoom = 1 / ratio;
          game.scale.resize(width, height);
        });
      });
      observer.observe(host);
    };

    void start();

    return () => {
      disposed = true;
      observer?.disconnect();
      cancelAnimationFrame(frame);
      game?.destroy(true);
      game = null;
    };
  }, [manager]);

  return <div className="race-canvas" ref={hostRef} />;
}

export default memo(RaceCanvas);
