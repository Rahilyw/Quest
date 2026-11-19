# Agent handoff: Quest! build phases 3–6

Paste the shared brief and **one** task card into a coding agent. Each card is self-contained.
The full specification is in [`docs/design/NEXT-BUILD-PLAN-2026-11-19.md`](NEXT-BUILD-PLAN-2026-11-19.md).
The agent must read the section for its card before writing code.

## Who has what (update this table when you hand out a card)

| Card | Status on Nov 19, 2026 |
|---|---|
| A: Offline submission queue (Phase 3) | Started in a Claude Code session |
| B: XP events server + admin (Phase 4a) | Started in a Claude Code session |
| C: XP events mobile (Phase 4b) | Waiting on A and B |
| D: Duo quests (Phase 5) | Waiting on B |
| E1–E6: Cutouts/accessibility slices (Phase 6) | Free. They can start now. |

Don't give the same card to two agents.

---

## Shared brief (paste first, every time)

```
You are working on Quest!, a city quest game for a pilot in Victoria, BC.
Players complete real-world quests, prove them with an in-app photo inside a
geofence, and earn XP, streaks, badges and a weekly leaderboard rank.

Repo layout:
- apps/mobile: Expo / React Native, expo-router. Tabs: This week, Quests,
  City, Rankings, You.
- apps/admin: Next.js 15 admin dashboard (Vercel).
- packages/geofence: shared geometry and time-window helpers (plain JS).
- supabase/migrations: Postgres migrations. Timestamped baseline, then
  002-042. Next free numbers: 043 (XP events), 044 (duo quests).
- supabase/functions: Deno edge functions (send-push-outbox,
  send-social-push).

Base branch: cursor/cutouts-this-week-quests (PR #15 to main). If PR #15
has merged, cut from main instead. Work on your own branch and make small
commits, one per logical step.

Read before coding:
1. docs/design/NEXT-BUILD-PLAN-2026-11-19.md: your phase's section.
2. docs/design/BRAND.md if you touch UI. Rules: lib/theme.ts tokens only
   (no hex or raw fontSize), Figtree, sentence case, no emoji, 48pt touch
   targets, skeletons instead of spinners, one motion moment (the badge
   landing).
3. supabase/migrations/README.md if you touch SQL. Read the column-grant
   rules.

Hard rules:
- Never run anything against hosted services. No `supabase db push`, no
  Supabase MCP or SQL calls, no edge function deploys, no Vercel deploys,
  no EAS builds or submits. The owner applies migrations and deploys.
- Migrations are forward-only. Never edit or rename 002-042. Applied on
  production: through 040. Written but not applied: 041, 042.
- A new column on `completions` or `profiles` needs an explicit
  `GRANT SELECT (col)` to anon/authenticated, because 038/039 removed
  table-level SELECT.
- New SECURITY DEFINER functions: SET search_path, and REVOKE from
  PUBLIC/anon/authenticated unless clients must call them.
- XP, streaks and verification are server-authoritative. The client never
  computes or writes XP.
- Analytics events carry no coordinates, photos, usernames or free text.
- UI copy never says "verified" before the server has accepted the proof.
- Every admin server action calls requireAdmin()
  (apps/admin/lib/require-admin.ts).
- Don't add test frameworks. Tests are plain Node scripts in
  apps/mobile/__tests__ and packages/geofence/src/__tests__. Register new
  test files in that workspace's package.json "test" script.

Checks to run before you report done:
  npm test --workspace @quest/geofence --ignore-scripts
  npm test --workspace mobile --ignore-scripts
  cd apps/mobile && npx tsc --noEmit
  cd apps/admin && npx tsc --noEmit          (if you touched admin)
  cd apps/admin && npx next build            (if you touched admin; use
                                              the placeholder env vars in
                                              .github/workflows/ci.yml)

Report back with:
- branch name and commit hashes
- what you built, file by file
- the check results, quoted
- status in these words only: "in checkout", "locally tested". SQL you
  wrote has NOT been executed; say so.
- a device checklist for anything that needs a phone
- anything in the plan you changed or couldn't do, and why
```

---

## Card A: Offline submission queue (Phase 3)

```
Task: implement Phase 3 of docs/design/NEXT-BUILD-PLAN-2026-11-19.md, the
offline submission queue (Spec 06 section 5). Mobile only. No migration.

Start from apps/mobile/lib/submissionAttempt.js. It already fixes an attempt
id, a deterministic storage path and frozen capture coordinates per photo,
and classifyInsertError separates 'network' from server answers.

Build:
1. lib/submitCompletion.ts: extract the upload -> insert -> reward-read
   pipeline from app/submit/[questId].tsx into one function. Typed result:
   verified | duplicate | rate_limited | outside_zone | rejected | network.
   The submit screen and the queue both call it.
2. lib/submissionQueue.js (+ .d.ts): pure logic. Max 3 items, 72 h TTL,
   backoff 30 s, 2 min, 10 min, 30 min, then hourly. One item per quest
   (a new capture replaces the old one).
3. lib/submissionQueueStore.ts: AsyncStorage key
   quest.submissionQueue.v1.<userId>. Move photos from the camera cache to
   FileSystem.documentDirectory + 'queue/'. purge(userId) deletes files and
   key.
4. hooks/useSubmissionQueue.tsx: provider in app/_layout.tsx. Flush on app
   foreground and sign-in, one flush at a time.
5. Submit screen: enqueue ONLY on 'network'. Copy: "Saved. We'll send it
   when you're back online." Other results keep today's behaviour.
6. Dot on the You tab with an accessibility label. "Waiting to send" rows
   on You with Send now / Discard.
7. On flush: 'duplicate' = success. 'outside_zone'/'rejected' = tell the
   player once, drop the item, delete its files. A successful background
   flush shows a small banner that opens completion/[id]. Don't replay the
   full celebration.
8. Purge on sign-out (hooks/useAuth.tsx) and account deletion
   (app/settings.tsx).
9. Analytics: proof_queued, proof_queue_sent (waited minutes, bucketed),
   proof_queue_dropped (reason).
10. __tests__/submissionQueue.test.js. Add the device checklist to
    LAUNCH-RUNBOOK.md.

Don't touch: supabase/, apps/admin/, or the XP figure in
components/CompletionCelebration.tsx (card C owns it).
Server dependency: migration 042 must be applied before this works on a
device (storage upsert/delete policies). Note it in your report; don't
apply it.
```

## Card B: XP events, server and admin (Phase 4a)

```
Task: implement Phase 4a of docs/design/NEXT-BUILD-PLAN-2026-11-19.md, XP
economy events (Spec 06 section 3): migration 043 plus the admin app.

Migration supabase/migrations/043_xp_events.sql (it depends on 041 and
redefines functions from 017, 031, 038, 040 and 041):
1. completions.xp_awarded integer: backfill from quests.xp_reward, then
   NOT NULL. completions.xp_reason text. Column GRANT SELECT on both.
2. xp_events table, as specified in the plan. RLS on, no client policies.
3. Redefine normalize_completion_on_insert. Start from the LIVE version in
   038 and keep all of it: rate limits, auto-approve, sponsor codes. Add:
   - multiplier = greatest(active global/quest 'multiplier' rows, caller's
     oldest unconsumed active 'win_back' row). No stacking; consume the
     win_back row.
   - first finisher x1.5 when coalesce(active_from, created_at) is within
     7 days and no approved completion exists. Guard with
     pg_advisory_xact_lock(hashtext(quest_id::text)).
   - NEW.xp_awarded := round(base * least(m, 3)); set xp_reason.
4. apply_completion_rewards(p_completion_id uuid) reads xp_awarded. Point
   apply_completion_rewards_on_insert and award_xp_on_approval at it. Drop
   the (uuid, uuid) overload. Revoke from clients.
5. Switch every XP sum to coalesce(c.xp_awarded, q.xp_reward):
   revoke_completion_rewards, the leaderboard view (this also covers
   snapshot_last_week_ranks), own_week_recap, enqueue_week_recap.
6. active_xp_boosts() RPC. Extend own_completion_reward with xp_awarded
   and xp_reason.
7. Daily win-back pg_cron at 17:00 America/Vancouver, using migration 034's
   two-UTC-schedules + local-time guard. Targets: last approved completion
   10-60 days ago, push_token set, push_drops true, no win_back in 30 days.
   Insert a 7-day x2 personal row and a push_outbox 'win_back' row.
8. Add "Verifying 043" queries and an index row to
   supabase/migrations/README.md. Add the apply order 041 -> 042 -> 043 to
   LAUNCH-RUNBOOK.md.

Admin:
- /xp-events page: list active/upcoming/ended; create with presets "Double
  XP this weekend" (Sat 00:00 -> Mon 00:00 Victoria) and "Double XP on one
  quest", plus custom (1.25-3x); End now. Show a win-back count only.
- Dashboard "Active boost" card.
- Completions and moderation show xp_awarded instead of quests.xp_reward.

Tests: apps/mobile/__tests__/xpEvents.test.js with a pure JS mirror of the
multiplier rule (precedence, cap, first-finisher window, rounding) and SQL
text guards: grant present, old overload dropped, no sum(q.xp_reward) left
in redefined objects.

Don't touch: mobile screens or apps/mobile/lib (cards A and C own them).
```

## Card C: XP events, mobile (Phase 4b). Start after A and B are merged.

```
Task: implement Phase 4b of docs/design/NEXT-BUILD-PLAN-2026-11-19.md.
Prerequisites: cards A (lib/submitCompletion.ts exists) and B (migration
043 written: active_xp_boosts(), completions.xp_awarded/xp_reason,
own_completion_reward returns them) are merged into your base branch.

Build:
1. hooks/useXpBoosts.ts calls active_xp_boosts() on focus.
2. This week (app/(tabs)/index.tsx): one banner line above the starter
   card. "Double XP until Sunday night", or for win-back "Double XP on your
   next quest this week". Tokens only. No animation beyond a 150-250 ms
   fade.
3. Quest detail (app/quest/[id].tsx): "2x today" beside the XP when a
   global or quest boost applies. Never promise first-finisher.
4. lib/submitCompletion.ts: select xp_awarded, xp_reason on the insert
   return.
5. components/CompletionCelebration.tsx: show xp_awarded, not
   quest.xp_reward. One reason line when present, e.g. "First to finish
   it: +50%".
6. Analytics: completion_verified xp = awarded, plus xp_multiplier and
   xp_reason. New event xp_boost_seen {kind}.
7. Device checklist (after 043 is applied): an admin weekend event shows
   the banner, a completion pays 2x, Rankings sums awarded XP.
```

## Card D: Duo quests and referral (Phase 5). Start after B is merged.

```
Task: implement Phase 5 of docs/design/NEXT-BUILD-PLAN-2026-11-19.md, duo
quests and the referral kicker (Spec 06 section 1). Depends on migration
043 (xp_awarded). If card C is merged, build on lib/submitCompletion.ts.

Migration supabase/migrations/044_duo_quests.sql:
- quests.min_party_size smallint default 1, check in (1,2), with a grant.
- quest_parties: 6-char code from ABCDEFGHJKMNPQRSTUVWXYZ23456789,
  expires 2 h after creation, one open party per creator (partial unique
  index).
- quest_party_members, max 2.
- RLS: members read their own party only. No client writes.
- Definer RPCs: create_party, join_party (errors PARTY_NOT_FOUND /
  PARTY_EXPIRED / PARTY_FULL / PARTY_SELF), leave_party, own_party.
  Rate limit 10 per hour.
- normalize_completion_on_insert (redefine from 043): a min_party_size = 2
  quest needs the caller in an open party for that quest that already has
  2 members. Otherwise raise PARTY_REQUIRED (check_violation, hint
  PARTY_REQUIRED).
- AFTER INSERT: when the second member verifies while the party is open,
  both get +round(0.5 x base). Use +base if either account is under 48 h
  old. Add it to xp_awarded (reason 'duo') plus the profile total_xp
  delta and level recompute, in one definer function.
- Recruiter badge: a new 'recruits' rule type in evaluate_badge_unlock
  (021) plus a badge seed (threshold 3).
- notifications kind 'duo_bonus' so the first member hears about a late
  bonus.
- "Verifying 044" block in the migration README.

Mobile:
- "Start with a friend" on duo quest detail.
- app/party/[code].tsx lobby: big code, QR (react-native-qrcode-svg; it's
  pure JS, and react-native-svg is already installed), share
  quest://party/CODE, partner status, expiry in text.
- "Have a code?" on This week and after sign-up.
- classifyInsertError learns PARTY_REQUIRED.
- The celebration shows both usernames.
- Deep link route for quest://party/:code.
Admin: party size on quest create/edit, and a Duo filter on /quests.
Analytics: party_created, party_joined, party_expired, duo_completed
{referral}.
Tests: __tests__/party.test.js (code alphabet and validation, lobby state,
error copy) plus SQL guards.
Device checklist: two phones, create -> join by QR -> both submit -> both
see the bonus.
```

## Cards E1–E6: Cutouts and accessibility (Phase 6). Free now.

Each slice is one small branch. None of them may touch `app/submit/[questId].tsx`, `lib/submitCompletion.ts`, `app/(tabs)/index.tsx` or `components/CompletionCelebration.tsx` while cards A–D are open.

```
Task: Phase 6 slice <E1-E6> of docs/design/NEXT-BUILD-PLAN-2026-11-19.md.

E1 Token debt. `cd apps/mobile && npm run lint:tokens` reports 126 raw
   tokens in 16 files. Replace each with lib/theme.ts tokens until it
   reports 0 (add tokens to theme.ts only when BRAND.md defines the
   value). Then remove `continue-on-error` from the token report job in
   .github/workflows/ci.yml and run the script with --strict.
E2 Skeletons. Replace remaining centred ActivityIndicator loading states
   with skeletons shaped like the content (folders, bubbles, rows), per
   BRAND rule 9. No shimmer loops.
E3 "Photos from here" rows on quest detail show relative time ("2 h ago",
   "Yesterday"), tabular figures.
E4 Selfie in own-profile completion views via useSignedSelfie. Never
   public; only the owner sees it (D6). Don't touch the celebration while
   card C is open.
E5 Accessibility pass on every screen: 48 pt targets, accessibilityLabel
   and accessibilityRole on every Pressable, alt text on images, layout
   holds at 130% text, reduce-motion crossfade, colour never the only
   signal. Write the findings and fixes in your report.
E6 Remove sprite and category-default cutout code paths retired by
   BRAND.md (Nov 12). A quest without a real cutout shows no sticker.
```
