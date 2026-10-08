import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sanitizeNickname } from '@shared/validation';
import GameCard from '../components/GameCard/GameCard';
import NicknameField from '../components/NicknameField/NicknameField';
import SessionStats from '../components/SessionStats/SessionStats';
import { sound } from '../services/sound';
import { useGameStore } from '../store/gameStore';
import './pages.css';

export default function GameMode() {
  const nickname = useGameStore((s) => s.nickname);
  const setNickname = useGameStore((s) => s.setNickname);
  const [draft, setDraft] = useState(nickname);
  const [confirmed, setConfirmed] = useState(() => sanitizeNickname(nickname) !== null);
  const navigate = useNavigate();
  const valid = sanitizeNickname(draft);

  const confirm = () => {
    if (!valid) return;
    sound.unlock();
    sound.play('click');
    setNickname(valid);
    setConfirmed(true);
  };

  if (!confirmed) {
    return (
      <div className="page page-narrow">
        <header className="page-header">
          <span className="eyebrow">Langkah 1</span>
          <h1 className="title-lg">Masukkan nama</h1>
        </header>
        <div className="panel panel-pad stack">
          <NicknameField value={draft} onChange={setDraft} onSubmit={confirm} autoFocus />
          <button type="button" className="btn btn-primary btn-lg btn-block" disabled={!valid} onClick={confirm}>
            Lanjut
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <span className="eyebrow">Langkah 2</span>
        <h1 className="title-lg">Pilih mode permainan</h1>
        <div className="rider-chip">
          Membalap sebagai <b>{nickname}</b>
          <button type="button" onClick={() => setConfirmed(false)}>
            Ganti
          </button>
        </div>
      </header>
      <div className="mode-grid mode-grid-3">
        <GameCard
          icon={'\u{1F3CD}\u{FE0F}'}
          title="Balap solo"
          description="Balapan melawan AI komputer."
          accent="#22d3ee"
          meta={<span>4 tingkat kesulitan - 1 sampai 3 lawan AI - tanpa koneksi</span>}
        >
          <button type="button" className="btn btn-primary btn-block" onClick={() => navigate('/solo')}>
            Main solo
          </button>
        </GameCard>
        <GameCard
          icon={'\u{1F465}'}
          title="Main bareng"
          description="Balapan dengan 2-4 pemain online."
          accent="#fb923c"
          meta={<span>Buat room atau gabung dengan kode room</span>}
        >
          <button type="button" className="btn btn-orange btn-block" onClick={() => navigate('/multiplayer')}>
            Main bareng
          </button>
        </GameCard>
        <GameCard
          icon={'\u{1F3AF}'}
          title="Latihan"
          description="Latihan mengetik Bahasa Indonesia tanpa lawan."
          accent="#a855f7"
          meta={<span>Pilih kategori, tingkat kesulitan, dan panjang teks</span>}
        >
          <button type="button" className="btn btn-purple btn-block" onClick={() => navigate('/practice')}>
            Latihan
          </button>
        </GameCard>
      </div>
      <div className="section">
        <SessionStats />
      </div>
    </div>
  );
}
