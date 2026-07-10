import { FILTERS } from '../utils/filters';
import { Check } from 'lucide-react';

const SAMPLE =
  'https://images.unsplash.com/photo-1519741497674-611481863552?w=200&q=60&auto=format';

export default function FilterSelector({ value, onChange }) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
      {FILTERS.map((f) => {
        const selected = f.id === value;
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => onChange(f.id)}
            className={`group relative flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-all duration-200 ${
              selected
                ? 'border-gold/60 bg-gold/10'
                : 'border-line hover:border-gold/40 hover:bg-gold/[0.03]'
            }`}
          >
            <div
              className="relative h-16 w-full overflow-hidden rounded-lg"
              style={f.wrapperStyle}
            >
              <img
                src={SAMPLE}
                alt={f.label}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                style={{ filter: f.cssFilter }}
              />
              {f.vignette && (
                <div
                  className="pointer-events-none absolute inset-0 rounded-lg"
                  style={{
                    background:
                      'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%)',
                  }}
                />
              )}
              {selected && (
                <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gold text-[#1c160c] shadow-md">
                  <Check size={11} strokeWidth={3} />
                </span>
              )}
            </div>
            <span
              className={`text-xs font-medium transition-colors ${selected ? 'text-cream' : 'text-cream-dim group-hover:text-cream'}`}
            >
              {f.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
