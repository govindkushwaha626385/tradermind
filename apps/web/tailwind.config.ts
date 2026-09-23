import type { Config } from 'tailwindcss';
import tailwindAnimate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['var(--font-inter)',    'system-ui', '-apple-system', 'sans-serif'],
        display: ['var(--font-jakarta)', 'var(--font-inter)', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-jetbrains-mono)', 'Fira Code', 'monospace'],
      },
      colors: {
        /* ── Semantic UI tokens ── */
        border:      'hsl(var(--border))',
        input:       'hsl(var(--input))',
        ring:        'hsl(var(--ring))',
        background:  'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',
        primary: {
          DEFAULT:    'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          subtle:     'hsl(var(--primary-subtle))',
          border:     'hsl(var(--primary-border))',
        },
        secondary: {
          DEFAULT:    'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT:    'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT:    'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT:    'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        /* ── Surface hierarchy ── */
        surface: {
          0: 'hsl(var(--surface-0))',
          1: 'hsl(var(--surface-1))',
          2: 'hsl(var(--surface-2))',
          3: 'hsl(var(--surface-3))',
        },
        /* ── Trading tokens ── */
        profit: {
          DEFAULT: 'hsl(var(--profit))',
          bright:  'hsl(var(--profit-bright))',
          subtle:  'hsl(var(--profit-subtle))',
          border:  'hsl(var(--profit-border))',
        },
        loss: {
          DEFAULT: 'hsl(var(--loss))',
          bright:  'hsl(var(--loss-bright))',
          subtle:  'hsl(var(--loss-subtle))',
          border:  'hsl(var(--loss-border))',
        },
        /* ── Status ── */
        success: {
          DEFAULT:    'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT:    'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        info: {
          DEFAULT:    'hsl(var(--info))',
          foreground: 'hsl(var(--info-foreground))',
        },
        danger: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
      },
      borderRadius: {
        lg:   'var(--radius)',
        md:   'calc(var(--radius) - 2px)',
        sm:   'calc(var(--radius) - 4px)',
        xl:   'calc(var(--radius) + 4px)',
        '2xl':'calc(var(--radius) + 8px)',
      },
      spacing: {
        '4.5': '1.125rem',
        '13':  '3.25rem',
        '15':  '3.75rem',
        '18':  '4.5rem',
        '22':  '5.5rem',
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.025em' }],
        '4xl': ['2.25rem',  { lineHeight: '2.5rem',  letterSpacing: '-0.025em' }],
      },
      boxShadow: {
        'card':      '0 1px 3px hsl(220 20% 6% / 0.06), 0 4px 12px hsl(220 20% 6% / 0.04)',
        'card-lg':   '0 4px 16px hsl(220 20% 6% / 0.08), 0 12px 40px hsl(220 20% 6% / 0.06)',
        'card-hover':'0 8px 24px hsl(220 20% 6% / 0.10), 0 20px 60px hsl(220 20% 6% / 0.08)',
        'brand':     '0 4px 20px hsl(var(--primary) / 0.25)',
        'profit':    '0 4px 20px hsl(var(--profit) / 0.2)',
        'loss':      '0 4px 20px hsl(var(--loss) / 0.2)',
        'inner-sm':  'inset 0 1px 2px hsl(220 20% 6% / 0.06)',
      },
      keyframes: {
        'fade-in':        { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up':       { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'slide-in-right': { from: { opacity: '0', transform: 'translateX(20px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        'count-up':       { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'shimmer':        { '0%': { backgroundPosition: '200% 0' }, '100%': { backgroundPosition: '-200% 0' } },
      },
      animation: {
        'fade-in':        'fade-in 0.35s ease-out',
        'slide-up':       'slide-up 0.4s cubic-bezier(0.16,1,0.3,1)',
        'slide-in-right': 'slide-in-right 0.3s cubic-bezier(0.16,1,0.3,1)',
        'count-up':       'count-up 0.8s cubic-bezier(0.16,1,0.3,1)',
        'shimmer':        'shimmer 1.6s ease-in-out infinite',
      },
      transitionTimingFunction: {
        'spring':    'cubic-bezier(0.16, 1, 0.3, 1)',
        'bounce-in': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [tailwindAnimate],
};

export default config;
