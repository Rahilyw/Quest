# Device checklist

One list for every check that needs a real phone. It replaces the lists that used to sit in
`LAUNCH-RUNBOOK.md` Step 5, the accessibility pass, the Nov 19 plan and the card specs (sources
at the bottom). Nothing here has been run yet.

## How to run it

- **When.** Run every row after O10 (TestFlight build #1 installed), on one iPhone and one
  Android phone. After every over-the-air update (`eas update`), run I64 / A58 first, then the
  core loop, the offline queue, and every area the update changed.
- **Before you start.** Two test accounts you own (call them main and second), a third throwaway
  account for deletion, one live geofenced quest with a sticker within walking distance, the
  starter journal quest, and one sponsored quest. Admin open on a laptop.
- **Fill in.** Mark Pass or Fail on each row. In Notes, put anything odd, even on a pass. A row
  whose "needs" is not met yet is skipped: write "skip, needs 043" (or whatever is missing).
- **Server-only rows run once.** Checks that only test the server or admin (first finisher,
  win-back, sticker alt text rule, removal revokes, report reaches admin) are in the iOS table
  only. Android repeats every client path.
- **Duo** rows are in their own section and wait for O13.
- **Core loop rule.** A Fail on any core loop row (I10–I21, A10–A21) blocks inviting the R1
  cohort. Fix it, ship a build or update, and rerun the core loop before inviting anyone.

### Needs column

| Short | Means |
|---|---|
| #1 | TestFlight build #1 (O10) on iOS. On Android: a build from the same commit. Write its EAS profile and channel in the Notes of A1. |
| 0xx | That migration is applied and its "Verifying 0xx" block has passed. 002–040 are already applied. |
| outbox | `send-push-outbox` deployed and the drain-cron Vault secrets set (O2, O4). |
| social | `send-social-push` deployed and the `notifications` webhook created (O4). |
| admin | The admin build that has the page named in the row is deployed. |
| PostHog / Sentry | The key or DSN is set as an EAS env var for this build (O8). |

### Pasting results into the ledger

Add one entry to `docs/design/QUEST-FABLE-CAMPAIGN-LEDGER.md`, above the older continuations:

```
### Continuation — <date>, device run (DEVICE-CHECKLIST)

- Build: TestFlight #<n> / Android <profile, channel>; update <id or "none">
- Phones: <iPhone model, iOS version>; <Android model, Android version>
- Migrations applied: <list>. Functions deployed: <list>.
- iOS: <n> pass, <n> fail, <n> skipped. Android: <n> pass, <n> fail, <n> skipped.
- Fails: <row #>: <one line each>
- Skipped: <row #>: <what it needs>
- R1 invite: blocked / not blocked (core loop rows)
```

---

## iOS

| # | Check (do this → expect this) | Needs | Pass | Fail | Notes |
|---|---|---|---|---|---|
| | **Install and build** | | | | |
| I1 | Install from TestFlight and open it. → The brand icon and splash show, then onboarding. No red error screen. | #1 | | | |
| I2 | Look at the sign-in screen. → There is no "Use the demo account" button. | #1 | | | |
| I3 | Open your first quest camera. → iOS asks for camera and location in plain sentences about photos and check-in. Allow both. | #1 | | | |
| | **Sign-up and onboarding** | | | | |
| I4 | Fresh install: swipe the onboarding slides. → Next on each; the last says Get started and opens Create an account. | #1 | | | |
| I5 | Create the main account (new username, email, password). → You land on This week, or on "You're in": open the confirmation email, sign in, land on This week. | #1 | | | |
| I6 | Start a second sign-up with the main username. → "That username is taken. Try another." | #1 | | | |
| I7 | On This week before any completion. → A "Your first quest" card shows. It is gone after your first completion. | #1 | | | |
| I8 | Settings → Version. → It matches the TestFlight build version. | #1 | | | |
| I9 | Sign out, then sign back in. → Username, XP and photos load; you are not sent back to sign-in. | #1 | | | |
| | **Core loop** | | | | |
| I10 | Quests → open the geofenced quest. → Title, XP, zone map and sticker show. | #1, 044 | | | |
| I11 | Tap start while outside the zone. → The chip reads "N m to go, toward …" and the shutter is off. | #1 | | | |
| I12 | Walk into the zone. → The chip reads "You're in the zone" and the shutter turns on. The map shows a dashed zone and an ink dot for you. | #1 | | | |
| I13 | Take the place photo. → The selfie step opens. Take the selfie. | #1 | | | |
| I14 | Watch while it sends. → Nothing says verified until the server answers. The Verified screen leads with a badge or XP medal, and the XP equals the quest's XP. | #1 | | | |
| I15 | Stay on the Verified screen. → The quest's sticker slides into a drawer slot. | #1, 044 | | | |
| I16 | Open You, then Rankings. → Total XP went up by that amount; Rankings lists you with this week's XP including it. | #1 | | | |
| I17 | Open City, then the quest's "Photos from here". → Your post is on City (Show my photos on City is on); the row says "Just now" or "N min ago". | #1 | | | |
| I18 | You → open the completion. Then open it from the second account. → You see your selfie; the second account does not. | #1 | | | |
| I19 | Open the same quest again. → It shows as done and you can't submit it twice. | #1 | | | |
| I20 | Do the starter journal quest away from any zone. → The chip says "No location required" and it verifies. | #1 | | | |
| I21 | Do the sponsored quest. → The redemption code shows in the celebration. | #1 | | | |
| | **Geofence edge cases** | | | | |
| I22 | Take the photo inside the zone, then walk out before it finishes sending. → It still verifies. | #1 | | | |
| I23 | iOS Settings → Quest! → Location → Never, then open the camera. → "Turn on location to check in" and the shutter is off. Set it back. | #1 | | | |
| I24 | Indoors or under heavy cover, stand about 60 m outside the zone edge. → The chip still shows "N m to go" and the shutter stays off. | #1 | | | |
| | **Offline queue** | | | | |
| I25 | In the zone, turn on airplane mode and take the photo and selfie. → "Saved. We'll send it when you're back online." and Done. Nothing says verified. | #1, 042 | | | |
| I26 | Look at the tab bar and You. → The You tab has a "1" badge; You shows a "Waiting to send" card with the capture time. | #1, 042 | | | |
| I27 | Force-quit, turn airplane mode off, reopen. → Within a few seconds: "Sent: <quest>. +N XP". See it opens the completion; the badge clears; XP and Rankings update. | #1, 042 | | | |
| I28 | Queue a proof and tap Send now while still offline. → The card says Sending…, then comes back. Turn signal on and tap Send now. → It sends. | #1, 042 | | | |
| I29 | Queue a proof, then Discard it. → The card goes and no completion appears on You or in admin. | #1, 042 | | | |
| I30 | Queue a proof, sign out, sign in (same or second account). → Nothing is queued. | #1, 042 | | | |
| I31 | Queue a proof, set the phone clock 73 hours ahead, reopen. → The proof is removed with a one-line notice. Set the clock back. | #1, 042 | | | |
| I32 | Offline, queue proofs for three quests, then capture a fourth quest. → "couldn't be saved for later". Recapture one of the three. → Its card is replaced, not added. | #1, 042 | | | |
| | **XP events** | | | | |
| I33 | Admin /xp-events → start "Double XP this weekend". Open This week. → Banner: "Double XP until Sunday night". | #1, 043, admin | | | |
| I34 | Open a quest during the event. → The XP reads "<XP>, 2x today". | #1, 043, admin | | | |
| I35 | Finish a quest during the event. → The celebration shows double XP and "Double XP weekend". Rankings rises by the doubled amount. | #1, 043, admin | | | |
| I36 | During the event, queue a proof offline and let it send. → The banner shows the doubled XP. | #1, 042, 043 | | | |
| I37 | Admin → End now. Leave This week and come back. → No banner and no "2x today". | #1, 043, admin | | | |
| I38 | Pick a quest that went live under 7 days ago with no completions. Finish it, then finish it from the second account. → Only the first celebration shows "First to finish it: +50%". | #1, 043 | | | |
| I39 | With an account whose last verified quest is 10–60 days old (Monday drop on), wait for 17:00 Victoria. → Push: "Victoria misses you. Double XP on your next quest this week." This week shows "Double XP on your next quest this week"; the next celebration says "Welcome back: double XP". | #1, 043, outbox | | | |
| | **Stickers** | | | | |
| I40 | Admin: upload a sticker for a quest, first without alt text. → Save is refused. Add alt text. → It saves and shows on quest detail. | #1, 044, admin | | | |
| I41 | You → open the sticker drawer. Place a sticker by dragging; move another by tap-then-tap. → Both stay where you put them after reopening. | #1, 044 | | | |
| I42 | From the second account, open your public page. → Your board shows (Show my photos on City on). Block either way. → It no longer shows. | #1, 044 | | | |
| I43 | Admin removes the completion that granted the sticker. → The sticker leaves the drawer and the page; XP drops by the amount it paid. | #1, 044, admin | | | |
| I44 | Open a quest that has no sticker, its Quests folder, its City post and its Verified screen. → No sticker and no placeholder anywhere. | #1, 044 | | | |
| | **Recap** | | | | |
| I45 | Monday to Saturday: Rankings → the recap row. → The recap says "Final." with rank, weekly XP and quest count for last week. | #1 | | | |
| I46 | Sunday: open the recap. → "Still open. It settles tonight at midnight." with this week's numbers. | #1 | | | |
| I47 | Open the recap on an account with no quests that week. → "No quests that week" (or "No quests yet this week" on Sunday). | #1 | | | |
| I48 | Tap Share your week. → The share sheet opens with the card (your photo, or the "numbers only" line). Dismiss it. → No success message. | #1 | | | |
| | **Pushes** | | | | |
| I49 | Settings → Quest alerts on. → iOS asks to allow notifications; allow. Turn it off and on. → The toggle shows the real state each time. | #1 | | | |
| I50 | Monday about 09:15 Victoria, with Monday drop on. → Push "Quest!" / "N new quests just dropped in Victoria." Tap it. → Quests opens. | #1, 041, outbox | | | |
| I51 | From the second account, follow the main account. → Push "New follower" / "@second started following you." Tap it. → Their profile opens. | #1, social | | | |
| I52 | From the second account, comment on your post, then like it. → Push "@second commented on your quest" with the comment; tap opens the completion. The like shows in Activity with no push. | #1, social | | | |
| I53 | Turn Comments and followers off, then have the second account follow again. → No push; Activity still shows it. | #1, social | | | |
| I54 | Sunday after 18:00 Victoria, on an account with XP that week. → Push "Your week in Victoria is in." Tap it. → The recap opens. | #1, 041, outbox | | | |
| I55 | Turn Monday drop off for a week. → No Monday drop and no Sunday recap push that week. | #1, 041, outbox | | | |
| | **Moderation** | | | | |
| I56 | From the second account: City → your post's menu → Report post → pick a reason. → "Reported. Thanks for keeping the city honest." The report shows in admin Moderation. | #1, admin | | | |
| I57 | Open the second account's profile → menu → Block @second → confirm. → Their posts leave City; Settings → Blocked accounts lists them. Unblock. → They come back. | #1 | | | |
| I58 | On the throwaway account: finish a quest, then Settings → Delete account → confirm. → Its City post, XP and Rankings entry are gone, and signing in with it fails. | #1 | | | |
| | **Accessibility** | | | | |
| I59 | VoiceOver on, with one queued proof: swipe to the You tab. → It reads "You, 1 proof waiting to send" and the badge shows "1". | #1, 042 | | | |
| I60 | VoiceOver: open the sticker drawer, quest detail and the recap. → Each sticker reads its alt text; the recap reads rank, XP, status and the Share button. | #1, 044 | | | |
| I61 | Larger Text at about 130% (Settings → Accessibility → Display & Text Size). → This week, Quests folders, the submit chip, the recap and the feedback sheet have no clipped buttons. Check on a large iPhone too if you have one. | #1 | | | |
| I62 | Reduce Motion on: finish a quest, then tap between tabs. → Badge and XP crossfade with no flight; tabs don't bounce. Suggest a quest → pick a category. → It shows an icon and an ink border, not only colour. | #1 | | | |
| | **Feedback, analytics, Sentry, updates** | | | | |
| I63 | Settings → Send feedback. Type past 1000 characters, then send a short "K3 test <date>". → The counter stops at 1000; the sheet says what is sent; "Thanks — we got your note." It shows in Sentry → User Feedback with app_version and device_model. | #1, Sentry | | | |
| I64 | After an `eas update` to this build's channel: force-quit, open, wait 10 s, force-quit, open. → The update's change is visible (name it in Notes). Settings → Version is unchanged. | #1, an update | | | |
| I65 | PostHog → Activity, filtered to this phone, within a minute of each action. → `signed_up`, `quest_viewed`, `quest_started`, `proof_submitted`, `completion_verified` (with `xp`, `xp_multiplier`, `xp_reason`), `proof_queued`, `proof_queue_sent`, `share_completed` (surface recap) and `feedback_sent`. | #1, PostHog | | | |
| I66 | Open three of those events' properties. → No lat, lng, photo URL, username or message text. | #1, PostHog | | | |
| I67 | Sentry → Releases. → A session from this build's version shows. Note any error event and its screen. | #1, Sentry | | | |

## Android

Use a phone about 360 dp wide if you have one.

| # | Check (do this → expect this) | Needs | Pass | Fail | Notes |
|---|---|---|---|---|---|
| | **Install and build** | | | | |
| A1 | Install the Android build and open it. → The brand icon and splash show, then onboarding. No red error screen. Write the EAS profile and channel in Notes. | #1 | | | |
| A2 | Look at the sign-in screen. → There is no "Use the demo account" button. | #1 | | | |
| A3 | Open your first quest camera. → Android asks for camera and location only. App info → Permissions lists no microphone. | #1 | | | |
| | **Sign-up and onboarding** | | | | |
| A4 | Fresh install: swipe the onboarding slides. → Next on each; the last says Get started and opens Create an account. | #1 | | | |
| A5 | Create an account (or sign in with main). → You land on This week, or on "You're in" and then This week after confirming. | #1 | | | |
| A6 | Start a sign-up with a taken username. → "That username is taken. Try another." | #1 | | | |
| A7 | On This week before any completion on a new account. → "Your first quest" shows; it goes after the first completion. | #1 | | | |
| A8 | Settings → Version. → It matches the build. | #1 | | | |
| A9 | Sign out, then sign back in. → Username, XP and photos load. | #1 | | | |
| | **Core loop** | | | | |
| A10 | Quests → open the geofenced quest. → Title, XP, zone map and sticker show. | #1, 044 | | | |
| A11 | Tap start while outside the zone. → "N m to go, toward …" and the shutter is off. | #1 | | | |
| A12 | Walk into the zone. → "You're in the zone", shutter on, dashed zone and ink dot on the map. | #1 | | | |
| A13 | Take the place photo. → The selfie step opens. Skip the selfie this time. | #1 | | | |
| A14 | Watch while it sends. → Nothing says verified until the server answers. Verified leads with a badge or XP medal; the XP matches the quest. | #1 | | | |
| A15 | Stay on the Verified screen. → The sticker slides into a drawer slot. | #1, 044 | | | |
| A16 | Open You, then Rankings. → XP went up by that amount; Rankings includes it. | #1 | | | |
| A17 | Open City, then "Photos from here". → Your post shows; the row says "Just now" or "N min ago". | #1 | | | |
| A18 | You → open the completion. → No selfie (you skipped it), and nothing broken in its place. | #1 | | | |
| A19 | Open the same quest again. → It shows as done; no second submit. | #1 | | | |
| A20 | Do the starter journal quest away from any zone. → "No location required", and it verifies. | #1 | | | |
| A21 | Press the system back button on the camera and on Verified. → You return to the quest or This week, not a blank screen. | #1 | | | |
| | **Geofence edge cases** | | | | |
| A22 | Take the photo inside the zone, then walk out before it finishes sending. → It still verifies. | #1 | | | |
| A23 | App info → Permissions → Location → Don't allow, then open the camera. → "Turn on location to check in", shutter off. Set it back. | #1 | | | |
| A24 | Indoors, about 60 m outside the zone edge. → Still "N m to go"; shutter off. | #1 | | | |
| A25 | Developer options → Select mock location app → set a spot inside the zone. Open the camera. → "Turn off mock location to check in", shutter off. If a photo was already taken: "Mock location is on". Turn mocking off. → Normal again. | #1 | | | |
| | **Offline queue** | | | | |
| A26 | In the zone, airplane mode on, take the photo. → "Saved. We'll send it when you're back online." and Done. Nothing says verified. | #1, 042 | | | |
| A27 | Look at the tab bar and You. → "1" badge on You; a "Waiting to send" card with the capture time. | #1, 042 | | | |
| A28 | Swipe the app away, airplane mode off, reopen. → "Sent: <quest>. +N XP"; See it opens the completion; badge clears; XP and Rankings update. | #1, 042 | | | |
| A29 | Queue, Send now offline. → Sending…, then back. Signal on, Send now. → It sends. | #1, 042 | | | |
| A30 | Queue, then Discard. → Card gone; nothing sent. | #1, 042 | | | |
| A31 | Queue, sign out, sign in. → Nothing queued. | #1, 042 | | | |
| A32 | Queue, set the clock 73 hours ahead (turn off automatic time), reopen. → Removed with a one-line notice. Set it back. | #1, 042 | | | |
| A33 | Queue three quests offline, then capture a fourth. → "couldn't be saved for later". Recapture one of the three. → Its card is replaced. | #1, 042 | | | |
| | **XP events** | | | | |
| A34 | With a weekend event running (I33). → This week banner "Double XP until Sunday night"; quest detail "<XP>, 2x today". | #1, 043, admin | | | |
| A35 | Finish a quest during the event. → Double XP and "Double XP weekend" in the celebration. | #1, 043, admin | | | |
| A36 | After End now. → Banner and "2x today" are gone when you come back to the screen. | #1, 043, admin | | | |
| | **Stickers** | | | | |
| A37 | You → sticker drawer. Place a sticker by dragging and another by tap-then-tap. → Both stay after reopening. | #1, 044 | | | |
| A38 | Open the main account's public page from this phone (signed in as second). → The board shows; after a block either way, it doesn't. | #1, 044 | | | |
| A39 | A quest without a sticker, on detail, folder, City and Verified. → No sticker and no placeholder. | #1, 044 | | | |
| | **Recap** | | | | |
| A40 | Rankings → the recap row. → "Final." (Mon–Sat) or "Still open. It settles tonight at midnight." (Sunday), with rank, XP and quest count. | #1 | | | |
| A41 | Recap on an account with no quests that week. → The empty state shows. | #1 | | | |
| A42 | Share your week → pick an app, then back out. → The card image reaches the app's composer; no success message in Quest!. | #1 | | | |
| | **Pushes** | | | | |
| A43 | Settings → Quest alerts on. → On Android 13 or later, the system asks to allow notifications; allow. Toggle off and on. → It shows the real state. | #1 | | | |
| A44 | Monday drop push, as I50. → It arrives; tapping opens Quests. | #1, 041, outbox | | | |
| A45 | Second account follows and comments, as I51–I52. → "New follower" opens their profile; the comment push opens the completion; a like doesn't push. | #1, social | | | |
| A46 | Recap push, as I54. → "Your week in Victoria is in."; tapping opens the recap. | #1, 041, outbox | | | |
| A47 | Push arrives while the app is closed (swiped away). Tap it. → The app cold-starts on the right screen. | #1, outbox or social | | | |
| | **Moderation** | | | | |
| A48 | City → a post's menu → Report post → reason. → "Reported. Thanks for keeping the city honest." | #1 | | | |
| A49 | Block a profile, then unblock it from Settings → Blocked accounts. → Their posts leave City, then come back. | #1 | | | |
| A50 | On a throwaway account with one completion, Settings → Delete account → confirm. → Post, XP and Rankings entry gone; sign-in fails. | #1 | | | |
| | **Accessibility** | | | | |
| A51 | TalkBack on, one queued proof: move to the You tab. → "You, 1 proof waiting to send"; badge shows "1". | #1, 042 | | | |
| A52 | TalkBack: sticker drawer, quest detail, recap. → Stickers read their alt text; the recap reads rank, XP, status and Share. | #1, 044 | | | |
| A53 | Settings → Display → Font size at the largest (about 130%). → This week, Quests folders, the submit chip, the recap and the feedback sheet have no clipped buttons at 360 dp. | #1 | | | |
| A54 | Accessibility → Remove animations on: finish a quest and switch tabs. → Crossfade only; no flight, no bounce. Suggest a quest category shows an icon and border, not only colour. | #1 | | | |
| | **Feedback, analytics, Sentry, updates** | | | | |
| A55 | Settings → Send feedback, send "K3 test Android <date>". → "Thanks — we got your note."; it shows in Sentry → User Feedback with this device model. | #1, Sentry | | | |
| A56 | PostHog → Activity for this phone. → `quest_viewed`, `quest_started`, `proof_submitted`, `completion_verified`, `proof_queued`, `proof_queue_sent` arrive within a minute. | #1, PostHog | | | |
| A57 | Sentry → Releases. → A session from this Android build shows. | #1, Sentry | | | |
| A58 | After an `eas update` to this build's channel: swipe away, open, wait 10 s, swipe away, open. → The update's change is visible. | #1, an update | | | |

---

## Duo quests: after 045 (O13)

Two phones. Run with phone A = iPhone and phone B = Android; if you have time, swap and rerun
D3–D7. Duo ships over the air, so "needs" here is the update that carries duo.

| # | Check (do this → expect this) | Needs | Pass | Fail | Notes |
|---|---|---|---|---|---|
| D1 | Before O13, on an update that carries duo code: open a quest, This week and sign-up. → No "Start with a friend", no "Have a code?". Solo submit and the offline queue work as before. | duo update, 045 **not** applied | | | |
| D2 | Admin: set a quest's party size to Duo; filter /quests by Duo. → The quest is listed. | 045, admin | | | |
| D3 | Phone A: open that quest → Start with a friend. → The lobby shows a big code, a QR, "Waiting for a friend" and "Expires in …" in text. | 045, duo update | | | |
| D4 | Phone B: This week → Have a code? → type the code. → Phone A shows "@B is in"; Go to the camera turns on for both. | 045, duo update | | | |
| D5 | New party: phone B scans the QR with the camera (or opens `quest://party/CODE`). → Quest! opens on the lobby and joins. | 045, duo update | | | |
| D6 | Phone A: Share in the lobby. → The share sheet carries `quest://party/CODE` and the store link. | 045, duo update | | | |
| D7 | Both phones submit inside the zone while the party is open. → Both get the duo bonus; the celebration shows both usernames. If the first finisher's bonus lands later, it arrives in Activity and as a push. | 045, duo update, social | | | |
| D8 | Phone A alone (no party, or alone in one): submit on the duo quest. → "This quest needs a friend. Start with a friend or join their code first." Nothing says verified. | 045, duo update | | | |
| D9 | Phone B: enter a wrong code, your own code, a full party's code, and a code over 2 hours old. → "That code is not right…", "That is your own code…", "That party is already full.", "That party code has expired…". | 045, duo update | | | |
| D10 | Phone B on an account under 48 hours old: complete a duo quest with A. → Each bonus equals the quest's base XP, not half of it. | 045, duo update | | | |
| D11 | Admin removes one member's duo completion. → That player's XP drops by its stored award, bonus included. | 045, admin | | | |
| D12 | VoiceOver on A and TalkBack on B in the lobby. → The code reads as characters; the expiry and partner status read as text. | 045, duo update | | | |
| D13 | PostHog. → `party_created`, `party_joined` and `duo_completed` from both phones. | 045, duo update, PostHog | | | |

---

## Sources

Each check above comes from one or more of these. Duplicates were merged into one row.

- `LAUNCH-RUNBOOK.md`: Step 0a (Settings toggle, recap), 0b (social push), 0c (recap push), 0d (win-back), Step 5 (geofence, deletion, sponsored, offline queue, stickers)
- `git show origin/cursor/d-duo:LAUNCH-RUNBOOK.md` Step 5: duo quests
- `docs/design/A11Y-PASS-2026-11.md`: device checklist
- `docs/design/NEXT-BUILD-PLAN-2026-11-19.md`: Phase 3 and 4b "Done when", Phase 5 two-phone check, Phase 6 device sizes
- `docs/design/ULTRA-PLAN-2026-11-20.md` §1: the core loop, pushes reaching a phone, PostHog and Sentry
- `docs/design/CURSOR-HANDOFF-2026-11-20.md`: card S, C and D device checklists
- `docs/design/CURSOR-BIG-BUILD-2026-11-20.md`: card F (feedback) and card R (OTA, permissions)
- `docs/design/OWNER-RUNSHEET.md`: O8, O10
- `docs/design/BUILD-3-PLAN-2026-11-25.md`: K3, M5 dark-launch guard, O13, O18
- `supabase/migrations/README.md`: what 041–044 enable
- `docs/specs/06-growth-engagement.md`: §2 recap (not verified list), §5 offline queue
