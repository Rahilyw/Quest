# Quest! — next build plan (Nov 17, 2026)

## Context

The code for specs 01–05 and 07, the starter quest and the Sunday recap is in the checkout. Production has migrations through 040 (owner-applied Nov 11). The 039 verification queries have not been run, and nothing has been device-tested. The roadmap's "current" table is roughly right, but several docs still contradict it.

Not yet built:
- Spec 06 §3 XP events, §5 offline queue and §1 duo quests.
- The recap's Sunday push.
- Push draining that works beyond 100 recipients.

Pilot launch is blocked more by ops and verification than by features.

Owner decisions (today):
- **Pilot launch first.**
- **Chains stay deferred** until the catalog reaches 35 quests.
- **Plan covers code plus an owner checklist.**

Standing constraints, from the ledger and implementer prompts:
- No Supabase, Vercel or EAS calls or deploys by Claude.
- Migrations are forward-only, numbered 041 and up. Never rename an applied migration.
- A new column on `completions` or `profiles` needs an explicit column GRANT (038/039 removed table-level SELECT).
- XP stays server-authoritative.
- Analytics never carry coordinates, photos or free text.
- Keep the status words distinct: in checkout / locally tested / applied / deployed / device-verified.
- One reviewable commit per slice.

## Audit summary (verified in code)

**Push (OPS-01)**
- `supabase/functions/send-push-outbox/index.ts` sends 100 rows per call (`BATCH`, :35).
- Its only trigger is the weekly `weekly_drop_sends` webhook, so rows past 100 wait a week.
- It never checks `res.ok`: an error body marks every row sent.
- There is no row claiming (concurrent runs can double-send) and no attempt counter.

**XP plumbing**
- Base XP is read at `038_completion_secret_columns.sql:113`.
- Base XP is recomputed live from `quests.xp_reward` in three other places: revoke (017:212), the `leaderboard` view (031:137) and `own_week_recap` (040).
- Any multiplier therefore needs a stored `completions.xp_awarded`.

**Admin auth gaps**
- These moderation read actions skip `requireAdmin`: `getModerationQueue`, `getFlaggedCount`, `getCommentModerationQueue`, `getFlaggedCommentCount` (`apps/admin/app/moderation/actions.ts`).
- `/api/places/search` has no handler check.
- `isAdminEmail` allows any email outside production when the allowlist is empty.

**Submission (`apps/mobile/app/submit/[questId].tsx`)**
- `proof_submitted` fires before the insert.
- A failed insert leaves the place photo orphaned, and each retry uploads a new file.
- Retry uses live coordinates, not the captured ones.
- There is no offline handling and no data caching. `lib/types.ts` is hand-written and not passed to `createClient`.

**Analytics gaps**
- `badge_unlocked` is never fired.
- The starter card passes `source=first-quest`, which maps to `unknown`.
- `map.tsx` and `profile.tsx` pass no source.
- There is no `recap_viewed` event.

**CI**
- Skips `questWindow.test.js`, `redemption.test.js`, the admin `next build`, a Deno check of the functions, and token lint.
- Only runs on `main`. This branch is about 20 commits ahead of `main`.

**Dead code**
- `FeedPostCard`, `PlayerCard`, `QuestHeroCard`, `QuestCardSkeleton`, `Podium`, `QuestHistoryItem`, `CategoryChip` and `ui/CategoryIcon`.
- The map tab still uses the legacy `COLORS`/`CATEGORY_COLORS`.

**Doc contradictions**
- Whether 039/040 are applied: specs README, Spec 06, PRODUCT, README, ARCHITECTURE and the audit say not; ROADMAP and the runbook say yes.
- BRAND (Nov 12) retired sprites; UI-OVERHAUL-PLAN D8 still wants them.
- BRAND's "still verified" upload copy is wrong: nothing exists until the server inserts the completion.
- Tap target is 44pt in PRODUCT and 48pt in BRAND.
- ROADMAP H.2–H.5 are marked ❌ but are built.
- ROADMAP G.3 says sponsored seed rows are missing; they exist at `seed.sql:50–56`.

---

## Phase 0 — Truth and branch hygiene (half a day, code: Claude)

1. **Reconcile docs** to one status vocabulary. Fix the contradictions listed above.
   - Files: `docs/specs/README.md`, `docs/specs/06-growth-engagement.md`, `PRODUCT.md`, `README.md`, `ARCHITECTURE.md`, `ROADMAP.md`, `UI-OVERHAUL-PLAN.md`.
   - Rule: 039/040 are "applied Nov 11, unverified".
   - Make BRAND the source of truth for sprites and tap targets (48pt).
2. **Save this plan** into the repo as `docs/design/NEXT-BUILD-PLAN-2026-11.md`. Point the ledger's "Next concrete action" and the ROADMAP header at it.
3. **CI**
   - Run every test file via the workspace `npm test` scripts, or add the two missing `node` steps.
   - Add `next build` for admin.
   - Add `deno check` for both functions, if Deno setup is cheap; otherwise leave it as a noted gap.
   - Keep `lint:tokens` informational.
   - Trigger CI on pushes to `cursor/**` branches too.
4. **Owner decision (flagged, not done by Claude):** open a PR from `cursor/cutouts-this-week-quests` to `main` so CI covers this work before new features stack on it.

## Phase 1 — Launch-hardening code (2–3 days, code: Claude)

**Status (Nov 17, 2026): in checkout and locally tested; not applied, deployed or device-tested.**
- Merged into `cursor/cutouts-this-week-quests`.
- 1a and 1b landed together in migration `041_push_outbox_draining.sql`.
- 1d needed `042_proof_photo_owner_policies.sql`, which adds storage UPDATE/DELETE policies on unclaimed own proof photos so that upsert and failed-attempt cleanup work.
- Checks: 50 geofence, redemption, 147 logic, 9 quest-window, 25 recap, 8 profile-privacy, 18 push-outbox and 6 submission-attempt tests; both `tsc`; admin `next build`.
- The function only had a `tsc` check with a Deno shim; it was not `deno check`ed.
- Raw tokens: 126 in 16 files.
- XP events and duo quests keep 043 and 044.

**1a. Bounded push draining (OPS-01/F-007).** Migration `041_push_outbox_draining.sql`:
- Add `push_outbox.attempts int default 0`, `last_error text`, `claimed_at timestamptz`.
- Add a `claim_push_outbox(batch int)` RPC (`FOR UPDATE SKIP LOCKED`; reclaim stale claims older than 10 minutes). Service role only.
- Widen the `kind` CHECK to add `week_recap` and `win_back`. Adding `win_back` now avoids a second CHECK change in Phase 4.
- Add a pg_cron job every 5 minutes. It calls the function via `pg_net` only when unsent rows exist.
  - The function URL and secret come from Vault or settings that the owner sets.
  - If the owner prefers no pg_net, the fallback is a self-loop capped at N batches or 50 seconds inside the function.

`send-push-outbox/index.ts`:
- Loop claim → send for up to N batches or about 50 seconds.
- Check `res.ok` and the response shape. On failure, release claims and increment `attempts`.
- Dead-letter after 5 attempts.
- Generalise the `push_drops` gate to a per-kind preference. `week_recap` reuses `push_drops` (the "Weekly digest" toggle).

**1b. Sunday recap push (Spec 06 §2).** In the same migration or `042`:
- Add `enqueue_week_recap()`, modelled on `enqueue_weekly_drop()` (034:120). It is idempotent per Vancouver week through a `week_recap_sends` guard row, and only targets players with XP that week.
- Schedule it with pg_cron for Sunday 18:00 America/Vancouver. Write two UTC schedules and a local-time guard, the way 034:195–204 does.
- Payload deep-links to `/recap`. Add the route to `apps/mobile/lib/push-navigation.ts`.

**1c. Admin auth.**
- Call `requireAdmin()` in the four moderation read actions.
- Add an auth check in `apps/admin/app/api/places/search/route.ts`.
- `lib/admin-auth.ts`: an empty allowlist denies in every environment, unless an explicit `ADMIN_DEV_ALLOW_ALL=1` is set.
- Fix the create/update sponsor reward inconsistency (`quests/actions.ts:318` vs `:531`).

**1d. Submission integrity** (`app/submit/[questId].tsx`):
- Fire `proof_submitted` only after the insert succeeds.
- Use a deterministic upload path `${userId}/${questId}/${attemptId}.jpg` with `upsert`, so retries overwrite instead of piling up.
- On a final failure, delete the uploaded place photo.
- Keep the captured coordinates and timestamp in state, so a retry uses what was captured. This also sets up Phase 3.

**1e. Analytics fixes** (`lib/analytics.ts` and call sites):
- Fire `badge_unlocked` from the celebration when new badges arrive.
- Map `first-quest` to a `starter` source.
- Pass a source from `map.tsx` and `profile.tsx`.
- Add `recap_viewed`.

**1f. Cleanup.**
- Delete the dead components listed in the audit summary.
- Move `map.tsx` to `lib/theme` tokens.
- Remove the `logic.test.js` sections that test the deleted components.

## Phase 2 — Owner launch checklist (blocks TestFlight; owner only)

These steps follow `LAUNCH-RUNBOOK.md`. Claude prepares commands and copy only.

1. **Step 0a:** run the "Verifying 039" queries. Check the Settings alerts toggle and the recap on iPhone and Android.
2. **Apply 041 (and 042).** Set the Vault or settings values for the drain cron.
3. **Steps 0b/0c:** set the webhook secrets, deploy `send-social-push` and `send-push-outbox`, and create both webhooks. Verify a drain with more than 100 test rows, or a lowered `BATCH` in a branch.
4. **Step 1:** Apple Developer, App Store Connect record, the `eas.json` placeholders, `build:prod`, TestFlight.
5. **Steps 2–3:** PostHog key with replay off and the 4 dashboards; Sentry DSN in EAS env.
6. **Step 5 release spot checks:** bypass stripped, real-device geofence submit, account deletion, sponsored code, and one live merchant redemption at `/redeem/[merchantKey]`.
7. **Step 6:** delete the retired functions and turn on leaked-password protection.
8. **Content:** place photos and cutouts for the roughly 25 quests, plus `action_phrase` copy. Do these before inviting the R1 closed cohort of 10–20 locals.

## Phase 3 — Offline submission queue (Spec 06 §5) (2–3 days)

This goes ahead of XP events, which reverses spec §6's order. A failed upload at the summit costs the pilot's one first impression; XP events need an audience before they matter.

- **New `apps/mobile/lib/submissionQueue.ts`** (pure logic, unit-tested) and `hooks/useSubmissionQueue.ts`.
- **Storage**
  - Each item is stored under an AsyncStorage key scoped to the user: `{id, questId, photoPath, selfiePath?, lat, lng, accuracy, capturedAt, attempts}`.
  - Photos are copied from the cache into `FileSystem.documentDirectory` so the OS can't purge them.
  - Bounds: at most 3 items, each expiring after 72 hours.
  - The queue is purged on sign-out and on account deletion.
- **Enqueue** only when the error is a network failure (no response). Server rejections (geofence, rate limit, 23514) go through today's paths.
- **Flush**
  - Runs on app foreground (`AppState`) and on queue-screen focus, with exponential backoff.
  - Reuses the Phase 1d deterministic upload path and the captured coordinates.
  - A 23505 duplicate counts as success, so retries are idempotent.
  - On success it fetches the reward and shows a celebration on the next foreground.
- **Server trust is unchanged.** `completed_at` stays `now()` (F-003), so a queue flushed after Sunday midnight counts toward the new week. The spec doc will say so.
  - Geofence is checked against the captured coordinates, which is today's behaviour, since the client already sends coordinates.
  - Rate limits apply at flush.
- **UI**
  - Copy: "Saved. We'll send it when you're back online." It never says verified.
  - A dot on the You tab (`app/(tabs)/_layout.tsx`).
  - A queued row on You with "Send now" and "Discard".
- **Dependencies:** check `apps/mobile/package.json` for `expo-file-system` (likely present) and `@react-native-community/netinfo` (optional; `AppState` alone is enough).

## Phase 4 — XP economy events (Spec 06 §3) (3–4 days)

**Migration `043_xp_events.sql`**
- Table `xp_events(id, kind in ('multiplier','first_finisher','win_back'), multiplier numeric check (multiplier between 1 and 3), quest_id null, user_id null, starts_at, ends_at, created_by, created_at)`.
  - RLS: clients read only active global rows and their own personal rows. Writes are service role only.
- Column `completions.xp_awarded int`.
  - Backfill it to the quest's `xp_reward` for approved rows.
  - Add a `GRANT SELECT (xp_awarded)` to authenticated.
- `normalize_completion_on_insert` (live in 038:41) computes `xp_awarded` in BEFORE INSERT:
  - Base is `quests.xp_reward`.
  - Multiplier is the max of the active global, quest and personal multipliers. Events don't stack; the highest wins.
  - First-finisher adds ×1.5 when this is the first approved completion of a quest created in the last 7 days. It uses an advisory lock per quest so two finishers can't both get it.
  - The result is rounded and capped at 3× base.
  - A personal `win_back` row is consumed: its `ends_at` is set to now.
- `apply_completion_rewards` reads the completion's `xp_awarded` instead of `quests.xp_reward`.
  - Change its trigger wrappers (017:110/124, initial_schema `on_completion_approved`) to pass `NEW.id`.
  - Keep the old signature revoked (030 pattern).
- Revoke (017:212 logic), the `leaderboard` view, `snapshot_last_week_ranks` and `own_week_recap` all switch to `coalesce(c.xp_awarded, q.xp_reward)`.
- Win-back cron, daily:
  - Targets players quiet for 10+ days who have a push token.
  - Inserts a personal row (7-day window) and a `push_outbox` `win_back` row.
  - At most once per 30 days per user, enforced by a guard table or a `last_win_back_at` column.
  - The gate is `push_drops`.

**Admin**
- New `/xp-events` page: list, create (presets "Double XP this weekend" and "Double XP on quest…"), end now.
- Every action calls `requireAdmin`.
- The dashboard shows the active event.

**Mobile**
- Banner on This week (`app/(tabs)/index.tsx`): "Double XP until Sunday night".
- The celebration shows the multiplier line from `own_completion_reward`, extended to return `xp_awarded` and the reason.
- Add `xp_multiplier` and `xp_reason` to `completion_verified`.

**Tests**
- Pure-logic multiplier/precedence mirror cases in a new `__tests__/xpEvents.test.js`.
- SQL text guards in the style of `profilePrivacy.test.js` (grant present, coalesce used everywhere `xp_reward` is summed).

## Phase 5 — Duo quests and referral (Spec 06 §1) (5–7 days)

**Migration `044_duo_quests.sql`**
- `quests.min_party_size` (1 or 2), `quest_parties`, `quest_party_members`.
  - RLS: members read their own party. Writes go only through RPCs.
- `create_party(quest_id)` returns a 6-character code from an unambiguous alphabet, expiring in 2 hours. A player can hold one open party.
- `join_party(code)`: members must be distinct accounts, and the party must be open and not full.
- In BEFORE INSERT, a duo-quest completion requires an open party membership and links it.
- When the second member's completion verifies, both get +50% of base. This uses the Phase 4 `xp_awarded` (an update of the first member's row plus a profile delta, all in one definer function).
- Referral kicker: if either member's account is under 48 hours old, the bonus doubles and the inviter gets a Recruiter progress tick. That needs a new rule type in `evaluate_badge_unlock` (021) and a Recruiter badge seed.

**Mobile**
- "Start with a friend" on quest detail for duo quests: shows the code, a QR (`react-native-qrcode-svg`) and a share link `quest://party/CODE`.
- Party lobby screen `app/party/[code].tsx`.
- "Have a code?" entry on This week and after sign-up.
- The celebration shows the pair.

**Deep links**
- The `quest://` scheme works now.
- Universal links (`associatedDomains`/`intentFilters`) and a store fallback need a domain, so they go on the owner checklist.
- For v1, a new user types the code after sign-up. There is no deferred-deep-link service.

**Admin:** a party-size field on quest create/edit.

**Content (owner):** 3–5 duo quests.

**Analytics:** `party_created`, `party_joined`, `duo_completed` (with `referral: boolean`).

## Phase 6 — Cutouts finish and accessibility (runs alongside Phases 3–5 in small slices)

- Skeleton loaders where spinners remain (BRAND rule 9).
- Wire the selfie into the celebration and own-profile views via `useSignedSelfie`. It stays private (D6).
- "Photos from here" rows show times.
- Drive the token debt (170 raw tokens in 23 files) to 0, then make `lint:tokens --strict` a CI gate.
- Accessibility pass: 48pt targets, labels and alt text, 130% text, reduce motion.
- Device validation on a 360dp Android and a large iPhone stays an owner task.
- Remove remaining sprite/category-default cutout code paths if BRAND's retirement stands.

## Phase 7 — Gated or post-pilot (not scheduled)

- **Chains (Spec 05 §3):** only when there are 35 or more live quests and the owner says go.
- **Data-gated candidates:** streak freeze (C1, uses `xp_events` infra), save-for-later (C2), flash quests (C4, reuses drops plus the outbox), leagues (C5, if weekly active users pass 100).
- **Tech:**
  - R5 `supabase gen types`. Needs the owner to run the CLI against the project, then thread `Database` into `createClient`.
  - R4 TanStack Query, once data surfaces multiply.
  - R2 photo pre-screen, if report volume grows.

---

## Critical files

- **Push:** `supabase/functions/send-push-outbox/index.ts`; migration 034 (`push_outbox`, `enqueue_weekly_drop`, cron pattern).
- **XP:** migrations 017 (revoke, award wrappers), 031 (leaderboard, snapshot), 038 (`normalize`, `apply_completion_rewards`), 040 (`own_week_recap`), 021 (badge evaluator).
- **Mobile:** `app/submit/[questId].tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/_layout.tsx`, `lib/analytics.ts`, `lib/push-navigation.ts`, `components/CompletionCelebration.tsx`, `lib/theme.ts`.
- **Admin:** `app/moderation/actions.ts`, `app/api/places/search/route.ts`, `lib/admin-auth.ts`, `lib/require-admin.ts`, `app/quests/actions.ts`.
- **CI and docs:** `.github/workflows/ci.yml`, the ledger, ROADMAP, the specs README.

## Verification (every slice)

- `npm test --workspace @quest/geofence` and `npm test --workspace mobile`. These cover all four mobile test files plus the redemption tests.
- `cd apps/mobile && npx tsc --noEmit`, `cd apps/admin && npx tsc --noEmit`, and `npx next build` for admin.
- New pure-logic tests per phase: `submissionQueue`, `xpEvents`, party code/validation. Add SQL text guards for every new grant or column.
- Deno check of the edge functions where Deno is available.
- SQL is not executed locally: there is no Docker or CLI on the machine.
  - Each migration ships with a "Verifying 04x" query block in `supabase/migrations/README.md` for the owner to run after applying.
  - Status is recorded as "in checkout / locally tested" until the owner confirms it was applied.
- Device checks per phase go into runbook Step 0a style checklists:
  - Phase 3: airplane-mode submit, then flush on foreground.
  - Phase 4: a double-XP event shows in the banner and celebration, and the leaderboard sums the awarded XP.
  - Phase 5: two phones run a duo flow.
- Update the ledger and ROADMAP status at each phase boundary.
