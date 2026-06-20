import { View, Text, StyleSheet } from 'react-native'
import { COLORS, RADIUS, SPACING } from '@/lib/constants'
import type { UserBadgeWithBadge } from '@/lib/types'

interface Props {
  badges: UserBadgeWithBadge[]
}

export function BadgeGrid({ badges }: Props) {
  if (badges.length === 0) {
    return (
      <View style={styles.empty}>
        <View style={styles.emptyIconWrap}>
          <Text style={styles.emptyIcon}>🏅</Text>
        </View>
        <Text style={styles.emptyTitle}>No badges yet</Text>
        <Text style={styles.emptySubtitle}>Complete quests to earn your first badge</Text>
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  badge: {
    width: '30%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  badgeIcon: { fontSize: 30, marginBottom: SPACING.xs },
  badgeName: {
    color: COLORS.textSecondary,
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xxl * 2,
  },
  emptyIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FEF9C3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  emptyIcon: { fontSize: 32 },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 240,
  },
})
