import { Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { COLORS, RADIUS, SPACING } from '@/lib/constants'

interface Props {
  isFollowing: boolean
  loading?: boolean
  onPress: () => void
  compact?: boolean
}

export function FollowButton({ isFollowing, loading = false, onPress, compact = false }: Props) {
  return (
    <TouchableOpacity
      style={[
        styles.btn,
        compact && styles.btnCompact,
        isFollowing ? styles.btnFollowing : styles.btnFollow,
      ]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={isFollowing ? 'Unfollow' : 'Follow'}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={isFollowing ? COLORS.textMuted : '#FFFFFF'} />
      ) : (
        <Text style={[styles.label, isFollowing ? styles.labelFollowing : styles.labelFollow]}>
          {isFollowing ? 'Following' : 'Follow'}
        </Text>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm + 2,
    minWidth: 104,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCompact: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    minWidth: 84,
    minHeight: 32,
  },
  btnFollow: { backgroundColor: COLORS.primary },
  btnFollowing: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  label: { fontSize: 13, fontWeight: '800' },
  labelFollow: { color: '#FFFFFF' },
  labelFollowing: { color: COLORS.textMuted },
})
