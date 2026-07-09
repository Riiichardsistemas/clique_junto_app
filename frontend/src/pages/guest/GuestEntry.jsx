import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { guestApi } from '../../api/guestApi';

const TYPE_LABEL = {
  casamento: 'Casamento', festa: 'Festa', aniversario: 'Aniversário',
  corporativo: 'Corporativo', viagem: 'Viagem', outro: 'Evento',
};

function Loader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-deep">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-cream/15 border-t-cream/60" />
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink-deep px-6 text-center text-cream">
      <p className="mb-3 font-serif text-3xl">Evento não encontrado</p>
      <p className="text-sm text-cream/40">O link pode estar errado ou o evento foi removido.</p>
    </div>
  );
}

function Countdown({ target }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = target ? Math.max(0, new Date(target).getTime() - now) : null;
  if (diff === null || diff <= 0) return null;
  const hrs = Math.floor(diff / 3600000);
  const min = Math.floor((diff % 3600000) / 60000);
  const sec = Math.floor((diff % 60000) / 1000);
  const Box = ({ v, l }) => (
    <div className="flex flex-col items-center">
      <span className="font-mono text-2xl font-semibold text-cream">{String(v).padStart(2, '0')}</span>
      <span className="label-mono mt-1 text-cream/35">{l}</span>
    </div>
  );
  return (
    <div>
      <p className="label-mono mb-3 text-center text-cream/35">Encerra em</p>
      <div className="flex items-start justify-center gap-3">
        <Box v={hrs} l="hrs" />
        <span className="font-mono text-2xl text-cream/25">:</span>
        <Box v={min} l="min" />
        <span className="font-mono text-2xl text-cream/25">:</span>
        <Box v={sec} l="seg" />
      </div>
    </div>
  );
}

export default function GuestEntry() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [stats, setStats] = useState({ guestCount: 0, photoCount: 0 });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [nickname, setNickname] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (guestApi.getGuestToken(slug)) {
      navigate(`/e/${slug}/camera`, { replace: true });
      return;
    }
    guestApi.getEvent(slug)
      .then((d) => { setEvent(d.event); if (d.stats) setStats(d.stats); })
      .catch((e) => { if (e?.response?.status === 404) setNotFound(true); })
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
      setError(err?.response?.data?.error || 'Erro ao entrar. Tente novamente.');
    } finally {
      setJoining(false);
    }
  }

  if (loading) return <Loader />;
  if (notFound) return <NotFound />;

  const isClosed = event?.status === 'closed' || event?.status === 'revealed';

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-ink-deep px-6">
      <div className="film-grain pointer-events-none absolute inset-0 opacity-25" />
      <div className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.9) 100%)' }} />

      <div className="relative z-10 w-full max-w-sm animate-slideup">
        <div className="mb-8 text-center">
          <Link to="/" className="font-serif text-xl tracking-wide text-cream">
            Era <span className="text-gold">Uma Vez</span>
          </Link>
        </div>

        <div className="card p-8">
          <div className="mb-7 text-center">
            <p className="label-mono mb-3 text-gold/80">{TYPE_LABEL[event?.type] || 'Evento'}</p>
            <h1 className="font-serif text-4xl leading-tight text-cream">{event?.name}</h1>
            <p className="mt-3 text-sm text-cream/40">
              <span className="text-cream/70">{stats.guestCount}</span> participantes
              <span className="mx-2 text-cream/20">·</span>
              <span className="text-cream/70">{stats.photoCount}</span> fotos
            </p>
          </div>

          {!isClosed && event?.endsAt && (
            <div className="mb-7 border-y border-cream/[0.06] py-6">
              <Countdown target={event.endsAt} />
            </div>
          )}

          {isClosed ? (
            <div className="text-center">
              <p className="mb-4 text-sm text-cream/40">Este evento está encerrado.</p>
              <Link to={`/e/${slug}/album`} className="btn-film block w-full rounded-2xl py-3.5 text-sm">
                Ver álbum
              </Link>
            </div>
          ) : (
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="label-mono mb-2 block text-cream/45">Seu nome</label>
                <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)}
                  placeholder="Como quer ser chamado?" className="input-field" maxLength={40} autoFocus />
              </div>

              {error && <p className="rounded-xl bg-red-500/10 px-4 py-2 text-sm text-red-300">{error}</p>}

              <button type="submit" disabled={joining}
                className="btn-primary w-full rounded-2xl py-3.5 disabled:opacity-50">
                {joining ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink/30 border-t-ink" />
                    Entrando…
                  </span>
                ) : 'Entrar e fotografar'}
              </button>

              {(event?.photoLimitPerGuest ?? 0) > 0 && (
                <p className="text-center text-xs text-cream/40">
                  Seu filme tem <span className="text-gold/80">{event.photoLimitPerGuest} frames</span> — fotos ou vídeos de 15s. Use com carinho 🎞️
                </p>
              )}
              <p className="text-center text-xs text-cream/30">Sem cadastro · Sem download · No navegador</p>
              <Link to={`/e/${slug}/album`} className="block text-center text-sm text-cream/45 transition hover:text-gold">
                Ver álbum →
              </Link>
            </form>
          )}
        </div>

        {/* Tira de filme decorativa */}
        <div className="mt-8 flex items-center justify-center gap-1 opacity-20">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-5 w-4 rounded-[2px] border border-cream/30 bg-cream/5" />
          ))}
        </div>
      </div>
    </div>
  );
}
