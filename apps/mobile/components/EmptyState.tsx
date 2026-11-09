import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { COLOR, RADIUS, SPACE } from '@/lib/theme'
import { Body, Small } from '@/components/ui/Text'

interface Props {
  icon: string
  title: string
  subtitle?: string
  ctaLabel?: string
  onCtaPress?: () => void
}

export function EmptyState({ icon, title, subtitle, ctaLabel, onCtaPress }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Body style={styles.icon}>{icon}</Body>
      </View>
      <Body style={styles.title}>{title}</Body>
      {subtitle !== undefined && (
        <Small tone="soft" style={styles.subtitle}>
          {subtitle}
        </Small>
      )}
      {ctaLabel !== undefined && onCtaPress !== undefined && (
        <TouchableOpacity style={styles.cta} onPress={onCtaPress} activeOpacity={0.85}>
          <Small color={COLOR.white}>{ctaLabel}</Small>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: SPACE.s8,
    paddingHorizontal: SPACE.s6,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLOR.secondaryFill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACE.s4,
  },
  icon: { fontSize: 34 },
  title: {
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: SPACE.s2,
  },
  subtitle: {
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 21,
  },
  cta: {
    marginTop: SPACE.s4,
    backgroundColor: COLOR.ink,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACE.s6,
    paddingVertical: SPACE.s3,
  },
})
