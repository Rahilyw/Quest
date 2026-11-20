import { View, Text, StyleSheet, ViewStyle } from 'react-native'
import { COLORS, SPACING } from '@/lib/constants'
import { TYPE } from '@/lib/theme'

interface SectionHeaderProps {
  title: string
  trailing?: string
  style?: ViewStyle
}

export function SectionHeader({ title, trailing, style }: SectionHeaderProps) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>{title}</Text>
      {trailing !== undefined && <Text style={styles.trailing}>{trailing}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
  },
  title: { color: COLORS.textPrimary, fontSize: TYPE.heading.fontSize, fontWeight: '700' },
  trailing: { color: COLORS.textMuted, fontSize: TYPE.small.fontSize, fontWeight: '600' },
})
