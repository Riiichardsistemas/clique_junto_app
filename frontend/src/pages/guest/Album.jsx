import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { guestApi } from '../../api/guestApi';
import { photoApi } from '../../api/photoApi';
import { FILTER_DEFS } from '../../utils/filters';

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
      <p className="label-mono mt-3 text-cream/25">feito com Era Uma Vez</p>
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

function AlbumLocked({ event, slug }) {
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
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="rgba(201,168,106,0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
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
          <Link to={`/e/${slug}/camera`} className="btn-ghost rounded-2xl px-6 py-3 text-sm">
            ← Câmera
          </Link>
          <Link to="/albuns" className="btn-ghost rounded-2xl px-6 py-3 text-sm">
            Meus álbuns
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function Album() {
  const { slug } = useParams();

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
  if (!revealed) return <AlbumLocked event={event} slug={slug} />;

  return (
    <div className="min-h-screen bg-ink-deep text-cream">
      <header className="sticky top-0 z-10 border-b border-cream/[0.06] bg-ink-deep/90 backdrop-blur-md">
        <div className="flex items-center justify-between px-5 py-4">
          <Link to={`/e/${slug}/camera`} className="text-sm text-cream/40 transition hover:text-cream/70">← Câmera</Link>
          <div className="text-center">
            <p className="font-serif text-base leading-none">{event?.name}</p>
            <p className="label-mono mt-1 text-gold/70">
              {photos.length} {photos.some((p) => p.mediaType === 'video') ? 'memórias' : 'fotos'} · revelado
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/albuns"
              className="rounded-xl border border-cream/15 px-3 py-1.5 text-xs text-cream/70 transition hover:text-cream">
              Álbuns
            </Link>
            {photos.length > 0 && (
              <button onClick={downloadAll} disabled={downloading}
                className="rounded-xl border border-cream/15 px-3 py-1.5 text-xs text-cream/70 transition hover:text-cream disabled:opacity-50">
                {downloading ? '…' : 'Baixar'}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="px-4 py-6">
        {photos.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <p className="font-serif text-2xl text-cream/40">Nenhuma foto ainda</p>
            <p className="mt-2 text-sm text-cream/25">O álbum foi revelado, mas ninguém fotografou.</p>
          </div>
        ) : (
          <>
            <p className="label-mono mb-4 text-cream/30">{photos.length} frames</p>
            <div className="columns-2 gap-2 sm:columns-3 lg:columns-4">
              {photos.map((p, i) => (
                <button key={p.id} onClick={() => setSelected(i)}
                  className="group relative mb-2 block w-full overflow-hidden rounded-xl border border-cream/[0.06]">
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
                    <span className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-ink/80 to-transparent px-2.5 pb-1.5 pt-5 text-left text-[11px] text-cream/70 opacity-0 transition-opacity group-hover:opacity-100">
                      por {p.guestNickname}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        {showBranding && photos.length > 0 && <GrowthCTA slug={slug} />}
      </main>

      {/* Lightbox */}
      {selected !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-deep/95" onClick={() => setSelected(null)}>
          <button className="absolute right-5 top-5 text-2xl text-cream/50 hover:text-cream/90" onClick={() => setSelected(null)}>✕</button>
          <button className="absolute left-3 top-1/2 -translate-y-1/2 px-2 text-3xl text-cream/40 hover:text-cream/80"
            onClick={(e) => { e.stopPropagation(); setSelected((s) => Math.max(0, s - 1)); }}>‹</button>
          {photos[selected]?.mediaType === 'video' ? (
            <video src={photos[selected]?.url} autoPlay loop controls playsInline
              style={{ filter: videoFilterCss(photos[selected]) }}
              className="max-h-[88vh] max-w-[92vw] rounded-2xl object-contain"
              onClick={(e) => e.stopPropagation()} />
          ) : (
            <img src={photos[selected]?.url} alt="Foto" className="max-h-[88vh] max-w-[92vw] rounded-2xl object-contain"
              onClick={(e) => e.stopPropagation()} />
          )}
          <button className="absolute right-3 top-1/2 -translate-y-1/2 px-2 text-3xl text-cream/40 hover:text-cream/80"
            onClick={(e) => { e.stopPropagation(); setSelected((s) => Math.min(photos.length - 1, s + 1)); }}>›</button>
          <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-4">
            <p className="film-counter">
              {selected + 1} / {photos.length}
              {photos[selected]?.guestNickname && <span className="text-cream/50"> · por {photos[selected].guestNickname}</span>}
            </p>
            <button onClick={(e) => { e.stopPropagation(); downloadOne(photos[selected], selected); }}
              className="film-counter text-gold/80 hover:text-gold">baixar ↓</button>
          </div>
        </div>
      )}
    </div>
  );
}
