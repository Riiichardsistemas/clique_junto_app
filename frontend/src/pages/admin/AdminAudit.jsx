import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ChevronRight, FileClock, Loader2, MapPin, Search, ShieldCheck } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminDrawer from '../../components/admin/AdminDrawer';
import AdminPagination from '../../components/admin/AdminPagination';
import { adminApi } from '../../api/adminApi';
import { ACTION_LABELS, formatDateTime } from '../../utils/admin';

const PAGE_SIZE = 25;

export default function AdminAudit() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 320);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.auditLogs({ search: debouncedSearch, action, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE })
      .then((data) => { setLogs(data.logs); setTotal(data.total); })
      .catch(() => toast.error('Não foi possível carregar a auditoria.'))
      .finally(() => setLoading(false));
  }, [debouncedSearch, action, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [debouncedSearch, action]);

  return (
    <AdminLayout
      title="Auditoria"
      description="Rastreie intervenções privilegiadas, responsáveis e alterações realizadas na plataforma."
      actions={<span className="badge-revealed"><ShieldCheck size={13} /> Registro protegido</span>}
    >
      <section className="mb-5 grid gap-3 lg:grid-cols-[minmax(260px,1fr),240px]">
        <label className="admin-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Administrador, alvo ou identificador…" aria-label="Buscar auditoria" /></label>
        <select className="input-field" value={action} onChange={(event) => setAction(event.target.value)} aria-label="Filtrar por ação">
          <option value="">Todas as ações</option>
          {Object.entries(ACTION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </section>

      <section className="card overflow-hidden">
        <div className="hidden grid-cols-[minmax(220px,1fr),minmax(180px,.8fr),170px,80px] gap-4 border-b border-line bg-white/[0.018] px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.16em] text-cream-dim/70 md:grid">
          <span>Ação</span><span>Responsável</span><span>Data e hora</span><span className="text-right">Detalhes</span>
        </div>
        {loading ? (
          <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-cream-dim"><Loader2 className="animate-spin text-gold" /> Carregando registros…</div>
        ) : logs.length ? (
          <div className="divide-y divide-line/60">
            {logs.map((log) => (
              <button key={log.id} type="button" onClick={() => setSelected(log)} className="grid w-full grid-cols-[1fr,auto] items-center gap-4 px-5 py-4 text-left transition hover:bg-white/[0.025] md:grid-cols-[minmax(220px,1fr),minmax(180px,.8fr),170px,80px]">
                <span className="flex min-w-0 items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gold/15 bg-gold/[0.07] text-gold"><FileClock size={15} /></span>
                  <span className="min-w-0"><span className="block truncate text-sm font-semibold text-cream">{ACTION_LABELS[log.action] || log.action}</span><span className="mt-1 block truncate text-xs text-cream-dim">{log.targetLabel || `${log.targetType} ${log.targetId || ''}`}</span></span>
                </span>
                <span className="hidden min-w-0 md:block"><span className="block truncate text-sm text-cream">{log.admin?.name || 'Sistema'}</span><span className="block truncate text-[11px] text-cream-dim">{log.admin?.email}</span></span>
                <span className="hidden text-xs text-cream-dim md:block">{formatDateTime(log.createdAt)}</span>
                <span className="flex items-center justify-end gap-2 text-xs text-cream-dim"><span className="md:hidden">{formatDateTime(log.createdAt)}</span><ChevronRight size={16} /></span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex min-h-64 flex-col items-center justify-center p-6 text-center"><FileClock size={28} className="mb-3 text-cream-dim/40" /><p className="text-sm font-semibold text-cream">Nenhum registro encontrado</p><p className="mt-1 text-xs text-cream-dim">As ações administrativas aparecerão aqui automaticamente.</p></div>
        )}
      </section>

      <AdminPagination total={total} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />

      <AdminDrawer open={!!selected} title={selected ? (ACTION_LABELS[selected.action] || selected.action) : 'Registro'} eyebrow="Registro de auditoria" onClose={() => setSelected(null)}>
        {selected && <AuditDetail log={selected} />}
      </AdminDrawer>
    </AdminLayout>
  );
}

function AuditDetail({ log }) {
  const changes = log.metadata?.changes || {};
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gold/15 bg-gold/[0.045] p-4">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-gold">Alvo da ação</p>
        <p className="mt-2 text-sm font-semibold text-cream">{log.targetLabel || 'Não informado'}</p>
        <p className="mt-1 font-mono text-[11px] text-cream-dim">{log.targetType} · {log.targetId || '—'}</p>
      </div>

      <div className="rounded-2xl border border-line bg-white/[0.018] p-4 text-sm">
        <Info label="Responsável" value={log.admin?.name || 'Sistema'} />
        <Info label="Email" value={log.admin?.email || '—'} />
        <Info label="Data e hora" value={formatDateTime(log.createdAt)} />
        <Info label="Endereço IP" value={log.ip || 'Não disponível'} mono />
        <Info label="ID do registro" value={String(log.id).slice(0, 18)} mono />
      </div>

      {Object.keys(changes).length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-bold text-cream">Alterações</h3>
          <div className="space-y-2">
            {Object.entries(changes).map(([field, values]) => (
              <div key={field} className="rounded-2xl border border-line bg-white/[0.018] p-4">
                <p className="text-xs font-semibold text-cream-dim">{field === 'isActive' ? 'Status da conta' : 'Papel de acesso'}</p>
                <div className="mt-3 flex items-center gap-3 text-sm"><span className="rounded-lg bg-danger/[0.07] px-2.5 py-1 text-danger">{String(values.from)}</span><span className="text-cream-dim">→</span><span className="rounded-lg bg-success/[0.07] px-2.5 py-1 text-success">{String(values.to)}</span></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {Object.keys(log.metadata || {}).filter((key) => key !== 'changes').length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-bold text-cream">Contexto técnico</h3>
          <dl className="rounded-2xl border border-line bg-white/[0.018] p-4">
            {Object.entries(log.metadata).filter(([key]) => key !== 'changes').map(([key, value]) => (
              <div key={key} className="flex items-center justify-between gap-4 border-t border-line/60 py-2.5 first:border-0"><dt className="text-xs text-cream-dim">{key}</dt><dd className="text-right font-mono text-xs text-cream">{String(value)}</dd></div>
            ))}
          </dl>
        </div>
      )}

      <p className="flex items-start gap-2 text-xs leading-5 text-cream-dim"><MapPin size={13} className="mt-0.5 shrink-0 text-gold" />O endereço IP é registrado exclusivamente para segurança e rastreabilidade operacional.</p>
    </div>
  );
}

function Info({ label, value, mono }) {
  return <div className="flex items-center justify-between gap-4 border-t border-line/60 py-2.5 first:border-0"><span className="text-cream-dim">{label}</span><span className={`max-w-[65%] truncate text-right text-cream ${mono ? 'font-mono text-xs' : ''}`}>{value}</span></div>;
}
