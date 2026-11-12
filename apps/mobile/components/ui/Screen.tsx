import { type ReactNode } from 'react'
import { Pressable, StyleSheet, Switch, View, type StyleProp, type ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Body, Heading, Small, Title } from '@/components/ui/Text'
import { COLOR, RADIUS, SPACE } from '@/lib/theme'

/**
 * Pieces for the stack screens behind You: settings, edit profile, legal, lists of people.
 * Flat rows on paper with hairline rules (BRAND.md §5: list rows are flat, no cards), one
 * title per screen, ink for anything you can press.
 */

/** Round back button, 48pt target. Falls back to a route when there is nothing to pop. */
export function BackButton({ fallback = '/(tabs)/profile', onPress }: { fallback?: string; onPress?: () => void }) {
  const router = useRouter()
  return (
    <Pressable
      onPress={
        onPress ??
        (() => {
          if (router.canGoBack()) router.back()
          else router.replace(fallback as never)
        })
      }
      accessibilityRole="button"
      accessibilityLabel="Back"
      style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
    >
      <Ionicons name="chevron-back" size={22} color={COLOR.ink} />
    </Pressable>
  )
}

/** Back button, then the screen's one title, with an optional count or action beside it. */
export function ScreenHeader({
  title,
  trailing,
  compact,
}: {
  title: string
  trailing?: ReactNode
  /** Use the heading size for long titles and secondary lists. */
  compact?: boolean
}) {
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.header, { paddingTop: insets.top + SPACE.s2 }]}>
      <BackButton />
      <View style={styles.titleRow}>
        {compact ? (
          <Heading style={styles.title}>{title}</Heading>
        ) : (
          <Title style={styles.title}>{title}</Title>
        )}
        {trailing}
      </View>
    </View>
  )
}

export function Section({
  title,
  children,
  style,
}: {
  title?: string
  children: ReactNode
  style?: StyleProp<ViewStyle>
}) {
  return (
    <View style={[styles.section, style]}>
      {title ? <Heading style={styles.sectionTitle}>{title}</Heading> : null}
      {children}
    </View>
  )
}

interface RowProps {
  label: string
  hint?: string
  /** Read-only value on the right. */
  value?: string
  /** Makes the row a button with a chevron (or `icon`). */
  onPress?: () => void
  icon?: keyof typeof Ionicons.glyphMap
  accessibilityRole?: 'button' | 'link'
  /** Hides the hairline above the first row in a section. */
  first?: boolean
}

export function Row({ label, hint, value, onPress, icon, accessibilityRole = 'button', first }: RowProps) {
  const body = (
    <>
      <View style={styles.rowCopy}>
        <Body>{label}</Body>
        {hint ? <Small tone="soft">{hint}</Small> : null}
      </View>
      {value !== undefined ? (
        <Body tone="soft" numberOfLines={1} style={styles.rowValue}>
          {value}
        </Body>
      ) : null}
      {onPress ? (
        <Ionicons
          name={icon ?? 'chevron-forward'}
          size={18}
          color={COLOR.inkSoft}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      ) : null}
    </>
  )
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole={accessibilityRole}
        accessibilityLabel={label}
        accessibilityHint={hint}
        style={({ pressed }) => [styles.row, !first && styles.rowRule, pressed && styles.rowPressed]}
      >
        {body}
      </Pressable>
    )
  }
  return (
    <View
      style={[styles.row, !first && styles.rowRule]}
      accessible
      accessibilityLabel={value ? `${label}, ${value}` : label}
    >
      {body}
    </View>
  )
}

export function SwitchRow({
  label,
  hint,
  value,
  onValueChange,
  first,
}: {
  label: string
  hint?: string
  value: boolean
  onValueChange: (next: boolean) => void
  first?: boolean
}) {
  return (
    <View style={[styles.row, !first && styles.rowRule]}>
      <View style={styles.rowCopy}>
        <Body>{label}</Body>
        {hint ? <Small tone="soft">{hint}</Small> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        accessibilityLabel={label}
        accessibilityHint={hint}
        thumbColor={COLOR.white}
        trackColor={{ false: COLOR.disabledFill, true: COLOR.ink }}
        ios_backgroundColor={COLOR.disabledFill}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: SPACE.s4,
    paddingBottom: SPACE.s3,
    backgroundColor: COLOR.paper,
  },
  back: {
    width: 48,
    height: 48,
    marginLeft: -SPACE.s3,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backPressed: { backgroundColor: COLOR.secondaryFill },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: SPACE.s3,
    marginTop: SPACE.s2,
  },
  title: { flex: 1 },
  section: { marginTop: SPACE.s6 },
  sectionTitle: { marginBottom: SPACE.s1 },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.s3,
    paddingVertical: SPACE.s3,
  },
  rowRule: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLOR.inkFaint },
  rowPressed: { backgroundColor: COLOR.secondaryFill },
  rowCopy: { flex: 1, gap: 2 },
  rowValue: { flexShrink: 1, maxWidth: '55%', textAlign: 'right' },
})
