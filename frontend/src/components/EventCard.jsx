import { Link } from 'react-router-dom';

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
      className="group block rounded-2xl border border-white/8 bg-white/3 p-5 transition-all duration-200 hover:border-white/18 hover:bg-white/6"
      style={{ background: 'rgba(255,255,255,0.03)' }}
    >
      {/* Status + tipo */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[11px] uppercase tracking-widest text-white/30">
          {TYPE_LABEL[event.type] || event.type}
        </span>
        <span className={s.cls}>{s.label}</span>
      </div>

      {/* Nome */}
      <p className="truncate font-serif text-xl leading-snug text-cream transition-colors group-hover:text-gold">
        {event.name}
      </p>

      {/* Métricas */}
      <div className="mt-4 flex gap-5 text-sm text-white/35">
        <span>
          <span className="font-semibold text-white/70">{event.guestCount ?? 0}</span>{' '}
          convidados
        </span>
        <span>
          <span className="font-semibold text-white/70">{event.photoCount ?? 0}</span>{' '}
          fotos
        </span>
      </div>

      {/* Data */}
      {event.endsAt && (
        <p className="mt-3 text-[11px] text-white/25">
          Encerra {new Date(event.endsAt).toLocaleString('pt-BR', {
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
          })}
        </p>
      )}
    </Link>
  );
}
