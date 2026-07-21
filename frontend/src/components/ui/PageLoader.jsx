import Spinner from './Spinner';

export default function PageLoader({ label = 'Carregando' }) {
  return (
    <div className="page-loader" role="status" aria-live="polite" aria-label={label}>
      <Spinner className="h-7 w-7" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
