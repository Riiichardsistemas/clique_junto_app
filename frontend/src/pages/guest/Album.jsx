import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { X, ChevronLeft, ChevronRight, Download, Lock, Camera, LayoutDashboard, Share2, Sparkles } from 'lucide-react';
import { guestApi } from '../../api/guestApi';
import { photoApi } from '../../api/photoApi';
import { FILTER_DEFS } from '../../utils/filters';
import { useAuth } from '../../contexts/AuthContext.jsx';
import PageLoader from '../../components/ui/PageLoader';
import useLightboxNavigation from '../../hooks/useLightboxNavigation';
import LogoMark from '../../components/ui/LogoMark.jsx';

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
      <p className="label-mono mt-3 flex items-center justify-center gap-1.5 text-cream/25">
        <LogoMark className="h-3.5 w-3.5 shrink-0 opacity-70" />
        feito com Clique Junto
      </p>
    </div>
  );
}

function NotFound() {
  return (
    <div className="app-screen flex flex-col items-center justify-center bg-ink-deep px-6 text-center text-cream">
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
    <div className="app-screen relative flex flex-col items-center justify-center overflow-hidden bg-ink-deep px-6 text-center text-cream">
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
  const [stats, setStats] = useState({ guestCount: 0, photoCount: 0 });
  const [photos, setPhotos] = useState([]);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selected, setSelected] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [showBranding, setShowBranding] = useState(false);
  const [showRecap, setShowRecap] = useState(false);

  useLightboxNavigation(selected, setSelected, photos.length);

  const load = useCallback(async () => {
    try {
      const ed = await guestApi.getEvent(slug);
      setEvent(ed.event);
      if (ed.stats) setStats(ed.stats);
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

  if (loading) return <PageLoader label="Carregando álbum" />;
  if (notFound) return <NotFound />;
  if (!revealed) return <AlbumLocked event={event} slug={slug} isGuest={isGuest} isOrganizer={isAuthenticated} />;

  // Mesmo revelado, o convidado pode voltar à câmera enquanto o evento aceita fotos
  const canUseCamera = isGuest && !!event?.isAcceptingPhotos;

  const coverSrc = event?.coverImageUrl || photos[0]?.thumbUrl || photos[0]?.url || null;
  const endDate = event?.endsAt || event?.revealAt || event?.startsAt || null;
  const endDateLabel = endDate
    ? new Date(endDate).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace(' de ', ' ')
    : '—';
  const peopleCount = stats.guestCount || new Set(photos.map((p) => p.guestNickname).filter(Boolean)).size;

  async function shareAlbum() {
    const url = `${window.location.origin}/e/${slug}/album`;
    const text = `✨ O álbum de "${event?.name}" foi revelado! Veja as fotos: ${url}`;
    if (navigator.share) {
      try { await navigator.share({ title: event?.name, text, url }); } catch { /* cancelado */ }
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Link do álbum copiado!');
    }
  }

  return (
    <div className="app-screen bg-ink-deep text-cream">
      {/* ===== Hero — capa do evento fundindo com o fundo (mockup) ===== */}
      <div className="relative">
        <div className="relative h-[38vh] min-h-[260px] w-full overflow-hidden sm:h-[380px]">
          {coverSrc ? (
            <img src={coverSrc} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-[#26221c] via-[#171512] to-ink-deep" />
          )}
          {/* Fusão da foto com o fundo escuro */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-ink-deep" />
        </div>

        {/* Botão de voltar flutuante sobre a capa */}
        {(canUseCamera || isAuthenticated) && (
          <Link to={canUseCamera ? `/e/${slug}/camera` : '/dashboard'}
            aria-label={canUseCamera ? 'Voltar à câmera' : 'Voltar ao painel'}
            className="safe-fixed-top absolute left-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white/85 backdrop-blur-md transition hover:text-white">
            {canUseCamera ? <Camera size={17} /> : <LayoutDashboard size={17} />}
          </Link>
        )}
      </div>

      {/* ===== Título + stats + ações (mockup) ===== */}
      <section className="relative z-10 mx-auto -mt-20 max-w-xl px-5 text-center sm:-mt-24">
        <h1 className="font-serif text-4xl font-semibold tracking-tight [text-shadow:0_2px_16px_rgba(0,0,0,.8)] sm:text-5xl">
          {event?.name}
        </h1>

        {/* Linha de stats: Momentos · data Encerrado · Pessoas */}
        <div className="mx-auto mt-6 flex max-w-sm items-stretch divide-x divide-white/10">
          <div className="flex-1 px-2">
            <p className="text-[17px] font-semibold leading-tight text-cream">{photos.length}</p>
            <p className="mt-0.5 text-[11px] text-cream/40">Momentos</p>
          </div>
          <div className="flex-1 px-2">
            <p className="text-[17px] font-semibold leading-tight text-cream">{endDateLabel}</p>
            <p className="mt-0.5 text-[11px] text-cream/40">{event?.isAcceptingPhotos ? 'Em andamento' : 'Encerrado'}</p>
          </div>
          <div className="flex-1 px-2">
            <p className="text-[17px] font-semibold leading-tight text-cream">{peopleCount}</p>
            <p className="mt-0.5 text-[11px] text-cream/40">Pessoas</p>
          </div>
        </div>

        {/* Ver retrospectiva — só quando o recap existe */}
        {event?.recapVideoUrl && (
          <button type="button" onClick={() => setShowRecap(true)}
            className="btn-primary mt-6 w-full rounded-full py-3.5 text-[15px]">
            <Sparkles size={16} />
            Ver retrospectiva
          </button>
        )}

        {/* Compartilhar · Salvar */}
        {photos.length > 0 && (
          <div className={`flex gap-2.5 ${event?.recapVideoUrl ? 'mt-3' : 'mt-6'}`}>
            <button type="button" onClick={shareAlbum} className="btn-ghost h-12 min-h-12 flex-1 rounded-full text-[14px]">
              <Share2 size={16} />
              Compartilhar
            </button>
            <button type="button" onClick={downloadAll} disabled={downloading} className="btn-ghost h-12 min-h-12 flex-1 rounded-full text-[14px] disabled:opacity-40">
              <Download size={16} />
              {downloading ? 'Preparando…' : 'Salvar'}
            </button>
          </div>
        )}
      </section>

      {/* Overlay da retrospectiva */}
      {showRecap && event?.recapVideoUrl && (
        <div className="fixed inset-0 z-50 flex animate-fadein items-center justify-center bg-black/95 p-4 backdrop-blur-sm"
          role="dialog" aria-modal="true" aria-label="Retrospectiva do evento" onClick={() => setShowRecap(false)}>
          <button type="button" aria-label="Fechar retrospectiva"
            className="safe-fixed-top icon-button absolute right-4 border-white/10 bg-white/[0.06] text-white/60 hover:text-white"
            onClick={() => setShowRecap(false)}>
            <X size={17} />
          </button>
          <video src={event.recapVideoUrl} controls autoPlay playsInline
            className="max-h-[80dvh] w-full max-w-3xl rounded-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

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
        <div className="fixed inset-0 z-50 flex animate-fadein items-center justify-center bg-black/95 backdrop-blur-sm"
          role="dialog" aria-modal="true" aria-label={`Foto ${selected + 1} de ${photos.length}`} onClick={() => setSelected(null)}>
          <button type="button" aria-label="Fechar foto" className="safe-fixed-top icon-button absolute right-4 border-white/10 bg-white/[0.06] text-white/60 hover:text-white sm:right-5"
            onClick={() => setSelected(null)}><X size={17} /></button>
          <button type="button" aria-label="Foto anterior" disabled={selected === 0}
            className="icon-button absolute left-3 top-1/2 -translate-y-1/2 border-white/10 bg-white/[0.06] text-white/50 hover:text-white disabled:opacity-25"
            onClick={(e) => { e.stopPropagation(); setSelected((s) => Math.max(0, s - 1)); }}><ChevronLeft size={19} /></button>
          {photos[selected]?.mediaType === 'video' ? (
            <video src={photos[selected]?.url} autoPlay loop controls playsInline
              style={{ filter: videoFilterCss(photos[selected]) }}
              className="lightbox-media max-w-[92vw] rounded-2xl object-contain"
              onClick={(e) => e.stopPropagation()} />
          ) : (
            <img src={photos[selected]?.url} alt="Foto" className="lightbox-media max-w-[92vw] rounded-2xl object-contain"
              onClick={(e) => e.stopPropagation()} />
          )}
          <button type="button" aria-label="Próxima foto" disabled={selected === photos.length - 1}
            className="icon-button absolute right-3 top-1/2 -translate-y-1/2 border-white/10 bg-white/[0.06] text-white/50 hover:text-white disabled:opacity-25"
            onClick={(e) => { e.stopPropagation(); setSelected((s) => Math.min(photos.length - 1, s + 1)); }}><ChevronRight size={19} /></button>
          <div className="safe-fixed-bottom absolute left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/10 bg-black/60 px-4 py-2 backdrop-blur-md">
            <p className="film-counter">
              {selected + 1} / {photos.length}
              {photos[selected]?.guestNickname && <span className="text-white/50"> · por {photos[selected].guestNickname}</span>}
            </p>
            <span className="h-3 w-px bg-white/15" />
            <button type="button" onClick={(e) => { e.stopPropagation(); downloadOne(photos[selected], selected); }}
              className="inline-flex items-center gap-1 font-mono text-xs tracking-widest text-white/70 transition hover:text-white">
              <Download size={12} /> baixar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
