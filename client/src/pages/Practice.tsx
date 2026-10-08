import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEFAULT_TRACK_ID, TRACKS } from '@shared/tracks';
import { sanitizeNickname } from '@shared/validation';
import MotorcyclePicker from '../components/MotorcyclePicker/MotorcyclePicker';
import NicknameField from '../components/NicknameField/NicknameField';
import SessionStats from '../components/SessionStats/SessionStats';
import TextOptions from '../components/TextOptions/TextOptions';
import { sound } from '../services/sound';
import { useGameStore } from '../store/gameStore';
import type { TextOptionsValue } from '../types/Race';
import { createPracticeRace } from '../utils/raceSetup';
import './pages.css';

/** Mode latihan: pilih kategori, tingkat kesulitan, dan panjang teks - tanpa lawan, tanpa multiplayer. */
export default function Practice() {
  const navigate = useNavigate();
  const nickname = useGameStore((s) => s.nickname);
  const setNickname = useGameStore((s) => s.setNickname);
  const motorcycleId = useGameStore((s) => s.motorcycleId);
  const setMotorcycle = useGameStore((s) => s.setMotorcycle);
  const practiceConfig = useGameStore((s) => s.practiceConfig);
  const setPracticeConfig = useGameStore((s) => s.setPracticeConfig);
  const setRace = useGameStore((s) => s.setRace);

  const [name, setName] = useState(nickname);
  const [trackId, setTrackId] = useState(practiceConfig?.trackId ?? DEFAULT_TRACK_ID);
  const [textOptions, setTextOptions] = useState<TextOptionsValue>({
    category: practiceConfig?.category ?? 'semua',
    textDifficulty: practiceConfig?.textDifficulty ?? 'semua',
    textLength: practiceConfig?.textLength ?? 'medium',
  });

  useEffect(() => {
    void import('./Race');
  }, []);

  const valid = sanitizeNickname(name);

  const start = () => {
    if (!valid) return;
    sound.unlock();
    sound.play('click');
    setNickname(valid);
    const config = { nickname: valid, motorcycleId, trackId, ...textOptions };
    setPracticeConfig(config);
    setRace(createPracticeRace(config));
    navigate('/race');
  };

  return (
    <div className="page">
      <header className="page-header">
        <span className="eyebrow">Latihan</span>
        <h1 className="title-lg">Latihan mengetik Bahasa Indonesia</h1>
        <p className="text-dim">Tanpa lawan dan tanpa tekanan - fokus pada kecepatan dan akurasimu sendiri.</p>
      </header>

      <div className="panel panel-pad setup-panel">
        <div className="section-label">
          <span className="step">1</span>Masukkan nama
        </div>
        <NicknameField value={name} onChange={setName} onSubmit={start} />

        <div className="section-label section">
          <span className="step">2</span>Pilih teks
        </div>
        <TextOptions value={textOptions} onChange={setTextOptions} />

        <div className="section-label section">
          <span className="step">3</span>Motor &amp; lintasan
        </div>
        <MotorcyclePicker value={motorcycleId} onChange={setMotorcycle} compact />
        <div className="field section">
          <span className="field-label">Lintasan</span>
          <div className="chips">
            {TRACKS.map((track) => (
              <button
                key={track.id}
                type="button"
                className={`chip ${trackId === track.id ? 'selected' : ''}`}
                onClick={() => setTrackId(track.id)}
                title={track.description}
              >
                {track.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="section">
        <SessionStats />
      </div>

      <div className="start-bar panel">
        <div className="start-summary">
          <span>
            Latihan untuk <b>{valid ?? 'Pembalap'}</b>
          </span>
          <span className="text-dim">Setiap latihan memakai teks acak yang berbeda.</span>
        </div>
        <button type="button" className="btn btn-purple btn-lg" disabled={!valid} onClick={start}>
          Mulai latihan
        </button>
      </div>
    </div>
  );
}
