import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ChevronLeft, ChevronRight, Pencil, Trash2, Rocket, Lock, Sparkles, Download,
  Copy, QrCode, Clapperboard, X, Images, CreditCard, Palette, Monitor,
} from 'lucide-react';
import { eventApi } from '../../api/eventApi';
import { paymentApi } from '../../api/paymentApi';
import QRCodeDisplay from '../../components/QRCodeDisplay';

const TYPE_LABEL = {
  casamento: 'Casamento', festa: 'Festa', aniversario: 'Aniversário',
  corporativo: 'Corporativo', viagem: 'Viagem', outro: 'Evento',
};

function Loader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-cream/15 border-t-cream/60" />
    </div>
  );
}

function StatusBadge({ status }) {
  const map = { draft: 'badge-draft', active: 'badge-active', closed: 'badge-closed', revealed: 'badge-revealed' };
  const labels = { draft: 'Rascunho', active: 'Ativo', closed: 'Encerrado', revealed: 'Revelado' };
  return <span className={map[status] || 'badge-draft'}>{labels[status] || status}</span>;
}

function CountdownPanel({ label, target }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = target ? new Date(target).getTime() - now : null;
  if (diff === null) return null;
  const done = diff <= 0;
  const s = Math.max(0, Math.floor(diff / 1000));
  const hh = String(Math.floor(s / 3600)).padStart(2, '0');
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return (
    <div className="card flex items-center justify-between p-4">
      <p className="label-mono text-cream/35">{label}</p>
      <p className={`font-mono text-lg ${done ? 'text-cream/40' : 'text-cream'}`}>
        {done ? '—' : `${hh}:${mm}:${ss}`}
      </p>
    </div>
  );
}

function StatCell({ label, value }) {
  return (
    <div className="flex flex-col items-center py-4">
      <p className="font-serif text-2xl leading-none text-cream">{value}</p>
      <p className="label-mono mt-1.5 !text-[10px] text-cream/35">{label}</p>
    </div>
  );
}

export default function EventDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guests, setGuests] = useState([]);
  const [tab, setTab] = useState('overview');
  const [acting, setActing] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  // Modal de edição
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  // Recap
  const [recapStatus, setRecapStatus] = useState(null);
  const [recapUrl, setRecapUrl] = useState(null);
  const [recapGenerating, setRecapGenerating] = useState(false);

  useEffect(() => {
    eventApi.getOne(id)
      .then((d) => setEvent(d.event))
      .catch(() => navigate('/dashboard'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  useEffect(() => {
    if ((tab === 'guests' || tab === 'overview') && event) {
      eventApi.listGuests(event.id).then((d) => setGuests(d.guests || [])).catch(() => {});
    }
  }, [tab, event]);

  // Busca status do recap quando evento é revelado
  useEffect(() => {
    if (!event || event.status !== 'revealed') return;
    const base = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
    import('../../api/axios').then(({ default: api }) => {
      api.get(`/recap/${event.id}/status`).then((r) => {
        setRecapStatus(r.data.recapStatus || null);
        setRecapUrl(r.data.recapVideoUrl || null);
      }).catch(() => {});
    });
  }, [event?.status, event?.id]);

  useEffect(() => {
    if (tab === 'photos' && event) {
      setPhotosLoading(true);
      eventApi.listPhotos(event.id)
        .then((d) => setPhotos(d.photos || []))
        .catch(() => {})
        .finally(() => setPhotosLoading(false));
    }
  }, [tab, event]);

  async function handleDeletePhoto(photoId) {
    if (!window.confirm('Remover esta foto?')) return;
    try {
      await import('../../api/photoApi').then(({ photoApi }) => photoApi.remove(photoId));
      setPhotos((ps) => ps.filter((p) => p.id !== photoId));
      if (lightbox !== null) setLightbox(null);
      setEvent((ev) => ({ ...ev, photoCount: Math.max(0, (ev.photoCount ?? 1) - 1) }));
      toast.success('Foto removida.');
    } catch { toast.error('Erro ao remover.'); }
  }

  async function handlePublish() {
    setActing(true);
    try {
      const d = await eventApi.publish(event.id);
      setEvent(d.event);
      toast.success('Evento publicado!');
    } catch (err) {
      if (err?.response?.status === 402) return handlePay();
      toast.error('Erro ao publicar.');
    } finally { setActing(false); }
  }

  function handlePay() {
    navigate(`/events/${event.id}/checkout`);
  }

  async function handleClose() {
    if (!window.confirm('Encerrar o evento? Convidados não poderão mais enviar fotos.')) return;
    setActing(true);
    try {
      const d = await eventApi.close(event.id);
      setEvent(d.event);
      toast.success('Evento encerrado!');
    } catch { toast.error('Erro ao encerrar.'); }
    finally { setActing(false); }
  }

  async function handleReveal() {
    if (!window.confirm('Revelar todas as fotos agora?')) return;
    setActing(true);
    try {
      const d = await eventApi.reveal(event.id);
      setEvent(d.event);
      toast.success('Fotos reveladas! 🎞️');
    } catch { toast.error('Erro ao revelar.'); }
    finally { setActing(false); }
  }

  async function handleGenerateRecap() {
    setRecapGenerating(true);
    setRecapStatus('processing');
    try {
      const { default: api } = await import('../../api/axios');
      await api.post('/recap/generate', { eventId: event.id });
      toast.success('Gerando recap… você receberá um email quando estiver pronto.');
      // Poll a cada 10s
      const poll = setInterval(async () => {
        try {
          const r = await api.get(`/recap/${event.id}/status`);
          setRecapStatus(r.data.recapStatus);
          setRecapUrl(r.data.recapVideoUrl || null);
          if (r.data.recapStatus === 'ready' || r.data.recapStatus === 'failed') {
            clearInterval(poll);
            setRecapGenerating(false);
            if (r.data.recapStatus === 'ready') toast.success('Recap pronto! 🎬');
            else toast.error('Não foi possível gerar o recap. ffmpeg pode não estar instalado.');
          }
        } catch { clearInterval(poll); setRecapGenerating(false); }
      }, 10000);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Erro ao gerar recap.');
      setRecapStatus(null);
      setRecapGenerating(false);
    }
  }

  function openEdit() {
    setEditForm({
      name: event.name || '',
      type: event.type || 'outro',
      startsAt: event.startsAt ? event.startsAt.slice(0, 16) : '',
      endsAt: event.endsAt ? event.endsAt.slice(0, 16) : '',
      revealAt: event.revealAt ? event.revealAt.slice(0, 16) : '',
      photoLimitPerGuest: event.photoLimitPerGuest ?? 10,
    });
    setEditOpen(true);
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    setEditSaving(true);
    try {
      const d = await eventApi.update(event.id, {
        name: editForm.name,
        type: editForm.type,
        startsAt: editForm.startsAt || null,
        endsAt: editForm.endsAt || null,
        revealAt: editForm.revealAt || null,
        photoLimitPerGuest: Number(editForm.photoLimitPerGuest),
      });
      setEvent(d.event);
      setEditOpen(false);
      toast.success('Evento atualizado!');
    } catch { toast.error('Erro ao salvar.'); }
    finally { setEditSaving(false); }
  }

  async function handleDelete() {
    if (!window.confirm(`Excluir "${event.name}"? Isso remove todas as fotos permanentemente.`)) return;
    setActing(true);
    try {
      await eventApi.delete(event.id);
      toast.success('Evento excluído.');
      navigate('/dashboard');
    } catch { toast.error('Erro ao excluir.'); setActing(false); }
  }

  async function handleBanGuest(guestId) {
    if (!window.confirm('Remover este convidado?')) return;
    try {
      await eventApi.banGuest(event.id, guestId, true);
      setGuests((g) => g.filter((x) => x.id !== guestId));
      toast.success('Convidado removido.');
    } catch { toast.error('Erro.'); }
  }

  async function downloadZip() {
    const toastId = toast.loading('Gerando ZIP…');
    try {
      const blob = await eventApi.downloadZip(event.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${event.slug}-fotos.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Download iniciado!', { id: toastId });
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Erro ao gerar ZIP.', { id: toastId });
    }
  }

  if (loading) return <Loader />;

  const guestUrl = `${window.location.origin}/e/${event.slug}`;
  const createdAt = new Date(event.createdAt).toLocaleDateString('pt-BR');
  const photoCount = event.photoCount ?? 0;
  const guestCount = event.guestCount ?? 0;
  const perPerson = guestCount > 0 ? (photoCount / guestCount).toFixed(1) : '0';
  const recentGuests = [...guests].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

  return (
    <div className="min-h-screen text-cream">
      <header className="glass sticky top-0 z-10">
        <div className="mx-auto flex max-w-3xl items-center gap-1.5 px-4 py-2.5 sm:px-6">
          <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-cream-dim transition hover:text-cream">
            <ChevronLeft size={16} />
            Eventos
          </Link>
          <span className="flex-1" />
          {(event.photoCount ?? 0) > 0 && (
            <Link
              to={`/events/${event.id}/album`}
              className="btn-ghost btn-sm"
              title="Ver álbum"
            >
              <Images size={14} />
              <span className="hidden sm:inline">Ver álbum</span>
            </Link>
          )}
          <button onClick={openEdit} className="btn-ghost btn-sm" title="Editar">
            <Pencil size={14} />
            <span className="hidden sm:inline">Editar</span>
          </button>
          <Link to={`/events/${event.id}/personalizar`} className="btn-ghost btn-sm" title="Personalizar">
            <Palette size={14} />
            <span className="hidden sm:inline">Personalizar</span>
          </Link>
          {event.slideshowKey && (
            <a href={`/telao/${event.slideshowKey}`} target="_blank" rel="noreferrer" className="btn-ghost btn-sm" title="Abrir telão">
              <Monitor size={14} />
              <span className="hidden sm:inline">Telão</span>
            </a>
          )}
          <button onClick={handleDelete} disabled={acting}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-red-400/60 transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40"
            title="Excluir">
            <Trash2 size={15} />
          </button>
          {event.status === 'draft' && event.isPaid && (
            <button disabled={acting} onClick={handlePublish} className="btn-primary btn-sm">
              <Rocket size={14} />
              Publicar
            </button>
          )}
          {event.status === 'draft' && !event.isPaid && (
            <button disabled={acting} onClick={handlePay} className="btn-primary btn-sm">
              <CreditCard size={14} />
              Pagar e ativar
            </button>
          )}
          {event.status === 'active' && (
            <button disabled={acting} onClick={handleClose} className="btn-ghost btn-sm" title="Encerrar">
              <Lock size={14} />
              <span className="hidden sm:inline">Encerrar</span>
            </button>
          )}
          {(event.status === 'active' || event.status === 'closed') && (
            <button disabled={acting} onClick={handleReveal} className="btn-primary btn-sm">
              <Sparkles size={14} />
              Revelar<span className="hidden sm:inline"> agora</span>
            </button>
          )}
          {event.status === 'revealed' && (
            <button onClick={downloadZip} className="btn-primary btn-sm">
              <Download size={14} />
              Baixar<span className="hidden sm:inline"> todas</span>
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-6">
        {/* Título — agrupado com badge e tipo na mesma linha */}
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 sm:mb-5">
          <h1 className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl">{event.name}</h1>
          <StatusBadge status={event.status} />
          <span className="label-mono !text-[10px] text-cream/35">{TYPE_LABEL[event.type] || 'Evento'}</span>
        </div>

        {/* Countdowns */}
        {(event.status === 'active' || event.status === 'closed') && (
          <div className="mb-3 grid gap-2 sm:grid-cols-2">
            {event.endsAt && event.status === 'active' && (
              <CountdownPanel label="Encerramento em" target={event.endsAt} />
            )}
            {event.revealAt && !event.isRevealed && (
              <CountdownPanel label="Revelação em" target={event.revealAt} />
            )}
          </div>
        )}

        {/* Stats — agrupados num único card com divisores */}
        <div className="card mb-3 grid grid-cols-3 divide-x divide-line/50">
          <StatCell label="Convidados" value={guestCount} />
          <StatCell label="Fotos" value={photoCount} />
          <StatCell label="Por pessoa" value={perPerson} />
        </div>

        {/* Tabs — contagens só aparecem em telas maiores */}
        <div className="mb-4 flex gap-1 rounded-xl border border-line bg-surface p-1 sm:mb-5">
          {[['overview', 'Geral', 'Visão geral'], ['photos', 'Fotos', `Fotos · ${photoCount}`], ['guests', 'Convid.', `Convidados · ${guestCount}`], ['qr', 'QR', 'QR Code']].map(([key, short, full]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`min-w-0 flex-1 truncate rounded-lg px-1 py-1.5 text-xs font-medium transition-all duration-200 sm:text-[13px] ${
                tab === key
                  ? 'bg-gold text-[#1c160c] shadow-[0_4px_16px_-4px_rgba(196,169,108,0.5)]'
                  : 'text-cream-dim hover:bg-gold/[0.05] hover:text-cream'}`}>
              <span className="sm:hidden">{short}</span>
              <span className="hidden sm:inline">{full}</span>
            </button>
          ))}
        </div>

        {/* Visão geral */}
        {tab === 'overview' && (
          <div className="animate-fadein space-y-3">
            {/* Link */}
            <div className="card p-4">
              <p className="label-mono mb-2 !text-[10px] text-cream/35">Link do evento</p>
              <div className="flex flex-wrap items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-lg border border-line/60 bg-black/40 px-3 py-2 font-mono text-[13px] text-cream/80">{guestUrl}</code>
                <button onClick={() => { navigator.clipboard.writeText(guestUrl); toast.success('Link copiado!'); }}
                  className="btn-ghost btn-sm">
                  <Copy size={13} />
                  Copiar
                </button>
                <button onClick={() => setTab('qr')} className="btn-ghost btn-sm">
                  <QrCode size={13} />
                  QR Code
                </button>
              </div>
            </div>

            {/* Convidados + Detalhes lado a lado */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="card p-4">
                <p className="label-mono mb-3 !text-[10px] text-cream/35">Últimos convidados</p>
                {recentGuests.length === 0 ? (
                  <p className="text-[13px] text-cream/35">Ninguém entrou ainda.</p>
                ) : (
                  <div className="space-y-2">
                    {recentGuests.map((g) => (
                      <div key={g.id} className="flex items-center justify-between">
                        <span className="text-[13px] text-cream/80">{g.nickname || 'Anônimo'}</span>
                        <span className="font-mono text-[11px] tracking-wider text-cream-dim/80">{g.photoCount ?? 0} fotos</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card space-y-2 p-4">
                <p className="label-mono !text-[10px] text-cream/35">Detalhes</p>
                {[
                  ['Tipo', TYPE_LABEL[event.type] || event.type],
                  ['Fotos por convidado', event.photoLimitPerGuest === 0 ? 'Ilimitado' : (event.photoLimitPerGuest ?? 10)],
                  ['Criado em', createdAt],
                  ['Revelação', event.revealAt ? new Date(event.revealAt).toLocaleString('pt-BR') : 'Manual'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 text-[13px]">
                    <span className="shrink-0 text-cream/40">{k}</span>
                    <span className="truncate text-right text-cream/80">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recap vídeo — só exibe após revelação */}
            {event.status === 'revealed' && (
              <div className="card p-4">
                <p className="label-mono mb-3 !text-[10px] text-cream/35">Vídeo recap</p>
                {recapStatus === 'ready' && recapUrl ? (
                  <div className="space-y-3">
                    <video src={recapUrl} controls className="w-full rounded-xl" />
                    <a href={recapUrl} download className="btn-primary block rounded-2xl py-2.5 text-center text-sm">
                      Baixar recap
                    </a>
                  </div>
                ) : recapStatus === 'processing' ? (
                  <div className="flex items-center gap-3 text-sm text-cream/50">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-cream/20 border-t-cream/60" />
                    Gerando seu slideshow… isso pode levar alguns minutos.
                  </div>
                ) : recapStatus === 'failed' ? (
                  <div className="space-y-3">
                    <p className="text-sm text-red-300/70">Geração falhou. Verifique se o ffmpeg está instalado no servidor.</p>
                    <button onClick={handleGenerateRecap} disabled={recapGenerating}
                      className="btn-ghost rounded-2xl px-5 py-2 text-sm disabled:opacity-40">
                      Tentar novamente
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-cream/40">
                      Gere um slideshow com até 30 fotos do evento em formato MP4.
                    </p>
                    <button onClick={handleGenerateRecap} disabled={recapGenerating}
                      className="btn-ghost rounded-2xl px-5 py-2 text-sm disabled:opacity-40">
                      <Clapperboard size={14} />
                      {recapGenerating ? 'Iniciando…' : 'Gerar recap'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Fotos */}
        {tab === 'photos' && (
          <div className="animate-fadein">
            {photosLoading ? (
              <div className="flex justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-cream/15 border-t-cream/60" />
              </div>
            ) : photos.length === 0 ? (
              <div className="flex flex-col items-center py-20 text-center">
                <p className="font-serif text-2xl text-cream/40">Nenhuma foto ainda</p>
                <p className="mt-2 text-sm text-cream/25">As fotos dos convidados aparecem aqui.</p>
              </div>
            ) : (
              <>
                <p className="label-mono mb-4 text-cream/30">{photos.length} frames</p>
                <div className="columns-2 gap-2 sm:columns-3 lg:columns-4">
                  {photos.map((p, i) => (
                    <div key={p.id} className="group relative mb-2 overflow-hidden rounded-xl border border-cream/[0.06]">
                      <button className="block w-full" onClick={() => setLightbox(i)}>
                        {p.mediaType === 'video' ? (
                          <>
                            <video src={p.url} muted playsInline preload="metadata"
                              className="w-full transition-transform duration-300 group-hover:scale-[1.03]" />
                            <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink/60 backdrop-blur-sm">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="rgba(245,240,230,0.9)"><path d="M8 5v14l11-7z" /></svg>
                              </span>
                            </span>
                          </>
                        ) : (
                          <img src={p.thumbUrl || p.url} alt={`Foto ${i + 1}`} loading="lazy"
                            className="w-full transition-transform duration-300 group-hover:scale-[1.03]" />
                        )}
                      </button>
                      {/* Botão deletar — aparece no hover */}
                      <button
                        onClick={() => handleDeletePhoto(p.id)}
                        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-ink/70 text-cream/60 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:text-red-400"
                        title="Remover foto">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                      </button>
                      {p.guestNickname && (
                        <span className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-ink/80 to-transparent px-2 pb-1.5 pt-4 text-left text-[11px] text-cream/70 opacity-0 transition-opacity group-hover:opacity-100">
                          {p.guestNickname}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Lightbox */}
            {lightbox !== null && photos[lightbox] && (
              <div className="fixed inset-0 z-50 flex animate-fadein items-center justify-center bg-black/95 backdrop-blur-sm"
                onClick={() => setLightbox(null)}>
                <button className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/60 transition hover:bg-white/10 hover:text-white"
                  onClick={() => setLightbox(null)}><X size={17} /></button>
                <button className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/50 transition hover:bg-white/10 hover:text-white"
                  onClick={(e) => { e.stopPropagation(); setLightbox((s) => Math.max(0, s - 1)); }}><ChevronLeft size={19} /></button>
                {photos[lightbox].mediaType === 'video' ? (
                  <video src={photos[lightbox].url} autoPlay loop controls playsInline
                    className="max-h-[85vh] max-w-[90vw] rounded-2xl object-contain"
                    onClick={(e) => e.stopPropagation()} />
                ) : (
                  <img src={photos[lightbox].url} alt="Foto"
                    className="max-h-[85vh] max-w-[90vw] rounded-2xl object-contain"
                    onClick={(e) => e.stopPropagation()} />
                )}
                <button className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/50 transition hover:bg-white/10 hover:text-white"
                  onClick={(e) => { e.stopPropagation(); setLightbox((s) => Math.min(photos.length - 1, s + 1)); }}><ChevronRight size={19} /></button>
                <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-4">
                  <span className="film-counter">
                    {lightbox + 1} / {photos.length}
                    {photos[lightbox].guestNickname && <span className="text-cream/50"> · {photos[lightbox].guestNickname}</span>}
                  </span>
                  <button onClick={(e) => { e.stopPropagation(); handleDeletePhoto(photos[lightbox].id); }}
                    className="film-counter text-red-400/70 hover:text-red-400">remover</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Convidados */}
        {tab === 'guests' && (
          <div className="animate-fadein">
            <p className="mb-3 text-[13px] text-cream-dim">{guests.length} convidado(s)</p>
            {guests.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <p className="font-serif text-xl text-cream/35">Nenhum convidado ainda</p>
                <p className="mt-1 text-sm text-cream/25">Compartilhe o link ou QR Code.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {guests.map((g) => (
                  <div key={g.id} className="flex items-center justify-between rounded-xl border border-line/60 bg-surface px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">{g.nickname || 'Anônimo'}</p>
                      <p className="mt-0.5 text-xs text-cream/30">
                        {g.photoCount ?? 0} fotos · {new Date(g.createdAt).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <button onClick={() => handleBanGuest(g.id)} className="text-xs text-red-400/60 transition hover:text-red-400">
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* QR Code */}
        {tab === 'qr' && (
          <div className="flex animate-fadein justify-center">
            <div className="w-full max-w-sm card p-6">
              <QRCodeDisplay event={event} />
            </div>
          </div>
        )}
      </main>

      {/* Modal de edição */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex animate-fadein items-center justify-center bg-black/80 px-4 backdrop-blur-md"
          onClick={() => setEditOpen(false)}>
          <form onSubmit={handleSaveEdit}
            className="w-full max-w-md animate-scalein rounded-glass border border-line bg-ink p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-serif text-xl font-semibold tracking-tight">Editar evento</h2>
              <button type="button" onClick={() => setEditOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-cream-dim transition hover:bg-gold/[0.08] hover:text-cream">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label-mono mb-1.5 block text-cream/40">Nome</label>
                <input className="input-field" value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  required maxLength={80} />
              </div>

              <div>
                <label className="label-mono mb-1.5 block text-cream/40">Tipo</label>
                <select className="input-field" value={editForm.type}
                  onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value }))}>
                  {[['casamento','Casamento'],['festa','Festa'],['aniversario','Aniversário'],
                    ['corporativo','Corporativo'],['viagem','Viagem'],['outro','Outro']].map(([v,l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-mono mb-1.5 block text-cream/40">Início</label>
                  <input type="datetime-local" className="input-field text-sm" value={editForm.startsAt}
                    onChange={(e) => setEditForm((f) => ({ ...f, startsAt: e.target.value }))} />
                </div>
                <div>
                  <label className="label-mono mb-1.5 block text-cream/40">Encerramento</label>
                  <input type="datetime-local" className="input-field text-sm" value={editForm.endsAt}
                    onChange={(e) => setEditForm((f) => ({ ...f, endsAt: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="label-mono mb-1.5 block text-cream/40">Revelação</label>
                <input type="datetime-local" className="input-field text-sm" value={editForm.revealAt}
                  onChange={(e) => setEditForm((f) => ({ ...f, revealAt: e.target.value }))} />
              </div>

              <div>
                <label className="label-mono mb-1.5 block text-cream/40">
                  Fotos por convidado <span className="text-cream/25">(0 = ilimitado)</span>
                </label>
                <input type="number" min="0" max="200" className="input-field" value={editForm.photoLimitPerGuest}
                  onChange={(e) => setEditForm((f) => ({ ...f, photoLimitPerGuest: e.target.value }))} />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => setEditOpen(false)} className="btn-ghost flex-1 py-3">
                Cancelar
              </button>
              <button type="submit" disabled={editSaving} className="btn-primary flex-1 py-3 disabled:opacity-50">
                {editSaving ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}