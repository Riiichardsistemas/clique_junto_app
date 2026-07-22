import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, ImagePlus, SwitchCamera, LogOut, Sparkles, Zap, ZapOff } from 'lucide-react';
import { guestApi } from '../../api/guestApi';
import { FILTER_DEFS, applyFilterToBlob } from '../../utils/filters';
import { enqueueUpload, subscribeQueue, processQueue } from '../../utils/uploadQueue';
import PageLoader from '../../components/ui/PageLoader';

const MAX_VIDEO_SECONDS = 15;

// Filtros disponíveis no visor (ids válidos no backend) com rótulos de filme.
// `short` é a legenda do swatch circular; `label` aparece no visor.
const CAMERA_FILTERS = [
  { id: 'nenhum',   label: 'Normal',          short: 'Normal',   tag: 'Digital' },
  { id: 'kodak',    label: 'Kodak Gold 200',  short: 'Kodak',    tag: 'Kodak' },
  { id: 'pb',       label: 'Preto & branco',  short: 'P&B',      tag: 'Mono' },
  { id: 'polaroid', label: 'Polaroid',        short: 'Polaroid', tag: 'Instant' },
  { id: 'vintage',  label: 'Sépia',           short: 'Sépia',    tag: 'Vintage' },
  { id: 'cinema',   label: 'Cinema',          short: 'Cinema',   tag: 'Film' },
].map((f) => ({ ...f, css: FILTER_DEFS[f.id]?.cssFilter || 'none' }));

// Amostra colorida usada nos swatches — os filtros CSS aplicados sobre ela
// tornam a diferença entre eles visível antes de escolher
const SWATCH_SAMPLE =
  'conic-gradient(from 210deg at 50% 42%, #f2c98a, #d96f4e 28%, #7ea4a0 55%, #46557a 78%, #f2c98a)';

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

function PreviewScreen({ previewUrl, onRetake, onUpload, uploading, filter, isVideo, slug }) {
  return (
    // h-[100dvh] (e não min-h): trava na altura visível do viewport — a imagem
    // encolhe e os botões nunca ficam cortados sob a barra do navegador
    <div className="flex h-[100dvh] flex-col bg-ink-deep">
      {/* Sair — descarta a foto atual e abre o álbum, se o convidado preferir */}
      <Link to={`/e/${slug}/album`} onClick={onRetake} aria-label="Sair da câmera e abrir o álbum"
        className="safe-fixed-top absolute right-4 z-20 flex min-h-11 items-center gap-1.5 rounded-full border border-white/20 bg-black/45 px-4 text-[13px] font-semibold text-white/85 backdrop-blur-md transition hover:text-white">
        <LogOut size={14} />
        Sair
      </Link>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {isVideo ? (
          <video src={previewUrl} autoPlay loop playsInline controls={false}
            className="h-full w-full object-cover" style={{ filter: filter?.css }} />
        ) : (
          <img src={previewUrl} alt="Pré-visualização" className="h-full w-full object-cover" style={{ filter: filter?.css }} />
        )}
        <div className="pointer-events-none absolute inset-4">
          <span className="absolute left-0 top-0 h-8 w-8 border-l-2 border-t-2 border-cream/60" />
          <span className="absolute right-0 top-0 h-8 w-8 border-r-2 border-t-2 border-cream/60" />
          <span className="absolute bottom-0 left-0 h-8 w-8 border-b-2 border-l-2 border-cream/60" />
          <span className="absolute bottom-0 right-0 h-8 w-8 border-b-2 border-r-2 border-cream/60" />
        </div>
        <p className="label-mono absolute bottom-6 left-1/2 -translate-x-1/2 text-cream/60">{filter?.label}</p>
      </div>
      <div className="flex gap-3 bg-ink-deep px-6 pt-6" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
        <button onClick={onRetake} disabled={uploading} className="btn-ghost flex-1 rounded-2xl py-4">
          Descartar
        </button>
        <button onClick={onUpload} disabled={uploading} className="btn-film flex-1 rounded-2xl py-4">
          {uploading ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink/20 border-t-ink" />
              Guardando…
            </span>
          ) : (isVideo ? 'Usar vídeo' : 'Usar foto')}
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
  const [cameraError, setCameraError] = useState(false);
  const [facingMode, setFacingMode] = useState('environment');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [capturedMeta, setCapturedMeta] = useState(null); // { mediaType, durationSeconds, fileType }
  const [uploading, setUploading] = useState(false);
  const [photoCount, setPhotoCount] = useState(0);
  const [flashActive, setFlashActive] = useState(false);
  const [toast, setToast] = useState(null);
  const [clock, setClock] = useState('');

  // Gravação de vídeo (segurar o obturador) + controles do visor
  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const [zoom, setZoom] = useState(1);              // 1x | 2x (zoom digital)
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Fila de upload em background
  const [queue, setQueue] = useState({ pending: 0, sending: false });

  const videoRef = useRef(null);
  const fileRef = useRef(null);
  const recorderRef = useRef(null);
  const recordTimerRef = useRef(null);

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

  const startCamera = useCallback(async (facing = facingMode, withAudio = false) => {
    try {
      if (stream) stream.getTracks().forEach((t) => t.stop());
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: withAudio,
      });
      setStream(s);
      setCameraError(false);
      if (videoRef.current) videoRef.current.srcObject = s;
      // Detecta suporte a lanterna (torch) — Android/Chrome principalmente
      try {
        const cap = s.getVideoTracks()[0]?.getCapabilities?.();
        setTorchSupported(!!cap?.torch);
      } catch { setTorchSupported(false); }
      setTorchOn(false);
    } catch { setCameraError(true); }
  }, [stream, facingMode]);

  // Status da fila de upload (offline/retry)
  useEffect(() => {
    const unsub = subscribeQueue((state) => {
      setQueue(state);
      if (state.rejected) showToast(state.error || 'Um envio foi recusado.', 'error');
    });
    processQueue(); // retoma envios pendentes de sessões anteriores
    return unsub;
  }, []);

  useEffect(() => {
    if (!loading && !authError) {
      startCamera();
      // Dica única de uso do obturador (toque/segurar)
      setTimeout(() => showToast('Toque para foto · segure para vídeo'), 600);
    }
    return () => { if (stream) stream.getTracks().forEach((t) => t.stop()); };
  }, [loading, authError]); // eslint-disable-line

  // Religa o stream ao <video> também quando a pré-visualização fecha:
  // o elemento é desmontado ao mostrar o preview e o novo montava sem stream
  // (tela preta até virar a câmera, que reiniciava o stream).
  useEffect(() => {
    if (!previewUrl && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play?.().catch(() => {});
    }
  }, [stream, previewUrl]);

  function flipCamera() {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    startCamera(next);
  }

  function capturePhoto() {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const vw = video.videoWidth || 1280;
    const vh = video.videoHeight || 720;
    // Zoom digital: captura o recorte central correspondente ao zoom do visor
    const sw = Math.round(vw / zoom);
    const sh = Math.round(vh / zoom);
    const sx = Math.round((vw - sw) / 2);
    const sy = Math.round((vh - sh) / 2);
    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d');
    if (facingMode === 'user') { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      setCapturedBlob(blob);
      setCapturedMeta({ mediaType: 'photo', fileType: 'image/jpeg' });
      setPreviewUrl(URL.createObjectURL(blob));
    }, 'image/jpeg', 0.9);
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 180);
  }

  async function toggleTorch() {
    const track = stream?.getVideoTracks?.()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn }] });
      setTorchOn((v) => !v);
    } catch {
      showToast('Flash indisponível neste aparelho.', 'error');
    }
  }

  // Obturador estilo iPhone: toque = foto · segurar = vídeo (até 15s)
  const pressTimerRef = useRef(null);
  const pressStartedVideoRef = useRef(false);

  function shutterDown(e) {
    e.preventDefault();
    if (recording || remaining <= 0 || cameraError) return;
    pressStartedVideoRef.current = false;
    pressTimerRef.current = setTimeout(async () => {
      pressStartedVideoRef.current = true;
      await startRecording();
    }, 350);
  }

  function shutterUp(e) {
    e.preventDefault();
    clearTimeout(pressTimerRef.current);
    if (recording || pressStartedVideoRef.current) stopRecording();
    else if (remaining > 0 && !cameraError) capturePhoto();
    pressStartedVideoRef.current = false;
  }

  function shutterCancel() {
    clearTimeout(pressTimerRef.current);
    if (recording || pressStartedVideoRef.current) stopRecording();
    pressStartedVideoRef.current = false;
  }

  // ---- Vídeo curto (máx. 15s) ----

  function pickRecorderMime() {
    const candidates = ['video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
    return candidates.find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || '';
  }

  async function startRecording() {
    let s = stream;
    // Garante trilha de áudio para o vídeo
    if (!s || s.getAudioTracks().length === 0) {
      try {
        s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });
        if (stream) stream.getTracks().forEach((t) => t.stop());
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      } catch { showToast('Não foi possível acessar o microfone.', 'error'); return; }
    }

    const mime = pickRecorderMime();
    const chunks = [];
    const rec = new MediaRecorder(s, mime ? { mimeType: mime } : undefined);
    const startedAt = Date.now();
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      clearInterval(recordTimerRef.current);
      setRecording(false);
      setRecordSecs(0);
      const type = (mime || 'video/webm').split(';')[0];
      const blob = new Blob(chunks, { type });
      const duration = Math.min(MAX_VIDEO_SECONDS, (Date.now() - startedAt) / 1000);
      if (duration < 1) { showToast('Vídeo muito curto.', 'error'); return; }
      setCapturedBlob(blob);
      setCapturedMeta({ mediaType: 'video', durationSeconds: Math.round(duration * 10) / 10, fileType: type });
      setPreviewUrl(URL.createObjectURL(blob));
    };
    recorderRef.current = rec;
    rec.start();
    setRecording(true);
    setRecordSecs(0);
    recordTimerRef.current = setInterval(() => {
      setRecordSecs((sec) => {
        if (sec + 1 >= MAX_VIDEO_SECONDS) stopRecording();
        return sec + 1;
      });
    }, 1000);
  }

  function stopRecording() {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
  }

  function handleRetake() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setCapturedBlob(null);
    setCapturedMeta(null);
  }

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file);
    setCapturedBlob(compressed);
    setCapturedMeta({ mediaType: 'photo', fileType: 'image/jpeg' });
    setPreviewUrl(URL.createObjectURL(compressed));
    e.target.value = '';
  }

  // Entrega para a fila offline: salva no dispositivo e envia em background
  async function handleUpload() {
    if (!capturedBlob || !capturedMeta) return;
    setUploading(true);
    try {
      const isVideo = capturedMeta.mediaType === 'video';
      let blob = capturedBlob;
      if (!isVideo) blob = await applyFilterToBlob(capturedBlob, activeFilter.id);

      const ext = isVideo ? (capturedMeta.fileType === 'video/mp4' ? '.mp4' : '.webm') : '.jpg';
      await enqueueUpload({
        slug,
        blob,
        fileName: `${isVideo ? 'video' : 'photo'}-${Date.now()}${ext}`,
        fileType: isVideo ? capturedMeta.fileType : 'image/jpeg',
        mediaType: capturedMeta.mediaType,
        filter: activeFilter.id,
        durationSeconds: capturedMeta.durationSeconds || null,
      });

      const isFirst = photoCount === 0;
      setPhotoCount((c) => c + 1);
      handleRetake();
      showToast(!navigator.onLine
        ? 'Guardado! Envia quando a conexão voltar'
        : isFirst
          ? `${isVideo ? 'Vídeo guardado' : 'Foto guardada'} — veja em “Álbum”, no topo`
          : (isVideo ? 'Vídeo guardado' : 'Foto guardada'));
    } catch {
      showToast('Erro ao guardar. Tente novamente.', 'error');
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <PageLoader label="Preparando câmera" />;
  if (authError) return (
    <div className="app-screen flex flex-col items-center justify-center gap-4 bg-ink-deep px-6 text-center text-cream">
      <p className="font-serif text-2xl">Sessão expirada</p>
      <p className="text-sm text-cream/40">Entre novamente para continuar.</p>
      <Link to={`/e/${slug}`} className="btn-film mt-2 rounded-2xl px-6 py-3 text-sm">Voltar</Link>
    </div>
  );

  // Revelado não encerra: só para de aceitar fotos no término do evento
  // (endsAt/encerramento manual) ou quando o limite de memórias esgotar.
  const isClosed = event ? !event.isAcceptingPhotos : false;
  const unlimited = (event?.photoLimitPerGuest ?? 0) === 0;
  const maxPhotos = event?.photoLimitPerGuest ?? 0;
  const remaining = unlimited ? Infinity : maxPhotos - photoCount;

  // Subtítulo da barra: tempo restante do evento (re-renderiza pelo tick do relógio)
  const endsAtMs = event?.endsAt ? new Date(event.endsAt).getTime() : null;
  const msLeft = endsAtMs ? endsAtMs - Date.now() : null;
  let barSubtitle;
  if (msLeft != null && msLeft > 0) {
    const h = Math.floor(msLeft / 3600000);
    const m = Math.floor((msLeft % 3600000) / 60000);
    barSubtitle = h > 0 ? `${h}h ${String(m).padStart(2, '0')}m restantes` : `${Math.max(1, m)}m restantes`;
  } else {
    barSubtitle = unlimited ? 'frames ilimitados' : `${photoCount}/${maxPhotos} frames`;
  }

  if (isClosed) {
    return (
      <div className="app-screen flex flex-col items-center justify-center gap-6 bg-ink-deep px-6 text-center text-cream">
        <div className="font-serif text-3xl">Evento encerrado</div>
        <p className="text-sm text-cream/40">
          {event?.isRevealed ? 'O álbum já está disponível.' : 'As fotos serão reveladas em breve.'}
        </p>
        <Link to={`/e/${slug}/album`} className="btn-film rounded-2xl px-8 py-3 text-sm">Ver álbum</Link>
      </div>
    );
  }

  if (previewUrl) {
    return (
      <PreviewScreen previewUrl={previewUrl} filter={activeFilter} uploading={uploading}
        isVideo={capturedMeta?.mediaType === 'video'} slug={slug}
        onRetake={handleRetake} onUpload={handleUpload} />
    );
  }

  // Filme completo: convite claro para o álbum (em vez de botão apagado)
  if (!unlimited && remaining <= 0) {
    return (
      <div className="app-screen flex flex-col items-center justify-center gap-5 bg-ink-deep px-6 text-center text-cream">
        <p className="font-serif text-3xl font-semibold tracking-tight">Filme completo</p>
        <p className="max-w-xs text-sm text-cream/45">
          Você usou seus {maxPhotos} frames. Suas memórias estão guardadas para a revelação.
        </p>
        {queue.pending > 0 && (
          <p className="label-mono text-gold/80">{queue.pending} na fila de envio…</p>
        )}
        <Link to={`/e/${slug}/album`} className="btn-film rounded-2xl px-8 py-3 text-sm">Ver álbum</Link>
      </div>
    );
  }

  return (
    // Visor em tela cheia, controles sobrepostos — como a câmera nativa do iPhone
    <div className="camera-app relative flex h-[100dvh] select-none flex-col overflow-hidden bg-black">
      {flashActive && <div className="pointer-events-none absolute inset-0 z-50 bg-white" style={{ animation: 'fadein 0.06s ease' }} />}

      {toast && (
        <div role="status" aria-live="polite" className={`camera-toast absolute left-1/2 z-50 -translate-x-1/2 rounded-2xl px-5 py-3 text-sm font-medium shadow-lg animate-slideup ${
          toast.type === 'error' ? 'bg-red-500/90 text-white' : 'bg-cream text-ink'}`}>
          {toast.msg}
        </div>
      )}

      {/* ===== Top bar — voltar · nome + tempo restante · filtros ===== */}
      <div className="camera-bar safe-top relative z-20 flex shrink-0 items-center justify-between bg-black px-2 pb-1.5 pt-1">
        <Link to={`/e/${slug}/album`} aria-label="Sair da câmera e abrir o álbum"
          className="flex h-11 w-11 items-center justify-center rounded-full text-white/80 transition hover:text-white">
          <ChevronLeft size={22} />
        </Link>
        <div className="min-w-0 flex-1 px-1 text-center">
          <p className="truncate text-[15px] font-semibold leading-tight text-white">{event?.name}</p>
          <p className={`text-[11px] leading-tight ${!unlimited && remaining <= 5 ? 'text-amber-300' : 'text-white/45'}`}>
            {barSubtitle}
          </p>
        </div>
        <button type="button" onClick={() => setShowFilters((v) => !v)} aria-pressed={showFilters} aria-label="Mostrar filtros"
          className={`flex h-11 w-11 items-center justify-center rounded-full transition ${
            showFilters ? 'text-gold' : 'text-white/80 hover:text-white'}`}>
          <Sparkles size={19} />
        </button>
      </div>

      {/* ===== Visor — cartão arredondado, como a referência ===== */}
      <div className="camera-viewfinder relative min-h-0 flex-1 overflow-hidden rounded-[22px] bg-ink-deep">
        <video ref={videoRef} autoPlay playsInline muted
          className="h-full w-full object-cover transition-transform duration-300"
          style={{ filter: activeFilter.css, transform: `${facingMode === 'user' ? 'scaleX(-1) ' : ''}scale(${zoom})` }}
        />

        {cameraError && (
          <div className="absolute inset-x-6 top-1/2 z-10 -translate-y-1/2 rounded-3xl border border-white/10 bg-black/65 p-6 text-center backdrop-blur-xl" role="status">
            <ImagePlus className="mx-auto h-6 w-6 text-gold" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-cream">Câmera indisponível</p>
            <p className="mt-1 text-xs leading-5 text-cream/55">Libere a câmera no navegador ou envie uma foto da galeria pelo botão abaixo.</p>
          </div>
        )}

        {queue.pending > 0 && (
          <span className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full border border-gold/30 bg-black/55 px-3 py-1 text-[11px] text-gold/90 backdrop-blur-sm">
            {queue.sending && <span className="h-2.5 w-2.5 animate-spin rounded-full border border-gold/30 border-t-gold" />}
            {queue.sending ? `Enviando ${queue.pending}…` : `${queue.pending} na fila`}
          </span>
        )}

        {recording && (
          <span className="absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-red-500/90 px-3 py-1 text-[11px] font-semibold text-white">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
            {String(recordSecs).padStart(2, '0')}s / {MAX_VIDEO_SECONDS}s
          </span>
        )}
      </div>

      {/* ===== Painel de controles — preto sólido, como a referência ===== */}
      <div className="camera-bottom z-20 shrink-0 bg-black pt-2.5">
        {/* Filtros — abrem pelo ícone ✦ da barra superior */}
        {showFilters && (
          <div className="camera-filter-strip animate-fadein">
            <div className="scrollbar-hide flex gap-2.5 overflow-x-auto px-4 pb-1.5 pt-0.5">
              {CAMERA_FILTERS.map((f) => {
                const active = activeFilter.id === f.id;
                return (
                  <button key={f.id} type="button" aria-pressed={active} aria-label={`Filtro ${f.label}`}
                    onClick={() => setActiveFilter(f)}
                    className="flex flex-shrink-0 flex-col items-center gap-1 py-0.5 first:ml-auto last:mr-auto">
                    <span className={`block h-9 w-9 overflow-hidden rounded-full border-2 transition-all ${
                      active ? 'scale-110 border-gold shadow-[0_0_12px_rgba(196,169,108,.45)]' : 'border-white/25'}`}>
                      <span className="block h-full w-full" style={{ background: SWATCH_SAMPLE, filter: f.css }} />
                    </span>
                    <span className={`text-[9px] font-medium transition-colors ${active ? 'text-gold' : 'text-cream/60'}`}>
                      {f.short}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Linha 1: flash · zoom · virar */}
        <div className="camera-aux grid grid-cols-3 items-center px-7 pb-1">
          <div className="justify-self-start">
            <button type="button" onClick={toggleTorch} disabled={!torchSupported || recording}
              aria-label={torchOn ? 'Desligar flash' : 'Ligar flash'} aria-pressed={torchOn}
              className={`flex h-11 w-11 items-center justify-center rounded-full transition ${
                torchOn ? 'text-amber-300' : 'text-white/70 hover:text-white'} disabled:opacity-25`}>
              {torchOn ? <Zap size={19} /> : <ZapOff size={19} />}
            </button>
          </div>
          <div className="flex items-center gap-0.5 justify-self-center rounded-full bg-white/[0.09] p-1">
            {[1, 2].map((z) => (
              <button key={z} type="button" onClick={() => setZoom(z)} aria-pressed={zoom === z}
                aria-label={`Zoom ${z}x`}
                className={`flex h-8 min-w-9 items-center justify-center rounded-full px-1.5 font-semibold transition ${
                  zoom === z ? 'bg-black/60 text-[13px] text-white' : 'text-[12px] text-white/50'}`}>
                {zoom === z ? `${z},0x` : z}
              </button>
            ))}
          </div>
          <div className="justify-self-end">
            <button type="button" onClick={flipCamera} disabled={recording || cameraError} aria-label="Alternar câmera"
              className="flex h-11 w-11 items-center justify-center rounded-full text-white/70 transition hover:text-white disabled:opacity-25">
              <SwitchCamera size={19} />
            </button>
          </div>
        </div>

        {/* Linha 2: contador de filme · obturador (toque = foto, segurar = vídeo) · galeria */}
        <div className="camera-controls safe-bottom grid grid-cols-3 items-center px-7 pt-0.5">
          <p className={`justify-self-start font-serif text-[26px] italic leading-none ${
            !unlimited && remaining <= 5 ? 'text-amber-300' : 'text-white/90'}`}>
            {unlimited ? '∞' : remaining}
            {!unlimited && <span className="ml-0.5 text-[15px] not-italic text-white/25">/{maxPhotos}</span>}
          </p>

          <button type="button"
            aria-label={recording ? 'Parar gravação' : 'Tirar foto (segure para vídeo)'}
            disabled={remaining <= 0 || cameraError}
            onPointerDown={shutterDown} onPointerUp={shutterUp}
            onPointerLeave={shutterCancel} onPointerCancel={shutterCancel}
            onContextMenu={(e) => e.preventDefault()}
            className={`relative flex h-[72px] w-[72px] touch-none items-center justify-center justify-self-center rounded-full border-[3px] transition active:scale-95 disabled:opacity-30 ${
              recording ? 'border-red-400/80' : 'border-white/90'}`}>
            <span className={`transition-all duration-200 ${recording
              ? 'h-7 w-7 rounded-lg bg-red-500'
              : 'h-[58px] w-[58px] rounded-full bg-white'}`} />
          </button>

          <div className="justify-self-end">
            <button type="button" aria-label="Escolher foto da galeria" onClick={() => fileRef.current?.click()} disabled={recording}
              className="flex h-11 w-11 items-center justify-center rounded-full text-white/70 transition hover:text-white disabled:opacity-25">
              <ImagePlus size={20} strokeWidth={1.7} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
          </div>
        </div>
      </div>
    </div>
  );
}
