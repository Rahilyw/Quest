import { TouchableOpacity, Text, View, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, RADIUS, SPACING } from '@/lib/constants'
import type { QuestCategory } from '@/lib/types'

interface Props {
  label: string
  category?: QuestCategory
  active: boolean
  onPress: () => void
  count?: number
}

const CHIP_META = {
  all: {
    color: COLORS.navy,
    soft: '#E8EEF7',
    border: '#B8C6DA',
    icon: 'sparkles-outline',
  },
  fitness: {
    color: '#15803D',
    soft: '#DCFCE7',
    border: '#86D9A4',
    icon: 'fitness-outline',
  },
  social: {
    color: '#7C3AED',
    soft: '#F0E7FF',
    border: '#C8ADF8',
    icon: 'people-outline',
  },
  food: {
    color: '#C2410C',
    soft: '#FFF0E5',
    border: '#FDB98B',
    icon: 'restaurant-outline',
  },
  community: {
    color: '#1D4ED8',
    soft: '#E5EDFF',
    border: '#9DB8F7',
    icon: 'home-outline',
  },
  nature: {
    color: '#0F766E',
    soft: '#DDF7F2',
    border: '#87D8CA',
    icon: 'leaf-outline',
  },
} as const

export function CategoryChip({ label, category, active, onPress, count }: Props) {
  const meta = CHIP_META[category ?? 'all']
  const foreground = active ? '#FFFFFF' : meta.color

  return (
    <TouchableOpacity
      style={[
        styles.chip,
        {
          backgroundColor: active ? meta.color : meta.soft,
          borderColor: active ? meta.color : meta.border,
          shadowColor: meta.color,
        },
        active && styles.chipActive,
      ]}
      onPress={onPress}
      activeOpacity={0.82}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
    >
      <View
        pointerEvents="none"
        style={[
          styles.patternRing,
          { borderColor: active ? 'rgba(255,255,255,0.18)' : `${meta.color}16` },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.patternDot,
          { backgroundColor: active ? 'rgba(255,255,255,0.34)' : `${meta.color}2B` },
        ]}
      />
      <View style={styles.labelWrap}>
        <View
          style={[
            styles.iconMedallion,
            {
              backgroundColor: active ? 'rgba(255,255,255,0.17)' : `${meta.color}14`,
              borderColor: active ? 'rgba(255,255,255,0.25)' : `${meta.color}24`,
            },
          ]}
        >
          <Ionicons name={meta.icon} size={14} color={foreground} />
        </View>
        <Text style={[styles.label, { color: foreground }]}>
          {label}{count !== undefined ? ` ${count}` : ''}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'center',
    minHeight: 40,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    marginRight: SPACING.sm,
    borderWidth: 1,
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 1,
  },
  labelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 6,
  },
  iconMedallion: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  patternRing: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 8,
    right: -19,
    top: -20,
  },
  patternDot: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 3,
    left: 8,
    bottom: 3,
  },
  chipActive: {
    shadowOpacity: 0.24,
    shadowRadius: 7,
    elevation: 3,
  },
  label: {
    fontWeight: '800',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.35,
    includeFontPadding: false,
  },
})
