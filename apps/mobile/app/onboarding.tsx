import { useEffect, useRef, useState } from 'react'
import {
  View,
  StyleSheet,
  Pressable,
  FlatList,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BrandText } from '@/components/BrandText'
import { Sticker } from '@/components/Sticker'
import { Body, BodyStrong, Sentence, Small } from '@/components/ui/Text'
import { CITY } from '@/lib/constants'
import { completeOnboarding } from '@/lib/onboarding'
import { supabase } from '@/lib/supabase'
import { track } from '@/lib/analytics'
import { COLOR, RADIUS, SPACE } from '@/lib/theme'

/**
 * Three screens, one sentence each, on paper (BRAND.md §9, UI-OVERHAUL-PLAN Phase 5).
 * Each slide shows real quest stickers when there are some; with none, the
 * slide is just its sentence (no stand-ins). Victoria is the only pilot city,
 * so there is no city picker.
 */
interface Slide {
  id: string
  sentence: string
  detail: string
}

const TILT = [-6, 3, 7]

const SLIDES: Slide[] = [
  {
    id: 'places',
    sentence: 'Pick a real place in Victoria and go there.',
    detail:
      'Moss Street Market, Dallas Road, the harbour ferries. Quests are things you can actually do today.',
  },
  {
    id: 'proof',
    sentence: 'Take a photo of the place. That’s your proof.',
    detail:
      'We check you’re in the zone, then you can add a quick selfie. You can always skip it.',
  },
  {
    id: 'reward',
    sentence: 'Earn badges and medals the second you’re verified.',
    detail: `Each quest’s sticker lands in your drawer for your page. Climb this week’s rankings and see what the rest of ${CITY.name} is up to.`,
  },
]

export default function Onboarding() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { width } = useWindowDimensions()
  const listRef = useRef<FlatList<Slide>>(null)
  const [step, setStep] = useState(0)
  const isLast = step === SLIDES.length - 1
  const [stickers, setStickers] = useState<{ id: string; title: string; cutout_url: string }[]>([])

  useEffect(() => {
    let alive = true
    supabase
      .from('quests')
      .select('id, title, cutout_url')
      .eq('status', 'active')
      .not('cutout_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(9)
      .then(({ data }) => {
        if (alive && data) setStickers(data as { id: string; title: string; cutout_url: string }[])
      })
    return () => {
      alive = false
    }
  }, [])

  async function finish(destination: '/(auth)/sign-up' | '/(auth)/sign-in') {
    await completeOnboarding(CITY.name)
    track('onboarding_completed', { city: CITY.name })
    router.replace(destination)
  }

  function goTo(index: number) {
    const next = Math.max(0, Math.min(index, SLIDES.length - 1))
    setStep(next)
    listRef.current?.scrollToIndex({ index: next, animated: true })
  }

  function onScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const index = Math.round(e.nativeEvent.contentOffset.x / width)
    if (index !== step) setStep(index)
  }

  function renderSlide({ item, index }: { item: Slide; index: number }) {
    // Three stickers per slide, rotating through what the city has; repeats
    // are fine when there are only a few.
    const mine = stickers.length
      ? [0, 1, 2].map((i) => stickers[(index * 3 + i) % stickers.length])
      : []
    return (
      <View style={[styles.slide, { width }]}>
        {mine.length ? (
          <View style={styles.stage}>
            {mine.map((quest, i) => (
              <Sticker key={`${item.id}-${i}`} uri={quest.cutout_url} size={96} tilt={TILT[i]} />
            ))}
          </View>
        ) : (
          <View style={styles.stageEmpty} />
        )}
        <Sentence accessibilityRole="header">{item.sentence}</Sentence>
        <Body tone="soft" style={styles.detail}>
          {item.detail}
        </Body>
      </View>
    )
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <BrandText size="inline" color={COLOR.ink}>
          Quest!
        </BrandText>
        {!isLast ? (
          <Pressable
            onPress={() => finish('/(auth)/sign-in')}
            hitSlop={8}
            style={styles.skip}
            accessibilityRole="button"
            accessibilityLabel="Skip the intro"
          >
            <BodyStrong tone="soft">Skip</BodyStrong>
          </Pressable>
        ) : null}
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onMomentumScrollEnd={onScrollEnd}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        style={styles.list}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + SPACE.s5 }]}>
        <View
          style={styles.dots}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={`Step ${step + 1} of ${SLIDES.length}`}
        >
          {SLIDES.map((s, i) => (
            <View key={s.id} style={[styles.dot, i === step && styles.dotActive]} />
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [styles.primary, pressed && styles.primaryPressed]}
          onPress={() => (isLast ? finish('/(auth)/sign-up') : goTo(step + 1))}
          accessibilityRole="button"
          accessibilityLabel={isLast ? 'Get started and create an account' : 'Next'}
        >
          <BodyStrong color={COLOR.white}>{isLast ? 'Get started' : 'Next'}</BodyStrong>
        </Pressable>

        {isLast ? (
          <Pressable
            style={styles.secondary}
            onPress={() => finish('/(auth)/sign-in')}
            accessibilityRole="button"
            accessibilityLabel="Sign in to an existing account"
          >
            <Small tone="soft">I already have an account</Small>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOR.paper },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACE.s5,
    minHeight: 48,
  },
  skip: { minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center' },
  list: { flex: 1 },
  slide: { paddingHorizontal: SPACE.s5, paddingTop: SPACE.s6 },
  stage: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACE.s2,
    marginBottom: SPACE.s7,
    minHeight: 150,
  },
  stageEmpty: { height: SPACE.s8 },
  detail: { marginTop: SPACE.s3 },
  footer: { paddingHorizontal: SPACE.s5, paddingTop: SPACE.s3, gap: SPACE.s3 },
  dots: { flexDirection: 'row', gap: SPACE.s2, alignSelf: 'center', marginBottom: SPACE.s2 },
  dot: { width: 8, height: 8, borderRadius: RADIUS.pill, backgroundColor: COLOR.disabledFill },
  dotActive: { width: 24, backgroundColor: COLOR.ink },
  primary: {
    minHeight: 56,
    borderRadius: RADIUS.pill,
    backgroundColor: COLOR.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryPressed: { backgroundColor: COLOR.inkPressed },
  secondary: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
})
