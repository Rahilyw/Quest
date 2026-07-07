# Spec 04 — Analytics Instrumentation

**Status:** Draft → **Implemented in mobile** (dashboards still manual in PostHog UI)
**Depends on:** nothing (ship before or alongside anything else)
**Priority:** P0 before launch — the pilot's entire purpose is learning, and today there are zero instruments

## Summary

PRODUCT.md defines the success metrics (WAU retention after first quest, week-2 leaderboard return, sponsor renewal rate, average XP per MAU) but nothing in the codebase measures them. This spec adds PostHog (free tier) with a small, deliberate event schema — roughly a day of work that makes every other launch decision measurable.

## 1. Stack

- **Mobile:** `posthog-react-native` initialised in the root `_layout.tsx` provider tree.
- **Wrapper:** `apps/mobile/lib/analytics.ts` — a thin `track(event, props)` / `identify(userId, traits)` module. No-ops when `EXPO_PUBLIC_POSTHOG_KEY` is unset, so dev/CI runs never emit events and the dependency is trivially removable.
- **Admin:** no client analytics in v1 (one operator). Sponsor-facing numbers come from the database (Spec 07), not PostHog.
- **Identity:** `identify(profile.id)` on sign-in with traits `{ city, level, created_at }`. Reset on sign-out. No email/username sent as traits — the profile id is enough to join against the DB when needed.

## 2. Event schema (keep it under ~15 events)

| Event | Properties | Answers |
|---|---|---|
| `onboarding_completed` | `city` | Activation funnel top |
| `signed_up` | — | Cohort anchor |
| `quest_viewed` | `quest_id`, `category`, `is_sponsored`, `source` (explore/map/feed) | What content pulls |
| `quest_started` | `quest_id` | Intent (opened submit screen) |
| `submission_blocked` | `quest_id`, `reason` (outside_zone/no_photo/no_gps/rate_limited) | Where the funnel leaks |
| `proof_submitted` | `quest_id`, `category`, `gps_accuracy`, `is_sponsored` | Core action |
| `completion_verified` | `quest_id`, `xp`, `instant` (bool) | Reward delivery (with Spec 02, `instant: true`) |
| `celebration_viewed` | `level_up` (bool), `streak` | Reward moment quality |
| `feed_viewed` | `post_count` | Social surface engagement |
| `post_reported` | `reason` | Moderation load (Spec 03) |
| `leaderboard_viewed` | `own_rank` | Week-2 return signal |
| `badge_unlocked` | `badge_name` | Progression depth |
| `streak_extended` / `streak_broken` | `length` | Retention mechanic health |
| `redemption_code_viewed` | `quest_id`, `sponsor_name` | Sponsor loop top |
| `share_completed` | `surface` (recap/quest) | Growth loop (Spec 06) |

Time-to-first-XP is **derived**, not an event: `completion_verified` (first) minus `signed_up`, per user. Target: median under 24 hours; the Spec 06 starter-quest work aims at under 5 minutes.

## 3. Dashboards (PostHog, built once)

1. **Activation funnel:** signed_up → quest_viewed → quest_started → proof_submitted → completion_verified.
2. **WAU retention after first quest** — retention insight, cohort = users with ≥1 `completion_verified`.
3. **Week-2 leaderboard return** — returning `leaderboard_viewed` in the week after first appearance.
4. **Content leaderboard** — `quest_viewed` → `proof_submitted` conversion per quest; feeds the weekly-drop decisions (Spec 05).

## 4. Privacy

- Add an analytics line to `legal/privacy.tsx` (product analytics, no ad tracking, EU/US host named).
- Respect a future settings toggle; v1 ships without one but the wrapper exposes `optOut()` so it's a one-line settings addition.
- No photo URLs, GPS coordinates (beyond accuracy), or free text in event properties.

## 5. Non-goals

Session replay, A/B testing, admin-side analytics, server-side event forwarding. Add only when a dashboard question demands them.
