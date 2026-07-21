import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

export default function MobileActionSheet({ open, title = 'Ações', children, onClose }) {
  const titleId = useId();
  const closeRef = useRef(null);
  const sheetRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
        return;
      }

      if (event.key !== 'Tab') return;
      const focusable = [...(sheetRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ) || [])];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    requestAnimationFrame(() => closeRef.current?.focus());

    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm animate-fadein sm:hidden"
      onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}
    >
      <section ref={sheetRef} className="mobile-action-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="mobile-sheet-handle" aria-hidden="true" />
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id={titleId} className="text-xl text-cream">{title}</h2>
          <button ref={closeRef} type="button" className="icon-button" onClick={onClose} aria-label="Fechar ações">
            <X size={18} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
