export default function Input({ label, id, className = '', ...props }) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-cream/80">
          {label}
        </label>
      )}
      <input id={id} className={`input-field ${className}`} {...props} />
    </div>
  );
}
