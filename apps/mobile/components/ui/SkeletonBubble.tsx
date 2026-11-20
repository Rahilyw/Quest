import { View, type StyleProp, type ViewStyle } from 'react-native'
import { Skeleton } from '@/components/ui/Skeleton'
import { RADIUS, SPACE } from '@/lib/theme'

/** Feed-shaped bubble placeholder (City / Following stacks). */
export function SkeletonBubble({
  overlap,
  style,
}: {
  overlap?: boolean
  style?: StyleProp<ViewStyle>
}) {
  return (
    <View style={[{ marginHorizontal: SPACE.s4 }, overlap && { marginBottom: -12 }, style]}>
      <Skeleton height={108} radius={RADIUS.bubble} />
    </View>
  )
}

export function SkeletonBubbleStack({ count = 3 }: { count?: number }) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Loading posts"
      style={{ paddingTop: SPACE.s2 }}
    >
      {Array.from({ length: count }, (_, i) => (
        <SkeletonBubble key={i} overlap={i < count - 1} />
      ))}
    </View>
  )
}
