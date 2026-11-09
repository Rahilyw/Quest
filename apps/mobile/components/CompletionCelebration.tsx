import { useEffect, useState } from 'react'
import {
  AccessibilityInfo,
  Modal,
  Pressable,
  StyleSheet,
  View,
  Vibration,
} from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { Cutout } from '@/components/Cutout'
import { Pillow } from '@/components/Pillow'
import { Sparkle } from '@/components/scraps'
import { Body, Micro, Sentence, Small } from '@/components/ui/Text'
import { phraseFor } from '@/lib/thisWeek'
import { COLOR, FONT, getCategory, RADIUS, SPACE, SPONSORED } from '@/lib/theme'

export type CelebrationVariant = 'success' | 'alreadyDone'

interface Props {
  visible: boolean
  variant?: CelebrationVariant
  questTitle: string
  category?: string
  cutoutUrl?: string | null
  actionPhrase?: string | null
  photoUri?: string | null
  selfieUri?: string | null
  xpReward: number
  totalXp?: number
  level?: number
  levelUp?: boolean
  streakCount?: number
  redemptionCode?: string | null
  sponsorReward?: string | null
  onDone: () => void
  onShare?: () => void
}

const LAND = { duration: 420, easing: Easing.bezier(0.22, 1, 0.36, 1) }

function verifiedClock(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Vancouver',
    hour: 'numeric',
    minute: '2-digit',
  })
    .format(date)
    .toLowerCase()
}

export default function CompletionCelebration({
  visible,
  variant = 'success',
  questTitle,
  category = 'fitness',
  cutoutUrl,
  actionPhrase,
  photoUri,
  selfieUri,
  xpReward,
  level,
  levelUp = false,
  streakCount = 0,
  redemptionCode,
  sponsorReward,
  onDone,
  onShare,
}: Props) {
  const already = variant === 'alreadyDone'
  const cat = getCategory(category)
  const background = already ? COLOR.paper : questTitle && category ? cat.color : COLOR.paper
  const ink = already ? COLOR.ink : cat.onColor
  const [reduceMotion, setReduceMotion] = useState(false)
  const [shownXp, setShownXp] = useState(0)
  const [when] = useState(() => verifiedClock(new Date()))

  const scale = useSharedValue(1)
  const rotate = useSharedValue(0)
  const fade = useSharedValue(1)

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
    if (!visible || already) {
      setShownXp(0)
      return
    }
    if (reduceMotion) {
      scale.value = 1
      rotate.value = 0
      fade.value = 0
      fade.value = withTiming(1, { duration: 150 })
      setShownXp(xpReward)
      return
    }

    scale.value = 1.3
    rotate.value = -12
    fade.value = 1
    scale.value = withTiming(1, LAND)
    rotate.value = withTiming(0, LAND)

    const start = Date.now()
    let frame = 0
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / 420)
      const eased = 1 - (1 - t) ** 5
      setShownXp(Math.round(xpReward * eased))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    const haptic = setTimeout(() => Vibration.vibrate(15), 420)
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(haptic)
    }
  }, [visible, already, reduceMotion, xpReward, scale, rotate, fade])

  const cutoutStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
  }))

  const phrase = phraseFor({ title: questTitle, action_phrase: actionPhrase })

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onDone} statusBarTranslucent>
      <View style={[styles.screen, { backgroundColor: background }]}>
        {already ? (
          <View style={styles.center}>
            <Sentence>You already finished this quest.</Sentence>
            <Body tone="soft">The proof is on your profile.</Body>
          </View>
        ) : (
          <View style={styles.center}>
            <Small color={ink}>{`Verified on ${questTitle}, ${when}`}</Small>
            <View style={styles.cutoutWrap}>
              {!reduceMotion ? (
                <>
                  <View style={[styles.spark, styles.sparkA]}>
                    <Twinkle delay={0} color={ink} />
                  </View>
                  <View style={[styles.spark, styles.sparkB]}>
                    <Twinkle delay={300} color={ink} />
                  </View>
                  <View style={[styles.spark, styles.sparkC]}>
                    <Twinkle delay={600} color={ink} />
                  </View>
                </>
              ) : null}
              <Animated.View style={cutoutStyle}>
                <Cutout
                  uri={cutoutUrl}
                  category={category}
                  questTitle={questTitle}
                  role="celebration"
                  style={{ width: 180 }}
                />
              </Animated.View>
            </View>
            <Sentence color={ink} style={styles.line}>
              {`You ${phrase}. ${cat.label} is in your collection.`}
            </Sentence>
            <View style={styles.pills}>
              <View style={styles.pill}>
                <Micro color={COLOR.white} tabular>{`+${shownXp} XP`}</Micro>
              </View>
              {streakCount > 0 ? (
                <View style={styles.pill}>
                  <Micro color={COLOR.white} tabular>{`${streakCount} week streak`}</Micro>
                </View>
              ) : null}
              {levelUp && level != null ? (
                <View style={styles.pill}>
                  <Micro color={COLOR.white}>{`Level ${level}`}</Micro>
                </View>
              ) : null}
            </View>
            {photoUri ? (
              <View style={styles.proof}>
                <Pillow uri={photoUri} width={120} height={136} edge="white" accessibilityLabel="Your proof photo" />
                {selfieUri ? (
                  <View style={styles.selfie}>
                    <Pillow uri={selfieUri} width={48} height={54} edge="white" accessibilityLabel="Your selfie" />
                  </View>
                ) : null}
              </View>
            ) : null}
            <Small color={ink} style={styles.privacy}>
              Your photos are on the City feed. Only you can see exactly where you were standing.
            </Small>
            {redemptionCode ? (
              <View style={styles.code}>
                <Small tone="soft">Show this at the counter</Small>
                <Body style={styles.codeValue}>{redemptionCode}</Body>
                {sponsorReward ? <Small color={SPONSORED.deep}>{sponsorReward}</Small> : null}
              </View>
            ) : null}
          </View>
        )}

        <View style={styles.actions}>
          {!already && onShare ? (
            <Pressable
              onPress={onShare}
              accessibilityRole="button"
              accessibilityLabel="Share"
              style={({ pressed }) => [styles.share, pressed && styles.pressed]}
            >
              <Body color={COLOR.white} style={styles.actionLabel}>Share</Body>
            </Pressable>
          ) : null}
          <Pressable
            onPress={onDone}
            accessibilityRole="button"
            accessibilityLabel="Done"
            style={({ pressed }) => [styles.done, pressed && styles.pressed]}
          >
            <Body style={styles.actionLabel}>Done</Body>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

function Twinkle({ delay, color }: { delay: number; color: string }) {
  const opacity = useSharedValue(0)
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    for (let i = 0; i < 3; i++) {
      const at = delay + i * 700
      timers.push(setTimeout(() => {
        opacity.value = withTiming(1, { duration: 180 })
      }, at))
      timers.push(setTimeout(() => {
        opacity.value = withTiming(0.15, { duration: 320 })
      }, at + 220))
    }
    return () => timers.forEach(clearTimeout)
  }, [delay, opacity])
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }))
  return (
    <Animated.View style={style}>
      <Sparkle size={22} color={color} />
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: SPACE.s4,
    paddingTop: SPACE.s8,
    paddingBottom: SPACE.s6,
    justifyContent: 'space-between',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.s3,
  },
  cutoutWrap: {
    width: 220,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spark: { position: 'absolute' },
  sparkA: { top: 12, left: 24 },
  sparkB: { top: 4, right: 28 },
  sparkC: { bottom: 36, right: 16 },
  line: { textAlign: 'center' },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACE.s2,
  },
  pill: {
    backgroundColor: COLOR.ink,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACE.s3,
    paddingVertical: SPACE.s2,
    minHeight: 28,
    justifyContent: 'center',
  },
  proof: {
    marginTop: SPACE.s2,
  },
  selfie: {
    position: 'absolute',
    top: -6,
    left: -8,
  },
  privacy: {
    textAlign: 'center',
    maxWidth: 280,
  },
  code: {
    backgroundColor: COLOR.white,
    borderRadius: RADIUS.card,
    padding: SPACE.s3,
    alignItems: 'center',
    gap: SPACE.s1,
  },
  codeValue: {
    fontFamily: FONT.black,
  },
  actions: {
    gap: SPACE.s2,
  },
  share: {
    backgroundColor: COLOR.ink,
    borderRadius: RADIUS.pill,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  done: {
    backgroundColor: COLOR.white,
    borderRadius: RADIUS.pill,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
  actionLabel: {
    fontFamily: FONT.black,
  },
})
