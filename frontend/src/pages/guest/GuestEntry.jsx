import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Aperture, Users, Image as ImageIcon, ArrowRight, Camera, LayoutDashboard } from 'lucide-react';
import { guestApi } from '../../api/guestApi';
import { useAuth } from '../../contexts/AuthContext.jsx';

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
      <p className="mb-3 font-serif text-3xl font-semibold tracking-tight">Evento não encontrado</p>
      <p className="text-sm text-cream-dim">O link pode estar errado ou o evento foi removido.</p>
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
    <div className="flex min-w-[60px] flex-col items-center rounded-xl border border-line bg-surface px-3 py-2.5">
      <span className="font-mono text-2xl font-semibold text-cream">{String(v).padStart(2, '0')}</span>
      <span className="label-mono mt-0.5">{l}</span>
    </div>
  );
  return (
    <div>
      <p className="label-mono mb-3 text-center">Encerra em</p>
      <div className="flex items-center justify-center gap-2">
        <Box v={hrs} l="hrs" />
        <Box v={min} l="min" />
        <Box v={sec} l="seg" />
      </div>
    </div>
  );
}

export default function GuestEntry() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [event, setEvent] = useState(null);
  const [stats, setStats] = useState({ guestCount: 0, photoCount: 0 });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
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
      const data = await guestApi.join(slug, name, email.trim() || undefined);
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
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-ink-deep px-6 py-10">
      {/* Glow + grid decorativos */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.25]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(196,169,108,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(196,169,108,0.05) 1px, transparent 1px)',
          backgroundSize: '52px 52px',
          maskImage: 'radial-gradient(ellipse 65% 55% at 50% 42%, black 25%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 65% 55% at 50% 42%, black 25%, transparent 75%)',
        }}
      />

      <div className="relative z-10 w-full max-w-sm animate-slideup">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-gold/25 bg-gold/[0.08]">
            <Aperture size={17} className="text-gold" />
          </span>
          <Link to="/" className="font-serif text-xl font-semibold tracking-tight text-cream">
            Era Uma Vez
          </Link>
        </div>

        {/* Organizador logado: deixa claro que esta é a tela do CONVIDADO */}
        {isAuthenticated && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
            <p className="text-xs leading-relaxed text-cream-dim">
              Esta é a tela que seus convidados veem. Você pode entrar para testar — ou gerenciar o evento no painel.
            </p>
            <Link to="/dashboard" className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-gold/25 bg-gold/[0.08] px-3 py-1.5 text-xs font-medium text-gold transition hover:border-gold/45">
              <LayoutDashboard size={12} />
              Painel
            </Link>
          </div>
        )}

        <div className="card p-8">
          <div className="mb-7 text-center">
            <p className="label-mono mb-3">{TYPE_LABEL[event?.type] || 'Evento'}</p>
            <h1 className="font-serif text-4xl font-semibold leading-tight tracking-tight text-cream">{event?.name}</h1>
            <div className="mt-4 flex items-center justify-center gap-4 text-sm text-cream-dim">
              <span className="inline-flex items-center gap-1.5">
                <Users size={14} className="text-gold/50" />
                <span className="font-medium text-cream/80">{stats.guestCount}</span>
              </span>
              <span className="h-3 w-px bg-line" />
              <span className="inline-flex items-center gap-1.5">
                <ImageIcon size={14} className="text-gold/50" />
                <span className="font-medium text-cream/80">{stats.photoCount}</span>
              </span>
            </div>
          </div>

          {!isClosed && event?.endsAt && (
            <div className="mb-7 border-y border-line/60 py-6">
              <Countdown target={event.endsAt} />
            </div>
          )}

          {isClosed ? (
            <div className="text-center">
              <p className="mb-4 text-sm text-cream-dim">Este evento está encerrado.</p>
              <Link to={`/e/${slug}/album`} className="btn-primary w-full rounded-2xl py-3.5 text-sm">
                Ver álbum
                <ArrowRight size={15} />
              </Link>
            </div>
          ) : (
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-cream-dim">Seu nome</label>
                <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)}
                  placeholder="Como quer ser chamado?" className="input-field" maxLength={40} autoFocus />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-cream-dim">
                  Email <span className="font-normal text-cream-dim/60">(opcional)</span>
                </label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="para ser avisado quando o álbum revelar" className="input-field" />
              </div>

              {error && (
                <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">{error}</p>
              )}

              <button type="submit" disabled={joining}
                className="btn-primary w-full rounded-2xl py-3.5 disabled:opacity-50">
                {joining ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                    Entrando…
                  </span>
                ) : (
                  <>
                    <Camera size={16} />
                    Entrar e fotografar
                  </>
                )}
              </button>

              {(event?.photoLimitPerGuest ?? 0) > 0 && (
                <p className="text-center text-xs text-cream-dim">
                  Seu filme tem <span className="font-medium text-cream/80">{event.photoLimitPerGuest} frames</span> — fotos ou vídeos de 15s. Use com carinho.
                </p>
              )}
              <p className="text-center font-mono text-[10px] uppercase tracking-label text-cream-dim/60">
                Sem cadastro · Sem download · No navegador
              </p>
              <Link to={`/e/${slug}/album`} className="group flex items-center justify-center gap-1 text-sm text-cream-dim transition hover:text-cream">
                Ver álbum
                <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
