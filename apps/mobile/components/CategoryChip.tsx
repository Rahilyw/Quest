import { TouchableOpacity, View, StyleSheet } from 'react-native'
import { CATEGORY, COLOR, RADIUS, SHADOW, SPACE } from '@/lib/theme'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { Small } from '@/components/ui/Text'
import type { QuestCategory } from '@/lib/types'

interface Props {
  label: string
  category?: QuestCategory
  active: boolean
  onPress: () => void
  count?: number
}

export function CategoryChip({ label, category, active, onPress, count }: Props) {
  const catToken = category ? CATEGORY[category as keyof typeof CATEGORY] : null

  // Background and text colour per active/inactive + category
  let bgColor: string
  let textColor: string
  let iconColor: string

  if (category && catToken) {
    bgColor = active ? catToken.color : COLOR.secondaryFill
    textColor = active ? catToken.onColor : COLOR.inkSoft
    iconColor = active ? catToken.onColor : COLOR.inkSoft
  } else {
    // "All" chip
    bgColor = active ? COLOR.ink : COLOR.secondaryFill
    textColor = active ? COLOR.white : COLOR.inkSoft
    iconColor = active ? COLOR.white : COLOR.inkSoft
  }

  return (
    <TouchableOpacity
      style={[
        styles.chip,
        { backgroundColor: bgColor },
        active && SHADOW.lift,
      ]}
      onPress={onPress}
      activeOpacity={0.82}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
    >
      <View style={styles.labelWrap}>
        {category ? (
          <CategoryIcon category={category} size={14} color={iconColor} />
        ) : null}
        <Small color={textColor}>
          {label}{count !== undefined ? ` ${count}` : ''}
        </Small>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'center',
    minHeight: 40,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 14,
    paddingVertical: SPACE.s2,
    marginRight: SPACE.s2,
    justifyContent: 'center',
  },
  labelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.s2,
  },
})
