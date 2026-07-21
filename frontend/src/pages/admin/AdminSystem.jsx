import { useCallback, useEffect, useState } from 'react';
import {
  Activity, CheckCircle2, CircleAlert, Clock3, Cloud, CreditCard, Database,
  HardDrive, Loader2, Mail, RefreshCw, Server,
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminApi } from '../../api/adminApi';
import { formatDateTime } from '../../utils/admin';

const ICONS = { database: Database, storage: HardDrive, payments: CreditCard, email: Mail };

export default function AdminSystem() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    adminApi.system()
      .then(setData)
      .catch((requestError) => setError(requestError?.response?.data?.error || 'Não foi possível consultar o sistema.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const actions = <button type="button" className="btn-ghost btn-sm" onClick={load} disabled={loading}><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Verificar agora</button>;

  return (
    <AdminLayout title="Sistema" description="Valide serviços essenciais e configurações operacionais sem expor credenciais sensíveis." actions={actions}>
      {loading && !data ? (
        <div className="card flex min-h-72 items-center justify-center gap-3 text-sm text-cream-dim"><Loader2 className="animate-spin text-gold" /> Verificando serviços…</div>
      ) : error ? (
        <div className="card flex min-h-56 flex-col items-center justify-center p-6 text-center"><CircleAlert className="mb-3 text-danger" /><p className="text-sm text-danger">{error}</p><button type="button" className="btn-ghost btn-sm mt-5" onClick={load}>Tentar novamente</button></div>
      ) : data && (
        <div className="space-y-6 animate-fadein">
          <section className="card overflow-hidden p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-success/20 bg-success/[0.07] text-success"><Activity size={21} /></span>
                <div><p className="text-lg font-semibold text-cream">Plataforma em operação</p><p className="mt-1 text-xs text-cream-dim">Última verificação: {formatDateTime(data.checkedAt)}</p></div>
              </div>
              <span className="badge-active"><span className="h-1.5 w-1.5 rounded-full bg-success" /> API online</span>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            {data.services.map((service) => <Service key={service.id} service={service} />)}
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr,.7fr]">
            <div className="card p-5 sm:p-6">
              <div className="card-section-header"><Server /><span className="card-section-title">Ambiente de execução</span></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Runtime icon={Cloud} label="Ambiente" value={data.runtime.environment} />
                <Runtime icon={Server} label="Node.js" value={data.runtime.nodeVersion} />
                <Runtime icon={Clock3} label="Servidor iniciado" value={formatDateTime(data.runtime.startedAt)} />
                <Runtime icon={Activity} label="Tempo em operação" value={formatUptime(data.runtime.uptimeSeconds)} />
              </div>
            </div>
            <div className="card p-5 sm:p-6">
              <div className="card-section-header"><CheckCircle2 /><span className="card-section-title">Boas práticas</span></div>
              <ul className="space-y-3 text-sm leading-6 text-cream-dim">
                <Item>Credenciais nunca são retornadas por esta tela.</Item>
                <Item>Ações privilegiadas são registradas na auditoria.</Item>
                <Item>Contas desativadas perdem sessões imediatamente.</Item>
                <Item>O último super admin ativo é protegido.</Item>
              </ul>
            </div>
          </section>
        </div>
      )}
    </AdminLayout>
  );
}

function Service({ service }) {
  const Icon = ICONS[service.id] || Server;
  const healthy = service.status === 'operational';
  return (
    <article className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <span className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${healthy ? 'border-success/15 bg-success/[0.055] text-success' : 'border-warning/20 bg-warning/[0.06] text-warning'}`}><Icon size={19} /></span>
        <span className={healthy ? 'badge-active' : 'badge-closed'}>{healthy ? 'Operacional' : 'Atenção'}</span>
      </div>
      <h2 className="mt-5 font-sans text-base font-semibold text-cream">{service.label}</h2>
      <p className="mt-1 text-sm text-cream-dim">{service.provider}</p>
      <p className="mt-4 border-t border-line pt-4 text-xs leading-5 text-cream-dim">{service.detail}</p>
    </article>
  );
}

function Runtime({ icon: Icon, label, value }) {
  return <div className="rounded-2xl border border-line bg-white/[0.018] p-4"><Icon size={15} className="mb-3 text-gold" /><p className="text-xs text-cream-dim">{label}</p><p className="mt-1 truncate text-sm font-semibold capitalize text-cream">{value}</p></div>;
}

function Item({ children }) {
  return <li className="flex items-start gap-2.5"><CheckCircle2 size={15} className="mt-1 shrink-0 text-success" />{children}</li>;
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}min`;
  return `${Math.max(1, minutes)} min`;
}
