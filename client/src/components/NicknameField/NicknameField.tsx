import { useId, useState } from 'react';
import { GAME_CONFIG } from '@shared/gameConfig';
import { nicknameError } from '@shared/validation';

interface NicknameFieldProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  autoFocus?: boolean;
  label?: string;
}

export default function NicknameField({
  value,
  onChange,
  onSubmit,
  autoFocus = false,
  label = 'Masukkan nama',
}: NicknameFieldProps) {
  const id = useId();
  const [touched, setTouched] = useState(false);
  const error = value.length > 0 || touched ? nicknameError(value) : null;

  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className={`input ${error ? 'invalid' : ''}`}
        value={value}
        maxLength={GAME_CONFIG.nicknameMax}
        placeholder="contoh: Ananda"
        autoComplete="off"
        autoCapitalize="words"
        spellCheck={false}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setTouched(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && onSubmit) {
            e.preventDefault();
            setTouched(true);
            onSubmit();
          }
        }}
      />
      {error ? (
        <span className="field-error">{error}</span>
      ) : (
        <span className="field-hint">Nama sementara di dalam game. Tidak ada yang disimpan setelah kamu pergi.</span>
      )}
    </div>
  );
}
