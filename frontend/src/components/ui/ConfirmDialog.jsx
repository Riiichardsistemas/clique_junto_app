import { useEffect, useId, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}) {
  const titleId = useId();
  const descriptionId = useId();
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !busy) onCancel?.();
    };
    document.addEventListener('keydown', onKeyDown);
    requestAnimationFrame(() => cancelRef.current?.focus());
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener('keydown', onKeyDown);
      previous?.focus?.();
    };
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="dialog-backdrop animate-fadein"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel?.();
      }}
    >
      <section
        className="dialog-panel"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <div className="flex items-start justify-between gap-5">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border ${danger ? 'border-danger/25 bg-danger/10 text-danger' : 'border-gold/25 bg-gold/10 text-gold'}`}>
            <AlertTriangle size={19} aria-hidden="true" />
          </div>
          <button
            type="button"
            className="icon-button -mr-2 -mt-2"
            aria-label="Fechar confirmação"
            disabled={busy}
            onClick={onCancel}
          >
            <X size={17} aria-hidden="true" />
          </button>
        </div>

        <h2 id={titleId} className="mt-5 text-2xl text-cream">{title}</h2>
        <p id={descriptionId} className="mt-2 text-sm leading-6 text-cream-dim">{description}</p>

        <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button ref={cancelRef} type="button" className="btn-ghost" disabled={busy} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={danger ? 'btn-danger-ghost' : 'btn-primary'}
            aria-busy={busy || undefined}
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? 'Aguarde…' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
