/**
 * Placeholder sprites until the commissioned Lottie set lands.
 * A gentle bob plays three times, then holds. One sprite per screen animates;
 * reduce motion keeps every sprite still. Decorative unless `label` is set.
 */
import { useEffect, useId, useState } from 'react'
import { AccessibilityInfo } from 'react-native'
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import Svg, { Circle, Ellipse, Path } from 'react-native-svg'
import { COLOR } from '@/lib/theme'

export type SpriteName = 'seal' | 'gull' | 'cloud'

/** The first mounted sprite owns the screen's one idle loop. */
let animatedOwner: string | null = null

export function Sprite({
  name,
  size = 72,
  label,
}: {
  name: SpriteName
  size?: number
  label?: string
}) {
  const ownerId = useId()
  const bob = useSharedValue(0)
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    let alive = true
    AccessibilityInfo.isReduceMotionEnabled().then((on) => {
      if (alive) setReduceMotion(on)
    })
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion)
    return () => {
      alive = false
      sub.remove()
    }
  }, [])

  useEffect(() => {
    if (reduceMotion) return
    if (animatedOwner && animatedOwner !== ownerId) return
    animatedOwner = ownerId
    bob.value = withRepeat(
      withSequence(withTiming(-4, { duration: 1200 }), withTiming(0, { duration: 1200 })),
      3,
      false,
    )
    return () => {
      if (animatedOwner === ownerId) animatedOwner = null
      cancelAnimation(bob)
      bob.value = 0
    }
  }, [bob, ownerId, reduceMotion])

  const motion = useAnimatedStyle(() => ({
    transform: [{ translateY: bob.value }],
  }))

  const decorative = !label

  return (
    <Animated.View
      style={[{ width: size, height: size }, motion]}
      accessible={!decorative}
      accessibilityRole={decorative ? undefined : 'image'}
      accessibilityLabel={label}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'auto'}
    >
      <Svg width={size} height={size} viewBox="0 0 72 72">
        {name === 'seal' ? <Seal /> : name === 'gull' ? <Gull /> : <Cloud />}
      </Svg>
    </Animated.View>
  )
}

function Seal() {
  return (
    <>
      <Ellipse cx={34} cy={46} rx={24} ry={14} fill={COLOR.inkSoft} />
      <Circle cx={52} cy={34} r={11} fill={COLOR.inkSoft} />
      <Circle cx={56} cy={32} r={1.6} fill={COLOR.ink} />
      <Ellipse cx={16} cy={52} rx={7} ry={3.5} fill={COLOR.inkFaint} />
    </>
  )
}

function Gull() {
  return (
    <>
      <Ellipse cx={36} cy={40} rx={16} ry={10} fill={COLOR.white} stroke={COLOR.ink} strokeWidth={1.5} />
      <Path
        d="M20 38 C28 28 36 30 40 36"
        fill="none"
        stroke={COLOR.ink}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Path
        d="M40 36 C52 24 64 30 62 38"
        fill="none"
        stroke={COLOR.ink}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Circle cx={46} cy={38} r={1.4} fill={COLOR.ink} />
      <Path d="M50 40 L58 42 L50 44 Z" fill={COLOR.ink} />
    </>
  )
}

function Cloud() {
  return (
    <>
      <Circle cx={28} cy={40} r={12} fill={COLOR.white} />
      <Circle cx={42} cy={34} r={14} fill={COLOR.white} />
      <Circle cx={52} cy={42} r={10} fill={COLOR.white} />
      <Ellipse cx={40} cy={46} rx={22} ry={10} fill={COLOR.white} />
      <Path
        d="M34 52 L32 62 M40 54 L40 64 M46 52 L48 60"
        stroke={COLOR.inkFaint}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </>
  )
}

export default Sprite
