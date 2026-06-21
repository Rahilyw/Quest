import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { passwordResetRedirectUrl } from '@/lib/auth-linking'
import { APP_NAME, COLORS } from '@/lib/constants'

export default function ForgotPassword() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSendReset() {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) {
      Alert.alert('Error', 'Enter your email address')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: passwordResetRedirectUrl(),
    })
    setLoading(false)

    if (error) {
      Alert.alert('Error', error.message)
      return
    }

    setSent(true)
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.hero}>
        <Text style={styles.logo}>{APP_NAME}</Text>
        <Text style={styles.tagline}>Reset your password</Text>
      </View>

      {sent ? (
        <View style={styles.sentBox}>
          <Text style={styles.sentTitle}>Check your email</Text>
          <Text style={styles.sentBody}>
            If an account exists for {email.trim()}, we sent a reset link. Open it on this
            device to choose a new password.
          </Text>
          <TouchableOpacity style={styles.button} onPress={() => router.replace('/(auth)/sign-in')}>
            <Text style={styles.buttonText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#94A3B8"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <TouchableOpacity
            style={styles.button}
            onPress={handleSendReset}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>{loading ? 'Sending…' : 'Send Reset Link'}</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F9FF', padding: 24, justifyContent: 'center' },
  back: { position: 'absolute', top: 56, left: 24 },
  backText: { color: COLORS.accent, fontWeight: '600', fontSize: 16 },
  hero: { alignItems: 'center', marginBottom: 40 },
  logo: { fontSize: 52, fontWeight: '800', color: '#4364F7', letterSpacing: -1, marginBottom: 6 },
  tagline: { color: '#94A3B8', fontSize: 16, textAlign: 'center' },
  input: {
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    fontSize: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(15,23,42,0.07)',
  },
  button: {
    backgroundColor: '#4364F7',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  sentBox: { alignItems: 'center' },
  sentTitle: { color: '#0F172A', fontSize: 20, fontWeight: '800', marginBottom: 12 },
  sentBody: { color: '#64748B', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
})
