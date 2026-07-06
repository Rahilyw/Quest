import type { Badge } from '@/lib/types'
import { BADGE_ART } from '@/components/badges/art'
import {
  CATALOG_BY_NAME,
  type BadgeArtStyle,
  type BadgeRarity,
  type BadgeSpec,
} from '@/lib/badgeCatalog'

/** Merge DB badge row with optional mobile catalog entry (art + copy fallbacks). */
export function resolveBadgeSpec(b: Badge): BadgeSpec {
  const catalog = CATALOG_BY_NAME[b.name]
  return {
    key: b.art_key || catalog?.key || `db-${b.id}`,
    name: b.name,
    rarity: (b.rarity as BadgeRarity) || catalog?.rarity || 'rare',
    style: (b.art_style as BadgeArtStyle) || catalog?.style || 'medal',
    description: b.description || catalog?.description || '',
    lockedHint: b.locked_hint || catalog?.lockedHint || b.description,
    unlock: b.unlock_condition || catalog?.unlock || '',
    secret: b.is_secret ?? catalog?.secret,
    iconUrl: b.icon_url ?? undefined,
    hasBuiltInArt: Boolean(CATALOG_BY_NAME[b.name] || BADGE_ART[b.art_key || '']),
  }
}

export function sortBadgeSpecs(specs: BadgeSpec[], dbBadges: Badge[]): BadgeSpec[] {
  const order = new Map(dbBadges.map((b, i) => [b.name, b.sort_order ?? i]))
  return [...specs].sort((a, b) => (order.get(a.name) ?? 999) - (order.get(b.name) ?? 999))
}
