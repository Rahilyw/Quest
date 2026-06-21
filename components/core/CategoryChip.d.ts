/**
 * Filter chip for quest category selection.
 * Active state: Local Signal fill + Action Glow shadow.
 * Inactive state: Glass White + subtle border.
 *
 * Rule: Chips show emoji + category label (e.g. "🏃 Fitness") — never the category color.
 * Category color lives on the quest card, not the filter chip.
 *
 * @startingPoint section="Core Components" subtitle="Active + inactive chip states" viewport="700x80"
 */
export interface CategoryChipProps {
  /** Display text — include emoji prefix per CATEGORY_ICONS (e.g. "🏃 Fitness") */
  label: string
  active?: boolean
  /** Optional count shown next to label */
  count?: number
  onClick?: () => void
}
