import type { CSSProperties } from 'react';
import { getMotorcycle } from '@shared/motorcycles';
import './MotoSprite.css';

interface MotoSpriteProps {
  motorcycleId: string;
  /** Spinning wheels + exhaust flame (used in menus / hero). */
  animated?: boolean;
  className?: string;
}

/** The same SVG sprite Phaser uses in the race, shown in the React UI. */
export default function MotoSprite({ motorcycleId, animated = false, className = '' }: MotoSpriteProps) {
  const moto = getMotorcycle(motorcycleId);
  return (
    <div
      className={`moto-sprite ${animated ? 'animated' : ''} ${className}`}
      style={{ '--moto-color': moto.color } as CSSProperties}
    >
      <img src={`${import.meta.env.BASE_URL}${moto.sprite}`} alt={`Motor ${moto.name}`} draggable={false} />
      {animated && (
        <>
          <span className="moto-wheel rear" />
          <span className="moto-wheel front" />
          <span className="moto-exhaust" />
        </>
      )}
    </div>
  );
}
