import { useEffect, type ReactNode } from 'react'
import { PostHogProvider, usePostHog } from 'posthog-react-native'
import { setAnalyticsClient } from '@/lib/analytics'
import { applyAnalyticsPreference } from '@/lib/analyticsPreference'
import { publicKey } from '@/lib/publicKey'

const API_KEY = publicKey(process.env.EXPO_PUBLIC_POSTHOG_KEY)
const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com'

function AnalyticsBridge({ children }: { children: ReactNode }) {
  const posthog = usePostHog()

  useEffect(() => {
    setAnalyticsClient(posthog)
    // Honour a saved opt-out before anything else is captured.
    void applyAnalyticsPreference()
    return () => setAnalyticsClient(null)
  }, [posthog])

  return children
}

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  if (!API_KEY) return <>{children}</>

  return (
    <PostHogProvider
      apiKey={API_KEY}
      options={{
        host: HOST,
        // No IP-derived location on any event (security review C-9).
        disableGeoip: true,
        captureAppLifecycleEvents: true,
      }}
      autocapture={false}
    >
      <AnalyticsBridge>{children}</AnalyticsBridge>
    </PostHogProvider>
  )
}
