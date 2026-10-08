import { useGameStore } from '../../store/gameStore';
import { formatAccuracy } from '../../utils/wpm';
import './SessionStats.css';

/** Statistik sementara selama sesi website aktif (tanpa database). */
export default function SessionStats() {
  const stats = useGameStore((s) => s.sessionStats);
  const average = stats.races > 0 ? stats.totalWpm / stats.races : 0;

  const tiles = [
    { label: 'WPM terbaik', value: Math.round(stats.bestWpm).toString() },
    { label: 'Rata-rata WPM', value: Math.round(average).toString() },
    { label: 'Akurasi terbaik', value: stats.races > 0 ? formatAccuracy(stats.bestAccuracy) : '-' },
    { label: 'Total balapan', value: stats.races.toString() },
    { label: 'Menang', value: stats.wins.toString() },
  ];

  return (
    <section className="session-stats panel panel-pad">
      <div className="section-label">Statistik sesi</div>
      {stats.races === 0 ? (
        <p className="text-dim">Belum ada balapan di sesi ini. Statistikmu muncul setelah balapan pertama.</p>
      ) : (
        <div className="session-stats-grid">
          {tiles.map((tile) => (
            <div key={tile.label} className="session-stat">
              <span className="session-stat-label">{tile.label}</span>
              <span className="session-stat-value">{tile.value}</span>
            </div>
          ))}
        </div>
      )}
      <p className="session-stats-note">Hanya untuk sesi ini - data hilang saat kamu menutup website.</p>
    </section>
  );
}
