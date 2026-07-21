import { Link } from 'react-router-dom';
import LogoMark from './LogoMark.jsx';

export default function Brand({ to = '/dashboard', compact = false, className = '', ...props }) {
  return (
    <Link to={to} className={`brand ${className}`.trim()} aria-label="Clique Junto — início" {...props}>
      <LogoMark className="h-[26px] w-[26px] shrink-0" />
      {!compact && <span className="brand-name">Clique Junto</span>}
    </Link>
  );
}
