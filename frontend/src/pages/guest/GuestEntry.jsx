import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Aperture, Users, Image as ImageIcon, ArrowRight, Camera, LayoutDashboard } from 'lucide-react';
import { guestApi } from '../../api/guestApi';
import { useAuth } from '../../contexts/AuthContext.jsx';
import PageLoader from '../../components/ui/PageLoader';
import Brand from '../../components/ui/Brand';
import LogoMark from '../../components/ui/LogoMark.jsx';

function hexToRgba(hex, a = 1) {
  if (!hex) return null;
  const m = hex.replace('#', '');
  const n = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return null;
  return `rgba(${r},${g},${b},${a})`;
}

const TYPE_LABEL = {
  casamento: 'Casamento', festa: 'Festa', aniversario: 'Aniversário',
  corporativo: 'Corporativo', viagem: 'Viagem', outro: 'Evento',
};

function NotFound() {
  return (
    <div className="app-screen flex flex-col items-center justify-center bg-ink-deep px-6 text-center text-cream">
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

/* ---------- Tema “Convite” — página clara com polaroids ---------- */
function ConviteEntry({
  event, stats, slug, isClosed, isAuthenticated,
  nickname, setNickname, email, setEmail, error, joining, handleJoin,
}) {
  const accent = event?.themeColor || '#D2622A';
  const photos = (event?.invitePhotos?.length ? event.invitePhotos : [event?.coverImageUrl]).filter(Boolean);
  const dateLabel = event?.startsAt
    ? new Date(event.startsAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
    : null;
  const caption = event?.welcomeMessage || 'a festa toda, num filme só';
  const guestCount = stats?.guestCount ?? 0;
  const ink = '#2b241a';

  return (
    <div className="app-screen flex flex-col items-center overflow-x-hidden bg-[#f2ead9] px-5 py-8 sm:py-12" style={{ color: ink }}>
      <div className="w-full max-w-sm animate-slideup text-center">
        {/* Marca */}
        <p className="flex items-center justify-center gap-2 font-serif text-lg font-semibold" style={{ color: `${ink}B3` }}>
          <LogoMark variant="light" accent={accent} className="h-[22px] w-[22px] shrink-0" />
          Clique Junto
        </p>

        {/* Pilha de polaroids — leque orgânico; com 3 fotos a principal centraliza
            e encolhe para as duas de trás espreitarem pelos cantos */}
        <div className="relative mt-4">
          {/* Fundo direita — paisagem, mais alta, inclinada pra direita */}
          {photos[1] && (
            <div className={`absolute top-0 z-[1] rotate-[7deg] rounded-sm bg-white p-1.5 pb-4 shadow-[0_12px_32px_-14px_rgba(43,36,26,0.5)] ${
              photos[2] ? '-right-[1%] w-[56%]' : '-right-[2%] w-[60%]'}`}>
              <img src={photos[1]} alt="" className="aspect-[5/4] w-full rounded-[2px] object-cover" />
            </div>
          )}
          {/* Fundo esquerda — um degrau abaixo, inclinada pra esquerda */}
          {photos[2] && (
            <div className="absolute -left-[2%] top-7 z-0 w-[52%] rotate-[-10deg] rounded-sm bg-white p-1.5 pb-4 shadow-[0_10px_28px_-14px_rgba(43,36,26,0.45)]">
              <img src={photos[2]} alt="" className="aspect-[5/4] w-full rounded-[2px] object-cover" />
            </div>
          )}
          {/* Principal — contrapõe o ângulo das de fundo */}
          <div className={`relative z-10 rounded-sm bg-white p-2.5 pb-3 shadow-[0_18px_44px_-16px_rgba(43,36,26,0.55)] ${
            photos[2]
              ? 'mx-auto mt-[4.75rem] w-[74%] rotate-[-2.5deg]'
              : photos[1]
                ? 'ml-[1%] mt-16 w-[84%] rotate-[-2deg]'
                : 'mx-auto mt-2 w-[84%] rotate-[-1.5deg]'}`}>
            <span className="relative block">
              {photos[0] ? (
                <img src={photos[0]} alt={event?.name} className="aspect-[4/5] w-full rounded-[2px] object-cover" />
              ) : (
                <span className="flex aspect-[4/5] w-full items-center justify-center rounded-[2px] bg-[#e5dcc8]">
                  <Aperture size={28} style={{ color: `${ink}4D` }} />
                </span>
              )}
              {/* Selo preso ao canto da foto — não depende do tamanho da legenda */}
              <span
                className="absolute -right-5 bottom-3 z-20 rotate-[-4deg] rounded-sm px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-white shadow-lg"
                style={{ background: accent }}>
                Convite ★
              </span>
            </span>
            <p className="mt-2.5 line-clamp-3 px-1 text-center font-serif text-sm italic leading-snug" style={{ color: `${ink}99` }}>
              {caption}
            </p>
          </div>
        </div>

        {/* Convite — alinhado à esquerda, como no layout */}
        <div className="mt-8 text-left">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.3em]" style={{ color: accent }}>
            Você foi convidado para
          </p>
          <h1 className="mt-1.5 break-words font-serif text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            {event?.name}
          </h1>
          {(dateLabel || event?.venueName) && (
            <p className="mt-1.5 text-sm font-medium" style={{ color: `${ink}99` }}>
              {[dateLabel, event?.venueName].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>

        {isClosed ? (
          <div className="mt-8">
            <p className="mb-4 text-sm" style={{ color: `${ink}99` }}>Este evento está encerrado.</p>
            <Link to={`/e/${slug}/album`}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-4 text-sm font-semibold text-[#f2ead9] transition hover:opacity-90"
              style={{ background: ink }}>
              Ver álbum <ArrowRight size={15} />
            </Link>
          </div>
        ) : (
          <form onSubmit={handleJoin} className="mt-8 text-left">
            <label htmlFor="invite-nickname" className="mb-2 block font-mono text-[10px] font-semibold uppercase tracking-[0.25em]" style={{ color: `${ink}80` }}>
              Seu nome
            </label>
            <input
              id="invite-nickname" type="text" value={nickname} onChange={(e) => setNickname(e.target.value)}
              placeholder="Como te chamam na festa?" maxLength={40}
              className="w-full rounded-xl border bg-white/70 px-4 py-3.5 text-base outline-none transition placeholder:text-[#2b241a]/35 focus:bg-white sm:text-[15px]"
              style={{ borderColor: `${ink}26`, color: ink }}
            />

            <label htmlFor="invite-email" className="mb-2 mt-4 block font-mono text-[10px] font-semibold uppercase tracking-[0.25em]" style={{ color: `${ink}80` }}>
              Email <span className="normal-case tracking-normal" style={{ color: `${ink}59` }}>(opcional, para avisar da revelação)</span>
            </label>
            <input
              id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email"
              placeholder="voce@email.com"
              className="w-full rounded-xl border bg-white/70 px-4 py-3.5 text-base outline-none transition placeholder:text-[#2b241a]/35 focus:bg-white sm:text-[15px]"
              style={{ borderColor: `${ink}26`, color: ink }}
            />

            {error && (
              <p role="alert" className="mt-3 rounded-xl px-4 py-2.5 text-sm" style={{ background: `${accent}1A`, color: accent }}>{error}</p>
            )}

            <button type="submit" disabled={joining}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-4 text-sm font-semibold text-[#f2ead9] transition hover:opacity-90 disabled:opacity-60"
              style={{ background: ink }}>
              {joining ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#f2ead9]/30 border-t-[#f2ead9]" />
                  Entrando…
                </>
              ) : (
                <>Entrar no filme <ArrowRight size={15} /></>
              )}
            </button>
          </form>
        )}

        {/* Prova social */}
        {guestCount > 0 && (
          <div className="mt-6 flex items-center justify-center gap-2.5">
            <span className="flex -space-x-2">
              {Array.from({ length: Math.min(3, guestCount) }).map((_, i) => (
                <span key={i}
                  className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#f2ead9] font-serif text-[10px] text-white"
                  style={{ background: [accent, ink, '#7EA4A0'][i] }}>
                  <Camera size={10} />
                </span>
              ))}
            </span>
            <span className="text-xs font-medium" style={{ color: `${ink}99` }}>
              +{guestCount} {guestCount === 1 ? 'pessoa já entrou' : 'pessoas já entraram'}
            </span>
          </div>
        )}

        {!isClosed && (
          <Link to={`/e/${slug}/album`}
            className="mt-4 inline-flex min-h-11 items-center gap-1 px-2 text-sm font-medium underline-offset-4 transition hover:underline"
            style={{ color: `${ink}99` }}>
            Ver álbum <ArrowRight size={13} />
          </Link>
        )}

        {isAuthenticated && (
          <p className="mt-5">
            <Link to="/dashboard" className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] underline-offset-4 hover:underline"
              style={{ color: accent }}>
              <LayoutDashboard size={11} /> Ver como organizador →
            </Link>
          </p>
        )}
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

  if (loading) return <PageLoader label="Carregando convite" />;
  if (notFound) return <NotFound />;

  const isClosed = event?.status === 'closed' || event?.status === 'revealed';

  if (event?.entryTemplate === 'convite') {
    return (
      <ConviteEntry
        event={event} stats={stats} slug={slug} isClosed={isClosed}
        isAuthenticated={isAuthenticated}
        nickname={nickname} setNickname={setNickname}
        email={email} setEmail={setEmail}
        error={error} joining={joining} handleJoin={handleJoin}
      />
    );
  }

  const accent = event?.themeColor || null;
  const cover = event?.coverImageUrl || null;
  const logo = event?.logoUrl || null;
  const welcome = event?.welcomeMessage || null;
  const accentBtn = accent
    ? { background: `linear-gradient(180deg, ${hexToRgba(accent, 1)} 0%, ${hexToRgba(accent, 0.82)} 100%)`, color: '#fff', boxShadow: `0 12px 32px -14px ${hexToRgba(accent, 0.6)}` }
    : undefined;

  return (
    <div className="app-screen relative flex flex-col items-center justify-center overflow-x-hidden bg-ink-deep px-4 py-8 sm:px-6 sm:py-10">
      {/* Capa personalizada do evento (fundo) */}
      {cover && (
        <div className="pointer-events-none absolute inset-0">
          <img src={cover} alt="" className="h-full w-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-b from-ink-deep/70 via-ink-deep/60 to-ink-deep/85" />
        </div>
      )}
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
          {logo ? (
            <img src={logo} alt={event?.name || 'logo'} className="h-14 w-14 rounded-full object-cover ring-2 ring-white/15" />
          ) : (
            <>
              <Brand to="/" />
            </>
          )}
        </div>

        {/* Organizador logado: deixa claro que esta é a tela do CONVIDADO */}
        {isAuthenticated && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
            <p className="text-xs leading-relaxed text-cream-dim">
              Esta é a tela que seus convidados veem. Você pode entrar para testar — ou gerenciar o evento no painel.
            </p>
            <Link to="/dashboard" className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-gold/25 bg-gold/[0.08] px-3 text-xs font-medium text-gold transition hover:border-gold/45">
              <LayoutDashboard size={12} />
              Painel
            </Link>
          </div>
        )}

        <div className="card p-5 sm:p-8">
          <div className="mb-7 text-center">
            <p className="label-mono mb-3">{TYPE_LABEL[event?.type] || 'Evento'}</p>
            <h1 className="break-words font-serif text-3xl font-semibold leading-tight tracking-tight text-cream sm:text-4xl">{event?.name}</h1>
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
            {welcome && (
              <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-cream/80">{welcome}</p>
            )}
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
                <label htmlFor="guest-nickname" className="mb-1.5 block text-sm font-medium text-cream-dim">Seu nome</label>
                <input id="guest-nickname" type="text" value={nickname} onChange={(e) => setNickname(e.target.value)}
                  placeholder="Como quer ser chamado?" className="input-field" maxLength={40} />
              </div>

              <div>
                <label htmlFor="guest-email" className="mb-1.5 block text-sm font-medium text-cream-dim">
                  Email <span className="font-normal text-cream-dim/60">(opcional)</span>
                </label>
                <input id="guest-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email"
                  placeholder="para ser avisado quando o álbum revelar" className="input-field" />
              </div>

              {error && (
                <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">{error}</p>
              )}

              <button type="submit" disabled={joining} style={accentBtn}
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
              <Link to={`/e/${slug}/album`} className="group flex min-h-11 items-center justify-center gap-1 text-sm text-cream-dim transition hover:text-cream">
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
