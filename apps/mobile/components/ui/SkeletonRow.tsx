import { View, type StyleProp, type ViewStyle } from 'react-native'
import { Skeleton } from '@/components/ui/Skeleton'
import { RADIUS, SPACE } from '@/lib/theme'

/** Avatar + two text lines — blocked users, follows, comments. */
export function SkeletonRow({
  avatarSize = 44,
  style,
}: {
  avatarSize?: number
  style?: StyleProp<ViewStyle>
}) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACE.s3,
          paddingVertical: SPACE.s3,
        },
        style,
      ]}
    >
      <Skeleton width={avatarSize} height={avatarSize} radius={RADIUS.pill} />
      <View style={{ flex: 1, gap: SPACE.s2 }}>
        <Skeleton width="48%" height={14} />
        <Skeleton width="28%" height={12} />
      </View>
    </View>
  )
}

export function SkeletonRowList({
  count = 5,
  avatarSize = 44,
  padHorizontal = SPACE.s4,
}: {
  count?: number
  avatarSize?: number
  padHorizontal?: number
}) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Loading list"
      style={{ paddingHorizontal: padHorizontal, gap: SPACE.s1 }}
    >
      {Array.from({ length: count }, (_, i) => (
        <SkeletonRow key={i} avatarSize={avatarSize} />
      ))}
    </View>
  )
}
