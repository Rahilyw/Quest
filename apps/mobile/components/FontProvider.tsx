import { useEffect, useState, type ReactNode } from 'react'
import { useFonts } from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'

SplashScreen.preventAutoHideAsync().catch(() => {})

export function FontProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)

  const [loaded, fontError] = useFonts({
    BispoNova: require('../assets/fonts/BispoNova-Regular.otf'),
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
