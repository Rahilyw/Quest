import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { getOnboardingCity } from '@/lib/onboarding'
import { APP_NAME } from '@/lib/constants'

export default function SignUp() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignUp() {
    if (!username.trim()) {
      Alert.alert('Error', 'Username is required')
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
      Alert.alert('Error', error.message)
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
        Alert.alert('Error', profileError.message)
        setLoading(false)
        return
      }
    }
    setLoading(false)
    Alert.alert('Account created!', 'You can now sign in.', [
      { text: 'OK', onPress: () => router.back() },
    ])
  }

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.logo}>{APP_NAME}</Text>
        <Text style={styles.tagline}>Join the city challenge.</Text>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Username"
        placeholderTextColor="#94A3B8"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#94A3B8"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#94A3B8"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleSignUp} disabled={loading} activeOpacity={0.85}>
        <Text style={styles.buttonText}>{loading ? 'Creating account…' : 'Create Account'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()}>
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
  logo: {
    fontSize: 52,
    fontWeight: '800',
    color: '#4364F7',
    letterSpacing: -1,
    marginBottom: 6,
  },
  tagline: { color: '#94A3B8', fontSize: 16 },
  input: {
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    fontSize: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(15,23,42,0.07)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  button: {
    backgroundColor: '#4364F7',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    shadowColor: '#4364F7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  link: { color: '#4364F7', textAlign: 'center', fontWeight: '600' },
})
