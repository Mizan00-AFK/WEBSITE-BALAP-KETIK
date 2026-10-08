import { useNavigate } from 'react-router-dom';
import MotoSprite from '../components/MotoSprite/MotoSprite';
import { TYPING_TEXTS, TEXT_CATEGORIES } from '../data/typingTexts';
import { sound } from '../services/sound';
import './pages.css';

interface HomeProps {
  onHowToPlay: () => void;
}

const FEATURES = [
  {
    icon: '\u{1F3CD}\u{FE0F}',
    title: 'Lawan AI',
    body: 'Empat tingkat kesulitan dari 25 sampai 100 WPM. AI mengetik seperti manusia - kecepatannya naik turun dan kadang salah ketik.',
    accent: '#22d3ee',
  },
  {
    icon: '\u{1F465}',
    title: 'Main bareng 2-4 pemain',
    body: 'Buat room, bagikan kode 6 karakter, lalu balapan bersama teman secara realtime dari perangkat apa pun.',
    accent: '#fb923c',
  },
  {
    icon: '\u{1F4DA}',
    title: `${TYPING_TEXTS.length} teks Bahasa Indonesia`,
    body: `${TEXT_CATEGORIES.length} kategori, dari teknologi hingga budaya, dengan tingkat kesulitan dan panjang teks yang bisa kamu pilih.`,
    accent: '#a855f7',
  },
  {
    icon: '\u{26A1}',
    title: 'Tanpa login, tanpa database',
    body: 'Cukup pilih nama lalu gas. Semua data hanya hidup selama sesimu dan hilang setelahnya.',
    accent: '#22c55e',
  },
];

const STEPS = ['Ketik', 'Melaju', 'Nitro', 'Menang'];

export default function Home({ onHowToPlay }: HomeProps) {
  const navigate = useNavigate();
  const go = (path: string) => {
    sound.unlock();
    sound.play('click');
    navigate(path);
  };

  return (
    <div className="home">
      <section className="hero container">
        <div className="hero-copy">
          <div className="hero-logo">
            <span className="logo-word">BALAP KETIK</span>
            <span className="logo-sub">BALAP MOTOR MENGETIK</span>
          </div>
          <span className="hero-tagline">KETIK. BALAP. MENANG.</span>
          <h1 className="hero-title">
            Kuasai keyboard-mu.
            <br />
            <span className="text-gradient">Taklukkan lintasan.</span>
          </h1>
          <p className="hero-subtitle">
            Game balapan motor untuk menguji kemampuan mengetik Bahasa Indonesia. Lawan AI atau tantang temanmu dalam
            balapan realtime.
          </p>
          <div className="btn-row hero-ctas">
            <button type="button" className="btn btn-primary btn-lg" onClick={() => go('/solo')}>
              Main solo
            </button>
            <button type="button" className="btn btn-orange btn-lg" onClick={() => go('/multiplayer')}>
              Main bareng teman
            </button>
            <button type="button" className="btn btn-ghost btn-lg" onClick={() => go('/practice')}>
              Latihan
            </button>
            <button type="button" className="btn btn-ghost btn-lg" onClick={onHowToPlay}>
              Cara bermain
            </button>
          </div>
          <ul className="hero-badges">
            <li>2-4 pemain</li>
            <li>Desktop &amp; HP</li>
            <li>Bahasa Indonesia</li>
            <li>Tanpa login</li>
            <li>Tanpa database</li>
          </ul>
        </div>

        <div className="hero-visual" aria-hidden="true">
          <div className="hero-sun" />
          <div className="hero-road">
            <span className="hero-road-line" />
          </div>
          <div className="hero-streaks">
            {Array.from({ length: 7 }, (_, i) => (
              <span key={i} style={{ top: `${18 + i * 9}%`, animationDelay: `${i * 0.21}s` }} />
            ))}
          </div>
          <MotoSprite motorcycleId="phantom" animated className="hero-bike hero-bike-back" />
          <MotoSprite motorcycleId="speedster" animated className="hero-bike hero-bike-front" />
          <div className="hero-hud">
            <div>
              <span>WPM</span>
              <b>87</b>
            </div>
            <div>
              <span>AKURASI</span>
              <b>97%</b>
            </div>
            <div className="hero-hud-nitro">
              <span>NITRO</span>
              <i>
                {Array.from({ length: 10 }, (_, i) => (
                  <em key={i} className={i < 8 ? 'on' : ''} />
                ))}
              </i>
            </div>
          </div>
        </div>
      </section>

      <section className="container features">
        {FEATURES.map((feature) => (
          <article key={feature.title} className="feature panel" style={{ borderTopColor: feature.accent }}>
            <span className="feature-icon">{feature.icon}</span>
            <h3>{feature.title}</h3>
            <p>{feature.body}</p>
          </article>
        ))}
      </section>

      <section className="container home-steps">
        {STEPS.map((step, i) => (
          <div key={step} className="home-step">
            <span className="home-step-num">0{i + 1}</span>
            <span className="home-step-name">{step}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
