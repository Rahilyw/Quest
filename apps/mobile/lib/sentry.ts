import * as Application from 'expo-application'
import * as Device from 'expo-device'
import * as Sentry from '@sentry/react-native'
import { clampFeedbackMessage } from '@/lib/feedback'
import { publicKey } from '@/lib/publicKey'
import { scrubBreadcrumb, scrubEvent } from '@/lib/sentryScrub'

let sentryEnabled = false

export function initSentry(): void {
  const dsn = publicKey(process.env.EXPO_PUBLIC_SENTRY_DSN)
  if (!dsn || __DEV__) {
    sentryEnabled = false
    return
  }

  Sentry.init({
    dsn,
    enableAutoSessionTracking: true,
    tracesSampleRate: 0.2,
    // Strip query strings, auth fragments and storage paths (security review C-11).
    beforeBreadcrumb: scrubBreadcrumb,
    beforeSend: scrubEvent,
  })
  sentryEnabled = true
}

/** True only after a production init with a real DSN (owner step O8). */
export function isFeedbackAvailable(): boolean {
  return sentryEnabled
}

export function captureException(error: unknown, context?: Record<string, unknown>): string | undefined {
  if (!sentryEnabled) return undefined
  return Sentry.captureException(error, context ? { extra: context } : undefined)
}

export type FeedbackSendResult = 'sent' | 'unavailable' | 'failed'

/**
 * Sends user feedback through Sentry. Returns 'unavailable' when Sentry was
 * never initialised (no DSN / __DEV__), so the UI can stay up without crashing.
 */
export function sendFeedback(message: string, eventId?: string): FeedbackSendResult {
  if (!sentryEnabled) return 'unavailable'

  const trimmed = clampFeedbackMessage(message).trim()
  if (!trimmed) return 'failed'

  try {
    Sentry.captureFeedback({
      message: trimmed,
      associatedEventId: eventId,
      tags: {
        app_version: Application.nativeApplicationVersion ?? 'unknown',
        device_model: Device.modelName ?? Device.modelId ?? 'unknown',
      },
    })
    return 'sent'
  } catch {
    return 'failed'
  }
}
