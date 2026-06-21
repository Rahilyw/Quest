import { TouchableOpacity, Text, View, StyleSheet } from 'react-native'
import { COLORS, RADIUS, SPACING } from '@/lib/constants'

interface Props {
  label: string
  active: boolean
  onPress: () => void
  count?: number
}

export function CategoryChip({ label, active, onPress, count }: Props) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.labelWrap}>
        <Text style={[styles.label, active && styles.labelActive]}>
          {label}{count !== undefined ? ` ${count}` : ''}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'center',
    minHeight: 36,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.lg,
    marginRight: SPACING.sm,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    justifyContent: 'center',
    // Glass lift
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  labelWrap: {
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
  },
  chipActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  label: {
    color: COLORS.textSecondary,
    fontWeight: '600',
    fontSize: 13,
    lineHeight: 18,
    includeFontPadding: false,
  },
  labelActive: { color: '#FFFFFF' },
})
