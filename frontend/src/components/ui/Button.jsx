import Spinner from './Spinner';

export default function Button({
  children,
  variant = 'primary',
  loading = false,
  disabled = false,
  className = '',
  type,
  ...props
}) {
  const styles = {
    primary: 'btn-primary',
    ghost: 'btn-ghost',
    danger: 'btn-danger-ghost',
  };
  const base = styles[variant] || styles.primary;
  return (
    <button
      type={type || 'button'}
      className={`${base} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner className="mr-2 h-4 w-4" />}
      {children}
    </button>
  );
}
