/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Mesmo sistema cromático da landing, adaptado à densidade do app.
        ink:         '#09090A',
        'ink-deep':  '#060607',
        surface:     '#121214',
        'surface-2': '#18181B',
        'surface-3': '#1D1C1E',
        line:        '#FFFFFF17',
        cream:       '#F7F3EB',
        'cream-dim': '#AAA59C',
        muted:       '#AAA59C',
        gold: {
          DEFAULT: '#D2AD78',
          light:   '#EDD9B7',
          dark:    '#AE8957',
          deep:    '#8A6F43',
        },
        blue: '#98D7F7',
        focus: '#98D7F7',
        success: '#4ADE80',
        warning: '#FACC15',
        danger:  '#F87171',
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans:  ['Manrope', '"SF Pro Display"', 'system-ui', 'sans-serif'],
        mono:  ['"JetBrains Mono"', '"SF Mono"', 'monospace'],
      },
      letterSpacing: {
        label: '0.18em',
      },
      borderRadius: {
        glass: '24px',
      },
      transitionDuration: {
        250: '250ms',
      },
      boxShadow: {
        card:  'inset 0 1px 0 rgba(255,255,255,0.04), 0 24px 70px -34px rgba(0,0,0,0.85)',
        float: 'inset 0 1px 0 rgba(255,255,255,0.07), 0 32px 90px -36px rgba(0,0,0,0.9)',
        glow:  '0 0 0 1px rgba(210,173,120,0.22), 0 0 28px -8px rgba(210,173,120,0.32)',
        btn:   '0 16px 38px -18px rgba(0,0,0,0.75)',
      },
    },
  },
  plugins: [],
};
