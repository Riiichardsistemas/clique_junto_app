import { useEffect } from 'react';

/*
 * Navegação do lightbox:
 * - Teclado: setas e Escape (desktop)
 * - Toque: swipe horizontal troca de foto, swipe para baixo fecha (mobile)
 * - Trava o scroll da página enquanto aberto (evita rolar o álbum por trás)
 */
export default function useLightboxNavigation(index, setIndex, total) {
  useEffect(() => {
    if (index === null) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setIndex(null);
      if (event.key === 'ArrowLeft') setIndex((current) => Math.max(0, current - 1));
      if (event.key === 'ArrowRight') setIndex((current) => Math.min(total - 1, current + 1));
    };

    // Swipe — limiar de 48px com gesto predominantemente num só eixo
    let startX = 0;
    let startY = 0;
    const onTouchStart = (event) => {
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
    };
    const onTouchEnd = (event) => {
      const dx = event.changedTouches[0].clientX - startX;
      const dy = event.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx < 0) setIndex((current) => Math.min(total - 1, current + 1));
        else setIndex((current) => Math.max(0, current - 1));
      } else if (dy > 72 && Math.abs(dy) > Math.abs(dx) * 1.5) {
        setIndex(null); // swipe para baixo fecha, como em apps de galeria
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });

    // Trava o scroll do body preservando a posição atual
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchend', onTouchEnd);
      document.body.style.overflow = prevOverflow;
    };
  }, [index, setIndex, total]);
}
