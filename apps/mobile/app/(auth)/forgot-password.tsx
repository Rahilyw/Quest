import { useState } from 'react'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { passwordResetRedirectUrl } from '@/lib/auth-linking'
import {
  AuthScreen,
  Field,
  FormError,
  LinkRow,
  PrimaryButton,
  authErrorCopy,
} from '@/components/auth/AuthKit'

export default function ForgotPassword() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function back() {
    if (router.canGoBack()) router.back()
    else router.replace('/(auth)/sign-in')
  }

  async function handleSendReset() {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) {
      setError('Enter the email you signed up with.')
      return
    }
    setError(null)
    setLoading(true)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: passwordResetRedirectUrl(),
    })
    setLoading(false)

    if (resetError) {
      setError(authErrorCopy(resetError.message))
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <AuthScreen
        title="Check your email"
        lead={`If ${email.trim()} has an account, a reset link is on its way. Open it on this phone to choose a new password.`}
        onBack={back}
      >
        <PrimaryButton label="Back to sign in" onPress={() => router.replace('/(auth)/sign-in')} />
        <LinkRow
          lead="Nothing after a minute?"
          action="Send it again"
          onPress={() => setSent(false)}
        />
      </AuthScreen>
    )
  }

  return (
    <AuthScreen
      title="Reset your password"
      lead="Tell us your email and we’ll send a link to choose a new one."
      onBack={back}
    >
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="send"
        onSubmitEditing={handleSendReset}
      />
      <FormError message={error} />
      <PrimaryButton label="Send reset link" busyLabel="Sending…" busy={loading} onPress={handleSendReset} />
    </AuthScreen>
  )
}
