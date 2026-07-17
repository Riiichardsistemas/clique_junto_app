import { useState } from 'react';
import { X, Download } from 'lucide-react';

export default function PhotoGrid({ photos, onRemove }) {
  const [enlarged, setEnlarged] = useState(null);

  return (
    <>
      {/* Grid masonry simulado */}
      <div className="columns-2 gap-3 sm:columns-3 lg:columns-4">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="group relative mb-3 break-inside-avoid overflow-hidden rounded-xl border border-line/60 bg-surface-2"
          >
            <img
              src={photo.thumbUrl || photo.url}
              alt=""
              className="w-full cursor-zoom-in object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              loading="lazy"
              onClick={() => setEnlarged(photo)}
            />
            {/* Badge do convidado */}
            {photo.guestNickname && (
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2.5 pb-2 pt-6 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                <p className="truncate text-xs text-cream/90">{photo.guestNickname}</p>
              </div>
            )}
            {/* Botão remover (organizador) */}
            {onRemove && (
              <button
                onClick={() => onRemove(photo.id)}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white/70 backdrop-blur-sm transition hover:bg-red-600 hover:text-white sm:opacity-0 sm:group-hover:opacity-100"
                title="Remover foto"
              >
                <X size={13} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {enlarged && (
        <div
          className="fixed inset-0 z-50 flex animate-fadein items-center justify-center bg-black/95 p-4 backdrop-blur-sm"
          onClick={() => setEnlarged(null)}
        >
          <img
            src={enlarged.url}
            alt=""
            className="max-h-[90vh] max-w-full animate-scalein rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute right-4 top-4 flex gap-2">
            <a
              href={enlarged.url}
              download
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-white backdrop-blur-md transition hover:bg-white/20"
              onClick={(e) => e.stopPropagation()}
            >
              <Download size={14} /> Baixar
            </a>
            <button
              onClick={() => setEnlarged(null)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
