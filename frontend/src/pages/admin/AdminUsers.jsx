import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Search, Loader2, ShieldCheck, ShieldOff, Crown } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminApi } from '../../api/adminApi';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback((q = '') => {
    setLoading(true);
    adminApi.users({ search: q, limit: 50 })
      .then((d) => { setUsers(d.users); setTotal(d.total); })
      .catch(() => toast.error('Erro ao carregar usuários.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const t = setTimeout(() => load(search), 350);
    return () => clearTimeout(t);
  }, [search, load]);

  async function toggleActive(u) {
    try {
      const d = await adminApi.updateUser(u.id, { isActive: !u.isActive });
      setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, isActive: d.user.isActive } : x)));
      toast.success(d.user.isActive ? 'Usuário ativado.' : 'Usuário desativado.');
    } catch (e) { toast.error(e?.response?.data?.error || 'Erro ao atualizar.'); }
  }

  async function toggleRole(u) {
    const nextRole = u.role === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`Tornar ${u.email} ${nextRole === 'admin' ? 'ADMIN' : 'usuário comum'}?`)) return;
    try {
      const d = await adminApi.updateUser(u.id, { role: nextRole });
      setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, role: d.user.role } : x)));
      toast.success('Papel atualizado.');
    } catch (e) { toast.error(e?.response?.data?.error || 'Erro ao atualizar.'); }
  }

  return (
    <AdminLayout title="Usuários">
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-line bg-black/25 px-3.5">
        <Search size={16} className="text-cream-dim" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou email…"
          className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-cream-dim/60" />
      </div>
      <p className="mb-3 text-xs text-cream-dim">{total} usuário(s)</p>

      {loading ? (
        <div className="flex items-center gap-3 py-16 text-cream-dim"><Loader2 className="h-6 w-6 animate-spin text-gold" /> Carregando…</div>
      ) : (
        <div className="card overflow-hidden">
          <div className="hidden grid-cols-[1fr,auto,auto,auto,auto] gap-4 border-b border-line px-5 py-3 text-[11px] uppercase tracking-wider text-cream-dim sm:grid">
            <span>Usuário</span><span>Eventos</span><span>Gasto</span><span>Papel</span><span className="text-right">Ações</span>
          </div>
          <div className="divide-y divide-line/60">
            {users.map((u) => (
              <div key={u.id} className="grid grid-cols-1 gap-2 px-5 py-3.5 text-sm sm:grid-cols-[1fr,auto,auto,auto,auto] sm:items-center sm:gap-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate text-cream">
                    {u.role === 'admin' && <Crown size={13} className="shrink-0 text-gold" />}
                    {u.name}
                    {!u.isActive && <span className="rounded bg-danger/15 px-1.5 py-0.5 text-[10px] text-danger">inativo</span>}
                  </p>
                  <p className="truncate text-xs text-cream-dim">{u.email}</p>
                </div>
                <span className="text-cream-dim">{u.eventCount} ev.</span>
                <span className="text-cream">{u.spent}</span>
                <span className="text-cream-dim">{u.role === 'admin' ? 'Admin' : 'Usuário'}</span>
                <div className="flex items-center gap-2 sm:justify-end">
                  <button onClick={() => toggleRole(u)} title="Alternar admin"
                    className="rounded-lg border border-line px-2 py-1 text-xs text-cream-dim transition hover:text-gold">
                    <Crown size={13} />
                  </button>
                  <button onClick={() => toggleActive(u)} title={u.isActive ? 'Desativar' : 'Ativar'}
                    className={`rounded-lg border border-line px-2 py-1 text-xs transition ${u.isActive ? 'text-cream-dim hover:text-danger' : 'text-success'}`}>
                    {u.isActive ? <ShieldOff size={13} /> : <ShieldCheck size={13} />}
                  </button>
                </div>
              </div>
            ))}
            {users.length === 0 && <p className="px-5 py-10 text-center text-sm text-cream-dim">Nenhum usuário encontrado.</p>}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
