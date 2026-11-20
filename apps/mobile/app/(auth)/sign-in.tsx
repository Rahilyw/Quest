import { useRef, useState } from 'react'
import type { TextInputInstance } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import {
  AuthScreen,
  Field,
  FormError,
  LinkRow,
  PrimaryButton,
  SecondaryButton,
  authErrorCopy,
} from '@/components/auth/AuthKit'

export default function SignIn() {
  const router = useRouter()
  const passwordRef = useRef<TextInputInstance>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSignIn() {
    if (!email.trim() || !password) {
      setError('Enter your email and password.')
      return
    }
    setError(null)
    setLoading(true)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (signInError) setError(authErrorCopy(signInError.message))
    setLoading(false)
  }

  async function handleDemoSignIn() {
    if (!__DEV__) return // dev-only: never create or use the demo account in release builds
    setError(null)
    setLoading(true)
    const demoEmail = 'explorer@demo.quest'
    const demoPassword = 'demopassword123'
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: demoEmail,
      password: demoPassword,
    })
    if (signInError) {
      // Create the demo user if it does not exist yet.
      const { error: signUpErr } = await supabase.auth.signUp({ email: demoEmail, password: demoPassword })
      if (signUpErr) setError(authErrorCopy(signUpErr.message))
    }
    setLoading(false)
  }

  return (
    <AuthScreen title="Sign in" lead="Victoria’s still out there. Pick up where you left off.">
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <Field
        label="Password"
        secure
        inputRef={passwordRef}
        value={password}
        onChangeText={setPassword}
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={handleSignIn}
      />

      <FormError message={error} />

      <PrimaryButton label="Sign in" busyLabel="Signing in…" busy={loading} onPress={handleSignIn} />

      {__DEV__ ? (
        <SecondaryButton label="Use the demo account" onPress={handleDemoSignIn} disabled={loading} />
      ) : null}

      <LinkRow action="Forgot your password?" onPress={() => router.push('/(auth)/forgot-password')} />
      <LinkRow lead="New here?" action="Create an account" onPress={() => router.push('/(auth)/sign-up')} />
    </AuthScreen>
  )
}
