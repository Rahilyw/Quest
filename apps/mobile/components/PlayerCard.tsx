import { View, Text, StyleSheet } from 'react-native'
import { Avatar } from '@/components/Avatar'
import {
  COLORS,
  SPACING,
  RADIUS,
  getMinXpForLevel,
  getLevelTitle,
} from '@/lib/constants'
import type { UserProfile } from '@/lib/types'

interface Props {
  profile: UserProfile
  weeklyRank?: number | null
  todayXp?: number
}

export function PlayerCard({ profile, weeklyRank, todayXp = 0 }: Props) {
  const minXp = getMinXpForLevel(profile.level)
  const maxXp = getMinXpForLevel(profile.level + 1)
  const pct = maxXp === minXp ? 100 : Math.min(((profile.total_xp - minXp) / (maxXp - minXp)) * 100, 100)

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Avatar username={profile.username} uri={profile.avatar_url} size={44} />
        <View style={styles.info}>
          <View style={styles.levelRow}>
            <Text style={styles.levelLabel}>LV {profile.level}</Text>
            <Text style={styles.titleLabel}>{getLevelTitle(profile.level)}</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${pct}%` }]} />
          </View>
          <Text style={styles.xpMeta}>
            {profile.total_xp.toLocaleString()} / {maxXp.toLocaleString()} XP
            {weeklyRank ? ` · Rank #${weeklyRank} this week` : ''}
          </Text>
        </View>
        <View style={styles.todayBlock}>
          <Text style={styles.todayValue}>+{todayXp}</Text>
          <Text style={styles.todayLabel}>today</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  info: { flex: 1, minWidth: 0 },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: 6 },
  levelLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700' },
  titleLabel: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  track: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: RADIUS.pill,
    overflow: 'hidden',
    marginBottom: 4,
  },
  fill: { height: '100%', backgroundColor: '#FFFFFF', borderRadius: RADIUS.pill },
  xpMeta: { color: 'rgba(255,255,255,0.7)', fontSize: 10 },
  todayBlock: { alignItems: 'flex-end' },
  todayValue: { color: '#FFFFFF', fontSize: 24, fontWeight: '900' },
  todayLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10 },
})
