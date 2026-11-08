import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { BrandText } from '@/components/BrandText'
import { COLORS } from '@/lib/constants'

// Dev-only one-tap sign-in. Credentials come from apps/mobile/.env (gitignored);
// the whole feature is gated on __DEV__ so it never ships in release builds.
const DEMO_EMAIL = __DEV__ ? process.env.EXPO_PUBLIC_DEMO_EMAIL : undefined
const DEMO_PASSWORD = __DEV__ ? process.env.EXPO_PUBLIC_DEMO_PASSWORD : undefined

export default function SignIn() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function signInWith(creds: { email: string; password: string }) {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword(creds)
    if (error) Alert.alert('Couldn\'t sign in', error.message)
    setLoading(false)
  }

  const handleSignIn = () => signInWith({ email, password })

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <BrandText size="logo" style={styles.logo} />
        <Text style={styles.tagline}>Real life, gamified.</Text>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#94A3B8"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        accessibilityLabel="Email address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#94A3B8"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        accessibilityLabel="Password"
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleSignIn}
        disabled={loading}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={loading ? 'Signing in' : 'Sign in'}
        accessibilityState={{ disabled: loading }}
      >
        <Text style={styles.buttonText}>{loading ? 'Signing in…' : 'Sign In'}</Text>
      </TouchableOpacity>

      {DEMO_EMAIL && DEMO_PASSWORD ? (
        <TouchableOpacity
          style={styles.demoButton}
          onPress={() => signInWith({ email: DEMO_EMAIL, password: DEMO_PASSWORD })}
          disabled={loading}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Demo sign in"
        >
          <Text style={styles.demoButtonText}>Demo sign in (dev only)</Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity
        onPress={() => router.push('/(auth)/forgot-password')}
        accessibilityRole="link"
        accessibilityLabel="Forgot password"
      >
        <Text style={styles.link}>Forgot password?</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push('/(auth)/sign-up')}
        accessibilityRole="link"
        accessibilityLabel="Create an account"
      >
        <Text style={styles.link}>Don't have an account? Sign up</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F9FF',
    padding: 24,
    justifyContent: 'center',
  },
  hero: { alignItems: 'center', marginBottom: 48 },
  logo: { marginBottom: 6 },
  tagline: { color: '#94A3B8', fontSize: 16 },
  input: {
    backgroundColor: COLORS.surface,
    color: COLORS.textPrimary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    fontSize: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(15,23,42,0.07)',
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonText: { color: COLORS.surface, fontWeight: '700', fontSize: 16 },
  demoButton: {
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: COLORS.primary,
  },
  demoButtonText: { color: COLORS.primary, fontWeight: '700', fontSize: 15 },
  link: { color: COLORS.primary, textAlign: 'center', fontWeight: '600', marginBottom: 8 },
})
