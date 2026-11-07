import { useEffect, useState, type ReactNode } from 'react'
import {
  useFonts,
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
  Figtree_800ExtraBold,
} from '@expo-google-fonts/figtree'
import * as SplashScreen from 'expo-splash-screen'

SplashScreen.preventAutoHideAsync().catch(() => {})

/**
 * Loads the two families in docs/design/BRAND.md §4: Figtree for all interface text and
 * Pilowlava for the wordmark only. Font keys match FONT in lib/theme.ts.
 */
export function FontProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)

  const [loaded, fontError] = useFonts({
    Pilowlava: require('../assets/fonts/Pilowlava-Regular.otf'),
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
    Figtree_800ExtraBold,
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
