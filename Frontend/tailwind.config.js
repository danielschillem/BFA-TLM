/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Palette Médicale Ultra-Moderne ────────────────────────
        primary: {
          50:  '#eef7ff',
          100: '#d9edff',
          200: '#bce0ff',
          300: '#8ecdff',
          400: '#59b0ff',
          500: '#338bff',   // Bleu néon médical
          600: '#1b6af5',
          700: '#1454e1',
          800: '#1745b6',
          900: '#193d8f',
          950: '#142757',
        },
        secondary: {
          50:  '#edfcf5',
          100: '#d3f8e6',
          200: '#aaf0d2',
          300: '#73e2b7',
          400: '#3bce98',
          500: '#17b47e',   // Vert émeraude santé
          600: '#0b9166',
          700: '#097454',
          800: '#0b5c43',
          900: '#0a4b39',
        },
        accent: {
          50:  '#fdf4ff',
          100: '#fae8ff',
          200: '#f5d0fe',
          300: '#f0abfc',
          400: '#e879f9',
          500: '#d946ef',   // Violet accent
          600: '#c026d3',
          700: '#a21caf',
          800: '#86198f',
          900: '#701a75',
          DEFAULT:    'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        sidebar: {
          bg:     '#1a56db',  // Bleu vif
          hover:  '#1e40af',
          active: '#2563eb',
          text:   '#ffffff',  // Blanc pur
          accent: '#93c5fd',
        },
        medical: {
          green:  '#17b47e',  // Disponible / Succès
          red:    '#f43f5e',  // Urgent / Critique
          orange: '#f59e0b',  // En attente / Warning
          blue:   '#338bff',  // Info / Consultation
          purple: '#a855f7',  // Téléexpertise
          teal:   '#14b8a6',  // Constantes
          pink:   '#f472b6',  // Féminin
          slate:  '#64748b',  // Neutre
          cyan:   '#06b6d4',  // Diagnostic
        },
        border: 'hsl(var(--border))',
        input:  'hsl(var(--input))',
        ring:   'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        destructive: {
          DEFAULT:    'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        '4xl': '2rem',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      animation: {
        'pulse-slow':     'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-light':   'bounce 1.5s infinite',
        'fade-in':        'fadeIn 0.3s ease-out',
        'slide-up':       'slideUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'float':          'float 6s ease-in-out infinite',
        'glow':           'glow 2s ease-in-out infinite alternate',
        'shimmer':        'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { transform: 'translateY(12px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        slideInRight: { from: { transform: 'translateX(12px)', opacity: '0' }, to: { transform: 'translateX(0)', opacity: '1' } },
        float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        glow: { from: { boxShadow: '0 0 20px rgba(51, 139, 255, 0.15)' }, to: { boxShadow: '0 0 30px rgba(51, 139, 255, 0.3)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      boxShadow: {
        'card':       '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-hover': '0 10px 25px -5px rgb(0 0 0 / 0.08), 0 8px 10px -6px rgb(0 0 0 / 0.04)',
        'glass':      '0 8px 32px rgba(0, 0, 0, 0.08)',
        'glow-blue':  '0 0 20px rgba(51, 139, 255, 0.25)',
        'glow-green': '0 0 20px rgba(23, 180, 126, 0.25)',
        'sidebar':    '4px 0 24px -4px rgb(0 0 0 / 0.15)',
        'inner-glow': 'inset 0 1px 0 rgba(255,255,255,0.06)',
      },
      backgroundImage: {
        'gradient-medical':    'linear-gradient(135deg, #338bff 0%, #17b47e 100%)',
        'gradient-sidebar':    'linear-gradient(180deg, #1e40af 0%, #1a56db 100%)',
        'gradient-hero':       'linear-gradient(135deg, #142757 0%, #1b6af5 50%, #17b47e 100%)',
        'gradient-card':       'linear-gradient(135deg, rgba(51,139,255,0.05) 0%, rgba(23,180,126,0.05) 100%)',
        'mesh':                'radial-gradient(at 40% 20%, rgba(51,139,255,0.08) 0px, transparent 50%), radial-gradient(at 80% 80%, rgba(23,180,126,0.06) 0px, transparent 50%)',
      },
    },
  },
  plugins: [],
}
