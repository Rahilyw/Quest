/**
 * Compact label pill — category identification, sponsor tags, XP chips, status indicators.
 * XP on quest cards uses category color (variant="category") not accent — it's a reward preview, not an earned state.
 */
export interface BadgeProps {
  label: string
  /** Visual style. Default: "category" (uses category color pair) */
  variant?: 'category' | 'sponsor' | 'accent' | 'muted' | 'success' | 'warning'
  /** Category key — controls color when variant="category" */
  category?: 'fitness' | 'social' | 'food' | 'community' | 'nature'
  /** Leading emoji or glyph */
  icon?: string
}
