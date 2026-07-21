import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity, CalendarDays, CreditCard, LayoutDashboard, LogOut,
  MoreHorizontal, ScrollText, Settings, ShieldCheck, Users, X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import Brand from '../ui/Brand.jsx';

const GROUPS = [
  {
    label: 'Monitoramento',
    items: [
      { to: '/admin', label: 'Visão geral', icon: LayoutDashboard, end: true },
      { to: '/admin/vendas', label: 'Vendas', icon: CreditCard },
    ],
  },
  {
    label: 'Operação',
    items: [
      { to: '/admin/usuarios', label: 'Usuários', icon: Users },
      { to: '/admin/eventos', label: 'Eventos', icon: CalendarDays },
    ],
  },
  {
    label: 'Governança',
    items: [
      { to: '/admin/auditoria', label: 'Auditoria', icon: ScrollText },
      { to: '/admin/sistema', label: 'Sistema', icon: Activity },
    ],
  },
];

const MOBILE_ITEMS = [
  { to: '/admin', label: 'Geral', icon: LayoutDashboard, end: true },
  { to: '/admin/vendas', label: 'Vendas', icon: CreditCard },
  { to: '/admin/usuarios', label: 'Usuários', icon: Users },
  { to: '/admin/eventos', label: 'Eventos', icon: CalendarDays },
];

function Navigation({ onNavigate }) {
  return (
    <nav className="space-y-6" aria-label="Navegação administrativa">
      {GROUPS.map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-cream-dim/55">{group.label}</p>
          <div className="space-y-1">
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) => `group flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${
                  isActive
                    ? 'border border-gold/20 bg-gold/[0.09] text-cream shadow-[inset_0_1px_0_rgba(255,255,255,.035)]'
                    : 'border border-transparent text-cream-dim hover:bg-white/[0.035] hover:text-cream'
                }`}
              >
                <item.icon size={17} className="text-gold/80 transition group-hover:text-gold" />
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

export default function AdminLayout({ title, description, actions, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = oldOverflow; };
  }, [mobileOpen]);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const profile = (
    <div className="rounded-2xl border border-line bg-white/[0.025] p-3">
      <NavLink to="/admin/conta" onClick={() => setMobileOpen(false)} className="flex min-h-12 items-center gap-3 rounded-xl p-1.5 transition hover:bg-white/[0.035]">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold/25 bg-gold/10 font-serif text-gold">
          {(user?.name || user?.email || 'A').charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-cream">{user?.name}</span>
          <span className="block truncate text-[11px] text-cream-dim">Super admin</span>
        </span>
        <Settings size={15} className="text-cream-dim" />
      </NavLink>
      <button type="button" onClick={handleLogout} className="mt-2 flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-xs font-semibold text-cream-dim transition hover:bg-danger/[0.08] hover:text-danger">
        <LogOut size={15} /> Encerrar sessão
      </button>
    </div>
  );

  const moreActive = ['/admin/auditoria', '/admin/sistema', '/admin/conta'].some((path) => location.pathname.startsWith(path));

  return (
    <div className="app-screen pb-[calc(4.55rem+env(safe-area-inset-bottom))] text-cream lg:pb-0">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-[#0b0b0d]/90 px-4 py-5 backdrop-blur-xl lg:flex lg:flex-col">
        <Brand to="/admin" className="mb-8 px-2" />
        <div className="mb-7 flex items-center gap-2 rounded-xl border border-success/15 bg-success/[0.055] px-3 py-2 text-[11px] font-semibold text-success">
          <span className="h-2 w-2 rounded-full bg-success shadow-[0_0_12px_rgba(74,222,128,.65)]" />
          Central administrativa
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1"><Navigation /></div>
        <div className="mt-5">{profile}</div>
      </aside>

      <header className="app-topbar glass sticky top-0 z-20 lg:ml-64">
        <div className="mx-auto flex min-h-[60px] max-w-[1480px] items-center justify-between gap-3 px-4 sm:px-6 lg:min-h-16 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Brand compact to="/admin" className="lg:hidden" />
            <div className="min-w-0">
              <p className="label-mono hidden text-gold sm:block">Super admin</p>
              <p className="truncate text-sm font-semibold text-cream lg:hidden">{title || 'Administração'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-line bg-white/[0.025] px-3 py-1.5 text-xs text-cream-dim">
            <ShieldCheck size={14} className="text-gold" />
            <span className="hidden sm:inline">Sessão protegida</span>
            <span className="sm:hidden">Admin</span>
          </div>
        </div>
      </header>

      <main className="lg:ml-64">
        <div className="mx-auto max-w-[1480px] px-4 py-6 sm:px-6 sm:py-9 lg:px-8 lg:py-10">
          {(title || description || actions) && (
            <div className="mb-6 flex flex-col justify-between gap-4 sm:mb-9 sm:flex-row sm:items-end">
              <div className="max-w-3xl">
                <h1 className="text-gradient text-[32px] leading-none sm:text-4xl">{title}</h1>
                {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-cream-dim">{description}</p>}
              </div>
              {actions && <div className="flex w-full shrink-0 flex-wrap gap-2 [&>*]:flex-1 sm:w-auto sm:[&>*]:flex-none">{actions}</div>}
            </div>
          )}
          {children}
        </div>
      </main>

      <nav className="mobile-tabbar lg:hidden" aria-label="Navegação administrativa móvel">
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
          {MOBILE_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className="mobile-tab-item">
              <span className="mobile-tab-icon"><Icon size={18} /></span>
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className={`mobile-tab-item ${moreActive ? 'text-gold-light' : ''}`}
            aria-label="Abrir mais opções administrativas"
          >
            <span className={`mobile-tab-icon ${moreActive ? 'bg-gold/10' : ''}`}><MoreHorizontal size={19} /></span>
            <span>Mais</span>
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm lg:hidden" onMouseDown={(event) => event.target === event.currentTarget && setMobileOpen(false)}>
          <aside className="safe-top safe-bottom flex h-full w-[min(88vw,330px)] flex-col border-r border-line bg-[#0b0b0d] p-5 animate-slidein-left">
            <div className="mb-7 flex items-center justify-between gap-3">
              <Brand to="/admin" onClick={() => setMobileOpen(false)} />
              <button type="button" className="icon-button" onClick={() => setMobileOpen(false)} aria-label="Fechar menu"><X size={18} /></button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto"><Navigation onNavigate={() => setMobileOpen(false)} /></div>
            <div className="mt-5">{profile}</div>
          </aside>
        </div>
      )}
    </div>
  );
}
