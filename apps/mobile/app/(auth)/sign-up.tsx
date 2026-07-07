import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { getOnboardingCity } from '@/lib/onboarding'
import { BrandText } from '@/components/BrandText'
import { APP_NAME, COLORS } from '@/lib/constants'
import { track } from '@/lib/analytics'

export default function SignUp() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignUp() {
    if (!username.trim()) {
      Alert.alert('Username required', 'Choose a username to get started.')
      return
    }
    setLoading(true)
    const trimmedUsername = username.trim().toLowerCase()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username: trimmedUsername } },
    })
    if (error) {
      Alert.alert('Account creation failed', error.message)
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
        Alert.alert('Setup error', profileError.message)
        setLoading(false)
        return
      }
    }
    setLoading(false)
    track('signed_up')
    Alert.alert('Welcome to Quest!', 'Your account is ready. Sign in to start exploring.', [
      { text: 'Sign In', onPress: () => router.back() },
    ])
  }

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <BrandText size="logo" style={styles.logo} />
        <Text style={styles.tagline}>Join the city challenge.</Text>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Username"
        placeholderTextColor="#94A3B8"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        accessibilityLabel="Username"
      />
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
        onPress={handleSignUp}
        disabled={loading}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={loading ? 'Creating account' : 'Create account'}
        accessibilityState={{ disabled: loading }}
      >
        <Text style={styles.buttonText}>{loading ? 'Creating account…' : 'Create Account'}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.back()}
        accessibilityRole="link"
        accessibilityLabel="Sign in to existing account"
      >
        <Text style={styles.link}>Already have an account? Sign in</Text>
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
  hero: { alignItems: 'center', marginBottom: 40 },
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
  link: { color: COLORS.primary, textAlign: 'center', fontWeight: '600' },
})
