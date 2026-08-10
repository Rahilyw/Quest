import { useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  ScrollView,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, FONT_BRAND, SPACING, RADIUS, CITY } from '@/lib/constants'
import { WelcomeVisual, ExploreVisual, EarnVisual, CityVisual } from '@/components/onboarding/OnboardingVisuals'
import { completeOnboarding, PILOT_CITIES } from '@/lib/onboarding'
import { track } from '@/lib/analytics'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

type SlideKind = 'welcome' | 'explore' | 'city' | 'earn'

interface Slide {
  id: string
  kind: SlideKind
  eyebrow: string
  title: string
  body: string
}

const SLIDES: Slide[] = [
  {
    id: 'welcome',
    kind: 'welcome',
    eyebrow: 'Welcome',
    title: 'Turn your city into a playground',
    body: 'Quests are real-world challenges at places you already love. Show up, snap proof, stack XP.',
  },
  {
    id: 'explore',
    kind: 'explore',
    eyebrow: 'Explore',
    title: 'Your city is the game board',
    body: 'Find fitness trails, coffee spots, social hangouts, and hidden gems — all pinned on your map.',
  },
  {
    id: 'city',
    kind: 'city',
    eyebrow: 'Your city',
    title: 'Where do you play?',
    body: 'We are piloting in Victoria first. More cities are rolling out soon.',
  },
  {
    id: 'earn',
    kind: 'earn',
    eyebrow: 'Compete',
    title: 'Earn XP for living your city',
    body: 'Complete quests, unlock badges, and climb the weekly leaderboard. Your first adventure is waiting outside.',
  },
]

function SlideVisual({ kind }: { kind: SlideKind }) {
  switch (kind) {
    case 'welcome':
      return <WelcomeVisual />
    case 'explore':
      return <ExploreVisual />
    case 'city':
      return <CityVisual />
    case 'earn':
      return <EarnVisual />
    default:
      return null
  }
}

export default function Onboarding() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const listRef = useRef<FlatList<Slide>>(null)
  const [step, setStep] = useState(0)
  const [city, setCity] = useState<string>(CITY.name)

  const isCityStep = SLIDES[step]?.kind === 'city'
  const isLastStep = step === SLIDES.length - 1

  async function finish(destination: '/(auth)/sign-up' | '/(auth)/sign-in') {
    await completeOnboarding(city)
    track('onboarding_completed', { city })
    router.replace(destination)
  }

  function goTo(index: number) {
    const next = Math.max(0, Math.min(index, SLIDES.length - 1))
    setStep(next)
    listRef.current?.scrollToIndex({ index: next, animated: true })
  }

  function handleNext() {
    if (step < SLIDES.length - 1) goTo(step + 1)
  }

  function handleBack() {
    if (step > 0) goTo(step - 1)
  }

  function onScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH)
    if (index !== step) setStep(index)
  }

  function renderSlide({ item }: { item: Slide }) {
    const inner = (
      <>
        <SlideVisual kind={item.kind} />

        <View style={styles.copy}>
          <Text style={styles.eyebrow}>{item.eyebrow}</Text>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.body}>{item.body}</Text>
        </View>

        {item.kind === 'city' && (
          <View style={styles.cityList}>
            {PILOT_CITIES.map((name) => {
              const selected = city === name
              return (
                <TouchableOpacity
                  key={name}
                  style={[styles.cityCard, selected && styles.cityCardSelected]}
                  onPress={() => setCity(name)}
                  activeOpacity={0.85}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${name}, pilot city`}
                >
                  <View style={styles.cityIconWrap}>
                    <Ionicons name="location" size={20} color={selected ? COLORS.primary : COLORS.textMuted} />
                  </View>
                  <View style={styles.cityInfo}>
                    <Text style={styles.cityName}>{name}</Text>
                    <View style={styles.pilotBadge}>
                      <Text style={styles.pilotBadgeText}>PILOT CITY</Text>
                    </View>
                  </View>
                  {selected ? (
                    <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                  ) : (
                    <View style={styles.cityRadio} />
                  )}
                </TouchableOpacity>
              )
            })}
            <View style={styles.cityCardDisabled}>
              <View style={[styles.cityIconWrap, styles.cityIconMuted]}>
                <Ionicons name="earth-outline" size={20} color={COLORS.textMuted} />
              </View>
              <View style={styles.cityInfo}>
                <Text style={styles.cityNameMuted}>More cities</Text>
                <Text style={styles.cityHint}>Coming soon — Toronto, Vancouver, and beyond</Text>
              </View>
            </View>
          </View>
        )}
      </>
    )

    return (
      <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
        {item.kind === 'city' ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.slideScroll}>
            {inner}
          </ScrollView>
        ) : (
          inner
        )}
      </View>
    )
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <View style={styles.progressRow}>
          {SLIDES.map((s, i) => (
            <TouchableOpacity
              key={s.id}
              style={styles.progressSegmentWrap}
              onPress={() => goTo(i)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Go to slide ${i + 1} of ${SLIDES.length}`}
            >
              <View style={[styles.progressSegment, i <= step && styles.progressSegmentActive]} />
            </TouchableOpacity>
          ))}
        </View>
        {!isLastStep && (
          <TouchableOpacity
            onPress={() => finish('/(auth)/sign-in')}
            hitSlop={12}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding"
          >
            <Text style={styles.skip}>Skip</Text>
          </TouchableOpacity>
        )}
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
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        style={styles.list}
        contentContainerStyle={styles.listContent}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.footerRow}>
          {step > 0 ? (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={handleBack}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Previous slide"
            >
              <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.backPlaceholder} />
          )}

          {isLastStep ? (
            <View style={styles.ctaColumn}>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => finish('/(auth)/sign-up')}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Get started, create account"
              >
                <Text style={styles.primaryBtnText}>Get Started</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => finish('/(auth)/sign-in')}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Sign in to existing account"
              >
                <Text style={styles.secondaryBtnText}>I already have an account</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.primaryBtn, styles.primaryBtnFlex]}
              onPress={handleNext}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={isCityStep ? 'Continue with selected city' : 'Next slide'}
            >
              <Text style={styles.primaryBtnText}>{isCityStep ? 'Continue' : 'Next'}</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  progressRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  progressSegmentWrap: { flex: 1 },
  progressSegment: {
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
  },
  progressSegmentActive: {
    backgroundColor: COLORS.primary,
  },
  skip: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  list: { flex: 1 },
  listContent: { alignItems: 'flex-start' },
  slide: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  slideScroll: {
    paddingBottom: SPACING.xl,
  },
  copy: {
    marginBottom: SPACING.lg,
  },
  eyebrow: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: SPACING.sm,
  },
  title: {
    color: COLORS.navy,
    fontSize: 26,
    fontFamily: FONT_BRAND,
    lineHeight: 32,
    marginBottom: SPACING.sm,
  },
  body: {
    color: COLORS.textMuted,
    fontSize: 15,
    lineHeight: 23,
    maxWidth: 340,
  },
  cityList: {
    gap: SPACING.sm,
  },
  cityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  cityCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
  },
  cityIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cityIconMuted: { backgroundColor: COLORS.surfaceElevated },
  cityInfo: { flex: 1 },
  cityName: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  cityNameMuted: {
    color: COLORS.textMuted,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  cityHint: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  pilotBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.highlight,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pilotBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  cityRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  cityCardDisabled: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    opacity: 0.65,
  },
  footer: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  backBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backPlaceholder: { width: 48 },
  ctaColumn: { flex: 1, gap: SPACING.sm },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryBtnFlex: { flex: 1 },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  secondaryBtn: {
    padding: SPACING.sm,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 14,
  },
})
