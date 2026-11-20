# Quest! — next build plan: phases 3–6 (Nov 19, 2026)

This plan picks up where the [Nov 17 plan](NEXT-BUILD-PLAN-2026-11.md) leaves off. That plan's Phases 0 and 1 are merged into `cursor/cutouts-this-week-quests` ([PR #15](https://github.com/Rahilyw/Quest/pull/15)), with CI green on Nov 19. This document replaces the Nov 17 plan's Phase 3–6 sections with buildable detail. The priorities are unchanged: pilot launch first, and chains deferred until there are 35 live quests.

Status words, used strictly: **in checkout**, **locally tested**, **applied**, **deployed**, **device-verified**.

## Where things stand

| Item | State |
|---|---|
| Migrations 002–040 | Applied to production (039 and 040 on Nov 11). The 039 verification queries are not recorded. |
| 041 push draining + recap push | In checkout and locally tested. **Not applied.** The function is not deployed. |
| 042 proof-photo owner policies | In checkout. **Not applied.** The 1d retry flow needs it on the server: without it, upsert and cleanup are RLS no-ops. |
| Admin auth (1c), submission integrity (1d), analytics (1e), cleanup (1f) | In checkout and locally tested. The admin build is not deployed. |
| Device checks | None run: no recap, retry, airplane-mode or map test yet. |
| Owner checklist (Nov 17 plan, Phase 2) | Not started per repo records. |

### Owner gates

| Gate | Blocks |
|---|---|
| Apply 041 and set the drain-cron Vault values | 043, which redefines `enqueue_week_recap` and uses the `win_back` push kind added in 041 |
| Apply 042 | Shipping a mobile build with the 1d retry flow, and the Phase 3 offline queue on device |
| Apply 043 | Phase 4 mobile, and all of Phase 5 |
| Merge PR #15 | Not a hard block. New phase branches should cut from `main` once it lands, so CI and review stay clean. |

The code below can be written before the owner gates clear. Nothing ships to a phone until they do.

## Lanes

Two lanes run in parallel, then join. Each lane works on its own branch and in its own files.

```
Lane A (mobile only)          Lane B (SQL + admin)
Phase 3 offline queue    ||   Phase 4a XP events: 043 + admin
           \                 /
            Phase 4b XP events: mobile (banner, celebration XP)
                    |
            Phase 5 duo quests (044, mobile, admin)

Phase 6 polish: small slices between the above, never touching
`app/submit/[questId].tsx` while Lane A or 4b is open
```

---

## Phase 3 — Offline submission queue (Spec 06 §5) — Lane A, about 3 days

**Status (Nov 19): merged into `cursor/cutouts-this-week-quests` and locally tested; not device-tested.** The runbook Step 5 checklist covers device testing. Deviations from this section are recorded in the Spec 06 §5 implementation note.

**Goal.** A player who captures proof with no signal keeps it, and it gets sent later, without anyone pretending it was verified.

**Builds on.** `lib/submissionAttempt.js` already fixes the attempt id, the storage path (`placePhotoPath`) and the captured coordinates per capture. `classifyInsertError` already separates `network` from server answers. No migration is needed; 042 must be applied for the deterministic upsert path.

### Files

| File | Change |
|---|---|
| `lib/submissionQueue.js` + `.d.ts` (new, pure) | Queue model: `enqueue`, `nextDue(now)`, `markAttempt(id, error, now)` with backoff (30 s, 2 min, 10 min, 30 min, then hourly), `expire(now)`, and `MAX_ITEMS = 3`, `TTL = 72 h`. No React and no I/O, so it can be tested in Node. |
| `lib/submissionQueueStore.ts` (new) | AsyncStorage key `quest.submissionQueue.v1.<userId>`. Photos are moved from the camera cache to `FileSystem.documentDirectory + 'queue/'`. Has `purge(userId)`, which deletes the files and the key. |
| `lib/submitCompletion.ts` (new, extracted) | Moves the upload → insert → reward-read pipeline out of `app/submit/[questId].tsx` into one function. It takes `{userId, questId, attempt, placeUri, selfieUri?}` and returns a typed result: `verified` (with completion row), `duplicate`, `rate_limited`, `outside_zone`, `rejected`, or `network`. The submit screen and the queue flusher both call it, so there is one pipeline. |
| `hooks/useSubmissionQueue.tsx` (new) | A provider mounted in `app/_layout.tsx` under auth. It flushes on app foreground (`AppState`), on sign-in, and on demand. One flush runs at a time, guarded by a ref. It exposes `{items, sendNow(id), discard(id)}`. |
| `app/submit/[questId].tsx` | On a `network` result: enqueue, then show "Saved. We'll send it when you're back online." with a Done button that leaves the camera. Other results keep today's paths. |
| `app/(tabs)/_layout.tsx` / `components/QuestTabBar.tsx` | A dot on You while anything is queued, with accessibility label "You, 1 proof waiting to send". |
| `app/(tabs)/profile.tsx` | A "Waiting to send" row per item: quest title, "Taken 2:14 pm", and **Send now** / **Discard** actions. |
| Sign-out (`hooks/useAuth`) and account deletion (`app/settings.tsx`) | Call `purge(userId)` before the session ends. |
| `lib/analytics.ts` | New events: `proof_queued {quest_id}`, `proof_queue_sent {quest_id, waited_minutes}` (bucketed), `proof_queue_dropped {quest_id, reason: 'expired'|'discarded'|'rejected'}`. No coordinates. |

### Rules

- Enqueue **only** on `network`. `rate_limited` stays retryable on screen, as today. `outside_zone` and `rejected` delete the upload, as today.
- On flush, `duplicate` counts as success, because the same attempt id may already have inserted before the connection dropped. Then remove the item.
- A flush that returns `outside_zone` or `rejected` tells the player once ("That proof couldn't be sent: you weren't inside the zone when it was taken."), drops the item and deletes its files.
- The server is unchanged and still the authority. `completed_at` is server `now()` (F-003). A proof flushed after Sunday midnight counts toward the new week; the Spec 06 §5 note already says so.
- No "verified" copy anywhere until the insert returns. A successful background flush shows a small banner ("Sent: Breakwater sunrise. +150 XP") that opens `completion/[id]`. It does not replay the full celebration off-screen.
- Only one item per quest: a second capture of a queued quest replaces the first.

### Done when

- `__tests__/submissionQueue.test.js` covers: bounds, TTL expiry, the backoff schedule, one item per quest, `duplicate` → success, and purge on a user switch. It's added to the mobile `test` script.
- `tsc` and the full mobile suite are clean.
- A device checklist is added to the runbook (Step 0a style):
  1. Airplane mode → capture → "Saved".
  2. Kill the app → reopen online → it flushes.
  3. The dot clears.
  4. A queued item older than 72 hours is dropped with a message.
  5. Sign out purges the queue.

---

## Phase 4 — XP economy events (Spec 06 §3)

### 4a. Server and admin — Lane B, about 3 days

**Status (Nov 19): merged into `cursor/cutouts-this-week-quests` and locally tested (26 tests in `xpEvents.test.js`, admin `tsc` and `next build`). Migration 043 is written, not executed or applied; it needs 041 and 042 applied first.**

**Migration `043_xp_events.sql`.** Requires 041 to be applied first.

1. **Stored award.** Add `completions.xp_awarded integer`, backfill it to the quest's `xp_reward` on every row, then set it `NOT NULL`. Add `GRANT SELECT (xp_awarded) ON completions TO anon, authenticated` (038 rule). Also add `completions.xp_reason text` (`null | 'weekend' | 'quest' | 'first_finisher' | 'win_back' | 'duo'`), with the same grant.
2. **Events table.**
   ```sql
   xp_events(id uuid pk default gen_random_uuid(),
             kind text check (kind in ('multiplier','first_finisher','win_back')),
             multiplier numeric(3,2) not null check (multiplier between 1 and 3),
             quest_id uuid null references quests on delete cascade,
             user_id uuid null references profiles on delete cascade,
             label text null,                 -- admin-facing name
             starts_at timestamptz not null, ends_at timestamptz not null check (ends_at > starts_at),
             consumed_at timestamptz null,    -- win_back only
             created_by text null, created_at timestamptz default now())
   ```
   RLS is on, with no client policies. Writes go through the service role (admin) only.
3. **Computing the award.** In `normalize_completion_on_insert` (redefined from 038:41, keeping all its current logic):
   - Base is `quests.xp_reward`.
   - `m_event` is the max multiplier of the active rows where `kind = 'multiplier'` and the row is either global (`quest_id is null and user_id is null`) or matches this quest.
   - `m_personal` is the multiplier of the caller's oldest active, unconsumed `win_back` row. That row is consumed (`consumed_at = now()`).
   - `m = greatest(1, m_event, m_personal)`. Events do not stack; the highest one wins, and `xp_reason` records it.
   - First finisher: the quest's `coalesce(active_from, created_at)` is within the last 7 days, and no approved completion of it exists yet. A `pg_advisory_xact_lock(hashtext(quest_id::text))` around the check means two finishers can't both get it. When it applies, `m := m * 1.5` and the reason becomes `first_finisher`.
   - `NEW.xp_awarded := round(base * least(m, 3))`.
4. **Rewards read the stored value.**
   - Add `apply_completion_rewards(p_completion_id uuid)`, which reads `xp_awarded`. Point both wrappers at it: `apply_completion_rewards_on_insert` (017:110) and `award_xp_on_approval` (017:96).
   - Drop the `(uuid, uuid)` overload and revoke the new function from clients (030 pattern).
   - A reinstate pays back the same stored award, not one recomputed from today's events.
5. **Everything that sums XP switches to `coalesce(c.xp_awarded, q.xp_reward)`:**
   - `revoke_completion_rewards` (017:202)
   - the `leaderboard` view (031:130), which also covers `snapshot_last_week_ranks`
   - `own_week_recap` (040:77, :111, :145)
   - `enqueue_week_recap` (041:307)

   A side effect worth stating: past weeks no longer change when an admin edits a quest's `xp_reward`. This fixes part of the recap drift noted in Spec 06 §2.
6. **Client read.** Add `active_xp_boosts()`, a definer RPC for the authenticated caller. It returns the active global and quest multipliers (`{quest_id|null, multiplier, ends_at, label}`) plus the caller's own unconsumed `win_back`. No other player's rows are visible.
7. **Reward read.** Extend `own_completion_reward` to also return `xp_awarded` and `xp_reason`, so the celebration can show the real number for any quest, not only sponsored ones.
8. **Win-back job.** Daily pg_cron at 17:00 America/Vancouver, using the two-UTC-schedules-plus-local-guard pattern from 034. It targets players whose last approved completion is 10–60 days old, who have `push_token is not null` and `push_drops = true`, and who have no `win_back` row in the last 30 days. For each, it inserts a 7-day ×2 personal row and a `push_outbox` row of kind `win_back`: "Victoria misses you. Double XP on your next quest this week." 041's sender already gates `win_back` on `push_drops`.
9. **Verification block.** Add "Verifying 043" to `supabase/migrations/README.md`:
   - backfill count: no nulls in `xp_awarded`;
   - grant check;
   - one global event raises a test insert to ×2, and a quest event plus a weekend event gives the max, not the product;
   - first-finisher fires once under two concurrent inserts;
   - revoke subtracts the stored award;
   - the leaderboard equals the sum of `xp_awarded`.

**Admin (`apps/admin`).**
- New `/xp-events` page:
  - Lists active, upcoming and ended events.
  - Create form with presets: "Double XP this weekend" (Sat 00:00 → Mon 00:00 Victoria), "Double XP on one quest" (pick a quest, a date range), and a custom option (multiplier 1.25–3).
  - An "End now" action.
  - Every action calls `requireAdmin()`.
  - Win-back rows are not listed individually; the page shows a count only.
- Dashboard: an "Active boost" card.
- Completions and moderation queries select `xp_awarded` and display it in place of `quests.xp_reward` (`app/completions/actions.ts:24`, `app/moderation/actions.ts:48`).

**Tests.**
- `__tests__/xpEvents.test.js`: a pure JS mirror of the multiplier rule (precedence, cap, first-finisher window, rounding), plus SQL text guards in the style of `profilePrivacy.test.js`:
  - the 043 grant includes `xp_awarded`;
  - no remaining `sum(q.xp_reward)` in any function or view that 043 redefines;
  - the old `apply_completion_rewards(uuid, uuid)` is dropped.
- Admin: `tsc` and `next build`.

### 4b. Mobile — after Phase 3 merges, about 1.5 days

| File | Change |
|---|---|
| `hooks/useXpBoosts.ts` (new) | Calls `active_xp_boosts()` on focus of This week and quest detail. |
| `app/(tabs)/index.tsx` | One banner line above the starter card: "Double XP until Sunday night" or "Double XP on your next quest this week" (win-back). Tokens only, ink on paper, no confetti. |
| `app/quest/[id].tsx` | Shows "2× today" beside the XP figure when a global or quest boost applies. First-finisher is not promised up front, because it is a race. |
| `lib/submitCompletion.ts` | Selects `xp_awarded, xp_reason` on the insert return. |
| `components/CompletionCelebration.tsx` | Uses `xpAwarded` in place of `quest.xp_reward`, with one reason line when present ("First to finish it: +50%"). |
| `lib/analytics.ts` | `completion_verified` gets `xp` = awarded, plus `xp_multiplier` and `xp_reason`. New event `xp_boost_seen {kind}`. |

**Done when:** the mobile tests and `tsc` pass; device checklist for after 043 is applied: an admin weekend event shows the banner, a completion pays ×2, and Rankings sums the awarded XP.

---

## Phase 5 — Duo quests and referral (Spec 06 §1) — after 043, about 6 days

**Migration `044_duo_quests.sql`.**
- **`quests.min_party_size`:** `smallint not null default 1 check (min_party_size in (1,2))`. Add a client grant.
- **`quest_parties`:** `id, quest_id, code char(6) unique, created_by, created_at, expires_at`.
  - Codes use the alphabet `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no 0/O/1/I/L).
  - `expires_at = created_at + 2h`.
  - A partial unique index on `created_by` where the party is open allows one open party per player.
- **`quest_party_members`:** `party_id, user_id, joined_at, completion_id null`, with primary key `(party_id, user_id)` and at most 2 members.
- RLS: members can read their own party and its members. There are no client writes.
- **RPCs** (definer, authenticated):
  - `create_party(quest_id)` returns `{code, expires_at}`.
  - `join_party(code)` returns `{quest_id, partner_username}`. Errors: `PARTY_NOT_FOUND`, `PARTY_EXPIRED`, `PARTY_FULL`, `PARTY_SELF`.
  - `leave_party(code)`.
  - `own_party(quest_id)` returns the open party and its members for the lobby.
  - Rate limit: 10 creates or joins per hour per user.
- **Insert gate.** In `normalize_completion_on_insert`, a quest with `min_party_size = 2` requires the caller to be in an open party for that quest that **already has 2 members**. Otherwise it raises `PARTY_REQUIRED` (SQLSTATE `check_violation`, hint `PARTY_REQUIRED`). `classifyInsertError` learns this new code.
- **Duo bonus.** An AFTER INSERT trigger runs when the second member's completion lands while the party is open.
  - In one definer function, both members get `+round(0.5 × base)`: the second member through its own `xp_awarded` (`xp_reason = 'duo'`), and the first member through an update of their completion's `xp_awarded` plus a matching `profiles.total_xp` delta and a level recompute.
  - Revoke already subtracts the stored award, so removing either completion takes its bonus with it.
  - Edge case: the first member's bonus counts toward the week of that member's completion. A party spanning Sunday midnight is possible within the 2-hour window. It is documented and accepted.
- **Referral kicker.** If either member's `profiles.created_at` is under 48 hours old, the bonus is `+base` instead of `+0.5 × base`, and the party creator earns a Recruiter tick. This adds a new rule type `recruits` to `evaluate_badge_unlock` (021), which counts distinct duo partners whose accounts were under 48 hours old at completion, plus a Recruiter badge seed (threshold 3).
- **Verifying 044:**
  - the code alphabet;
  - one open party;
  - a solo attempt is refused with `PARTY_REQUIRED`;
  - two-member insert pays both;
  - the referral case pays double;
  - removal revokes the bonus.

**Mobile.**
- `app/quest/[id].tsx`, for duo quests: a "Bring a friend" panel, and "Start with a friend" in place of the plain start button.
- `app/party/[code].tsx` (new lobby):
  - big code (tabular figures), a QR via `react-native-qrcode-svg` (JS-only, on top of the existing `react-native-svg`), and Share (`quest://party/CODE` plus the store link);
  - partner status: "Waiting for a friend" → "@sam is in";
  - "Go to the camera" enables at 2 members;
  - the expiry countdown in text, not only colour.
- "Have a code?" entry: an input on This week and a step after sign-up.
- Deep link: the `quest://party/:code` route handled in `lib/push-navigation.ts` / expo-router.
- The celebration shows both usernames when the bonus lands.
- If the partner's bonus lands later, it reaches the first member through the inbox and a social push. That needs a new `notifications.kind = 'duo_bonus'` in 044, routed by `send-social-push`.

**Admin.** A party-size select on quest create and edit, and a "Duo" filter on `/quests`.

**Owner.**
- Write 3–5 duo quests.
- Decide on universal links: `associatedDomains` and `intentFilters` need a domain the owner controls and an AASA/assetlinks file. Until then, a new player types the code after installing.

**Analytics.** `party_created`, `party_joined`, `party_expired`, and `duo_completed {referral}`.

**Done when:**
- `__tests__/party.test.js` passes: code generation and validation, lobby state machine, error copy.
- SQL guards pass.
- Two-phone device checklist: create → join by QR → both submit → both see the bonus.

---

## Phase 6 — Cutouts finish and accessibility (slices between lanes)

Each slice is one small branch. None touches `app/submit/[questId].tsx`, `lib/submitCompletion.ts` or `app/(tabs)/index.tsx` while a lane has them open.

1. **Token debt:** 126 raw tokens across 16 files → 0. Then `lint:tokens --strict` becomes a CI gate (the `token report` job loses `continue-on-error`).
2. **Skeletons:** replace the remaining centred spinners with folder/bubble-shaped skeletons (BRAND rule 9).
3. **"Photos from here":** rows show relative time.
4. **Selfie:** shown in the celebration and in own-profile completion views via `useSignedSelfie`. It stays private (D6).
5. **Accessibility pass:**
   - 48 pt targets;
   - labels and alt text on every image;
   - layout survives 130% text;
   - reduce-motion crossfade;
   - colour is never the only signal (the zone map, category chips, the new queue dot).
6. **Sprite removal:** remove the remaining sprite and category-default cutout code paths per BRAND (Nov 12).

Device validation on a 360 dp Android and a large iPhone stays an owner task.

---

## Shipping

- `expo-updates` is **not** in `apps/mobile/package.json`, so OTA (R3) needs one native build first. Add it with the first TestFlight build. Phases 3–5 are then JS-only and can ship over the air: `expo-file-system`, AsyncStorage, `react-native-svg` and `expo-linking` are already native dependencies, and `react-native-qrcode-svg` is pure JS.
- Order on the server: 041 → 042 → 043 → 044, each followed by its verifying block before the next.
- The ledger and ROADMAP status tables are updated at each phase boundary.

## Non-goals here

Chains (gated), streak freeze (C1, which reuses `xp_events` later), save-for-later, flash quests, leagues, TanStack Query (R4), generated types (R5; needs the owner's CLI), and photo pre-screen (R2).
