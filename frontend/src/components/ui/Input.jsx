export default function Input({ label, id, className = '', hint, error, ...props }) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="mb-2 block text-xs font-bold text-cream-dim">
          {label}
        </label>
      )}
      <input id={id} className={`input-field ${className}`} aria-describedby={describedBy} aria-invalid={!!error || undefined} {...props} />
      {hint && <p id={`${id}-hint`} className="mt-1.5 text-xs leading-relaxed text-cream-dim/70">{hint}</p>}
      {error && <p id={`${id}-error`} className="mt-1.5 text-xs leading-relaxed text-danger">{error}</p>}
    </div>
  );
}
