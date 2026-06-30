import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { eventApi } from '../../api/eventApi';
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
    <div className="card p-5">
      <p className="label-mono text-cream/35">{label}</p>
      <p className={`mt-2 font-mono text-2xl ${done ? 'text-cream/40' : 'text-cream'}`}>
        {done ? '—' : `${hh}:${mm}:${ss}`}
      </p>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="card p-5">
      <p className="font-serif text-3xl text-cream">{value}</p>
      <p className="label-mono mt-1.5 text-cream/35">{label}</p>
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

  async function handlePublish() {
    setActing(true);
    try {
      const d = await eventApi.publish(event.id);
      setEvent(d.event);
      toast.success('Evento publicado!');
    } catch { toast.error('Erro ao publicar.'); }
    finally { setActing(false); }
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
      <header className="sticky top-0 z-10 border-b border-cream/[0.06] bg-ink/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-6 py-4">
          <Link to="/dashboard" className="text-sm text-cream/40 transition hover:text-cream/70">← Eventos</Link>
          <span className="flex-1" />
          {event.status === 'draft' && (
            <button disabled={acting} onClick={handlePublish} className="btn-primary px-4 py-2 text-sm">Publicar</button>
          )}
          {event.status === 'active' && (
            <button disabled={acting} onClick={handleClose} className="btn-ghost px-4 py-2 text-sm">Encerrar</button>
          )}
          {(event.status === 'active' || event.status === 'closed') && (
            <button disabled={acting} onClick={handleReveal} className="btn-primary px-4 py-2 text-sm">Revelar agora</button>
          )}
          {event.status === 'revealed' && (
            <button onClick={downloadZip} className="btn-primary px-4 py-2 text-sm">Baixar todas</button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* Título */}
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-3">
            <StatusBadge status={event.status} />
            <span className="label-mono text-cream/35">{TYPE_LABEL[event.type] || 'Evento'}</span>
          </div>
          <h1 className="font-serif text-4xl">{event.name}</h1>
        </div>

        {/* Countdowns */}
        {(event.status === 'active' || event.status === 'closed') && (
          <div className="mb-6 grid gap-3 sm:grid-cols-2">
            {event.endsAt && event.status === 'active' && (
              <CountdownPanel label="Encerramento em" target={event.endsAt} />
            )}
            {event.revealAt && !event.isRevealed && (
              <CountdownPanel label="Revelação em" target={event.revealAt} />
            )}
          </div>
        )}

        {/* Stats */}
        <div className="mb-8 grid grid-cols-3 gap-3">
          <StatCard label="Convidados" value={guestCount} />
          <StatCard label="Fotos" value={photoCount} />
          <StatCard label="Por pessoa" value={perPerson} />
        </div>

        {/* Tabs */}
        <div className="mb-8 flex gap-1 rounded-2xl border border-cream/[0.06] bg-cream/[0.03] p-1">
          {[['overview', 'Visão geral'], ['guests', `Convidados · ${guestCount}`], ['qr', 'QR Code']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 rounded-xl py-2 text-sm font-medium transition-all ${
                tab === key ? 'bg-gold text-ink' : 'text-cream/45 hover:text-cream/75'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Visão geral */}
        {tab === 'overview' && (
          <div className="animate-fadein space-y-6">
            {/* Link */}
            <div className="card p-5">
              <p className="label-mono mb-2 text-cream/35">Link do evento</p>
              <div className="flex flex-wrap items-center gap-3">
                <code className="flex-1 truncate rounded-xl bg-ink-deep/60 px-4 py-2.5 text-sm text-cream/70">{guestUrl}</code>
                <button onClick={() => { navigator.clipboard.writeText(guestUrl); toast.success('Link copiado!'); }}
                  className="btn-ghost px-4 py-2 text-sm">Copiar link</button>
                <button onClick={() => setTab('qr')} className="btn-ghost px-4 py-2 text-sm">Ver QR Code</button>
              </div>
            </div>

            {/* Últimos convidados */}
            <div className="card p-5">
              <p className="label-mono mb-4 text-cream/35">Últimos convidados</p>
              {recentGuests.length === 0 ? (
                <p className="text-sm text-cream/35">Ninguém entrou ainda.</p>
              ) : (
                <div className="space-y-3">
                  {recentGuests.map((g) => (
                    <div key={g.id} className="flex items-center justify-between">
                      <span className="text-sm text-cream/80">{g.nickname || 'Anônimo'}</span>
                      <span className="film-counter">{g.photoCount ?? 0} fotos</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Detalhes */}
            <div className="card space-y-3 p-5">
              <p className="label-mono text-cream/35">Detalhes</p>
              {[
                ['Tipo', TYPE_LABEL[event.type] || event.type],
                ['Fotos por convidado', event.photoLimitPerGuest === 0 ? 'Ilimitado' : (event.photoLimitPerGuest ?? 10)],
                ['Criado em', createdAt],
                ['Revelação', event.revealAt ? new Date(event.revealAt).toLocaleString('pt-BR') : 'Manual'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span className="text-cream/40">{k}</span>
                  <span className="text-cream/80">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Convidados */}
        {tab === 'guests' && (
          <div className="animate-fadein">
            <p className="mb-4 text-sm text-cream/35">{guests.length} convidado(s)</p>
            {guests.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <p className="font-serif text-xl text-cream/35">Nenhum convidado ainda</p>
                <p className="mt-1 text-sm text-cream/25">Compartilhe o link ou QR Code.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {guests.map((g) => (
                  <div key={g.id} className="flex items-center justify-between rounded-2xl border border-cream/[0.06] bg-cream/[0.03] px-5 py-4">
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
            <div className="w-full max-w-sm card p-8">
              <QRCodeDisplay event={event} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
