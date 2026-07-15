import { useState, useEffect } from 'react';
import { Users, CalendarDays, DollarSign, TrendingUp, Image, UserPlus, Loader2, Receipt as Receipt2 } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import SalesChart from '../../components/admin/SalesChart';
import { adminApi } from '../../api/adminApi';

const STATUS_LABEL = { draft: 'Rascunho', active: 'Ativo', closed: 'Encerrado', revealed: 'Revelado' };

function Kpi({ icon: Icon, label, value, sub }) {
  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center gap-2 text-cream-dim">
        <Icon size={15} className="text-gold" />
        <span className="label-mono">{label}</span>
      </div>
      <p className="text-2xl font-semibold tracking-tight text-cream">{value}</p>
      {sub && <p className="mt-1 text-xs text-cream-dim">{sub}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    adminApi.overview()
      .then(setData)
      .catch((e) => setError(e?.response?.data?.error || 'Erro ao carregar métricas.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout title="Visão geral">
      {loading ? (
        <div className="flex items-center gap-3 py-16 text-cream-dim"><Loader2 className="h-6 w-6 animate-spin text-gold" /> Carregando…</div>
      ) : error ? (
        <div className="card p-6 text-danger">{error}</div>
      ) : (
        <div className="space-y-6 animate-fadein">
          {/* KPIs de receita */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Kpi icon={DollarSign} label="Receita total" value={data.kpis.revenue} sub={`${data.kpis.salesCount} venda(s)`} />
            <Kpi icon={TrendingUp} label="Receita no mês" value={data.kpis.revenueMonth} sub={`${data.kpis.salesThisMonth} venda(s) no mês`} />
            <Kpi icon={Receipt2} label="Ticket médio" value={data.kpis.avgTicket} />
            <Kpi icon={Users} label="Usuários" value={data.kpis.totalUsers} />
          </div>

          {/* Gráfico de vendas */}
          <div className="card p-6">
            <div className="card-section-header">
              <TrendingUp />
              <span className="card-section-title">Receita — últimos 30 dias</span>
            </div>
            <SalesChart data={data.salesSeries} />
          </div>

          {/* Métricas de uso + distribuição de planos */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card p-6">
              <div className="card-section-header"><CalendarDays /><span className="card-section-title">Eventos</span></div>
              <div className="grid grid-cols-2 gap-4">
                <Mini icon={CalendarDays} label="Total de eventos" value={data.kpis.totalEvents} />
                <Mini icon={UserPlus} label="Convidados" value={data.kpis.totalGuests} />
                <Mini icon={Image} label="Fotos/vídeos" value={data.kpis.totalPhotos} />
                <Mini icon={CalendarDays} label="Ativos" value={data.eventsByStatus.active || 0} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {Object.entries(data.eventsByStatus).map(([st, n]) => (
                  <span key={st} className="rounded-full border border-line bg-white/[0.03] px-3 py-1 text-xs text-cream-dim">
                    {STATUS_LABEL[st] || st}: <span className="text-cream">{n}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="card p-6">
              <div className="card-section-header"><DollarSign /><span className="card-section-title">Vendas por plano</span></div>
              {data.planDistribution.length === 0 ? (
                <p className="py-6 text-center text-sm text-cream-dim">Nenhuma venda ainda.</p>
              ) : (
                <ul className="space-y-2.5">
                  {data.planDistribution.map((p) => (
                    <li key={p.planId} className="flex items-center justify-between text-sm">
                      <span className="text-cream-dim">{p.label} <span className="text-cream-dim/60">×{p.count}</span></span>
                      <span className="text-cream">{(p.revenueCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Últimas vendas */}
          <div className="card p-6">
            <div className="card-section-header"><Receipt2 /><span className="card-section-title">Últimas vendas</span></div>
            {data.recentSales.length === 0 ? (
              <p className="py-6 text-center text-sm text-cream-dim">Nenhuma venda registrada.</p>
            ) : (
              <div className="divide-y divide-line/60">
                {data.recentSales.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate text-cream">{s.eventName}</p>
                      <p className="truncate text-xs text-cream-dim">{s.organizer?.name} · {s.planLabel}{s.billingType ? ` · ${s.billingType}` : ''}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-cream">{s.amount}</p>
                      <p className="text-xs text-cream-dim">{s.paidAt ? new Date(s.paidAt).toLocaleDateString('pt-BR') : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function Mini({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-line bg-white/[0.02] p-3">
      <div className="mb-1 flex items-center gap-1.5 text-cream-dim"><Icon size={13} /><span className="text-[11px]">{label}</span></div>
      <p className="text-lg font-semibold text-cream">{value}</p>
    </div>
  );
}
