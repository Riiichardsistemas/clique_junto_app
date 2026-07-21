import { Link } from 'react-router-dom';
import { Users, Image as ImageIcon, Clock, ArrowUpRight } from 'lucide-react';

const TYPE_LABEL = {
  casamento: 'Casamento', festa: 'Festa', aniversario: 'Aniversário',
  corporativo: 'Corporativo', viagem: 'Viagem', outro: 'Outro',
};

const STATUS = {
  draft:    { label: 'Rascunho',  cls: 'badge-draft'    },
  active:   { label: 'Ativo',     cls: 'badge-active'   },
  closed:   { label: 'Encerrado', cls: 'badge-closed'   },
  revealed: { label: 'Revelado',  cls: 'badge-revealed' },
};

export default function EventCard({ event }) {
  const s = STATUS[event.status] || STATUS.draft;

  return (
    <Link
      to={`/events/${event.id}`}
      className="card card-hover group relative block overflow-hidden p-5 sm:p-6"
    >
      {/* Glow sutil no hover */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-gold/[0.06] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      {/* Status + tipo */}
      <div className="relative mb-4 flex items-center justify-between gap-2">
        <span className="label-mono">{TYPE_LABEL[event.type] || event.type}</span>
        <span className={s.cls}>{s.label}</span>
      </div>

      {/* Nome */}
      <div className="relative flex items-start justify-between gap-2">
        <p className="truncate font-serif text-xl font-medium leading-snug text-cream">
          {event.name}
        </p>
        <ArrowUpRight
          size={16}
          className="mt-1 shrink-0 text-white/0 transition-all duration-250 group-hover:translate-x-0.5 group-hover:text-gold"
        />
      </div>

      {/* Métricas */}
      <div className="relative mt-4 flex items-center gap-4 text-sm text-cream-dim">
        <span className="inline-flex items-center gap-1.5">
          <Users size={14} className="text-gold/50" />
          <span className="font-medium text-cream/80">{event.guestCount ?? 0}</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ImageIcon size={14} className="text-gold/50" />
          <span className="font-medium text-cream/80">{event.photoCount ?? 0}</span>
        </span>
        {event.endsAt && (
          <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-cream-dim/70">
            <Clock size={12} />
            {new Date(event.endsAt).toLocaleString('pt-BR', {
              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
            })}
          </span>
        )}
      </div>
    </Link>
  );
}
