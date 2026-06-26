import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { guestApi } from '../../api/guestApi';
import { photoApi } from '../../api/photoApi';

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
      <p className="font-serif text-3xl mb-3">Álbum não encontrado</p>
      <p className="text-sm text-white/40">O link pode estar errado.</p>
    </div>
  );
}

function AlbumLocked({ event }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const revealAt = event?.revealAt ? new Date(event.revealAt).getTime() : null;
  const diff     = revealAt ? Math.max(0, revealAt - now) : null;
  const hrs  = diff !== null ? Math.floor(diff / 3600000) : null;
  const mins = diff !== null ? Math.floor((diff % 3600000) / 60000) : null;
  const secs = diff !== null ? Math.floor((diff % 60000) / 1000) : null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black text-cream px-6 text-center">
      {/* Blurred silhouettes */}
      <div className="relative mb-10 flex gap-2">
        {[1,2,3,4,5].map((i) => (
          <div
            key={i}
            className="h-24 w-16 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm animate-pulse-slow"
            style={{ animationDelay: `${i * 0.18}s` }}
          />
        ))}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
      </div>

      <p className="mb-2 text-xs uppercase tracking-[0.25em] text-white/30">Revelação</p>
      <h2 className="font-serif text-3xl">Fotos ainda guardadas</h2>
      <p className="mt-3 text-sm text-white/40 max-w-xs">
        Como uma câmera descartável, as fotos serão reveladas após o evento.
      </p>

      {diff !== null && diff > 0 && (
        <div className="mt-8 flex gap-4">
          {[{ v: hrs, l: 'h' }, { v: mins, l: 'm' }, { v: secs, l: 's' }].map(({ v, l }) => (
            <div key={l} className="flex flex-col items-center rounded-2xl border border-white/10 bg-white/5 px-5 py-3 min-w-[56px]">
              <span className="font-mono text-2xl font-bold">{String(v).padStart(2,'0')}</span>
              <span className="text-xs text-white/30 mt-0.5">{l}</span>
            </div>
          ))}
        </div>
      )}

      <Link to={`/e/${event?.slug}/camera`} className="mt-10 btn-ghost rounded-2xl px-6 py-3 text-sm">
        ← Voltar para câmera
      </Link>
    </div>
  );
}

function FilmStrip({ photos, onSelect }) {
  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1 px-1">
        {photos.map((p, i) => (
          <button
            key={p.id}
            onClick={() => onSelect(i)}
            className="group relative flex-shrink-0 overflow-hidden rounded-lg"
            style={{ width: 72, height: 96 }}
          >
            <img
              src={p.url}
              alt={`Foto ${i + 1}`}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/20" />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Album() {
  const { slug } = useParams();

  const [event,    setEvent]    = useState(null);
  const [photos,   setPhotos]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selected, setSelected] = useState(null); // lightbox index

  useEffect(() => {
    guestApi.getEvent(slug)
      .then((ed) => {
        setEvent(ed.event);
        return photoApi.listForEvent(ed.event.id);
      })
      .then((pd) => {
        setPhotos(pd.photos || []);
      .catch((e) => {
        if (e?.response?.status === 404) setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading)  return <Loader />;
  if (notFound) return <NotFound />;

  const isRevealed = event?.status === 'revealed' || (photos.length > 0 && photos[0].isVisible);
  if (!isRevealed) return <AlbumLocked event={event} />;

  return (
    <div className="min-h-screen bg-black text-cream">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-white/8 bg-black/90 backdrop-blur-md">
        <div className="flex items-center justify-between px-5 py-4">
          <Link to={`/e/${slug}/camera`} className="text-sm text-white/40 hover:text-white/70 transition">
            ← Câmera
          </Link>
          <span className="font-serif text-base">{event?.name}</span>
          <span className="film-counter">{photos.length} fotos</span>
        </div>
      </header>

      <main className="px-4 py-6">
        {photos.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <p className="font-serif text-2xl text-white/40">Nenhuma foto ainda</p>
            <p className="mt-2 text-sm text-white/25">Seja o primeiro a fotografar!</p>
          </div>
        ) : (
          <>
            {/* Film strip preview */}
            <div className="mb-5">
              <FilmStrip photos={photos} onSelect={setSelected} />
            </div>

            {/* Grid */}
            <div className="columns-2 gap-2 sm:columns-3">
              {photos.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => setSelected(i)}
                  className="group mb-2 block w-full overflow-hidden rounded-2xl"
                >
                  <img
                    src={p.url}
                    alt={`Foto ${i + 1}`}
                    className="w-full transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Lightbox */}
      {selected !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
          onClick={() => setSelected(null)}
        >
          <button
            className="absolute right-5 top-5 text-white/50 hover:text-white/90 text-2xl"
            onClick={() => setSelected(null)}
          >✕</button>
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 text-3xl px-2"
            onClick={(e) => { e.stopPropagation(); setSelected((s) => Math.max(0, s - 1)); }}
          >‹</button>
          <img
            src={photos[selected]?.url}
            alt="Foto"
            className="max-h-[92vh] max-w-[92vw] rounded-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 text-3xl px-2"
            onClick={(e) => { e.stopPropagation(); setSelected((s) => Math.min(photos.length - 1, s + 1)); }}
          >›</button>
          <p className="absolute bottom-5 left-1/2 -translate-x-1/2 film-counter">
            {selected + 1} / {photos.length}
          </p>
        </div>
      )}
    </div>
  );
}
