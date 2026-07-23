import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  BadgeCheck, Check, Gift, Loader2, Search, TrendingUp, Users, Wallet, X,
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminDrawer from '../../components/admin/AdminDrawer';
import AdminPagination from '../../components/admin/AdminPagination';
import { adminApi } from '../../api/adminApi';
import { downloadCsv, formatDateTime } from '../../utils/admin';

const PAGE_SIZE = 25;
const STATUS_LABEL = { pending: 'A pagar', paid: 'Pago', canceled: 'Cancelado' };
const STATUS_CLASS = {
  pending: 'badge-closed',
  paid: 'badge-active',
  canceled: 'border-danger/25 bg-danger/10 text-danger badge',
};

export default function AdminAffiliates() {
  const [tab, setTab] = useState('commissions');

  return (
    <AdminLayout
      title="Afiliados"
      description="Acompanhe indicações, comissões geradas e faça o repasse aos afiliados."
    >
      <div className="mb-6 flex gap-1 rounded-xl border border-line bg-white/[0.02] p-1 sm:w-fit">
        <TabButton active={tab === 'commissions'} onClick={() => setTab('commissions')} icon={Wallet}>Comissões</TabButton>
        <TabButton active={tab === 'affiliates'} onClick={() => setTab('affiliates')} icon={Users}>Afiliados</TabButton>
      </div>

      {tab === 'commissions' ? <CommissionsTab /> : <AffiliatesTab />}
    </AdminLayout>
  );
}

function TabButton({ active, onClick, icon: Icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition sm:flex-none ${
        active ? 'bg-gold/[0.12] text-gold-light' : 'text-cream-dim hover:text-cream'
      }`}
    >
      <Icon size={15} /> {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Comissões
// ---------------------------------------------------------------------------
function CommissionsTab() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState(null);
  const [rateLabel, setRateLabel] = useState('20%');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 320);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.commissions({ search: debounced, status, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE })
      .then((data) => {
        setRows(data.commissions);
        setTotal(data.total);
        setSummary(data.summary);
        setRateLabel(data.rateLabel || '20%');
      })
      .catch(() => toast.error('Não foi possível carregar as comissões.'))
      .finally(() => setLoading(false));
  }, [debounced, status, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [debounced, status]);

  async function changeStatus(commission, nextStatus, note) {
    setSaving(true);
    try {
      await adminApi.updateCommission(commission.id, { status: nextStatus, ...(note !== undefined ? { note } : {}) });
      toast.success(nextStatus === 'paid' ? 'Comissão marcada como paga.' : 'Comissão atualizada.');
      setSelected(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Não foi possível atualizar.');
    } finally {
      setSaving(false);
    }
  }

  function exportView() {
    if (!rows.length) return;
    downloadCsv(
      `comissoes-pagina-${page}.csv`,
      ['ID', 'Afiliado', 'Email afiliado', 'Indicado', 'Evento', 'Venda', 'Comissão', 'Status', 'Criada em', 'Paga em'],
      rows.map((c) => [
        c.id, c.affiliate?.name, c.affiliate?.email, c.referred?.name, c.eventName,
        c.saleAmount, c.commission, STATUS_LABEL[c.status] || c.status,
        formatDateTime(c.createdAt), formatDateTime(c.paidAt),
      ])
    );
  }

  return (
    <>
      <section className="mb-5 grid gap-3 sm:grid-cols-3">
        <Summary icon={Wallet} highlight label="A pagar (total)" value={summary?.pending ?? '—'} />
        <Summary icon={BadgeCheck} label="Já pago (total)" value={summary?.paid ?? '—'} />
        <Summary icon={TrendingUp} label={`Comissão por venda`} value={rateLabel} />
      </section>

      <section className="mb-5 grid gap-3 lg:grid-cols-[minmax(260px,1fr),200px]">
        <label className="admin-search"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Afiliado ou indicado…" aria-label="Buscar comissões" /></label>
        <select className="input-field" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filtrar por status">
          <option value="">Todos os status</option>
          <option value="pending">A pagar</option>
          <option value="paid">Pagas</option>
          <option value="canceled">Canceladas</option>
        </select>
      </section>

      <div className="mb-3 flex justify-end">
        <button type="button" className="btn-ghost btn-sm" onClick={exportView} disabled={!rows.length}>Exportar página</button>
      </div>

      <section className="card overflow-hidden">
        <div className="hidden grid-cols-[minmax(200px,1fr),160px,120px,120px,120px] gap-4 border-b border-line bg-white/[0.018] px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.16em] text-cream-dim/70 md:grid">
          <span>Afiliado</span><span>Indicado</span><span>Venda</span><span>Comissão</span><span>Status</span>
        </div>
        {loading ? (
          <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-cream-dim"><Loader2 className="animate-spin text-gold" /> Carregando…</div>
        ) : rows.length ? (
          <div className="divide-y divide-line/60">
            {rows.map((c) => (
              <button key={c.id} type="button" onClick={() => setSelected(c)} className="grid w-full grid-cols-[1fr,auto] items-center gap-4 px-5 py-4 text-left transition hover:bg-white/[0.025] md:grid-cols-[minmax(200px,1fr),160px,120px,120px,120px]">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-cream">{c.affiliate?.name || '—'}</p>
                  <p className="truncate text-[11px] text-cream-dim">{c.affiliate?.email}</p>
                </div>
                <div className="hidden min-w-0 md:block">
                  <p className="truncate text-sm text-cream">{c.referred?.name || '—'}</p>
                  <p className="truncate text-[11px] text-cream-dim">{c.eventName}</p>
                </div>
                <div className="hidden md:block"><p className="text-sm text-cream">{c.saleAmount}</p></div>
                <div className="hidden md:block"><p className="text-sm font-semibold text-gold">{c.commission}</p></div>
                <div className="flex items-center justify-end gap-2 md:justify-start">
                  <span className="text-sm font-semibold text-gold md:hidden">{c.commission}</span>
                  <span className={STATUS_CLASS[c.status] || 'badge-draft'}>{STATUS_LABEL[c.status] || c.status}</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex min-h-64 flex-col items-center justify-center p-6 text-center"><Wallet size={28} className="mb-3 text-cream-dim/40" /><p className="text-sm font-semibold text-cream">Nenhuma comissão encontrada</p><p className="mt-1 text-xs text-cream-dim">Ajuste a busca ou o filtro.</p></div>
        )}
      </section>
      <AdminPagination total={total} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />

      <AdminDrawer open={!!selected} title="Comissão" eyebrow="Repasse ao afiliado" onClose={() => setSelected(null)}>
        {selected && <CommissionDetail commission={selected} saving={saving} onChangeStatus={changeStatus} />}
      </AdminDrawer>
    </>
  );
}

function CommissionDetail({ commission: c, saving, onChangeStatus }) {
  const [note, setNote] = useState(c.note || '');
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className={STATUS_CLASS[c.status] || 'badge-draft'}>{STATUS_LABEL[c.status] || c.status}</span>
        <span className="badge-draft">{c.rateLabel}</span>
      </div>

      <div className="rounded-2xl border border-gold/15 bg-gold/[0.045] p-4">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-gold">Comissão a repassar</p>
        <p className="mt-2 text-2xl font-semibold text-cream">{c.commission}</p>
        <p className="mt-1 text-xs text-cream-dim">sobre venda de {c.saleAmount}</p>
      </div>

      <div className="rounded-2xl border border-line bg-white/[0.018] p-4 text-sm">
        <Info label="Afiliado" value={c.affiliate?.name || '—'} />
        <Info label="Email" value={c.affiliate?.email || '—'} />
        <Info label="Indicado" value={c.referred?.name || '—'} />
        <Info label="Evento" value={c.eventName} />
        <Info label="Gerada em" value={formatDateTime(c.createdAt)} />
        <Info label="Paga em" value={formatDateTime(c.paidAt)} />
      </div>

      <div>
        <label className="mb-2 block text-xs font-bold uppercase tracking-[0.15em] text-cream-dim/70">Observação (ex.: comprovante Pix)</label>
        <input className="input-field w-full" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opcional" maxLength={200} />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {c.status !== 'paid' ? (
          <button type="button" disabled={saving} onClick={() => onChangeStatus(c, 'paid', note)} className="btn-primary">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Marcar como paga
          </button>
        ) : (
          <button type="button" disabled={saving} onClick={() => onChangeStatus(c, 'pending', note)} className="btn-ghost">
            Reverter para “a pagar”
          </button>
        )}
        {c.status !== 'canceled' ? (
          <button type="button" disabled={saving} onClick={() => onChangeStatus(c, 'canceled', note)} className="btn-ghost text-danger">
            <X size={16} /> Cancelar comissão
          </button>
        ) : (
          <button type="button" disabled={saving} onClick={() => onChangeStatus(c, 'pending', note)} className="btn-ghost">
            Reativar comissão
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ranking de afiliados
// ---------------------------------------------------------------------------
function AffiliatesTab() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 320);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.affiliates({ search: debounced, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE })
      .then((data) => { setRows(data.affiliates); setTotal(data.total); })
      .catch(() => toast.error('Não foi possível carregar os afiliados.'))
      .finally(() => setLoading(false));
  }, [debounced, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [debounced]);

  return (
    <>
      <section className="mb-5">
        <label className="admin-search"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nome, email ou código…" aria-label="Buscar afiliados" /></label>
      </section>

      <section className="card overflow-hidden">
        <div className="hidden grid-cols-[minmax(200px,1fr),110px,110px,120px,120px] gap-4 border-b border-line bg-white/[0.018] px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.16em] text-cream-dim/70 md:grid">
          <span>Afiliado</span><span>Indicações</span><span>Vendas</span><span>A pagar</span><span>Já pago</span>
        </div>
        {loading ? (
          <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-cream-dim"><Loader2 className="animate-spin text-gold" /> Carregando…</div>
        ) : rows.length ? (
          <div className="divide-y divide-line/60">
            {rows.map((a) => (
              <div key={a.id} className="grid grid-cols-[1fr,auto] items-center gap-4 px-5 py-4 md:grid-cols-[minmax(200px,1fr),110px,110px,120px,120px]">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-cream">{a.name}</p>
                  <p className="truncate text-[11px] text-cream-dim">{a.email} · <span className="font-mono text-gold/80">{a.referralCode || '—'}</span></p>
                </div>
                <div className="hidden md:block"><p className="text-sm text-cream">{a.referralCount}</p></div>
                <div className="hidden md:block"><p className="text-sm text-cream">{a.salesCount}</p></div>
                <div className="text-right md:text-left"><p className="text-sm font-semibold text-gold">{a.pending}</p></div>
                <div className="hidden md:block"><p className="text-sm text-cream">{a.paid}</p></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex min-h-64 flex-col items-center justify-center p-6 text-center"><Gift size={28} className="mb-3 text-cream-dim/40" /><p className="text-sm font-semibold text-cream">Nenhum afiliado ainda</p><p className="mt-1 text-xs text-cream-dim">Assim que alguém indicar um novo usuário, aparecerá aqui.</p></div>
        )}
      </section>
      <AdminPagination total={total} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
    </>
  );
}

function Info({ label, value, mono }) {
  return <div className="flex items-center justify-between gap-4 border-t border-line/60 py-2.5 first:border-0"><span className="text-cream-dim">{label}</span><span className={`max-w-[62%] truncate text-right text-cream ${mono ? 'font-mono text-xs' : ''}`}>{value}</span></div>;
}

function Summary({ icon: Icon, label, value, highlight }) {
  return <div className={`card flex items-center gap-4 p-4 ${highlight ? 'border-gold/25 bg-gold/[0.05]' : ''}`}><span className={`flex h-10 w-10 items-center justify-center rounded-xl border ${highlight ? 'border-gold/25 bg-gold/[0.10] text-gold' : 'border-gold/15 bg-gold/[0.07] text-gold'}`}><Icon size={17} /></span><div className="min-w-0"><p className="truncate text-lg font-semibold text-cream">{value}</p><p className="text-xs text-cream-dim">{label}</p></div></div>;
}
