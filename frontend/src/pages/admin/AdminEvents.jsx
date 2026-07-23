import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  CalendarDays, ChevronRight, Clock3, ExternalLink, Eye, HardDrive, Image,
  ImagePlus, Loader2, Lock, Save, Search, Trash2, UserRound, Users, XCircle,
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminDrawer from '../../components/admin/AdminDrawer';
import AdminPagination from '../../components/admin/AdminPagination';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { adminApi } from '../../api/adminApi';
import { PLANS, getPlan } from '../../utils/plans';
import { formatBytes, formatDateTime } from '../../utils/admin';

const PAGE_SIZE = 20;
const STATUS_LABEL = { draft: 'Rascunho', active: 'Ativo', closed: 'Encerrado', revealed: 'Revelado' };

export default function AdminEvents() {
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('');
  const [planId, setPlanId] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 320);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.events({ search: debouncedSearch, status, planId, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE })
      .then((data) => { setEvents(data.events); setTotal(data.total); })
      .catch(() => toast.error('Não foi possível carregar os eventos.'))
      .finally(() => setLoading(false));
  }, [debouncedSearch, status, planId, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [debouncedSearch, status, planId]);

  const loadDetail = useCallback((id) => {
    if (!id) return;
    setDetailLoading(true);
    adminApi.event(id)
      .then(setDetail)
      .catch(() => { toast.error('Não foi possível abrir o evento.'); setSelectedId(null); })
      .finally(() => setDetailLoading(false));
  }, []);

  useEffect(() => { loadDetail(selectedId); }, [selectedId, loadDetail]);

  async function performAction() {
    if (!confirmation) return;
    setActing(true);
    try {
      if (confirmation.type === 'close') await adminApi.closeEvent(confirmation.event.id);
      if (confirmation.type === 'reveal') await adminApi.revealEvent(confirmation.event.id);
      if (confirmation.type === 'delete') await adminApi.deleteEvent(confirmation.event.id);
      toast.success({ close: 'Evento encerrado.', reveal: 'Álbum revelado.', delete: 'Evento excluído.' }[confirmation.type]);
      setConfirmation(null);
      load();
      if (confirmation.type === 'delete') {
        setSelectedId(null);
        setDetail(null);
      } else {
        loadDetail(confirmation.event.id);
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Não foi possível concluir a ação.');
    } finally {
      setActing(false);
    }
  }

  const confirmationCopy = useMemo(() => {
    if (!confirmation) return {};
    const name = confirmation.event.name;
    if (confirmation.type === 'close') return {
      title: 'Encerrar este evento?',
      description: `“${name}” deixará de aceitar novos envios. As fotos e os convidados existentes serão preservados.`,
      label: 'Encerrar evento',
    };
    if (confirmation.type === 'reveal') return {
      title: 'Revelar o álbum agora?',
      description: `Todas as mídias de “${name}” ficarão visíveis e os convidados com email serão avisados.`,
      label: 'Revelar álbum',
    };
    return {
      title: 'Excluir evento permanentemente?',
      description: `“${name}”, seus convidados, cobranças e todas as mídias armazenadas serão removidos. Esta ação não pode ser desfeita.`,
      label: 'Excluir permanentemente',
      danger: true,
    };
  }, [confirmation]);

  return (
    <AdminLayout
      title="Eventos"
      description="Supervisione o ciclo de vida dos eventos e intervenha apenas quando a operação exigir."
      actions={<span className="badge-draft"><CalendarDays size={13} /> {total} {total === 1 ? 'evento' : 'eventos'}</span>}
    >
      <section className="mb-5 grid gap-3 lg:grid-cols-[minmax(260px,1fr),180px,210px]">
        <label className="admin-search">
          <Search size={16} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Evento, slug ou organizador…" aria-label="Buscar eventos" />
        </label>
        <select className="input-field" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filtrar por status">
          <option value="">Todos os status</option>
          <option value="draft">Rascunhos</option>
          <option value="active">Ativos</option>
          <option value="closed">Encerrados</option>
          <option value="revealed">Revelados</option>
        </select>
        <select className="input-field" value={planId} onChange={(event) => setPlanId(event.target.value)} aria-label="Filtrar por plano">
          <option value="">Todos os planos</option>
          {PLANS.map((plan) => <option key={plan.id} value={plan.id}>{plan.label}</option>)}
        </select>
      </section>

      <section className="card overflow-hidden">
        <div className="hidden grid-cols-[minmax(240px,1fr),150px,150px,130px,70px] gap-4 border-b border-line bg-white/[0.018] px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.16em] text-cream-dim/70 md:grid">
          <span>Evento</span><span>Organizador</span><span>Uso</span><span>Status</span><span className="text-right">Abrir</span>
        </div>
        {loading ? (
          <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-cream-dim"><Loader2 className="animate-spin text-gold" /> Carregando eventos…</div>
        ) : events.length ? (
          <div className="divide-y divide-line/60">
            {events.map((event) => (
              <button key={event.id} type="button" onClick={() => { setDetail(null); setSelectedId(event.id); }} className="grid w-full grid-cols-[1fr,auto] items-center gap-4 px-5 py-4 text-left transition hover:bg-white/[0.025] md:grid-cols-[minmax(240px,1fr),150px,150px,130px,70px]">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-cream">{event.name}</span>
                  <span className="mt-1 block truncate font-mono text-[11px] text-cream-dim">/{event.slug} · {getPlan(event.planId)?.label || event.planId}</span>
                </span>
                <span className="hidden min-w-0 md:block"><span className="block truncate text-sm text-cream">{event.organizer?.name || '—'}</span><span className="block truncate text-[11px] text-cream-dim">{event.organizer?.email}</span></span>
                <span className="hidden text-xs text-cream-dim md:block">{event.photoCount} mídias<br />{event.guestCount} convidados</span>
                <span className="hidden md:block"><span className={`badge-${event.status}`}>{STATUS_LABEL[event.status]}</span></span>
                <span className="flex items-center justify-end gap-2 text-xs text-cream-dim"><span className="md:hidden">{STATUS_LABEL[event.status]}</span><ChevronRight size={16} /></span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex min-h-64 flex-col items-center justify-center p-6 text-center"><CalendarDays size={28} className="mb-3 text-cream-dim/40" /><p className="text-sm font-semibold text-cream">Nenhum evento encontrado</p><p className="mt-1 text-xs text-cream-dim">Ajuste a busca ou os filtros.</p></div>
        )}
      </section>

      <AdminPagination total={total} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />

      <AdminDrawer open={!!selectedId} title={detail?.event?.name || 'Detalhes do evento'} eyebrow={detail?.event ? STATUS_LABEL[detail.event.status] : 'Evento'} onClose={() => { setSelectedId(null); setDetail(null); }}>
        {detailLoading || !detail ? (
          <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-cream-dim"><Loader2 className="animate-spin text-gold" /> Carregando evento…</div>
        ) : (
          <EventDetail
            detail={detail}
            onAction={(type) => setConfirmation({ type, event: detail.event })}
            onUpdated={() => { loadDetail(selectedId); load(); }}
          />
        )}
      </AdminDrawer>

      <ConfirmDialog
        open={!!confirmation}
        title={confirmationCopy.title}
        description={confirmationCopy.description}
        confirmLabel={confirmationCopy.label}
        danger={confirmationCopy.danger}
        busy={acting}
        onCancel={() => setConfirmation(null)}
        onConfirm={performAction}
      />
    </AdminLayout>
  );
}

function toLocalInput(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function EventSupport({ event, onUpdated }) {
  const [form, setForm] = useState({
    name: event.name || '',
    venueName: event.venueName || '',
    welcomeMessage: event.welcomeMessage || '',
    startsAt: toLocalInput(event.startsAt),
    endsAt: toLocalInput(event.endsAt),
    revealAt: toLocalInput(event.revealAt),
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState('');
  const coverRef = useRef(null);
  const logoRef = useRef(null);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  async function save() {
    if (!form.name.trim()) { toast.error('O nome não pode ficar vazio.'); return; }
    setSaving(true);
    try {
      await adminApi.updateEvent(event.id, {
        name: form.name.trim(),
        venueName: form.venueName.trim(),
        welcomeMessage: form.welcomeMessage.trim(),
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
        revealAt: form.revealAt ? new Date(form.revealAt).toISOString() : null,
      });
      toast.success('Evento atualizado.');
      onUpdated?.();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  async function uploadImage(slot, file) {
    if (!file) return;
    setUploading(slot);
    try {
      await adminApi.uploadEventBranding(event.id, slot, file);
      toast.success(slot === 'cover' ? 'Capa atualizada.' : 'Logo atualizada.');
      onUpdated?.();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Não foi possível enviar a imagem.');
    } finally {
      setUploading('');
    }
  }

  return (
    <div className="rounded-2xl border border-gold/15 bg-gold/[0.04] p-4">
      <p className="mb-4 text-xs font-bold uppercase tracking-[0.15em] text-gold">Suporte ao organizador</p>

      {/* Capa e logo */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <div className="relative aspect-video overflow-hidden rounded-xl border border-line bg-white/[0.03]">
            {event.coverImageUrl
              ? <img src={event.coverImageUrl} alt="Capa" className="h-full w-full object-cover" />
              : <span className="flex h-full items-center justify-center text-[11px] text-cream-dim">Sem capa</span>}
          </div>
          <input ref={coverRef} type="file" accept="image/*" hidden onChange={(e) => uploadImage('cover', e.target.files?.[0])} />
          <button type="button" className="btn-ghost btn-sm mt-2 w-full" disabled={uploading === 'cover'} onClick={() => coverRef.current?.click()}>
            {uploading === 'cover' ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />} Trocar capa
          </button>
        </div>
        <div>
          <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-line bg-white/[0.03]">
            {event.logoUrl
              ? <img src={event.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain p-2" />
              : <span className="text-[11px] text-cream-dim">Sem logo</span>}
          </div>
          <input ref={logoRef} type="file" accept="image/*" hidden onChange={(e) => uploadImage('logo', e.target.files?.[0])} />
          <button type="button" className="btn-ghost btn-sm mt-2 w-full" disabled={uploading === 'logo'} onClick={() => logoRef.current?.click()}>
            {uploading === 'logo' ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />} Trocar logo
          </button>
        </div>
      </div>

      {/* Campos editáveis */}
      <div className="space-y-3">
        <Field label="Nome do evento"><input name="name" value={form.name} onChange={onChange} className="input-field" /></Field>
        <Field label="Local"><input name="venueName" value={form.venueName} onChange={onChange} className="input-field" placeholder="Opcional" /></Field>
        <Field label="Mensagem de boas-vindas"><textarea name="welcomeMessage" value={form.welcomeMessage} onChange={onChange} rows={2} className="input-field resize-none" placeholder="Opcional" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Início"><input type="datetime-local" name="startsAt" value={form.startsAt} onChange={onChange} className="input-field" /></Field>
          <Field label="Encerramento"><input type="datetime-local" name="endsAt" value={form.endsAt} onChange={onChange} className="input-field" /></Field>
        </div>
        <Field label="Revelação do álbum"><input type="datetime-local" name="revealAt" value={form.revealAt} onChange={onChange} className="input-field" /></Field>
      </div>

      <button type="button" className="btn-primary btn-sm mt-4 w-full" disabled={saving} onClick={save}>
        {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Salvar alterações
      </button>
    </div>
  );
}

function EventDetail({ detail, onAction, onUpdated }) {
  const { event, payments } = detail;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`badge-${event.status}`}>{STATUS_LABEL[event.status]}</span>
        <span className={event.isPaid ? 'badge-active' : 'badge-closed'}>{event.isPaid ? 'Pagamento confirmado' : 'Pagamento pendente'}</span>
        {event.isPrivate && <span className="badge-draft"><Lock size={12} /> Privado</span>}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric icon={Image} value={event.photoCount} label="Mídias" />
        <Metric icon={Users} value={event.guestCount} label="Convidados" />
        <Metric icon={HardDrive} value={formatBytes(event.mediaBytes)} label="Armazenamento" />
        <Metric icon={UserRound} value={event.maxGuests} label="Limite" />
      </div>

      <div className="rounded-2xl border border-line bg-white/[0.018] p-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-cream-dim/70">Organizador</p>
        <p className="text-sm font-semibold text-cream">{event.organizer?.name || 'Organizador indisponível'}</p>
        <p className="mt-1 text-xs text-cream-dim">{event.organizer?.email || '—'}</p>
      </div>

      <EventSupport event={event} onUpdated={onUpdated} />

      <div className="rounded-2xl border border-line bg-white/[0.018] p-4 text-sm">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-cream-dim/70">Configuração</p>
        <Info label="Plano" value={getPlan(event.planId)?.label || event.planId} />
        <Info label="Criado em" value={formatDateTime(event.createdAt)} />
        <Info label="Início" value={formatDateTime(event.startsAt)} />
        <Info label="Encerramento" value={formatDateTime(event.endsAt)} />
        <Info label="Revelação" value={formatDateTime(event.revealAt)} />
        <Info label="Recap" value={event.recapStatus || '—'} />
      </div>

      <a href={`/e/${event.slug}`} target="_blank" rel="noreferrer" className="btn-ghost btn-sm w-full"><ExternalLink size={15} /> Ver página pública</a>

      <div>
        <h3 className="mb-3 text-sm font-bold text-cream">Histórico de cobrança</h3>
        {payments.length ? (
          <div className="divide-y divide-line/60 rounded-2xl border border-line">
            {payments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between gap-3 p-3.5 text-sm">
                <div><p className="font-semibold text-cream">{payment.amount}</p><p className="mt-1 text-xs text-cream-dim">{payment.provider} · {formatDateTime(payment.createdAt)}</p></div>
                <span className={payment.status === 'paid' ? 'badge-active' : payment.status === 'pending' ? 'badge-closed' : 'badge-draft'}>{payment.status}</span>
              </div>
            ))}
          </div>
        ) : <p className="rounded-2xl border border-dashed border-line p-5 text-center text-sm text-cream-dim">Nenhuma cobrança vinculada.</p>}
      </div>

      <div className="border-t border-line pt-6">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-cream-dim/70">Ações administrativas</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {['draft', 'active'].includes(event.status) && <button type="button" className="btn-ghost btn-sm" onClick={() => onAction('close')}><XCircle size={15} /> Encerrar</button>}
          {event.status !== 'revealed' && <button type="button" className="btn-ghost btn-sm" onClick={() => onAction('reveal')}><Eye size={15} /> Revelar álbum</button>}
          <button type="button" className="btn-danger-ghost btn-sm sm:col-span-2" onClick={() => onAction('delete')}><Trash2 size={15} /> Excluir evento e dados</button>
        </div>
        <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-cream-dim"><Clock3 size={13} className="mt-0.5 shrink-0" />Todas as intervenções ficam registradas na auditoria.</p>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, value, label }) {
  return <div className="rounded-2xl border border-line bg-white/[0.02] p-3.5"><Icon size={14} className="mb-3 text-gold" /><p className="truncate text-base font-semibold text-cream">{value}</p><p className="mt-1 text-[11px] text-cream-dim">{label}</p></div>;
}

function Info({ label, value }) {
  return <div className="flex items-center justify-between gap-4 border-t border-line/60 py-2.5 first:border-0"><span className="text-cream-dim">{label}</span><span className="text-right text-cream">{value}</span></div>;
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-cream/80">{label}</span>
      {children}
    </label>
  );
}
