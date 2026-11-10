import { useRef, useState } from 'react'
import { type TextInput } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { AuthScreen, Field, FormError, PrimaryButton, authErrorCopy } from '@/components/auth/AuthKit'

export default function ResetPassword() {
  const router = useRouter()
  const confirmRef = useRef<TextInput>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleUpdatePassword() {
    if (password.length < 8) {
      setError('That password is too short. Use at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Those two passwords don’t match. Type them again.')
      return
    }

    setError(null)
    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) {
      setError(authErrorCopy(updateError.message))
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <AuthScreen title="Password updated" lead="Use the new one next time you sign in.">
        <PrimaryButton label="Continue" onPress={() => router.replace('/(auth)/sign-in')} />
      </AuthScreen>
    )
  }

  return (
    <AuthScreen title="Choose a new password" lead="At least 8 characters.">
      <Field
        label="New password"
        secure
        value={password}
        onChangeText={setPassword}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => confirmRef.current?.focus()}
      />
      <Field
        label="Confirm password"
        secure
        inputRef={confirmRef}
        value={confirm}
        onChangeText={setConfirm}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={handleUpdatePassword}
      />
      <FormError message={error} />
      <PrimaryButton label="Update password" busyLabel="Saving…" busy={loading} onPress={handleUpdatePassword} />
    </AuthScreen>
  )
}
