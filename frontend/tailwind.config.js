/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['Geist Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      colors: {
        // Neutral scale — true matte charcoal (no blue undertone)
        gray: {
          50:  '#fafafa',
          100: '#f5f5f5',
          200: '#e8e8e8',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#333333',
          800: '#1f1f1f',
          850: '#171717',
          900: '#111111',
          950: '#0a0a0a',
        },
        // Accent — electric cyan (replaces AI-default indigo)
        accent: {
          50:  '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
          950: '#083344',
        },
        // Keep primary as alias pointing at accent for backward compat
        primary: {
          50:  '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
        },
        // Status semantic colors
        status: {
          success: '#10b981',
          warning: '#f59e0b',
          danger:  '#ef4444',
          neutral: '#737373',
        },
      },
      borderRadius: {
        DEFAULT: '6px',
        sm:  '4px',
        md:  '6px',
        lg:  '8px',
        xl:  '12px',
        '2xl': '16px',
        full: '9999px',
      },
      boxShadow: {
        // Minimal shadow system — elevation only for floating elements
        sm:  '0 1px 4px rgba(0,0,0,0.12)',
        md:  '0 4px 16px rgba(0,0,0,0.15)',
        lg:  '0 12px 40px rgba(0,0,0,0.2)',
        // Dark mode shadows (more contrast)
        'dark-sm': '0 1px 4px rgba(0,0,0,0.4)',
        'dark-md': '0 4px 16px rgba(0,0,0,0.5)',
        'dark-lg': '0 12px 40px rgba(0,0,0,0.6)',
      },
      fontSize: {
        // Lock type scale — no more text-[10px] ad-hoc sizes
        '2xs': ['11px', { lineHeight: '16px', letterSpacing: '0.04em' }],
        xs:    ['12px', { lineHeight: '18px' }],
        sm:    ['13px', { lineHeight: '20px' }],
        base:  ['15px', { lineHeight: '24px' }],
        lg:    ['17px', { lineHeight: '26px' }],
        xl:    ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['28px', { lineHeight: '36px' }],
      },
      animation: {
        'fade-in': 'fadeIn 200ms ease-out',
        'modal-in': 'modalIn 150ms cubic-bezier(0.16,1,0.3,1)',
        'slide-in-left': 'slideInLeft 200ms cubic-bezier(0.16,1,0.3,1)',
        'skeleton': 'skeleton 1.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        modalIn: {
          '0%': { opacity: '0', transform: 'scale(0.97) translateY(-4px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        skeleton: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
    },
  },
  plugins: [],
}
