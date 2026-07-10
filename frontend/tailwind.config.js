/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Dark Luxe — referência dos prints
        ink:         '#141519', // fundo principal
        'ink-deep':  '#0d0e11', // viewport profundo (câmera, lightbox)
        surface:     'rgba(226,196,143,0.04)', // cards
        'surface-2': 'rgba(226,196,143,0.06)',
        'surface-3': 'rgba(226,196,143,0.08)',
        line:        'rgba(226,196,143,0.14)', // bordas
        // Texto
        cream:       '#F5F1E8',
        'cream-dim': '#A39C8E',
        muted:       '#A39C8E',
        // Dourado fosco dos prints
        gold: {
          DEFAULT: '#C4A96C',
          light:   '#DFC891',
          dark:    '#A98F58',
          deep:    '#8A7345',
        },
        success: '#4ADE80',
        warning: '#FACC15',
        danger:  '#F87171',
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'], // títulos (prints)
        sans:  ['Inter', '"SF Pro Display"', 'system-ui', 'sans-serif'],
        mono:  ['"JetBrains Mono"', '"SF Mono"', 'monospace'],
      },
      letterSpacing: {
        label: '0.18em',
      },
      borderRadius: {
        glass: '16px',
      },
      transitionDuration: {
        250: '250ms',
      },
      boxShadow: {
        card:  'inset 0 1px 0 rgba(255,255,255,0.05), 0 24px 60px -28px rgba(0,0,0,0.7)',
        float: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 32px 80px -32px rgba(0,0,0,0.8)',
        glow:  '0 0 0 1px rgba(196,169,108,0.25), 0 0 24px -6px rgba(196,169,108,0.35)',
        btn:   '0 12px 32px -14px rgba(196,169,108,0.45)',
      },
    },
  },
  plugins: [],
};
