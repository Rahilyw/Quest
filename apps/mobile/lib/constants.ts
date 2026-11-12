import {
  XP_LEVELS,
  getLevelFromXp,
  getXpToNextLevel,
  getMinXpForLevel,
} from './xpLevels'
import { CATEGORY, COLOR, FONT, SPONSORED } from './theme'
import { levelTitle } from './copy'

export { XP_LEVELS, getLevelFromXp, getXpToNextLevel, getMinXpForLevel }

export const APP_NAME = 'Quest!'

/** Pilowlava (SIL OFL 1.1, Studio Triple). Wordmark only. */
export const FONT_BRAND = FONT.brand
/**
 * @deprecated Display headings now use Figtree ExtraBold. Kept as an alias so screens keep
 * working until they move to the text primitives in components/ui/Text.tsx.
 */
export const FONT_DISPLAY = FONT.black

/**
 * @deprecated Legacy colour names, now mapped onto the Cutouts tokens in lib/theme.ts.
 * New code imports COLOR / CATEGORY from '@/lib/theme'. Screens migrate off this in
 * Phases 3 and 4 of docs/design/UI-OVERHAUL-PLAN.md.
 */
export const COLORS = {
  bg: COLOR.paper,
  bgOuter: COLOR.desk,
  bgWarm: COLOR.desk,

  surface: COLOR.white,
  surfaceElevated: COLOR.white,

  border: COLOR.rule,

  textPrimary: COLOR.ink,
  textMuted: COLOR.inkSoft,

  /** Ink is the action colour now: buttons, active states, links. */
  primary: COLOR.ink,
  primaryLight: COLOR.inkPressed,
  primarySoft: COLOR.paperDeep,

  accent: COLOR.ink,
  accentSoft: COLOR.paperDeep,
  accentText: COLOR.ink,

  /** Notification dots and "new" marks. Deep tomato so white text on it passes contrast. */
  highlight: CATEGORY.food.deep,
  sunshine: CATEGORY.fitness.color,
  coral: CATEGORY.food.color,
  mint: CATEGORY.nature.color,

  /** Dark hero surfaces (This week, Rankings, Profile headers). */
  navy: COLOR.ink,
  navyMid: COLOR.inkPressed,

  success: CATEGORY.nature.deep,
  warning: SPONSORED.deep,
  danger: CATEGORY.food.deep,
  sponsor: SPONSORED.color,

  warningSoft: '#FBEBD3',
  successSoft: '#E1F1E6',

  /** Leaderboard medal tints (Rankings is redesigned in Phase 4). */
  gold: CATEGORY.fitness.color,
  goldSoft: '#FFF2C2',
  silver: COLOR.inkFaint,
  silverSoft: COLOR.paperDeep,
  bronze: SPONSORED.deep,
  bronzeSoft: '#FBE3C7',
} as const

export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 } as const
export const RADIUS = { sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, pill: 999 } as const

/**
 * Floating tab bar. Screens scroll behind it and pad by
 * `insets.bottom + TAB_BAR_CLEARANCE` (pill height + 18pt float + air).
 */
export const TAB_BAR_HEIGHT = 56
export const TAB_BAR_CLEARANCE = TAB_BAR_HEIGHT + 18 + 16

export const CITY = {
  name: 'Victoria, BC',
  lat: 48.4284,
  lng: -123.3656,
  defaultZoom: 13,
}

/** Sentence case: "Rookie", "Legend". See lib/copy.js. */
export const getLevelTitle = levelTitle

/**
 * Interim difficulty label until quests carry distance and time (decision D5, Phase 2).
 * Sentence case; colours come from the theme.
 */
export function getDifficulty(xp: number): { label: string; color: string } {
  if (xp >= 300) return { label: 'Hard', color: COLORS.danger }
  if (xp >= 150) return { label: 'Medium', color: COLORS.warning }
  return { label: 'Easy', color: COLORS.success }
}

/** @deprecated Use getCategory(key).color from '@/lib/theme'. */
export const CATEGORY_COLORS: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY).map(([key, c]) => [key, c.color]),
)

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
