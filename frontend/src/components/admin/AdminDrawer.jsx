import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

export default function AdminDrawer({ open, title, eyebrow, children, onClose }) {
  const titleId = useId();
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);
    requestAnimationFrame(() => closeRef.current?.focus());
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener('keydown', onKeyDown);
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm animate-fadein"
      onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute inset-0 flex w-full flex-col bg-[#0d0d0f]/[0.98] shadow-2xl animate-slidein-right sm:inset-y-0 sm:left-auto sm:max-w-xl sm:border-l sm:border-line"
      >
        <div className="safe-top flex items-start justify-between gap-5 border-b border-line px-5 pb-5 sm:px-7 sm:pt-5">
          <div className="min-w-0">
            {eyebrow && <p className="label-mono mb-2 text-gold">{eyebrow}</p>}
            <h2 id={titleId} className="truncate text-2xl text-cream">{title}</h2>
          </div>
          <button ref={closeRef} type="button" className="icon-button" onClick={onClose} aria-label="Fechar painel">
            <X size={18} />
          </button>
        </div>
        <div className="safe-bottom min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7">{children}</div>
      </aside>
    </div>
  );
}
