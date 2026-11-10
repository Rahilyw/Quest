import { useRef, useState } from 'react'
import { type TextInput } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { getOnboardingCity } from '@/lib/onboarding'
import { track } from '@/lib/analytics'
import {
  AuthScreen,
  Field,
  FormError,
  LinkRow,
  PrimaryButton,
  authErrorCopy,
} from '@/components/auth/AuthKit'
import { Body } from '@/components/ui/Text'

export default function SignUp() {
  const router = useRouter()
  const emailRef = useRef<TextInput>(null)
  const passwordRef = useRef<TextInput>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState(false)

  // Onboarding lands here with replace(), so there may be no screen to go back to.
  function toSignIn() {
    if (router.canGoBack()) router.back()
    else router.replace('/(auth)/sign-in')
  }

  async function handleSignUp() {
    const trimmedUsername = username.trim().toLowerCase()
    if (!trimmedUsername) {
      setError('Pick a username. It’s the name on the rankings.')
      return
    }
    if (!email.trim() || !password) {
      setError('Add your email and a password.')
      return
    }
    setError(null)
    setLoading(true)
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { username: trimmedUsername } },
    })
    if (signUpError) {
      setError(authErrorCopy(signUpError.message))
      setLoading(false)
      return
    }
    if (data.user) {
      const city = await getOnboardingCity()
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        username: trimmedUsername,
        city,
        total_xp: 0,
        level: 1,
      })
      if (profileError && profileError.code !== '23505') {
        setError(
          profileError.message?.toLowerCase().includes('username')
            ? 'That username is taken. Try another.'
            : authErrorCopy(profileError.message),
        )
        setLoading(false)
        return
      }
    }
    setLoading(false)
    track('signed_up')
    // With a session the root layout takes you straight in; otherwise say what happens next.
    if (!data.session) setCreated(true)
  }

  if (created) {
    return (
      <AuthScreen title="You’re in" lead="Your account is ready. Sign in and pick your first quest.">
        <PrimaryButton label="Sign in" onPress={toSignIn} />
        <Body tone="soft">If we emailed you a confirmation link, open it first.</Body>
      </AuthScreen>
    )
  }

  return (
    <AuthScreen title="Create an account" lead="One account, one city. Your username shows on the rankings.">
      <Field
        label="Username"
        value={username}
        onChangeText={setUsername}
        autoComplete="username-new"
        textContentType="username"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => emailRef.current?.focus()}
      />
      <Field
        label="Email"
        inputRef={emailRef}
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
        hint="At least 8 characters."
        inputRef={passwordRef}
        value={password}
        onChangeText={setPassword}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={handleSignUp}
      />

      <FormError message={error} />

      <PrimaryButton
        label="Create account"
        busyLabel="Creating account…"
        busy={loading}
        onPress={handleSignUp}
      />

      <LinkRow lead="Already playing?" action="Sign in" onPress={toSignIn} />
    </AuthScreen>
  )
}
