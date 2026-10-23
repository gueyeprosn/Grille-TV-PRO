export default {
  darkMode: 'class', // bascule clair/sombre via <html class="dark">
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  safelist: [
    // Classes avec variables CSS (protégées de la purge)
    'bg-[var(--card-bg-solid)]',
    'bg-[var(--surface)]',
    'bg-[var(--slate-100)]',
    'bg-[var(--slate-800)]',
    'text-[var(--text-primary)]',
    'text-[var(--text-secondary)]',
    'text-[var(--card-text)]',
    'text-[var(--muted)]',
    'border-[var(--card-border)]',
    'border-[var(--border)]',
    'border-[var(--slate-300)]',
    'border-[var(--slate-600)]',
    // Classes de statut
    'bg-[var(--status-planned-bg)]',
    'bg-[var(--status-confirmed-bg)]',
    'bg-[var(--status-production-bg)]',
    'bg-[var(--status-ready-bg)]',
    'bg-[var(--status-onair-bg)]',
    'bg-[var(--status-done-bg)]',
    'bg-[var(--status-canceled-bg)]',
    'text-[var(--status-planned-text)]',
    'text-[var(--status-confirmed-text)]',
    'text-[var(--status-production-text)]',
    'text-[var(--status-ready-text)]',
    'text-[var(--status-onair-text)]',
    'text-[var(--status-done-text)]',
    'text-[var(--status-canceled-text)]',
    // Hover states
    'hover:bg-[var(--card-hover)]',
    'hover:bg-[var(--slate-200)]',
    'hover:bg-[var(--slate-700)]',
    'hover:bg-[var(--slate-50)]',
    'hover:bg-[var(--slate-800)]',
    // Accent colors
    'bg-[var(--accent)]',
    'bg-[var(--accent-hover)]',
    'from-[var(--accent)]',
    'to-[var(--accent-hover)]',
    'shadow-[var(--accent)]',
    'ring-[var(--accent)]',
    // Shadow variables
    'shadow-[var(--shadow)]',
    'shadow-[var(--shadow-hover)]',
  ],
  theme: {
    extend: {
      colors: {
        // Utilisation des variables CSS pour cohérence
        brand: 'var(--slate-900)',
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          light: 'var(--accent-light)',
        },
        surface: {
          DEFAULT: 'var(--surface)',
          hover: 'var(--surface-hover)',
        },
        primary: 'var(--text-primary)',
        muted: {
          DEFAULT: 'var(--muted)',
          light: 'var(--muted-light)',
        },
        neutral: 'var(--neutral)',

        // Statuts cohérents
        status: {
          planned: {
            bg: 'var(--status-planned-bg)',
            text: 'var(--status-planned-text)',
          },
          confirmed: {
            bg: 'var(--status-confirmed-bg)',
            text: 'var(--status-confirmed-text)',
          },
          production: {
            bg: 'var(--status-production-bg)',
            text: 'var(--status-production-text)',
          },
          ready: {
            bg: 'var(--status-ready-bg)',
            text: 'var(--status-ready-text)',
          },
          onair: {
            bg: 'var(--onair-red)',
            text: 'var(--text-primary-broadcast)',
          },
          done: {
            bg: 'var(--status-done-bg)',
            text: 'var(--status-done-text)',
          },
          canceled: {
            bg: 'var(--status-canceled-bg)',
            text: 'var(--status-canceled-text)',
          },
        },
        // Couleurs broadcast
        'onair-red': '#E10600',
        'warning-orange': '#FF9F1C',
        'success-green': '#2ECC71',
        'bg-main': '#0B1220',
        'bg-surface': '#111A2E',
        'bg-elevated': '#16213A',
        'border-subtle': '#1F2A44',
      },
      backgroundColor: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'card-bg': 'var(--card-bg-solid)',
        'grid-card': 'var(--grid-card)',
      },
      textColor: {
        fg: 'var(--fg)',
        muted: 'var(--muted)',
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        'card-text': 'var(--card-text)',
      },
      borderColor: {
        border: 'var(--border)',
        'border-hover': 'var(--border-hover)',
        'card-border': 'var(--card-border)',
        'grid-card-border': 'var(--grid-card-border)',
      },
      backgroundImage: {
        'header-broadcast': 'linear-gradient(90deg, var(--slate-900) 0%, var(--slate-900) 55%, var(--accent) 100%)',
        'card-bg': 'var(--card-bg)',
        'grid-surface': 'var(--grid-surface)',
      },
      boxShadow: {
        soft: 'var(--shadow)',
        'soft-hover': 'var(--shadow-hover)',
        grid: 'var(--grid-shadow)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Roboto Mono', 'Courier New', 'monospace'],
      },
      container: { center: true, padding: '1rem' },
      // Rayons sobres pour l’interface de production : contrôles 2–3px,
      // cartes 4px, grands panneaux 6–8px. `full` reste réservé aux pastilles.
      borderRadius: {
        sm: '2px',
        DEFAULT: '2px',
        md: '2px',
        lg: '3px',
        xl: '4px',
        '2xl': '6px',
        '3xl': '8px',
        full: '9999px',
      },
    },
  },
  plugins: [],
}
