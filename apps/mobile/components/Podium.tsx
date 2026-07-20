import { View, Text, StyleSheet } from 'react-native'
import { Avatar } from '@/components/Avatar'
import { COLORS, SPACING, RADIUS, getLevelTitle } from '@/lib/constants'
import type { LeaderboardEntry } from '@/lib/types'

const RANK_LABELS: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd' }
const PEDESTAL_COLORS: Record<number, { bg: string; border: string }> = {
  1: { bg: COLORS.goldSoft, border: COLORS.gold },
  2: { bg: COLORS.silverSoft, border: COLORS.silver },
  3: { bg: COLORS.bronzeSoft, border: COLORS.bronze },
}

interface Props {
  entries: LeaderboardEntry[]
}

export function Podium({ entries }: Props) {
  const top3 = entries.slice(0, 3)
  if (top3.length === 0) return null

  if (top3.length === 1) {
    return (
      <View style={styles.soloWrap}>
        <PodiumSlot entry={top3[0]} rank={1} size="lg" crown pedestalHeight={72} />
      </View>
    )
  }

  if (top3.length === 2) {
    return (
      <View style={styles.podium}>
        <PodiumSlot entry={top3[0]} rank={1} size="lg" crown pedestalHeight={64} />
        <PodiumSlot entry={top3[1]} rank={2} size="md" pedestalHeight={48} />
      </View>
    )
  }

  const [first, second, third] = top3
  return (
    <View style={styles.podium}>
      <PodiumSlot entry={second} rank={2} size="md" pedestalHeight={52} />
      <PodiumSlot entry={first} rank={1} size="lg" crown pedestalHeight={72} />
      <PodiumSlot entry={third} rank={3} size="md" pedestalHeight={44} />
    </View>
  )
}

function PodiumSlot({
  entry,
  rank,
  size,
  crown,
  pedestalHeight,
}: {
  entry: LeaderboardEntry
  rank: number
  size: 'md' | 'lg'
  crown?: boolean
  pedestalHeight: number
}) {
  const avatarSize = size === 'lg' ? 72 : 56
  const isLarge = size === 'lg'
  const pedestal = PEDESTAL_COLORS[rank] ?? PEDESTAL_COLORS[3]

  return (
    <View
      style={[styles.slot, isLarge && styles.slotLarge]}
      accessible
      accessibilityLabel={`${RANK_LABELS[rank] ?? `${rank}th`} place: @${entry.username}, ${entry.weekly_xp.toLocaleString()} XP`}
    >
      {crown && <Text style={styles.crown}>👑</Text>}
      <View style={styles.avatarWrap}>
        <Avatar username={entry.username} uri={entry.avatar_url} size={avatarSize} />
        <View style={[styles.rankBadge, { borderColor: pedestal.border }]}>
          <Text style={[styles.rankNum, { color: pedestal.border }]}>{rank}</Text>
        </View>
      </View>
      <Text style={styles.name} numberOfLines={1}>
        @{entry.username}
      </Text>
      <Text style={styles.levelMeta}>
        LV {entry.level} · {getLevelTitle(entry.level)}
      </Text>
      <View
        style={[
          styles.pedestal,
          {
            height: pedestalHeight,
            backgroundColor: pedestal.bg,
            borderColor: pedestal.border,
          },
          isLarge && styles.pedestalLg,
        ]}
      >
        <Text style={[styles.xpValue, isLarge && styles.xpValueLg]}>
          {entry.weekly_xp.toLocaleString()}
        </Text>
        <Text style={styles.xpLabel}>XP this week</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  podium: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.sm,
  },
  soloWrap: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  slot: { alignItems: 'center', flex: 1, maxWidth: 110 },
  slotLarge: { maxWidth: 124 },
  crown: { fontSize: 22, marginBottom: 2 },
  avatarWrap: { position: 'relative', marginBottom: SPACING.sm },
  rankBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  rankNum: { fontSize: 12, fontWeight: '900' },
  name: {
    color: COLORS.navy,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 2,
  },
  levelMeta: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  pedestal: {
    width: '100%',
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xs,
  },
  pedestalLg: { borderWidth: 2.5 },
  xpValue: { color: COLORS.navy, fontSize: 15, fontWeight: '900' },
  xpValueLg: { fontSize: 18 },
  xpLabel: { color: COLORS.textMuted, fontSize: 8, fontWeight: '700', marginTop: 2 },
})
