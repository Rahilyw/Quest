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
  | 'post_liked'
  | 'post_unliked'
  | 'comment_created'
  | 'comment_deleted'
  | 'comment_reported'
  | 'profile_opened'
  | 'user_followed'
  | 'user_unfollowed'
  | 'user_blocked'
  | 'user_unblocked'
  | 'notifications_viewed'
  | 'notification_opened'
  | 'weekly_drop_seen'
  | 'suggestion_submitted'
  | 'recap_viewed'
  | 'proof_queued'
  | 'proof_queue_sent'
  | 'proof_queue_dropped'
  | 'xp_boost_seen'
  | 'feedback_sent'
  | 'party_created'
  | 'party_joined'
  | 'party_expired'
  | 'duo_completed'

export type QuestSource =
  | 'explore'
  | 'this-week'
  | 'starter'
  | 'quests'
  | 'map'
  | 'profile'
  | 'feed'
  | 'deep_link'
  | 'unknown'

const QUEST_SOURCES: readonly QuestSource[] = [
  'explore',
  'this-week',
  'starter',
  'quests',
  'map',
  'profile',
  'feed',
  'deep_link',
]

/** Maps a `?source=` route param to a known source. `first-quest` is the old starter-card value. */
export function questSourceFromParam(param: string | string[] | undefined): QuestSource {
  const value = Array.isArray(param) ? param[0] : param
  if (value === 'first-quest') return 'starter'
  return QUEST_SOURCES.find((s) => s === value) ?? 'unknown'
}

export type SubmissionBlockReason =
  | 'outside_zone'
  | 'no_photo'
  | 'no_gps'
  | 'rate_limited'
  | 'party_required'
  | 'mock_location'
  | 'already_completed'

/** Duo pair finished; `referral` when either account was under 48 h old. */
export function trackDuoCompleted(props: { quest_id: string; referral: boolean }): void {
  track('duo_completed', props)
}

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

/** Props for `completion_verified`: xp is the server award when known. No free text. */
export type CompletionVerifiedProps = {
  quest_id: string
  xp: number
  xp_multiplier?: number
  xp_reason?: string | null
  instant?: boolean
  queued?: boolean
}

export function trackCompletionVerified(props: CompletionVerifiedProps): void {
  const { xp_reason, xp_multiplier, ...rest } = props
  const properties: PostHogEventProperties = { ...rest }
  if (xp_multiplier != null) properties.xp_multiplier = xp_multiplier
  if (xp_reason) properties.xp_reason = xp_reason
  track('completion_verified', properties)
}

/** Banner / "2x today" impression. `kind` is weekend | quest | win_back only. */
export function trackXpBoostSeen(kind: 'weekend' | 'quest' | 'win_back'): void {
  track('xp_boost_seen', { kind })
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
