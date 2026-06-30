import { FILTERS } from '../utils/filters';

const SAMPLE =
  'https://images.unsplash.com/photo-1519741497674-611481863552?w=200&q=60&auto=format';

export default function FilterSelector({ value, onChange }) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
      {FILTERS.map((f) => (
        <button
          key={f.id}
          onClick={() => onChange(f.id)}
          className={`group flex flex-col items-center gap-1.5 rounded-xl border p-2 transition ${
            f.id === value
              ? 'border-gold bg-gold/10'
              : 'border-white/10 hover:border-white/30'
          }`}
        >
          <div
            className="relative h-16 w-full overflow-hidden rounded-lg"
            style={f.wrapperStyle}
          >
            <img
              src={SAMPLE}
              alt={f.label}
              className="h-full w-full object-cover"
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
          </div>
          <span
            className={`text-xs font-medium ${f.id === value ? 'text-gold' : 'text-cream/60'}`}
          >
            {f.label}
          </span>
        </button>
      ))}
    </div>
  );
}
