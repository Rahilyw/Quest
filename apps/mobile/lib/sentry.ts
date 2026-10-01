import * as Sentry from '@sentry/react-native'
import { publicKey } from '@/lib/publicKey'

export function initSentry(): void {
  const dsn = publicKey(process.env.EXPO_PUBLIC_SENTRY_DSN)
  if (!dsn || __DEV__) return

  Sentry.init({
    dsn,
    enableAutoSessionTracking: true,
    tracesSampleRate: 0.2,
  })
}

export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (__DEV__) return
  Sentry.captureException(error, context ? { extra: context } : undefined)
}
