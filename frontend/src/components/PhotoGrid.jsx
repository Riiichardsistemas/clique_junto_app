import { useState } from 'react';

export default function PhotoGrid({ photos, onRemove }) {
  const [enlarged, setEnlarged] = useState(null);

  return (
    <>
      {/* Grid masonry simulado */}
      <div className="columns-2 gap-3 sm:columns-3 lg:columns-4">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="group relative mb-3 break-inside-avoid overflow-hidden rounded-xl border border-white/5"
          >
            <img
              src={photo.thumbUrl || photo.url}
              alt=""
              className="w-full cursor-zoom-in object-cover"
              loading="lazy"
              onClick={() => setEnlarged(photo)}
            />
            {/* Badge do convidado */}
            {photo.guestNickname && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-2">
                <p className="truncate text-xs text-white/80">{photo.guestNickname}</p>
              </div>
            )}
            {/* Botão remover (organizador) */}
            {onRemove && (
              <button
                onClick={() => onRemove(photo.id)}
                className="absolute right-2 top-2 hidden rounded-full bg-black/60 p-1.5 text-xs text-white hover:bg-red-600 group-hover:block"
                title="Remover foto"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {enlarged && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setEnlarged(null)}
        >
          <img
            src={enlarged.url}
            alt=""
            className="max-h-[90vh] max-w-full rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute right-4 top-4 flex gap-2">
            <a
              href={enlarged.url}
              download
              className="rounded-full bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
              onClick={(e) => e.stopPropagation()}
            >
              Baixar
            </a>
            <button
              onClick={() => setEnlarged(null)}
              className="rounded-full bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
