# Privacy labels: App Store and Google Play

**Card:** K2, build 3. **Written:** Nov 25, 2026, from the code on `claude/b3-k2-review`
(base `3c332b9`).
**Use:** answer App Store Connect → App Privacy and Play Console → Data safety from the tables
below. Each row cites the file that proves it. Rows marked **Check** are uncertain; §5 says what
would settle them.

Re-check this file when any of these land: N4 photo pre-screen (sends proof photos to a vision
provider), N0 new analytics events, duo quests (045), or an analytics opt-out toggle.

---

## 1. What the app collects

"Linked" means the data is stored against the player's account or sent with their profile id.

| # | Data | What exactly | When | Where it goes | Linked | Proof |
|---|---|---|---|---|---|---|
| 1 | Email address | Sign-in email | Sign-up | Supabase Auth | Yes | `app/(auth)/sign-up.tsx`, `sign-in.tsx` |
| 2 | Username | Public handle, 3–20 chars | Sign-up, Edit profile | `profiles.username`, shown on Rankings, City and profiles | Yes | `app/(auth)/sign-up.tsx`, `app/edit-profile.tsx` |
| 3 | Account id | Supabase user UUID (`profiles.id`) | Sign-up | Supabase; sent to PostHog as the distinct id | Yes | `hooks/useAuth.tsx` (`identify(data.id, …)`) |
| 4 | Avatar | Photo from the library | Edit profile, optional | Public `avatars` bucket | Yes | `app/edit-profile.tsx` (`getPublicUrl`) |
| 5 | Proof photo | In-app camera, back lens | Every quest submission | Public `proof-photos` bucket, `completions.photo_url`; shown on City unless the player turns off "Show my photos on City" | Yes | `lib/submitCompletion.ts` (`getPublicUrl`), `app/settings.tsx` |
| 6 | Selfie | In-app camera, front lens, optional | After the proof photo | Private `proof-selfies` bucket, signed URLs for the owner only | Yes | `app/submit/[questId].tsx`, `lib/selfieUrl.ts`, migration 033 |
| 7 | Precise location at submit | Latitude, longitude, GPS accuracy at the shutter press | Every submission (quest coordinates are sent instead if there's no fix on a `none` quest) | `completions.lat`, `lng`, `gps_accuracy`; not readable by other players (migration 038 column grants) | Yes | `lib/submissionAttempt.js`, `lib/submitCompletion.ts`, `supabase/migrations/038_completion_secret_columns.sql` |
| 8 | Location on the phone only | Current position | This week sort, quest page zone check | Never leaves the phone | n/a | `hooks/useThisWeek.ts` (`loadPosition` → `pickThisWeek`), `app/quest/[id].tsx` |
| 9 | Suggestion pin | A map pin, which can be "Use my location" | Suggest a quest, optional | `quest_suggestions.lat`, `lng` | Yes | `app/suggest-quest.tsx` |
| 10 | Push token | Expo push token | After sign-in if notifications are allowed | `profiles.push_token` (hidden from other clients by 039); Expo's push service | Yes | `lib/notifications.ts`, `supabase/migrations/039_profile_push_token_privacy.sql` |
| 11 | Gameplay | Completions, XP, level, streak, badges, sticker placements, redemption codes | Play | Supabase | Yes | migrations 017, 019–021, 036, 043, 044 |
| 12 | Social | Follows, likes, blocks | Play | Supabase | Yes | migration 027, `components/FeedBubble.tsx` |
| 13 | Text the player writes | Comments, quest suggestions (title, description), report reasons and details | Play | Supabase | Yes | `components/CommentsSheet.tsx`, `app/suggest-quest.tsx`, `components/ReportPostSheet.tsx` |
| 14 | Product analytics | The events in `lib/analytics.ts` (Spec 04): ids, categories, counts, reasons, `gps_accuracy` as a number. No coordinates, photos, usernames or free text | Throughout, when `EXPO_PUBLIC_POSTHOG_KEY` is set | PostHog (US) | Yes (`identify` with the account id and traits `city`, `level`, `created_at`) | `lib/analytics.ts`, `components/AnalyticsProvider.tsx`, `hooks/useAuth.tsx`, `docs/specs/04-analytics-instrumentation.md` |
| 15 | App lifecycle events | Installed, updated, opened, became active, backgrounded | Automatic | PostHog | Yes | `components/AnalyticsProvider.tsx` (`captureAppLifecycleEvents: true`) |
| 16 | Device and app properties | PostHog's default properties: OS, app version, device model, locale, screen size, an anonymous id before sign-in. **Check:** IP-based GeoIP | Every event | PostHog | Yes | `posthog-react-native` defaults |
| 17 | Crash data | Stack traces, breadcrumbs, device and OS context | On a crash or error (production builds with a DSN only) | Sentry | No: the app never calls `Sentry.setUser`. **Check** | `lib/sentry.ts`, `components/ErrorBoundary.tsx` |
| 18 | Performance data | Traces at a 20% sample, session health | Production builds with a DSN | Sentry | No. **Check** | `lib/sentry.ts` (`tracesSampleRate: 0.2`, `enableAutoSessionTracking: true`) |
| 19 | In-app feedback | Free text up to 1000 characters, app version and device model tags, an optional crash event id | Settings → Send feedback, or after a crash | Sentry user feedback | No (no user id attached; the text itself could identify someone) | `components/FeedbackSheet.tsx`, `lib/sentry.ts` (`captureFeedback`), `lib/feedback.js` |
| 20 | Update check id | `expo-updates` sends a per-install client id with update requests. **Check** | App start | Expo (EAS Update) | No | `app.json` (`expo-updates`, `updates.url`) |

Not collected: real name, phone number, address, contacts, health or fitness data, payment or
purchase data, browsing or search history, audio, sensitive information, advertising id. There
are no ads, no in-app purchases and no data sales. The app doesn't ask for App Tracking
Transparency because it doesn't track.

---

## 2. App Store Connect → App Privacy

**Data used to track you: none.** Nothing is combined with other companies' data for ads or
shared with data brokers. PostHog and Sentry are service providers on our behalf.

### Data linked to you

| Apple category → type | Rows | Purposes |
|---|---|---|
| Contact Info → Email Address | 1 | App Functionality |
| Identifiers → User ID | 2, 3 | App Functionality, Analytics |
| Identifiers → Device ID | 10 (push token), 16 (PostHog anonymous id) | App Functionality, Analytics. **Check** (§5.3) |
| Location → Precise Location | 7, 9 | App Functionality |
| Location → Coarse Location | 7 when the player turns off Precise Location in iOS; 16 if PostHog keeps IP GeoIP | App Functionality; Analytics only if GeoIP stays on. **Check** (§5.1) |
| User Content → Photos or Videos | 4, 5, 6 | App Functionality |
| User Content → Gameplay Content | 11 | App Functionality |
| User Content → Other User Content | 12, 13 | App Functionality |
| Usage Data → Product Interaction | 14, 15 | Analytics |

### Data not linked to you

| Apple category → type | Rows | Purposes |
|---|---|---|
| Diagnostics → Crash Data | 17 | App Functionality |
| Diagnostics → Performance Data | 18 | App Functionality |
| Diagnostics → Other Diagnostic Data | 19 tags, 20 | App Functionality |
| User Content → Customer Support | 19 | App Functionality |

If you'd rather not argue the Sentry rows, declaring Diagnostics and Customer Support as
**linked** is always allowed. Declaring something as not linked when it is linked isn't.

Don't select Developer's Advertising or Marketing. The in-app privacy policy says email may be
used "for occasional product updates if you opt in", but there's no opt-in anywhere in the app
(see k2.md P1-3).

---

## 3. Google Play → Data safety

**Overview answers**

- Does your app collect or share any of the required user data types? **Yes.**
- Is all of the user data collected by your app encrypted in transit? **Yes.** Supabase, PostHog,
  Sentry and Expo are all HTTPS.
- Do you provide a way for users to request that their data is deleted? **Yes:** in the app
  (Settings → Delete account). Play also wants a **web link** for deletion requests. There
  isn't one yet (k2.md P2-4).
- Shared: **no data is shared.** Transfers to service providers that process data on your behalf
  (PostHog, Sentry, Expo push) don't count as sharing. **Check** (§5.4) for posts shown to other
  players.

**Data types**

| Play category → type | Rows | Collected | Required or optional | Purposes |
|---|---|---|---|---|
| Location → Approximate location | 7 when only approximate is granted (`ACCESS_COARSE_LOCATION`); 16 if GeoIP stays on | Yes | Optional | App functionality; Analytics only if GeoIP stays on |
| Location → Precise location | 7, 9 | Yes | Optional (the starter quest and browsing work without it) | App functionality |
| Personal info → Email address | 1 | Yes | Required | Account management, App functionality |
| Personal info → User IDs | 2, 3 | Yes | Required | Account management, App functionality, Analytics |
| Photos and videos → Photos | 4, 5, 6 | Yes | Required (a quest can't be finished without a proof photo; avatar and selfie are optional) | App functionality |
| App activity → App interactions | 14, 15 | Yes | Required (there's no opt-out yet, Spec 04 §4) | Analytics |
| App activity → Other user-generated content | 12, 13, 19 | Yes | Optional | App functionality; Developer communications for 19 |
| App info and performance → Crash logs | 17 | Yes | Required | App functionality, Analytics |
| App info and performance → Diagnostics | 18, 19 tags | Yes | Required | App functionality, Analytics |
| Device or other IDs | 10, 16, 20 | Yes | Required (push token: optional, only if notifications are allowed) | App functionality, Analytics |

Row 8 (position used only on the phone) isn't "collected" under Play's definition because it
never leaves the device.

Not collected on Play's list: financial info, health and fitness, messages (comments are public
user-generated content, not private messages), audio, files and docs, calendar, contacts, web
browsing, installed apps.

---

## 4. Privacy policy gaps

The labels above have to match the privacy policy. `app/legal/privacy.tsx` (last updated July 6,
2026) is behind the app. It belongs to card N4, so K2 doesn't edit it. What it gets wrong or
leaves out:

- It says proof photos "sit in a private bucket; only you and admins" can see them. The
  `proof-photos` bucket is public (`getPublicUrl` in `lib/submitCompletion.ts`) and photos show
  on City unless the player turns that off.
- It says the zone is "within about 300 metres of the spot". Radii vary per quest, and some
  quests use polygons or several areas.
- It doesn't mention selfies, avatars, the push token, Sentry crash reports, in-app feedback,
  quest suggestions, comments, follows or likes.
- It says email is used for product updates "if you opt in". There's no opt-in.
- It doesn't say how to delete an account in the app.
- The contact email and the web policy use the `quest.app` domain. Confirm you control it
  (k2.md P1-3).

---

## 5. Open questions

1. **PostHog IP and GeoIP.** PostHog derives city-level location from the request IP unless the
   project's "Discard client IP data" setting is on. Turn it on (runbook Step 2) and Coarse
   Location goes back to being App Functionality only.
2. **Sentry breadcrumbs.** Network breadcrumbs can include Supabase request URLs, and some carry
   a user id as a filter (for example `profiles?id=eq.…`). That makes "not linked" arguable.
   Either strip URLs in a `beforeBreadcrumb` hook or declare Diagnostics as linked.
3. **Push token as Device ID.** Apple's Device ID type is about device-level ids. An Expo push
   token is per app install. Declaring it is the safe answer.
4. **Public posts on Play.** Showing a player's photo to other players at their request isn't a
   transfer to a third party, so it isn't sharing on Play's definition. If the Play console's
   help text says otherwise when you fill it in, mark Photos as shared for App functionality.
5. **`expo-updates` client id.** Expo's update requests send a per-install id for EAS Insights.
   If you'd rather not declare it, check Expo's current docs for whether it can be turned off.
