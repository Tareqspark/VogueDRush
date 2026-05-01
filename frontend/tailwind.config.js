/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Light theme — sky blue + lemon palette
        dark: {
          primary: '#F0F9FF',       // sky-50: main body bg
          secondary: '#FFFFFF',     // white: card/surface bg
          tertiary: '#F1F5F9',      // slate-100: subtle bg
          quaternary: '#CBD5E1',    // slate-300: borders
          quinary: '#94A3B8',       // slate-400: muted elements
          border: '#E2E8F0',        // slate-200: default border
          'border-light': '#F8FAFC',// slate-50: lightest border
          text: {
            primary: '#0F172A',     // slate-900: headings
            secondary: '#475569',   // slate-600: body text
            tertiary: '#64748B',    // slate-500: secondary text
            quaternary: '#94A3B8',  // slate-400: placeholder / muted
          }
        },
        accent: {
          primary: '#0284C7',       // sky-600: primary actions
          secondary: '#0EA5E9',     // sky-500: secondary actions
          success: '#10B981',       // emerald-500
          warning: '#F59E0B',       // amber-500
          error: '#EF4444',         // red-500
          lemon: '#EAB308',         // lemon yellow
          orange: {
            50: '#F0F9FF',  100: '#E0F2FE', 200: '#BAE6FD',
            300: '#7DD3FC', 400: '#38BDF8', 500: '#0EA5E9',
            600: '#0284C7', 700: '#0369A1', 800: '#075985', 900: '#0C4A6E',
          },
          lemon: {
            50: '#FEFCE8',  100: '#FEF9C3', 200: '#FEF08A',
            300: '#FDE047', 400: '#FACC15', 500: '#EAB308',
            600: '#CA8A04', 700: '#A16207', 800: '#854D0E', 900: '#713F12',
          },
          primary: '#f97316', // Orange 500
          secondary: '#eab308', // Lemon 500
          success: '#22c55e',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#3B82F6',
        },
        // Status colors
        status: {
          pending: '#F59E0B',
          preparing: '#3B82F6',
          ready: '#10B981',
          done: '#6B7280',
          cancelled: '#EF4444',
          occupied: '#EF4444',
          available: '#10B981',
          reserved: '#F59E0B',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(2 132 199 / 0.07), 0 1px 2px -1px rgb(2 132 199 / 0.05)',
        'card-hover': '0 8px 24px 0 rgb(2 132 199 / 0.12)',
        'dark-lg': '0 10px 25px -5px rgb(2 132 199 / 0.1), 0 4px 10px -4px rgb(2 132 199 / 0.07)',
        'dark-xl': '0 20px 40px -10px rgb(2 132 199 / 0.15)',
        'sidebar': '2px 0 12px 0 rgb(2 132 199 / 0.07)',
        'header': '0 2px 12px 0 rgb(2 132 199 / 0.07)',
        'glow-sky': '0 0 30px rgb(14 165 233 / 0.25)',
        'glow-lemon': '0 0 30px rgb(234 179 8 / 0.25)',
        'btn': '0 2px 8px 0 rgb(2 132 199 / 0.25)',
        'btn-lemon': '0 2px 8px 0 rgb(234 179 8 / 0.3)',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
}
