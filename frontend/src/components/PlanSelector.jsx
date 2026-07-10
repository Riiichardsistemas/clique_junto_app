import { PLANS, formatBRL } from '../utils/plans';
import { Check } from 'lucide-react';

export default function PlanSelector({ value, onChange }) {
  const idx = PLANS.findIndex((p) => p.id === value);
  const current = PLANS[idx] || PLANS[0];

  return (
    <div className="space-y-6">
      {/* Slider */}
      <div>
        <input
          type="range"
          min={0}
          max={PLANS.length - 1}
          step={1}
          value={idx < 0 ? 0 : idx}
          onChange={(e) => onChange(PLANS[Number(e.target.value)].id)}
          className="w-full accent-[#C4A96C]"
        />
        <div className="mt-1.5 flex justify-between font-mono text-[11px] text-cream-dim/70">
          {PLANS.map((p) => (
            <span key={p.id}>{p.maxGuests >= 100000 ? '∞' : p.maxGuests}</span>
          ))}
        </div>
      </div>

      {/* Detalhes do plano selecionado */}
      <div className="relative overflow-hidden rounded-2xl border border-line bg-surface-2 p-6 text-center">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-gold/[0.06] to-transparent" />
        <p className="label-mono">Plano selecionado</p>
        <p className="mt-2 font-serif text-4xl font-semibold tracking-tight text-white">
          {formatBRL(current.priceCents)}
        </p>
        <p className="mt-1 text-sm text-cream-dim">
          {current.maxGuests >= 100000 ? 'Participantes ilimitados' : `Até ${current.maxGuests} participantes`}
        </p>
        {current.priceCents === 0 ? (
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-success">
            <Check size={13} /> Plano gratuito — ativação imediata
          </p>
        ) : (
          <p className="mt-3 text-xs text-cream-dim/70">Pagamento único, sem recorrência</p>
        )}
      </div>

      {/* Grid de opções rápidas */}
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
        {PLANS.map((p) => (
          <button
            key={p.id}
            onClick={() => onChange(p.id)}
            className={`rounded-xl border py-2 font-mono text-xs font-medium transition-all ${
              p.id === value
                ? 'border-gold/70 bg-gold text-[#1c160c]'
                : 'border-line text-cream-dim hover:border-gold/40 hover:text-cream'
            }`}
          >
            {p.maxGuests >= 100000 ? '200+' : p.maxGuests}
          </button>
        ))}
      </div>
    </div>
  );
}
