import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, SPACING, RADIUS, CITY } from '@/lib/constants'
import { BrandInline } from '@/components/BrandText'
import { completeOnboarding, PILOT_CITIES } from '@/lib/onboarding'
import { track } from '@/lib/analytics'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

const STEPS = [
  {
    icon: '🗺️',
    title: 'Your city is the game board',
    body: '',
  },
  {
    icon: '📍',
    title: 'Where do you play?',
    body: 'We are piloting in Victoria first. Pick your city — more are on the way.',
  },
  {
    icon: '🏅',
    title: 'Earn XP for living your city',
    body: 'Complete quests, collect badges, and climb the weekly leaderboard. Your first quest is waiting outside.',
  },
] as const

export default function Onboarding() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [city, setCity] = useState<string>(CITY.name)

  async function finish(destination: '/(auth)/sign-up' | '/(auth)/sign-in') {
    await completeOnboarding(city)
    track('onboarding_completed', { city })
    router.replace(destination)
  }

  async function handleSkip() {
    await finish('/(auth)/sign-in')
  }

  function handleNext() {
    if (step < STEPS.length - 1) {
      setStep(step + 1)
    }
  }

  const isCityStep = step === 1
  const isLastStep = step === STEPS.length - 1
  const current = STEPS[step]

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.topBar}>
        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
          ))}
        </View>
        {!isLastStep && (
          <TouchableOpacity onPress={handleSkip} hitSlop={12} activeOpacity={0.7}>
            <Text style={styles.skip}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>{current.icon}</Text>
        </View>

        <Text style={styles.title}>{current.title}</Text>
        {step === 0 ? (
          <Text style={styles.body}>
            <BrandInline /> turns real places into weekly challenges. Run a trail, grab coffee, meet someone new — then prove you showed up.
          </Text>
        ) : (
          <Text style={styles.body}>{current.body}</Text>
        )}

        {isCityStep && (
          <View style={styles.cityList}>
            {PILOT_CITIES.map((name) => {
              const selected = city === name
              return (
                <TouchableOpacity
                  key={name}
                  style={[styles.cityCard, selected && styles.cityCardSelected]}
                  onPress={() => setCity(name)}
                  activeOpacity={0.85}
                >
                  <View style={styles.cityInfo}>
                    <Text style={styles.cityName}>{name}</Text>
                    <Text style={styles.cityHint}>Pilot city</Text>
                  </View>
                  {selected && (
                    <Ionicons name="checkmark-circle" size={22} color={COLORS.accent} />
                  )}
                </TouchableOpacity>
              )
            })}
            <View style={styles.cityCardDisabled}>
              <View style={styles.cityInfo}>
                <Text style={styles.cityNameMuted}>More cities</Text>
                <Text style={styles.cityHint}>Coming soon</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      <View style={[styles.footer, { paddingHorizontal: Math.max(SPACING.xl, (SCREEN_WIDTH - 400) / 2) }]}>
        {isLastStep ? (
          <>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => finish('/(auth)/sign-up')}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Get Started</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => finish('/(auth)/sign-in')}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryBtnText}>I already have an account</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.primaryBtn} onPress={handleNext} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Next</Text>
          </TouchableOpacity>
        )}
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
    minHeight: 36,
    marginBottom: SPACING.lg,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: COLORS.accent,
  },
  skip: {
    color: COLORS.textMuted,
    fontSize: 15,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    justifyContent: 'center',
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xxl,
  },
  icon: { fontSize: 42 },
  title: {
    color: COLORS.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
    marginBottom: SPACING.md,
    letterSpacing: -0.5,
  },
  body: {
    color: COLORS.textMuted,
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 340,
  },
  cityList: {
    marginTop: SPACING.xxl,
    gap: SPACING.sm,
  },
  cityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  cityCardSelected: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentSoft,
  },
  cityCardDisabled: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    opacity: 0.6,
  },
  cityInfo: { flex: 1 },
  cityName: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  cityNameMuted: {
    color: COLORS.textMuted,
    fontSize: 16,
    fontWeight: '600',
  },
  cityHint: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  footer: {
    gap: SPACING.sm,
    paddingTop: SPACING.lg,
  },
  primaryBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    alignItems: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 5,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryBtn: {
    padding: SPACING.md,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: COLORS.accent,
    fontWeight: '600',
    fontSize: 15,
  },
})
