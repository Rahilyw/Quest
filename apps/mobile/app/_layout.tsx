import { useEffect, useState } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import { registerForPushNotifications } from '@/lib/notifications'
import { hasCompletedOnboarding } from '@/lib/onboarding'
import { subscribeToAuthDeepLinks } from '@/lib/auth-linking'
import { supabase } from '@/lib/supabase'

function RootLayoutNav() {
  const { session, loading } = useAuth()
  const router = useRouter()
  const segments = useSegments()
  const [onboardingChecked, setOnboardingChecked] = useState(false)
  const [hasOnboarded, setHasOnboarded] = useState(false)

  const authScreen = (segments as string[])[1] as string | undefined
  const isPasswordRecoveryScreen =
    authScreen === 'reset-password' || authScreen === 'forgot-password'

  useEffect(() => {
    return subscribeToAuthDeepLinks(() => {
      router.push('/(auth)/reset-password')
    })
  }, [router])

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        router.push('/(auth)/reset-password')
      }
    })
    return () => listener.subscription.unsubscribe()
  }, [router])

  useEffect(() => {
    hasCompletedOnboarding().then((complete) => {
      setHasOnboarded(complete)
      setOnboardingChecked(true)
    })
  }, [])

  useEffect(() => {
    const inOnboarding = segments[0] === 'onboarding'
    if (!inOnboarding && onboardingChecked) {
      hasCompletedOnboarding().then(setHasOnboarded)
    }
  }, [segments[0], onboardingChecked])

  useEffect(() => {
    if (!session?.user.id) return
    registerForPushNotifications(session.user.id)
  }, [session?.user.id])

  useEffect(() => {
    if (loading || !onboardingChecked) return

    const inAuthGroup = segments[0] === '(auth)'
    const inOnboarding = segments[0] === 'onboarding'

    if (!hasOnboarded && !inOnboarding) {
      router.replace('/onboarding')
      return
    }

    if (hasOnboarded && !session && !inAuthGroup && !inOnboarding) {
      router.replace('/(auth)/sign-in')
    } else if (session && inAuthGroup && !isPasswordRecoveryScreen) {
      router.replace('/(tabs)')
    }
  }, [session, loading, onboardingChecked, hasOnboarded, segments])

  return (
    <ErrorBoundary>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="quest/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="submit/[questId]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="settings" options={{ presentation: 'card', headerShown: false }} />
        <Stack.Screen name="edit-profile" options={{ presentation: 'card', headerShown: false }} />
      </Stack>
    </ErrorBoundary>
  )
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </SafeAreaProvider>
  )
}
