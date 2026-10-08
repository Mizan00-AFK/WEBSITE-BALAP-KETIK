import { useEffect } from 'react';
import { GAME_CONFIG } from '@shared/gameConfig';
import './HowToPlay.css';

interface HowToPlayProps {
  open: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    title: 'Ketik teks Bahasa Indonesia',
    body: 'Semua pembalap mendapat teks yang sama. Huruf yang benar berubah hijau, huruf aktif berwarna cyan, salah ketik merah, dan sisanya abu-abu.',
  },
  {
    title: 'Ketikanmu adalah mesinnya',
    body: 'Setiap karakter yang benar membuat motormu maju. Progres = karakter benar / total karakter. WPM berarti kata per menit.',
  },
  {
    title: 'Tidak bisa melewati kesalahan',
    body: 'Salah ketik membuat huruf menjadi merah dan kamu tidak bisa lanjut sebelum menekan tombol yang benar. Kesalahan juga mereset kombo dan mengurangi momentum.',
  },
  {
    title: 'Kombo mengisi NITRO',
    body: `Rangkaian 10, 25, dan 50 karakter benar tanpa salah mengisi bar nitro. Dengan nitro ${GAME_CONFIG.nitroCost}%, tekan ENTER (atau ketuk tombol NITRO) untuk melesat selama ${GAME_CONFIG.nitroDuration / 1000} detik.`,
  },
  {
    title: 'Sentuh garis finis lebih dulu',
    body: `Pembalap pertama yang finis menang. Balapan dibatasi ${GAME_CONFIG.maxRaceTime / 60} menit (lebih lama untuk teks maraton); yang belum finis diurutkan berdasarkan progres.`,
  },
];

export default function HowToPlay({ open, onClose }: HowToPlayProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal panel neon-border"
        role="dialog"
        aria-modal="true"
        aria-labelledby="how-to-play-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <span className="eyebrow">Briefing pembalap</span>
            <h2 id="how-to-play-title" className="title-lg">
              Cara bermain
            </h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Tutup">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <ol className="howto-steps">
          {STEPS.map((step, i) => (
            <li key={step.title}>
              <span className="howto-num">{i + 1}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="howto-demo">
          <span className="t-done">Perkembangan </span>
          <span className="t-cur">t</span>
          <span className="t-todo">eknologi</span>
          <span className="howto-demo-sep" />
          <span className="t-done">memb</span>
          <span className="t-err">u</span>
          <span className="t-todo">at masyarakat</span>
        </div>
        <p className="howto-note">
          Balap solo dan latihan berjalan di perangkatmu. Balapan bersama teman (2-4 pemain) berjalan realtime di server
          game. Tanpa login, tanpa database - semua data hilang saat sesi berakhir.
        </p>
        <div className="btn-row center">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Mengerti
          </button>
        </div>
      </div>
    </div>
  );
}
