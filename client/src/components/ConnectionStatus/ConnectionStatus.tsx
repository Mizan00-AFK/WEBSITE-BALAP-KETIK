import { useGameStore } from '../../store/gameStore';

const LABELS = {
  idle: 'Belum tersambung',
  connecting: 'Menyambung ke server game...',
  connected: 'Tersambung ke server game',
  reconnecting: 'Menyambung ulang...',
  offline: 'Server game tidak bisa dihubungi - apakah sudah berjalan? Mencoba lagi...',
} as const;

/** Indikator online / offline untuk layar multiplayer. */
export default function ConnectionStatus() {
  const connection = useGameStore((s) => s.connection);
  const dot =
    connection === 'connected' ? 'online' : connection === 'offline' || connection === 'idle' ? 'offline' : 'connecting';
  return (
    <span className="connection-status">
      <span className={`status-dot ${dot}`} />
      {LABELS[connection]}
    </span>
  );
}
