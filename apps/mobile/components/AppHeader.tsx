import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { APP_NAME, CITY, COLORS, SPACING, RADIUS } from '@/lib/constants'

interface Props {
  subtitle?: string
  showBell?: boolean
  trailing?: React.ReactNode
  centerTitle?: string
}

export function AppHeader({ subtitle, showBell, trailing, centerTitle }: Props) {
  if (centerTitle) {
    return (
      <View style={styles.row}>
        <View style={styles.menuPlaceholder} />
        <Text style={styles.centerTitle}>{centerTitle}</Text>
        <View style={styles.menuPlaceholder}>{trailing}</View>
      </View>
    )
  }

  return (
    <View style={styles.row}>
      <View style={styles.brandBlock}>
        <View style={styles.brandRow}>
          <Text style={styles.brand}>{APP_NAME}</Text>
          <View style={styles.cityBadge}>
            <Text style={styles.cityText}>{CITY.name}</Text>
          </View>
        </View>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {showBell ? (
        <TouchableOpacity style={styles.bellWrap} activeOpacity={0.7}>
          <Ionicons name="notifications-outline" size={22} color={COLORS.textPrimary} />
          <View style={styles.bellDot}>
            <Text style={styles.bellCount}>3</Text>
          </View>
        </TouchableOpacity>
      ) : trailing ? (
        <View>{trailing}</View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  brandBlock: { flex: 1 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  brand: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: -0.5,
  },
  cityBadge: {
    backgroundColor: COLORS.highlight,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  cityText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  subtitle: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  bellWrap: { position: 'relative', padding: SPACING.xs },
  bellDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.highlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellCount: { color: '#FFFFFF', fontSize: 9, fontWeight: '700' },
  centerTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  menuPlaceholder: { width: 32, alignItems: 'flex-end' },
})
