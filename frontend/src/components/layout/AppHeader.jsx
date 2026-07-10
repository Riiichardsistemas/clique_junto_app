import { Link, NavLink } from 'react-router-dom';
import { Aperture, Images, CalendarRange, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';

/**
 * Header unificado da área do organizador (usuário logado).
 * Usado em: Dashboard, Álbuns e Configurações da conta.
 */
export default function AppHeader() {
  const { user, logout } = useAuth();
  const initial = (user?.name || '?').trim().charAt(0).toUpperCase();

  const navItem = ({ isActive }) =>
    `flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition ${
      isActive
        ? 'bg-gold/[0.12] text-gold'
        : 'text-cream-dim hover:bg-gold/[0.06] hover:text-cream'
    }`;

  return (
    <header className="glass sticky top-0 z-20">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-gold/25 bg-gold/[0.08]">
            <Aperture size={15} className="text-gold" />
          </span>
          <span className="hidden font-serif text-base font-semibold tracking-tight sm:inline">
            Era Uma Vez
          </span>
        </Link>

        {/* Navegação principal */}
        <nav className="flex items-center gap-1">
          <NavLink to="/dashboard" className={navItem}>
            <CalendarRange size={15} />
            Eventos
          </NavLink>
          <NavLink to="/albuns" className={navItem}>
            <Images size={15} />
            Álbuns
          </NavLink>
        </nav>

        {/* Ações do usuário */}
        <div className="flex items-center gap-1">
          <NavLink
            to="/account"
            className={({ isActive }) =>
              `flex h-9 w-9 items-center justify-center rounded-lg transition ${
                isActive
                  ? 'bg-gold/[0.12] text-gold'
                  : 'text-cream-dim hover:bg-gold/[0.06] hover:text-cream'
              }`
            }
            title="Configurações da conta"
          >
            <Settings size={16} />
          </NavLink>
          <button
            onClick={logout}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-cream-dim transition hover:bg-gold/[0.06] hover:text-cream"
            title="Sair"
          >
            <LogOut size={16} />
          </button>
          <Link
            to="/account"
            className="ml-2 flex h-8 w-8 items-center justify-center rounded-full border border-gold/30 bg-gold/[0.10] text-sm font-medium text-gold transition hover:border-gold/50"
            title={user?.name || 'Conta'}
          >
            {initial}
          </Link>
        </div>
      </div>
    </header>
  );
}
