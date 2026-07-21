import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function AdminPagination({ total, page, pageSize, onPageChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;

  return (
    <nav className="mt-5 flex flex-col items-center justify-between gap-3 sm:flex-row" aria-label="Paginação">
      <p className="text-xs text-cream-dim">
        Página <span className="text-cream">{page}</span> de <span className="text-cream">{pages}</span>
        <span className="mx-2 text-white/15">•</span>{total} registros
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="btn-ghost btn-sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft size={15} /> Anterior
        </button>
        <button
          type="button"
          className="btn-ghost btn-sm"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
        >
          Próxima <ChevronRight size={15} />
        </button>
      </div>
    </nav>
  );
}
