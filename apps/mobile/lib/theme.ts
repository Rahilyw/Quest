/**
 * Quest! design tokens: the "Cutouts" direction.
 * Source of truth: docs/design/BRAND.md (§3 colour, §4 type, §5 shape, §8 motion, §12 tokens).
 *
 * Every colour, font and radius in the app should come from this file. Raw hex values and
 * fontSize literals elsewhere are flagged by `npm run lint:tokens`.
 */
import type { TextStyle } from 'react-native'

/** Base colours. Neutrals are warm-tinted; never pure #000 or #fff. */
export const COLOR = {
  ink: '#1C1915',
  inkSoft: '#6B665E',
  inkFaint: '#8E8A84',
  inkPressed: '#34302A',
  paper: '#F6F2EC',
  paperDeep: '#ECE7E0',
  white: '#FFFDFA',
  desk: '#EDE6DC',
  rule: 'rgba(28,25,21,0.10)',
  secondaryFill: 'rgba(28,25,21,0.07)',
  disabledFill: 'rgba(28,25,21,0.12)',
  scrim: 'rgba(28,25,21,0.45)',
} as const

export type CategoryKey = 'fitness' | 'food' | 'social' | 'community' | 'nature'

export interface CategoryToken {
  label: string
  /** The category's bright: folders, bubbles, pins, the Verified screen. */
  color: string
  /** 78% of the colour mixed with black: folder backs, zone outlines. */
  deep: string
  /** Text colour that passes contrast on `color`. */
  onColor: string
  /** Ionicons outline glyph (already bundled via @expo/vector-icons). */
  icon: string
}

/** Categories own the brights. Colour is information, never decoration. */
export const CATEGORY: Record<CategoryKey, CategoryToken> = {
  fitness: { label: 'Fitness', color: '#FFCE1F', deep: '#C7A118', onColor: COLOR.ink, icon: 'walk-outline' },
  food: { label: 'Food', color: '#F2584A', deep: '#BD453A', onColor: COLOR.ink, icon: 'restaurant-outline' },
  social: { label: 'Social', color: '#C6B2F0', deep: '#9A8BBB', onColor: COLOR.ink, icon: 'people-outline' },
  community: { label: 'Community', color: '#2F6BF0', deep: '#2553BB', onColor: COLOR.white, icon: 'storefront-outline' },
  nature: { label: 'Nature', color: '#34B864', deep: '#298F4E', onColor: COLOR.ink, icon: 'leaf-outline' },
}

export const SPONSORED = { label: 'Sponsored', color: '#FF9A1F', deep: '#C77818', onColor: COLOR.ink } as const

export const CATEGORY_KEYS = Object.keys(CATEGORY) as CategoryKey[]

/** Look up a category safely; unknown values fall back to Fitness so nothing renders blank. */
export function getCategory(key: string | null | undefined): CategoryToken {
  return CATEGORY[(key ?? '') as CategoryKey] ?? CATEGORY.fitness
}

export const RADIUS = { folder: 10, control: 14, card: 22, sheet: 28, bubble: 30, pill: 999 } as const

/** 4pt grid. */
export const SPACE = { s1: 4, s2: 8, s3: 12, s4: 16, s5: 20, s6: 24, s7: 32, s8: 48 } as const

export const FONT = {
  regular: 'Figtree_400Regular',
  medium: 'Figtree_500Medium',
  semibold: 'Figtree_600SemiBold',
  bold: 'Figtree_700Bold',
  black: 'Figtree_800ExtraBold',
  /** Wordmark, app icon and splash only. Never headings. */
  brand: 'Pilowlava',
} as const

/** One step per role. Running text never goes below `body`. */
export const TYPE = {
  title: { fontFamily: FONT.black, fontSize: 40, lineHeight: 40, letterSpacing: -1.6 },
  sentence: { fontFamily: FONT.bold, fontSize: 24, lineHeight: 31, letterSpacing: -0.5 },
  heading: { fontFamily: FONT.black, fontSize: 20, lineHeight: 26, letterSpacing: -0.4 },
  body: { fontFamily: FONT.regular, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: FONT.bold, fontSize: 16, lineHeight: 24 },
  name: { fontFamily: FONT.black, fontSize: 16, lineHeight: 22 },
  small: { fontFamily: FONT.semibold, fontSize: 13, lineHeight: 18 },
  micro: { fontFamily: FONT.bold, fontSize: 11, lineHeight: 14 },
} as const satisfies Record<string, TextStyle>

export type TypeRole = keyof typeof TYPE

export const SHADOW = {
  lift: { shadowColor: '#3C2814', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 10 }, elevation: 4 },
  float: { shadowColor: COLOR.ink, shadowOpacity: 0.14, shadowRadius: 10, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  stack: { shadowColor: COLOR.ink, shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
} as const

/** Durations in ms; easings as cubic-bezier control points for Reanimated's Easing.bezier. */
export const MOTION = {
  press: { duration: 120, bezier: [0.16, 1, 0.3, 1] },
  sheet: { duration: 250, bezier: [0.16, 1, 0.3, 1] },
  land: { duration: 420, bezier: [0.22, 1, 0.36, 1] },
} as const
