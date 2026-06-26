import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { guestApi } from '../../api/guestApi';
import { photoApi } from '../../api/photoApi';

const FILTERS = [
  { id: 'normal',    label: 'Normal',    css: 'none' },
  { id: 'vintage',   label: 'Vintage',   css: 'sepia(0.55) contrast(1.1) brightness(1.05)' },
  { id: 'bw',        label: 'P&B',       css: 'grayscale(1) contrast(1.15)' },
  { id: 'warm',      label: 'Quente',    css: 'saturate(1.4) hue-rotate(-10deg) brightness(1.05)' },
  { id: 'cool',      label: 'Frio',      css: 'saturate(0.85) hue-rotate(15deg) brightness(0.97)' },
  { id: 'faded',     label: 'Faded',     css: 'contrast(0.88) brightness(1.08) saturate(0.8)' },
];

function Loader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-white/60" />
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
        width  = Math.round(width  * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
    };
    img.src = url;
  });
}

async function applyFilterToBlob(blob, filterCss) {
  if (!filterCss || filterCss === 'none') return blob;
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.filter = filterCss;
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.88);
    };
    img.src = url;
  });
}

function PreviewScreen({ previewUrl, onRetake, onUpload, uploading, filter }) {
  return (
    <div className="flex min-h-screen flex-col bg-black">
      <div className="relative flex-1 overflow-hidden">
        <img
          src={previewUrl}
          alt="Preview"
          className="h-full w-full object-cover"
          style={{ filter: filter?.css }}
        />
        {/* Corner brackets */}
        <div className="pointer-events-none absolute inset-4">
          <div className="absolute left-0  top-0    h-8 w-8 border-l-2 border-t-2 border-white/60 rounded-tl-sm" />
          <div className="absolute right-0 top-0    h-8 w-8 border-r-2 border-t-2 border-white/60 rounded-tr-sm" />
          <div className="absolute left-0  bottom-0 h-8 w-8 border-l-2 border-b-2 border-white/60 rounded-bl-sm" />
          <div className="absolute right-0 bottom-0 h-8 w-8 border-r-2 border-b-2 border-white/60 rounded-br-sm" />
        </div>
      </div>
      <div className="flex gap-3 px-6 py-6">
        <button onClick={onRetake} disabled={uploading} className="btn-ghost flex-1 rounded-2xl py-4">
          Descartar
        </button>
        <button onClick={onUpload} disabled={uploading} className="btn-film flex-1 rounded-2xl py-4">
          {uploading ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
              Enviando…
            </span>
          ) : '✓  Usar foto'}
        </button>
      </div>
    </div>
  );
}

export default function Camera() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [event,       setEvent]       = useState(null);
  const [guest,       setGuest]       = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [authError,   setAuthError]   = useState(false);

  const [activeFilter,   setActiveFilter]   = useState(FILTERS[0]);
  const [stream,         setStream]         = useState(null);
  const [facingMode,     setFacingMode]     = useState('environment');
  const [previewUrl,     setPreviewUrl]     = useState(null);
  const [capturedBlob,   setCapturedBlob]   = useState(null);
  const [uploading,      setUploading]      = useState(false);
  const [photoCount,     setPhotoCount]     = useState(0);
  const [flashActive,    setFlashActive]    = useState(false);
  const [uploadedCount,  setUploadedCount]  = useState(0);
  const [toast,          setToast]          = useState(null);

  const videoRef  = useRef(null);
  const fileRef   = useRef(null);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  }

  // Auth check
  useEffect(() => {
    const token = guestApi.getGuestToken(slug);
    if (!token) { navigate(`/e/${slug}`, { replace: true }); return; }

    Promise.all([
      guestApi.getEvent(slug),
      guestApi.me(slug),
    ]).then(([ed, gd]) => {
      setEvent(ed.event);
      setGuest(gd.guest);
      setPhotoCount(gd.guest?.photoCount ?? 0);
    }).catch(() => setAuthError(true))
      .finally(() => setLoading(false));
  }, [slug, navigate]);

  // Camera stream
  const startCamera = useCallback(async (facing = facingMode) => {
    try {
      if (stream) stream.getTracks().forEach((t) => t.stop());
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch {}
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
    canvas.width  = video.videoWidth  || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      setCapturedBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
    }, 'image/jpeg', 0.9);

    // Flash effect
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
      const filtered = await applyFilterToBlob(capturedBlob, activeFilter.css);
      const file = new File([filtered], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });

      // Get presigned URL or local upload endpoint
      const { uploadUrl, key, method } = await photoApi.getUploadUrl(slug, file.name, file.type);

      if (method === 's3') {
        await photoApi.s3Upload(uploadUrl, file);
      } else {
        await photoApi.localUpload(key, file);
      }
      await photoApi.savePhoto(slug, key, activeFilter.id);

      setUploadedCount((c) => c + 1);
      setPhotoCount((c) => c + 1);
      handleRetake();
      showToast('Foto enviada! 🎞️');
    } catch (err) {
      showToast('Erro ao enviar foto.', 'error');
    } finally {
      setUploading(false);
    }
  }

  if (loading)    return <Loader />;
  if (authError)  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black text-cream gap-4 px-6 text-center">
      <p className="font-serif text-2xl">Sessão expirada</p>
      <p className="text-sm text-white/40">Entre novamente para continuar.</p>
      <Link to={`/e/${slug}`} className="btn-film px-6 py-3 rounded-2xl text-sm mt-2">Voltar</Link>
    </div>
  );

  const isClosed = event?.status === 'closed' || event?.status === 'revealed';
  const maxPhotos = event?.photoLimitPerGuest ?? 30;
  const remaining = maxPhotos - photoCount;

  if (isClosed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black text-cream gap-6 px-6 text-center">
        <div className="font-serif text-3xl">Evento encerrado</div>
        <p className="text-sm text-white/40">As fotos serão reveladas em breve.</p>
        <Link to={`/e/${slug}/album`} className="btn-film px-8 py-3 rounded-2xl text-sm">Ver álbum</Link>
      </div>
    );
  }

  if (previewUrl) {
    return (
      <PreviewScreen
        previewUrl={previewUrl}
        filter={activeFilter}
        uploading={uploading}
        onRetake={handleRetake}
        onUpload={handleUpload}
      />
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-black select-none overflow-hidden">

      {/* Flash overlay */}
      {flashActive && <div className="pointer-events-none absolute inset-0 z-50 bg-white animate-fadein" style={{ animation: 'fadein 0.06s ease' }} />}

      {/* Toast */}
      {toast && (
        <div className={`absolute top-4 left-1/2 z-50 -translate-x-1/2 rounded-2xl px-5 py-3 text-sm font-medium shadow-lg animate-slideup ${
          toast.type === 'error' ? 'bg-red-500/90 text-white' : 'bg-white text-black'}`}>
          {toast.msg}
        </div>
      )}

      {/* Viewfinder */}
      <div className="relative flex-1 overflow-hidden bg-black">
        <video
          ref={videoRef}
          autoPlay playsInline muted
          className="h-full w-full object-cover"
          style={{
            filter: activeFilter.css,
            transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
          }}
        />

        {/* Corner brackets */}
        <div className="pointer-events-none absolute inset-4">
          <div className="absolute left-0  top-0    h-10 w-10 border-l-2 border-t-2 border-white/50 rounded-tl-sm" />
          <div className="absolute right-0 top-0    h-10 w-10 border-r-2 border-t-2 border-white/50 rounded-tr-sm" />
          <div className="absolute left-0  bottom-0 h-10 w-10 border-l-2 border-b-2 border-white/50 rounded-bl-sm" />
          <div className="absolute right-0 bottom-0 h-10 w-10 border-r-2 border-b-2 border-white/50 rounded-br-sm" />
        </div>

        {/* HUD */}
        <div className="absolute top-4 left-0 right-0 flex items-start justify-between px-5">
          <div>
            <p className="film-counter">{event?.name?.toUpperCase()}</p>
            <p className="film-counter mt-0.5">{guest?.nickname?.toUpperCase()}</p>
          </div>
          <div className="text-right">
            <p className="film-counter">{String(photoCount).padStart(2,'0')} / {String(maxPhotos).padStart(2,'0')}</p>
            {remaining <= 5 && remaining > 0 && (
              <p className="film-counter mt-0.5 text-amber-400">ÚLTIMAS {remaining}</p>
            )}
            {remaining <= 0 && (
              <p className="film-counter mt-0.5 text-red-400">SEM FOTOS</p>
            )}
          </div>
        </div>

        {/* Album link */}
        <Link
          to={`/e/${slug}/album`}
          className="absolute bottom-5 left-5 rounded-xl border border-white/20 bg-black/40 px-3 py-1.5 text-xs text-white/60 backdrop-blur-sm transition hover:text-white/90"
        >
          Ver álbum →
        </Link>
      </div>

      {/* Filter strip */}
      <div className="border-t border-white/8 bg-black">
        <div className="flex gap-2 overflow-x-auto px-5 py-3 scrollbar-hide">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f)}
              className={`flex-shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                activeFilter.id === f.id
                  ? 'bg-white text-black'
                  : 'border border-white/15 text-white/50 hover:text-white/80'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between border-t border-white/8 bg-black px-10 py-6">
        {/* Gallery / Upload */}
        <button
          onClick={() => fileRef.current?.click()}
          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/5 text-white/60 hover:text-white/90 transition"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="3" ry="3"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

        {/* Shutter */}
        <button
          onClick={capturePhoto}
          disabled={remaining <= 0}
          className="relative flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/30 bg-white/10 transition active:scale-95 disabled:opacity-30"
        >
          <div className="h-14 w-14 rounded-full bg-white" />
        </button>

        {/* Flip */}
        <button
          onClick={flipCamera}
          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/5 text-white/60 hover:text-white/90 transition"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10"/>
            <polyline points="23 20 23 14 17 14"/>
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
