import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, AlertTriangle, ArrowRight, CalendarDays, CreditCard, Database,
  HardDrive, Image, Loader2, RefreshCw, ScrollText, TrendingUp, Users,
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import SalesChart from '../../components/admin/SalesChart';
import { adminApi } from '../../api/adminApi';
import { ACTION_LABELS, formatBytes, formatDateTime } from '../../utils/admin';

const STATUS_LABEL = { draft: 'Rascunhos', active: 'Ativos', closed: 'Encerrados', revealed: 'Revelados' };

function Kpi({ icon: Icon, label, value, sub, tone = 'gold' }) {
  const toneClass = tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning' : 'text-gold';
  return (
    <article className="card card-hover group relative overflow-hidden p-4 sm:p-5">
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gold/[0.035] blur-2xl transition group-hover:bg-gold/[0.07]" />
      <div className="relative mb-3 flex items-center justify-between sm:mb-5">
        <span className="label-mono">{label}</span>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03] ${toneClass}`}>
          <Icon size={16} />
        </span>
      </div>
      <p className="relative text-2xl font-semibold tracking-tight text-cream sm:text-[28px]">{value}</p>
      <p className="relative mt-1.5 min-h-5 text-xs leading-5 text-cream-dim">{sub}</p>
    </article>
  );
}

function SectionTitle({ icon: Icon, title, link, linkLabel = 'Ver tudo' }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3 border-b border-line pb-4">
      <div className="flex items-center gap-2.5 text-sm font-bold text-cream"><Icon size={16} className="text-gold" />{title}</div>
      {link && <Link to={link} className="flex min-h-11 items-center gap-1 text-xs font-semibold text-cream-dim transition hover:text-cream">{linkLabel}<ArrowRight size={13} /></Link>}
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    adminApi.overview()
      .then(setData)
      .catch((requestError) => setError(requestError?.response?.data?.error || 'Não foi possível carregar as métricas.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const actions = (
    <button type="button" className="btn-ghost btn-sm" onClick={load} disabled={loading}>
      <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Atualizar
    </button>
  );

  return (
    <AdminLayout
      title="Visão geral"
      description="Acompanhe receita, adoção e a saúde operacional da plataforma em um único lugar."
      actions={actions}
    >
      {loading && !data ? (
        <div className="card flex min-h-72 items-center justify-center gap-3 text-cream-dim"><Loader2 className="animate-spin text-gold" /> Consolidando indicadores…</div>
      ) : error ? (
        <div className="card flex min-h-56 flex-col items-center justify-center p-6 text-center">
          <AlertTriangle className="mb-3 text-danger" />
          <p className="text-sm text-danger">{error}</p>
          <button type="button" className="btn-ghost btn-sm mt-5" onClick={load}>Tentar novamente</button>
        </div>
      ) : data && (
        <div className="space-y-6 animate-fadein">
          <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <Kpi icon={TrendingUp} label="Receita total" value={data.kpis.revenue} sub={`${data.kpis.salesCount} pagamentos aprovados`} tone="success" />
            <Kpi icon={CreditCard} label="Receita no mês" value={data.kpis.revenueMonth} sub={`${data.kpis.salesThisMonth} vendas neste mês`} />
            <Kpi icon={Users} label="Usuários ativos" value={data.kpis.activeUsers} sub={`+${data.kpis.usersThisMonth} ${data.kpis.usersThisMonth === 1 ? 'nova conta' : 'novas contas'} no mês`} />
            <Kpi icon={CalendarDays} label="Eventos" value={data.kpis.totalEvents} sub={`+${data.kpis.eventsThisMonth} criados neste mês`} />
          </section>

          {(data.kpis.pendingPayments > 0 || data.kpis.failedPayments > 0 || data.kpis.inactiveUsers > 0) && (
            <section className="grid gap-3 md:grid-cols-3" aria-label="Pontos de atenção">
              <Link to="/admin/vendas" className="flex items-center gap-3 rounded-2xl border border-warning/20 bg-warning/[0.055] p-4 transition hover:bg-warning/[0.08]">
                <AlertTriangle size={17} className="text-warning" /><span className="text-sm"><b>{data.kpis.pendingPayments}</b> pagamentos pendentes</span><ArrowRight size={14} className="ml-auto text-cream-dim" />
              </Link>
              <Link to="/admin/vendas" className="flex items-center gap-3 rounded-2xl border border-danger/20 bg-danger/[0.045] p-4 transition hover:bg-danger/[0.07]">
                <CreditCard size={17} className="text-danger" /><span className="text-sm"><b>{data.kpis.failedPayments}</b> pagamentos falhos</span><ArrowRight size={14} className="ml-auto text-cream-dim" />
              </Link>
              <Link to="/admin/usuarios" className="flex items-center gap-3 rounded-2xl border border-line bg-white/[0.025] p-4 transition hover:bg-white/[0.045]">
                <Users size={17} className="text-gold" /><span className="text-sm"><b>{data.kpis.inactiveUsers}</b> contas inativas</span><ArrowRight size={14} className="ml-auto text-cream-dim" />
              </Link>
            </section>
          )}

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr),minmax(300px,.8fr)]">
            <div className="card p-5 sm:p-6">
              <SectionTitle icon={TrendingUp} title="Receita nos últimos 30 dias" link="/admin/vendas" />
              <div className="mb-4 flex flex-wrap gap-x-7 gap-y-2 text-xs text-cream-dim">
                <span>Ticket médio <b className="ml-1 text-cream">{data.kpis.avgTicket}</b></span>
                <span>Conversão de cobranças <b className="ml-1 text-cream">{data.kpis.paymentConversionRate}%</b></span>
              </div>
              <SalesChart data={data.salesSeries} />
            </div>

            <div className="card p-5 sm:p-6">
              <SectionTitle icon={Activity} title="Operação" link="/admin/sistema" linkLabel="Saúde do sistema" />
              <div className="space-y-3">
                <Operational icon={Image} label="Mídias armazenadas" value={data.kpis.totalPhotos.toLocaleString('pt-BR')} sub={formatBytes(data.kpis.totalMediaBytes)} />
                <Operational icon={Users} label="Convidados" value={data.kpis.totalGuests.toLocaleString('pt-BR')} sub="participações registradas" />
                <Operational icon={Database} label="Super admins ativos" value={data.kpis.adminCount} sub="acessos privilegiados" />
                <Operational icon={HardDrive} label="Uso médio por evento" value={formatBytes(data.kpis.totalEvents ? data.kpis.totalMediaBytes / data.kpis.totalEvents : 0)} sub="mídia por evento" />
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <div className="card p-5 sm:p-6">
              <SectionTitle icon={CalendarDays} title="Distribuição dos eventos" link="/admin/eventos" />
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(STATUS_LABEL).map(([status, label]) => (
                  <div key={status} className="rounded-2xl border border-line bg-white/[0.02] p-4">
                    <p className="text-xs text-cream-dim">{label}</p>
                    <p className="mt-2 text-2xl font-semibold text-cream">{data.eventsByStatus[status] || 0}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 border-t border-line pt-5">
                <p className="mb-3 text-xs font-semibold text-cream-dim">Receita por plano</p>
                {data.planDistribution.length ? data.planDistribution.slice(0, 4).map((plan) => (
                  <div key={plan.planId} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="text-cream-dim">{plan.label} <span className="text-cream-dim/50">×{plan.count}</span></span>
                    <span className="font-semibold text-cream">{(plan.revenueCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                )) : <p className="py-4 text-sm text-cream-dim">Aguardando as primeiras vendas.</p>}
              </div>
            </div>

            <div className="card p-5 sm:p-6">
              <SectionTitle icon={CreditCard} title="Vendas recentes" link="/admin/vendas" />
              {data.recentSales.length ? (
                <div className="divide-y divide-line/60">
                  {data.recentSales.map((sale) => (
                    <div key={sale.id} className="flex items-center justify-between gap-4 py-3.5 first:pt-0">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-cream">{sale.eventName}</p>
                        <p className="mt-1 truncate text-xs text-cream-dim">{sale.organizer?.name || 'Sem organizador'} · {sale.planLabel}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-success">{sale.amount}</p>
                        <p className="mt-1 text-[11px] text-cream-dim">{formatDateTime(sale.paidAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="py-12 text-center text-sm text-cream-dim">Nenhuma venda registrada.</p>}
            </div>
          </section>

          <section className="card p-5 sm:p-6">
            <SectionTitle icon={ScrollText} title="Atividade administrativa recente" link="/admin/auditoria" />
            {data.recentAudit.length ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {data.recentAudit.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 rounded-2xl border border-line bg-white/[0.018] p-4">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold/10 text-gold"><ScrollText size={14} /></span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-cream">{ACTION_LABELS[log.action] || log.action}</p>
                      <p className="mt-1 truncate text-xs text-cream-dim">{log.targetLabel || log.targetType} · {log.admin?.name || 'Sistema'}</p>
                      <p className="mt-1 text-[11px] text-cream-dim/65">{formatDateTime(log.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="py-8 text-center text-sm text-cream-dim">As próximas ações administrativas aparecerão aqui.</p>}
          </section>
        </div>
      )}
    </AdminLayout>
  );
}

function Operational({ icon: Icon, label, value, sub }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-white/[0.018] p-3.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.035] text-gold"><Icon size={15} /></span>
      <div className="min-w-0 flex-1"><p className="text-xs text-cream-dim">{label}</p><p className="truncate text-[11px] text-cream-dim/55">{sub}</p></div>
      <p className="shrink-0 text-sm font-semibold text-cream">{value}</p>
    </div>
  );
}
