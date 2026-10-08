import {
  CATEGORY_LABELS,
  filterTypingTexts,
  TEXT_CATEGORIES,
  TEXT_DIFFICULTIES,
  TEXT_DIFFICULTY_LABELS,
  TEXT_LENGTH_INFO,
  TEXT_LENGTHS,
  type TextCategoryChoice,
  type TextDifficultyChoice,
  type TextLengthChoice,
} from '../../data/typingTexts';
import type { TextOptionsValue } from '../../types/Race';
import { toTextFilter } from '../../utils/randomText';
import './TextOptions.css';

interface TextOptionsProps {
  value: TextOptionsValue;
  onChange: (value: TextOptionsValue) => void;
  disabled?: boolean;
}

const CATEGORY_CHOICES: TextCategoryChoice[] = ['semua', ...TEXT_CATEGORIES];
const DIFFICULTY_CHOICES: TextDifficultyChoice[] = ['semua', ...TEXT_DIFFICULTIES];
const LENGTH_CHOICES: TextLengthChoice[] = ['semua', ...TEXT_LENGTHS];

/** Pilihan teks Bahasa Indonesia: kategori, tingkat kesulitan, dan panjang. */
export default function TextOptions({ value, onChange, disabled = false }: TextOptionsProps) {
  const matches = filterTypingTexts(toTextFilter(value)).length;

  return (
    <div className="text-options">
      <div className="field">
        <span className="field-label">Kategori teks</span>
        <div className="chips">
          {CATEGORY_CHOICES.map((category) => (
            <button
              key={category}
              type="button"
              className={`chip ${value.category === category ? 'selected' : ''}`}
              disabled={disabled}
              onClick={() => onChange({ ...value, category })}
            >
              <span aria-hidden="true">{CATEGORY_LABELS[category].icon}</span>
              {CATEGORY_LABELS[category].label}
            </button>
          ))}
        </div>
      </div>

      <div className="text-options-row">
        <div className="field">
          <span className="field-label">Tingkat kesulitan teks</span>
          <div className="chips">
            {DIFFICULTY_CHOICES.map((difficulty) => (
              <button
                key={difficulty}
                type="button"
                className={`chip ${value.textDifficulty === difficulty ? 'selected' : ''}`}
                disabled={disabled}
                title={TEXT_DIFFICULTY_LABELS[difficulty].description}
                onClick={() => onChange({ ...value, textDifficulty: difficulty })}
              >
                {TEXT_DIFFICULTY_LABELS[difficulty].label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="field-label">Panjang teks</span>
          <div className="chips">
            {LENGTH_CHOICES.map((length) => (
              <button
                key={length}
                type="button"
                className={`chip ${value.textLength === length ? 'selected' : ''}`}
                disabled={disabled}
                title={TEXT_LENGTH_INFO[length].range}
                onClick={() => onChange({ ...value, textLength: length })}
              >
                {TEXT_LENGTH_INFO[length].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className={`text-options-count ${matches === 0 ? 'warn' : ''}`}>
        {matches > 0
          ? `${matches} teks Bahasa Indonesia cocok dengan pilihan ini - teks dipilih acak setiap balapan.`
          : 'Tidak ada teks yang cocok persis - akan dipilih teks yang paling mendekati.'}
      </p>
    </div>
  );
}
