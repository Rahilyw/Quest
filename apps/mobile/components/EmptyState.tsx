import { Pressable, StyleSheet, View } from 'react-native'
import { Body, BodyStrong } from '@/components/ui/Text'
import { COLOR, RADIUS, SPACE } from '@/lib/theme'

interface Props {
  title: string
  subtitle?: string
  ctaLabel?: string
  onCtaPress?: () => void
}

/** What's missing, why, and one thing to do about it (BRAND.md §8b). */
export function EmptyState({ title, subtitle, ctaLabel, onCtaPress }: Props) {
  return (
    <View style={styles.container}>
      <BodyStrong>{title}</BodyStrong>
      {subtitle !== undefined ? (
        <Body tone="soft" style={styles.subtitle}>
          {subtitle}
        </Body>
      ) : null}
      {ctaLabel !== undefined && onCtaPress !== undefined ? (
        <Pressable
          onPress={onCtaPress}
          accessibilityRole="button"
          accessibilityLabel={ctaLabel}
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        >
          <BodyStrong color={COLOR.white}>{ctaLabel}</BodyStrong>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    paddingVertical: SPACE.s6,
    paddingHorizontal: SPACE.s4,
    gap: SPACE.s2,
  },
  subtitle: { maxWidth: 320 },
  cta: {
    marginTop: SPACE.s3,
    minHeight: 48,
    paddingHorizontal: SPACE.s5,
    borderRadius: RADIUS.pill,
    backgroundColor: COLOR.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPressed: { backgroundColor: COLOR.inkPressed, transform: [{ scale: 0.97 }] },
})
