import { StyleSheet, View } from 'react-native'
import { COLOR, SPACE, getCategory } from '@/lib/theme'

/**
 * Cutouts map pin (BRAND.md §3): one bright per category, ink edge, 48pt target.
 * Colour is never the only signal — callers put the category name in the a11y label.
 */
export function CategoryPin({
  category,
  accessibilityLabel,
}: {
  category: string
  accessibilityLabel: string
}) {
  const cat = getCategory(category)
  return (
    <View
      style={styles.hit}
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <View
        style={[styles.dot, { backgroundColor: cat.color, borderColor: COLOR.ink }]}
        importantForAccessibility="no"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  hit: {
    width: SPACE.s8,
    height: SPACE.s8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: SPACE.s5,
    height: SPACE.s5,
    borderRadius: SPACE.s5 / 2,
    borderWidth: 2,
  },
})
