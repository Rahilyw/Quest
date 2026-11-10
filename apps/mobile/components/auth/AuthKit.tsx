import { useState, type ReactNode, type Ref } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BrandText } from '@/components/BrandText'
import { Body, BodyStrong, Small, Title } from '@/components/ui/Text'
import { COLOR, RADIUS, SPACE, TYPE } from '@/lib/theme'

/**
 * Shared pieces for the signed-out screens (sign in, sign up, password reset), on paper
 * and ink like the rest of the app (BRAND.md §3, §8b). The form sits at the top so the
 * keyboard never covers the button.
 */

export function AuthScreen({
  title,
  lead,
  onBack,
  children,
}: {
  title: string
  lead?: string
  onBack?: () => void
  children: ReactNode
}) {
  const insets = useSafeAreaInsets()
  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + SPACE.s3,
          paddingBottom: insets.bottom + SPACE.s6,
          paddingHorizontal: SPACE.s5,
        }}
      >
        <View style={styles.topBar}>
          {onBack ? (
            <Pressable
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel="Back"
              style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
            >
              <Ionicons name="chevron-back" size={22} color={COLOR.ink} />
            </Pressable>
          ) : null}
          <BrandText size="inline" color={COLOR.ink} />
        </View>
        <Title style={styles.title}>{title}</Title>
        {lead ? (
          <Body tone="soft" style={styles.lead}>
            {lead}
          </Body>
        ) : null}
        <View style={styles.form}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

export interface FieldProps extends TextInputProps {
  label: string
  /** Adds a Show / Hide toggle and hides the text by default. */
  secure?: boolean
  hint?: string
  inputRef?: Ref<TextInput>
}

export function Field({ label, secure, hint, inputRef, style, onFocus, onBlur, ...input }: FieldProps) {
  const [focused, setFocused] = useState(false)
  const [hidden, setHidden] = useState(true)
  return (
    <View style={styles.field}>
      <Small>{label}</Small>
      <View style={[styles.inputWrap, focused && styles.inputWrapFocused]}>
        <TextInput
          ref={inputRef}
          accessibilityLabel={label}
          placeholderTextColor={COLOR.inkSoft}
          autoCapitalize="none"
          autoCorrect={false}
          selectionColor={COLOR.ink}
          {...input}
          secureTextEntry={secure ? hidden : input.secureTextEntry}
          onFocus={(e) => {
            setFocused(true)
            onFocus?.(e)
          }}
          onBlur={(e) => {
            setFocused(false)
            onBlur?.(e)
          }}
          style={[styles.input, style]}
        />
        {secure ? (
          <Pressable
            onPress={() => setHidden((current) => !current)}
            accessibilityRole="button"
            accessibilityLabel={hidden ? `Show ${label.toLowerCase()}` : `Hide ${label.toLowerCase()}`}
            style={styles.toggle}
          >
            <Small tone="soft">{hidden ? 'Show' : 'Hide'}</Small>
          </Pressable>
        ) : null}
      </View>
      {hint ? <Small tone="soft">{hint}</Small> : null}
    </View>
  )
}

/** What went wrong and what to do, in ink with a mark. Colour is never the signal. */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <View style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Ionicons
        name="alert-circle-outline"
        size={20}
        color={COLOR.ink}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <Small style={styles.errorText}>{message}</Small>
    </View>
  )
}

export function PrimaryButton({
  label,
  busyLabel,
  busy,
  disabled,
  onPress,
}: {
  label: string
  busyLabel?: string
  busy?: boolean
  disabled?: boolean
  onPress: () => void
}) {
  const off = Boolean(disabled) && !busy
  return (
    <Pressable
      onPress={onPress}
      disabled={busy || disabled}
      accessibilityRole="button"
      accessibilityLabel={busy ? busyLabel ?? label : label}
      accessibilityState={{ disabled: Boolean(busy || disabled), busy: Boolean(busy) }}
      style={({ pressed }) => [styles.primary, off && styles.primaryOff, pressed && styles.primaryPressed]}
    >
      {busy ? <ActivityIndicator size="small" color={COLOR.white} /> : null}
      <BodyStrong color={off ? COLOR.inkSoft : COLOR.white}>{busy ? busyLabel ?? label : label}</BodyStrong>
    </Pressable>
  )
}

export function SecondaryButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.secondary, pressed && styles.secondaryPressed]}
    >
      <BodyStrong>{label}</BodyStrong>
    </Pressable>
  )
}

/** A sentence whose bold part is the thing you can do: "New here? **Create an account**". */
export function LinkRow({ lead, action, onPress }: { lead?: string; action: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={lead ? `${lead} ${action}` : action}
      style={({ pressed }) => [styles.link, pressed && styles.linkPressed]}
    >
      <Body tone="soft">
        {lead ? `${lead} ` : ''}
        <BodyStrong>{action}</BodyStrong>
      </Body>
    </Pressable>
  )
}

/** Turns Supabase auth errors into what happened and what to do next. */
export function authErrorCopy(message: string | undefined): string {
  const text = (message ?? '').toLowerCase()
  if (text.includes('invalid login credentials')) {
    return 'That email and password don’t match. Try again, or reset your password.'
  }
  if (text.includes('email not confirmed')) {
    return 'Confirm your email first. The link is in your inbox.'
  }
  if (text.includes('already registered') || text.includes('already been registered')) {
    return 'That email already has an account. Sign in instead.'
  }
  if (text.includes('password should be') || text.includes('weak password')) {
    return 'That password is too short. Use at least 8 characters.'
  }
  if (text.includes('valid email') || text.includes('invalid email') || text.includes('invalid format')) {
    return 'That email doesn’t look right. Check it and try again.'
  }
  if (text.includes('rate limit') || text.includes('too many')) {
    return 'Too many tries. Wait a minute, then try again.'
  }
  if (text.includes('network') || text.includes('fetch')) {
    return 'No signal. Check your connection and try again.'
  }
  return message?.trim() || 'That didn’t go through. Try again.'
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLOR.paper },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.s2,
    minHeight: 48,
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
  title: { marginTop: SPACE.s6 },
  lead: { marginTop: SPACE.s3, maxWidth: 340 },
  form: { marginTop: SPACE.s6, gap: SPACE.s4 },
  field: { gap: SPACE.s2 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    backgroundColor: COLOR.white,
    borderRadius: RADIUS.control,
    borderWidth: 1.5,
    borderColor: COLOR.rule,
  },
  inputWrapFocused: { borderColor: COLOR.ink },
  input: {
    ...TYPE.body,
    flex: 1,
    color: COLOR.ink,
    paddingHorizontal: SPACE.s4,
    paddingVertical: SPACE.s3,
  },
  toggle: {
    minWidth: 56,
    minHeight: 48,
    paddingHorizontal: SPACE.s3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.s2 },
  errorText: { flex: 1, paddingTop: 1 },
  primary: {
    minHeight: 56,
    marginTop: SPACE.s2,
    borderRadius: RADIUS.pill,
    backgroundColor: COLOR.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.s2,
    paddingHorizontal: SPACE.s5,
  },
  primaryOff: { backgroundColor: COLOR.disabledFill },
  primaryPressed: { backgroundColor: COLOR.inkPressed, transform: [{ scale: 0.97 }] },
  secondary: {
    minHeight: 56,
    borderRadius: RADIUS.pill,
    backgroundColor: COLOR.secondaryFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACE.s5,
  },
  secondaryPressed: { transform: [{ scale: 0.97 }] },
  link: { minHeight: 48, justifyContent: 'center' },
  linkPressed: { opacity: 0.6 },
})
