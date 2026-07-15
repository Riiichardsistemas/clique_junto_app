import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { guestApi } from '../../api/guestApi';

const ADVANCE_MS = 5500;   // tempo de cada foto
const POLL_MS = 8000;      // busca novas fotos

function hexToRgba(hex, a = 1) {
  if (!hex) return `rgba(196,169,108,${a})`;
  const m = hex.replace('#', '');
  const n = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

export default function Telao() {
  const { key } = useParams();
  const [data, setData] = useState(null);   // { mode, event, photos, total }
  const [idx, setIdx] = useState(0);
  const [error, setError] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const lastTopId = useRef(null);
  const photosRef = useRef([]);

  const fetchData = useCallback(async () => {
    try {
      const d = await guestApi.slideshow(key);
      setData(d);
      photosRef.current = d.photos || [];
      const topId = d.photos?.[0]?.id || null;
      // Nova foto detectada em modo ao vivo → mostra a mais recente já
      if (topId && lastTopId.current && topId !== lastTopId.current && d.mode === 'live') {
        setIdx(0);
        setIsNew(true);
        setTimeout(() => setIsNew(false), 4000);
      }
      lastTopId.current = topId;
    } catch (e) {
      if (e?.response?.status === 404) setError('Telão não encontrado. Verifique o link.');
    }
  }, [key]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const id = setInterval(fetchData, POLL_MS);
    return () => clearInterval(id);
  }, [fetchData]);

  // Auto-avanço
  useEffect(() => {
    const id = setInterval(() => {
      const len = photosRef.current.length;
      if (len > 0) setIdx((i) => (i + 1) % len);
    }, ADVANCE_MS);
    return () => clearInterval(id);
  }, []);

  const accent = data?.event?.themeColor || '#C4A96C';
  const brandStyle = { '--accent': accent };

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-6 text-center text-cream">
        <p className="text-lg text-cream-dim">{error}</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-white/60" />
      </div>
    );
  }

  const { event, photos, mode } = data;
  const cover = event?.coverImageUrl;

  // Estados sem fotos
  const waiting = mode === 'waiting';
  const empty = !photos || photos.length === 0;

  const photo = !empty ? photos[idx % photos.length] : null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-cream" style={brandStyle}>
      {/* Fundo: foto atual desfocada ou capa do evento */}
      <div className="absolute inset-0">
        {photo ? (
          <img key={`bg-${photo.id}`} src={photo.url} alt=""
            className="h-full w-full scale-110 object-cover opacity-40 blur-2xl transition-opacity duration-1000" />
        ) : cover ? (
          <img src={cover} alt="" className="h-full w-full object-cover opacity-30 blur-xl" />
        ) : null}
        <div className="absolute inset-0" style={{ background: `radial-gradient(120% 90% at 50% 40%, transparent 30%, rgba(0,0,0,0.85) 100%)` }} />
      </div>

      {/* Cabeçalho: logo + nome do evento */}
      <header className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-3">
          {event?.logoUrl ? (
            <img src={event.logoUrl} alt="" className="h-12 w-12 rounded-full object-cover ring-2" style={{ '--tw-ring-color': hexToRgba(accent, 0.5) }} />
          ) : null}
          <span className="font-serif text-2xl font-semibold tracking-tight drop-shadow">{event?.name}</span>
        </div>
        {mode === 'live' && (
          <span className="flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium uppercase tracking-wider"
            style={{ borderColor: hexToRgba(accent, 0.5), color: accent, background: hexToRgba(accent, 0.1) }}>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ background: accent }} />
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: accent }} />
            </span>
            Ao vivo
          </span>
        )}
      </header>

      {/* Palco */}
      <main className="relative z-10 flex min-h-screen items-center justify-center px-6 py-24">
        {waiting ? (
          <div className="text-center">
            <p className="font-serif text-4xl font-semibold">As fotos aparecerão em breve ✨</p>
            <p className="mt-3 text-lg text-cream-dim">O álbum será revelado no momento certo.</p>
          </div>
        ) : empty ? (
          <div className="text-center">
            <p className="font-serif text-4xl font-semibold">Aguardando as primeiras fotos…</p>
            <p className="mt-3 text-lg text-cream-dim">Aponte a câmera e comece a registrar o momento.</p>
          </div>
        ) : (
          <figure key={photo.id} className="animate-fadein flex max-h-full flex-col items-center">
            {photo.mediaType === 'video' ? (
              <video src={photo.url} autoPlay muted loop playsInline
                className="max-h-[74vh] max-w-[88vw] rounded-2xl object-contain shadow-2xl" />
            ) : (
              <img src={photo.url} alt=""
                className="ken-burns max-h-[74vh] max-w-[88vw] rounded-2xl object-contain shadow-2xl"
                style={{ boxShadow: `0 40px 120px -30px ${hexToRgba(accent, 0.5)}` }} />
            )}
            {photo.guestNickname && (
              <figcaption className="mt-5 text-center">
                <span className="rounded-full border px-4 py-1.5 text-base"
                  style={{ borderColor: hexToRgba(accent, 0.35), color: '#fff', background: 'rgba(0,0,0,0.35)' }}>
                  por <span style={{ color: accent }}>{photo.guestNickname}</span>
                </span>
              </figcaption>
            )}
          </figure>
        )}
      </main>

      {/* Rodapé: contador + marca (plano free) */}
      <footer className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between px-8 py-5 text-sm text-cream-dim">
        <span>{data.total ? `${data.total} momento(s)` : ''}</span>
        {isNew && <span className="animate-fadein font-medium" style={{ color: accent }}>✦ nova foto</span>}
        {event?.showBranding ? <span className="font-serif">Era Uma Vez</span> : <span />}
      </footer>
    </div>
  );
}
