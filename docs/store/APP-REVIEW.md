# App Review pack

**Card:** K2, build 3. **Written:** Nov 25, 2026, against branch `claude/b3-k2-review`
(base `3c332b9`).
**Use:** you (the owner) paste §1 into App Store Connect → the app → the version →
**App Review Information → Notes**, and fill the sign-in fields from §2. The rest of this file
backs up what the notes claim, with the file that proves each claim.

Related: [PRIVACY-LABELS.md](PRIVACY-LABELS.md), [SCREENSHOTS.md](SCREENSHOTS.md),
[LISTING.md](LISTING.md), runbook [Step 1 → App Review](../../LAUNCH-RUNBOOK.md).

No real password, key or account identifier belongs in this file or anywhere in the repo.
Every credential below is a placeholder.

---

## 1. Notes for the reviewer (paste this)

Edit the two bracketed lines before pasting. Apple's Notes field takes up to 4,000 characters;
this is about 2,300.

```text
Quest! is a weekly city game for Victoria, BC. Players do real things at real places: a
market, a trail, a café. To finish a quest you take a photo inside the quest's zone (a
geofence drawn on a map). The app checks your location on the phone, the server checks it
again, and the XP and any badge land a few seconds later. Nobody approves it by hand.

You're probably not in Victoria, so most quests show how far away their zone is (for example
"1200 km to go, toward the northwest") and their Start quest button is greyed out. That's
expected.

One quest works anywhere: "Write a Journal Entry About Your City". It has no zone. It's the
"Your first quest" card near the top of the This week tab. To try the whole loop:

1. Sign in with the demo account in the sign-in fields.
2. On This week, tap the "Your first quest" card, then Start quest.
3. Allow the camera. Location is optional for this quest: allow it or not, it works either way.
4. Photograph any page or notebook. After the photo, a 3-second countdown takes an optional
   selfie with the front camera. Tap Skip selfie to skip it. Selfies are never shown publicly.
5. The Verified screen shows the XP and any badge earned. The XP also shows on You and on
   Rankings.

Each account can finish a quest once. Submissions are limited to 2 every 10 minutes and 10 a
day.

User-generated content (Guideline 1.2)
- Report a post: City tab, then the "..." button on any post, then Report post.
- Block a player: the same "..." menu, then Block, or open their profile and tap the "..."
  button at the top. Unblock in You > Settings (gear icon) > Privacy > Blocked accounts.
- Report a comment: open a post's comments and tap Report under the comment.
- Reports go to a moderation queue we review. Three reports from different players hide a post
  until we rule on it. Removing a post also removes its XP.
[- We posted one example from a second test account so there's a post to report and a player
  to block.]

Feed privacy
- You > Settings > Privacy > "Show my photos on City" keeps your proof photos off the public
  feed. They still show on your own profile.
[- We've switched it off for the demo account so review photos stay out of the pilot feed.]

Account deletion (Guideline 5.1.1(v))
- You > Settings > Delete account (at the bottom), then confirm. This deletes the account,
  completions, XP, badges and photos.

Location is read only while the app is open: to sort quests by distance, on a quest page, and
when you take a proof photo. There is no background location, no ad tracking and no ads.
Sign-in is email and password only.
```

---

## 2. Demo account (you create it)

Apple needs a working account in **App Review Information → Sign-in required**. The account
can be used once per review round, because each account can finish the starter quest only once
(`unique(user_id, quest_id)` in `supabase/migrations/20260619010246_initial_schema.sql`, and
`app/submit/[questId].tsx` treats an `approved` or `removed` row as already done).

**Never use the dev-only demo account in `apps/mobile/app/(auth)/sign-in.tsx`
(`handleDemoSignIn`).** Its email and password are in the repo, so anyone can sign in as it.

Steps, on a TestFlight or release build pointed at production:

1. Pick an inbox you control for the demo account. A plus-address on your own mailbox is fine.
   Write it down only in your password manager.
2. Open the app, finish onboarding, tap **Get started**, and create the account:
   - Username: something neutral, for example `<DEMO_USERNAME>` such as `quest_review`. It shows
     on Rankings to real Victoria players.
   - Email: `<DEMO_EMAIL>`
   - Password: `<DEMO_PASSWORD>`, a new long random password from your password manager. Don't
     reuse one.
3. If Supabase sends a confirmation email, open the link, then sign in once. Sign-in creates the
   profile if sign-up didn't (`ensureUserProfile` in `apps/mobile/lib/profiles.ts`).
4. **Don't complete the starter quest on this account.** Open This week and check that the
   "Your first quest" card shows. If it doesn't, stop: see §5, check 1.
5. Optional, recommended: You → Settings → Privacy → turn off **Show my photos on City**, so the
   reviewer's photos stay out of the public pilot feed. Keep or delete the matching bracketed
   line in §1.
6. Sign out.
7. In App Store Connect → App Review Information, enter `<DEMO_EMAIL>` and `<DEMO_PASSWORD>`,
   plus a contact name, phone and email for the reviewer to reach you.

**A post to report.** Report and Block only appear on other players' posts
(`components/FeedBubble.tsx`: your own post shows Share instead of the "..." menu). If City has
no other posts, the reviewer can't find the 1.2 controls. Before you submit:

1. With a second account you own (`<NEIGHBOUR_USERNAME>`), finish one real quest in Victoria.
   Photograph a place or an object with no people in it, or only people who've agreed to it.
2. Leave that account's **Show my photos on City** on, so the post shows on City.
3. Keep the bracketed line about the example post in §1.

**After each review round.** Open the admin moderation queue and dismiss any reports the reviewer
filed, so the example post comes back. For the next submission, create a fresh demo account, or
the starter quest will say "You already finished this quest."

---

## 3. Where things are in the app

Every path below was checked in code on this branch.

| What Apple checks | Where it is | Proof |
|---|---|---|
| Report a post (1.2) | City tab → "..." on a post (label "Post options") → **Report post** → pick a reason → send | `components/FeedBubble.tsx`, `components/ReportPostSheet.tsx`, reasons in `lib/moderation.ts` |
| Report a comment (1.2) | A post's comment button → **Report** under a comment | `components/CommentsSheet.tsx` |
| Block a player (1.2) | City → "..." on a post → **Block @username**; or their profile → "..." (label "More options") → **Block @username** | `components/FeedBubble.tsx`, `app/user/[id]/index.tsx` |
| Unblock | You → gear (Settings) → Privacy → **Blocked accounts** | `app/settings.tsx`, `app/blocked-users.tsx` |
| Auto-hide and human review (1.2) | Three distinct open reports hide a post; the admin moderation queue rules on it | `supabase/migrations/018_completion_reports.sql` (posts), `028_comment_reports.sql` (comments), `apps/admin/app/moderation/` |
| Content rules (1.2) | You → Settings → About → **Terms of service** → "Community & objectionable content" | `app/legal/terms.tsx` |
| Feed opt-out | You → Settings → Privacy → **Show my photos on City** | `app/settings.tsx` (`profiles.feed_public`, migration 018) |
| Account deletion (5.1.1(v)) | You → Settings → **Delete account** (below Sign out) → confirm "Delete account" | `app/settings.tsx` → RPC `delete_own_account` (`supabase/migrations/032_quest_cutouts.sql`) |
| Privacy policy | You → Settings → About → **Privacy policy** (in app) and **Privacy policy on the web** | `app/legal/privacy.tsx`, `LEGAL_URLS` in `lib/constants.ts` |
| Contact | Privacy policy → Contact | `app/legal/privacy.tsx` |

Settings has no tab of its own. It opens from the gear button at the top right of the You tab
(`app/(tabs)/profile.tsx`).

---

## 4. Permission purpose strings

These are the strings in `apps/mobile/app.json`, and what the build will show. The Expo config
plugins merge into `ios.infoPlist`: a plugin option wins over `infoPlist`, and a key nobody sets
gets the plugin's generic default (`@expo/config-plugins` `applyPermissions`, read from
`node_modules` on Nov 25). Check the final `Info.plist` in the first EAS build.

| Key | Shown to the player | Set by |
|---|---|---|
| `NSLocationWhenInUseUsageDescription` | "Quest! uses your location to verify quest completions." | `ios.infoPlist` (the `expo-location` plugin has no option set, so it keeps this) |
| `NSCameraUsageDescription` | "Quest! uses your camera for quest proof photos." | `expo-camera` plugin `cameraPermission`. This overrides the `infoPlist` string "Quest! uses your camera to submit quest proof photos." |
| `NSPhotoLibraryUsageDescription` | "Quest! uses your photo library to set your avatar." | Both `ios.infoPlist` and the `expo-image-picker` plugin; they match |
| `NSMicrophoneUsageDescription` | "Allow Quest! to access your microphone" (generic) | Default from `expo-camera` and `expo-image-picker`. The app never records audio. See k2.md P2-3 |
| `NSLocationAlwaysAndWhenInUseUsageDescription`, `NSLocationAlwaysUsageDescription` | "Allow Quest! to access your location" (generic) | Default from `expo-location`. The app never asks for Always. See k2.md P2-3 |
| `NSMotionUsageDescription` | "Allow Quest! to detect your current motion activity" (generic) | Default from `expo-location`. Unused. See k2.md P2-3 |
| `ITSAppUsesNonExemptEncryption` | `false` (no export-compliance question per build) | `ios.infoPlist` |

Android (`android.permissions`): `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `CAMERA`.
`RECORD_AUDIO` is in `blockedPermissions`, and `expo-camera` has `recordAudioAndroid: false`.
No background location on either platform.

When each prompt appears for a new player:

- **Location:** the first time This week loads (`hooks/useThisWeek.ts` `loadPosition`, which only
  sorts quests by distance on the phone), on a quest page with a zone (`app/quest/[id].tsx`),
  and on the camera screen (`hooks/useLocation.ts`). Denying it doesn't block the starter quest.
- **Camera:** on the camera screen, as soon as it opens (`app/submit/[questId].tsx`).
- **Photos:** only when the player picks an avatar in Edit profile (`app/edit-profile.tsx`).
  Proof photos come from the in-app camera only.
- **Notifications:** after sign-in (`app/_layout.tsx` → `registerForPushNotifications`), and from
  the Settings toggle.

---

## 5. Can a new account outside Victoria finish the loop?

Checked in code on Nov 25, 2026. Yes, with the caveats under "Needs checking on hosted data".

1. **Onboarding has no city pick.** `app/onboarding.tsx` is three slides with no picker ("Victoria
   is the only pilot city, so there is no city picker"). `completeOnboarding` stores
   `Victoria, BC` (`lib/onboarding.ts`) and sign-up writes it to `profiles.city`. Nothing reads
   the player's real location to accept or refuse them.
2. **No location gate on the account or the app.** The Victoria boundary is only used for
   `geofence_type = 'city'` quests (`hooks/useGeofenceCheck.ts`, `lib/zoneStatus.ts`) and for
   drawing maps.
3. **This week shows the starter card.** `hooks/useThisWeek.ts` loads active quests, picks the
   one with `is_starter = true`, and shows it only while the player has no completions
   (`playedIds.size === 0`). `app/(tabs)/index.tsx` renders it as "Your first quest … You can do
   this anywhere. Start here." It doesn't depend on the player's position.
4. **The quest page doesn't gate a `none` quest.** `app/quest/[id].tsx` only checks the zone when
   `requiresLocation` is true, and `useGeofenceCheck` returns false for `none`. Start quest is
   enabled while the quest is live.
5. **The camera screen accepts it.** In `app/submit/[questId].tsx` the zone chip reads "No location
   required". If there's no GPS fix (or location is denied), the attempt uses the quest's own
   coordinates. `isWithinGeofence` returns true for `none` (`packages/geofence/src/isWithinGeofence.js`).
6. **The server accepts it.** `check_completion_geofence` returns true for `none` before it looks
   at coordinates (`supabase/migrations/025_quest_multi_geofences.sql`), so a submission from
   California passes. `normalize_completion_on_insert` (latest in `043_xp_events.sql`, same
   limits as 038) approves it straight away.
7. **Rate limits don't bite.** 2 completions per 10 minutes and 10 per 24 hours per account
   (`038_completion_secret_columns.sql`, kept in 043). A reviewer doing one quest is far under.
   Zone checks on other quests stop on the phone, so they don't count.

**Needs checking on hosted data** (owner, before submitting):

1. Production has exactly one active starter quest with `geofence_type = 'none'`. 037 marks it by
   exact title and only if that row exists, and `set_starter_quest` lets admin move the starter
   to any active quest, including one with a zone. If the starter has a zone, a reviewer outside
   Victoria can't finish anything. See k2.md P1-1.
2. Account deletion works on production. See k2.md P1-4.

---

## 6. What a reviewer might hit, and what to say

| They see | Why | What to say (if asked) |
|---|---|---|
| Most quests greyed out, "… km to go" | Every quest except the starter has a zone in Victoria, BC | "Quest! is a city pilot. The starter quest has no zone so it can be finished anywhere." |
| This week suggests places in Victoria | It picks from the live quests, nearest first, with no distance cut-off (`lib/thisWeek.ts` `pickThisWeek`) | Same as above |
| City feed is empty or quiet | Small pilot. The empty state reads "Nobody's posted today…" | "Pilot city. We posted an example from a second test account." Make sure §2's example post exists |
| Rankings has few names | Weekly board, small pilot. Empty copy: "Nobody's on the board yet…" | "The board resets each Monday." |
| A front-camera photo after the place photo | The optional selfie runs on a 3-second countdown | "It's optional (Skip selfie) and private. Only the player sees it." |
| "Feedback isn't switched on in this build yet." | Settings → Send feedback needs a Sentry DSN in the build | Set the DSN before the review build (runbook Step 3) |
| "Privacy policy on the web" opens a dead page | `https://quest.app/privacy` may not be live. See k2.md P1-3 | Fix before submitting; don't explain it |
| Sign-up has no terms checkbox | See k2.md P1-2 | Fix before submitting if possible |
| "You already finished this quest." | The demo account was already used | Make a fresh demo account (§2) |
| "You're submitting quests too quickly." | Rate limit (2 per 10 minutes) | "Anti-abuse limit. Wait 10 minutes." |

No in-app purchases, subscriptions, ads or third-party sign-in (`app/(auth)/sign-in.tsx` and
`sign-up.tsx` use Supabase email and password), so Sign in with Apple (4.8) and App Tracking
Transparency don't apply.

---

## 7. Other App Store Connect fields

- **Age rating:** answer the questionnaire. The app has user-generated photos and comments with
  reporting and blocking, and no unrestricted web browsing. Expect the UGC questions to raise the
  rating.
- **Category:** primary Lifestyle, secondary Travel or Health & Fitness. Your call.
- **Privacy policy URL:** must open a live page. See k2.md P1-3.
- **Support URL:** required. Any live page with a contact email works, for example a page on the
  admin Vercel domain until there's a marketing site (DB3-7).
- **Availability:** Canada is enough for the pilot. Apple reviews from anywhere, which is why
  the starter quest matters.
