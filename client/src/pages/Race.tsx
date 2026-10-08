import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { COUNTDOWN_TOTAL_MS } from '@shared/gameConfig';
import Countdown from '../components/Countdown/Countdown';
import Leaderboard from '../components/Leaderboard/Leaderboard';
import RaceCanvas from '../components/RaceCanvas/RaceCanvas';
import RaceHUD from '../components/RaceHUD/RaceHUD';
import TypingBox from '../components/TypingBox/TypingBox';
import { CATEGORY_LABELS, TEXT_DIFFICULTY_LABELS } from '../data/typingTexts';
import { useRace } from '../hooks/useRace';
import { getSocket } from '../services/socket';
import { useGameStore } from '../store/gameStore';
import type { RaceSetup } from '../types/Race';
import { ordinal } from '../utils/wpm';
import './pages.css';

export default function Race() {
  const race = useGameStore((s) => s.race);
  const roomSession = useGameStore((s) => s.roomSession);
  if (!race) return <Navigate to={roomSession ? `/room/${roomSession.code}` : '/play'} replace />;
  return <RaceView key={race.id} initialSetup={race} />;
}

function RaceView({ initialSetup }: { initialSetup: RaceSetup }) {
  // Solo / practice countdown starts when the race screen is actually on screen.
  const [setup] = useState<RaceSetup>(() =>
    initialSetup.mode === 'multi' ? initialSetup : { ...initialSetup, startAt: Date.now() + COUNTDOWN_TOTAL_MS },
  );
  const race = useRace(setup);
  const navigate = useNavigate();
  const setLastResult = useGameStore((s) => s.setLastResult);
  const recordResult = useGameStore((s) => s.recordResult);
  const clearRoom = useGameStore((s) => s.clearRoom);
  const connection = useGameStore((s) => s.connection);
  const isMulti = setup.mode === 'multi';
  const isPractice = setup.mode === 'practice';

  useEffect(() => {
    if (!race.result) return;
    setLastResult(race.result);
    recordResult(setup.id, race.result);
    const timer = window.setTimeout(() => navigate('/result'), 1600);
    return () => window.clearTimeout(timer);
  }, [race.result, setLastResult, recordResult, setup.id, navigate]);

  const exit = () => {
    if (!isMulti) {
      navigate(isPractice ? '/practice' : '/solo');
      return;
    }
    if (!window.confirm('Keluar dari balapan? Kamu juga akan keluar dari room.')) return;
    getSocket().emit('leave_room');
    clearRoom();
    navigate('/multiplayer');
  };

  const typingEnabled = race.phase === 'racing' && !race.typing.completed && !race.timeUp;
  const showFinishBanner = race.localFinish && race.phase !== 'finished';
  const category = CATEGORY_LABELS[setup.category];
  const textMeta = `${category.icon} ${category.label} - ${TEXT_DIFFICULTY_LABELS[setup.textDifficulty].label} - ${setup.text.length} karakter`;

  return (
    <div className="race-page">
      <RaceHUD
        hud={race.hud}
        onExit={exit}
        exitLabel={isMulti ? 'Keluar dari balapan' : isPractice ? 'Kembali ke pengaturan latihan' : 'Kembali ke pengaturan solo'}
      />

      <div className="race-stage">
        <RaceCanvas manager={race.manager} />
        <Countdown startAt={setup.startAt} clock={race.clock} />

        {isMulti && connection !== 'connected' && (
          <div className="race-banner warn">
            <span className="spinner" /> Koneksi terputus - menyambung ulang...
          </div>
        )}

        {showFinishBanner && race.localFinish && (
          <div className="finish-banner">
            <span className="finish-title">Finis!</span>
            {!isPractice && (
              <span className="finish-pos">
                {race.localFinish.position ? `Posisi ${ordinal(race.localFinish.position)}` : 'Menunggu posisi...'}
              </span>
            )}
            <span className="finish-sub">
              {isPractice
                ? 'Menghitung hasil latihan...'
                : isMulti
                  ? 'Menunggu pembalap lain...'
                  : 'Pembalap AI masih melaju...'}
            </span>
            {setup.mode === 'solo' && (
              <button type="button" className="btn btn-primary btn-sm" onClick={race.skipToResults}>
                Lihat hasil
              </button>
            )}
          </div>
        )}

        {race.timeUp && !race.localFinish && race.phase !== 'finished' && (
          <div className="finish-banner warn">
            <span className="finish-title">Waktu habis!</span>
            <span className="finish-sub">Menghitung hasil...</span>
          </div>
        )}

        {race.phase === 'finished' && (
          <div className="race-complete">
            <span>{isPractice ? 'Latihan selesai' : 'Balapan selesai'}</span>
          </div>
        )}
      </div>

      <div className={`race-bottom ${isPractice ? 'solo-lane' : ''}`}>
        <TypingBox
          text={setup.text}
          view={race.typing}
          phase={race.phase}
          enabled={typingEnabled}
          nitroReady={race.hud.nitroReady}
          nitroActive={race.hud.nitroActive}
          onChar={race.handleChar}
          onBackspace={race.handleBackspace}
          onNitro={race.activateNitro}
          getCommittedWord={race.committedWord}
          meta={textMeta}
        />
        {!isPractice && <Leaderboard ranking={race.ranking} localId={setup.localPlayerId} />}
      </div>
    </div>
  );
}
