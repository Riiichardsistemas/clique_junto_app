import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { X, ChevronLeft, ChevronRight, Download, Lock, Camera, LayoutDashboard } from 'lucide-react';
import { guestApi } from '../../api/guestApi';
import { photoApi } from '../../api/photoApi';
import { FILTER_DEFS } from '../../utils/filters';
import { useAuth } from '../../contexts/AuthContext.jsx';

// Vídeos têm o filtro aplicado via CSS na exibição
function videoFilterCss(p) {
  return FILTER_DEFS[p.filter]?.cssFilter || 'none';
}

function extFromUrl(url, mediaType) {
  const m = String(url).split('?')[0].match(/\.(\w{2,5})$/);
  if (m) return `.${m[1].toLowerCase()}`;
  return mediaType === 'video' ? '.webm' : '.jpg';
}

// CTA de crescimento — exibido apenas no plano gratuito
function GrowthCTA({ slug }) {
  return (
    <div className="mx-auto mt-10 max-w-md rounded-3xl border border-gold/20 bg-gold/[0.06] p-6 text-center">
      <p className="font-serif text-xl text-cream">Gostou desse álbum?</p>
      <p className="mt-2 text-sm text-cream/50">
        Crie a sua câmera descartável digital em minutos — grátis, sem app.
      </p>
      <Link to={`/register?utm_source=album&utm_medium=cta&utm_campaign=${slug}`}
        className="btn-primary mt-4 inline-block rounded-2xl px-8 py-3 text-sm">
        Criar meu evento grátis
      </Link>
      <p className="label-mono mt-3 text-cream/25">feito com Clique Junto</p>
    </div>
  );
}

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
      <p className="mb-3 font-serif text-3xl">Álbum não encontrado</p>
      <p className="text-sm text-cream/40">O link pode estar errado.</p>
    </div>
  );
}

function AlbumLocked({ event, slug, isGuest, isOrganizer }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const revealAt = event?.revealAt ? new Date(event.revealAt).getTime() : null;
  const diff = revealAt ? Math.max(0, revealAt - now) : null;
  const hrs = diff !== null ? Math.floor(diff / 3600000) : null;
  const mins = diff !== null ? Math.floor((diff % 3600000) / 60000) : null;
  const secs = diff !== null ? Math.floor((diff % 60000) / 1000) : null;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-ink-deep px-6 text-center text-cream">
      <div className="film-grain pointer-events-none absolute inset-0 opacity-20" />

      <div className="relative z-10 w-full max-w-sm animate-slideup">
        {/* Silhuetas borradas */}
        <div className="relative mb-10 flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i}
              className="h-24 w-16 animate-pulse-slow rounded-xl border border-cream/10 bg-cream/[0.05]"
              style={{ animationDelay: `${i * 0.18}s` }} />
          ))}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-black/50 backdrop-blur-md">
              <Lock size={20} className="text-white/80" strokeWidth={1.6} />
            </span>
          </div>
        </div>

        <p className="label-mono mb-3 text-gold/80">Álbum em revelação</p>
        <h2 className="font-serif text-3xl">{event?.name}</h2>
        <p className="mx-auto mt-3 max-w-xs text-sm text-cream/45">
          Suas memórias estão sendo guardadas. O álbum se revela no momento certo.
        </p>

        {diff !== null && diff > 0 && (
          <>
            <p className="label-mono mt-9 text-cream/35">Revela em</p>
            <div className="mt-3 flex justify-center gap-3">
              {[{ v: hrs, l: 'hrs' }, { v: mins, l: 'min' }, { v: secs, l: 'seg' }].map(({ v, l }) => (
                <div key={l} className="flex min-w-[64px] flex-col items-center rounded-2xl border border-cream/10 bg-cream/[0.04] px-4 py-3">
                  <span className="font-mono text-2xl font-semibold text-cream">{String(v).padStart(2, '0')}</span>
                  <span className="label-mono mt-1 text-cream/35">{l}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <p className="mt-8 text-xs text-cream/30">Atualiza automaticamente a cada 30s</p>

        <div className="mt-6 flex justify-center gap-3">
          {isGuest && (
            <Link to={`/e/${slug}/camera`} className="btn-ghost rounded-2xl px-6 py-3 text-sm">
              <Camera size={15} />
              Voltar à câmera
            </Link>
          )}
          {isOrganizer && (
            <Link to="/dashboard" className="btn-ghost rounded-2xl px-6 py-3 text-sm">
              <LayoutDashboard size={15} />
              Ir para o painel
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Album() {
  const { slug } = useParams();
  const { isAuthenticated } = useAuth();
  // Convidado = tem token de participação neste evento (pode ser o dono testando)
  const isGuest = !!guestApi.getGuestToken(slug);

  const [event, setEvent] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selected, setSelected] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [showBranding, setShowBranding] = useState(false);

  const load = useCallback(async () => {
    try {
      const ed = await guestApi.getEvent(slug);
      setEvent(ed.event);
      const pd = await photoApi.listForEvent(ed.event.id);
      setRevealed(!!pd.revealed || !!ed.event.isRevealed);
      setPhotos(pd.photos || []);
      setShowBranding(!!pd.showBranding || !!ed.event.showBranding);
    } catch (e) {
      if (e?.response?.status === 404) setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh a cada 30s enquanto não revelado
  useEffect(() => {
    if (revealed || notFound) return;
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [revealed, notFound, load]);

  async function downloadOne(photo, index) {
    const res = await fetch(photo.url);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}-${String(index + 1).padStart(3, '0')}${extFromUrl(photo.url, photo.mediaType)}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function downloadAll() {
    setDownloading(true);
    const t = toast.loading('Preparando download…');
    try {
      for (let i = 0; i < photos.length; i++) {
        await downloadOne(photos[i], i);
        await new Promise((r) => setTimeout(r, 250));
      }
      toast.success('Download concluído!', { id: t });
    } catch {
      toast.error('Erro ao baixar.', { id: t });
    } finally {
      setDownloading(false);
    }
  }

  if (loading) return <Loader />;
  if (notFound) return <NotFound />;
  if (!revealed) return <AlbumLocked event={event} slug={slug} isGuest={isGuest} isOrganizer={isAuthenticated} />;

  const canUseCamera = isGuest && event?.status === 'active';

  return (
    <div className="min-h-screen bg-ink-deep text-cream">
      {/* Header — barra fina, como no print */}
      <header className="sticky top-0 z-10 glass">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          {canUseCamera ? (
            <Link to={`/e/${slug}/camera`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-[13px] text-cream-dim transition hover:text-cream">
              <ChevronLeft size={15} />
              Câmera
            </Link>
          ) : isAuthenticated ? (
            <Link to="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-[13px] text-cream-dim transition hover:text-cream">
              <ChevronLeft size={15} />
              Painel
            </Link>
          ) : (
            <span className="w-16" />
          )}
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 font-mono text-[11px] tracking-wider text-cream-dim">
            revelado
          </span>
        </div>
      </header>

      {/* Hero — título serifado centralizado + frames + Download Tudo */}
      <section className="relative mx-auto max-w-6xl px-4 pb-2 pt-7 text-center sm:px-5 sm:pt-10">
        <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">{event?.name}</h1>
        <p className="mt-2 text-sm text-cream-dim sm:mt-3">{photos.length} frames</p>
        {photos.length > 0 && (
          <div className="mt-4 flex justify-center sm:mt-6 md:absolute md:right-5 md:top-10 md:mt-0">
            <button onClick={downloadAll} disabled={downloading} className="btn-ghost btn-sm gap-2">
              <Download size={14} />
              {downloading ? 'Preparando…' : 'Download Tudo'}
            </button>
          </div>
        )}
      </section>

      <main className="mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-8">
        {photos.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <p className="font-serif text-2xl text-cream/40">Nenhuma foto ainda</p>
            <p className="mt-2 text-sm text-cream/25">O álbum foi revelado, mas ninguém fotografou.</p>
          </div>
        ) : (
          <>
            <div className="columns-2 gap-2.5 sm:columns-3 lg:columns-4">
              {photos.map((p, i) => (
                <button key={p.id} onClick={() => setSelected(i)}
                  className="group relative mb-2.5 block w-full overflow-hidden rounded-xl border border-line/60 transition-all duration-250 hover:border-gold/40">
                  {p.mediaType === 'video' ? (
                    <>
                      <video src={p.url} muted playsInline preload="metadata"
                        style={{ filter: videoFilterCss(p) }}
                        className="w-full transition-transform duration-300 group-hover:scale-[1.03]" />
                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink/60 backdrop-blur-sm">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="rgba(245,240,230,0.9)"><path d="M8 5v14l11-7z" /></svg>
                        </span>
                      </span>
                      {p.durationSeconds && (
                        <span className="pointer-events-none absolute bottom-2 right-2 rounded-md bg-ink/70 px-1.5 py-0.5 font-mono text-[10px] text-cream/80">
                          {Math.round(p.durationSeconds)}s
                        </span>
                      )}
                    </>
                  ) : (
                    <img src={p.thumbUrl || p.url} alt={`Foto ${i + 1}`} loading="lazy"
                      className="w-full transition-transform duration-300 group-hover:scale-[1.03]" />
                  )}
                  {p.guestNickname && (
                    <span className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 pb-2 pt-8 text-left">
                      <span className="block text-[12px] font-medium leading-tight text-cream/95">{p.guestNickname}</span>
                      <span className="block text-[10.5px] text-cream/55">por {p.guestNickname.split(' ')[0]}</span>
                    </span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        {/* CTA de crescimento — só para visitantes sem conta (nunca para o organizador logado) */}
        {showBranding && photos.length > 0 && !isAuthenticated && <GrowthCTA slug={slug} />}
      </main>

      {/* Lightbox */}
      {selected !== null && (
        <div className="fixed inset-0 z-50 flex animate-fadein items-center justify-center bg-black/95 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <button className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/60 transition hover:bg-white/10 hover:text-white"
            onClick={() => setSelected(null)}><X size={17} /></button>
          <button className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/50 transition hover:bg-white/10 hover:text-white"
            onClick={(e) => { e.stopPropagation(); setSelected((s) => Math.max(0, s - 1)); }}><ChevronLeft size={19} /></button>
          {photos[selected]?.mediaType === 'video' ? (
            <video src={photos[selected]?.url} autoPlay loop controls playsInline
              style={{ filter: videoFilterCss(photos[selected]) }}
              className="max-h-[88vh] max-w-[92vw] rounded-2xl object-contain"
              onClick={(e) => e.stopPropagation()} />
          ) : (
            <img src={photos[selected]?.url} alt="Foto" className="max-h-[88vh] max-w-[92vw] rounded-2xl object-contain"
              onClick={(e) => e.stopPropagation()} />
          )}
          <button className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/50 transition hover:bg-white/10 hover:text-white"
            onClick={(e) => { e.stopPropagation(); setSelected((s) => Math.min(photos.length - 1, s + 1)); }}><ChevronRight size={19} /></button>
          <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/10 bg-black/60 px-4 py-2 backdrop-blur-md">
            <p className="film-counter">
              {selected + 1} / {photos.length}
              {photos[selected]?.guestNickname && <span className="text-white/50"> · por {photos[selected].guestNickname}</span>}
            </p>
            <span className="h-3 w-px bg-white/15" />
            <button onClick={(e) => { e.stopPropagation(); downloadOne(photos[selected], selected); }}
              className="inline-flex items-center gap-1 font-mono text-xs tracking-widest text-white/70 transition hover:text-white">
              <Download size={12} /> baixar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
