import { NavLink, Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, CalendarDays, Receipt, ArrowLeft, LogOut, Crown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';

const NAV = [
  { to: '/admin', label: 'Visão geral', icon: LayoutDashboard, end: true },
  { to: '/admin/vendas', label: 'Vendas', icon: Receipt },
  { to: '/admin/usuarios', label: 'Usuários', icon: Users },
  { to: '/admin/eventos', label: 'Eventos', icon: CalendarDays },
];

export default function AdminLayout({ title, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen text-cream">
      <header className="glass sticky top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-gold/30 bg-gold/10">
              <Crown size={14} className="text-gold" />
            </span>
            <span className="font-serif text-base font-semibold tracking-tight">Painel Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-cream-dim transition hover:text-cream">
              <ArrowLeft size={15} /> <span className="hidden sm:inline">Voltar ao app</span>
            </Link>
            <button onClick={() => { logout(); navigate('/login'); }}
              className="inline-flex items-center gap-1 text-sm text-cream-dim transition hover:text-danger">
              <LogOut size={15} /> <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-6 px-6 py-8">
        <aside className="hidden w-52 shrink-0 sm:block">
          <nav className="sticky top-24 flex flex-col gap-1">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm transition ${
                    isActive ? 'border border-gold/25 bg-gold/10 text-cream' : 'text-cream-dim hover:bg-white/[0.04] hover:text-cream'
                  }`}>
                <n.icon size={16} /> {n.label}
              </NavLink>
            ))}
            {user && (
              <p className="mt-4 px-3.5 text-[11px] text-cream-dim/70">
                Logado como<br /><span className="text-cream-dim">{user.email}</span>
              </p>
            )}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          {/* Nav mobile */}
          <nav className="mb-6 flex gap-2 overflow-x-auto sm:hidden">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end}
                className={({ isActive }) =>
                  `flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-[13px] transition ${
                    isActive ? 'border border-gold/25 bg-gold/10 text-cream' : 'text-cream-dim'
                  }`}>
                <n.icon size={15} /> {n.label}
              </NavLink>
            ))}
          </nav>
          {title && <h1 className="mb-6 text-3xl">{title}</h1>}
          {children}
        </main>
      </div>
    </div>
  );
}
