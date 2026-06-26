/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink:         '#0a0a0a',
        surface:     '#141414',
        'surface-2': '#1e1e1e',
        cream:       '#f0ebe3',
        gold: {
          DEFAULT: '#d4a853',
          light:   '#e3c17a',
          dark:    '#b08838',
        },
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans:  ['Inter', 'system-ui', 'sans-serif'],
        mono:  ['"Courier New"', 'Courier', 'monospace'],
      },
    },
  },
  plugins: [],
};
