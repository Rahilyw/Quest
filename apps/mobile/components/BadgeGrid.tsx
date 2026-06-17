import { View, Text, StyleSheet } from 'react-native'
import type { UserBadge } from '@/lib/types'

interface Props {
  badges: UserBadge[]
}

export function BadgeGrid({ badges }: Props) {
  if (badges.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Complete quests to earn badges</Text>
      </View>
    )
  }

  return (
    <View style={styles.grid}>
      {badges.map((ub) => (
        <View key={ub.badge_id} style={styles.badge}>
          <Text style={styles.badgeIcon}>{ub.badge?.icon ?? '🏅'}</Text>
          <Text style={styles.badgeName} numberOfLines={2}>{ub.badge?.name}</Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16 },
  badge: {
    width: '30%',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    margin: '1.5%',
  },
  badgeIcon: { fontSize: 32, marginBottom: 6 },
  badgeName: { color: '#94A3B8', fontSize: 11, textAlign: 'center' },
  empty: { paddingHorizontal: 20, paddingVertical: 32 },
  emptyText: { color: '#475569', textAlign: 'center' },
})
