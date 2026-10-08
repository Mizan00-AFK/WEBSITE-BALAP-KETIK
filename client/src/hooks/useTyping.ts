/**
 * useTyping - turns a real <input> into a fast typing controller.
 *
 * Why an <input> and not window keydown? Mobile browsers only open the virtual
 * keyboard for a focused input, and Android keyboards do not report keys in
 * keydown (key = "Unidentified"). So we read what changed in the input value
 * (works for physical AND virtual keyboards), forward every new character, then
 * reset the field to the correctly typed part of the current word.
 */
import {
  useCallback,
  useRef,
  type ClipboardEvent,
  type CompositionEvent,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { GAME_CONFIG } from '@shared/gameConfig';

export interface TypingHandlers {
  onChar: (char: string) => void;
  onBackspace: () => void;
  onNitro: () => void;
  /** What the input should show after each keystroke. */
  getCommittedWord: () => string;
}

export function useTyping(enabled: boolean, handlers: TypingHandlers) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previous = useRef('');
  const composing = useRef(false);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const normalize = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const word = handlersRef.current.getCommittedWord();
    if (el.value !== word) el.value = word;
    previous.current = word;
  }, []);

  /** Diff the input value against the previous one and forward the changes. */
  const processValue = useCallback((value: string) => {
    const before = previous.current;
    let i = 0;
    const max = Math.min(before.length, value.length);
    while (i < max && before[i] === value[i]) i += 1;
    const removed = before.length - i;
    const added = value.slice(i);
    previous.current = value;
    for (let k = 0; k < removed; k += 1) handlersRef.current.onBackspace();
    for (const char of added) handlersRef.current.onChar(char);
  }, []);

  const onInput = useCallback(
    (event: FormEvent<HTMLInputElement>) => {
      const el = event.currentTarget;
      if (!enabledRef.current) {
        el.value = '';
        previous.current = '';
        return;
      }
      processValue(el.value);
      const native = event.nativeEvent as InputEvent;
      if (!composing.current && !native.isComposing) normalize();
    },
    [normalize, processValue],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === GAME_CONFIG.nitroKey) {
        event.preventDefault();
        if (enabledRef.current) handlersRef.current.onNitro();
        return;
      }
      if (event.key === 'Tab') {
        event.preventDefault();
        return;
      }
      // Backspace on an empty field still clears the red error marker.
      if (event.key === 'Backspace' && event.currentTarget.value === '' && enabledRef.current) {
        handlersRef.current.onBackspace();
      }
    },
    [],
  );

  const onCompositionStart = useCallback(() => {
    composing.current = true;
  }, []);

  const onCompositionEnd = useCallback(
    (event: CompositionEvent<HTMLInputElement>) => {
      composing.current = false;
      if (!enabledRef.current) return;
      processValue(event.currentTarget.value);
      normalize();
    },
    [normalize, processValue],
  );

  const block = useCallback((event: ClipboardEvent<HTMLInputElement> | DragEvent<HTMLInputElement>) => {
    event.preventDefault();
  }, []);

  const focus = useCallback(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  const reset = useCallback(() => {
    if (inputRef.current) inputRef.current.value = '';
    previous.current = '';
  }, []);

  return {
    inputRef,
    focus,
    reset,
    inputProps: {
      onInput,
      onKeyDown,
      onCompositionStart,
      onCompositionEnd,
      onPaste: block,
      onDrop: block,
      autoComplete: 'off',
      autoCorrect: 'off',
      autoCapitalize: 'off',
      spellCheck: false,
      inputMode: 'text' as const,
      enterKeyHint: 'go' as const,
      'aria-label': 'Ketik teks di sini',
    },
  };
}
