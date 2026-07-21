import { Link } from 'react-router-dom';

export default function Brand({ to = '/dashboard', compact = false, className = '', ...props }) {
  return (
    <Link to={to} className={`brand ${className}`.trim()} aria-label="Clique Junto — início" {...props}>
      <span className="brand-mark" aria-hidden="true">✱</span>
      {!compact && <span className="brand-name">Clique Junto</span>}
    </Link>
  );
}
