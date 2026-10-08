import { memo } from 'react';
import { GAME_CONFIG } from '@shared/gameConfig';
import type { HudSnapshot } from '../../types/Race';
import { formatAccuracy, formatClock, formatRaceTime, ordinal } from '../../utils/wpm';
import './RaceHUD.css';

interface RaceHUDProps {
  hud: HudSnapshot;
  onExit: () => void;
  exitLabel: string;
}

const SEGMENTS = 10;

function RaceHUD({ hud, onExit, exitLabel }: RaceHUDProps) {
  const filled = Math.floor((hud.nitro / GAME_CONFIG.nitroMax) * SEGMENTS);
  const costSegment = Math.round((GAME_CONFIG.nitroCost / GAME_CONFIG.nitroMax) * SEGMENTS);
  const lowTime = hud.timeLeftMs < 15_000;
  const comboTier = hud.combo >= 50 ? 'hot' : hud.combo >= 25 ? 'warm' : hud.combo >= 10 ? 'on' : '';

  return (
    <div className="race-hud" role="group" aria-label="Statistik balapan">
      <button type="button" className="hud-exit" onClick={onExit} title={exitLabel} aria-label={exitLabel}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="hud-stat hud-position">
        <span className="hud-label">Posisi</span>
        <span className="hud-value">
          {hud.position}
          <small> / {hud.totalRacers}</small>
        </span>
        <span className="hud-sub">{ordinal(hud.position)}</span>
      </div>

      <div className="hud-stat hud-wpm">
        <span className="hud-label">WPM</span>
        <span className="hud-value">{Math.round(hud.wpm)}</span>
      </div>

      <div className="hud-stat">
        <span className="hud-label">Akurasi</span>
        <span className="hud-value">{formatAccuracy(hud.accuracy)}</span>
      </div>

      <div className="hud-stat hud-optional">
        <span className="hud-label">Salah</span>
        <span className={`hud-value ${hud.errors > 0 ? 'bad' : ''}`}>{hud.errors}</span>
      </div>

      <div className="hud-stat">
        <span className="hud-label">Waktu</span>
        <span className="hud-value mono">{formatRaceTime(hud.elapsedMs)}</span>
        <span className={`hud-sub ${lowTime ? 'bad' : ''}`}>sisa {formatClock(hud.timeLeftMs)}</span>
      </div>

      <div className={`hud-stat hud-optional hud-combo ${comboTier}`}>
        <span className="hud-label">Kombo</span>
        <span className="hud-value" key={Math.floor(hud.combo / 10)}>
          x{hud.combo}
        </span>
      </div>

      <div className={`hud-nitro ${hud.nitroReady ? 'ready' : ''} ${hud.nitroActive ? 'active' : ''}`}>
        <span className="hud-label">
          Nitro {hud.nitroActive ? '- MELESAT!' : hud.nitroReady ? '- SIAP' : ''}
        </span>
        <div className="nitro-bar" aria-label={`Nitro ${Math.round(hud.nitro)} persen`}>
          {Array.from({ length: SEGMENTS }, (_, i) => (
            <span key={i} className={`${i < filled ? 'on' : ''} ${i === costSegment - 1 ? 'mark' : ''}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default memo(RaceHUD);
