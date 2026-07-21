import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { CreditCard, Download, ExternalLink, Loader2, ReceiptText, Search, WalletCards } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminPagination from '../../components/admin/AdminPagination';
import { adminApi } from '../../api/adminApi';
import { downloadCsv, formatDateTime } from '../../utils/admin';

const PAGE_SIZE = 25;
const STATUS_LABEL = { paid: 'Aprovado', pending: 'Pendente', failed: 'Falhou', refunded: 'Estornado' };
const STATUS_CLASS = { paid: 'badge-active', pending: 'badge-closed', failed: 'border-danger/25 bg-danger/10 text-danger badge', refunded: 'badge-draft' };

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 320);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.payments({ search: debouncedSearch, status, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE })
      .then((data) => { setPayments(data.payments); setTotal(data.total); })
      .catch(() => toast.error('Não foi possível carregar as vendas.'))
      .finally(() => setLoading(false));
  }, [debouncedSearch, status, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [debouncedSearch, status]);

  const pageSummary = useMemo(() => {
    const approved = payments.filter((payment) => payment.status === 'paid');
    return {
      approved: approved.length,
      pending: payments.filter((payment) => payment.status === 'pending').length,
      revenue: (approved.reduce((sum, payment) => sum + payment.amountCents, 0) / 100)
        .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
    };
  }, [payments]);

  function exportCurrentView() {
    if (!payments.length) return;
    downloadCsv(
      `vendas-pagina-${page}.csv`,
      ['ID', 'Evento', 'Organizador', 'Email', 'Plano', 'Valor', 'Status', 'Provedor', 'Método', 'Criada em', 'Paga em'],
      payments.map((payment) => [
        payment.id,
        payment.eventName,
        payment.organizer?.name,
        payment.organizer?.email,
        payment.planLabel,
        payment.amount,
        STATUS_LABEL[payment.status] || payment.status,
        payment.provider,
        payment.billingType,
        formatDateTime(payment.createdAt),
        formatDateTime(payment.paidAt),
      ])
    );
  }

  const actions = (
    <button type="button" className="btn-ghost btn-sm" onClick={exportCurrentView} disabled={!payments.length}>
      <Download size={15} /> Exportar página
    </button>
  );

  return (
    <AdminLayout title="Vendas" description="Acompanhe cobranças, pagamentos aprovados e falhas sem alterar dados do provedor." actions={actions}>
      <section className="mb-5 grid gap-3 sm:grid-cols-3">
        <Summary icon={WalletCards} label="Receita nesta página" value={pageSummary.revenue} />
        <Summary icon={CreditCard} label="Aprovados nesta página" value={pageSummary.approved} />
        <Summary icon={ReceiptText} label="Pendentes nesta página" value={pageSummary.pending} />
      </section>

      <section className="mb-5 grid gap-3 lg:grid-cols-[minmax(260px,1fr),200px]">
        <label className="admin-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Evento, organizador ou ID do provedor…" aria-label="Buscar vendas" /></label>
        <select className="input-field" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filtrar vendas por status">
          <option value="">Todos os status</option>
          <option value="paid">Aprovados</option>
          <option value="pending">Pendentes</option>
          <option value="failed">Falhos</option>
          <option value="refunded">Estornados</option>
        </select>
      </section>

      <section className="card overflow-hidden">
        <div className="hidden grid-cols-[minmax(220px,1fr),150px,130px,140px,80px] gap-4 border-b border-line bg-white/[0.018] px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.16em] text-cream-dim/70 md:grid">
          <span>Cobrança</span><span>Organizador</span><span>Valor</span><span>Status</span><span className="text-right">Fatura</span>
        </div>
        {loading ? (
          <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-cream-dim"><Loader2 className="animate-spin text-gold" /> Carregando vendas…</div>
        ) : payments.length ? (
          <div className="divide-y divide-line/60">
            {payments.map((payment) => (
              <article key={payment.id} className="grid grid-cols-[1fr,auto] items-center gap-4 px-5 py-4 md:grid-cols-[minmax(220px,1fr),150px,130px,140px,80px]">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-cream">{payment.eventName}</p>
                  <p className="mt-1 truncate text-[11px] text-cream-dim">{payment.planLabel} · {payment.provider}{payment.billingType ? ` · ${payment.billingType}` : ''}</p>
                  <p className="mt-1 font-mono text-[10px] text-cream-dim/55">{String(payment.providerPaymentId || payment.id).slice(0, 24)}</p>
                </div>
                <div className="hidden min-w-0 md:block"><p className="truncate text-sm text-cream">{payment.organizer?.name || '—'}</p><p className="truncate text-[11px] text-cream-dim">{payment.organizer?.email}</p></div>
                <div className="hidden md:block"><p className="text-sm font-semibold text-cream">{payment.amount}</p><p className="mt-1 text-[11px] text-cream-dim">{formatDateTime(payment.createdAt)}</p></div>
                <span className={`hidden w-fit md:inline-flex ${STATUS_CLASS[payment.status] || 'badge-draft'}`}>{STATUS_LABEL[payment.status] || payment.status}</span>
                <div className="flex items-center justify-end gap-2">
                  <span className={`md:hidden ${STATUS_CLASS[payment.status] || 'badge-draft'}`}>{STATUS_LABEL[payment.status] || payment.status}</span>
                  {payment.invoiceUrl ? (
                    <a href={payment.invoiceUrl} target="_blank" rel="noreferrer" className="icon-button" aria-label={`Abrir fatura de ${payment.eventName}`}><ExternalLink size={15} /></a>
                  ) : <span className="hidden text-xs text-cream-dim/40 md:block">—</span>}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="flex min-h-64 flex-col items-center justify-center p-6 text-center"><ReceiptText size={28} className="mb-3 text-cream-dim/40" /><p className="text-sm font-semibold text-cream">Nenhuma cobrança encontrada</p><p className="mt-1 text-xs text-cream-dim">Ajuste a busca ou o filtro de status.</p></div>
        )}
      </section>
      <AdminPagination total={total} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
    </AdminLayout>
  );
}

function Summary({ icon: Icon, label, value }) {
  return <div className="card flex items-center gap-4 p-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold/15 bg-gold/[0.07] text-gold"><Icon size={17} /></span><div className="min-w-0"><p className="truncate text-lg font-semibold text-cream">{value}</p><p className="text-xs text-cream-dim">{label}</p></div></div>;
}
