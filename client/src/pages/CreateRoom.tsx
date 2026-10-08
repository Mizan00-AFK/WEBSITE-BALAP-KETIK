import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { GAME_CONFIG } from '@shared/gameConfig';
import { sanitizeNickname } from '@shared/validation';
import ConnectionStatus from '../components/ConnectionStatus/ConnectionStatus';
import MotorcyclePicker from '../components/MotorcyclePicker/MotorcyclePicker';
import NicknameField from '../components/NicknameField/NicknameField';
import { connectToServer } from '../hooks/useSocket';
import { sound } from '../services/sound';
import { useGameStore } from '../store/gameStore';
import './pages.css';

const SIZES = Array.from(
  { length: GAME_CONFIG.maxPlayers - GAME_CONFIG.minPlayers + 1 },
  (_, i) => GAME_CONFIG.minPlayers + i,
);

export default function CreateRoom() {
  const nickname = useGameStore((s) => s.nickname);
  const setNickname = useGameStore((s) => s.setNickname);
  const motorcycleId = useGameStore((s) => s.motorcycleId);
  const setMotorcycle = useGameStore((s) => s.setMotorcycle);
  const pending = useGameStore((s) => s.pending);
  const setPending = useGameStore((s) => s.setPending);
  const lastError = useGameStore((s) => s.lastError);
  const setLastError = useGameStore((s) => s.setLastError);

  const [name, setName] = useState(nickname);
  const [maxPlayers, setMaxPlayers] = useState<number>(GAME_CONFIG.maxPlayers);
  const submittedAt = useRef(0);
  const valid = sanitizeNickname(name);
  const busy = pending === 'create';
  const error = lastError && lastError.at >= submittedAt.current && submittedAt.current > 0 ? lastError.message : null;

  useEffect(() => {
    connectToServer();
    void import('./Race');
    return () => {
      if (useGameStore.getState().pending === 'create') setPending(null);
    };
  }, [setPending]);

  const submit = () => {
    if (!valid || busy) return;
    sound.unlock();
    sound.play('click');
    setNickname(valid);
    setLastError(null);
    submittedAt.current = Date.now();
    setPending('create');
    connectToServer().emit('create_room', { nickname: valid, motorcycleId, maxPlayers });
  };

  return (
    <div className="page">
      <header className="page-header">
        <span className="eyebrow">Main bareng</span>
        <h1 className="title-lg">Buat room</h1>
        <ConnectionStatus />
      </header>

      <div className="panel panel-pad setup-panel">
        <div className="section-label">
          <span className="step">1</span>Nama
        </div>
        <NicknameField value={name} onChange={setName} onSubmit={submit} />

        <div className="section-label section">
          <span className="step">2</span>Motor
        </div>
        <MotorcyclePicker value={motorcycleId} onChange={setMotorcycle} />

        <div className="section-label section">
          <span className="step">3</span>Ukuran room
        </div>
        <div className="chips">
          {SIZES.map((size) => (
            <button key={size} type="button" className={`chip ${maxPlayers === size ? 'selected' : ''}`} onClick={() => setMaxPlayers(size)}>
              {size} pemain
            </button>
          ))}
        </div>
      </div>

      {error && <div className="alert form-alert">{error}</div>}

      <div className="start-bar panel">
        <div className="start-summary">
          <span>
            Kamu akan mendapat <b>kode room</b> untuk dibagikan ke maksimal {maxPlayers - 1} teman.
          </span>
          <Link to="/multiplayer" className="text-dim">
            Kembali
          </Link>
        </div>
        <button type="button" className="btn btn-primary btn-lg" disabled={!valid || busy} onClick={submit}>
          {busy && <span className="spinner" />}
          Buat room
        </button>
      </div>
    </div>
  );
}
