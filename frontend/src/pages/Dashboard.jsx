import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { eventApi } from '../api/eventApi';
import EventCard from '../components/EventCard';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    eventApi.list()
      .then((d) => setEvents(d.events || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const active = events.filter((e) => e.status === 'active');
  const others = events.filter((e) => e.status !== 'active');
  const initial = (user?.name || '?').trim().charAt(0).toUpperCase();

  return (
    <div className="min-h-screen text-cream">
      <header className="sticky top-0 z-10 border-b border-cream/[0.06] bg-ink/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="font-serif text-lg tracking-wide">
            Era <span className="text-gold">Uma Vez</span>
          </span>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-cream/45 sm:inline">{user?.name?.split(' ')[0]}</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cream/15 bg-cream/[0.04] text-sm text-cream/70">
              {initial}
            </span>
            <button onClick={logout} className="text-xs text-cream/35 transition hover:text-cream/70">Sair</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="label-mono mb-2 text-cream/35">Seus filmes</p>
            <h1 className="font-serif text-4xl">Meus eventos</h1>
          </div>
          <Link to="/events/new" className="btn-primary">+ Novo evento</Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-cream/15 border-t-cream/60" />
          </div>
        ) : events.length === 0 ? (
          <div className="flex animate-fadein flex-col items-center py-20 text-center">
            <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl border border-cream/10 bg-cream/[0.04]">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(201,168,106,0.6)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                <circle cx="12" cy="13" r="3" />
              </svg>
            </div>
            <p className="font-serif text-2xl text-cream/55">Nenhum evento ainda</p>
            <p className="mt-2 text-sm text-cream/35">Crie seu primeiro álbum colaborativo.</p>
            <Link to="/events/new" className="btn-primary mt-8">Criar meu primeiro evento</Link>
          </div>
        ) : (
          <div className="animate-fadein space-y-10">
            {active.length > 0 && (
              <section>
                <p className="label-mono mb-4 text-cream/35">Ativos agora</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {active.map((ev) => <EventCard key={ev.id} event={ev} />)}
                  <Link to="/events/new"
                    className="flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-cream/12 text-cream/35 transition hover:border-gold/40 hover:text-gold">
                    <span className="text-2xl">+</span>
                    <span className="text-sm">Criar novo evento</span>
                  </Link>
                </div>
              </section>
            )}
            {others.length > 0 && (
              <section>
                {active.length > 0 && <p className="label-mono mb-4 text-cream/35">Anteriores</p>}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {others.map((ev) => <EventCard key={ev.id} event={ev} />)}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
