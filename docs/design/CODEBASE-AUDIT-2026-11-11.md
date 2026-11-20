# Quest! codebase audit — November 11, 2026

This is a read-only audit snapshot of the checkout, not a deployment certification. It
records reproducible local checks and conflicts found in first-party code and docs. Remote
database state below is cited only as a claim made by the repository's November 10 runbook
and ledger; it was not queried in this audit.

## Baseline and scope

- Branch: `cursor/cutouts-this-week-quests`, HEAD `9221463` (`chore: update migration files and runbook with latest applied changes as of Nov 10, 2026`). The worktree was clean at inspection.
- Documentation inventory covered: README, PRODUCT, ROADMAP, ARCHITECTURE, DESIGN, LAUNCH-RUNBOOK, mobile BUILDING, migration README, specs index and specs 01–07, BRAND, UI-OVERHAUL-PLAN, Claude prompts, campaign ledger, and story bank. Detailed reconciliation focused on current status, migration/deployment claims, feature specs and the next implementation handoff. Vendored `node_modules`, generated/build output, font license material, and historical `.claude/worktrees/**` were excluded.
- Code/config inventory covered: mobile routes, hooks, libraries and components; admin routes/actions/libraries; shared geofence package; all 38 numbered SQL migrations plus timestamped initial schema; Supabase functions/config/seed; scripts, package manifests and CI. Security-oriented tracing focused on profile/completion grants, XP and completion triggers, push delivery, redemption, weekly-drop and current migration ordering. This is a static/local audit, not an exhaustive line-by-line security review.
- No root `AGENTS.md` was present. The campaign ledger and Fable prompt contain historical session state; they must not be treated as current runtime truth.

## Local verification

| Check | Result |
|---|---|
| `npm test --workspace @quest/geofence` | Pass: 50 geofence assertions and redemption tests |
| `npm test --workspace mobile` | Pass: 159 logic assertions and 9 quest-window tests |
| `cd apps/mobile && npx tsc --noEmit` | Pass |
| `cd apps/admin && npx tsc --noEmit` | Pass |

These checks do not execute SQL migrations, build native binaries, validate accessibility on
devices, or prove that Edge Functions/webhooks are deployed.

## Findings

| ID | Priority | State | Evidence and impact |
|---|---|---|---|
| SEC-01 | P1 | **Fix written, not applied.** Migration `039` and client changes are in the checkout (see "Follow-up implementation" below). The hosted database is unchanged, so the exposure stays live there until an owner applies 039. | `20260619010246_initial_schema.sql` creates a profiles SELECT policy with `USING (true)`. Migrations 026/029 lock down profile UPDATE columns, but do not restrict SELECT of `push_token`. The mobile settings query reads only its own profile, but RLS permits any authenticated user to query other profiles. The Expo token is therefore exposed to authenticated clients. Migration 038 fixes analogous secret-column exposure on `completions`, not profiles. Check all client reads/writes and push consumers before choosing a forward-only grant/RPC fix. |
| DB-01 | P2 | **Documented, not verified.** `supabase/migrations/README.md` has a clean-install procedure (baseline by hand, `migration repair`, then `db push`). It was not executed. | Fresh filename order places `002_badge_unlock_trigger.sql` before `20260619010246_initial_schema.sql`, although 002 requires `profiles` and its schema. `supabase/migrations/README.md` says filename order and `--include-all`, and explicitly notes the timestamp sorts after numbered files. A clean project bootstrap therefore needs a documented, reproducible ordering/bootstrap strategy; do not rename a migration already recorded remotely. |
| DOC-01 | P2 | Addressed in documentation update | README now matches the package's Next.js/React versions, migration range, UI navigation and local test/CI scripts. Architecture map updated for current migrations and feature status. |
| DOC-02 | P2 | Addressed in documentation update | ROADMAP and specs index now identify current status and label older phase tables as historical; deployment claims are attributed to the runbook rather than inferred from code. |
| DOC-03 | P2 | Addressed in documentation update | The stale “local until applied” comment was replaced with the runbook-reported status, explicitly requiring re-verification before deployment. |
| OPS-01 | P2 | External / not verified | `send-push-outbox` is explicitly described as undeployed in ROADMAP, runbook and spec 05. Its implementation processes at most 100 recipients per invocation and requests another invocation; the current webhook contract is not shown to loop. Larger weekly audiences could leave queued recipients undelivered. Confirm behavior and add bounded draining/retry semantics before claiming delivery. |
| PROD-01 | P2 | **Implemented in checkout; not applied, not device-tested.** Migration `040` plus the recap screen and card. | The current next-feature handoff points to Spec 06 §2 Sunday recap. Existing share cards are per-completion only. A recap needs a week-specific, Vancouver-time query and rank; the live/current leaderboard cannot stand in for a historical week. |

## Feature status matrix (checkout evidence, not deployment)

| Spec | Status in checkout | Main evidence / remaining boundary |
|---|---|---|
| 01 Geofence drawing | Implemented | SQL 013–015, 024–026; admin `GeofenceEditor`/`MultiAreaEditor`; shared geometry tests. Verify DB migration and device behavior separately. |
| 02 Instant verification | Implemented | SQL 016–017 and 026; mobile submission/reward flow; server owns verification and rewards. SQL tests/live abuse testing were not run. |
| 03 Reports/moderation | Implemented | SQL 018, 028–030; mobile report/block flows; admin moderation actions. Confirm exact privacy behavior against all RLS policies. |
| 04 Analytics | SDK/event wrapper present | `apps/mobile/lib/analytics.ts`; dashboards, keys and live event delivery remain operational tasks. |
| 05 Community quests/drops | Implemented locally | SQL 034–035; mobile suggestion and weekly-drop surfaces; admin queue. Push delivery remains undeployed per docs; chains are explicitly deferred. |
| 06 Growth | Partial | Starter quest exists (037). Sunday recap, XP events, offline queue and duo/referral loop remain. |
| 07 Merchant redemption | Implemented locally | SQL 036, public merchant redemption route/actions, sponsor reporting. Live migration/counter flow is not established by local tests. |

Cutouts plan: code for foundation, core loop, social/status, share/onboarding/icon surfaces and
admin restyle exists; migrations 032–033 and content assets/device/accessibility verification
must be tracked independently. Founder-owned real place photos, cutouts and commissioned
art remain content dependencies, not code deliverables.

## Migration and deployment truth

The checkout contains `002`–`038` plus `20260619010246_initial_schema.sql`; it does not
contain a `001_initial_schema.sql`. Migration presence is not proof of application. The
runbook and ledger claim a hosted history through 038 plus the timestamped initial schema as
of Nov 10; this audit did not connect to Supabase. Edge Function source presence is not proof
of deployment, and no push webhook, cron execution, live merchant redemption, or device
submission was verified.

## Recommended next steps

1. Resolve SEC-01 with a minimal forward-only SQL change and a safe own-token settings path; ensure the global profiles read policy no longer exposes push tokens. Add focused coverage if current conventions can exercise it and document rollout.
2. Fix DB-01 in the migration/bootstrap instructions without rewriting already-applied migration history. Verify the supported clean-install path with local Supabase if available.
3. Reconcile the stale README/ROADMAP/spec-index status tables and the 038 SQL comment against the latest evidence, clearly labelling repository claims versus independently verified deployment facts.
4. Implement the Spec 06 Sunday recap as the next product slice: specify current vs previous week, use `America/Vancouver` Monday boundaries, obtain historical rank and XP for that selected interval, use only the signed-in player's own proof photo, and share only after an explicit action.
5. Then return to weekly push draining/deployment readiness and remaining Spec 06 slices. Keep chains deferred pending the product gate in Spec 05.

The documentation follow-up updated the status files listed above. See
[CLAUDE-NEXT-IMPLEMENTATION-PROMPT.md](CLAUDE-NEXT-IMPLEMENTATION-PROMPT.md) for the prompt
that produced the follow-up below. The "Evidence and impact" column above is the original
finding; the "State" column is current.

## Follow-up implementation (Nov 11, 2026, later session)

Status words used here: **in checkout** (files exist), **locally tested** (Node tests and
`tsc` only), **applied remotely**, **deployed**, **device verified**. Only the first two are
true for anything in this section. No hosted service was read or changed.

### SEC-01: profile push token

Tracing every profile read and write found one thing beyond the original finding: the
`profiles` SELECT policy names no role, so it covers `anon` too. The token was readable with
the anon key alone, without signing in.

| Piece | State |
|---|---|
| `039_profile_push_token_privacy.sql`: table SELECT revoked from client roles, every column except `push_token` granted back, `own_push_enabled()` for Settings | In checkout. Not applied remotely. SQL never executed. |
| Mobile: `PROFILE_COLUMNS` replaces three `select('*')` on profiles; Settings uses the RPC; `push_token` removed from the readable profile type | In checkout. `tsc` clean. |
| Server readers (`send-social-push`, `send-push-outbox`, `enqueue_weekly_drop`, admin actions) | Unchanged. They use the service role or run as definer, which keep table SELECT. |
| Own-token register and clear (`lib/notifications.ts`) | Unchanged. The UPDATE grant on `push_token` is from 029; the row policy limits it to the caller's row. |
| `apps/mobile/__tests__/profilePrivacy.test.js` (8 checks) | Passes. Text checks of the SQL and of client queries only. It cannot prove grants or RLS. |

Rollout order matters. Once 039 is applied, any build that still sends `select=*` on profiles
cannot load its profile. The runbook says there is no TestFlight or store binary yet, so this is
a dev-build cutoff like 038. A build from this checkout also works before 039, except that the
Settings "Quest alerts" switch reads as off until 039 exists (the RPC is missing); turning it on
still registers the token.

Left as is, on purpose: `push_social`, `push_drops` and `feed_public` stay readable on any
profile. They are preferences, not secrets, and `feed_public` is read for other players.

### DB-01: clean-install order

Documented in `supabase/migrations/README.md`. Not executed: no Supabase CLI or `psql` on the
machine and Docker was not running.

### PROD-01: Sunday recap (Spec 06 §2)

| Piece | State |
|---|---|
| `040_week_recap.sql`: `own_week_recap(date)` | In checkout. Not applied remotely. SQL never executed. |
| `app/recap.tsx`, `components/RecapShareCard.tsx`, `hooks/useWeekRecap.ts`, `lib/recapWeek.js`, entry row on Rankings | In checkout. `tsc` clean. Never run on a device or simulator. |
| `apps/mobile/__tests__/recap.test.js` (24 cases) | Passes. Week selection including both 2025 DST weekends, payload selection, empty and no-photo states, share result handling. |
| Sunday reminder push | Not built. Tracked with OPS-01. |

Period policy: Sunday shows the current week (in progress); Monday to Saturday shows the week
that ended the previous Sunday night. Details and data limits are in Spec 06 §2.

### Checks run after the follow-up

| Command | Result |
|---|---|
| `npm test --workspace @quest/geofence` | Pass: 50 geofence assertions, redemption tests |
| `npm test --workspace mobile` | Pass: 159 logic assertions, 9 quest-window, 24 recap, 8 profile-privacy |
| `cd apps/mobile && npx tsc --noEmit` | Pass |
| `cd apps/admin && npx tsc --noEmit` | Pass |

### Still open

- 039 and 040 are not applied. SEC-01 is live on the hosted database until 039 is.
- No SQL in 039 or 040 has been executed anywhere. Syntax and behaviour are unproven.
- The recap has not been seen on a phone: card layout, the iOS `Share.share` file path,
  Android share, screen readers and large text are all unverified.
- The DB-01 procedure is unverified.
- OPS-01 is unchanged.
- The release is not ready while the items above stand.
