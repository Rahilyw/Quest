/**
 * Badges, medals and trophies in a row: what a player has earned, at the top
 * of their page (BRAND.md §6c, §7 "Your page").
 *
 * Medals come from last week's podium (profiles.last_week_rank). Trophies
 * (seasons, big runs) have no data yet, so none show until they exist.
 */

import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Text as SvgText } from 'react-native-svg'
import { BadgeVisual } from '@/components/badges/BadgeVisual'
import { Medal, type MedalPalette } from '@/components/badges/medal'
import { Small } from '@/components/ui/Text'
import type { BadgeSpec } from '@/lib/badgeCatalog'
import { COLOR, FONT, SPACE } from '@/lib/theme'

const PODIUM: Record<number, { palette: MedalPalette; label: string }> = {
  1: { palette: 'gold', label: 'Gold medal, 1st last week' },
  2: { palette: 'silver', label: 'Silver medal, 2nd last week' },
  3: { palette: 'bronze', label: 'Bronze medal, 3rd last week' },
}

export function PodiumMedal({ rank, size }: { rank: number; size: number }) {
  const medal = PODIUM[rank]
  if (!medal) return null
  return (
    <Medal size={size} palette={medal.palette}>
      <SvgText x="50" y="60" fontSize="30" fontFamily={FONT.black} fill={COLOR.ink} textAnchor="middle">
        {String(rank)}
      </SvgText>
    </Medal>
  )
}

export function RewardsRow({
  badges,
  lastWeekRank,
  onOpenBadge,
}: {
  badges: { id: string; spec: BadgeSpec }[]
  lastWeekRank?: number | null
  onOpenBadge?: () => void
}) {
  const medal = lastWeekRank ? PODIUM[lastWeekRank] : undefined
  if (!medal && badges.length === 0) return null
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {medal && lastWeekRank ? (
        <View style={styles.item} accessible accessibilityLabel={medal.label}>
          <PodiumMedal rank={lastWeekRank} size={64} />
          <Small numberOfLines={2} style={styles.label}>
            Last week
          </Small>
        </View>
      ) : null}
      {badges.map((badge) => (
        <Pressable
          key={badge.id}
          onPress={onOpenBadge}
          disabled={!onOpenBadge}
          accessibilityRole={onOpenBadge ? 'button' : 'image'}
          accessibilityLabel={`${badge.spec.name} badge`}
          style={styles.item}
        >
          <BadgeVisual spec={badge.spec} size={64} earned />
          <Small numberOfLines={2} style={styles.label}>
            {badge.spec.name}
          </Small>
        </Pressable>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: SPACE.s4, gap: SPACE.s4, paddingBottom: SPACE.s4 },
  item: { width: 84, alignItems: 'center', gap: SPACE.s2 },
  label: { textAlign: 'center' },
})

export default RewardsRow
