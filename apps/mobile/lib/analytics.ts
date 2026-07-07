import type PostHog from 'posthog-react-native'
import type { PostHogEventProperties } from '@posthog/core'

let client: PostHog | null = null
let optedOut = false

export type AnalyticsEvent =
  | 'onboarding_completed'
  | 'signed_up'
  | 'quest_viewed'
  | 'quest_started'
  | 'submission_blocked'
  | 'proof_submitted'
  | 'completion_verified'
  | 'celebration_viewed'
  | 'feed_viewed'
  | 'post_reported'
  | 'leaderboard_viewed'
  | 'badge_unlocked'
  | 'streak_extended'
  | 'streak_broken'
  | 'redemption_code_viewed'
  | 'share_completed'
  | 'account_deleted'

export type QuestSource = 'explore' | 'map' | 'feed' | 'deep_link' | 'unknown'

export type SubmissionBlockReason =
  | 'outside_zone'
  | 'no_photo'
  | 'no_gps'
  | 'rate_limited'
  | 'mock_location'
  | 'already_completed'

export function setAnalyticsClient(next: PostHog | null): void {
  client = next
}

export function isAnalyticsEnabled(): boolean {
  return client != null && !optedOut
}

export function track(event: AnalyticsEvent, properties?: PostHogEventProperties): void {
  if (!client || optedOut) return
  client.capture(event, properties)
}

export function identify(
  userId: string,
  traits?: { city?: string; level?: number; created_at?: string }
): void {
  if (!client || optedOut) return
  client.identify(userId, traits)
}

export function resetAnalytics(): void {
  if (!client) return
  client.reset()
}

export function optOutAnalytics(): void {
  optedOut = true
  client?.optOut()
}

export function optInAnalytics(): void {
  optedOut = false
  client?.optIn()
}
