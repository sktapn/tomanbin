import { CATEGORY_EMOJI, CATEGORY_LABELS } from '../utils';

export default function CategoryFilter({ value, onChange }) {
  const options = [['', 'Todos', '✨'], ...Object.keys(CATEGORY_LABELS).map((k) => [k, CATEGORY_LABELS[k], CATEGORY_EMOJI[k]])];
  return (
    <div className="cat-filter" role="tablist" aria-label="Filtrar por categoria">
      {options.map(([key, label, emoji]) => (
        <button
          key={key || 'all'}
          role="tab"
          aria-selected={value === key}
          className={`cat-pill ${value === key ? 'active' : ''}`}
          onClick={() => onChange(key)}
        >
          <span>{emoji}</span> {label}
        </button>
      ))}
    </div>
  );
}
