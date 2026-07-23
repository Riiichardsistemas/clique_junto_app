import { NavLink } from 'react-router-dom';
import { CalendarRange, Images, Plus, UserRound, Gift } from 'lucide-react';

const ITEMS = [
  { to: '/dashboard', label: 'Eventos', icon: CalendarRange, end: true },
  { to: '/albuns', label: 'Álbuns', icon: Images },
  { to: '/events/new', label: 'Criar', icon: Plus, primary: true },
  { to: '/afiliados', label: 'Ganhe', icon: Gift },
  { to: '/account', label: 'Conta', icon: UserRound },
];

export default function MobileBottomNav() {
  return (
    <nav className="mobile-tabbar" aria-label="Navegação principal móvel">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {ITEMS.map(({ to, label, icon: Icon, end, primary }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={`mobile-tab-item ${primary ? 'mobile-tab-primary' : ''}`}
          >
            <span className="mobile-tab-icon"><Icon size={primary ? 20 : 19} strokeWidth={1.9} /></span>
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
