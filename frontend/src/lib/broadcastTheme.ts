/**
 * broadcastTheme.ts — Thème chromatique centralisé pour GrilleTV Pro V4
 *
 * Source unique de vérité pour les couleurs broadcast (états d'antenne, statuts
 * de programme et accents studio). Les composants doivent importer ces
 * constantes plutôt que de coder des valeurs hexadécimales en dur, afin de
 * garantir l'harmonie visuelle entre la grille, le formulaire, la régie et
 * les vues mobile/tablette.
 *
 * Les valeurs correspondent aux variables CSS déclarées dans src/styles.css
 * (--onair-red, --warning-orange, --success-green, …) et aux tokens Tailwind
 * de tailwind.config.js.
 */

// ---------------------------------------------------------------------------
// États broadcast — stricts, cohérents sur toute l'application
// ---------------------------------------------------------------------------

export const BROADCAST_STATUS_COLORS = {
  /** Programme en direct / ON AIR — rouge broadcast strict */
  onair: {
    bg: '#E10600',
    text: '#FFFFFF',
    border: '#FFFFFF',
    glow: 'rgba(225, 6, 0, 0.6)',
  },
  /** Programme suivant — ambre studio */
  next: {
    bg: '#F59E0B',
    text: '#FFFFFF',
    border: '#FFFFFF',
    glow: 'rgba(245, 158, 11, 0.5)',
  },
  /** Alerte temporelle T-2 minutes — orange strict */
  warning: {
    bg: '#FF9F1C',
    text: '#FFFFFF',
    border: '#FFFFFF',
    glow: 'rgba(255, 159, 28, 0.8)',
  },
  /** Validation / OK — vert */
  success: {
    bg: '#2ECC71',
    text: '#FFFFFF',
    border: '#FFFFFF',
    glow: 'rgba(46, 204, 113, 0.5)',
  },
  /** Technique / décalage — cyan broadcast */
  technical: {
    bg: '#06B6D4',
    text: '#FFFFFF',
    border: '#FFFFFF',
    glow: 'rgba(6, 182, 212, 0.5)',
  },
} as const

// ---------------------------------------------------------------------------
// Statuts opérationnels (opStatus) — cohérents avec les variables CSS
// --status-planned / confirmed / production / ready / done / canceled
// ---------------------------------------------------------------------------

export const OPSTATUS_COLORS = {
  PLANNED: { bg: 'rgba(148, 163, 184, 0.15)', text: '#94a3b8' },
  CONFIRMED: { bg: 'rgba(59, 130, 246, 0.2)', text: '#60a5fa' },
  IN_PRODUCTION: { bg: 'rgba(245, 158, 11, 0.2)', text: '#fbbf24' },
  READY: { bg: 'rgba(34, 197, 94, 0.2)', text: '#4ade80' },
  ON_AIR: { bg: 'rgba(225, 6, 0, 0.2)', text: '#E10600' },
  AIRED: { bg: 'rgba(16, 185, 129, 0.2)', text: '#34d399' },
  DONE: { bg: 'rgba(16, 185, 129, 0.2)', text: '#34d399' },
  CANCELED: { bg: 'rgba(100, 116, 139, 0.15)', text: '#94a3b8' },
  DELAYED: { bg: 'rgba(245, 158, 11, 0.2)', text: '#fbbf24' },
  OVERRUN: { bg: 'rgba(225, 6, 0, 0.2)', text: '#E10600' },
  SKIPPED: { bg: 'rgba(100, 116, 139, 0.15)', text: '#94a3b8' },
  MANUAL_OVERRIDE: { bg: 'rgba(59, 130, 246, 0.2)', text: '#60a5fa' },
} as const

// ---------------------------------------------------------------------------
// Types de diffusion — couleurs de bordure / fond pour les cartes programme
// ---------------------------------------------------------------------------

export const DIFFUSION_TYPE_COLORS = {
  DIRECT: { bg: 'rgba(225, 6, 0, 0.1)', border: '#E10600' }, // onair red
  LIVE: { bg: 'rgba(225, 6, 0, 0.1)', border: '#E10600' },
  PAD: { bg: 'rgba(37, 99, 235, 0.1)', border: '#2563EB' }, // blue-600
  ADS: { bg: 'rgba(249, 115, 22, 0.1)', border: '#f97316' }, // orange-500
  REPLAY: { bg: 'rgba(107, 114, 128, 0.1)', border: '#6B7280' }, // gray-500
  SPECIAL: { bg: 'rgba(168, 85, 247, 0.1)', border: '#a855f7' }, // purple-500
} as const

// ---------------------------------------------------------------------------
// Arrière-plans et bordures studio (mode sombre par défaut)
// ---------------------------------------------------------------------------

export const STUDIO = {
  bgMain: '#0B1220',
  bgSurface: '#111A2E',
  bgElevated: '#16213A',
  borderSubtle: '#1F2A44',
  textPrimary: '#FFFFFF',
  textSecondary: '#B0B7C3',
  textMuted: '#7A8599',
} as const

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Retourne la couleur de bordure associée à un statut opStatus.
 * Utile pour les badges et cartes programme.
 */
export function getOpStatusColor(opStatus: string | undefined) {
  const key = (opStatus || 'PLANNED').toUpperCase() as keyof typeof OPSTATUS_COLORS
  return OPSTATUS_COLORS[key] ?? OPSTATUS_COLORS.PLANNED
}

/**
 * Retourne la couleur associée à un type de diffusion.
 */
export function getDiffusionTypeColor(typeDiffusion: string | undefined) {
  const key = (typeDiffusion || 'PAD').toUpperCase() as keyof typeof DIFFUSION_TYPE_COLORS
  return DIFFUSION_TYPE_COLORS[key] ?? DIFFUSION_TYPE_COLORS.PAD
}
