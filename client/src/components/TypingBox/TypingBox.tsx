import { memo, useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import { GAME_CONFIG } from '@shared/gameConfig';
import { useTyping } from '../../hooks/useTyping';
import type { RacePhase, TypingView } from '../../types/Race';
import './TypingBox.css';

interface TypingBoxProps {
  text: string;
  view: TypingView;
  phase: RacePhase;
  enabled: boolean;
  nitroReady: boolean;
  nitroActive: boolean;
  onChar: (char: string) => void;
  onBackspace: () => void;
  onNitro: () => void;
  getCommittedWord: () => string;
  /** Info teks, mis. "Teknologi - Sedang - 142 karakter". */
  meta?: string;
}

/**
 * Text display (green = correct, cyan = current, red = mistake, grey = not typed yet)
 * plus the real input field that receives keyboard / virtual keyboard input.
 */
function TypingBox({
  text,
  view,
  phase,
  enabled,
  nitroReady,
  nitroActive,
  onChar,
  onBackspace,
  onNitro,
  getCommittedWord,
  meta,
}: TypingBoxProps) {
  const { inputRef, inputProps, focus, reset } = useTyping(enabled, { onChar, onBackspace, onNitro, getCommittedWord });
  const textRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const [focused, setFocused] = useState(false);

  // Focus the input as soon as typing is allowed (desktop keyboards start instantly),
  // and clear it once typing is over.
  useEffect(() => {
    if (enabled) focus();
    else reset();
  }, [enabled, focus, reset]);

  // Any printable key focuses the input, so no keystroke is lost.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!enabled) return;
      const input = inputRef.current;
      if (!input || document.activeElement === input) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (event.key === GAME_CONFIG.nitroKey) {
        event.preventDefault();
        onNitro();
        return;
      }
      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        input.focus({ preventScroll: true });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled, inputRef, onNitro]);

  // Keep the current line visible (one finished line stays above it).
  useLayoutEffect(() => {
    const box = textRef.current;
    const cursor = cursorRef.current;
    if (!box || !cursor) return;
    const lineHeight = parseFloat(getComputedStyle(cursor).lineHeight) || 34;
    const target = Math.max(0, cursor.offsetTop - lineHeight);
    if (Math.abs(box.scrollTop - target) > 2) box.scrollTop = target;
  }, [view.pos]);

  const done = text.slice(0, view.pos);
  const current = text[view.pos] ?? '';
  const rest = text.slice(view.pos + 1);

  const placeholder =
    phase === 'countdown'
      ? 'Bersiap...'
      : view.completed
        ? 'Selesai!'
        : !enabled
          ? 'Balapan berakhir'
          : 'Ketik di sini...';

  const fireNitro = (event: PointerEvent<HTMLButtonElement>) => {
    // Keep focus in the input so the (virtual) keyboard stays open.
    event.preventDefault();
    onNitro();
  };
  const fireNitroFromKeyboard = (event: MouseEvent<HTMLButtonElement>) => {
    if (event.detail === 0) onNitro();
  };

  return (
    <section className={`typing-box ${focused ? 'focused' : ''} ${enabled ? '' : 'locked'}`} aria-label="Area mengetik">
      {meta && <div className="typing-meta">{meta}</div>}
      <div className="typing-text" ref={textRef} onClick={focus}>
        <span className="t-done">{done}</span>
        {view.completed ? (
          // Nitro bonus distance can carry a rider over the line before the last letters.
          <span className="t-skip" title="Terlewati berkat bonus nitro">
            {text.slice(view.pos)}
          </span>
        ) : (
          <>
            {current && (
              <span
                ref={cursorRef}
                key={view.errorActive ? `err-${view.errorTick}` : 'cur'}
                className={`t-cur ${view.errorActive ? 't-err' : ''}`}
              >
                {current}
              </span>
            )}
            <span className="t-todo">{rest}</span>
          </>
        )}
      </div>

      <div className="typing-controls">
        <div className={`typing-input-wrap ${view.errorActive ? 'error' : ''}`}>
          <input
            ref={inputRef}
            className="typing-input"
            {...inputProps}
            disabled={!enabled}
            placeholder={placeholder}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
          {!focused && enabled && (
            <button type="button" className="typing-focus-hint" onClick={focus}>
              Ketuk / klik di sini untuk mengetik
            </button>
          )}
        </div>
        <button
          type="button"
          className={`nitro-btn ${nitroReady ? 'ready' : ''} ${nitroActive ? 'active' : ''}`}
          disabled={!nitroReady}
          onPointerDown={fireNitro}
          onClick={fireNitroFromKeyboard}
          aria-label="Gunakan nitro"
        >
          <span className="nitro-btn-label">NITRO</span>
          <kbd className="hide-mobile">ENTER</kbd>
        </button>
      </div>
      <p className="typing-tip hide-mobile">
        Salah ketik = huruf merah, perbaiki untuk lanjut. Bangun kombo untuk mengisi nitro, lalu tekan <kbd>ENTER</kbd>{' '}
        untuk melesat.
      </p>
    </section>
  );
}

export default memo(TypingBox);
