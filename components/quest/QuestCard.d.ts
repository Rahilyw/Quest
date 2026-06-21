/**
 * The central repeating quest card — Glass White surface, category icon box on soft tint,
 * glass specular highlight on top edge, XP in category color.
 *
 * XP color rule: use category color (NOT indigo) — XP shown here is a reward preview, not an earned state.
 * Sponsor pill rule: Warm Sand bg + orange border, NOT the category pill style.
 *
 * @startingPoint section="Quest Components" subtitle="Standard & sponsored quest card" viewport="700x320"
 */
export interface QuestCardProps {
  title: string
  description?: string
  /** Controls icon, category pill color, and XP text color */
  category?: 'fitness' | 'social' | 'food' | 'community' | 'nature'
  xpReward?: number
  /** Distance string — e.g. "0.4 km". Shown in mist distance pill. Omit to hide. */
  distance?: string
  isSponsored?: boolean
  /** Shown in sponsor pill when isSponsored=true */
  sponsorName?: string
  onClick?: () => void
}
