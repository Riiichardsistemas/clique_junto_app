import Spinner from './Spinner';

export default function Button({
  children,
  variant = 'primary',
  loading = false,
  disabled = false,
  className = '',
  ...props
}) {
  const base = variant === 'primary' ? 'btn-primary' : 'btn-ghost';
  return (
    <button className={`${base} ${className}`} disabled={disabled || loading} {...props}>
      {loading && <Spinner className="mr-2 h-4 w-4" />}
      {children}
    </button>
  );
}
