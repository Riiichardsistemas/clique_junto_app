import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ChevronLeft, ChevronRight, Pencil, Trash2, Rocket, Lock, Sparkles, Download,
  Copy, QrCode, Clapperboard, X, Images, CreditCard, Palette, Monitor, MoreHorizontal,
  Heart, PartyPopper, Cake, Briefcase, Plane, Camera as CameraIcon, Share2,
} from 'lucide-react';
import { eventApi } from '../../api/eventApi';
import { photoApi } from '../../api/photoApi';
import api from '../../api/axios';
import QRCodeDisplay from '../../components/QRCodeDisplay';
import PageLoader from '../../components/ui/PageLoader';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import MobileActionSheet from '../../components/ui/MobileActionSheet';
import useLightboxNavigation from '../../hooks/useLightboxNavigation';

const TYPE_LABEL = {
  casamento: 'Casamento', festa: 'Festa', aniversario: 'Aniversário',
  corporativo: 'Corporativo', viagem: 'Viagem', outro: 'Evento',
};

// Ícone e cor por tipo — aparece junto ao nome no cabeçalho (mockup: ❤️ vermelho)
const TYPE_META = {
  casamento:   { Icon: Heart,       cls: 'text-red-400' },
  festa:       { Icon: PartyPopper, cls: 'text-gold' },
  aniversario: { Icon: Cake,        cls: 'text-pink-300' },
  corporativo: { Icon: Briefcase,   cls: 'text-blue-300' },
  viagem:      { Icon: Plane,       cls: 'text-sky-300' },
  outro:       { Icon: CameraIcon,  cls: 'text-gold' },
};

const STATUS_META = {
  draft:    { label: 'Rascunho',  dot: 'bg-cream/40' },
  active:   { label: 'Ativo',     dot: 'bg-emerald-400' },
  closed:   { label: 'Encerrado', dot: 'bg-amber-400' },
  revealed: { label: 'Revelado',  dot: 'bg-gold' },
};

function StatusBadge({ status }) {
  const map = { draft: 'badge-draft', active: 'badge-active', closed: 'badge-closed', revealed: 'badge-revealed' };
  const labels = { draft: 'Rascunho', active: 'Ativo', closed: 'Encerrado', revealed: 'Revelado' };
  return <span className={map[status] || 'badge-draft'}>{labels[status] || status}</span>;
}

function timeAgo(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'agora mesmo';
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
  return `há ${Math.floor(s / 86400)} d`;
}

// Cartão dourado do mockup: rótulo + data à esquerda, contagem grande à direita
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
  const d = new Date(target);
  const when = `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}, ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-gold/[0.18] bg-gradient-to-br from-gold/[0.10] via-gold/[0.05] to-transparent px-4 py-3.5">
      <div className="min-w-0">
        <p className="label-mono !text-[10px] text-gold/75">{label}</p>
        <p className="mt-1 font-mono text-[11px] tracking-wider text-cream/40">{when}</p>
      </div>
      <p className={`shrink-0 font-mono text-[27px] font-semibold tracking-tight ${done ? 'text-cream/35' : 'text-gold-light'}`}>
        {done ? '—' : `${hh}:${mm}:${ss}`}
      </p>
    </div>
  );
}

function StatCell({ label, value }) {
  return (
    <div className="card flex flex-col items-center rounded-2xl py-4">
      <p className="font-serif text-[26px] font-semibold leading-none text-cream">{value}</p>
      <p className="label-mono mt-2 !text-[9.5px] text-cream/35">{label}</p>
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
  const [confirmation, setConfirmation] = useState(null);
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const confirmationResolve = useRef(null);

  function askConfirmation(options) {
    setConfirmation(options);
    return new Promise((resolve) => { confirmationResolve.current = resolve; });
  }

  function settleConfirmation(result) {
    confirmationResolve.current?.(result);
    confirmationResolve.current = null;
    setConfirmation(null);
  }

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
    api.get(`/recap/${event.id}/status`).then((r) => {
      setRecapStatus(r.data.recapStatus || null);
      setRecapUrl(r.data.recapVideoUrl || null);
    }).catch(() => {});
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

  useLightboxNavigation(lightbox, setLightbox, photos.length);

  async function handleDeletePhoto(photoId) {
    if (!await askConfirmation({
      title: 'Remover esta foto?',
      description: 'A foto deixará de aparecer no álbum e não poderá ser recuperada.',
      confirmLabel: 'Remover foto',
      danger: true,
    })) return;
    try {
      await photoApi.remove(photoId);
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
    if (!await askConfirmation({
      title: 'Encerrar o evento?',
      description: 'Os convidados não poderão mais enviar fotos. Você ainda poderá revelar o álbum depois.',
      confirmLabel: 'Encerrar evento',
    })) return;
    setActing(true);
    try {
      const d = await eventApi.close(event.id);
      setEvent(d.event);
      toast.success('Evento encerrado!');
    } catch { toast.error('Erro ao encerrar.'); }
    finally { setActing(false); }
  }

  async function handleReveal() {
    if (!await askConfirmation({
      title: 'Revelar todas as fotos?',
      description: 'O álbum ficará disponível para os participantes imediatamente.',
      confirmLabel: 'Revelar agora',
    })) return;
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
    if (!await askConfirmation({
      title: `Excluir “${event.name}”?`,
      description: 'O evento, os convidados e todas as fotos serão removidos permanentemente.',
      confirmLabel: 'Excluir evento',
      danger: true,
    })) return;
    setActing(true);
    try {
      await eventApi.delete(event.id);
      toast.success('Evento excluído.');
      navigate('/dashboard');
    } catch { toast.error('Erro ao excluir.'); setActing(false); }
  }

  async function handleBanGuest(guestId) {
    if (!await askConfirmation({
      title: 'Remover este convidado?',
      description: 'O acesso desta participação será encerrado, sem apagar as fotos já enviadas.',
      confirmLabel: 'Remover convidado',
      danger: true,
    })) return;
    try {
      await eventApi.banGuest(event.id, guestId, true);
      setGuests((g) => g.filter((x) => x.id !== guestId));
      toast.success('Convidado removido.');
    } catch { toast.error('Erro.'); }
  }

  async function handleShare() {
    const url = `${window.location.origin}/e/${event.slug}`;
    const text = `✨ Você foi convidado para "${event.name}"!\nAcesse e tire suas fotos: ${url}`;
    if (navigator.share) {
      try { await navigator.share({ title: event.name, text, url }); } catch { /* cancelado */ }
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
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

  if (loading) return <PageLoader label="Carregando evento" />;

  const guestUrl = `${window.location.origin}/e/${event.slug}`;
  const createdAt = new Date(event.createdAt).toLocaleDateString('pt-BR');
  const photoCount = event.photoCount ?? 0;
  const guestCount = event.guestCount ?? 0;
  const perPerson = guestCount > 0 ? (photoCount / guestCount).toFixed(1) : '0';
  const recentGuests = [...guests].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

  return (
    <div className="app-screen flex flex-col text-cream">
      <header className="app-topbar glass sticky top-0 z-20">
        <div className="mx-auto flex min-h-[60px] max-w-3xl items-center gap-3 px-3 py-1.5 sm:hidden">
          <Link to="/dashboard" aria-label="Voltar para eventos"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-cream-dim transition hover:text-cream">
            <ChevronLeft size={18} />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 font-serif text-[17px] font-semibold leading-tight text-cream">
              {(() => { const { Icon, cls } = TYPE_META[event.type] || TYPE_META.outro; return <Icon size={15} className={`shrink-0 ${cls}`} fill="currentColor" strokeWidth={1.5} />; })()}
              <span className="truncate">{event.name}</span>
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-cream/40">
              <span className={`h-1.5 w-1.5 rounded-full ${(STATUS_META[event.status] || STATUS_META.draft).dot}`} />
              <span className="font-medium text-cream/60">{(STATUS_META[event.status] || STATUS_META.draft).label}</span>
              <span>· {TYPE_LABEL[event.type] || 'Evento'}</span>
            </p>
          </div>
          <button type="button" onClick={() => setMobileActionsOpen(true)} aria-label="Mais ações do evento"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-cream-dim transition hover:text-cream">
            <MoreHorizontal size={19} />
          </button>
        </div>
        <div className="mx-auto hidden max-w-3xl flex-wrap items-center gap-x-1.5 gap-y-1 px-4 py-2.5 sm:flex sm:px-6">
          <Link to="/dashboard" className="inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-sm text-cream-dim transition hover:text-cream">
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
          <button type="button" onClick={handleDelete} disabled={acting}
            className="icon-button !h-10 !w-10 text-red-400/60 hover:text-red-400 disabled:opacity-40"
            title="Excluir" aria-label="Excluir evento">
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
          {(event.status === 'active' || (event.status === 'revealed' && event.isAcceptingPhotos)) && (
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

      <MobileActionSheet open={mobileActionsOpen} title="Ações do evento" onClose={() => setMobileActionsOpen(false)}>
        <div className="space-y-2" onClick={() => setMobileActionsOpen(false)}>
          {(event.photoCount ?? 0) > 0 && (
            <Link to={`/events/${event.id}/album`} className="flex min-h-12 w-full items-center gap-3 rounded-2xl border border-line bg-white/[0.025] px-4 text-sm font-semibold text-cream">
              <Images size={18} className="text-gold" /> Ver álbum
            </Link>
          )}
          <button type="button" onClick={openEdit} className="flex min-h-12 w-full items-center gap-3 rounded-2xl border border-line bg-white/[0.025] px-4 text-sm font-semibold text-cream">
            <Pencil size={18} className="text-gold" /> Editar informações
          </button>
          <Link to={`/events/${event.id}/personalizar`} className="flex min-h-12 w-full items-center gap-3 rounded-2xl border border-line bg-white/[0.025] px-4 text-sm font-semibold text-cream">
            <Palette size={18} className="text-gold" /> Personalizar experiência
          </Link>
          {event.slideshowKey && (
            <a href={`/telao/${event.slideshowKey}`} target="_blank" rel="noreferrer" className="flex min-h-12 w-full items-center gap-3 rounded-2xl border border-line bg-white/[0.025] px-4 text-sm font-semibold text-cream">
              <Monitor size={18} className="text-gold" /> Abrir telão
            </a>
          )}
          {(event.status === 'active' || (event.status === 'revealed' && event.isAcceptingPhotos)) && (
            <button type="button" disabled={acting} onClick={handleClose} className="flex min-h-12 w-full items-center gap-3 rounded-2xl border border-line bg-white/[0.025] px-4 text-sm font-semibold text-cream">
              <Lock size={18} className="text-warning" /> Encerrar evento
            </button>
          )}
          <button type="button" disabled={acting} onClick={handleDelete} className="flex min-h-12 w-full items-center gap-3 rounded-2xl border border-danger/20 bg-danger/[0.055] px-4 text-sm font-semibold text-danger">
            <Trash2 size={18} /> Excluir evento
          </button>
        </div>
      </MobileActionSheet>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-5 sm:px-6 sm:py-6">
        {/* Título — no mobile ele vive no cabeçalho; aqui só no desktop */}
        <div className="mb-5 hidden flex-wrap items-center gap-x-3 gap-y-1.5 sm:flex">
          <h1 className="font-serif text-3xl font-semibold tracking-tight">{event.name}</h1>
          <StatusBadge status={event.status} />
          <span className="label-mono !text-[10px] text-cream/35">{TYPE_LABEL[event.type] || 'Evento'}</span>
        </div>

        {/* Countdowns */}
        {(event.status === 'active' || event.status === 'closed' || event.isAcceptingPhotos) && (
          <div className="mb-3 grid gap-2 sm:grid-cols-2">
            {event.endsAt && event.isAcceptingPhotos && (
              <CountdownPanel label="Encerramento em" target={event.endsAt} />
            )}
            {event.revealAt && !event.isRevealed && (
              <CountdownPanel label="Revelação em" target={event.revealAt} />
            )}
          </div>
        )}

        {/* Stats — três cartões separados, números grandes (mockup) */}
        <div className="mb-3 grid grid-cols-3 gap-2">
          <StatCell label="Convidados" value={guestCount} />
          <StatCell label="Fotos" value={photoCount} />
          <StatCell label="Por pessoa" value={perPerson} />
        </div>

        {/* Tabs — pills roláveis com badge de contagem (mockup) */}
        <div className="scrollbar-hide mb-4 flex gap-2 overflow-x-auto pb-1 sm:mb-5" role="tablist" aria-label="Seções do evento">
          {[['overview', 'Visão geral', null], ['photos', 'Fotos', photoCount], ['guests', 'Convidados', guestCount], ['qr', 'QR Code', null]].map(([key, label, count]) => (
            <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
              className={`flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-[13px] font-semibold transition-all duration-200 ${
                tab === key
                  ? 'border-gold bg-gold text-[#1c160c] shadow-[0_4px_16px_-4px_rgba(196,169,108,0.5)]'
                  : 'border-line bg-surface text-cream-dim hover:border-gold/30 hover:text-cream'}`}>
              {label}
              {count != null && count > 0 && (
                <span className={`rounded-full px-1.5 py-px text-[10px] font-bold ${
                  tab === key ? 'bg-black/15' : 'bg-white/[0.08] text-cream/60'}`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Visão geral */}
        {tab === 'overview' && (
          <div className="animate-fadein space-y-3">
            {/* Link do evento — campo + Copiar dourado, QR Code e Compartilhar (mockup) */}
            <div className="card p-4">
              <p className="label-mono mb-3 !text-[10px] text-cream/35">Link do evento</p>
              <div className="flex items-stretch gap-2">
                <code className="flex min-w-0 flex-1 items-center truncate rounded-xl border border-line/60 bg-black/40 px-3 py-2.5 font-mono text-[12px] text-cream/80">
                  {(() => { const u = guestUrl.replace(/^https?:\/\//, ''); return u.length > 30 ? `…${u.slice(-28)}` : u; })()}
                </code>
                <button onClick={() => { navigator.clipboard.writeText(guestUrl); toast.success('Link copiado!'); }}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gold px-4 text-[13px] font-bold text-[#1c160c] transition hover:brightness-105 active:scale-[0.97]">
                  <Copy size={14} />
                  Copiar
                </button>
              </div>
              <div className="mt-2.5 flex gap-2">
                <button onClick={() => setTab('qr')} className="btn-ghost h-11 min-h-11 flex-1 rounded-full text-[13px]">
                  <QrCode size={15} />
                  QR Code
                </button>
                <button onClick={handleShare} className="btn-ghost h-11 min-h-11 flex-1 rounded-full text-[13px]">
                  <Share2 size={15} />
                  Compartilhar
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
                  <div className="space-y-3">
                    {recentGuests.map((g) => (
                      <div key={g.id} className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-white/[0.05] font-serif text-[13px] font-semibold text-cream/85">
                          {(g.nickname || 'A').trim().charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-semibold leading-tight text-cream">{g.nickname || 'Anônimo'}</p>
                          <p className="mt-0.5 text-[11px] text-cream/35">{timeAgo(g.createdAt)}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-white/[0.07] px-2.5 py-1 text-[11px] font-medium text-cream/60">
                          {g.photoCount ?? 0} fotos
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card p-4">
                <p className="label-mono mb-1 !text-[10px] text-cream/35">Detalhes</p>
                <div className="divide-y divide-line/40">
                  {[
                    ['Tipo', TYPE_LABEL[event.type] || event.type],
                    ['Fotos por convidado', event.photoLimitPerGuest === 0 ? 'Ilimitado' : (event.photoLimitPerGuest ?? 10)],
                    ['Criado em', createdAt],
                    ['Revelação', event.revealAt ? new Date(event.revealAt).toLocaleString('pt-BR') : 'Imediata'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between gap-3 py-2.5 text-[13px]">
                      <span className="shrink-0 text-gold/55">{k}</span>
                      <span className="truncate text-right font-semibold text-cream">{v}</span>
                    </div>
                  ))}
                </div>
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
                        className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-full bg-ink/70 text-cream/60 backdrop-blur-sm transition-opacity hover:text-red-400 sm:right-2 sm:top-2 sm:h-7 sm:w-7 sm:opacity-0 sm:group-hover:opacity-100"
                        title="Remover foto">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                      </button>
                      {p.guestNickname && (
                        <span className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-ink/80 to-transparent px-2 pb-1.5 pt-4 text-left text-[11px] text-cream/70 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
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
                role="dialog" aria-modal="true" aria-label={`Foto ${lightbox + 1} de ${photos.length}`}
                onClick={() => setLightbox(null)}>
                <button type="button" aria-label="Fechar foto" className="safe-fixed-top icon-button absolute right-4 border-white/10 bg-white/[0.06] text-white/60 hover:text-white sm:right-5"
                  onClick={() => setLightbox(null)}><X size={17} /></button>
                <button type="button" aria-label="Foto anterior" className="icon-button absolute left-3 top-1/2 -translate-y-1/2 border-white/10 bg-white/[0.06] text-white/50 hover:text-white"
                  onClick={(e) => { e.stopPropagation(); setLightbox((s) => Math.max(0, s - 1)); }}><ChevronLeft size={19} /></button>
                {photos[lightbox].mediaType === 'video' ? (
                  <video src={photos[lightbox].url} autoPlay loop controls playsInline
                    className="lightbox-media max-w-[90vw] rounded-2xl object-contain"
                    onClick={(e) => e.stopPropagation()} />
                ) : (
                  <img src={photos[lightbox].url} alt="Foto"
                    className="lightbox-media max-w-[90vw] rounded-2xl object-contain"
                    onClick={(e) => e.stopPropagation()} />
                )}
                <button type="button" aria-label="Próxima foto" className="icon-button absolute right-3 top-1/2 -translate-y-1/2 border-white/10 bg-white/[0.06] text-white/50 hover:text-white"
                  onClick={(e) => { e.stopPropagation(); setLightbox((s) => Math.min(photos.length - 1, s + 1)); }}><ChevronRight size={19} /></button>
                <div className="safe-fixed-bottom absolute left-1/2 flex -translate-x-1/2 items-center gap-4">
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

      {/* Sticky (e não fixed): ver comentário em .mobile-action-bar no index.css */}
      <div className="sticky bottom-0 z-30 border-t border-line bg-ink/90 px-4 pt-3 backdrop-blur-xl sm:hidden" style={{ paddingBottom: 'max(.75rem, env(safe-area-inset-bottom))' }}>
        {event.status === 'draft' && event.isPaid && (
          <button disabled={acting} onClick={handlePublish} className="btn-primary w-full"><Rocket size={17} /> Publicar evento</button>
        )}
        {event.status === 'draft' && !event.isPaid && (
          <button disabled={acting} onClick={handlePay} className="btn-primary w-full"><CreditCard size={17} /> Pagar e ativar</button>
        )}
        {(event.status === 'active' || event.status === 'closed') && (
          <button disabled={acting} onClick={handleReveal} className="btn-primary w-full"><Sparkles size={17} /> Revelar agora</button>
        )}
        {event.status === 'revealed' && (
          <button onClick={downloadZip} className="btn-primary w-full"><Download size={17} /> Baixar todas</button>
        )}
      </div>

      {/* Modal de edição */}
      {editOpen && (
        <div className="dialog-backdrop animate-fadein"
          onClick={() => setEditOpen(false)}>
          <form onSubmit={handleSaveEdit}
            className="dialog-panel max-h-[90dvh] overflow-y-auto"
            role="dialog" aria-modal="true" aria-labelledby="edit-event-title"
            onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <h2 id="edit-event-title" className="font-serif text-xl font-semibold tracking-tight">Editar evento</h2>
              <button type="button" onClick={() => setEditOpen(false)}
                className="icon-button -mr-2 -mt-2" aria-label="Fechar edição">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label-mono mb-1.5 block text-cream/40">Nome</label>
                <input aria-label="Nome do evento" className="input-field" value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  required maxLength={80} />
              </div>

              <div>
                <label className="label-mono mb-1.5 block text-cream/40">Tipo</label>
                <select aria-label="Tipo do evento" className="input-field" value={editForm.type}
                  onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value }))}>
                  {[['casamento','Casamento'],['festa','Festa'],['aniversario','Aniversário'],
                    ['corporativo','Corporativo'],['viagem','Viagem'],['outro','Outro']].map(([v,l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label-mono mb-1.5 block text-cream/40">Início</label>
                  <input aria-label="Início do evento" type="datetime-local" className="input-field text-sm" value={editForm.startsAt}
                    onChange={(e) => setEditForm((f) => ({ ...f, startsAt: e.target.value }))} />
                </div>
                <div>
                  <label className="label-mono mb-1.5 block text-cream/40">Encerramento</label>
                  <input aria-label="Encerramento do evento" type="datetime-local" className="input-field text-sm" value={editForm.endsAt}
                    onChange={(e) => setEditForm((f) => ({ ...f, endsAt: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="label-mono mb-1.5 block text-cream/40">Revelação</label>
                <input aria-label="Revelação do álbum" type="datetime-local" className="input-field text-sm" value={editForm.revealAt}
                  onChange={(e) => setEditForm((f) => ({ ...f, revealAt: e.target.value }))} />
              </div>

              <div>
                <label className="label-mono mb-1.5 block text-cream/40">
                  Fotos por convidado <span className="text-cream/25">(0 = ilimitado)</span>
                </label>
                <input aria-label="Fotos por convidado" type="number" min="0" max="200" className="input-field" value={editForm.photoLimitPerGuest}
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

      <ConfirmDialog
        open={!!confirmation}
        {...confirmation}
        busy={acting}
        onCancel={() => settleConfirmation(false)}
        onConfirm={() => settleConfirmation(true)}
      />
    </div>
  );
}
