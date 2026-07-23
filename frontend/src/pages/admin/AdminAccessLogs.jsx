import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Ban, Loader2, LogIn, Search, ShieldAlert, ShieldX, Trash2 } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminPagination from '../../components/admin/AdminPagination';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { adminApi } from '../../api/adminApi';
import { ACCESS_TYPE_LABELS, formatDateTime } from '../../utils/admin';

const PAGE_SIZE = 25;
const TYPE_CLASS = {
  login_success: 'badge-active',
  login_failed: 'border-danger/25 bg-danger/10 text-danger badge',
  logout: 'badge-draft',
  password_reset: 'badge-closed',
};

export default function AdminAccessLogs() {
  const [tab, setTab] = useState('access');
  return (
    <AdminLayout
      title="Logs & Segurança"
      description="Acompanhe acessos, tentativas de login e gerencie os IPs bloqueados da plataforma."
      actions={<span className="badge-revealed"><ShieldAlert size={13} /> Registro protegido</span>}
    >
      <div className="mb-5 inline-flex rounded-full border border-line bg-white/[0.02] p-1">
        <TabButton active={tab === 'access'} onClick={() => setTab('access')} icon={LogIn}>Acessos</TabButton>
        <TabButton active={tab === 'blocked'} onClick={() => setTab('blocked')} icon={ShieldX}>IPs bloqueados</TabButton>
      </div>

      {tab === 'access' ? <AccessTab /> : <BlockedTab />}
    </AdminLayout>
  );
}

function TabButton({ active, onClick, icon: Icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${active ? 'bg-gold/15 text-cream' : 'text-cream-dim hover:text-cream'}`}
    >
      <Icon size={15} /> {children}
    </button>
  );
}

/* ===== Aba: Acessos ===== */
function AccessTab() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [toBlock, setToBlock] = useState(null);
  const [blocking, setBlocking] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 320);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.accessLogs({ search: debouncedSearch, type, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE })
      .then((data) => { setLogs(data.logs); setTotal(data.total); })
      .catch(() => toast.error('Não foi possível carregar os acessos.'))
      .finally(() => setLoading(false));
  }, [debouncedSearch, type, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [debouncedSearch, type]);

  async function confirmBlock() {
    if (!toBlock) return;
    setBlocking(true);
    try {
      await adminApi.blockIp({ ip: toBlock.ip, reason: `Bloqueado a partir dos logs (${ACCESS_TYPE_LABELS[toBlock.type] || toBlock.type})` });
      toast.success(`IP ${toBlock.ip} bloqueado.`);
      setToBlock(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Não foi possível bloquear o IP.');
    } finally {
      setBlocking(false);
    }
  }

  return (
    <>
      <section className="mb-5 grid gap-3 lg:grid-cols-[minmax(260px,1fr),220px]">
        <label className="admin-search"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Email, usuário ou IP…" aria-label="Buscar acessos" /></label>
        <select className="input-field" value={type} onChange={(e) => setType(e.target.value)} aria-label="Filtrar por tipo">
          <option value="">Todos os tipos</option>
          {Object.entries(ACCESS_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </section>

      <section className="card overflow-hidden">
        <div className="hidden grid-cols-[130px,minmax(200px,1fr),150px,150px,90px] gap-4 border-b border-line bg-white/[0.018] px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.16em] text-cream-dim/70 md:grid">
          <span>Evento</span><span>Usuário</span><span>IP</span><span>Data e hora</span><span className="text-right">Ação</span>
        </div>
        {loading ? (
          <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-cream-dim"><Loader2 className="animate-spin text-gold" /> Carregando acessos…</div>
        ) : logs.length ? (
          <div className="divide-y divide-line/60">
            {logs.map((log) => (
              <article key={log.id} className="grid grid-cols-[1fr,auto] items-center gap-4 px-5 py-4 md:grid-cols-[130px,minmax(200px,1fr),150px,150px,90px]">
                <span className={`w-fit ${TYPE_CLASS[log.type] || 'badge-draft'}`}>{ACCESS_TYPE_LABELS[log.type] || log.type}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm text-cream">{log.user?.name || log.email || '—'}</p>
                  <p className="truncate text-[11px] text-cream-dim">{log.email}{log.reason ? ` · ${log.reason}` : ''}</p>
                </div>
                <p className="hidden font-mono text-xs text-cream-dim md:block">{log.ip || '—'}</p>
                <p className="hidden text-xs text-cream-dim md:block">{formatDateTime(log.createdAt)}</p>
                <div className="flex items-center justify-end">
                  {log.ip ? (
                    log.ipBlocked ? (
                      <span className="text-[11px] text-danger">Bloqueado</span>
                    ) : (
                      <button type="button" className="btn-danger-ghost btn-sm" onClick={() => setToBlock(log)} aria-label={`Bloquear IP ${log.ip}`}>
                        <Ban size={14} /> Bloquear
                      </button>
                    )
                  ) : <span className="text-xs text-cream-dim/40">—</span>}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="flex min-h-64 flex-col items-center justify-center p-6 text-center"><LogIn size={28} className="mb-3 text-cream-dim/40" /><p className="text-sm font-semibold text-cream">Nenhum acesso registrado</p><p className="mt-1 text-xs text-cream-dim">Logins e tentativas aparecerão aqui.</p></div>
        )}
      </section>

      <AdminPagination total={total} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />

      <ConfirmDialog
        open={!!toBlock}
        title="Bloquear este IP?"
        description={toBlock ? `Todas as requisições vindas de ${toBlock.ip} serão recusadas até você desbloquear.` : ''}
        confirmLabel="Bloquear IP"
        danger
        busy={blocking}
        onCancel={() => setToBlock(null)}
        onConfirm={confirmBlock}
      />
    </>
  );
}

/* ===== Aba: IPs bloqueados ===== */
function BlockedTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ip, setIp] = useState('');
  const [reason, setReason] = useState('');
  const [adding, setAdding] = useState(false);
  const [toRemove, setToRemove] = useState(null);
  const [removing, setRemoving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.blockedIps()
      .then((data) => setItems(data.blockedIps))
      .catch(() => toast.error('Não foi possível carregar os IPs bloqueados.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addIp(e) {
    e.preventDefault();
    if (!ip.trim()) { toast.error('Informe um IP.'); return; }
    setAdding(true);
    try {
      await adminApi.blockIp({ ip: ip.trim(), reason: reason.trim() });
      toast.success(`IP ${ip.trim()} bloqueado.`);
      setIp(''); setReason('');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Não foi possível bloquear o IP.');
    } finally {
      setAdding(false);
    }
  }

  async function confirmRemove() {
    if (!toRemove) return;
    setRemoving(true);
    try {
      await adminApi.unblockIp(toRemove.id);
      toast.success(`IP ${toRemove.ip} desbloqueado.`);
      setToRemove(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Não foi possível desbloquear.');
    } finally {
      setRemoving(false);
    }
  }

  return (
    <>
      <form onSubmit={addIp} className="card mb-5 grid gap-3 p-4 sm:grid-cols-[200px,1fr,auto] sm:items-end">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-cream/80">Endereço IP</span>
          <input value={ip} onChange={(e) => setIp(e.target.value)} className="input-field font-mono" placeholder="200.1.2.3" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-cream/80">Motivo (opcional)</span>
          <input value={reason} onChange={(e) => setReason(e.target.value)} className="input-field" placeholder="Ex.: tentativas de acesso suspeitas" />
        </label>
        <button type="submit" className="btn-primary btn-sm h-11" disabled={adding}>
          {adding ? <Loader2 size={15} className="animate-spin" /> : <Ban size={15} />} Bloquear
        </button>
      </form>

      <section className="card overflow-hidden">
        <div className="hidden grid-cols-[160px,minmax(200px,1fr),150px,90px] gap-4 border-b border-line bg-white/[0.018] px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.16em] text-cream-dim/70 md:grid">
          <span>IP</span><span>Motivo</span><span>Bloqueado em</span><span className="text-right">Ação</span>
        </div>
        {loading ? (
          <div className="flex min-h-52 items-center justify-center gap-3 text-sm text-cream-dim"><Loader2 className="animate-spin text-gold" /> Carregando…</div>
        ) : items.length ? (
          <div className="divide-y divide-line/60">
            {items.map((item) => (
              <article key={item.id} className="grid grid-cols-[1fr,auto] items-center gap-4 px-5 py-4 md:grid-cols-[160px,minmax(200px,1fr),150px,90px]">
                <p className="font-mono text-sm text-cream">{item.ip}</p>
                <p className="hidden truncate text-sm text-cream-dim md:block">{item.reason || '—'}</p>
                <p className="hidden text-xs text-cream-dim md:block">{formatDateTime(item.createdAt)}</p>
                <div className="flex items-center justify-end">
                  <button type="button" className="btn-ghost btn-sm" onClick={() => setToRemove(item)} aria-label={`Desbloquear ${item.ip}`}>
                    <Trash2 size={14} /> Remover
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="flex min-h-52 flex-col items-center justify-center p-6 text-center"><ShieldX size={28} className="mb-3 text-cream-dim/40" /><p className="text-sm font-semibold text-cream">Nenhum IP bloqueado</p><p className="mt-1 text-xs text-cream-dim">Bloqueie um IP acima ou a partir dos logs de acesso.</p></div>
        )}
      </section>

      <ConfirmDialog
        open={!!toRemove}
        title="Desbloquear este IP?"
        description={toRemove ? `${toRemove.ip} voltará a acessar a plataforma normalmente.` : ''}
        confirmLabel="Desbloquear"
        busy={removing}
        onCancel={() => setToRemove(null)}
        onConfirm={confirmRemove}
      />
    </>
  );
}
