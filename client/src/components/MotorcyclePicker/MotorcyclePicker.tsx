import type { CSSProperties } from 'react';
import { MOTORCYCLES } from '@shared/motorcycles';
import { sound } from '../../services/sound';
import MotoSprite from '../MotoSprite/MotoSprite';
import './MotorcyclePicker.css';

interface MotorcyclePickerProps {
  value: string;
  onChange: (motorcycleId: string) => void;
  compact?: boolean;
}

const STAT_LABELS = [
  ['speed', 'KEC'],
  ['acceleration', 'AKS'],
  ['handling', 'KDL'],
] as const;

export default function MotorcyclePicker({ value, onChange, compact = false }: MotorcyclePickerProps) {
  return (
    <div>
      <div className={`moto-picker ${compact ? 'compact' : ''}`} role="radiogroup" aria-label="Pilih motor">
        {MOTORCYCLES.map((moto) => {
          const selected = moto.id === value;
          return (
            <button
              key={moto.id}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`choice moto-choice ${selected ? 'selected' : ''}`}
              style={{ '--choice-color': moto.color } as CSSProperties}
              onClick={() => {
                sound.unlock();
                sound.play('click');
                onChange(moto.id);
              }}
            >
              <MotoSprite motorcycleId={moto.id} animated={selected} />
              <span className="choice-title">{moto.name}</span>
              {!compact && <span className="moto-tagline">{moto.tagline}</span>}
              {!compact && (
                <span className="moto-stats">
                  {STAT_LABELS.map(([key, label]) => (
                    <span key={key} className="moto-stat">
                      <span>{label}</span>
                      <span className="moto-stat-bar">
                        <i style={{ width: `${moto.stats[key] * 20}%` }} />
                      </span>
                    </span>
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {!compact && <p className="moto-note">Statistik motor hanya kosmetik - ketikanmu adalah satu-satunya mesin.</p>}
    </div>
  );
}
