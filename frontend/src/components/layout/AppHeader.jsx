import { Link, NavLink } from 'react-router-dom';
import { Images, CalendarRange, Settings, LogOut, Crown, Gift } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import Brand from '../ui/Brand.jsx';
import MobileBottomNav from './MobileBottomNav.jsx';

/**
 * Shell de navegação do organizador.
 * Desktop usa navegação superior; mobile usa tab bar fixa ao alcance do polegar.
 */
export default function AppHeader() {
  const { user, logout } = useAuth();
  const initial = (user?.name || '?').trim().charAt(0).toUpperCase();

  const navItem = ({ isActive }) =>
    `flex min-h-11 items-center gap-2 rounded-full border px-3.5 text-sm font-bold transition ${
      isActive
        ? 'border-gold/30 bg-gold/[0.10] text-gold-light'
        : 'border-transparent text-cream-dim hover:bg-white/[0.045] hover:text-cream'
    }`;

  return (
    <>
      <header className="app-topbar glass sticky top-0 z-20">
        <div className="mx-auto flex min-h-[60px] max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
          <Brand className="[&_.brand-name]:text-[20px]" />

          <nav className="hidden items-center gap-0.5 md:flex" aria-label="Navegação principal">
            <NavLink to="/dashboard" className={navItem} aria-label="Eventos">
              <CalendarRange size={15} aria-hidden="true" />
              <span>Eventos</span>
            </NavLink>
            <NavLink to="/albuns" className={navItem} aria-label="Álbuns">
              <Images size={15} aria-hidden="true" />
              <span>Álbuns</span>
            </NavLink>
            <NavLink to="/afiliados" className={navItem} aria-label="Indique e ganhe">
              <Gift size={15} aria-hidden="true" />
              <span>Indique e ganhe</span>
            </NavLink>
            {user?.role === 'admin' && (
              <NavLink to="/admin" className={navItem} aria-label="Administração">
                <Crown size={15} aria-hidden="true" />
                <span>Admin</span>
              </NavLink>
            )}
          </nav>

          <div className="hidden items-center gap-1 md:flex">
            <NavLink
              to="/account"
              className={({ isActive }) =>
                `icon-button ${isActive ? 'border-gold/30 bg-gold/[0.10] text-gold-light' : ''}`
              }
              aria-label="Configurações da conta"
            >
              <Settings size={16} aria-hidden="true" />
            </NavLink>
            <button type="button" onClick={logout} className="icon-button" aria-label="Sair da conta">
              <LogOut size={16} aria-hidden="true" />
            </button>
            <Link
              to="/account"
              className="ml-1 flex h-10 w-10 items-center justify-center rounded-full border border-gold/30 bg-gold/[0.10] text-sm font-bold text-gold-light transition hover:border-gold/50"
              aria-label={user?.name ? `Conta de ${user.name}` : 'Conta'}
            >
              {initial}
            </Link>
          </div>

          <Link
            to="/account"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-gold/30 bg-gold/[0.10] text-sm font-bold text-gold-light md:hidden"
            aria-label={user?.name ? `Conta de ${user.name}` : 'Conta'}
          >
            {initial}
          </Link>
        </div>
      </header>
      <MobileBottomNav />
    </>
  );
}
