import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { eventApi } from '../../api/eventApi';
import QRCodeDisplay from '../../components/QRCodeDisplay';
import api from '../../api/axios';
import toast from 'react-hot-toast';

function Loader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-white/60" />
    </div>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs uppercase tracking-widest text-white/30">{label}</p>
      <p className="mt-1.5 font-serif text-3xl">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-white/30">{sub}</p>}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    draft:    'badge-draft',
    active:   'badge-active',
    closed:   'badge-closed',
    revealed: 'badge-revealed',
  };
  const labels = {
    draft: 'Rascunho', active: 'Ativo', closed: 'Encerrado', revealed: 'Revelado',
  };
  return <span className={map[status] || 'badge-draft'}>{labels[status] || status}</span>;
}

export default function EventDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event,   setEvent]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [guests,  setGuests]  = useState([]);
  const [tab,     setTab]     = useState('overview'); // overview | guests | qr
  const [acting,  setActing]  = useState(false);

  useEffect(() => {
    eventApi.getOne(id)
      .then((d) => setEvent(d.event))
      .catch(() => navigate('/dashboard'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  useEffect(() => {
    if (tab === 'guests' && event) {
      eventApi.listGuests(event.id).then((d) => setGuests(d.guests || [])).catch(() => {});
    }
  }, [tab, event]);

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

  async function handleBanGuest(guestId) {
    if (!window.confirm('Remover este convidado?')) return;
    try {
      await eventApi.banGuest(event.id, guestId);
      setGuests((g) => g.filter((x) => x.id !== guestId));
      toast.success('Convidado removido.');
    } catch { toast.error('Erro.'); }
  }

  async function downloadZip() {
    const toastId = toast.loading('Gerando ZIP…');
    try {
      const res = await api.get(`/events/${event.id}/photos/zip`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = `${event.slug}-fotos.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Download iniciado!', { id: toastId });
    } catch {
      toast.error('Erro ao gerar ZIP.', { id: toastId });
    }
  }

  if (loading) return <Loader />;

  const guestUrl = `${window.location.origin}/e/${event.slug}`;
  const revealAt = event.revealAt ? new Date(event.revealAt).toLocaleString('pt-BR') : '—';
  const createdAt = new Date(event.createdAt).toLocaleDateString('pt-BR');

  return (
    <div className="min-h-screen bg-black text-cream">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-white/8 bg-black/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-6 py-4">
          <Link to="/dashboard" className="text-sm text-white/40 hover:text-white/70 transition">← Dashboard</Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-xl truncate">{event.name}</h1>
          </div>
          <StatusBadge status={event.status} />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* Tabs */}
        <div className="mb-8 flex gap-1 rounded-2xl border border-white/8 bg-white/5 p-1">
          {[['overview','Visão geral'],['guests','Convidados'],['qr','QR Code']].map(([key,label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 rounded-xl py-2 text-sm font-medium transition-all ${
                tab === key ? 'bg-white text-black' : 'text-white/40 hover:text-white/70'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === 'overview' && (
          <div className="space-y-6 animate-fadein">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Fotos"      value={event.photoCount  ?? 0} />
              <StatCard label="Convidados" value={event.guestCount  ?? 0} />
              <StatCard label="Criado em"  value={createdAt} />
              <StatCard label="Revelação"  value={event.revealAt ? revealAt.split(',')[0] : 'Manual'} />
            </div>

            {/* Guest link */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="mb-2 text-xs uppercase tracking-widest text-white/30">Link do evento</p>
              <div className="flex items-center gap-3 flex-wrap">
                <code className="flex-1 truncate rounded-xl bg-black/40 px-4 py-2.5 text-sm text-cream/70">
                  {guestUrl}
                </code>
                <button
                  onClick={() => { navigator.clipboard.writeText(guestUrl); toast.success('Link copiado!'); }}
                  className="btn-ghost rounded-xl px-4 py-2 text-sm"
                >
                  Copiar
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="mb-4 text-xs uppercase tracking-widest text-white/30">Ações</p>
              <div className="flex flex-wrap gap-3">
                {event.status === 'draft' && (
                  <button
                    disabled={acting}
                    onClick={async () => {
                      setActing(true);
                      try {
                        const d = await eventApi.update(event.id, { status: 'active' });
                        setEvent(d.event);
                        toast.success('Evento publicado!');
                      } catch { toast.error('Erro.'); }
                      finally { setActing(false); }
                    }}
                    className="btn-film rounded-2xl px-5 py-2.5 text-sm"
                  >
                    Publicar evento
                  </button>
                )}
                {event.status === 'active' && (
                  <button disabled={acting} onClick={handleClose} className="btn-ghost rounded-2xl px-5 py-2.5 text-sm">
                    Encerrar evento
                  </button>
                )}
                {(event.status === 'closed') && (
                  <button disabled={acting} onClick={handleReveal} className="btn-primary rounded-2xl px-5 py-2.5 text-sm">
                    Revelar fotos agora
                  </button>
                )}
                {event.status === 'revealed' && (
                  <button onClick={downloadZip} className="btn-ghost rounded-2xl px-5 py-2.5 text-sm">
                    Baixar ZIP
                  </button>
                )}
                <Link to={`/e/${event.slug}/album`} target="_blank" className="btn-ghost rounded-2xl px-5 py-2.5 text-sm">
                  Ver álbum ↗
                </Link>
              </div>
            </div>

            {/* Event details */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
              <p className="text-xs uppercase tracking-widest text-white/30">Detalhes</p>
              {[
                ['Tipo', event.eventType],
                ['Fotos por convidado', event.photoLimitPerGuest ?? 30],
                ['Descrição', event.description || '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span className="text-white/40">{k}</span>
                  <span className="text-cream/80 capitalize">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Guests */}
        {tab === 'guests' && (
          <div className="animate-fadein">
            <p className="mb-4 text-sm text-white/30">{guests.length} convidado(s)</p>
            {guests.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <p className="font-serif text-xl text-white/30">Nenhum convidado ainda</p>
                <p className="mt-1 text-sm text-white/20">Compartilhe o link ou QR Code.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {guests.map((g) => (
                  <div key={g.id} className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/5 px-5 py-4">
                    <div>
                      <p className="font-medium text-sm">{g.nickname}</p>
                      <p className="text-xs text-white/30 mt-0.5">{g.photosUploaded ?? 0} fotos · {new Date(g.createdAt).toLocaleString('pt-BR')}</p>
                    </div>
                    <button
                      onClick={() => handleBanGuest(g.id)}
                      className="text-xs text-red-400/60 hover:text-red-400 transition"
                    >
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
          <div className="flex justify-center animate-fadein">
            <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 p-8">
              <QRCodeDisplay event={event} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
