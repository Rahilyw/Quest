export const APP_NAME = 'Quest!'

/** Figma redesign palette — Poppins-weight hierarchy on sky-blue canvas */
export const COLORS = {
  bg: '#E8F3FF',
  bgOuter: '#C4DBFF',
  bgWarm: '#FFF7ED',

  surface: '#FFFFFF',
  surfaceElevated: '#F8FAFF',

  border: 'rgba(67, 100, 247, 0.12)',

  textPrimary: '#0D1B3E',
  textSecondary: '#6B7FA3',
  textMuted: '#6B7FA3',

  /** Primary brand blue */
  primary: '#4364F7',
  primaryLight: '#6B8EFF',
  primarySoft: '#D6E9FF',

  /** Earned / active accent (kept for XP bar, CTAs) */
  accent: '#4364F7',
  accentSoft: '#E8F3FF',
  accentText: '#4364F7',

  /** Orange highlight — city badge, notifications, featured */
  highlight: '#FF6B35',

  navy: '#0D1B3E',
  navyMid: '#1a2d6d',

  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  sponsor: '#FF6B35',
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

export function getMinXpForLevel(level: number): number {
  return XP_LEVELS[Math.min(level - 1, XP_LEVELS.length - 1)]?.minXp ?? 0
}

export function getLevelTitle(level: number): string {
  if (level >= 10) return 'LEGEND'
  if (level >= 7) return 'EXPLORER'
  if (level >= 4) return 'SEEKER'
  if (level >= 2) return 'NOMAD'
  return 'ROOKIE'
}

export function getDifficulty(xp: number): { label: string; color: string } {
  if (xp >= 300) return { label: 'HARD', color: COLORS.danger }
  if (xp >= 150) return { label: 'MEDIUM', color: COLORS.warning }
  return { label: 'EASY', color: COLORS.success }
}

export const CATEGORY_COLORS: Record<string, string> = {
  fitness: '#22C55E',
  social: '#A855F7',
  food: '#F97316',
  community: '#3B82F6',
  nature: '#06B6D4',
}

export const CATEGORY_SOFT: Record<string, string> = {
  fitness: '#DCFCE7',
  social: '#F3E8FF',
  food: '#FFEDD5',
  community: '#DBEAFE',
  nature: '#CFFAFE',
}

export const CATEGORY_ICONS: Record<string, string> = {
  fitness: '🏃',
  social: '🤝',
  food: '🍽️',
  community: '🏘️',
  nature: '🌿',
}

export const CATEGORY_TAGS: Record<string, string> = {
  fitness: 'TRAIL',
  social: 'SOCIAL',
  food: 'FOOD',
  community: 'LOCAL',
  nature: 'VIEWS',
}

export const CATEGORY_IMAGES: Record<string, string> = {
  fitness: 'https://images.unsplash.com/photo-1629495063801-c1040fa82533?w=700&h=440&fit=crop&auto=format',
  social: 'https://images.unsplash.com/photo-1634709170162-23a76022e9c9?w=700&h=440&fit=crop&auto=format',
  food: 'https://images.unsplash.com/photo-1634709170162-23a76022e9c9?w=700&h=440&fit=crop&auto=format',
  community: 'https://images.unsplash.com/photo-1526268072039-3e33e8f0e379?w=700&h=440&fit=crop&auto=format',
  nature: 'https://images.unsplash.com/photo-1526268072039-3e33e8f0e379?w=700&h=440&fit=crop&auto=format',
}

/** Admin-uploaded cover, or category placeholder for legacy quests */
export function getQuestCoverImage(quest: { category: string; cover_image_url?: string | null }): string {
  if (quest.cover_image_url) return quest.cover_image_url
  return CATEGORY_IMAGES[quest.category] ?? CATEGORY_IMAGES.fitness
}

export const PROOF_GEOFENCE_RADIUS = 300

export const BYPASS_GEOFENCE =
  process.env.EXPO_PUBLIC_BYPASS_GEOFENCE === 'true' || __DEV__
