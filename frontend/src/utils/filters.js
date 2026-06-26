/**
 * Definição dos filtros fotográficos.
 * cssFilter: aplicado em tempo real no preview (CSS).
 * label: nome exibido na UI.
 */
export const FILTER_DEFS = {
  nenhum: {
    id: 'nenhum',
    label: 'Nenhum',
    cssFilter: 'none',
    wrapperStyle: {},
  },
  vintage: {
    id: 'vintage',
    label: 'Vintage',
    cssFilter: 'sepia(0.4) contrast(1.1) brightness(1.05) saturate(0.8)',
    wrapperStyle: {},
  },
  polaroid: {
    id: 'polaroid',
    label: 'Polaroid',
    cssFilter: 'contrast(1.1) brightness(1.1) saturate(0.9)',
    wrapperStyle: { border: '12px solid #fff', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' },
  },
  pb: {
    id: 'pb',
    label: 'P&B',
    cssFilter: 'grayscale(1) contrast(1.2)',
    wrapperStyle: {},
  },
  cinema: {
    id: 'cinema',
    label: 'Cinema',
    cssFilter: 'contrast(1.3) brightness(0.9) saturate(1.2)',
    wrapperStyle: {},
    vignette: true,
  },
  kodak: {
    id: 'kodak',
    label: 'Kodak',
    cssFilter: 'saturate(1.3) contrast(1.05) brightness(1.02) sepia(0.1)',
    wrapperStyle: {},
  },
};

export const FILTERS = Object.values(FILTER_DEFS);

/**
 * Aplica o filtro no canvas e retorna um Blob.
 * Usado antes do upload para "queimar" o filtro na imagem.
 */
export async function applyFilterToBlob(blob, filterId) {
  const filter = FILTER_DEFS[filterId] || FILTER_DEFS.nenhum;
  if (filter.cssFilter === 'none' && !filter.vignette) return blob;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.filter = filter.cssFilter !== 'none' ? filter.cssFilter : 'none';
      ctx.drawImage(img, 0, 0);

      // Vinheta para cinema
      if (filter.vignette) {
        const gradient = ctx.createRadialGradient(
          canvas.width / 2,
          canvas.height / 2,
          canvas.width * 0.3,
          canvas.width / 2,
          canvas.height / 2,
          canvas.width * 0.75
        );
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, 'rgba(0,0,0,0.45)');
        ctx.filter = 'none';
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      URL.revokeObjectURL(url);
      canvas.toBlob((b) => resolve(b || blob), 'image/jpeg', 0.88);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(blob); };
    img.src = url;
  });
}
