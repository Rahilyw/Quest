import { View, type StyleProp, type ViewStyle } from 'react-native'
import { COLOR, RADIUS } from '@/lib/theme'

/**
 * Static skeleton block (BRAND rule 9 / card E2).
 * No shimmer loops. Reduce-motion and default both render the same static fill —
 * shape carries the loading affordance, not motion.
 */
export type SkeletonProps = {
  width?: number | `${number}%`
  height?: number
  radius?: number
  style?: StyleProp<ViewStyle>
}

export function Skeleton({
  width = '100%',
  height = 14,
  radius = RADIUS.pill,
  style,
}: SkeletonProps) {
  return (
    <View
      accessible={false}
      importantForAccessibility="no"
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: COLOR.paperDeep,
        },
        style,
      ]}
    />
  )
}
