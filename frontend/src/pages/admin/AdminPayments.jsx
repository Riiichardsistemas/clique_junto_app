import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Loader2, ExternalLink } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminApi } from '../../api/adminApi';

const STATUSES = [
  { v: '', label: 'Todas' },
  { v: 'paid', label: 'Pagas' },
  { v: 'pending', label: 'Pendentes' },
  { v: 'failed', label: 'Falhas' },
];
const STBADGE = {
  paid: 'border-success/25 bg-success/10 text-success',
  pending: 'border-warning/25 bg-warning/10 text-warning',
  failed: 'border-danger/25 bg-danger/10 text-danger',
  refunded: 'border-white/10 bg-white/[0.05] text-cream-dim',
};

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback((st) => {
    setLoading(true);
    adminApi.payments({ status: st, limit: 60 })
      .then((d) => { setPayments(d.payments); setTotal(d.total); })
      .catch(() => toast.error('Erro ao carregar vendas.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(status); }, [status, load]);

  return (
    <AdminLayout title="Vendas">
      <div className="mb-4 flex gap-1.5">
        {STATUSES.map((s) => (
          <button key={s.v} onClick={() => setStatus(s.v)}
            className={`rounded-lg border px-3 py-2 text-xs transition ${status === s.v ? 'border-gold/30 bg-gold/10 text-cream' : 'border-line text-cream-dim hover:text-cream'}`}>
            {s.label}
          </button>
        ))}
      </div>
      <p className="mb-3 text-xs text-cream-dim">{total} cobrança(s)</p>

      {loading ? (
        <div className="flex items-center gap-3 py-16 text-cream-dim"><Loader2 className="h-6 w-6 animate-spin text-gold" /> Carregando…</div>
      ) : (
        <div className="card divide-y divide-line/60 overflow-hidden">
          {payments.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate text-cream">{p.eventName} <span className="text-cream-dim/70">· {p.planLabel}</span></p>
                <p className="truncate text-xs text-cream-dim">
                  {p.organizer?.name || '—'} · {p.provider}{p.billingType ? ` · ${p.billingType}` : ''} · {new Date(p.createdAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {p.invoiceUrl && p.status === 'pending' && (
                  <a href={p.invoiceUrl} target="_blank" rel="noreferrer" className="text-cream-dim transition hover:text-gold" title="Abrir cobrança">
                    <ExternalLink size={14} />
                  </a>
                )}
                <span className="text-cream">{p.amount}</span>
                <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${STBADGE[p.status] || STBADGE.refunded}`}>
                  {p.status}
                </span>
              </div>
            </div>
          ))}
          {payments.length === 0 && <p className="px-5 py-10 text-center text-sm text-cream-dim">Nenhuma cobrança encontrada.</p>}
        </div>
      )}
    </AdminLayout>
  );
}
