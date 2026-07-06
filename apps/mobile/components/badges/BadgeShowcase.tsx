import { useEffect, type ComponentType } from 'react'
import { Modal, Pressable, StyleSheet, Text, View, type ViewProps } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler'

// gesture-handler's types resolve the monorepo's hoisted @types/react@18,
// which drops `children` from PropsWithChildren under this project's React 19
const GestureRoot = GestureHandlerRootView as unknown as ComponentType<ViewProps>
import Animated, {
  clamp,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { COLORS, FONT_BRAND, RADIUS, SPACING } from '@/lib/constants'
import { RARITY_META, type BadgeSpec } from '@/lib/badgeCatalog'
import { BadgeVisual } from './BadgeVisual'
import { BADGE_ART } from './art'

/**
 * Full-screen badge showcase. Drag anywhere on the medal to tilt it in 3D
 * (it springs back like it's on a gimbal). Locked badges keep their secrets:
 * shadowed art, a nudge instead of the description.
 */

interface Props {
  spec: BadgeSpec | null
  earned: boolean
  earnedAt?: string | null
  onClose: () => void
}

const ART_SIZE = 210

function formatEarnedDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })
}

function Showpiece({ spec, earned }: { spec: BadgeSpec; earned: boolean }) {
  const rotX = useSharedValue(0)
  const rotY = useSharedValue(0)
  const intro = useSharedValue(0)
  const shine = useSharedValue(0)
  const reduced = useReducedMotion()

  useEffect(() => {
    intro.value = withSpring(1, { damping: 16, stiffness: 160 })
    if (!reduced && earned) {
      shine.value = withRepeat(
        withSequence(
          withDelay(600, withTiming(1, { duration: 1100, easing: Easing.out(Easing.quad) })),
          withTiming(0, { duration: 1 }),
          withTiming(0, { duration: 2400 })
        ),
        -1,
        false
      )
    }
  }, [reduced, earned])

  const pan = Gesture.Pan()
    .onChange((e) => {
      rotY.value = clamp(rotY.value + e.changeX * 0.28, -26, 26)
      rotX.value = clamp(rotX.value - e.changeY * 0.28, -26, 26)
    })
    .onEnd(() => {
      rotX.value = withSpring(0, { damping: 12, stiffness: 120 })
      rotY.value = withSpring(0, { damping: 12, stiffness: 120 })
    })

  const artStyle = useAnimatedStyle(() => ({
    opacity: intro.value,
    transform: [
      { perspective: 700 },
      { scale: 0.7 + intro.value * 0.3 },
      { rotateX: `${rotX.value}deg` },
      { rotateY: `${rotY.value}deg` },
    ],
  }))

  const shineStyle = useAnimatedStyle(() => ({
    opacity: shine.value > 0 && shine.value < 1 ? 0.28 : 0,
    transform: [
      { translateX: -ART_SIZE + shine.value * ART_SIZE * 2 },
      { rotate: '18deg' },
    ],
  }))

  const shape = BADGE_ART[spec.key]?.shape ?? 'round'

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={artStyle}>
        <View
          style={{
            width: ART_SIZE,
            height: ART_SIZE,
            borderRadius: shape === 'round' ? ART_SIZE / 2 : ART_SIZE * 0.14,
            overflow: 'hidden',
          }}
        >
          <BadgeVisual spec={spec} size={ART_SIZE} earned={earned} />
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                top: -ART_SIZE * 0.25,
                width: ART_SIZE * 0.36,
                height: ART_SIZE * 1.5,
                backgroundColor: '#FFFFFF',
              },
              shineStyle,
            ]}
          />
        </View>
      </Animated.View>
    </GestureDetector>
  )
}

export function BadgeShowcase({ spec, earned, earnedAt, onClose }: Props) {
  if (!spec) return null

  const meta = RARITY_META[spec.rarity]
  const isSecret = spec.secret && !earned
  const displayName = isSecret ? '???' : spec.name

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <GestureRoot style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close badge details" />

        <View style={styles.content} pointerEvents="box-none">
          <View style={[styles.rarityPill, { borderColor: meta.color }]}>
            <Text style={[styles.rarityText, { color: meta.color }]}>
              {meta.label}
            </Text>
          </View>

          <Showpiece spec={spec} earned={earned} />

          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.blurb}>
            {isSecret
              ? spec.lockedHint
              : earned
                ? spec.description
                : spec.lockedHint}
          </Text>

          {!isSecret && (
            <View style={styles.unlockChip}>
              <Ionicons
                name={earned ? 'checkmark-circle' : 'compass-outline'}
                size={14}
                color={earned ? COLORS.success : 'rgba(255,255,255,0.6)'}
              />
              <Text style={styles.unlockText}>{spec.unlock}</Text>
            </View>
          )}

          <Text style={styles.status}>
            {earned && earnedAt
              ? `Unearthed ${formatEarnedDate(earnedAt)}`
              : earned
                ? 'Unearthed'
                : 'STILL OUT THERE'}
          </Text>

          <Text style={styles.dragHint}>drag the badge</Text>
        </View>

        <Pressable
          onPress={onClose}
          style={styles.closeBtn}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={22} color="rgba(255,255,255,0.8)" />
        </Pressable>
      </GestureRoot>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgba(9,15,32,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xxl,
    gap: SPACING.md,
  },
  rarityPill: {
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    marginBottom: SPACING.sm,
  },
  rarityText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2.5,
  },
  name: {
    fontFamily: FONT_BRAND,
    fontSize: 30,
    lineHeight: 36,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: SPACING.lg,
    maxWidth: 320,
  },
  blurb: {
    color: 'rgba(226,236,255,0.75)',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    maxWidth: 280,
  },
  unlockChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
  },
  unlockText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '700',
  },
  status: {
    marginTop: SPACING.xs,
    color: 'rgba(251,191,36,0.9)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  dragHint: {
    marginTop: SPACING.lg,
    color: 'rgba(226,236,255,0.3)',
    fontSize: 11,
  },
  closeBtn: {
    position: 'absolute',
    top: 56,
    right: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
