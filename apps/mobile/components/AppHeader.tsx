import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { BrandText } from '@/components/BrandText'
import { CITY, COLORS, SPACING, RADIUS } from '@/lib/constants'
import { COLOR, TYPE } from '@/lib/theme'
import { formatBadgeCount } from '@/lib/socialNotifications'

interface Props {
  subtitle?: string
  showBell?: boolean
  notificationCount?: number
  onBellPress?: () => void
  trailing?: React.ReactNode
  centerTitle?: string
}

export function AppHeader({ subtitle, showBell, notificationCount = 0, onBellPress, trailing, centerTitle }: Props) {
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
      {/* Wordmark sits dead-centre; actions float over the right edge so they
          never pull the logo off axis. */}
      <View style={styles.brandBlock}>
        <View style={styles.brandRow}>
          <BrandText size="header" />
          <View style={styles.cityBadge}>
            <Text style={styles.cityText}>{CITY.name}</Text>
          </View>
        </View>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      <View style={styles.actionSlot} pointerEvents="box-none">
        {showBell ? (
          <TouchableOpacity
            style={styles.bellWrap}
            activeOpacity={0.7}
            onPress={onBellPress}
            accessibilityRole="button"
            accessibilityLabel={notificationCount > 0 ? `Notifications, ${notificationCount} unread` : 'Notifications'}
          >
            <Ionicons name="notifications-outline" size={22} color={COLORS.textPrimary} />
            {notificationCount > 0 && (
              <View style={styles.bellDot}>
                <Text style={styles.bellCount}>{formatBadgeCount(notificationCount)}</Text>
              </View>
            )}
          </TouchableOpacity>
        ) : trailing ? (
          <View>{trailing}</View>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  brandBlock: { flex: 1, alignItems: 'center' },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  actionSlot: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  cityBadge: {
    backgroundColor: COLORS.highlight,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  cityText: { color: COLOR.white, fontSize: TYPE.micro.fontSize, fontWeight: '700' },
  subtitle: { color: COLORS.textMuted, fontSize: TYPE.micro.fontSize, marginTop: 2 },
  bellWrap: { position: 'relative', padding: SPACING.xs },
  bellDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    backgroundColor: COLORS.highlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellCount: { color: COLOR.white, fontSize: TYPE.micro.fontSize, fontWeight: '700' },
  centerTitle: {
    fontSize: TYPE.small.fontSize,
    fontWeight: '900',
    color: COLOR.white,
    letterSpacing: 2,
  },
  menuPlaceholder: { width: 32, alignItems: 'flex-end' },
})
