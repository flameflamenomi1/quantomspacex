/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#07070F',
          surface: '#0C0B17',
          card: '#100E1E',
          cardLight: '#161228',
          border: '#1C1730',
          borderLight: '#2A2248',
          primary: '#DC2626',
          primaryHover: '#B91C1C',
          success: '#EF4444',
          successMuted: 'rgba(239, 68, 68, 0.1)',
          danger: '#F87171',
          dangerMuted: 'rgba(248, 113, 113, 0.1)',
          textMuted: '#6B6B8A',
          textSubtle: '#3E3E5E',
          accent: '#6366F1',
          accentMuted: 'rgba(99, 102, 241, 0.08)',
          gold: '#F59E0B',
          goldMuted: 'rgba(245, 158, 11, 0.1)',
          green: '#22C55E',
          greenMuted: 'rgba(34, 197, 94, 0.1)',
        }
      },
      fontFamily: {
        serif: ['Georgia', 'ui-serif', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-card': 'linear-gradient(145deg, #161228 0%, #0C0B17 100%)',
        'gradient-hero': 'linear-gradient(135deg, #07070F 0%, #0E0B1F 50%, #07070F 100%)',
        'gradient-red': 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)',
        'gradient-success': 'linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(239,68,68,0.02) 100%)',
        'gradient-balance': 'linear-gradient(135deg, #ffffff 0%, #F1F1FF 40%, #CFCFE8 100%)',
        'gradient-accent': 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
      },
      boxShadow: {
        'card': '0 4px 32px rgba(0, 0, 0, 0.5)',
        'card-hover': '0 8px 48px rgba(239, 68, 68, 0.1)',
        'glow-red': '0 0 48px rgba(239, 68, 68, 0.18)',
        'glow-sm': '0 0 20px rgba(239, 68, 68, 0.12)',
        'glow-accent': '0 0 32px rgba(99, 102, 241, 0.2)',
        'glow-tab': '0 -1px 20px rgba(239, 68, 68, 0.08)',
        'inner-top': 'inset 0 1px 0 rgba(255,255,255,0.05)',
        'inner-glow': 'inset 0 0 40px rgba(99,102,241,0.04)',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
        'bounce-slow': 'bounce 3s infinite',
        'glow': 'glow 6s ease-in-out infinite',
        'ticker': 'ticker 30s linear infinite',
        'shimmer': 'shimmer 2s infinite',
        'float': 'float 6s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
