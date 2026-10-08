import { useEffect, useState } from 'react';
import { GAME_CONFIG } from '@shared/gameConfig';
import { sound } from '../../services/sound';
import './Countdown.css';

interface CountdownProps {
  /** Timestamp of "GAS!" in the same clock as `clock()` (server time in multiplayer). */
  startAt: number;
  clock: () => number;
}

function labelFor(remaining: number): string | null {
  if (remaining > GAME_CONFIG.countdown * 1000) return 'SIAP';
  if (remaining > 0) return String(Math.ceil(remaining / 1000));
  if (remaining > -GAME_CONFIG.goDuration) return 'GAS!';
  return null;
}

/** SIAP -> 3 -> 2 -> 1 -> GAS!, sinkron dengan timestamp mulai dari server. */
export default function Countdown({ startAt, clock }: CountdownProps) {
  const [label, setLabel] = useState<string | null>(() => labelFor(startAt - clock()));

  useEffect(() => {
    let frame = 0;
    let last: string | null = labelFor(startAt - clock());
    const loop = () => {
      const remaining = startAt - clock();
      const next = labelFor(remaining);
      if (next !== last) {
        if (next && /^\d$/.test(next)) sound.play('countdown');
        last = next;
        setLabel(next);
      }
      if (next !== null) frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [startAt, clock]);

  if (!label) return null;
  const variant = label === 'GAS!' ? 'go' : label === 'SIAP' ? 'ready' : 'number';
  return (
    <div className="countdown" aria-live="assertive">
      <span key={label} className={`countdown-value ${variant}`}>
        {label}
      </span>
    </div>
  );
}
