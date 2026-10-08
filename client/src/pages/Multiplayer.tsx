import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { sanitizeNickname } from '@shared/validation';
import ConnectionStatus from '../components/ConnectionStatus/ConnectionStatus';
import GameCard from '../components/GameCard/GameCard';
import NicknameField from '../components/NicknameField/NicknameField';
import { connectToServer } from '../hooks/useSocket';
import { useGameStore } from '../store/gameStore';
import './pages.css';

export default function Multiplayer() {
  const navigate = useNavigate();
  const nickname = useGameStore((s) => s.nickname);
  const setNickname = useGameStore((s) => s.setNickname);
  const roomSession = useGameStore((s) => s.roomSession);
  const [name, setName] = useState(nickname);
  const valid = sanitizeNickname(name);

  useEffect(() => {
    connectToServer();
  }, []);

  const go = (path: string) => {
    if (!valid) return;
    setNickname(valid);
    navigate(path);
  };

  return (
    <div className="page">
      <header className="page-header">
        <span className="eyebrow">Main bareng</span>
        <h1 className="title-lg">Balapan bersama teman</h1>
        <p className="text-dim">2-4 pemain - realtime lewat Socket.IO - semua perangkat bisa ikut</p>
        <ConnectionStatus />
      </header>

      {roomSession && (
        <div className="alert info rejoin-alert">
          Kamu masih berada di room <b>{roomSession.code}</b>.{' '}
          <Link to={`/room/${roomSession.code}`}>Kembali ke room</Link>
        </div>
      )}

      <div className="panel panel-pad multi-name">
        <NicknameField value={name} onChange={setName} />
      </div>

      <div className="mode-grid">
        <GameCard
          icon={'\u{1F6E0}\u{FE0F}'}
          title="Buat room"
          description="Buka room baru, pilih motor, lalu bagikan kode room ke teman-temanmu."
          accent="#22d3ee"
          disabled={!valid}
        >
          <button type="button" className="btn btn-primary btn-block" disabled={!valid} onClick={() => go('/multiplayer/create')}>
            Buat room
          </button>
        </GameCard>
        <GameCard
          icon={'\u{1F511}'}
          title="Gabung room"
          description="Punya kode seperti AB12CD dari teman? Masukkan kodenya dan bergabung ke lobi mereka."
          accent="#fb923c"
          disabled={!valid}
        >
          <button type="button" className="btn btn-orange btn-block" disabled={!valid} onClick={() => go('/multiplayer/join')}>
            Gabung room
          </button>
        </GameCard>
      </div>
    </div>
  );
}
