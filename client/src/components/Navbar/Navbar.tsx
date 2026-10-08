import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { sound } from '../../services/sound';
import { useGameStore } from '../../store/gameStore';
import './Navbar.css';

interface NavbarProps {
  onHowToPlay: () => void;
}

export function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M6 22 H20 M2 32 H16 M6 42 H18" stroke="#fb923c" strokeWidth="4" strokeLinecap="round" />
      <circle cx="40" cy="32" r="16" fill="none" stroke="#22d3ee" strokeWidth="5" />
      <circle cx="40" cy="32" r="5" fill="#22d3ee" />
      <path d="M40 16 V27 M40 37 V48 M24 32 H35 M45 32 H56" stroke="#22d3ee" strokeWidth="2.5" opacity="0.7" />
    </svg>
  );
}

function SoundIcon({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
      {on ? (
        <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      )}
    </svg>
  );
}

export default function Navbar({ onHowToPlay }: NavbarProps) {
  const soundOn = useGameStore((s) => s.settings.soundOn);
  const setSettings = useGameStore((s) => s.setSettings);
  const roomSession = useGameStore((s) => s.roomSession);
  const connection = useGameStore((s) => s.connection);
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [location.pathname]);

  const toggleSound = () => {
    sound.unlock();
    setSettings({ soundOn: !soundOn });
    if (!soundOn) window.setTimeout(() => sound.play('click'), 30);
  };

  const dotClass =
    connection === 'connected' ? 'online' : connection === 'connecting' || connection === 'reconnecting' ? 'connecting' : 'offline';

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="brand" aria-label="Beranda Balap Ketik">
          <BrandMark />
          <span className="brand-text">
            <strong>BALAP KETIK</strong>
            <small>BALAP MOTOR MENGETIK</small>
          </span>
        </Link>

        <nav className={`nav-links ${open ? 'open' : ''}`} aria-label="Navigasi utama">
          <NavLink to="/" end>
            Beranda
          </NavLink>
          <NavLink to="/play">Main</NavLink>
          <NavLink to="/solo">Solo</NavLink>
          <NavLink to="/practice">Latihan</NavLink>
          <NavLink to="/multiplayer">Main Bareng</NavLink>
          <button type="button" className="nav-link-btn" onClick={onHowToPlay}>
            Cara bermain
          </button>
        </nav>

        <div className="nav-actions">
          {roomSession && (
            <Link to={`/room/${roomSession.code}`} className="nav-room" title="Kembali ke room kamu">
              <span className={`status-dot ${dotClass}`} />
              <span>ROOM {roomSession.code}</span>
            </Link>
          )}
          <button
            type="button"
            className={`icon-btn ${soundOn ? '' : 'muted'}`}
            onClick={toggleSound}
            aria-label={soundOn ? 'Matikan suara' : 'Nyalakan suara'}
            title={soundOn ? 'Suara aktif' : 'Suara mati'}
          >
            <SoundIcon on={soundOn} />
          </button>
          <button
            type="button"
            className="icon-btn menu-toggle"
            onClick={() => setOpen((v) => !v)}
            aria-label="Buka atau tutup menu"
            aria-expanded={open}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
