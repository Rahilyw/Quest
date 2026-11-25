import { StyleSheet, View } from 'react-native'
import { Skeleton } from '@/components/ui/Skeleton'
import { COLOR, RADIUS, SPACE } from '@/lib/theme'

/** Static paper-shaped placeholder while quests load (BRAND rule 9 / E2). */
export function MapSkeleton() {
  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Loading the map"
    >
      <View style={styles.fill} />
      <View style={styles.pins} pointerEvents="none">
        <Skeleton width={SPACE.s8} height={SPACE.s8} radius={RADIUS.pill} />
        <Skeleton width={SPACE.s8} height={SPACE.s8} radius={RADIUS.pill} />
        <Skeleton width={SPACE.s8} height={SPACE.s8} radius={RADIUS.pill} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFill,
    backgroundColor: COLOR.paper,
    zIndex: 2,
  },
  fill: {
    ...StyleSheet.absoluteFill,
    backgroundColor: COLOR.paperDeep,
  },
  pins: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: SPACE.s6,
  },
})
