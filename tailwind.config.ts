import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        /* Shadcn/ui CSS variable-based colors */
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        ring: 'hsl(var(--ring))',
        input: 'hsl(var(--input))',
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },

        // PEMOS Primary Colors
        primary: {
          DEFAULT: '#2D6A4F',
          light: '#40916C',
          dark: '#1B4332',
          tint: '#D8F3DC',
          100: '#B7E4C7',
          50: '#E8F5E9',
          foreground: 'hsl(var(--primary-foreground))',
        },

        // PEMOS Neutral Colors
        neutral: {
          50: '#FAFAFA',
          100: '#F5F5F5',
        },
        surface: '#FFFFFF',
        border: 'hsl(var(--border))',
        disabled: '#D4D4D4',
        placeholder: '#A3A3A3',
        'secondary-text': '#737373',
        'body-text': '#525252',
        heading: '#404040',
        'primary-text': '#171717',

        // PEMOS Semantic Colors
        success: {
          DEFAULT: '#16A34A',
          light: '#DCFCE7',
        },
        warning: {
          DEFAULT: '#CA8A04',
          light: '#FEF9C3',
        },
        error: {
          DEFAULT: '#DC2626',
          light: '#FEE2E2',
        },
        info: {
          DEFAULT: '#2563EB',
          light: '#DBEAFE',
        },
        notification: '#EF4444',

        /* Shadcn sidebar colors */
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },

      fontFamily: {
        sans: [
          'var(--font-inter)',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          'var(--font-jetbrains-mono)',
          'Fira Code',
          'Cascadia Code',
          'Consolas',
          'monospace',
        ],
      },

      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },

      fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },

      lineHeight: {
        tight: '1.25',
        normal: '1.5',
        relaxed: '1.75',
      },

      letterSpacing: {
        tight: '-0.025em',
        normal: '0em',
        wide: '0.05em',
      },

      spacing: {
        'space-1': '4px',
        'space-2': '8px',
        'space-3': '12px',
        'space-4': '16px',
        'space-5': '20px',
        'space-6': '24px',
        'space-8': '32px',
        'space-10': '40px',
        'space-12': '48px',
        'space-16': '64px',
        sidebar: '256px',
        'sidebar-collapsed': '64px',
      },

      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        xl: '16px',
        full: '9999px',
      },

      boxShadow: {
        sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.05)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
      },

      width: {
        sidebar: '256px',
        'sidebar-collapsed': '64px',
        'sidebar-mobile': '280px',
      },

      height: {
        header: '64px',
      },

      transitionDuration: {
        hover: '150ms',
        enter: '200ms',
        exit: '150ms',
        press: '100ms',
      },

      transitionTimingFunction: {
        enter: 'ease-out',
        exit: 'ease-in',
      },

      keyframes: {
        'sidebar-slide-in': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
        'sidebar-slide-out': {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-100%)' },
        },
        'overlay-fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'overlay-fade-out': {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
      },

      animation: {
        'sidebar-in': 'sidebar-slide-in 200ms ease-out',
        'sidebar-out': 'sidebar-slide-out 150ms ease-in',
        'overlay-in': 'overlay-fade-in 200ms ease-out',
        'overlay-out': 'overlay-fade-out 150ms ease-in',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
