import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { guestApi } from '../../api/guestApi';
import { photoApi } from '../../api/photoApi';
import { FILTER_DEFS, applyFilterToBlob } from '../../utils/filters';

// Filtros disponíveis no visor (ids válidos no backend) com rótulos de filme
const CAMERA_FILTERS = [
  { id: 'nenhum',   label: 'Normal',          tag: 'Digital' },
  { id: 'kodak',    label: 'Kodak Gold 200',  tag: 'Kodak' },
  { id: 'pb',       label: 'Preto & branco',  tag: 'Mono' },
  { id: 'polaroid', label: 'Polaroid',        tag: 'Instant' },
  { id: 'vintage',  label: 'Sépia',           tag: 'Vintage' },
  { id: 'cinema',   label: 'Cinema',          tag: 'Film' },
].map((f) => ({ ...f, css: FILTER_DEFS[f.id]?.cssFilter || 'none' }));

function Loader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-deep">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-cream/15 border-t-cream/60" />
    </div>
  );
}

async function compressImage(file, maxDim = 1600, quality = 0.82) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
    };
    img.src = url;
  });
}

function PreviewScreen({ previewUrl, onRetake, onUpload, uploading, filter }) {
  return (
    <div className="flex min-h-screen flex-col bg-ink-deep">
      <div className="relative flex-1 overflow-hidden">
        <img src={previewUrl} alt="Pré-visualização" className="h-full w-full object-cover" style={{ filter: filter?.css }} />
        <div className="pointer-events-none absolute inset-4">
          <span className="absolute left-0 top-0 h-8 w-8 border-l-2 border-t-2 border-cream/60" />
          <span className="absolute right-0 top-0 h-8 w-8 border-r-2 border-t-2 border-cream/60" />
          <span className="absolute bottom-0 left-0 h-8 w-8 border-b-2 border-l-2 border-cream/60" />
          <span className="absolute bottom-0 right-0 h-8 w-8 border-b-2 border-r-2 border-cream/60" />
        </div>
        <p className="label-mono absolute bottom-6 left-1/2 -translate-x-1/2 text-cream/60">{filter?.label}</p>
      </div>
      <div className="flex gap-3 bg-ink-deep px-6 py-6">
        <button onClick={onRetake} disabled={uploading} className="btn-ghost flex-1 rounded-2xl py-4">
          Descartar
        </button>
        <button onClick={onUpload} disabled={uploading} className="btn-film flex-1 rounded-2xl py-4">
          {uploading ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink/20 border-t-ink" />
              Enviando…
            </span>
          ) : 'Usar foto'}
        </button>
      </div>
    </div>
  );
}

export default function Camera() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [guest, setGuest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);

  const [activeFilter, setActiveFilter] = useState(CAMERA_FILTERS[1]); // Kodak por padrão
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [photoCount, setPhotoCount] = useState(0);
  const [flashActive, setFlashActive] = useState(false);
  const [toast, setToast] = useState(null);
  const [clock, setClock] = useState('');

  const videoRef = useRef(null);
  const fileRef = useRef(null);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  }

  // Relógio do HUD
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Auth + dados
  useEffect(() => {
    const token = guestApi.getGuestToken(slug);
    if (!token) { navigate(`/e/${slug}`, { replace: true }); return; }
    Promise.all([guestApi.getEvent(slug), guestApi.me(slug)])
      .then(([ed, gd]) => {
        setEvent(ed.event);
        setGuest(gd.guest);
        setPhotoCount(gd.guest?.photoCount ?? 0);
      })
      .catch(() => setAuthError(true))
      .finally(() => setLoading(false));
  }, [slug, navigate]);

  const startCamera = useCallback(async (facing = facingMode) => {
    try {
      if (stream) stream.getTracks().forEach((t) => t.stop());
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch { /* sem permissão de câmera — pode usar upload */ }
  }, [stream, facingMode]);

  useEffect(() => {
    if (!loading && !authError) startCamera();
    return () => { if (stream) stream.getTracks().forEach((t) => t.stop()); };
  }, [loading, authError]); // eslint-disable-line

  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream]);

  function flipCamera() {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    startCamera(next);
  }

  function capturePhoto() {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (facingMode === 'user') { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      setCapturedBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
    }, 'image/jpeg', 0.9);
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 180);
  }

  function handleRetake() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setCapturedBlob(null);
  }

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file);
    setCapturedBlob(compressed);
    setPreviewUrl(URL.createObjectURL(compressed));
    e.target.value = '';
  }

  async function handleUpload() {
    if (!capturedBlob) return;
    setUploading(true);
    try {
      const filtered = await applyFilterToBlob(capturedBlob, activeFilter.id);
      const file = new File([filtered], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });

      const { uploadUrl, key, storageMode } = await photoApi.getUploadUrl(slug, file.name, file.type);
      if (storageMode === 's3') {
        await photoApi.s3Upload(uploadUrl, file);
      } else {
        await photoApi.localUpload(key, file);
      }
      await photoApi.savePhoto(slug, key, activeFilter.id);

      setPhotoCount((c) => c + 1);
      handleRetake();
      showToast('Foto guardada 🎞️');
    } catch {
      showToast('Erro ao enviar foto.', 'error');
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <Loader />;
  if (authError) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ink-deep px-6 text-center text-cream">
      <p className="font-serif text-2xl">Sessão expirada</p>
      <p className="text-sm text-cream/40">Entre novamente para continuar.</p>
      <Link to={`/e/${slug}`} className="btn-film mt-2 rounded-2xl px-6 py-3 text-sm">Voltar</Link>
    </div>
  );

  const isClosed = event?.status === 'closed' || event?.status === 'revealed';
  const unlimited = (event?.photoLimitPerGuest ?? 0) === 0;
  const maxPhotos = event?.photoLimitPerGuest ?? 0;
  const remaining = unlimited ? Infinity : maxPhotos - photoCount;

  if (isClosed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-ink-deep px-6 text-center text-cream">
        <div className="font-serif text-3xl">Evento encerrado</div>
        <p className="text-sm text-cream/40">As fotos serão reveladas em breve.</p>
        <Link to={`/e/${slug}/album`} className="btn-film rounded-2xl px-8 py-3 text-sm">Ver álbum</Link>
      </div>
    );
  }

  if (previewUrl) {
    return (
      <PreviewScreen previewUrl={previewUrl} filter={activeFilter} uploading={uploading}
        onRetake={handleRetake} onUpload={handleUpload} />
    );
  }

  return (
    <div className="relative flex min-h-screen select-none flex-col overflow-hidden bg-ink-deep">
      {flashActive && <div className="pointer-events-none absolute inset-0 z-50 bg-white" style={{ animation: 'fadein 0.06s ease' }} />}

      {toast && (
        <div className={`absolute top-16 left-1/2 z-50 -translate-x-1/2 rounded-2xl px-5 py-3 text-sm font-medium shadow-lg animate-slideup ${
          toast.type === 'error' ? 'bg-red-500/90 text-white' : 'bg-cream text-ink'}`}>
          {toast.msg}
        </div>
      )}

      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 pt-4">
        <span className="film-counter text-cream/70">{clock}</span>
        <Link to={`/e/${slug}/album`} className="flex h-9 w-9 items-center justify-center rounded-full border border-cream/15 bg-ink/40 text-cream/70 backdrop-blur-sm transition hover:text-cream">
          ✕
        </Link>
      </div>

      {/* Viewfinder */}
      <div className="relative flex-1 overflow-hidden bg-ink-deep">
        <video ref={videoRef} autoPlay playsInline muted
          className="h-full w-full object-cover"
          style={{ filter: activeFilter.css, transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
        />

        {/* Corner brackets */}
        <div className="pointer-events-none absolute inset-5">
          <span className="absolute left-0 top-0 h-10 w-10 border-l-2 border-t-2 border-cream/50" />
          <span className="absolute right-0 top-0 h-10 w-10 border-r-2 border-t-2 border-cream/50" />
          <span className="absolute bottom-0 left-0 h-10 w-10 border-b-2 border-l-2 border-cream/50" />
          <span className="absolute bottom-0 right-0 h-10 w-10 border-b-2 border-r-2 border-cream/50" />
        </div>

        {/* Frame counter (motivo de filme) */}
        <div className="absolute right-6 top-16 text-right">
          <p className="label-mono text-gold/90">Frames</p>
          <p className="font-mono text-lg text-cream/90">
            {String(photoCount).padStart(2, '0')}
            <span className="text-cream/40"> / {unlimited ? '∞' : String(maxPhotos).padStart(2, '0')}</span>
          </p>
          {!unlimited && remaining <= 5 && remaining > 0 && (
            <p className="label-mono mt-1 text-amber-300">Últimas {remaining}</p>
          )}
        </div>

        {/* Nome do filme/filtro */}
        <div className="absolute bottom-6 left-6">
          <p className="font-serif text-xl text-cream">{activeFilter.label}</p>
          <p className="label-mono mt-0.5 text-gold/80">{activeFilter.tag}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="border-t border-cream/[0.06] bg-ink-deep">
        <div className="scrollbar-hide flex gap-2 overflow-x-auto px-5 py-3">
          {CAMERA_FILTERS.map((f) => (
            <button key={f.id} onClick={() => setActiveFilter(f)}
              className={`flex-shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all ${
                activeFilter.id === f.id ? 'bg-gold text-ink' : 'border border-cream/15 text-cream/55 hover:text-cream/85'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Controles */}
      <div className="flex items-center justify-between border-t border-cream/[0.06] bg-ink-deep px-10 py-6">
        <button onClick={() => fileRef.current?.click()}
          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cream/15 bg-cream/[0.04] text-cream/60 transition hover:text-cream">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
          </svg>
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

        <button onClick={capturePhoto} disabled={remaining <= 0}
          className="relative flex h-20 w-20 items-center justify-center rounded-full border-4 border-cream/30 transition active:scale-95 disabled:opacity-30">
          <span className="h-14 w-14 rounded-full bg-cream" />
        </button>

        <button onClick={flipCamera}
          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cream/15 bg-cream/[0.04] text-cream/60 transition hover:text-cream">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10" /><polyline points="23 20 23 14 17 14" /><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15" />
          </svg>
        </button>
      </div>
    </div>
  );
}
