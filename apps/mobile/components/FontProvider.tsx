import { useEffect, useState, type ReactNode } from 'react'
import { useFonts, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk'
import * as SplashScreen from 'expo-splash-screen'

SplashScreen.preventAutoHideAsync().catch(() => {})

export function FontProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)

  const [loaded, fontError] = useFonts({
    Pilowlava: require('../assets/fonts/Pilowlava-Regular.otf'),
    PilowlavaAtome: require('../assets/fonts/Pilowlava-Atome.otf'),
    SpaceGrotesk_700Bold,
  })

  useEffect(() => {
    if (loaded || fontError) {
      SplashScreen.hideAsync().catch(() => {})
      setReady(true)
    }
  }, [loaded, fontError])

  if (!ready) return null

  return <>{children}</>
}
