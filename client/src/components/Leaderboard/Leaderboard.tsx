import { memo, type CSSProperties } from 'react';
import { playerColor } from '@shared/gameConfig';
import type { LiveRacer } from '../../types/Race';
import { formatRaceTime, percent } from '../../utils/wpm';
import './Leaderboard.css';

interface LeaderboardProps {
  ranking: LiveRacer[];
  localId: string;
}

/** Live ranking by progress (ties broken by who got there first). */
function Leaderboard({ ranking, localId }: LeaderboardProps) {
  return (
    <aside className="leaderboard" aria-label="Peringkat langsung">
      <div className="lb-title">Peringkat langsung</div>
      <ol>
        {ranking.map((racer, index) => (
          <li
            key={racer.id}
            className={`${racer.id === localId ? 'me' : ''} ${racer.left ? 'left' : ''} ${racer.finished ? 'done' : ''}`}
            style={{ '--lane-color': playerColor(racer.slot).hex } as CSSProperties}
          >
            <span className="lb-pos">{index + 1}</span>
            <span className="lb-dot" />
            <span className="lb-name">
              {racer.name}
              {racer.id === localId && <em className="you">KAMU</em>}
              {racer.isBot && <em>AI</em>}
            </span>
            <span className="lb-progress">
              {racer.left ? 'KELUAR' : racer.finished ? formatRaceTime(racer.finishTime) : percent(racer.progress)}
            </span>
            <span className="lb-bar">
              <i style={{ width: `${Math.round(racer.progress * 100)}%` }} />
            </span>
          </li>
        ))}
      </ol>
    </aside>
  );
}

export default memo(Leaderboard);
