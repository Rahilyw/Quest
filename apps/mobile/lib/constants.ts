export const APP_NAME = 'Quest!'

export const COLORS = {
  // Backgrounds — outdoor light, not a clinic
  bg: '#F0F9FF',          // sky-50: sun through a window
  bgWarm: '#FFF7ED',      // orange-50: warm surface accents

  // Surfaces (glass simulation: white lifts off the sky bg)
  surface: '#FFFFFF',
  surfaceElevated: '#F8FAFF',

  // Borders — near-invisible so cards feel weightless
  border: 'rgba(15, 23, 42, 0.06)',

  // Text hierarchy
  textPrimary: '#0F172A',   // slate-900
  textSecondary: '#475569', // slate-600
  textMuted: '#94A3B8',     // slate-400

  // Local Signal — earned moments, active states, CTA only
  accent: '#6366F1',         // indigo-500 (vivid on white)
  accentSoft: '#EEF2FF',     // indigo-50 (pill backgrounds, your-rank strip)
  accentText: '#4338CA',     // indigo-700 (text on soft bg)

  // Status
  success: '#16A34A',  // green-700
  warning: '#D97706',  // amber-600
  sponsor: '#EA580C',  // orange-600 (summer energy, not amber)
} as const

export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 } as const
export const RADIUS = { sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, pill: 999 } as const

export const CITY = {
  name: 'Victoria, BC',
  lat: 48.4284,
  lng: -123.3656,
  defaultZoom: 13,
}

export const XP_LEVELS = [
  { level: 1, minXp: 0 },
  { level: 2, minXp: 200 },
  { level: 3, minXp: 500 },
  { level: 4, minXp: 1000 },
  { level: 5, minXp: 2000 },
  { level: 6, minXp: 3500 },
  { level: 7, minXp: 5500 },
  { level: 8, minXp: 8000 },
  { level: 9, minXp: 11000 },
  { level: 10, minXp: 15000 },
]

export function getLevelFromXp(xp: number) {
  for (let i = XP_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= XP_LEVELS[i].minXp) return XP_LEVELS[i].level
  }
  return 1
}

export function getXpToNextLevel(xp: number) {
  const current = getLevelFromXp(xp)
  const next = XP_LEVELS.find((l) => l.level === current + 1)
  return next ? next.minXp - xp : 0
}

// Category colors: full vivid on white, identification signals not emphasis
export const CATEGORY_COLORS: Record<string, string> = {
  fitness: '#16A34A',    // green-600
  social: '#9333EA',     // purple-600
  food: '#EA580C',       // orange-600
  community: '#2563EB',  // blue-600
  nature: '#0891B2',     // cyan-600
}

// Soft tint backgrounds for icon boxes (14% opacity simulation)
export const CATEGORY_SOFT: Record<string, string> = {
  fitness: '#DCFCE7',   // green-100
  social: '#F3E8FF',    // purple-100
  food: '#FFEDD5',      // orange-100
  community: '#DBEAFE', // blue-100
  nature: '#CFFAFE',    // cyan-100
}

export const CATEGORY_ICONS: Record<string, string> = {
  fitness: '🏃',
  social: '🤝',
  food: '🍽️',
  community: '🏘️',
  nature: '🌿',
}

export const PROOF_GEOFENCE_RADIUS = 300 // metres

/** Skip GPS geofence checks in dev / when EXPO_PUBLIC_BYPASS_GEOFENCE=true (testing without travel). */
export const BYPASS_GEOFENCE =
  process.env.EXPO_PUBLIC_BYPASS_GEOFENCE === 'true' || __DEV__
