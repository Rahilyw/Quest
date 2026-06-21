import { View, Text, StyleSheet } from 'react-native'
import { Avatar } from '@/components/Avatar'
import { COLORS, SPACING, RADIUS, getLevelTitle } from '@/lib/constants'
import type { LeaderboardEntry } from '@/lib/types'

interface Props {
  entries: LeaderboardEntry[]
}

export function Podium({ entries }: Props) {
  const top3 = entries.slice(0, 3)
  if (top3.length < 3) return null

  const [first, second, third] = top3

  return (
    <View style={styles.podium}>
      <PodiumSlot entry={second} rank={2} size="md" />
      <PodiumSlot entry={first} rank={1} size="lg" crown />
      <PodiumSlot entry={third} rank={3} size="md" />
    </View>
  )
}

function PodiumSlot({
  entry,
  rank,
  size,
  crown,
}: {
  entry: LeaderboardEntry
  rank: number
  size: 'md' | 'lg'
  crown?: boolean
}) {
  const avatarSize = size === 'lg' ? 80 : 56
  const isLarge = size === 'lg'

  return (
    <View style={[styles.slot, isLarge && styles.slotLarge]}>
      {crown && <Text style={styles.crown}>👑</Text>}
      <View style={styles.avatarWrap}>
        <Avatar username={entry.username} uri={entry.avatar_url} size={avatarSize} />
        <View style={[styles.rankBadge, isLarge && styles.rankBadgeLg]}>
          <Text style={[styles.rankNum, isLarge && styles.rankNumLg]}>{rank}</Text>
        </View>
      </View>
      <Text style={[styles.name, isLarge && styles.nameLg]} numberOfLines={1}>
        @{entry.username}
      </Text>
      <Text style={styles.levelMeta}>
        LV {getLevelFromEntry(entry)} {getLevelTitle(getLevelFromEntry(entry))}
      </Text>
      <View style={[styles.xpBox, isLarge && styles.xpBoxLg]}>
        <Text style={[styles.xpValue, isLarge && styles.xpValueLg]}>
          {entry.weekly_xp.toLocaleString()}
        </Text>
        <Text style={styles.xpLabel}>XP</Text>
      </View>
    </View>
  )
}

function getLevelFromEntry(entry: LeaderboardEntry): number {
  const xp = entry.weekly_xp
  if (xp >= 3500) return 9
  if (xp >= 2000) return 7
  if (xp >= 1000) return 5
  if (xp >= 500) return 4
  return 3
}

const styles = StyleSheet.create({
  podium: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },
  slot: { alignItems: 'center', width: 96 },
  slotLarge: { width: 112, marginBottom: -8 },
  crown: { fontSize: 24, marginBottom: 4 },
  avatarWrap: { position: 'relative', marginBottom: SPACING.sm },
  rankBadge: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  rankBadgeLg: { width: 28, height: 28, borderRadius: 14 },
  rankNum: { color: COLORS.navy, fontSize: 12, fontWeight: '900' },
  rankNumLg: { fontSize: 14 },
  name: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 2,
  },
  nameLg: { fontSize: 14 },
  levelMeta: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  xpBox: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    width: '100%',
  },
  xpBoxLg: { backgroundColor: COLORS.primary, paddingVertical: SPACING.md },
  xpValue: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  xpValueLg: { fontSize: 18 },
  xpLabel: { color: 'rgba(255,255,255,0.45)', fontSize: 9, marginTop: 2 },
})
