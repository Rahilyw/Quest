import { useEffect, type ReactNode } from 'react'
import { PostHogProvider, usePostHog } from 'posthog-react-native'
import { setAnalyticsClient } from '@/lib/analytics'

const API_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY
const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com'

function AnalyticsBridge({ children }: { children: ReactNode }) {
  const posthog = usePostHog()

  useEffect(() => {
    setAnalyticsClient(posthog)
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
        captureAppLifecycleEvents: true,
      }}
      autocapture={false}
    >
      <AnalyticsBridge>{children}</AnalyticsBridge>
    </PostHogProvider>
  )
}
