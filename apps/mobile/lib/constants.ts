import {
  XP_LEVELS,
  getLevelFromXp,
  getXpToNextLevel,
  getMinXpForLevel,
} from './xpLevels'

export { XP_LEVELS, getLevelFromXp, getXpToNextLevel, getMinXpForLevel }

export const APP_NAME = 'Quest!'

/** Official brand wordmark — Bispo Nova (commercial-safe; replaces CC-NC Skyscapers) */
export const FONT_BRAND = 'BispoNova'

/** Summer 2026 palette — bright sky, coral pops, warm sunshine canvas */
export const COLORS = {
  bg: '#FFFBF0',
  bgOuter: '#FFE8A3',
  bgWarm: '#FFF4D6',

  surface: '#FFFFFF',
  surfaceElevated: '#FFFDF7',

  border: 'rgba(14, 165, 233, 0.14)',

  textPrimary: '#1A2B4A',
  textMuted: '#5C7A99',

  /** Summer sky blue */
  primary: '#0EA5E9',
  primaryLight: '#7DD3FC',
  primarySoft: '#E0F7FF',

  accent: '#0EA5E9',
  accentSoft: '#E0F7FF',
  accentText: '#0284C7',

  /** Coral — badges, notifications, energy */
  highlight: '#FF6B35',
  sunshine: '#FBBF24',
  coral: '#FF8A65',
  mint: '#2DD4BF',

  navy: '#1E3A5F',
  navyMid: '#2563EB',

  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  sponsor: '#FF6B35',

  warningSoft: '#FEF3C7',
  successSoft: '#ECFDF5',

  /** Leaderboard medal tints */
  gold: '#FBBF24',
  goldSoft: '#FEF3C7',
  silver: '#94A3B8',
  silverSoft: '#F1F5F9',
  bronze: '#D97706',
  bronzeSoft: '#FFEDD5',
} as const

export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 } as const
export const RADIUS = { sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, pill: 999 } as const

export const CITY = {
  name: 'Victoria, BC',
  lat: 48.4284,
  lng: -123.3656,
  defaultZoom: 13,
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
  food: 'https://images.unsplash.com/photo-1493770348161-369560ae357d?w=700&h=440&fit=crop&auto=format',
  community: 'https://images.unsplash.com/photo-1526268072039-3e33e8f0e379?w=700&h=440&fit=crop&auto=format',
  nature: 'https://images.unsplash.com/photo-1597709017586-66dcbbe9eabf?w=700&h=440&fit=crop&auto=format',
}

/** Admin-uploaded cover, or category placeholder for legacy quests */
export function getQuestCoverImage(quest: { category: string; cover_image_url?: string | null }): string {
  if (quest.cover_image_url) return quest.cover_image_url
  return CATEGORY_IMAGES[quest.category] ?? CATEGORY_IMAGES.fitness
}

/** @deprecated Use quest.geofence_type + @quest/geofence instead. Kept for legacy tests. */
export const PROOF_GEOFENCE_RADIUS = 300

/** Dev-only; never active in production builds (Spec 02). */
export const BYPASS_GEOFENCE =
  __DEV__ && process.env.EXPO_PUBLIC_BYPASS_GEOFENCE === 'true'

export const LEGAL_URLS = {
  privacyPolicy: 'https://quest.app/privacy',
  termsOfService: 'https://quest.app/terms',
} as const

export function getISOWeek(): number {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const yearStart = new Date(d.getFullYear(), 0, 1)
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

export function getDaysLeftInWeek(): number {
  const day = new Date().getDay()
  return day === 0 ? 0 : 7 - day
}
