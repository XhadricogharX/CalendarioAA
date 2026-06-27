/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // --- Marca (fijos en ambos temas) ---
        forest: {
          DEFAULT: '#06251B',
          900: '#06251B',
          800: '#0B3A2A',
          700: '#0E4633',
          600: '#125B42',
        },
        mint: {
          DEFAULT: '#3CC489',
          400: '#5AD3A0',
          500: '#3CC489',
          600: '#27A874',
        },
        green: {
          action: '#0B7A47',
        },
        cream: {
          DEFAULT: '#F5F4EC',
          200: '#EFEDE1',
        },
        sand: '#E4E2D6',
        ink: '#08160F',

        // --- Semánticos (cambian con el tema, vía variables CSS) ---
        page: 'rgb(var(--page) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--surface-2) / <alpha-value>)',
        content: 'rgb(var(--content) / <alpha-value>)',
        title: 'rgb(var(--title) / <alpha-value>)',
        hairline: 'rgb(var(--hairline) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      letterSpacing: {
        tightest: '-0.045em',
        tighter: '-0.03em',
      },
      maxWidth: {
        edge: '88rem',
      },
      boxShadow: {
        card: '0 1px 0 0 rgba(8,22,15,0.04), 0 18px 40px -24px rgba(6,37,27,0.25)',
        float: '0 24px 60px -28px rgba(6,37,27,0.45)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fade: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'sheet-up': {
          '0%': { opacity: '0', transform: 'translateY(28px) scale(0.99)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'spin-slow': {
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s cubic-bezier(0.22,1,0.36,1) both',
        fade: 'fade 0.3s ease both',
        'sheet-up': 'sheet-up 0.4s cubic-bezier(0.22,1,0.36,1) both',
        marquee: 'marquee 32s linear infinite',
        'spin-slow': 'spin-slow 1s linear infinite',
      },
    },
  },
  plugins: [],
}
