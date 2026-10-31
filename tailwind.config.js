/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        midnight: '#111B2B',
        'deep-blue': '#1B2B40',
        slate: '#33475C',
        amber: { DEFAULT: '#F2B84B', dark: '#D49A2E' },
        coral: { DEFAULT: '#E96F68', dark: '#C95852' },
        teal: { DEFAULT: '#56B9A7', dark: '#3A9484' },
        fog: '#DDE5E9',
        'warm-white': '#F4F2EB',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 2.5s ease-in-out infinite',
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'glow-amber': 'glowAmber 1.5s ease-in-out infinite',
        'glow-coral': 'glowCoral 1s ease-in-out infinite',
        'dash-flow': 'dashFlow 1s linear infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { transform: 'translateY(10px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        glowAmber: { '0%, 100%': { filter: 'drop-shadow(0 0 2px rgba(242, 184, 75, 0.5))' }, '50%': { filter: 'drop-shadow(0 0 8px rgba(242, 184, 75, 0.9))' } },
        glowCoral: { '0%, 100%': { filter: 'drop-shadow(0 0 2px rgba(233, 111, 104, 0.5))' }, '50%': { filter: 'drop-shadow(0 0 10px rgba(233, 111, 104, 0.95))' } },
        dashFlow: { '0%': { strokeDashoffset: '0' }, '100%': { strokeDashoffset: '-16' } },
      },
    },
  },
  plugins: [],
};
