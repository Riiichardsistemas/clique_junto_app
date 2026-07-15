import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Search, Loader2 } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminApi } from '../../api/adminApi';

const STATUSES = [
  { v: '', label: 'Todos' },
  { v: 'draft', label: 'Rascunho' },
  { v: 'active', label: 'Ativo' },
  { v: 'closed', label: 'Encerrado' },
  { v: 'revealed', label: 'Revelado' },
];
const BADGE = { draft: 'badge-draft', active: 'badge-active', closed: 'badge-closed', revealed: 'badge-revealed' };
const LABEL = { draft: 'Rascunho', active: 'Ativo', closed: 'Encerrado', revealed: 'Revelado' };

export default function AdminEvents() {
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback((q, st) => {
    setLoading(true);
    adminApi.events({ search: q, status: st, limit: 50 })
      .then((d) => { setEvents(d.events); setTotal(d.total); })
      .catch(() => toast.error('Erro ao carregar eventos.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search, status), 300);
    return () => clearTimeout(t);
  }, [search, status, load]);

  return (
    <AdminLayout title="Eventos">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-line bg-black/25 px-3.5">
          <Search size={16} className="text-cream-dim" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar evento…"
            className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-cream-dim/60" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {STATUSES.map((s) => (
            <button key={s.v} onClick={() => setStatus(s.v)}
              className={`shrink-0 rounded-lg border px-3 py-2 text-xs transition ${status === s.v ? 'border-gold/30 bg-gold/10 text-cream' : 'border-line text-cream-dim hover:text-cream'}`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <p className="mb-3 text-xs text-cream-dim">{total} evento(s)</p>

      {loading ? (
        <div className="flex items-center gap-3 py-16 text-cream-dim"><Loader2 className="h-6 w-6 animate-spin text-gold" /> Carregando…</div>
      ) : (
        <div className="card divide-y divide-line/60 overflow-hidden">
          {events.map((ev) => (
            <div key={ev.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate text-cream">{ev.name}</p>
                <p className="truncate text-xs text-cream-dim">{ev.organizer?.name} · {ev.organizer?.email}</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-cream-dim">
                <span>{ev.guestCount} conv.</span>
                <span>{ev.photoCount} fotos</span>
                <span className="text-cream-dim/80">{ev.planId}</span>
                <span className={BADGE[ev.status] || 'badge-draft'}>{LABEL[ev.status] || ev.status}</span>
              </div>
            </div>
          ))}
          {events.length === 0 && <p className="px-5 py-10 text-center text-sm text-cream-dim">Nenhum evento encontrado.</p>}
        </div>
      )}
    </AdminLayout>
  );
}
