import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'
import { COLORS, RADIUS, SPACING } from '@/lib/constants'
import { RARITY_META, type BadgeSpec } from '@/lib/badgeCatalog'
import { BadgeVisual } from './BadgeVisual'

/**
 * Pressable badge tile. Press-in tips the tile in 3D toward the thumb;
 * release springs it back and opens the showcase.
 */

interface Props {
  spec: BadgeSpec
  earned: boolean
  artSize: number
  /** Rendered inside the legendary night band */
  onDark?: boolean
  compact?: boolean
  onOpen: (spec: BadgeSpec) => void
}

const SPRING = { damping: 14, stiffness: 260, mass: 0.6 }

export function BadgeTile({ spec, earned, artSize, onDark, compact, onOpen }: Props) {
  const press = useSharedValue(0)

  const tilt = useAnimatedStyle(() => ({
    transform: [
      { perspective: 600 },
      { rotateX: `${press.value * -7}deg` },
      { rotateY: `${press.value * 6}deg` },
      { scale: 1 - press.value * 0.05 },
    ],
  }))

  const displayName = spec.secret && !earned ? '???' : spec.name
  const meta = RARITY_META[spec.rarity]

  return (
    <Pressable
      onPressIn={() => {
        press.value = withSpring(1, SPRING)
      }}
      onPressOut={() => {
        press.value = withSpring(0, SPRING)
      }}
      onPress={() => onOpen(spec)}
      accessibilityRole="button"
      accessibilityLabel={`${displayName}, ${meta.label.toLowerCase()} badge, ${earned ? 'earned' : 'locked'}`}
      style={{ flex: 1 }}
    >
      <Animated.View
        style={[
          styles.tile,
          compact && styles.tileCompact,
          onDark && styles.tileDark,
          tilt,
        ]}
      >
        <View style={styles.artWrap}>
          <BadgeVisual spec={spec} size={artSize} earned={earned} />
          {!earned && (
            <View style={[styles.lockChip, onDark && styles.lockChipDark]}>
              <Ionicons
                name="lock-closed"
                size={compact ? 9 : 11}
                color={onDark ? 'rgba(255,255,255,0.85)' : COLORS.textMuted}
              />
            </View>
          )}
        </View>
        <Text
          style={[
            styles.name,
            compact && styles.nameCompact,
            onDark && styles.nameDark,
            !earned && !onDark && styles.nameLocked,
          ]}
          numberOfLines={2}
        >
          {displayName}
        </Text>
        {!compact && (
          <View style={styles.rarityRow}>
            <View style={[styles.rarityDot, { backgroundColor: earned ? meta.color : onDark ? 'rgba(255,255,255,0.35)' : 'rgba(92,122,153,0.4)' }]} />
            <Text style={[styles.rarityLabel, onDark && styles.rarityLabelDark]}>
              {earned ? meta.label : 'LOCKED'}
            </Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.sm,
    alignItems: 'center',
    shadowColor: '#1A2B4A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  tileCompact: {
    paddingVertical: SPACING.md,
  },
  tileDark: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    shadowOpacity: 0,
    elevation: 0,
  },
  artWrap: { position: 'relative' },
  lockChip: {
    position: 'absolute',
    right: -4,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: 'rgba(92,122,153,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockChipDark: {
    backgroundColor: '#22304F',
    borderColor: 'rgba(255,255,255,0.2)',
  },
  name: {
    marginTop: SPACING.md,
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 16,
  },
  nameCompact: { fontSize: 11, lineHeight: 14, marginTop: SPACING.sm },
  nameDark: { color: '#F4F8FF' },
  nameLocked: { color: COLORS.textMuted },
  rarityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
  },
  rarityDot: { width: 5, height: 5, borderRadius: 3 },
  rarityLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 1,
    color: COLORS.textMuted,
  },
  rarityLabelDark: { color: 'rgba(244,248,255,0.55)' },
})
