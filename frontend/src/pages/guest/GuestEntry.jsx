import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { guestApi } from '../../api/guestApi';

function Loader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-white/60" />
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black text-cream px-6 text-center">
      <p className="font-serif text-3xl mb-3">Evento não encontrado</p>
      <p className="text-sm text-white/40">O link pode estar errado ou o evento foi removido.</p>
    </div>
  );
}

export default function GuestEntry() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [event,    setEvent]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [nickname, setNickname] = useState('');
  const [joining,  setJoining]  = useState(false);
  const [error,    setError]    = useState('');

  useEffect(() => {
    // Check if already joined
    const existing = guestApi.getGuestToken(slug);
    if (existing) {
      navigate(`/e/${slug}/camera`, { replace: true });
      return;
    }
    guestApi.getEvent(slug)
      .then((d) => setEvent(d.event))
      .catch((e) => {
        if (e?.response?.status === 404) setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [slug, navigate]);

  async function handleJoin(e) {
    e.preventDefault();
    const name = nickname.trim();
    if (!name) { setError('Digite seu nome para continuar.'); return; }
    setJoining(true);
    setError('');
    try {
      const data = await guestApi.join(slug, name);
      guestApi.setGuestToken(slug, data.token);
      navigate(`/e/${slug}/camera`);
    } catch (err) {
      const msg = err?.response?.data?.error || 'Erro ao entrar. Tente novamente.';
      setError(msg);
    } finally {
      setJoining(false);
    }
  }

  if (loading)  return <Loader />;
  if (notFound) return <NotFound />;

  const isClosed = event?.status === 'closed' || event?.status === 'revealed';

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-black px-6 overflow-hidden">
      {/* Film-grain background */}
      <div className="pointer-events-none absolute inset-0 opacity-30"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'0.4\'/%3E%3C/svg%3E")',
          backgroundSize: '200px' }} />

      {/* Vignette */}
      <div className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.85) 100%)' }} />

      <div className="relative z-10 w-full max-w-sm animate-slideup">
        {/* Logo */}
        <div className="mb-10 text-center">
          <Link to="/" className="font-serif text-2xl tracking-wide text-cream">
            Era <span className="text-gold">Uma Vez</span>
          </Link>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
          {/* Event info */}
          <div className="mb-8 text-center">
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/40">
              <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse-slow" />
              {event?.type === 'casamento' ? 'Casamento' :
               event?.type === 'aniversario' ? 'Aniversário' :
               event?.type === 'corporativo' ? 'Corporativo' : 'Evento'}
            </div>
            <h1 className="font-serif text-3xl leading-tight text-cream">{event?.name}</h1>
            {event?.description && (
              <p className="mt-2 text-sm text-white/40">{event.description}</p>
            )}
          </div>

          {isClosed ? (
            <div className="text-center">
              <p className="text-sm text-white/40 mb-2">Este evento está encerrado.</p>
              <Link to={`/e/${slug}/album`} className="btn-film w-full mt-4 block text-center py-3 rounded-2xl text-sm font-semibold">
                Ver álbum
              </Link>
            </div>
          ) : (
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-widest text-white/40">
                  Seu nome
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Como quer ser chamado?"
                  className="input-field"
                  maxLength={40}
                  autoFocus
                />
              </div>

              {error && (
                <p className="rounded-xl bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>
              )}

              <button
                type="submit"
                disabled={joining}
                className="btn-film w-full rounded-2xl py-3.5 text-sm font-semibold disabled:opacity-50"
              >
                {joining ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                    Entrando…
                  </span>
                ) : (
                  '📷  Entrar no evento'
                )}
              </button>

              <p className="text-center text-xs text-white/25">
                Sem cadastro. Sem download.
              </p>
            </form>
          )}
        </div>

        {/* Film strip decoration */}
        <div className="mt-8 flex items-center justify-center gap-1 opacity-20">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-5 w-4 rounded-[2px] border border-white/30 bg-white/5" />
          ))}
        </div>
      </div>
    </div>
  );
}
