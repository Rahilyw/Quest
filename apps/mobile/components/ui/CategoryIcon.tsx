import { Ionicons } from '@expo/vector-icons'
import { COLOR, getCategory } from '@/lib/theme'

/**
 * A category's line icon (replaces the old emoji map). Decorative by default: the category
 * name is always shown next to it, so screen readers don't need it twice.
 */
export function CategoryIcon({
  category,
  size = 18,
  color = COLOR.ink,
}: {
  category: string
  size?: number
  color?: string
}) {
  const icon = getCategory(category).icon as keyof typeof Ionicons.glyphMap
  return <Ionicons name={icon} size={size} color={color} accessibilityElementsHidden importantForAccessibility="no" />
}
