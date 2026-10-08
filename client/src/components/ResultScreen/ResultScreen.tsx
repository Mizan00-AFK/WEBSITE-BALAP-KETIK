import type { CSSProperties, ReactNode } from 'react';
import { AI_PROFILES } from '@shared/ai';
import { playerColor } from '@shared/gameConfig';
import { getTrack } from '@shared/tracks';
import { CATEGORY_LABELS, TEXT_DIFFICULTY_LABELS } from '../../data/typingTexts';
import type { RaceResult } from '../../types/Race';
import { formatAccuracy, formatRaceTime, ordinal } from '../../utils/wpm';
import MotoSprite from '../MotoSprite/MotoSprite';
import './ResultScreen.css';

interface ResultScreenProps {
  result: RaceResult;
  actions: ReactNode;
  /** Extra content under the stats (e.g. session statistics). */
  children?: ReactNode;
}

const MEDALS = ['\u{1F947}', '\u{1F948}', '\u{1F949}'];

export default function ResultScreen({ result, actions, children }: ResultScreenProps) {
  const winner = result.entries[0];
  const me = result.entries.find((e) => e.id === result.localPlayerId);
  const isPractice = result.mode === 'practice';
  const iWon = !isPractice && winner?.id === result.localPlayerId;

  if (!winner) return null;
  const hero = isPractice && me ? me : winner;

  const myStats = me
    ? [
        { label: 'WPM', value: Math.round(me.wpm).toString() },
        { label: 'Akurasi', value: formatAccuracy(me.accuracy) },
        { label: 'Salah ketik', value: me.errors.toString() },
        { label: 'Waktu balap', value: me.finished ? formatRaceTime(me.finishTime) : 'Tidak finis' },
        { label: 'Kombo maks', value: `x${me.maxCombo}` },
        { label: 'Nitro dipakai', value: me.nitroUsed.toString() },
      ]
    : [];

  const category = CATEGORY_LABELS[result.category];
  const textInfo = `${category.icon} ${category.label} - ${TEXT_DIFFICULTY_LABELS[result.textDifficulty].label} - ${result.textLength} karakter`;
  const modeInfo = result.roomCode
    ? `Room ${result.roomCode}, balapan ke-${result.raceNumber}`
    : isPractice
      ? 'Latihan'
      : 'Solo melawan AI';

  return (
    <div className="result">
      <section className="result-hero">
        <span className="eyebrow">{isPractice ? 'Latihan selesai' : 'Balapan selesai'}</span>
        <h1 className="title-xl">
          <span className="trophy" aria-hidden="true">
            {isPractice ? '\u{1F3C1}' : '\u{1F3C6}'}
          </span>{' '}
          {isPractice ? 'Hasil latihan' : 'Pemenang'}
        </h1>
        <div className="winner-card panel neon-border" style={{ '--lane-color': playerColor(hero.slot).hex } as CSSProperties}>
          <div className="winner-bike">
            <MotoSprite motorcycleId={hero.motorcycleId} animated />
          </div>
          <div className="winner-info">
            <div className="winner-name">
              {hero.name}
              {hero.isBot && <em>AI</em>}
            </div>
            <div className="winner-stats">
              <span>
                <b>{Math.round(hero.wpm)}</b> WPM
              </span>
              <span>
                <b>{formatAccuracy(hero.accuracy)}</b> Akurasi
              </span>
              <span>
                <b>{hero.finished ? formatRaceTime(hero.finishTime) : '--'}</b> Waktu
              </span>
            </div>
          </div>
        </div>
        {me && !isPractice && (
          <p className={`result-you ${iWon ? 'win' : ''}`}>
            {iWon
              ? 'Kamu memenangkan balapan!'
              : me.finished
                ? `Kamu finis di posisi ${ordinal(me.position)}.`
                : `Waktu habis - kamu mencapai ${Math.floor(me.progress * 100)}% (posisi ${ordinal(me.position)}).`}
          </p>
        )}
        {me && isPractice && (
          <p className="result-you">
            {me.finished
              ? 'Latihan bagus! Coba teks lain untuk meningkatkan kecepatanmu.'
              : `Waktu habis - kamu menyelesaikan ${Math.floor(me.progress * 100)}% teks.`}
          </p>
        )}
      </section>

      <div className={`result-grid ${isPractice ? 'single' : ''}`}>
        {!isPractice && (
          <section className="panel panel-pad">
            <div className="section-label">Peringkat</div>
            <ol className="ranking-list">
              {result.entries.map((entry) => (
                <li
                  key={entry.id}
                  className={entry.id === result.localPlayerId ? 'me' : ''}
                  style={{ '--lane-color': playerColor(entry.slot).hex } as CSSProperties}
                >
                  <span className="rk-medal">{MEDALS[entry.position - 1] ?? `${entry.position}.`}</span>
                  <span className="rk-name">
                    {entry.name}
                    {entry.id === result.localPlayerId && <em className="you">KAMU</em>}
                    {entry.isBot && entry.difficulty && <em>AI {AI_PROFILES[entry.difficulty].label}</em>}
                  </span>
                  <span className="rk-wpm">{Math.round(entry.wpm)} WPM</span>
                  <span className="rk-time">
                    {entry.finished ? formatRaceTime(entry.finishTime) : `${Math.floor(entry.progress * 100)}%`}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {me && (
          <section className="panel panel-pad">
            <div className="section-label">Statistik kamu</div>
            <div className="stat-grid">
              {myStats.map((stat) => (
                <div key={stat.label} className="stat-tile">
                  <span className="stat-label">{stat.label}</span>
                  <span className="stat-value">{stat.value}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {!isPractice && (
        <section className="panel panel-pad result-table-wrap">
          <div className="section-label">Semua pembalap</div>
          <div className="result-table-scroll">
            <table className="result-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Pembalap</th>
                  <th>WPM</th>
                  <th>Akurasi</th>
                  <th>Salah</th>
                  <th>Waktu</th>
                  <th>Kombo maks</th>
                  <th>Nitro dipakai</th>
                </tr>
              </thead>
              <tbody>
                {result.entries.map((entry) => (
                  <tr key={entry.id} className={entry.id === result.localPlayerId ? 'me' : ''}>
                    <td>{entry.position}</td>
                    <td>
                      <span className="table-dot" style={{ background: playerColor(entry.slot).hex }} />
                      {entry.name}
                    </td>
                    <td>{Math.round(entry.wpm)}</td>
                    <td>{formatAccuracy(entry.accuracy)}</td>
                    <td>{entry.errors}</td>
                    <td>{entry.finished ? formatRaceTime(entry.finishTime) : 'Tidak finis'}</td>
                    <td>x{entry.maxCombo}</td>
                    <td>{entry.nitroUsed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="result-meta">
        {getTrack(result.trackId).name} - {textInfo} - {modeInfo}
      </p>

      {children}

      <div className="result-actions">{actions}</div>
    </div>
  );
}
