import { PLANS, formatBRL, isCustomPlan, capacityLabel } from '../utils/plans';
import { Check, MessageCircle } from 'lucide-react';

const guestLabel = (p) => (p.maxGuests >= 100000 ? '200+' : String(p.maxGuests));

export default function PlanSelector({ value, onChange }) {
  const idx = PLANS.findIndex((p) => p.id === value);
  const current = PLANS[idx] || PLANS[0];
  const custom = isCustomPlan(current);

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
          aria-label="Plano do evento"
          onChange={(e) => onChange(PLANS[Number(e.target.value)].id)}
          className="h-11 w-full accent-[#C4A96C]"
        />
        <div className="mt-1.5 flex justify-between font-mono text-[11px] text-cream-dim/70">
          {PLANS.map((p) => (
            <span key={p.id}>{guestLabel(p)}</span>
          ))}
        </div>
      </div>

      {/* Detalhes do plano selecionado */}
      <div className="relative overflow-hidden rounded-2xl border border-line bg-surface-2 p-6 text-center">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-gold/[0.06] to-transparent" />
        <p className="label-mono">{current.label}</p>
        <p className="mt-2 font-serif text-4xl font-semibold tracking-tight text-white">
          {formatBRL(current.priceCents)}
        </p>
        <p className="mt-1 text-sm text-cream-dim">
          {current.maxGuests >= 100000 ? 'Mais de 200 participantes' : `Até ${current.maxGuests} participantes`}
          {' · '}
          {custom ? 'Limites personalizados' : capacityLabel(current.capacity)}
        </p>
        {custom ? (
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-gold">
            <MessageCircle size={13} /> Sob consulta — fale com a nossa equipe
          </p>
        ) : current.priceCents === 0 ? (
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-success">
            <Check size={13} /> Plano gratuito — ativação imediata
          </p>
        ) : (
          <p className="mt-3 text-xs text-cream-dim/70">Pagamento único, sem recorrência</p>
        )}
      </div>

      {/* Grid de opções rápidas */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {PLANS.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={p.id === value}
            onClick={() => onChange(p.id)}
            className={`flex min-h-11 flex-col items-center justify-center rounded-xl border px-1 py-2 font-mono text-xs font-medium transition-all ${
              p.id === value
                ? 'border-gold/70 bg-gold text-[#1c160c]'
                : 'border-line text-cream-dim hover:border-gold/40 hover:text-cream'
            }`}
          >
            <span>{guestLabel(p)}</span>
            <span className={`mt-0.5 text-[10px] font-normal ${p.id === value ? 'text-[#1c160c]/70' : 'text-cream-dim/60'}`}>
              {isCustomPlan(p) ? 'sob consulta' : formatBRL(p.priceCents)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
