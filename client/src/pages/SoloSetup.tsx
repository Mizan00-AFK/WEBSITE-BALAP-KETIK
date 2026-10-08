import { useEffect, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { AI_PROFILES, DIFFICULTIES } from '@shared/ai';
import { GAME_CONFIG } from '@shared/gameConfig';
import { getMotorcycle } from '@shared/motorcycles';
import { DEFAULT_TRACK_ID, getTrack, TRACKS } from '@shared/tracks';
import type { Difficulty } from '@shared/types';
import { sanitizeNickname } from '@shared/validation';
import MotorcyclePicker from '../components/MotorcyclePicker/MotorcyclePicker';
import NicknameField from '../components/NicknameField/NicknameField';
import TextOptions from '../components/TextOptions/TextOptions';
import { CATEGORY_LABELS, TEXT_LENGTH_INFO } from '../data/typingTexts';
import { sound } from '../services/sound';
import { useGameStore } from '../store/gameStore';
import type { TextOptionsValue } from '../types/Race';
import { createSoloRace } from '../utils/raceSetup';
import './pages.css';

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy: '#22c55e',
  normal: '#22d3ee',
  hard: '#fb923c',
  expert: '#ef4444',
};

export default function SoloSetup() {
  const navigate = useNavigate();
  const nickname = useGameStore((s) => s.nickname);
  const setNickname = useGameStore((s) => s.setNickname);
  const motorcycleId = useGameStore((s) => s.motorcycleId);
  const setMotorcycle = useGameStore((s) => s.setMotorcycle);
  const soloConfig = useGameStore((s) => s.soloConfig);
  const setSoloConfig = useGameStore((s) => s.setSoloConfig);
  const setRace = useGameStore((s) => s.setRace);

  const [name, setName] = useState(nickname);
  const [difficulty, setDifficulty] = useState<Difficulty>(soloConfig?.difficulty ?? 'normal');
  const [opponents, setOpponents] = useState(soloConfig?.opponents ?? GAME_CONFIG.soloOpponentsDefault);
  const [trackId, setTrackId] = useState(soloConfig?.trackId ?? DEFAULT_TRACK_ID);
  const [textOptions, setTextOptions] = useState<TextOptionsValue>({
    category: soloConfig?.category ?? 'semua',
    textDifficulty: soloConfig?.textDifficulty ?? 'semua',
    textLength: soloConfig?.textLength ?? 'long',
  });

  // Preload the race engine (Phaser) while the player is choosing.
  useEffect(() => {
    void import('./Race');
  }, []);

  const valid = sanitizeNickname(name);
  const opponentOptions = Array.from(
    { length: GAME_CONFIG.soloOpponentsMax - GAME_CONFIG.soloOpponentsMin + 1 },
    (_, i) => GAME_CONFIG.soloOpponentsMin + i,
  );

  const start = () => {
    if (!valid) return;
    sound.unlock();
    sound.play('click');
    setNickname(valid);
    const config = { nickname: valid, motorcycleId, difficulty, opponents, trackId, ...textOptions };
    setSoloConfig(config);
    setRace(createSoloRace(config));
    navigate('/race');
  };

  const profile = AI_PROFILES[difficulty];
  const category = CATEGORY_LABELS[textOptions.category];

  return (
    <div className="page">
      <header className="page-header">
        <span className="eyebrow">Balap solo</span>
        <h1 className="title-lg">Balapan melawan AI</h1>
      </header>

      <div className="panel panel-pad setup-panel">
        <div className="section-label">
          <span className="step">1</span>Masukkan nama
        </div>
        <NicknameField value={name} onChange={setName} onSubmit={start} />

        <div className="section-label section">
          <span className="step">2</span>Pilih tingkat kesulitan AI
        </div>
        <div className="choice-grid difficulty-grid">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              type="button"
              className={`choice ${difficulty === d ? 'selected' : ''}`}
              style={{ '--choice-color': DIFFICULTY_COLORS[d] } as CSSProperties}
              onClick={() => {
                sound.play('click');
                setDifficulty(d);
              }}
            >
              <span className="choice-title" style={{ color: DIFFICULTY_COLORS[d] }}>
                {AI_PROFILES[d].label}
              </span>
              <span className="choice-sub">
                {AI_PROFILES[d].wpm[0]}-{AI_PROFILES[d].wpm[1]} WPM
              </span>
              <span className="difficulty-acc">
                akurasi {Math.round(AI_PROFILES[d].accuracy[0] * 100)}-{Math.round(AI_PROFILES[d].accuracy[1] * 100)}%
              </span>
            </button>
          ))}
        </div>

        <div className="section-label section">
          <span className="step">3</span>Pilih motor
        </div>
        <MotorcyclePicker value={motorcycleId} onChange={setMotorcycle} />

        <div className="section-label section">
          <span className="step">4</span>Teks balapan
        </div>
        <TextOptions value={textOptions} onChange={setTextOptions} />

        <div className="section-label section">
          <span className="step">5</span>Pengaturan balapan
        </div>
        <div className="options-grid">
          <div className="field">
            <span className="field-label">Jumlah lawan AI</span>
            <div className="chips">
              {opponentOptions.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`chip ${opponents === n ? 'selected' : ''}`}
                  onClick={() => setOpponents(n)}
                >
                  {n} AI
                </button>
              ))}
            </div>
          </div>
          <div className="field">
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
      </div>

      <div className="start-bar panel">
        <div className="start-summary">
          <span>
            <b>{valid ?? 'Pembalap'}</b> dengan <b>{getMotorcycle(motorcycleId).name}</b>
          </span>
          <span className="text-dim">
            vs {opponents} AI {profile.label} ({profile.wpm[0]}-{profile.wpm[1]} WPM) - {getTrack(trackId).name} - teks{' '}
            {category.label} {TEXT_LENGTH_INFO[textOptions.textLength].label.toLowerCase()}
          </span>
        </div>
        <button type="button" className="btn btn-primary btn-lg" disabled={!valid} onClick={start}>
          Mulai balapan
        </button>
      </div>
    </div>
  );
}
