/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Dark quente em camadas
        ink:         '#0b0a09', // fundo base
        'ink-deep':  '#050504', // viewport mais profundo (câmera, lightbox)
        surface:     '#15120f', // superfície elevada
        'surface-2': '#1c1814', // cartões
        'surface-3': '#241f19', // cartões em hover / inputs
        line:        'rgba(240,235,227,0.08)', // bordas
        // Texto
        cream:       '#f0ebe3',
        'cream-dim': 'rgba(240,235,227,0.5)',
        // Dourado champagne (acento)
        gold: {
          DEFAULT: '#c9a86a',
          light:   '#ddc28b',
          dark:    '#9a7b3f',
          deep:    '#7d6238',
        },
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans:  ['Inter', 'system-ui', 'sans-serif'],
        mono:  ['"JetBrains Mono"', '"Courier New"', 'monospace'],
      },
      letterSpacing: {
        label: '0.22em',
      },
      boxShadow: {
        card:  '0 1px 0 rgba(240,235,227,0.04) inset, 0 24px 60px -30px rgba(0,0,0,0.8)',
        glow:  '0 0 0 1px rgba(201,168,106,0.25), 0 14px 40px -16px rgba(201,168,106,0.25)',
      },
    },
  },
  plugins: [],
};
