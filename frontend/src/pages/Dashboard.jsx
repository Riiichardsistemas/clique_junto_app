import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Camera } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { eventApi } from '../api/eventApi';
import EventCard from '../components/EventCard';
import AppHeader from '../components/layout/AppHeader';

export default function Dashboard() {
  const { user } = useAuth();
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

  return (
    <div className="min-h-screen text-cream">
      <AppHeader />

      <main className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-10">
          <div>
            <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl md:text-[42px]">Meus Eventos</h1>
            <p className="mt-2 text-sm text-cream-dim">
              Olá, {user?.name?.split(' ')[0] || 'organizador'} — gerencie seus álbuns.
            </p>
          </div>
          <Link to="/events/new" className="btn-primary">
            <Plus size={16} />
            Novo evento
          </Link>
        </div>

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton h-[150px] rounded-glass" style={{ animationDelay: `${i * 0.08}s` }} />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="flex animate-fadein flex-col items-center rounded-3xl border border-dashed border-line py-16 text-center sm:py-20">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-gold/20 bg-gold/[0.06]">
              <Camera size={32} className="text-gold/60" strokeWidth={1.4} />
            </div>
            <p className="font-serif text-2xl font-medium text-cream/80">Nenhum evento ainda</p>
            <p className="mt-2 text-sm text-cream-dim">Crie seu primeiro álbum colaborativo.</p>
            <Link to="/events/new" className="btn-primary mt-8">
              <Plus size={16} />
              Criar meu primeiro evento
            </Link>
          </div>
        ) : (
          <div className="animate-fadein space-y-10">
            {active.length > 0 && (
              <section>
                <div className="mb-4 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_8px_rgba(74,222,128,0.6)]" />
                  <p className="label-mono">Ativos agora</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {active.map((ev) => <EventCard key={ev.id} event={ev} />)}
                  <Link
                    to="/events/new"
                    className="flex min-h-[150px] flex-col items-center justify-center gap-2 rounded-glass border border-dashed border-line text-cream-dim/70 transition-all hover:border-gold/40 hover:bg-gold/[0.03] hover:text-cream"
                  >
                    <Plus size={20} />
                    <span className="text-sm font-medium">Criar novo evento</span>
                  </Link>
                </div>
              </section>
            )}
            {others.length > 0 && (
              <section>
                {active.length > 0 && <p className="label-mono mb-4">Anteriores</p>}
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
