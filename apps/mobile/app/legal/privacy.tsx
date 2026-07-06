import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SectionHeader } from '@/components/SectionHeader'
import { BrandInline } from '@/components/BrandText'
import { COLORS, SPACING, RADIUS } from '@/lib/constants'

const LAST_UPDATED = 'June 21, 2026'
const CONTACT_EMAIL = 'hello@quest.app'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <SectionHeader title={title} />
      <View style={styles.sectionCard}>{children}</View>
    </>
  )
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return <Text style={styles.paragraph}>{children}</Text>
}

export default function PrivacyPolicy(): JSX.Element {
  const insets = useSafeAreaInsets()
  const router = useRouter()

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.back, { top: insets.top + 12, left: SPACING.lg }]}
        onPress={() => router.back()}
        activeOpacity={0.8}
      >
        <View style={styles.backPill}>
          <Text style={[styles.backText, { color: COLORS.accent }]}>←</Text>
        </View>
      </TouchableOpacity>

      <Text style={[styles.screenTitle, { paddingTop: insets.top + 18 }]}>Privacy Policy</Text>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 64 }]}
      >
        <Text style={styles.updated}>Last updated {LAST_UPDATED}</Text>

        <Paragraph>
          <BrandInline /> is built for people who actually get out and explore Victoria — not for
          selling your data. Here is what we collect, why, and where it lives.
        </Paragraph>

        <Section title="What we collect">
          <Paragraph>
            When you sign up, we ask for your email and a username. You pick your city (right
            now that is Victoria, BC for the pilot). When you complete a quest, you submit a
            photo as proof and we record your GPS location at the moment you tap submit — that
            is how we know you were within about 300 metres of the spot.
          </Paragraph>
        </Section>

        <Section title="How we use it">
          <Paragraph>
            Your email is for signing in and occasional product updates if you opt in. Your
            username and city show on the weekly leaderboard. Photo proof and GPS are reviewed
            by our team to verify you really did the quest — honest visits only. We do not use
            your location in the background; it is only captured when you submit.
          </Paragraph>
        </Section>

        <Section title="Storage">
          <Paragraph>
            Everything lives in Supabase (hosted Postgres and file storage). Proof photos sit in
            a private bucket; only you and admins reviewing submissions can access them. Profile
            data and completion records are protected by row-level security so you only see your
            own stuff unless it is public leaderboard info.
          </Paragraph>
        </Section>

        <Section title="Contact">
          <Paragraph>
            Questions about your data or want something deleted? Email us — we are a small team
            and we will actually reply.
          </Paragraph>
          <TouchableOpacity
            onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)}
            activeOpacity={0.7}
          >
            <Text style={styles.link}>{CONTACT_EMAIL}</Text>
          </TouchableOpacity>
        </Section>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  back: { position: 'absolute', zIndex: 10 },
  backPill: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 999,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  backText: { fontSize: 20, fontWeight: '700', lineHeight: 28 },
  screenTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: SPACING.md, paddingBottom: 80 },
  updated: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.xs,
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  paragraph: {
    color: COLORS.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: SPACING.sm,
  },
  link: {
    color: COLORS.accent,
    fontSize: 15,
    fontWeight: '600',
    marginTop: SPACING.xs,
  },
})
