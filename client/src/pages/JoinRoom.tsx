import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { GAME_CONFIG } from '@shared/gameConfig';
import { normalizeRoomCode, sanitizeNickname } from '@shared/validation';
import ConnectionStatus from '../components/ConnectionStatus/ConnectionStatus';
import MotorcyclePicker from '../components/MotorcyclePicker/MotorcyclePicker';
import NicknameField from '../components/NicknameField/NicknameField';
import { connectToServer } from '../hooks/useSocket';
import { sound } from '../services/sound';
import { useGameStore } from '../store/gameStore';
import './pages.css';

const cleanCode = (value: string) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, GAME_CONFIG.roomCodeLength);

export default function JoinRoom() {
  const [params] = useSearchParams();
  const nickname = useGameStore((s) => s.nickname);
  const setNickname = useGameStore((s) => s.setNickname);
  const motorcycleId = useGameStore((s) => s.motorcycleId);
  const setMotorcycle = useGameStore((s) => s.setMotorcycle);
  const pending = useGameStore((s) => s.pending);
  const setPending = useGameStore((s) => s.setPending);
  const lastError = useGameStore((s) => s.lastError);
  const setLastError = useGameStore((s) => s.setLastError);

  const [code, setCode] = useState(() => cleanCode(params.get('code') ?? ''));
  const [name, setName] = useState(nickname);
  const submittedAt = useRef(0);
  const validName = sanitizeNickname(name);
  const validCode = normalizeRoomCode(code);
  const busy = pending === 'join';
  const error = lastError && submittedAt.current > 0 && lastError.at >= submittedAt.current ? lastError.message : null;

  useEffect(() => {
    connectToServer();
    void import('./Race');
    return () => {
      if (useGameStore.getState().pending === 'join') setPending(null);
    };
  }, [setPending]);

  const submit = () => {
    if (!validName || !validCode || busy) return;
    sound.unlock();
    sound.play('click');
    setNickname(validName);
    setLastError(null);
    submittedAt.current = Date.now();
    setPending('join');
    connectToServer().emit('join_room', { code: validCode, nickname: validName, motorcycleId });
  };

  return (
    <div className="page">
      <header className="page-header">
        <span className="eyebrow">Main bareng</span>
        <h1 className="title-lg">Gabung room</h1>
        <ConnectionStatus />
      </header>

      <div className="panel panel-pad setup-panel">
        <div className="field">
          <label className="field-label" htmlFor="room-code">
            Masukkan kode room
          </label>
          <input
            id="room-code"
            className={`input input-code ${error ? 'invalid' : ''}`}
            value={code}
            placeholder="AB12CD"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            autoFocus={!code}
            inputMode="text"
            onChange={(e) => setCode(cleanCode(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
          />
          <span className="field-hint">6 karakter, berupa huruf dan angka.</span>
        </div>

        <div className="section">
          <NicknameField value={name} onChange={setName} onSubmit={submit} label="Nama kamu" />
        </div>

        <div className="section-label section">Motor</div>
        <MotorcyclePicker value={motorcycleId} onChange={setMotorcycle} compact />
      </div>

      {error && <div className="alert form-alert">{error}</div>}

      <div className="start-bar panel">
        <div className="start-summary">
          <span>
            Bergabung ke <b>{validCode ?? '------'}</b> sebagai <b>{validName ?? '...'}</b>
          </span>
          <Link to="/multiplayer" className="text-dim">
            Kembali
          </Link>
        </div>
        <button type="button" className="btn btn-orange btn-lg" disabled={!validName || !validCode || busy} onClick={submit}>
          {busy && <span className="spinner" />}
          Gabung room
        </button>
      </div>
    </div>
  );
}
