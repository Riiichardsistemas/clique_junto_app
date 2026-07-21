/*
 * Símbolo da marca Clique Junto — os dois álbuns sobrepostos com o brilho dourado.
 * Inline (não <img>) para ficar nítido em qualquer tamanho e permitir recolorir
 * via prop `accent`, usado no Telão e no GuestEntry, onde o anfitrião escolhe a cor.
 *
 * Fonte: src/assets/logos/simbolo-fundo-escuro.svg
 */

/* Duas versões da marca, conforme o LEIA-ME:
   dark  → fundos escuros (traço creme, brilho #d9c193)
   light → fundos claros  (traço preto, papel #faf7f0, brilho #b3945f) */
const VARIANTS = {
  dark:  { cream: '#ece0c8', ink: '#0b0b0c', accent: '#d9c193', backOpacity: 0.45 },
  light: { cream: '#0b0b0c', ink: '#faf7f0', accent: '#b3945f', backOpacity: 0.55 },
};

export default function LogoMark({
  className = 'h-6 w-6',
  variant = 'dark',
  accent,
  ...props
}) {
  const v = VARIANTS[variant] ?? VARIANTS.dark;
  const cream = v.cream;
  const ink = v.ink;
  const backOpacity = v.backOpacity;
  accent = accent ?? v.accent;

  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {/* álbum de trás */}
      <rect
        x="14" y="24" width="52" height="62" rx="10"
        stroke={cream} strokeOpacity={backOpacity} strokeWidth="5"
        transform="rotate(-8 40 55)"
      />
      {/* álbum da frente */}
      <rect
        x="36" y="18" width="52" height="62" rx="10"
        fill={ink} stroke={cream} strokeWidth="5"
        transform="rotate(7 62 49)"
      />
      {/* brilho */}
      <path
        d="M62 34 C64 44 67 47 77 49 C67 51 64 54 62 64 C60 54 57 51 47 49 C57 47 60 44 62 34 Z"
        fill={accent}
      />
    </svg>
  );
}
