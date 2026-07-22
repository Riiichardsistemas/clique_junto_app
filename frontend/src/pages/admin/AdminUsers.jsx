import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  CalendarDays, ChevronRight, Crown, Image, Loader2, Mail, Search,
  ShieldCheck, ShieldOff, UserRound, Users, Wallet, Coins, Gift,
} from 'lucide-react';
import { formatBRL } from '../../utils/plans';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminDrawer from '../../components/admin/AdminDrawer';
import AdminPagination from '../../components/admin/AdminPagination';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { adminApi } from '../../api/adminApi';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../utils/admin';

const PAGE_SIZE = 20;

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [creditInput, setCreditInput] = useState('');
  const [grantingCredit, setGrantingCredit] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 320);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.users({
      search: debouncedSearch,
      role,
      status,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    })
      .then((data) => { setUsers(data.users); setTotal(data.total); })
      .catch(() => toast.error('Não foi possível carregar os usuários.'))
      .finally(() => setLoading(false));
  }, [debouncedSearch, role, status, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [debouncedSearch, role, status]);

  const loadDetail = useCallback((id) => {
    if (!id) return;
    setDetailLoading(true);
    adminApi.user(id)
      .then(setDetail)
      .catch(() => { toast.error('Não foi possível abrir o usuário.'); setSelectedId(null); })
      .finally(() => setDetailLoading(false));
  }, []);

  useEffect(() => { loadDetail(selectedId); }, [selectedId, loadDetail]);

  function openUser(user) {
    setDetail(null);
    setSelectedId(user.id);
  }

  async function confirmUpdate() {
    if (!confirmation) return;
    const target = confirmation.user;
    const payload = confirmation.type === 'role'
      ? { role: target.role === 'admin' ? 'user' : 'admin' }
      : { isActive: !target.isActive };
    setUpdating(true);
    try {
      await adminApi.updateUser(target.id, payload);
      toast.success(confirmation.type === 'role' ? 'Permissão atualizada.' : (target.isActive ? 'Conta desativada.' : 'Conta reativada.'));
      load();
      if (selectedId === target.id) loadDetail(target.id);
      setConfirmation(null);
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Não foi possível atualizar a conta.');
    } finally {
      setUpdating(false);
    }
  }

  async function submitCredit(mode) {
    if (!selectedUser) return;
    const reais = Number(String(creditInput).replace(/\./g, '').replace(',', '.'));
    if (!Number.isFinite(reais) || reais <= 0) {
      toast.error('Informe um valor válido em reais.');
      return;
    }
    const magnitude = Math.round(reais * 100);
    const amountCents = mode === 'debit' ? -magnitude : magnitude;
    setGrantingCredit(true);
    try {
      await adminApi.grantCredit(selectedUser.id, { amountCents, mode: 'add' });
      toast.success(mode === 'debit' ? 'Créditos removidos.' : 'Créditos concedidos.');
      setCreditInput('');
      loadDetail(selectedUser.id);
      load();
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Não foi possível atualizar os créditos.');
    } finally {
      setGrantingCredit(false);
    }
  }

  const selectedUser = detail?.user;
  const confirmationCopy = useMemo(() => {
    if (!confirmation) return {};
    const target = confirmation.user;
    if (confirmation.type === 'status') {
      return target.isActive
        ? {
            title: 'Desativar esta conta?',
            description: `${target.email} perderá o acesso imediatamente, inclusive em sessões já abertas. Os dados e eventos serão preservados.`,
            label: 'Desativar conta',
            danger: true,
          }
        : {
            title: 'Reativar esta conta?',
            description: `${target.email} poderá voltar a entrar e acessar seus dados.`,
            label: 'Reativar conta',
          };
    }
    return target.role === 'admin'
      ? {
          title: 'Remover acesso de super admin?',
          description: `${target.email} passará a ser organizador comum. O sistema sempre preserva ao menos um super admin ativo.`,
          label: 'Remover acesso',
          danger: true,
        }
      : {
          title: 'Conceder acesso de super admin?',
          description: `${target.email} passará a acessar apenas a central administrativa. Eventos existentes permanecem preservados, mas deixam de aparecer para essa conta enquanto ela for admin.`,
          label: 'Conceder acesso',
        };
  }, [confirmation]);

  return (
    <AdminLayout
      title="Usuários"
      description="Gerencie acessos, permissões e o histórico de uso sem interferir nos dados dos organizadores."
      actions={<span className="badge-draft"><Users size={13} /> {total} {total === 1 ? 'conta' : 'contas'}</span>}
    >
      <section className="mb-5 grid gap-3 lg:grid-cols-[minmax(260px,1fr),180px,180px]">
        <label className="admin-search">
          <Search size={16} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome ou email…" aria-label="Buscar usuários" />
        </label>
        <select className="input-field" value={role} onChange={(event) => setRole(event.target.value)} aria-label="Filtrar por papel">
          <option value="">Todos os papéis</option>
          <option value="user">Organizadores</option>
          <option value="admin">Super admins</option>
        </select>
        <select className="input-field" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filtrar por status">
          <option value="">Todos os status</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
        </select>
      </section>

      <section className="card overflow-hidden">
        <div className="hidden grid-cols-[minmax(220px,1fr),120px,120px,120px,80px] gap-4 border-b border-line bg-white/[0.018] px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.16em] text-cream-dim/70 md:grid">
          <span>Conta</span><span>Uso</span><span>Receita</span><span>Acesso</span><span className="text-right">Detalhes</span>
        </div>
        {loading ? (
          <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-cream-dim"><Loader2 className="animate-spin text-gold" /> Carregando usuários…</div>
        ) : users.length ? (
          <div className="divide-y divide-line/60">
            {users.map((account) => (
              <button key={account.id} type="button" onClick={() => openUser(account)} className="grid w-full grid-cols-[1fr,auto] items-center gap-4 px-5 py-4 text-left transition hover:bg-white/[0.025] md:grid-cols-[minmax(220px,1fr),120px,120px,120px,80px]">
                <span className="flex min-w-0 items-center gap-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border font-serif ${account.role === 'admin' ? 'border-gold/25 bg-gold/10 text-gold' : 'border-line bg-white/[0.025] text-cream-dim'}`}>
                    {account.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 truncate text-sm font-semibold text-cream">
                      {account.name}{account.id === currentUser?.id && <span className="text-[10px] text-gold">você</span>}
                    </span>
                    <span className="block truncate text-xs text-cream-dim">{account.email}</span>
                  </span>
                </span>
                <span className="hidden text-sm text-cream-dim md:block">{account.eventCount} eventos</span>
                <span className="hidden md:block">
                  <span className="block text-sm font-semibold text-cream">{account.spent}</span>
                  {account.creditCents > 0 && (
                    <span className="mt-0.5 flex items-center gap-1 text-[11px] text-gold"><Coins size={11} /> {account.credit}</span>
                  )}
                </span>
                <span className="hidden md:block">
                  {account.isActive
                    ? <span className={account.role === 'admin' ? 'badge-revealed' : 'badge-active'}>{account.role === 'admin' ? 'Super admin' : 'Ativo'}</span>
                    : <span className="badge-closed">Inativo</span>}
                </span>
                <span className="flex items-center justify-end gap-2 text-cream-dim">
                  <span className="md:hidden">{account.role === 'admin' ? 'Admin' : `${account.eventCount} ev.`}</span><ChevronRight size={16} />
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex min-h-64 flex-col items-center justify-center p-6 text-center">
            <UserRound size={26} className="mb-3 text-cream-dim/45" />
            <p className="text-sm font-semibold text-cream">Nenhuma conta encontrada</p>
            <p className="mt-1 text-xs text-cream-dim">Ajuste a busca ou remova algum filtro.</p>
          </div>
        )}
      </section>

      <AdminPagination total={total} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />

      <AdminDrawer
        open={!!selectedId}
        title={selectedUser?.name || 'Detalhes da conta'}
        eyebrow={selectedUser?.role === 'admin' ? 'Super admin' : 'Organizador'}
        onClose={() => { setSelectedId(null); setDetail(null); }}
      >
        {detailLoading || !detail ? (
          <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-cream-dim"><Loader2 className="animate-spin text-gold" /> Carregando perfil…</div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-gold/20 bg-gold/[0.08] font-serif text-2xl text-gold">{selectedUser.name.charAt(0).toUpperCase()}</span>
              <div className="min-w-0 pt-1">
                <p className="truncate text-lg font-semibold text-cream">{selectedUser.name}</p>
                <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-cream-dim"><Mail size={13} />{selectedUser.email}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={selectedUser.isActive ? 'badge-active' : 'badge-closed'}>{selectedUser.isActive ? 'Conta ativa' : 'Conta inativa'}</span>
                  {selectedUser.role === 'admin' && <span className="badge-revealed"><Crown size={12} /> Super admin</span>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Summary icon={CalendarDays} label="Eventos" value={detail.summary.eventCount} />
              <Summary icon={Wallet} label="Receita" value={detail.summary.spent} />
              <Summary icon={Image} label="Mídias" value={detail.summary.photoCount} />
              <Summary icon={Users} label="Convidados" value={detail.summary.guestCount} />
            </div>

            <div className="rounded-2xl border border-line bg-white/[0.018] p-4 text-sm">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-cream-dim/70">Informações da conta</p>
              <Info label="Criada em" value={formatDate(selectedUser.createdAt)} />
              <Info label="Identificador" value={String(selectedUser.id).slice(0, 13)} mono />
              <Info label="Provedor" value={selectedUser.provider === 'credentials' ? 'Email e senha' : selectedUser.provider} />
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-cream">Eventos recentes</h3>
                <span className="text-xs text-cream-dim">{detail.events.length} no total</span>
              </div>
              {detail.events.length ? (
                <div className="divide-y divide-line/60 rounded-2xl border border-line">
                  {detail.events.slice(0, 5).map((event) => (
                    <div key={event.id} className="flex items-center justify-between gap-3 p-3.5">
                      <div className="min-w-0"><p className="truncate text-sm font-semibold text-cream">{event.name}</p><p className="mt-1 text-xs text-cream-dim">{event.photoCount} mídias · {event.guestCount} convidados</p></div>
                      <span className={`badge-${event.status}`}>{event.status}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-cream-dim">Esta conta ainda não criou eventos.</p>}
            </div>

            <div className="border-t border-line pt-6">
              <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.15em] text-cream-dim/70">
                <Coins size={13} className="text-gold" /> Créditos
              </p>
              <div className="rounded-2xl border border-line bg-white/[0.018] p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-cream-dim">Saldo atual</span>
                  <span className="font-serif text-2xl font-semibold text-gold">
                    {detail.summary?.credit ?? formatBRL(selectedUser.creditCents || 0)}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-cream-dim/80">
                  Créditos permitem que o organizador ative um evento pago sem pagar, direto no checkout.
                </p>
                <div className="mt-3 flex items-stretch gap-2">
                  <div className="relative flex-1">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-cream-dim">R$</span>
                    <input
                      className="input-field pl-9"
                      inputMode="decimal"
                      placeholder="0,00"
                      aria-label="Valor em reais"
                      value={creditInput}
                      onChange={(event) => setCreditInput(event.target.value.replace(/[^\d.,]/g, ''))}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn-primary btn-sm shrink-0"
                    disabled={grantingCredit}
                    onClick={() => submitCredit('add')}
                  >
                    {grantingCredit ? <Loader2 size={15} className="animate-spin" /> : <><Gift size={15} /> Conceder</>}
                  </button>
                </div>
                <button
                  type="button"
                  className="btn-danger-ghost btn-sm mt-2 w-full"
                  disabled={grantingCredit || !(selectedUser.creditCents > 0)}
                  onClick={() => submitCredit('debit')}
                >
                  Remover do saldo
                </button>
              </div>
            </div>

            <div className="border-t border-line pt-6">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-cream-dim/70">Controle de acesso</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  className="btn-ghost btn-sm flex-1"
                  disabled={selectedUser.id === currentUser?.id}
                  onClick={() => setConfirmation({ type: 'role', user: selectedUser })}
                >
                  <Crown size={15} /> {selectedUser.role === 'admin' ? 'Tornar organizador' : 'Tornar super admin'}
                </button>
                <button
                  type="button"
                  className={`${selectedUser.isActive ? 'btn-danger-ghost' : 'btn-ghost'} btn-sm flex-1`}
                  disabled={selectedUser.id === currentUser?.id}
                  onClick={() => setConfirmation({ type: 'status', user: selectedUser })}
                >
                  {selectedUser.isActive ? <ShieldOff size={15} /> : <ShieldCheck size={15} />}
                  {selectedUser.isActive ? 'Desativar' : 'Reativar'}
                </button>
              </div>
              {selectedUser.id === currentUser?.id && <p className="mt-3 text-xs leading-5 text-cream-dim">Por segurança, você não pode alterar nem desativar o próprio acesso.</p>}
            </div>
          </div>
        )}
      </AdminDrawer>

      <ConfirmDialog
        open={!!confirmation}
        title={confirmationCopy.title}
        description={confirmationCopy.description}
        confirmLabel={confirmationCopy.label}
        danger={confirmationCopy.danger}
        busy={updating}
        onCancel={() => setConfirmation(null)}
        onConfirm={confirmUpdate}
      />
    </AdminLayout>
  );
}

function Summary({ icon: Icon, label, value }) {
  return <div className="rounded-2xl border border-line bg-white/[0.02] p-4"><Icon size={14} className="mb-3 text-gold" /><p className="truncate text-lg font-semibold text-cream">{value}</p><p className="mt-1 text-xs text-cream-dim">{label}</p></div>;
}

function Info({ label, value, mono }) {
  return <div className="flex items-center justify-between gap-4 border-t border-line/60 py-2.5 first:border-0"><span className="text-cream-dim">{label}</span><span className={`truncate text-right text-cream ${mono ? 'font-mono text-xs' : ''}`}>{value}</span></div>;
}
