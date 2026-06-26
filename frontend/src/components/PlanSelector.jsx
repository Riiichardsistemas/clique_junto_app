import { PLANS, formatBRL } from '../utils/plans';

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
          className="w-full accent-gold"
        />
        <div className="mt-1 flex justify-between text-xs text-white/40">
          {PLANS.map((p) => (
            <span key={p.id}>{p.maxGuests >= 100000 ? '∞' : p.maxGuests}</span>
          ))}
        </div>
      </div>

      {/* Detalhes do plano selecionado */}
      <div className="rounded-2xl border border-gold/30 bg-surface-2 p-6 text-center">
        <p className="text-sm uppercase tracking-widest text-white/50">Plano selecionado</p>
        <p className="mt-2 font-serif text-4xl text-gold">{formatBRL(current.priceCents)}</p>
        <p className="mt-1 text-sm text-white/70">
          {current.maxGuests >= 100000 ? 'Participantes ilimitados' : `Até ${current.maxGuests} participantes`}
        </p>
        {current.priceCents === 0 && (
          <p className="mt-3 text-xs text-emerald-400">Plano gratuito — ativação imediata</p>
        )}
        {current.priceCents > 0 && (
          <p className="mt-3 text-xs text-white/40">Pagamento único, sem recorrência</p>
        )}
      </div>

      {/* Grid de opções rápidas */}
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
        {PLANS.map((p, i) => (
          <button
            key={p.id}
            onClick={() => onChange(p.id)}
            className={`rounded-xl border py-2 text-xs font-medium transition ${
              p.id === value
                ? 'border-gold bg-gold/10 text-gold'
                : 'border-white/10 text-white/60 hover:border-white/30'
            }`}
          >
            {p.maxGuests >= 100000 ? '200+' : p.maxGuests}
          </button>
        ))}
      </div>
    </div>
  );
}
