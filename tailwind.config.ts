import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    // Escala de tamaños +3px sobre el default de Tailwind (12/14/16/18/20/24/30/36/48/60px),
    // conservando la relación proporcional entre pasos y su comportamiento responsivo.
    fontSize: {
      xs: ['0.9375rem', { lineHeight: '1.1875rem' }],
      sm: ['1.0625rem', { lineHeight: '1.4375rem' }],
      base: ['1.1875rem', { lineHeight: '1.6875rem' }],
      lg: ['1.3125rem', { lineHeight: '1.9375rem' }],
      xl: ['1.4375rem', { lineHeight: '1.9375rem' }],
      '2xl': ['1.6875rem', { lineHeight: '2.1875rem' }],
      '3xl': ['2.0625rem', { lineHeight: '2.4375rem' }],
      '4xl': ['2.4375rem', { lineHeight: '2.6875rem' }],
      '5xl': ['3.1875rem', { lineHeight: '1' }],
      '6xl': ['3.9375rem', { lineHeight: '1' }],
      '7xl': ['4.6875rem', { lineHeight: '1' }],
      '8xl': ['6.1875rem', { lineHeight: '1' }],
      '9xl': ['8.1875rem', { lineHeight: '1' }],
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: '#0C9646',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#F3F4F6',
          foreground: '#1F2937',
        },
        muted: {
          DEFAULT: '#F3F4F6',
          foreground: '#6B7280',
        },
        accent: {
          DEFAULT: '#EDFFF4',
          foreground: '#0C9646',
        },
        card: {
          DEFAULT: '#ffffff',
          foreground: '#1F2937',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        popover: {
          DEFAULT: '#ffffff',
          foreground: '#1F2937',
        },
        // RifandoMas brand tokens — dark theme
        brand: {
          bg: '#1c1c1c',
          card: '#252525',
          border: '#3a3a3a',
          muted: '#9ca3af',
          text: '#ffffff',
          green: '#0C9646',
          gold: '#FBBF24',
          red: '#DC2626',
        },
      },
      fontFamily: {
        title: ['var(--font-montserrat)', 'sans-serif'],
        body: ['var(--font-inter)', 'sans-serif'],
        ui: ['var(--font-montserrat)', 'sans-serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        flotar: {
          '0%, 100%': { transform: 'translateX(-50%) translateY(0px)' },
          '50%': { transform: 'translateX(-50%) translateY(-14px)' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        flotar: 'flotar 3s ease-in-out infinite',
        'fade-in': 'fade-in 0.3s ease-out',
        shimmer: 'shimmer 1.5s infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
