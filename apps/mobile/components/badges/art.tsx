import { useEffect, type ComponentType } from 'react'
import { View, type ViewStyle } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Line,
  Path,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg'
import { Medal } from './medal'
import { PixelSprite } from './pixel'

/**
 * One component per badge. Three families:
 *  - medal:    faux-3D metal (Medal chassis + engraved emblem)
 *  - animated: layered scene with reanimated idle motion
 *  - pixel:    12×12 sprites, some with animated layers
 * All draw in a square of `size` px. Idle motion respects reduced-motion.
 */

export interface ArtProps {
  size: number
}

const layer = (size: number): ViewStyle => ({
  position: 'absolute',
  left: 0,
  top: 0,
  width: size,
  height: size,
})

// ─── Shared idle-motion hooks ─────────────────────────────────────────────────

/** 0→1→0 forever */
function useYoyo(duration: number, delay = 0) {
  const v = useSharedValue(0)
  const reduced = useReducedMotion()
  useEffect(() => {
    if (reduced) return
    v.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.quad) }), -1, true)
    )
  }, [reduced])
  return v
}

/** 0→1 forever (sawtooth), for full rotations */
function useSpin(duration: number) {
  const v = useSharedValue(0)
  const reduced = useReducedMotion()
  useEffect(() => {
    if (reduced) return
    v.value = withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false)
  }, [reduced])
  return v
}

/** Short pulse to 1 then back to 0, then a long rest. */
function usePulse(pulseMs: number, restMs: number, delay = 0) {
  const v = useSharedValue(0)
  const reduced = useReducedMotion()
  useEffect(() => {
    if (reduced) return
    v.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: pulseMs, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: pulseMs * 1.4, easing: Easing.in(Easing.quad) }),
          withTiming(0, { duration: restMs })
        ),
        -1,
        false
      )
    )
  }, [reduced])
  return v
}

// ─── MEDALS ───────────────────────────────────────────────────────────────────

/** First Quest — bronze compass-point star */
function ArtFirstQuest({ size }: ArtProps) {
  return (
    <Medal size={size} palette="bronze">
      <Polygon
        points="50,26 55.5,44.5 74,50 55.5,55.5 50,74 44.5,55.5 26,50 44.5,44.5"
        fill="#FFEAD2"
      />
      <Polygon
        points="50,26 55.5,44.5 74,50 55.5,55.5 50,74"
        fill="rgba(90,42,12,0.28)"
      />
      <Circle cx="50" cy="50" r="3.6" fill="#7C3F16" />
      <Circle cx="49" cy="49" r="1.1" fill="#FFEAD2" />
    </Medal>
  )
}

/** Local Hero — gold star wrapped in laurels */
function ArtLocalHero({ size }: ArtProps) {
  const leaves: Array<[number, number, number]> = [
    [27, 62, -55], [23, 52, -80], [25, 42, -105], [30, 34, -130],
    [73, 62, 55], [77, 52, 80], [75, 42, 105], [70, 34, 130],
  ]
  return (
    <Medal size={size} palette="gold">
      <Path d="M32 68 Q22 52 32 36" stroke="#8C5A08" strokeWidth="2" fill="none" />
      <Path d="M68 68 Q78 52 68 36" stroke="#8C5A08" strokeWidth="2" fill="none" />
      {leaves.map(([cx, cy, rot], i) => (
        <Ellipse
          key={i}
          cx={cx}
          cy={cy}
          rx="4.6"
          ry="2"
          fill="#8C5A08"
          transform={`rotate(${rot} ${cx} ${cy})`}
        />
      ))}
      <Polygon
        points="50,28 54.7,41.5 69,41.8 57.6,50.5 61.8,64.2 50,56 38.2,64.2 42.4,50.5 31,41.8 45.3,41.5"
        fill="#FFF6DE"
      />
      <Path
        d="M50 28 L54.7 41.5 L69 41.8 L57.6 50.5 L61.8 64.2 L50 56 Z"
        fill="rgba(140,90,8,0.34)"
      />
    </Medal>
  )
}

/** Top 10 — platinum-blue medal, gold star over the podium */
function ArtTop10({ size }: ArtProps) {
  return (
    <Medal size={size} palette="sapphire">
      <Rect x="30" y="64" width="13" height="12" rx="1.5" fill="#CFE3F2" />
      <Rect x="43.5" y="58" width="13" height="18" rx="1.5" fill="#F2F8FD" />
      <Rect x="57" y="68" width="13" height="8" rx="1.5" fill="#AFC9DE" />
      <Polygon
        points="50,26 53.3,35.5 63.3,35.7 55.3,41.7 58.2,51.3 50,45.6 41.8,51.3 44.7,41.7 36.7,35.7 46.7,35.5"
        fill="#FDE68A"
      />
      <Path
        d="M50 26 L53.3 35.5 L63.3 35.7 L55.3 41.7 L58.2 51.3 L50 45.6 Z"
        fill="rgba(180,110,10,0.35)"
      />
    </Medal>
  )
}

/** Season Veteran — gold service chevrons and twin stars */
function ArtSeasonVeteran({ size }: ArtProps) {
  const chevron = (y: number, o: number) => (
    <Path
      key={y}
      d={`M36 ${y} L50 ${y + 9} L64 ${y} L64 ${y + 6} L50 ${y + 15} L36 ${y + 6} Z`}
      fill="#FFF3D0"
      stroke="#8C5A08"
      strokeWidth="1.2"
      opacity={o}
    />
  )
  return (
    <Medal size={size} palette="gold">
      <Polygon points="41,26 43.4,32 41,38 38.6,32" fill="#8C5A08" />
      <Polygon points="59,26 61.4,32 59,38 56.6,32" fill="#8C5A08" />
      {chevron(42, 1)}
      {chevron(53, 0.85)}
      {chevron(64, 0.7)}
    </Medal>
  )
}

/** Foodie — ember medal, crossed cutlery over a plate */
function ArtFoodie({ size }: ArtProps) {
  return (
    <Medal size={size} palette="ember">
      {/* fork */}
      <Rect x="35.4" y="30" width="2.6" height="11" rx="1.3" fill="#FFF7ED" />
      <Rect x="39.7" y="30" width="2.6" height="11" rx="1.3" fill="#FFF7ED" />
      <Rect x="44" y="30" width="2.6" height="11" rx="1.3" fill="#FFF7ED" />
      <Path d="M35.4 39 L46.6 39 L46.6 43 Q41 47 41 47 L41 47 Q35.4 43 35.4 43 Z" fill="#FFF7ED" />
      <Rect x="39.3" y="44" width="3.4" height="26" rx="1.7" fill="#FFF7ED" />
      {/* knife */}
      <Path d="M58.6 29 Q64.8 39 61.5 51 L56.9 51 Q56 38 58.6 29 Z" fill="#FFF7ED" />
      <Rect x="57.4" y="51" width="3.4" height="19" rx="1.7" fill="#FFE8CC" />
    </Medal>
  )
}

/** Community Champion — sky medal, little neighbourhood with a heart */
function ArtCommunityChampion({ size }: ArtProps) {
  return (
    <Medal size={size} palette="sky">
      <Rect x="30" y="47" width="14" height="15" fill="#DBEDFB" />
      <Polygon points="28,47 37,38 46,47" fill="#3D7FB8" />
      <Rect x="56" y="49" width="14" height="13" fill="#C9E2F5" />
      <Polygon points="54,49 63,40 72,49" fill="#356F9E" />
      <Rect x="39" y="50" width="22" height="20" fill="#F2F9FF" />
      <Polygon points="36,50 50,37 64,50" fill="#0A5B8C" />
      <Path
        d="M50 57.5 C48 54.5 43.6 55.5 43.6 58.8 C43.6 61.8 50 65.5 50 65.5 C50 65.5 56.4 61.8 56.4 58.8 C56.4 55.5 52 54.5 50 57.5 Z"
        fill="#FF6B35"
      />
      <Rect x="30" y="70" width="40" height="2.4" rx="1.2" fill="rgba(7,73,110,0.5)" />
    </Medal>
  )
}

/** Nature Lover — teal medal, engraved fern frond (very Victoria) */
function ArtNatureLover({ size }: ArtProps) {
  const leaflets: Array<[number, number, number, number]> = [
    [46.2, 66, -38, 6.4], [53.8, 61, 34, 6.2], [45.8, 55.5, -36, 5.8],
    [53.4, 50, 32, 5.2], [46.4, 44.5, -34, 4.6], [52.8, 39.5, 30, 3.8],
    [47.6, 34.5, -32, 3], [51.6, 31, 28, 2.3],
  ]
  return (
    <Medal size={size} palette="teal">
      <Path d="M48 74 Q45 55 51 28" stroke="#0B5E55" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      {leaflets.map(([cx, cy, rot, rx], i) => (
        <Ellipse
          key={i}
          cx={cx}
          cy={cy}
          rx={rx}
          ry="2"
          fill="#0E7A6A"
          transform={`rotate(${rot} ${cx} ${cy})`}
        />
      ))}
    </Medal>
  )
}

/** Fitness Fanatic — silver medal, winged green bolt */
function ArtFitnessFanatic({ size }: ArtProps) {
  return (
    <Medal size={size} palette="silver">
      <Line x1="26" y1="40" x2="35" y2="40" stroke="#64748B" strokeWidth="2.6" strokeLinecap="round" opacity="0.55" />
      <Line x1="22" y1="50" x2="33" y2="50" stroke="#64748B" strokeWidth="2.6" strokeLinecap="round" opacity="0.7" />
      <Line x1="26" y1="60" x2="35" y2="60" stroke="#64748B" strokeWidth="2.6" strokeLinecap="round" opacity="0.55" />
      <Polygon points="58,27 41,55 51,55 46,73 65,44 54,44" fill="#22C55E" />
      <Polygon points="58,27 41,55 51,55 48,66" fill="rgba(255,255,255,0.38)" />
    </Medal>
  )
}

// ─── ANIMATED OBJECTS ─────────────────────────────────────────────────────────

/** Early Bird — sun climbing out of the harbour, rays slowly wheeling */
function ArtEarlyBird({ size }: ArtProps) {
  const spin = useSpin(26000)
  const rays = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value * 360}deg` }],
  }))

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id="dawn" cx="50%" cy="38%" r="75%">
            <Stop offset="0" stopColor="#FFF1C9" />
            <Stop offset="0.6" stopColor="#FFD37D" />
            <Stop offset="1" stopColor="#FF9D5C" />
          </RadialGradient>
        </Defs>
        <Circle cx="50" cy="50" r="46" fill="url(#dawn)" />
        <Circle cx="50" cy="60" r="13" fill="#FFDF6B" />
        <Circle cx="46" cy="56" r="4" fill="rgba(255,255,255,0.55)" />
      </Svg>
      {/* wheeling rays, tucked under the sea layer */}
      <Animated.View style={[layer(size), rays]}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <Line
              key={a}
              x1={50 + 17 * Math.cos((a * Math.PI) / 180)}
              y1={60 + 17 * Math.sin((a * Math.PI) / 180)}
              x2={50 + 25 * Math.cos((a * Math.PI) / 180)}
              y2={60 + 25 * Math.sin((a * Math.PI) / 180)}
              stroke="#FFC94D"
              strokeWidth="3.4"
              strokeLinecap="round"
            />
          ))}
        </Svg>
      </Animated.View>
      <View style={layer(size)} pointerEvents="none">
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Path d="M6.6 62 A46 46 0 0 0 93.4 62 Z" fill="#2E7FB8" />
          <Line x1="36" y1="68" x2="46" y2="68" stroke="rgba(255,255,255,0.5)" strokeWidth="1.6" strokeLinecap="round" />
          <Line x1="54" y1="73" x2="66" y2="73" stroke="rgba(255,255,255,0.35)" strokeWidth="1.6" strokeLinecap="round" />
          <Path d="M28 32 Q31 29 34 32" stroke="#7C4A12" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <Path d="M64 24 Q67 21 70 24" stroke="#7C4A12" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <Circle cx="50" cy="50" r="45" fill="none" stroke="rgba(194,88,28,0.35)" strokeWidth="2" />
        </Svg>
      </View>
    </View>
  )
}

/** Night Owl — moonlit owl that actually blinks */
function ArtNightOwl({ size }: ArtProps) {
  const blink = useSharedValue(0)
  const reduced = useReducedMotion()
  useEffect(() => {
    if (reduced) return
    blink.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 3400 }),
        withTiming(1, { duration: 90 }),
        withTiming(0, { duration: 130 })
      ),
      -1,
      false
    )
  }, [reduced])
  const openStyle = useAnimatedStyle(() => ({ opacity: 1 - blink.value }))
  const shutStyle = useAnimatedStyle(() => ({ opacity: blink.value }))
  const twinkle = useYoyo(2100)
  const starStyle = useAnimatedStyle(() => ({ opacity: 0.3 + twinkle.value * 0.7 }))

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id="night" cx="50%" cy="35%" r="80%">
            <Stop offset="0" stopColor="#27427A" />
            <Stop offset="0.6" stopColor="#16294F" />
            <Stop offset="1" stopColor="#0C1B38" />
          </RadialGradient>
        </Defs>
        <Circle cx="50" cy="50" r="46" fill="url(#night)" />
        <Circle cx="30" cy="26" r="1.1" fill="#E7F0FF" opacity="0.8" />
        <Circle cx="24" cy="42" r="0.9" fill="#E7F0FF" opacity="0.55" />
        <Circle cx="76" cy="46" r="0.9" fill="#E7F0FF" opacity="0.6" />
        {/* crescent moon */}
        <Circle cx="68" cy="27" r="8" fill="#FFE9A8" />
        <Circle cx="64.5" cy="24.5" r="7.2" fill="#16294F" />
        {/* owl */}
        <Polygon points="37,47 42,36 47,46" fill="#5A4130" />
        <Polygon points="63,47 58,36 53,46" fill="#5A4130" />
        <Ellipse cx="50" cy="60" rx="17" ry="16" fill="#6B4F3A" />
        <Ellipse cx="50" cy="67" rx="9" ry="7" fill="#8A6A4E" />
        <Path d="M46 64 L50 67 L54 64" stroke="#6B4F3A" strokeWidth="1.4" fill="none" />
        <Path d="M46 69 L50 72 L54 69" stroke="#6B4F3A" strokeWidth="1.4" fill="none" />
        <Circle cx="43.5" cy="54" r="7" fill="#F1E3C8" />
        <Circle cx="56.5" cy="54" r="7" fill="#F1E3C8" />
        <Polygon points="50,57 47,61.5 53,61.5" fill="#F59E0B" />
      </Svg>
      <Animated.View style={[layer(size), openStyle]} pointerEvents="none">
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Circle cx="43.5" cy="54" r="3.4" fill="#1A120B" />
          <Circle cx="56.5" cy="54" r="3.4" fill="#1A120B" />
          <Circle cx="44.7" cy="52.8" r="1" fill="#FFF7E0" />
          <Circle cx="57.7" cy="52.8" r="1" fill="#FFF7E0" />
        </Svg>
      </Animated.View>
      <Animated.View style={[layer(size), shutStyle]} pointerEvents="none">
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Path d="M40 54.5 Q43.5 56.5 47 54.5" stroke="#1A120B" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <Path d="M53 54.5 Q56.5 56.5 60 54.5" stroke="#1A120B" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </Svg>
      </Animated.View>
      <Animated.View style={[layer(size), starStyle]} pointerEvents="none">
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Path d="M33 20 L34 22.4 L36.4 23.4 L34 24.4 L33 26.8 L32 24.4 L29.6 23.4 L32 22.4 Z" fill="#E7F0FF" />
        </Svg>
      </Animated.View>
    </View>
  )
}

/** Getting Warmed Up — campfire with a live flame and drifting sparks */
function ArtWarmedUp({ size }: ArtProps) {
  const flick = useYoyo(360)
  const flameStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: (size / 100) * 33 },
      { scaleY: 0.96 + flick.value * 0.09 },
      { rotate: `${(flick.value - 0.5) * 3}deg` },
      { translateY: (size / 100) * -33 },
    ],
  }))
  const s1 = usePulse(700, 1600)
  const s2 = usePulse(700, 1600, 900)
  const u = size / 100
  const sparkStyle = (v: typeof s1, x: number) =>
    useAnimatedStyle(() => ({
      opacity: v.value * 0.9,
      transform: [{ translateY: -v.value * 15 * u }],
      left: x * u,
      top: 42 * u,
    }))
  const spark1 = sparkStyle(s1, 44)
  const spark2 = sparkStyle(s2, 57)

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id="hearth" cx="50%" cy="42%" r="78%">
            <Stop offset="0" stopColor="#FFF4D6" />
            <Stop offset="0.62" stopColor="#FFE1B0" />
            <Stop offset="1" stopColor="#F5B971" />
          </RadialGradient>
        </Defs>
        <Circle cx="50" cy="50" r="46" fill="url(#hearth)" />
        <Circle cx="50" cy="50" r="45" fill="none" stroke="rgba(180,83,9,0.3)" strokeWidth="2" />
      </Svg>
      <Animated.View style={[layer(size), flameStyle]} pointerEvents="none">
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Path
            d="M50 30 C58 40 62 48 60 56 C58 63 54 66 50 66 C46 66 42 63 40 56 C38 48 42 40 50 30 Z"
            fill="#FF7A29"
          />
          <Path
            d="M50 38 C55 45 57 50 56 56 C55 61 52 63 50 63 C48 63 45 61 44 56 C43 50 45 45 50 38 Z"
            fill="#FFB03A"
          />
          <Path
            d="M50 47 C53 51 54 54 53 57 C52 60 51 61 50 61 C49 61 48 60 47 57 C46 54 47 51 50 47 Z"
            fill="#FFE58A"
          />
        </Svg>
      </Animated.View>
      <View style={layer(size)} pointerEvents="none">
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <G transform="rotate(16 50 70)">
            <Rect x="37" y="67.5" width="26" height="5" rx="2.5" fill="#8C5A3B" />
          </G>
          <G transform="rotate(-16 50 70)">
            <Rect x="37" y="67.5" width="26" height="5" rx="2.5" fill="#7C4A2E" />
          </G>
          <Circle cx="34" cy="74" r="2.2" fill="#B0906B" />
          <Circle cx="66" cy="74" r="2.2" fill="#B0906B" />
          <Circle cx="42" cy="77" r="1.8" fill="#C4A47E" />
          <Circle cx="58" cy="77" r="1.8" fill="#C4A47E" />
        </Svg>
      </View>
      <Animated.View
        style={[{ position: 'absolute', width: 3.4 * u, height: 3.4 * u, borderRadius: 2 * u, backgroundColor: '#FFB03A' }, spark1]}
        pointerEvents="none"
      />
      <Animated.View
        style={[{ position: 'absolute', width: 2.6 * u, height: 2.6 * u, borderRadius: 2 * u, backgroundColor: '#FF7A29' }, spark2]}
        pointerEvents="none"
      />
    </View>
  )
}

/** Social Butterfly — wings hinged on the body, mid-flap */
function ArtSocialButterfly({ size }: ArtProps) {
  const flap = useYoyo(760)
  const leftWing = useAnimatedStyle(() => ({
    transform: [{ perspective: 420 }, { rotateY: `${8 + flap.value * 44}deg` }],
  }))
  const rightWing = useAnimatedStyle(() => ({
    transform: [{ perspective: 420 }, { rotateY: `${-8 - flap.value * 44}deg` }],
  }))

  const wing = (side: 1 | -1) => {
    const mx = (x: number) => 50 + side * (x - 50)
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Ellipse cx={mx(35)} cy="45" rx="13.5" ry="11.5" fill="#A855F7" />
        <Ellipse cx={mx(38.5)} cy="59" rx="9.5" ry="8.5" fill="#9333EA" />
        <Ellipse cx={mx(33.5)} cy="43.5" rx="5" ry="4" fill="rgba(255,255,255,0.5)" />
        <Ellipse cx={mx(37.5)} cy="58.5" rx="3.4" ry="2.8" fill="rgba(255,255,255,0.4)" />
      </Svg>
    )
  }

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id="meadow" cx="50%" cy="35%" r="80%">
            <Stop offset="0" stopColor="#F6ECFF" />
            <Stop offset="0.6" stopColor="#E4CCFF" />
            <Stop offset="1" stopColor="#C9A2F5" />
          </RadialGradient>
        </Defs>
        <Circle cx="50" cy="50" r="46" fill="url(#meadow)" />
        <Ellipse cx="50" cy="76" rx="15" ry="3" fill="rgba(90,40,140,0.15)" />
      </Svg>
      <Animated.View style={[layer(size), leftWing]} pointerEvents="none">
        {wing(1)}
      </Animated.View>
      <Animated.View style={[layer(size), rightWing]} pointerEvents="none">
        {wing(-1)}
      </Animated.View>
      <View style={layer(size)} pointerEvents="none">
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Ellipse cx="50" cy="53" rx="3.2" ry="14" fill="#4A2545" />
          <Circle cx="50" cy="37" r="4.2" fill="#4A2545" />
          <Path d="M48 34 Q45 28 42 27" stroke="#4A2545" strokeWidth="1.3" fill="none" strokeLinecap="round" />
          <Path d="M52 34 Q55 28 58 27" stroke="#4A2545" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        </Svg>
      </View>
    </View>
  )
}

/** Weekend Warrior — storm bolt that flashes */
function ArtWeekendWarrior({ size }: ArtProps) {
  const flash = usePulse(160, 3400)
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }))

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id="storm" cx="50%" cy="32%" r="82%">
            <Stop offset="0" stopColor="#4C4180" />
            <Stop offset="0.6" stopColor="#332B63" />
            <Stop offset="1" stopColor="#201A47" />
          </RadialGradient>
        </Defs>
        <Circle cx="50" cy="50" r="46" fill="url(#storm)" />
        {/* cloud */}
        <Circle cx="42" cy="24" r="7" fill="rgba(255,255,255,0.18)" />
        <Circle cx="52" cy="21" r="8.5" fill="rgba(255,255,255,0.18)" />
        <Circle cx="61" cy="25" r="6" fill="rgba(255,255,255,0.18)" />
        <Rect x="36" y="24" width="30" height="7" rx="3.5" fill="rgba(255,255,255,0.18)" />
        <Circle cx="27" cy="52" r="1" fill="#CBD5F5" opacity="0.6" />
        <Circle cx="74" cy="38" r="1.1" fill="#CBD5F5" opacity="0.7" />
        <Polygon
          points="56,26 36,56 47,56 42,78 64,44 52,44"
          fill="#FFD84D"
          stroke="#B45309"
          strokeWidth="1"
        />
        <Polygon points="56,26 36,56 44,56 47,44" fill="rgba(255,255,255,0.4)" />
      </Svg>
      <Animated.View style={[layer(size), flashStyle]} pointerEvents="none">
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Circle cx="50" cy="50" r="34" fill="rgba(255,240,180,0.30)" />
          <Polygon points="56,26 36,56 47,56 42,78 64,44 52,44" fill="#FFFBEB" />
        </Svg>
      </Animated.View>
    </View>
  )
}

/** Tourist In Your Own Town — retro camera, flash goes off */
function ArtTourist({ size }: ArtProps) {
  const flash = usePulse(240, 3800)
  const u = size / 100
  const flashStyle = useAnimatedStyle(() => ({
    opacity: flash.value * 0.9,
    transform: [{ scale: 0.3 + flash.value * 1.5 }],
  }))
  const spark = usePulse(300, 3800, 240)
  const sparkStyle = useAnimatedStyle(() => ({ opacity: spark.value }))

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id="postcard" cx="50%" cy="35%" r="80%">
            <Stop offset="0" stopColor="#FFF9E8" />
            <Stop offset="0.6" stopColor="#FFE9BD" />
            <Stop offset="1" stopColor="#FBCB7E" />
          </RadialGradient>
        </Defs>
        <Circle cx="50" cy="50" r="46" fill="url(#postcard)" />
        <Circle cx="50" cy="50" r="45" fill="none" stroke="rgba(180,120,30,0.3)" strokeWidth="2" />
        {/* camera */}
        <Rect x="28" y="40" width="44" height="28" rx="6" fill="#2F3B52" />
        <Rect x="40" y="34" width="14" height="8" rx="2" fill="#2F3B52" />
        <Rect x="60" y="36" width="8" height="4.5" rx="2" fill="#FF6B35" />
        <Rect x="28" y="46" width="44" height="4" fill="#243044" />
        <Circle cx="46" cy="54" r="11" fill="#1D2536" stroke="#C8D2E4" strokeWidth="1.6" />
        <Circle cx="46" cy="54" r="7" fill="#3D6FA8" />
        <Circle cx="43.5" cy="51.5" r="2.1" fill="rgba(255,255,255,0.85)" />
        <Rect x="62" y="47" width="6.5" height="5.5" rx="1" fill="#4A5A78" />
      </Svg>
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: 46 * u - 16 * u,
            top: 54 * u - 16 * u,
            width: 32 * u,
            height: 32 * u,
            borderRadius: 16 * u,
            backgroundColor: '#FFFFFF',
          },
          flashStyle,
        ]}
        pointerEvents="none"
      />
      <Animated.View style={[layer(size), sparkStyle]} pointerEvents="none">
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Path d="M70 26 L71.4 29.6 L75 31 L71.4 32.4 L70 36 L68.6 32.4 L65 31 L68.6 29.6 Z" fill="#FBBF24" />
        </Svg>
      </Animated.View>
    </View>
  )
}

/** Explorer — compass medal, needle hunting for north */
function ArtExplorer({ size }: ArtProps) {
  const swing = useYoyo(2800)
  const needleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-24 + swing.value * 48}deg` }],
  }))

  return (
    <View style={{ width: size, height: size }}>
      <Medal size={size} palette="sky">
        <Circle cx="50" cy="50" r="26" fill="none" stroke="rgba(3,105,161,0.5)" strokeWidth="1.5" />
        <Line x1="50" y1="24" x2="50" y2="29" stroke="#075985" strokeWidth="2.2" strokeLinecap="round" />
        <Line x1="50" y1="71" x2="50" y2="76" stroke="#075985" strokeWidth="2.2" strokeLinecap="round" />
        <Line x1="24" y1="50" x2="29" y2="50" stroke="#075985" strokeWidth="2.2" strokeLinecap="round" />
        <Line x1="71" y1="50" x2="76" y2="50" stroke="#075985" strokeWidth="2.2" strokeLinecap="round" />
        <Polygon
          points="50,31 53.5,46.5 69,50 53.5,53.5 50,69 46.5,53.5 31,50 46.5,46.5"
          fill="rgba(255,255,255,0.6)"
        />
      </Medal>
      <Animated.View style={[layer(size), needleStyle]} pointerEvents="none">
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Polygon points="50,30.5 53.6,50 46.4,50" fill="#EF4444" />
          <Polygon points="50,69.5 53.6,50 46.4,50" fill="#F8FAFC" />
          <Circle cx="50" cy="50" r="3.6" fill="#0C4A6E" />
          <Circle cx="49" cy="49" r="1.1" fill="#BAE6FD" />
        </Svg>
      </Animated.View>
    </View>
  )
}

/** It's Over 9000! — a power core you shouldn't stand near */
function ArtOver9000({ size }: ArtProps) {
  const u = size / 100
  const ringA = useYoyo(1700)
  const ringB = useYoyo(1700, 850)
  const throb = useYoyo(900)

  const ring = (v: typeof ringA, color: string) =>
    useAnimatedStyle(() => ({
      opacity: (1 - v.value) * 0.75,
      transform: [{ scale: 0.55 + v.value * 0.65 }],
    }))
  const ringAStyle = ring(ringA, '#FBBF24')
  const ringBStyle = ring(ringB, '#FF8A50')
  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + throb.value * 0.06 }],
  }))

  const ringBase = (color: string): ViewStyle => ({
    position: 'absolute',
    left: 50 * u - 26 * u,
    top: 52 * u - 26 * u,
    width: 52 * u,
    height: 52 * u,
    borderRadius: 26 * u,
    borderWidth: Math.max(2, 2.6 * u),
    borderColor: color,
  })

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id="void" cx="50%" cy="40%" r="80%">
            <Stop offset="0" stopColor="#3B2E68" />
            <Stop offset="0.6" stopColor="#251C49" />
            <Stop offset="1" stopColor="#161033" />
          </RadialGradient>
        </Defs>
        <Circle cx="50" cy="50" r="46" fill="url(#void)" />
        {/* rising energy strokes + floating debris */}
        <Line x1="30" y1="34" x2="30" y2="26" stroke="rgba(255,214,102,0.55)" strokeWidth="2" strokeLinecap="round" />
        <Line x1="70" y1="38" x2="70" y2="29" stroke="rgba(255,214,102,0.45)" strokeWidth="2" strokeLinecap="round" />
        <Line x1="50" y1="26" x2="50" y2="18" stroke="rgba(255,214,102,0.55)" strokeWidth="2" strokeLinecap="round" />
        <Polygon points="26,64 30,66 27,69" fill="#4C3D80" />
        <Polygon points="72,60 76,63 72,65" fill="#4C3D80" />
        <Polygon points="64,74 68,76 65,79" fill="#42356F" />
      </Svg>
      <Animated.View style={[ringBase('#FBBF24'), ringAStyle]} pointerEvents="none" />
      <Animated.View style={[ringBase('#FF8A50'), ringBStyle]} pointerEvents="none" />
      <Animated.View style={[layer(size), orbStyle]} pointerEvents="none">
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Defs>
            <RadialGradient id="core" cx="42%" cy="38%" r="80%">
              <Stop offset="0" stopColor="#FFF7CF" />
              <Stop offset="0.55" stopColor="#FFD34D" />
              <Stop offset="1" stopColor="#F59E0B" />
            </RadialGradient>
          </Defs>
          <Circle cx="50" cy="52" r="15" fill="url(#core)" />
          <Circle cx="45.5" cy="47" r="3.4" fill="rgba(255,255,255,0.8)" />
        </Svg>
      </Animated.View>
    </View>
  )
}

// ─── PIXEL ART ────────────────────────────────────────────────────────────────

const GRASS_GRID = [
  '............',
  '......HHH...',
  '......HHHH..',
  '.......HH...',
  '.......H....',
  '............',
  '..G..F.G..G.',
  '.GG.G..GG.G.',
  'GGGGGGGGGGGG',
  'GGgGGgGGgGGG',
  'gggggggggggg',
  'dddddddddddd',
]
const GRASS_PALETTE = {
  H: '#F6C9A0',
  G: '#4ADE80',
  g: '#22C55E',
  d: '#15803D',
  F: '#FBBF24',
}

/** Touch Grass — a hand, descending upon actual grass */
function ArtTouchGrass({ size }: ArtProps) {
  return <PixelSprite grid={GRASS_GRID} palette={GRASS_PALETTE} size={size} />
}

const SHOE_GRID = [
  '............',
  '............',
  '........RR..',
  '.......RRRR.',
  '......RRRRR.',
  '.....RRRWWR.',
  '....RRRWWRR.',
  '....RWWWWRR.',
  '....WWWWWWW.',
  '....CCCCCCC.',
  '....CCCCCCC.',
  '............',
]
const SHOE_PALETTE = { R: '#EF4444', W: '#FFFFFF', C: '#CBD5E1' }

const SPEED_GRID = [
  '............',
  '............',
  '............',
  '............',
  's..s........',
  '.ss.........',
  's..s........',
  '.ss.........',
  's..s........',
  '............',
  '............',
  '............',
]
const SPEED_PALETTE = { s: '#38BDF8' }

/** Gotta Go Fast — a certain red sneaker at speed */
function ArtGottaGoFast({ size }: ArtProps) {
  const dash = useYoyo(240)
  const u = size / 100
  const dashStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (dash.value - 0.5) * 5 * u }],
  }))
  return (
    <View style={{ width: size, height: size }}>
      <PixelSprite grid={SHOE_GRID} palette={SHOE_PALETTE} size={size} />
      <Animated.View style={[layer(size), dashStyle]} pointerEvents="none">
        <PixelSprite grid={SPEED_GRID} palette={SPEED_PALETTE} size={size} />
      </Animated.View>
    </View>
  )
}

const SHADES_GRID = [
  '............',
  '............',
  '............',
  '............',
  'KKKKKKKKKKKK',
  '.KKKK..KKKK.',
  '.KWKK..KWKK.',
  '..KK....KK..',
  '............',
  '............',
  '............',
  '............',
]
const SHADES_PALETTE = { K: '#0F172A', W: '#64748B' }

const SPARKLE_GRID = [
  '..........S.',
  '.........SSS',
  '..........S.',
  '............',
  '............',
  '............',
  '............',
  '............',
  '............',
  '............',
  '............',
  '............',
]
const SPARKLE_PALETTE = { S: '#FBBF24' }

/** Main Character — the glasses descend. Deal with it. */
function ArtMainCharacter({ size }: ArtProps) {
  const glint = usePulse(260, 2600)
  const glintStyle = useAnimatedStyle(() => ({ opacity: glint.value }))
  return (
    <View style={{ width: size, height: size }}>
      <PixelSprite grid={SHADES_GRID} palette={SHADES_PALETTE} size={size} />
      <Animated.View style={[layer(size), glintStyle]} pointerEvents="none">
        <PixelSprite grid={SPARKLE_GRID} palette={SPARKLE_PALETTE} size={size} />
      </Animated.View>
    </View>
  )
}

const VOLCANO_GRID = [
  '............',
  '............',
  '............',
  '....MMMM....',
  '...MMlMMM...',
  '...MMMlMM...',
  '..MMmMlMMM..',
  '..MMMMMMMM..',
  '.MMMMmmMMMM.',
  'MMMMMMMMMMMM',
  'dddddddddddd',
  '............',
]
const VOLCANO_PALETTE = { M: '#334155', m: '#1E293B', l: '#F97316', d: '#0F172A' }

const EMBER_GRID = [
  '............',
  '.....LL.....',
  '....LLLL....',
  '...LLLLLL...',
  '............',
  '............',
  '............',
  '............',
  '............',
  '............',
  '............',
  '............',
]
const EMBER_PALETTE = { L: '#FB923C' }

/** One Does Not Simply — a very ominous pixel mountain */
function ArtOneDoesNotSimply({ size }: ArtProps) {
  const glow = useYoyo(1600)
  const glowStyle = useAnimatedStyle(() => ({ opacity: 0.35 + glow.value * 0.65 }))
  return (
    <View style={{ width: size, height: size }}>
      <PixelSprite grid={VOLCANO_GRID} palette={VOLCANO_PALETTE} size={size} />
      <Animated.View style={[layer(size), glowStyle]} pointerEvents="none">
        <PixelSprite grid={EMBER_GRID} palette={EMBER_PALETTE} size={size} />
      </Animated.View>
    </View>
  )
}

// ─── REGISTRY ─────────────────────────────────────────────────────────────────

export type BadgeShape = 'round' | 'square'

export const BADGE_ART: Record<string, { Component: ComponentType<ArtProps>; shape: BadgeShape }> = {
  'first-quest': { Component: ArtFirstQuest, shape: 'round' },
  'local-hero': { Component: ArtLocalHero, shape: 'round' },
  'top-10': { Component: ArtTop10, shape: 'round' },
  'season-veteran': { Component: ArtSeasonVeteran, shape: 'round' },
  foodie: { Component: ArtFoodie, shape: 'round' },
  'community-champion': { Component: ArtCommunityChampion, shape: 'round' },
  'nature-lover': { Component: ArtNatureLover, shape: 'round' },
  'fitness-fanatic': { Component: ArtFitnessFanatic, shape: 'round' },
  'early-bird': { Component: ArtEarlyBird, shape: 'round' },
  'night-owl': { Component: ArtNightOwl, shape: 'round' },
  'warmed-up': { Component: ArtWarmedUp, shape: 'round' },
  'social-butterfly': { Component: ArtSocialButterfly, shape: 'round' },
  'weekend-warrior': { Component: ArtWeekendWarrior, shape: 'round' },
  tourist: { Component: ArtTourist, shape: 'round' },
  explorer: { Component: ArtExplorer, shape: 'round' },
  'over-9000': { Component: ArtOver9000, shape: 'round' },
  'touch-grass': { Component: ArtTouchGrass, shape: 'square' },
  'gotta-go-fast': { Component: ArtGottaGoFast, shape: 'square' },
  'main-character': { Component: ArtMainCharacter, shape: 'square' },
  'one-does-not-simply': { Component: ArtOneDoesNotSimply, shape: 'square' },
}
