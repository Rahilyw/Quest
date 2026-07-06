import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SectionHeader } from '@/components/SectionHeader'
import { BrandInline } from '@/components/BrandText'
import { COLORS, SPACING, RADIUS } from '@/lib/constants'

const LAST_UPDATED = 'July 4, 2026'

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

function Bullet({ children }: { children: string }) {
  return <Text style={styles.bullet}>• {children}</Text>
}

export default function TermsOfService(): JSX.Element {
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

      <Text style={[styles.screenTitle, { paddingTop: insets.top + 18 }]}>Terms of Service</Text>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 64 }]}
      >
        <Text style={styles.updated}>Last updated {LAST_UPDATED}</Text>

        <Paragraph>
          By using <BrandInline /> you agree to play fair, explore for real, and treat the community
          (and Victoria's spots) with respect. If that sounds reasonable, read on.
        </Paragraph>

        <Section title="Eligibility">
          <Paragraph>
            You need to be at least 13 years old and able to form a binding agreement where
            you live. One account per person — no farming XP on alts.
          </Paragraph>
        </Section>

        <Section title="Quest rules">
          <Bullet>Go to the actual location. No couch completions.</Bullet>
          <Bullet>Take an honest photo when you are there — no old camera roll tricks.</Bullet>
          <Paragraph>
            Quest location rules depend on the quest type. Some quests require you to be within a specific radius of a landmark. City-wide quests require you to be within Victoria, BC. Remote quests have no location requirement. GPS can be imprecise; if we cannot verify you were in the allowed zone, the submission will not count.
          </Paragraph>
          <Bullet>Follow local laws and venue rules. We are not responsible if you hop a fence.</Bullet>
        </Section>

        <Section title="Submissions & verification">
          <Paragraph>
            Valid submissions are verified instantly when you are inside the quest zone with an in-app photo. XP, streaks, and sponsored reward codes land right away — there is no manual approval queue.
          </Paragraph>
          <Paragraph>
            The community can report posts that look wrong. We review reports and may remove a completion, which revokes the XP. You can turn off public feed sharing in Settings and keep proofs on your profile only.
          </Paragraph>
        </Section>

        <Section title="Community & objectionable content">
          <Paragraph>
            <BrandInline /> is a user-generated feed of real-world proof photos. You must not post content that is illegal, harassing, sexually explicit, violent, or otherwise objectionable. Report tools exist on every feed post; we block and remove content that breaks these rules.
          </Paragraph>
          <Paragraph>
            Abusing the report system or farming fake completions may result in account suspension. Contact support to appeal a removal during the pilot.
          </Paragraph>
        </Section>

        <Section title="XP and rewards">
          <Paragraph>
            XP is awarded when your submission verifies at the location. Leaderboard rank updates immediately. Sponsored quests may include a reward code on the celebration screen and in your profile history.
          </Paragraph>
        </Section>

        <Section title="Account termination">
          <Paragraph>
            We can suspend or delete accounts that cheat, harass others, or abuse the review
            queue. You can delete your account any time by contacting us — we will remove your
            profile and personal data subject to what we need to keep for legal or fraud
            prevention reasons.
          </Paragraph>
        </Section>

        <Section title="Changes to these terms">
          <Paragraph>
            We may update these terms as <BrandInline /> grows beyond Victoria. We will bump the "Last
            updated" date at the top. Continued use after changes means you accept the new
            terms.
          </Paragraph>
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
  bullet: {
    color: COLORS.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: SPACING.sm,
    paddingLeft: SPACING.xs,
  },
})
