import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight, Download, X, Camera } from 'lucide-react';
import { eventApi } from '../../api/eventApi';

function extFromUrl(url, mediaType) {
  const m = String(url).split('?')[0].match(/\.(\w{2,5})$/);
  if (m) return `.${m[1].toLowerCase()}`;
  return mediaType === 'video' ? '.webm' : '.jpg';
}

function Loader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-deep">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-cream/15 border-t-cream/60" />
    </div>
  );
}

export default function EventAlbum() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async () => {
    try {
      const [ed, pd] = await Promise.all([
        eventApi.getOne(id),
        eventApi.listPhotos(id),
      ]);
      setEvent(ed.event);
      setPhotos(pd.photos || []);
    } catch {
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  async function downloadOne(photo, index) {
    const res = await fetch(photo.url);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event?.slug || id}-${String(index + 1).padStart(3, '0')}${extFromUrl(photo.url, photo.mediaType)}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function downloadAll() {
    setDownloading(true);
    const t = toast.loading('Preparando download…');
    try {
      const blob = await eventApi.downloadZip(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${event?.slug || id}-fotos.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Download iniciado!', { id: t });
    } catch {
      // fallback: download individual
      try {
        for (let i = 0; i < photos.length; i++) {
          await downloadOne(photos[i], i);
          await new Promise((r) => setTimeout(r, 250));
        }
        toast.success('Download concluído!', { id: t });
      } catch {
        toast.error('Erro ao baixar.', { id: t });
      }
    } finally {
      setDownloading(false);
    }
  }

  if (loading) return <Loader />;

  const statusLabel = { draft: 'Rascunho', active: 'Ativo', closed: 'Encerrado', revealed: 'Revelado' };

  return (
    <div className="min-h-screen bg-ink-deep text-cream">
      {/* Header — barra fina com voltar e chip de ID, como no print */}
      <header className="sticky top-0 z-10 glass">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <Link
            to={`/events/${id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-[13px] text-cream-dim transition hover:text-cream"
          >
            <ChevronLeft size={15} />
            Dashboard
          </Link>

          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 font-mono text-[11px] tracking-wider text-cream-dim">
            ID {String(event?.id || id).slice(0, 8)}
          </span>
        </div>
      </header>

      {/* Hero — título serifado centralizado + contagem de frames + Download Tudo */}
      <section className="relative mx-auto max-w-6xl px-4 pb-2 pt-7 text-center sm:px-5 sm:pt-10">
        <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
          {event?.name}
        </h1>
        <p className="mt-2 text-sm text-cream-dim sm:mt-3">
          {photos.length} frames
          {event?.status && ` · ${statusLabel[event.status] || event.status}`}
        </p>
        {photos.length > 0 && (
          <div className="mt-4 flex justify-center sm:mt-6 md:absolute md:right-5 md:top-10 md:mt-0">
            <button onClick={downloadAll} disabled={downloading} className="btn-ghost btn-sm gap-2">
              <Download size={14} />
              {downloading ? 'Preparando…' : 'Download Tudo'}
            </button>
          </div>
        )}
      </section>

      {/* Body */}
      <main className="mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-8">
        {photos.length === 0 ? (
          <div className="flex flex-col items-center py-24 text-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-cream/10 bg-cream/[0.04] text-cream/30">
              <Camera size={28} strokeWidth={1.4} />
            </div>
            <p className="font-serif text-2xl text-cream/40">Nenhuma foto ainda</p>
            <p className="mt-2 text-sm text-cream/25">
              {event?.status === 'draft'
                ? 'Publique o evento para que os convidados possam enviar fotos.'
                : 'As fotos dos convidados aparecerão aqui.'}
            </p>
            {event?.status === 'draft' && (
              <Link to={`/events/${id}`} className="btn-primary mt-6 inline-flex items-center gap-1.5 rounded-2xl px-6 py-3 text-sm">
                Ir para o dashboard
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="columns-2 gap-2.5 sm:columns-3 lg:columns-4">
              {photos.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => setSelected(i)}
                  className="group relative mb-2.5 block w-full overflow-hidden rounded-xl border border-line/60 transition-all duration-250 hover:border-gold/40"
                >
                  {p.mediaType === 'video' ? (
                    <>
                      <video
                        src={p.url}
                        muted
                        playsInline
                        preload="metadata"
                        className="w-full transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink/60 backdrop-blur-sm">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="rgba(245,240,230,0.9)">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </span>
                      </span>
                      {p.durationSeconds && (
                        <span className="pointer-events-none absolute bottom-2 right-2 rounded-md bg-ink/70 px-1.5 py-0.5 font-mono text-[10px] text-cream/80">
                          {Math.round(p.durationSeconds)}s
                        </span>
                      )}
                    </>
                  ) : (
                    <img
                      src={p.thumbUrl || p.url}
                      alt={`Foto ${i + 1}`}
                      loading="lazy"
                      className="w-full transition-transform duration-300 group-hover:scale-[1.03]"
                    />
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
      </main>

      {/* Lightbox */}
      {selected !== null && (
        <div
          className="fixed inset-0 z-50 flex animate-fadein items-center justify-center bg-black/95 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <button
            className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/60 transition hover:bg-white/10 hover:text-white"
            onClick={() => setSelected(null)}
          >
            <X size={17} />
          </button>
          <button
            className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/50 transition hover:bg-white/10 hover:text-white"
            onClick={(e) => { e.stopPropagation(); setSelected((s) => Math.max(0, s - 1)); }}
          >
            <ChevronLeft size={19} />
          </button>

          {photos[selected]?.mediaType === 'video' ? (
            <video
              src={photos[selected]?.url}
              autoPlay
              loop
              controls
              playsInline
              className="max-h-[88vh] max-w-[92vw] rounded-2xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img
              src={photos[selected]?.url}
              alt="Foto"
              className="max-h-[88vh] max-w-[92vw] rounded-2xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          )}

          <button
            className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/50 transition hover:bg-white/10 hover:text-white"
            onClick={(e) => { e.stopPropagation(); setSelected((s) => Math.min(photos.length - 1, s + 1)); }}
          >
            <ChevronRight size={19} />
          </button>

          <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/10 bg-black/60 px-4 py-2 backdrop-blur-md">
            <p className="film-counter">
              {selected + 1} / {photos.length}
              {photos[selected]?.guestNickname && (
                <span className="text-white/50"> · por {photos[selected].guestNickname}</span>
              )}
            </p>
            <span className="h-3 w-px bg-white/15" />
            <button
              onClick={(e) => { e.stopPropagation(); downloadOne(photos[selected], selected); }}
              className="inline-flex items-center gap-1 font-mono text-xs tracking-widest text-white/70 transition hover:text-white"
            >
              <Download size={12} /> baixar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
