import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, CATEGORY_COLORS, SPACING, RADIUS } from '@/lib/constants'

const CATEGORY_IONICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  fitness: 'barbell-outline',
  social: 'people-outline',
  food: 'restaurant-outline',
  community: 'home-outline',
  nature: 'leaf-outline',
}

interface Props {
  title: string
  category: string
  xp_reward: number
  completed_at: string
  redemption_code?: string | null
  is_sponsored?: boolean
}

function formatCompletedDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function QuestHistoryItem({ title, category, xp_reward, completed_at, redemption_code, is_sponsored }: Props) {
  const color = CATEGORY_COLORS[category] ?? COLORS.accent
  const iconName = CATEGORY_IONICONS[category] ?? 'flag-outline'

  return (
    <View style={styles.row}>
      <View style={[styles.iconCircle, { backgroundColor: color + '26' }]}>
        <Ionicons name={iconName} size={18} color={color} />
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={styles.date}>{formatCompletedDate(completed_at)}</Text>
        {is_sponsored && redemption_code && (
          <View style={styles.codePill}>
            <Text style={styles.codeText}>🎁 Code: {redemption_code}</Text>
          </View>
        )}
        {is_sponsored && !redemption_code && (
          <Text style={styles.pendingText}>🎁 Reward pending</Text>
        )}
      </View>
      <Text style={styles.xp}>+{xp_reward} XP</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  title: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600' },
  date: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  xp: { color: COLORS.accent, fontSize: 13, fontWeight: '700' },
  codePill: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.bgWarm,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
  },
  codeText: { color: COLORS.sponsor, fontWeight: '700', fontSize: 11 },
  pendingText: { color: COLORS.textMuted, fontSize: 11, marginTop: 4 },
})
