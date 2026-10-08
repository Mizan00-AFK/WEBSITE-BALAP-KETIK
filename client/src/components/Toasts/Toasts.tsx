import { useGameStore } from '../../store/gameStore';
import './Toasts.css';

const ICONS = { info: 'i', success: '✓', warning: '!', error: '×' } as const;

export default function Toasts() {
  const toasts = useGameStore((s) => s.toasts);
  const dismiss = useGameStore((s) => s.dismissToast);
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <button key={toast.id} type="button" className={`toast ${toast.tone}`} onClick={() => dismiss(toast.id)}>
          <span className="toast-icon">{ICONS[toast.tone]}</span>
          <span>{toast.message}</span>
        </button>
      ))}
    </div>
  );
}
