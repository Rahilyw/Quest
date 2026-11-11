# Quest! campaign ledger

Durable state for the Nov 2026 audit-and-implementation campaign. One current status per item.
Updated at every phase boundary. Historical notes are labelled as history.

## 1. Baseline (recorded Nov 10, 2026, 15:12 PT)

| Fact | Value |
|---|---|
| Branch | `cursor/cutouts-this-week-quests`, tracking `origin/cursor/cutouts-this-week-quests` |
| HEAD | `6d6c458` feat: implement starter quest feature and update roadmap |
| vs `main` | 13 commits ahead, 0 behind. `main` == `origin/main` at `7f76a69` |
| Dirty tree at start | **Not clean.** Modified: `apps/mobile/app/(auth)/{forgot-password,reset-password,sign-in,sign-up}.tsx`, `apps/mobile/app/(tabs)/feed.tsx`, `apps/mobile/app/(tabs)/leaderboard.tsx`. Untracked: `apps/mobile/components/auth/AuthKit.tsx`, `docs/design/CLAUDE-FABLE-MASTER-ORCHESTRATION-PROMPT.md`. File mtimes advanced between two consecutive `git` calls (15:07 → 15:10), so **another editor is active on this checkout**. These files are excluded from campaign edits; they are preserved, not reviewed as campaign work. |
| Auxiliary worktrees | `.claude/worktrees/redesign-demo` (`claude/redesign-demo`, 28 behind / 0 ahead), `sleepy-fermat-6a44f5` (45 behind / 0 ahead), `whats-next-e00154` (42 behind / 1 ahead: `bac8b0f`, screenshots + small sign-in/feed tweaks). All historical; HEAD is the most advanced source. |
| Agent instructions | No `CLAUDE.md`, `AGENTS.md`, or `CLAUDE.local.md`. `.claude/settings.json` allows planner/coder/tester/reviewer tasks, git, npm test; denies `rm -r*`. `.agents/rules/claude-mem-context.md` is an empty memory stub. `.agents/skills/*` are design-taste skills (not project policy). |

### Orchestration capability (verified)

"Fable" is the coordinator model (Claude Fable 5.1). The installed orchestration mechanism is the
Claude Code **Workflow** tool (ultracode enabled) plus the **Agent** tool. Confirmed controls:
model identifiers `sonnet`, `opus`, `haiku`, `fable`; effort `low`–`max`; `isolation: 'worktree'`;
per-workflow concurrency cap min(16, CPUs−2). There is **no `/fable` command**; none was invented.
Routing used: Sonnet for read-only scouts and builders, Opus for independent review/verification,
Fable for synthesis, security judgments and acceptance.

### Command matrix (read from scripts, then run)

| Check | Command | Baseline result (Nov 10) |
|---|---|---|
| Geofence tests | `node packages/geofence/src/__tests__/geofence.test.js` | 50 passed, 0 failed |
| Redemption tests | `node packages/geofence/src/__tests__/redemption.test.js` | passed |
| Mobile logic tests | `node apps/mobile/__tests__/logic.test.js` | 159 passed, 0 failed |
| Quest window tests | `node apps/mobile/__tests__/questWindow.test.js` | 9 passed |
| Mobile typecheck | `cd apps/mobile && npx tsc --noEmit` | exit 0 |
| Admin typecheck | `cd apps/admin && npx tsc --noEmit` | exit 0 |
| Token lint (informational) | `cd apps/mobile && node scripts/check-tokens.js` | 218 raw tokens in 28 files |
| CI (`.github/workflows/ci.yml`) | geofence tests, logic tests, tsc mobile, tsc admin, `npm audit --omit=dev --audit-level=critical` | runs on push/PR to `main` only. **CI does not run** `redemption.test.js` or `questWindow.test.js`. |

Not run (external/credentialed): EAS builds, `supabase db push`, edge function deploy, Vercel deploy,
any Supabase MCP call (read or write). Remote migration state is **unknown** to this campaign.

## 1b. Resume (Nov 10, 2026, after the credit stop)

| Fact | Value |
|---|---|
| Orchestration | Claude Code Workflow `wf_d4216b6f-7de` died when the Claude credit balance hit zero. Scouts that returned: mobile design/a11y (partial) and SQL 001–017. Spec matrices, design matrices, verifiers and the critic did not return. **This checkout is now Cursor, not Claude Fable.** There is no Fable tool here. Work continues in this session directly. Cursor subagents are not Fable. |
| HEAD now | `18b57e2` feat: enhance quest detail loading state and add skeleton UI. Includes the previously dirty auth screens, AuthKit, feed, leaderboard, and this ledger. |
| Dirty again | Another editor is active. Do not touch `apps/mobile/app/settings.tsx`, `components/Avatar.tsx`, `components/EmptyState.tsx`, `components/ErrorBoundary.tsx`, `components/FollowButton.tsx`, `components/ui/Screen.tsx`. `tsc --noEmit` currently fails only because `EmptyState` no longer accepts `icon` while six callers still pass it. That failure is the in-flight edit, not this campaign. |
| Remote state | Nov 10, 2026: production Quest (`xuviwarpgvxzpouqesrv`) has 002–038 and `20260619010246`. History row `20261109032058` was reverted, then 032 applied under version `032`. Column grants on `completions` confirmed: no table SELECT for anon/authenticated; secret columns are not granted. |

## 2. Conflict register

| Conflict | Evidence | Current resolution |
|---|---|---|
| README/roadmap say 001–030 are the live set and 031 is the next push | `LAUNCH-RUNBOOK.md` Step 0 and the Done-when list, updated Nov 10 after the push | Hosted database has **002–038**. `ROADMAP.md` tables were not rewritten. |
| Specs README still says Phase 2 of Cutouts is next | `docs/specs/README.md` design paragraph vs `docs/design/UI-OVERHAUL-PLAN.md` Nov 9 status | UI-OVERHAUL-PLAN is the later status. Specs README is stale. Not rewritten yet. |
| Roadmap “What’s fully implemented” still says Harbour Electric and 44 geofence tests | `ROADMAP.md` implemented tables vs `lib/theme.ts` and a 50-test geofence run on Nov 10 | Code and the Nov 9 audit section are ahead of the older tables. Not rewritten yet. |
| Streak week was UTC; leaderboard week is Vancouver | `017` lines 46–47 vs `031` leaderboard `America/Vancouver` | **038** moves streak week to Vancouver. One-time streak discontinuity for rows already labelled with a UTC week. |
| `settings.tsx` “Weekly digest” writes both AsyncStorage and `push_drops` | `apps/mobile/app/settings.tsx` (in-flight, not edited here) | The database flag is what `enqueue_weekly_drop` reads. AsyncStorage can disagree until the in-flight edit settles. |

## 3. Phase plan and state

| Phase | Scope | State | Notes |
|---|---|---|---|
| Audit | Repo-wide read-only audit | in progress | Two slices returned. P0/P1 claims from SQL part A were re-checked by hand against 026–037. Remaining slices were not rerun. |
| 0 | Baseline, security and launch truth | in progress | `038` is applied on production. Column grants confirmed Nov 10. Other Phase 0 items remain (F-004, F-005). |
| 1 | Spec and documentation reconciliation | in progress | Runbook step 0, migration README, and the specs README design paragraph are updated. `ROADMAP.md` “fully implemented” tables are still stale. |
| 2 | Cutouts design completion and accessibility | queued | In-flight editor owns EmptyState, settings, Avatar, ErrorBoundary, FollowButton. |
| 3 | Spec 06 §2 Sunday recap | queued | Not started. Needs its own week query, not the live `leaderboard` view. |
| 4 | Spec 06 §3 XP economy events | queued | |
| 5 | Spec 06 §5 offline submission queue | queued | |
| 6 | Spec 06 §1 duo quests | queued | |
| 7 | Spec 05 chains | queued | Stay deferred. Catalog is the seed (~25 quests), under the ~35 note. Owner has not overridden that. |
| 8 | Spec 05/07 hardening | queued | `send-push-outbox` sends at most 100 rows per invoke and does not loop. Local only. |
| 9 | Final report | queued | |

### Phase 0 slice — completion secrets

**Acceptance:** anon and authenticated cannot read `completions.redemption_code`, `lat`, `lng`, or `gps_accuracy`. The signed-in owner can still see their own sponsor code. A client cannot store a redemption code on a non-sponsored completion. Streak week uses America/Vancouver.

**Applied Nov 10, 2026** on production. Read-only check: anon and authenticated have no table-level SELECT on `completions`. Granted columns are `id`, `user_id`, `quest_id`, `photo_url`, `selfie_url`, `completed_at`, `status`, `reviewed_at`, `created_at`, `redeemed_at`, `open_report_count`, `hidden_pending_review`. `redemption_code`, `lat`, `lng`, `gps_accuracy`, and `reviewed_by` are absent. App reads go through `own_completion_reward` / `own_reward_codes`.

**Not verified:** a device submission on a build from this working tree, and merchant redeem after the revoke. Admin reads use the service role, which keeps the columns.

## 4. Findings

| ID | Sev | Status | Evidence | Impact |
|---|---|---|---|---|
| F-001 | P0 | closed on production Nov 10 | `038` revokes table SELECT and grants the non-secret columns. Confirmed against `pg_class` / `pg_attribute` on Quest production. | Sponsor codes and proof coordinates are no longer readable with the anon key. |
| F-002 | P0 | closed by 026/029 | `026` revokes profile UPDATE and grants named columns. `protect_profile_insert` zeroes XP. `029` re-grants the list plus `push_social`. `034` adds `push_drops` only. | Client XP/level writes do not survive once 026 is applied. The SQL-A scout’s P0 was the pre-026 state. |
| F-003 | P1 | closed by 026 | `026` `normalize_completion_on_insert` sets `NEW.completed_at := now()` before the rate-limit counts. | Backdated `completed_at` does not bypass the cap once 026 is applied. |
| F-004 | P1 | open, blocked by in-flight file | `profiles` SELECT policy is `using (true)` (`20260619010246_initial_schema.sql` line 16). `push_token` has no column revoke. | Any client can read every player’s Expo push token. Fix needs `settings.tsx`, which another editor has open. |
| F-005 | P2 | open | Fresh filename order applies `002` before `20260619010246_initial_schema.sql`. README says both “filename order” and “`--include-all`”. | A brand-new database fails at migration 002. Do not rename the initial file: hosted history uses that version name. |
| F-006 | P2 | fixed in 038, applied | `038` streak week uses `America/Vancouver`. Existing `last_completion_week` UTC labels can still reset a streak once. | Sunday evening Pacific now matches the leaderboard week. |
| F-007 | P2 | open | `send-push-outbox/index.ts` limits 100 rows and tells the caller to invoke again. The webhook does not. | A Monday drop to more than 100 opted-in players would leave the rest unsent. Function is not deployed. |
| F-008 | P3 | open | `node scripts/check-tokens.js` on Nov 10: 218 raw tokens in 28 files. | Token debt. Do not mass-rewrite files the other editor has open. |
| F-009 | P2 | open, doc | `ROADMAP.md` “fully implemented” and `docs/specs/README.md` still describe Harbour Electric and an earlier Cutouts phase. | Operators can follow the wrong status. Phase 1. |

## 5. Unresolved questions for the owner

1. Chains stay deferred. Say so if that should change.
2. Update any phone used for testing to a build from this working tree. Older builds fail quest submission now that `038` is live.
3. Deploy `send-push-outbox` and `send-social-push` before those pushes can reach a phone. The database rows exist; the functions are still not deployed.

## 6. Next concrete action

Phase 1: correct the stale “current status” paragraphs in `docs/specs/README.md` and the older tables in `ROADMAP.md`, without rewriting product intent. Leave the in-flight mobile files alone. F-004 (push token column) waits until `settings.tsx` is free. Sunday recap stays queued. Production migrations through 038 are applied; do not push them again.
