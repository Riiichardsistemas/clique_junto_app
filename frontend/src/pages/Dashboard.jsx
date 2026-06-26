import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { eventApi } from '../api/eventApi';
import EventCard from '../components/EventCard';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    eventApi.list()
      .then((d) => setEvents(d.events || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const active = events.filter((e) => e.status === 'active');
  const others = events.filter((e) => e.status !== 'active');

  return (
    <div className="min-h-screen bg-black text-cream">
      <header className="sticky top-0 z-10 border-b border-white/8 bg-black/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="font-serif text-lg tracking-wide">
            Era <span className="text-gold">Uma Vez</span>
          </span>
          <div className="flex items-center gap-4">
            <span className="text-sm text-white/35">{user?.name?.split(' ')[0]}</span>
            <button onClick={logout} className="text-xs text-white/30 transition hover:text-white/60">Sair</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.25em] text-white/30">Seus filmes</p>
            <h1 className="font-serif text-4xl">Meus eventos</h1>
          </div>
          <Link to="/events/new" className="rounded-2xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-cream active:scale-95">
            + Novo evento
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/15 border-t-white/60" />
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center animate-fadein">
            <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl border border-white/10 bg-white/5">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                <circle cx="12" cy="13" r="3"/>
              </svg>
            </div>
            <p className="font-serif text-2xl text-white/50">Nenhum evento ainda</p>
            <p className="mt-2 text-sm text-white/30">Crie seu primeiro álbum colaborativo.</p>
            <Link to="/events/new" className="mt-8 rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-cream transition">
              Criar meu primeiro evento
            </Link>
          </div>
        ) : (
          <div className="space-y-8 animate-fadein">
            {active.length > 0 && (
              <section>
                <p className="mb-4 text-xs uppercase tracking-[0.25em] text-white/30">Ativos agora</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {active.map((ev) => <EventCard key={ev.id} event={ev} />)}
                </div>
              </section>
            )}
            {others.length > 0 && (
              <section>
                {active.length > 0 && <p className="mb-4 text-xs uppercase tracking-[0.25em] text-white/30">Anteriores</p>}
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
