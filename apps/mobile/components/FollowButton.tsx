import { ActivityIndicator, Pressable, StyleSheet } from 'react-native'
import { Small } from '@/components/ui/Text'
import { COLOR, RADIUS, SPACE } from '@/lib/theme'

interface Props {
  isFollowing: boolean
  loading?: boolean
  onPress: () => void
  compact?: boolean
}

/** Ink pill to follow, quiet pill once you do. Both keep a 48pt target. */
export function FollowButton({ isFollowing, loading = false, onPress, compact = false }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={isFollowing ? 'Following. Tap to unfollow.' : 'Follow'}
      accessibilityState={{ selected: isFollowing, busy: loading }}
      hitSlop={compact ? 6 : 0}
      style={({ pressed }) => [
        styles.btn,
        compact && styles.compact,
        isFollowing ? styles.following : styles.follow,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={isFollowing ? COLOR.ink : COLOR.white} />
      ) : (
        <Small color={isFollowing ? COLOR.ink : COLOR.white}>{isFollowing ? 'Following' : 'Follow'}</Small>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACE.s5,
    minWidth: 112,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compact: {
    paddingHorizontal: SPACE.s4,
    minWidth: 96,
    minHeight: 40,
  },
  follow: { backgroundColor: COLOR.ink },
  following: { backgroundColor: COLOR.secondaryFill },
  pressed: { transform: [{ scale: 0.97 }] },
})
