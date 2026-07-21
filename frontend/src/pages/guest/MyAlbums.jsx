import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { eventApi } from '../../api/eventApi';
import AppHeader from '../../components/layout/AppHeader';

const STATUS_MAP = {
  draft:    { label: 'Rascunho',    color: 'text-cream/40' },
  active:   { label: 'Ativo',       color: 'text-green-400' },
  closed:   { label: 'Encerrado',   color: 'text-amber-400' },
  revealed: { label: 'Revelado',    color: 'text-gold' },
};

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function LockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function AlbumCard({ event }) {
  const meta = STATUS_MAP[event.status] || STATUS_MAP.draft;
  const revealed = event.status === 'revealed';

  return (
    <Link
      to={`/events/${event.id}/album`}
      className="group block animate-fadein text-left"
    >
      {/* Capa quadrada */}
      <div className="relative aspect-square w-full overflow-hidden rounded-glass border border-line bg-surface shadow-card transition-all duration-250 group-hover:scale-[1.02] group-hover:border-gold/40">
        {revealed && event.coverImageUrl ? (
          <img
            src={event.coverImageUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        ) : revealed ? (
          <div className="flex h-full w-full items-center justify-center bg-cream/[0.04]">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
              stroke="rgba(196,169,108,0.45)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.5-3.5L9 20" />
            </svg>
          </div>
        ) : (
          <div className="relative h-full w-full">
            <div className="grid h-full w-full grid-cols-3 gap-px opacity-40 blur-[1px]">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="animate-pulse-slow bg-cream/[0.06]"
                  style={{ animationDelay: `${i * 0.12}s` }} />
              ))}
            </div>
            <div className="absolute inset-0 flex items-center justify-center text-cream/30">
              <LockIcon />
            </div>
          </div>
        )}

        {/* Badge de contagem */}
        {(event.photoCount ?? 0) > 0 && (
          <span className="absolute bottom-2 right-2 rounded-md bg-ink/70 px-1.5 py-0.5 font-mono text-[10px] text-cream/80 backdrop-blur-sm">
            {event.photoCount}
          </span>
        )}

        {/* Status badge */}
        <span className={`absolute left-2 top-2 rounded-md bg-ink/70 px-1.5 py-0.5 font-mono text-[10px] backdrop-blur-sm ${meta.color}`}>
          {meta.label}
        </span>
      </div>

      <p className="mt-2 truncate text-[15px] font-medium leading-tight text-cream">{event.name}</p>
      <p className="mt-0.5 truncate text-[13px] text-cream/40">
        {formatDate(event.startsAt) || formatDate(event.createdAt)}
        {(event.guestCount ?? 0) > 0 && ` · ${event.guestCount} convidados`}
      </p>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center px-6 py-24 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-cream/10 bg-cream/[0.04] text-cream/30">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
          <circle cx="12" cy="13" r="3" />
        </svg>
      </div>
      <p className="font-serif text-2xl text-cream/70">Nenhum álbum ainda</p>
      <p className="mx-auto mt-2 max-w-xs text-sm text-cream/35">
        Crie seu primeiro evento para começar a guardar memórias.
      </p>
      <Link to="/events/new" className="btn-primary mt-6 inline-block rounded-2xl px-6 py-3 text-sm">
        Criar evento
      </Link>
    </div>
  );
}

export default function MyAlbums() {
  const navigate = useNavigate();
  const [events, setEvents] = useState(null);

  useEffect(() => {
    eventApi.list()
      .then((d) => setEvents(d.events || []))
      .catch(() => navigate('/dashboard'));
  }, [navigate]);

  const revealed = (events || []).filter((e) => e.status === 'revealed');
  const active   = (events || []).filter((e) => e.status === 'active');
  const others   = (events || []).filter((e) => e.status !== 'revealed' && e.status !== 'active');

  return (
    <div className="app-shell text-cream">
      <AppHeader />
      <header className="mx-auto max-w-6xl px-4 pb-2 pt-7 sm:px-6 sm:pt-10">
        <p className="label-mono mb-2">Suas memórias</p>
        <h1 className="text-gradient font-serif text-3xl font-semibold tracking-tight sm:text-4xl md:text-[42px]">Álbuns</h1>
        <p className="mt-2 text-sm text-cream-dim">
          Abra o álbum de fotos de qualquer evento seu — revelado ou em andamento.
        </p>
      </header>

      {events === null ? (
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-3 gap-y-5 px-4 pt-6 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-6 sm:px-6 sm:pt-8 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton aspect-square rounded-glass" style={{ animationDelay: `${i * 0.06}s` }} />
          ))}
        </div>
      ) : events.length === 0 ? (
        <EmptyState />
      ) : (
        <main className="mx-auto max-w-6xl px-4 sm:px-6">
          {revealed.length > 0 && (
            <section className="mt-8">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-lg font-semibold">Revelados</h2>
                <span className="text-[13px] text-cream/35">{revealed.length}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-6 lg:grid-cols-4">
                {revealed.map((ev) => <AlbumCard key={ev.id} event={ev} />)}
              </div>
            </section>
          )}

          {active.length > 0 && (
            <section className="mt-8">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-lg font-semibold">Em andamento</h2>
                <span className="text-[13px] text-cream/35">{active.length}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-6 lg:grid-cols-4">
                {active.map((ev) => <AlbumCard key={ev.id} event={ev} />)}
              </div>
            </section>
          )}

          {others.length > 0 && (
            <section className="mt-8">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-lg font-semibold">Outros</h2>
                <span className="text-[13px] text-cream/35">{others.length}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-6 lg:grid-cols-4">
                {others.map((ev) => <AlbumCard key={ev.id} event={ev} />)}
              </div>
            </section>
          )}
        </main>
      )}
    </div>
  );
}
