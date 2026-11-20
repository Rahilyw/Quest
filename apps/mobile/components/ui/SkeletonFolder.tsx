import { View, type StyleProp, type ViewStyle } from 'react-native'
import { Skeleton } from '@/components/ui/Skeleton'
import { RADIUS, SPACE } from '@/lib/theme'

/** Folder / card stack — badges vault, quest body, completion card. */
export function SkeletonFolder({
  lines = 3,
  style,
}: {
  lines?: number
  style?: StyleProp<ViewStyle>
}) {
  return (
    <View style={[{ gap: SPACE.s3 }, style]}>
      <Skeleton height={24} width="62%" radius={RADIUS.folder} />
      <Skeleton height={14} width="40%" />
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} height={14} width={i === lines - 1 ? '70%' : '100%'} />
      ))}
    </View>
  )
}

/** Square media block with a user row above — completion / share card. */
export function SkeletonMediaCard({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Loading post"
      style={[{ paddingHorizontal: SPACE.s4, gap: SPACE.s3 }, style]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.s3 }}>
        <Skeleton width={40} height={40} radius={RADIUS.pill} />
        <View style={{ flex: 1, gap: SPACE.s2 }}>
          <Skeleton width="42%" height={14} />
          <Skeleton width="28%" height={12} />
        </View>
      </View>
      <Skeleton height={280} radius={RADIUS.card} />
      <Skeleton width="55%" height={14} />
    </View>
  )
}

/** Profile hero: avatar + name + count chips. */
export function SkeletonProfile({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Loading profile"
      style={[{ alignItems: 'center', gap: SPACE.s3, paddingHorizontal: SPACE.s4 }, style]}
    >
      <Skeleton width={84} height={84} radius={RADIUS.pill} />
      <Skeleton width={160} height={18} />
      <Skeleton width={110} height={14} />
      <View style={{ flexDirection: 'row', gap: SPACE.s5, marginTop: SPACE.s3 }}>
        <Skeleton width={56} height={36} radius={RADIUS.control} />
        <Skeleton width={56} height={36} radius={RADIUS.control} />
        <Skeleton width={56} height={36} radius={RADIUS.control} />
      </View>
    </View>
  )
}

/** Badge vault grid placeholders. */
export function SkeletonBadgeGrid({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Loading badges"
      style={[{ paddingHorizontal: SPACE.s4, gap: SPACE.s5 }, style]}
    >
      <Skeleton height={120} radius={RADIUS.card} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s3 }}>
        {Array.from({ length: 6 }, (_, i) => (
          <View key={i} style={{ width: '47%', flexGrow: 1, maxWidth: '48.5%' }}>
            <Skeleton height={96} radius={RADIUS.folder} />
          </View>
        ))}
      </View>
    </View>
  )
}
