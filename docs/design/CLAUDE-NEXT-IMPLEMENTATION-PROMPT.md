# Claude handoff: close the audit blockers, then build Sunday recap

Copy the prompt below into Claude Code from the Quest repository root. The companion audit is
[CODEBASE-AUDIT-2026-11-11.md](CODEBASE-AUDIT-2026-11-11.md). Recheck its claims against the
active checkout before acting.

---

## Prompt

You are continuing work in the Quest! monorepo. First re-establish the current checkout and
verify the documentation reconciliation recorded in
`docs/design/CODEBASE-AUDIT-2026-11-11.md`. Resolve its remaining high-priority security and
migration-bootstrap findings, then implement the next product slice, the Spec 06 §2 Sunday
recap share card. Work in small, reviewable commits or coherent change sets. Do not deploy or
mutate hosted services.

### 1. Establish current truth

- From the repository root, inspect `git status --short --branch`, recent commits, tracked
  worktrees, package scripts, CI and all applicable `AGENTS.md`, `CLAUDE.md`, `.claude/` and
  `.cursor/` instructions. Preserve user changes; never reset, clean, overwrite, switch
  branches or rewrite migration history as a shortcut.
- Read the audit, `PRODUCT.md`, `ROADMAP.md`, `docs/specs/README.md`, Specs 04–07,
  `docs/design/BRAND.md`, `docs/design/UI-OVERHAUL-PLAN.md`, `LAUNCH-RUNBOOK.md`,
  `supabase/migrations/README.md` and relevant package docs. Inspect actual source and recent
  changes before accepting any status statement.
- Treat migration files, runbook notes and dashboard/function source as separate from facts
  about hosted migration application, function deployment, webhook setup, device behavior or
  live merchant redemption. Do not access or change production or external accounts.

### 2. Fix SEC-01: profile push-token exposure

The initial schema allows all authenticated users to SELECT every profile. Later migrations
restrict profile UPDATE columns but do not hide `push_token`. Since the app has the anon key,
this lets any signed-in client read every user's Expo push token.

- Trace every profile SELECT/UPDATE in mobile, admin, SQL triggers/functions and both Edge
  Functions. Preserve public profile fields and existing own-profile settings behavior.
- Design a forward-only migration that removes the token from broad client SELECT while
  keeping the server-side service role and push delivery working. Account for PostgreSQL
  privilege semantics: a column-level revoke cannot cancel an existing table-level SELECT
  grant. If replacing the table grant with explicit columns, reconcile all current client
  projections, row policies, generated Supabase types and future-column behavior. Prefer a
  narrowly scoped authenticated own-token-presence function/view only if Settings truly needs
  that value; do not return another user's token through it.
- Keep the player's ability to register/clear their own token according to existing UX, but
  ensure arbitrary user ids cannot be updated. Do not send tokens to analytics or logs.
- Add focused verification using the project's existing conventions. State clearly if the
  available test environment cannot validate SQL grants/RLS.

### 3. Fix DB-01 and status drift

- The migration folder has `002`–`038` plus `20260619010246_initial_schema.sql`; there is no
  `001_initial_schema.sql`. A clean lexical order attempts 002 before the initial schema.
  Document and, if practical, verify a reproducible clean-install ordering that preserves
  already-recorded hosted versions. Do not rename or reorder applied migration files and do
  not run `db push` against a hosted project.
- Verify migration 038's comment and migration index agree. Do not claim remote application
  unless independently verified in this session through an authorized read-only source; the
  runbook currently reports 002–038 and the timestamped initial schema applied Nov 10, 2026.
- Verify the Nov 11 reconciliation in README, ROADMAP, ARCHITECTURE, PRODUCT, specs index,
  migration notes and runbook. Fix only material remaining drift and label old planning
  snapshots historical. Cutouts remains the approved design system; real photos/cutouts and
  commissioned art remain owner content dependencies. Chains remain deferred pending the Spec
  05 product gate.

### 4. Implement the Sunday recap (Spec 06 §2)

Read the full spec and inspect existing Rankings, leaderboard queries, completion/profile
hooks, `ShareCompletionCard`, `ShareStoryModal`, `react-native-view-shot`, `expo-sharing`,
analytics, private selfie signing and migration/RLS rules before designing the feature.

- Add a recap screen reachable from Rankings throughout the week. Choose and document a
  consistent period policy (current week or most recently completed week), including Monday
  behavior. Bound every selected week to Monday 00:00 through the following Monday 00:00 in
  `America/Vancouver`, including DST transitions.
- The recap's rank and XP must be computed for the selected week. Do not reuse the current
  leaderboard view for a previous week. If historical rank cannot be computed from existing
  data, explain the data limitation and add the smallest safe forward-only schema/query change
  needed. Do not use another player's information or content.
- Show the player's weekly rank, weekly XP, streak and best proof photo from that interval.
  Use only the signed-in player's own place-proof image. Never put a selfie, precise location,
  another user's post, or private analytics data in the share artifact.
- Create a Cutouts share image on-device using existing share/capture patterns. Sharing must
  happen only after the user taps an explicit share action. Reuse the existing per-completion
  share flow without replacing it or changing its behavior.
- Track only `share_completed { surface: 'recap' }` through the analytics wrapper. Do not
  include image data, usernames, or location in events.
- Handle loading, errors/retry, an empty week, no usable proof photo, cancelled sharing and
  capture failures without data loss or false success copy. Follow the approved paper/ink,
  Figtree and category-color design, accessible contrast/targets, text scaling, reduced motion
  and existing navigation patterns.
- Do not add Sunday reminder push delivery in this slice. Current docs say the weekly outbox
  function is not deployed and the sender handles at most 100 recipients per invocation.
  Track that as a separate operational/hardening task, not a successful notification feature.

### 5. Acceptance and reporting

- Update tests for selected-week boundaries (including DST), XP/rank data selection, empty
  states and share result handling where testable with existing project conventions. Do not
  add a new test framework.
- Run existing relevant checks after reading scripts: geofence and redemption tests, mobile
  tests, mobile/admin TypeScript checks, and any checks for changed logic. Report exact
  commands and results. Do not run EAS production builds, hosted migrations, Vercel deploys,
  Edge Function deploys or account operations.
- Update the audit findings, Spec 06, specs index, ROADMAP and design status as needed. Keep
  statuses distinct: implemented in checkout, locally tested, migration present, migration
  applied remotely, function/webhook deployed, and device/live verified.
- Finish with changed files, behavior, checks, unresolved findings, and exact owner/deployment
  tasks. Do not call the overall release ready while SEC-01, migration bootstrap uncertainty,
  or unverified hosted dependencies remain unresolved.

Start with a concise baseline and an implementation plan, then execute. Do not stop after
planning or merely rewrite the docs; deliver the security fix and recap slice unless a real
environmental blocker prevents it.

---

## Reference documents

- [Audit snapshot](CODEBASE-AUDIT-2026-11-11.md)
- [Spec 06 — Growth & Engagement](../specs/06-growth-engagement.md)
- [Cutouts brand system](BRAND.md)
- [Cutouts implementation status](UI-OVERHAUL-PLAN.md)
- [Roadmap](../../ROADMAP.md)
- [Launch runbook](../../LAUNCH-RUNBOOK.md)
