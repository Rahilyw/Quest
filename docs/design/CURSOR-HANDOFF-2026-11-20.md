# Cursor handoff: Quest! ultra plan cards (Nov 20, 2026)

The master plan is [ULTRA-PLAN-2026-11-20.md](ULTRA-PLAN-2026-11-20.md). Cards C and D are
specified in detail in [NEXT-BUILD-PLAN-2026-11-19.md](NEXT-BUILD-PLAN-2026-11-19.md). This file
replaces [AGENT-HANDOFF-2026-11-19.md](AGENT-HANDOFF-2026-11-19.md).

> **One-run option:** [CURSOR-BIG-BUILD-2026-11-20.md](CURSOR-BIG-BUILD-2026-11-20.md) runs
> every card below in order on the integration branch `cursor/big-build`, plus four new cards:
> Q (CI hardening), V (owner verification pack), P (admin pilot dashboard) and F (in-app
> feedback). Use that or this file, not both at once.

## How to use this in Cursor

1. Open a new **Agent** chat, one per card. If you run cards in parallel, use a separate
   branch for each, or a Cursor background agent.
2. Paste the **shared brief**, then **one card**. Alternatively, type
   `@docs/design/CURSOR-HANDOFF-2026-11-20.md do card <X>`.
3. The project rule `.cursor/rules/quest-hard-rules.mdc` is always on. It repeats the hard
   rules, so they apply even if the brief is skipped.
4. When the agent reports back, update the status table below before handing out the next
   card.

## Card status (update when you hand out or finish a card)

| Card | Wave | Status on Nov 20, 2026 | Can start when |
|---|---|---|---|
| H: Land admin polish, push | 0 | Done (pushed; CI green on `5364735`) | — |
| S: Stickers reconcile (migration 044) + sprite removal | 1 | Free | H is pushed |
| R: Release readiness | 1 | Free | H is pushed (can run beside S) |
| C: XP events mobile (+ "Photos from here" time) | 2 | Blocked | S merged |
| E4: Own selfie in completion views | 2 | Blocked | S merged (can run beside C) |
| E1: Tokens to 0 + strict CI | 3 | Blocked | C merged |
| E2: Skeletons | 3 | Blocked | C merged (can run beside E1, see file split) |
| E5: Accessibility pass | 3 | Blocked | E1 and E2 merged; run it alone |
| D: Duo quests (migration 045) | 4 | Blocked | C merged and TestFlight build #1 cut |
| Q: CI hardening (big build only) | 1 | Free | H is pushed |
| V: Owner verification pack (big build only) | 2 | Blocked | S merged |
| P: Admin pilot dashboard (big build only) | 2 | Blocked | S merged |
| F: In-app feedback (big build only) | 2 | Blocked | C merged |

Done earlier: Phase 3 offline queue (card A, Nov 19) and Phase 4a XP server and admin (card B,
Nov 19). Old card E3 is now part of C; old card E6 is now part of S.

Never give the same card to two agents. Never run two cards whose file lists overlap; the
"Owns" lists in the ultra plan §4 are the contract.

---

## Shared brief (paste first, every time)

```
You are working on Quest!, a city quest game for a pilot in Victoria, BC.
Players complete real-world quests, prove them with an in-app photo inside a
geofence, and earn XP, streaks, badges, stickers and a weekly leaderboard rank.

Repo layout:
- apps/mobile: Expo SDK 58 / React Native, expo-router. Tabs: This week,
  Quests, City, Rankings, You.
- apps/admin: Next.js 15 admin dashboard (Vercel).
- packages/geofence: shared geometry and time-window helpers (plain JS).
- supabase/migrations: timestamped baseline, then 002-043.
  Applied on production: through 040.
  Written, NOT applied: 041 (push draining), 042 (proof-photo policies),
  043 (XP events).
  Reserved: 044 = stickers (card S), 045 = duo quests (card D).
- supabase/functions: Deno edge functions (send-push-outbox,
  send-social-push). Not deployed.

Base branch: main if PR #15 has merged, otherwise
cursor/cutouts-this-week-quests. Pull first. Work on your own branch named
cursor/<card>-<short-name>, with small commits, one per logical step.

Read before coding:
1. docs/design/ULTRA-PLAN-2026-11-20.md, sections 2 and 4 (state + the file
   ownership table for your card).
2. Your card's spec (below, and for C/D the matching section of
   docs/design/NEXT-BUILD-PLAN-2026-11-19.md).
3. docs/design/BRAND.md if you touch UI. Rules: lib/theme.ts tokens only
   (no hex, rgb or raw fontSize), Figtree, sentence case, no emoji, 48pt
   touch targets, skeletons instead of spinners, one motion moment (the
   badge landing), stickers not sprites.
4. supabase/migrations/README.md if you touch SQL (column-grant rules,
   Verifying blocks, apply order).

Hard rules:
- Never touch hosted services. No `supabase db push`, no Supabase MCP or
  SQL calls (the Cursor Supabase plugin included), no edge function
  deploys, no Vercel deploys, no EAS builds, submits or updates. The owner
  does all of that.
- Never push to main, never force-push, never merge or close PRs. Push only
  your own branch, and only if the card says so.
- Migrations are forward-only. Never edit or rename 002-043. Your new
  migration takes the number reserved for your card.
- A new column on `completions` or `profiles` needs an explicit
  `GRANT SELECT (col)` to anon/authenticated, because 038/039 removed
  table-level SELECT.
- New SECURITY DEFINER functions: SET search_path, and REVOKE from
  PUBLIC/anon/authenticated unless clients must call them.
- XP, streaks, stickers and verification are server-authoritative. The
  client never computes or writes them.
- Analytics events carry no coordinates, photos, usernames or free text.
- UI copy never says "verified" before the server has accepted the proof.
- Every admin server action calls requireAdmin()
  (apps/admin/lib/require-admin.ts).
- Keep the Phase 3 pipeline intact: lib/submitCompletion.ts is the single
  upload -> insert -> reward path, and the submit screen enqueues ONLY on
  a 'network' result.
- Stay inside your card's file list. If you need a file outside it, stop
  and report; don't edit it.
- No new test frameworks. Tests are plain Node scripts in
  apps/mobile/__tests__ and packages/geofence/src/__tests__. Register new
  files in that workspace's package.json "test" script.

Checks to run before you report done (quote the output):
  npm test --workspace @quest/geofence --ignore-scripts
  npm test --workspace mobile --ignore-scripts
  cd apps/mobile && npx tsc --noEmit
  cd apps/mobile && npm run lint:tokens     (count must not go up)
  cd apps/admin && npx tsc --noEmit         (if you touched admin)
  cd apps/admin && npx next build           (if you touched admin; use the
                                             placeholder env vars from
                                             .github/workflows/ci.yml)

Report back with:
- branch name and commit hashes
- what you built, file by file
- the check results, quoted
- status in these words only: "in checkout", "locally tested". SQL you
  wrote has NOT been executed; say so.
- a numbered device checklist for anything that needs a phone (also added
  to LAUNCH-RUNBOOK.md Step 5)
- anything in the plan you changed or couldn't do, and why
- a 3-line update for the "Current continuation" section of
  docs/design/QUEST-FABLE-CAMPAIGN-LEDGER.md (add it yourself)
```

---

## Card H: Land the in-flight admin polish and push (Wave 0, about 1 hour)

```
Task: the working tree on cursor/cutouts-this-week-quests has 10 uncommitted
admin files (badges list + detail, completions, moderation, dashboard
page.tsx, redeem RedeemForm, sponsors, users, globals.css,
components/GeofenceEditor.tsx). They add formatVictoriaDate /
formatVictoriaDateTime from lib/format.ts, confirm() copy for removals and
aria-live loading states. The branch is also 8 commits ahead of origin.

1. Review the diff (git diff). Finish anything obviously half-done; don't
   start new features. Every admin server action must still call
   requireAdmin().
2. Make sure completions and moderation still display xp_awarded (Phase 4a)
   and not quests.xp_reward.
3. Run admin tsc and next build (with the CI placeholder env vars), plus the
   mobile and geofence tests.
4. Commit as "feat(admin): Victoria dates, removal confirms, live loading
   states". End the message with your attribution line if your setup adds
   one.
5. Push cursor/cutouts-this-week-quests to origin (normal push, no force).
   This updates PR #15. Report the CI result on the new head.

Don't touch: anything outside apps/admin, and no SQL.
```

## Card S: Stickers reconcile, migration 044, sprite removal (Wave 1, 2–3 days)

```
Task: bring PR #16 ("Stickers and rewards-first", branch
claude/hopeful-jemison-3f38f1) onto the current base as a NEW branch and
PR. BRAND.md (already committed) makes stickers the reward and retires the
drawn sprite cast. PR #16 is that implementation, but it was cut before
Phases 1-4a and it conflicts.

Read first: the PR description (`gh pr view 16`), its diff
(`git diff cursor/cutouts-this-week-quests...origin/claude/hopeful-jemison-3f38f1`),
BRAND.md sections 2, 6, 6b, 6c, 7, 8, and migration 043.

1. Branch cursor/s-stickers from the pushed base (after card H). Port the
   PR's changes onto it. Don't merge the stale branch; port it so the
   newer code wins wherever they overlap.
2. MIGRATION NUMBER: the PR's 041_stickers.sql collides with
   041_push_outbox_draining.sql. Create it as
   supabase/migrations/044_stickers.sql. Header: "Requires 043 applied".
   Fix every reference (README index, apply order, runbook, comments).
3. Rebase the SQL onto 043:
   - grant the quest sticker when a completion becomes verified, hooked to
     the 043 reward path (apply_completion_rewards(p_completion_id) or an
     AFTER trigger on verified status); revoke it from the 043 revoke path.
   - do NOT redefine normalize_completion_on_insert or change xp_awarded.
   - new client-readable columns get explicit GRANT SELECT; definer
     functions SET search_path and REVOKE from PUBLIC/anon/authenticated.
   - add a "Verifying 044" block to supabase/migrations/README.md: backfill
     counts, grant check, verify -> sticker granted, remove -> sticker
     revoked, placement RLS (owner writes only, public pages honour
     feed_public and blocks).
4. Mobile: port the sticker drawer, page board, Verified stamp and
   Sticker/Cutout components. Keep lib/submitCompletion.ts and the offline
   queue exactly as they behave now. Re-apply the PR's submit-screen UI on
   top of the current screen; don't restore the old pipeline.
5. Sprite removal (old card E6): delete components/Sprite.tsx and the
   sprite / category-default sticker code in components/badges/pixel.tsx
   and art.tsx, plus the screens that still reference sprites (feed,
   index, leaderboard, profile, quests, notifications, onboarding, recap).
   A quest without a real sticker shows no sticker.
6. Admin: the sticker uploader (QuestCutoutUploader, setQuestSticker,
   lib/sticker-pipeline.js), the /stickers library page, next.config.ts
   (16 MB server-action body, sharp external) and sharp in dependencies.
   Every server action calls requireAdmin(). Alt text is required.
7. Tests: port stickerBoard.test.js and add SQL text guards (numbered 044,
   no normalize redefinition, grants present, definer hygiene). Register
   them in the mobile "test" script.
8. Push cursor/s-stickers and open a PR against the base branch, titled
   "Stickers and rewards-first (replaces #16), migration 044". In the body,
   say that #16 should be closed. Don't close #16 yourself.

Owns: every file PR #16 touches, plus Sprite.tsx, components/badges/*,
044_stickers.sql and the migration README. Card C must not start until
this merges.
Device checklist: upload a sticker in admin -> it shows on quest detail ->
verify the quest -> the sticker lands in the drawer -> place it on your
page -> another player sees it (feed_public on), a blocked player doesn't.
```

## Card R: Release readiness (Wave 1, half a day, can run beside S)

```
Task: make the first TestFlight build OTA-capable and store-clean. Mobile
config only.

1. `cd apps/mobile && npx expo install expo-updates`. Configure updates.url
   from extra.eas.projectId (https://u.expo.dev/<projectId>). Keep
   runtimeVersion.policy "appVersion". eas.json already has the preview and
   production channels; check that each build profile has its channel.
2. app.json android: remove "android.permission.RECORD_AUDIO" and add
   "blockedPermissions": ["android.permission.RECORD_AUDIO"]. In the
   existing expo-camera plugin entry, add "recordAudioAndroid": false.
3. app.json ios.infoPlist: add "ITSAppUsesNonExemptEncryption": false.
   Re-read every permission string against what the app actually does.
4. eas.json production profile: "autoIncrement": true, unless a remote
   version source is already set. Leave the three REPLACE_WITH_* submit
   values alone; the owner fills them.
5. LAUNCH-RUNBOOK.md Step 1: add "OTA after the first build":
   npx eas-cli update --channel production --message "<what changed>".
   Note that native dependency changes need a new build, and that the
   first build must include expo-updates.
6. Run tsc, the mobile tests and `npx expo config --type public` (must
   print without errors). Don't run EAS.

Owns: apps/mobile/app.json, apps/mobile/eas.json, apps/mobile/package.json
dependencies (plus the lockfile change), and runbook Step 1.
```

## Card C: XP events mobile (Phase 4b), plus "Photos from here" time (Wave 2)

```
Task: implement Phase 4b of docs/design/NEXT-BUILD-PLAN-2026-11-19.md on top
of the merged stickers work (card S). Migration 043 is written:
active_xp_boosts(), completions.xp_awarded / xp_reason, and
own_completion_reward returns both.

1. hooks/useXpBoosts.ts calls active_xp_boosts() on focus of This week and
   quest detail.
2. This week (app/(tabs)/index.tsx): one banner line above the starter
   card. "Double XP until Sunday night", or for win-back "Double XP on your
   next quest this week". Tokens only, ink on paper; at most a 150-250 ms
   fade.
3. Quest detail (app/quest/[id].tsx): "2x today" beside the XP when a
   global or quest boost applies. Never promise first-finisher (it is a
   race).
4. lib/submitCompletion.ts: select xp_awarded, xp_reason on the insert
   return. The queue flusher gets the same values through the same path.
5. components/CompletionCelebration.tsx: show xp_awarded, not
   quest.xp_reward, with one reason line when present ("First to finish
   it: +50%", "Double XP weekend", "Welcome back: double XP"). Keep the
   sticker and Verified stamp from card S.
6. The background-flush banner ("Sent: <quest>. +N XP") uses xp_awarded.
7. Analytics: completion_verified gets xp = awarded plus xp_multiplier and
   xp_reason. New event xp_boost_seen {kind}.
8. Old card E3: "Photos from here" rows on quest detail show relative time
   ("2 h ago", "Yesterday"), with tabular figures. Put the formatter in a
   pure lib file with a Node test.
9. If 043 is not applied yet, the app must not crash: active_xp_boosts
   missing -> no banner; xp_awarded missing -> fall back to
   quest.xp_reward.

Owns: hooks/useXpBoosts.ts, app/(tabs)/index.tsx, app/quest/[id].tsx,
lib/submitCompletion.ts, components/CompletionCelebration.tsx,
lib/analytics.ts, plus the new relative-time lib and test.
Device checklist (after 043 is applied): an admin weekend event shows the
banner -> "2x today" on quest detail -> a completion pays 2x in the
celebration -> Rankings sums the awarded XP -> a queued proof flushed during
the event shows the doubled XP in its banner.
```

## Card E4: Own selfie in completion views (Wave 2, beside C)

```
Task: Phase 6 slice E4. In app/completion/[id].tsx and the own-profile
completion rows, show the player's own selfie via useSignedSelfie. Only the
owner ever sees it (D6). Other players' views and the feed never request
it. Don't touch CompletionCelebration.tsx (card C owns it). Add a guard
test, if a pure helper exists, that a non-owner path never asks for a
signed selfie URL.
Owns: app/completion/[id].tsx and the own-profile completion row component
(not app/(tabs)/index.tsx).
```

## Card E1: Tokens to 0 and a strict CI gate (Wave 3)

```
Task: Phase 6 slice E1. `cd apps/mobile && npm run lint:tokens` reports raw
tokens (126 in 16 files on Nov 20; recount after S and C). Replace each
with lib/theme.ts tokens until it reports 0. Add tokens to theme.ts only
when BRAND.md defines the value. Then remove continue-on-error from the
token report job in .github/workflows/ci.yml and run the script with
--strict.
Split with E2: if a file is on both lists, E1 does tokens first and E2
waits for that file.
```

## Card E2: Skeletons for the remaining spinners (Wave 3)

```
Task: Phase 6 slice E2. Replace centred ActivityIndicator loading states
with skeletons shaped like the content (folders, bubbles, rows), per BRAND
rule 9. No shimmer loops; reduce-motion gets static blocks. Leave the
in-button "Sending..." spinners in submit and queue rows; those are
progress, not page loads. Files (Nov 20): (tabs)/badges, (tabs)/feed,
blocked-users, completion/[id], edit-profile, quest/[id], recap, settings,
suggest-quest, user/[id]/index, auth/AuthKit, CommentsSheet, FollowButton,
FollowList, ReportPostSheet, ShareStoryModal. Put shared shapes in
components/ui/Skeleton*.tsx.
```

## Card E5: Accessibility pass (Wave 3, run alone and last)

```
Task: Phase 6 slice E5 across every screen. 48 pt targets;
accessibilityLabel and accessibilityRole on every Pressable; alt text on
every image (stickers use their stored alt text); layout holds at 130%
text; reduce-motion crossfade; colour is never the only signal (zone map,
category chips, the queue dot, the XP boost banner). Write a findings
table (screen, issue, fix) in your report and in
docs/design/A11Y-PASS-2026-11.md.
```

## Card D: Duo quests and referral (Phase 5), migration 045 (Wave 4)

```
Task: implement Phase 5 of docs/design/NEXT-BUILD-PLAN-2026-11-19.md
exactly as written there, with ONE change: the migration is
supabase/migrations/045_duo_quests.sql (044 is stickers). It requires 043
and 044 applied. It redefines normalize_completion_on_insert from 043;
start from the 043 text and keep all of it.

Summary: quests.min_party_size (1|2, granted); quest_parties (6-char code
from ABCDEFGHJKMNPQRSTUVWXYZ23456789, 2 h expiry, one open party per
creator); quest_party_members (max 2); RLS members-read only; definer RPCs
create_party / join_party (PARTY_NOT_FOUND, PARTY_EXPIRED, PARTY_FULL,
PARTY_SELF) / leave_party / own_party, 10 per hour; insert gate raises
PARTY_REQUIRED; AFTER INSERT duo bonus +round(0.5 x base) to both
(+base if either account < 48 h old) via xp_awarded, reason 'duo';
Recruiter badge ('recruits' rule in evaluate_badge_unlock, threshold 3);
notifications kind 'duo_bonus' routed by send-social-push; "Verifying 045"
block.

Mobile: "Start with a friend" on duo quest detail; app/party/[code].tsx
lobby (big tabular code, QR via react-native-qrcode-svg, share
quest://party/CODE, partner status, expiry in text); "Have a code?" on
This week and after sign-up; classifyInsertError learns PARTY_REQUIRED;
the celebration shows both usernames; deep link quest://party/:code.
Admin: party size on quest create and edit, and a Duo filter on /quests.
Analytics: party_created, party_joined, party_expired,
duo_completed {referral}.
Tests: __tests__/party.test.js plus SQL guards.
Device checklist: two phones, create -> join by QR -> both submit -> both
see the bonus; a solo submit on a duo quest is refused with friendly copy.
Ships over the air after TestFlight #1, so it must add no native modules
beyond what card R's build includes.
```
