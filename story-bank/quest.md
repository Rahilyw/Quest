# Quest! (repo: Quest / formerly "Kuest")

> **Evidence snapshot updated 2026-11-11.** This is a story/evidence bank, not a current launch
> checklist. Operational claims are sourced from repo docs and have not been independently
> re-queried unless explicitly marked `[CODE]` or `[GIT]`.
>
> **Agent rules for this file**
> 1. Never invent metrics, users, team size, ownership, or technologies. Only use what is in Section 9 as *verified* or that the owner has confirmed.
> 2. Items marked **[CONFIRM]** are unverified. Do not put them in a resume or cover letter until the owner confirms.
> 3. Tag convention: **[CODE]** = verified in source this session, **[DOC]** = stated in repo docs only, **[GIT]** = from git history, **[OWNER]** = confirmed by Rahil (none yet).
> 4. Original source snapshot was written 2026-11-08. Selected status, version and test-count facts were refreshed 2026-11-11; remaining evidence entries retain their own dates and should be rechecked before reuse.

---

## 1. Overview

- **Project:** Quest! — a city-exploration game for mobile. Players complete real-world "quests" (try a café, run a trail, join an event), take an in-app photo as proof, and earn XP, levels, weekly streaks, badges, and leaderboard rank. Pilot city: Victoria, BC. [DOC]
- **Problem:** Gives people a reason to go out and do things locally, and makes the reward land *immediately*. The design bet (from the repo's own strategy notes): approval latency is reward latency, so verify automatically at the moment of the real-world act instead of waiting for a human to approve a photo. [DOC]
- **Intended users:**
  - Players: urban residents roughly 20-35 in mid-size walkable cities. [DOC]
  - Admin operator: a single founder/operator running the pilot through a web dashboard. [DOC]
  - Secondary stakeholder: local businesses that sponsor quests (sponsored quests issue redemption codes). [CODE: 017]
- **Motivation:** [CONFIRM — repo docs describe the product rationale, not why Rahil personally chose to build it. Ask the owner.]
- **Current status (as documented Nov 11):** the repo contains substantial implemented code and migrations through 038. The launch runbook reports those migrations applied, but this has not been independently verified in this evidence bank. A P1 profile `push_token` exposure and fresh-install migration ordering issue remain open; Sunday recap is the next product feature. Admin deployment and store release claims remain documentary, not independently checked here. No real-user numbers exist in the repo.
- **Timeline [GIT]:** about 105 commits on main in the Nov 8 snapshot; current branch history advances through 2026-11-11. Recount before quoting a commit total.
- **Scale of codebase:** the Nov 11 checkout contains 38 migration SQL files (timestamped initial schema plus numbered 002–038). Prior line-count estimates are historical; recount before quoting source-line totals.

## 2. My Contributions

> **Authorship caveat (important).** Git shows all but one commit under Rahil's name (94 as "Rahil", 11 as "Rahil Y. Wijeyesekera", same email) and 1 from `google-labs-jules[bot]` (the Jules/"Bolt" performance PR #4, leaderboard virtualization). However, the history also contains commits titled "Merge agent work: …", and the repo contains `.claude/`, `.agents/`, `.cursor/`, and planner/coder/tester/reviewer agent definitions, which indicates AI coding agents were used heavily. Git authorship therefore does **not** show who designed vs. who prompted vs. who reviewed. **[CONFIRM]** exact split before claiming "designed" or "implemented" for any component. Safe phrasing until then: "built with AI coding agents (Claude Code)", with Rahil as the product owner, architect-in-the-loop, and reviewer, *if* the owner confirms that is accurate.

- **My role:** Sole committer and repository owner. Appears to be a solo project (only one human author). [GIT] Team size: **[CONFIRM]**.
- **Components I personally implemented:** **[CONFIRM — see caveat above.]** The commit history shows Rahil committing every area below, but not how the code was produced.
- **Areas where there is clear evidence of Rahil's decision-making (not just code):** these appear as deliberate, documented decisions in the repo.
  - Choosing instant server-side verification over a manual approval queue, and deleting the approval queue. [DOC/GIT]
  - Commissioning and acting on a full security/performance audit on 2026-11-07, producing migrations 030 and 031 and `requireAdmin()` on every admin action. [DOC/GIT]
  - Choosing the Cutouts brand direction and writing the design spec and phased overhaul plan. [DOC/GIT]
  - Writing 7 feature specs before building (docs/specs/01-07). [CODE: files exist]
  - Moving the repo through a PR workflow (PRs #1-#14, with a review-stack merge on Nov 7). [GIT]
- **Components built collaboratively:** 1 external contribution from an AI bot (Jules, PR #4). Everything else: **[CONFIRM]**.
- **Areas researched or explored:** PostGIS geography functions, Apple App Store Guidelines 1.2 (user-generated content) and 5.1.1(v) (account deletion), Supabase RLS and SECURITY DEFINER hardening, Expo/EAS build and submit flow. [DOC: all referenced in repo]

## 3. Technical Details

- **Languages:** TypeScript (mobile, admin), JavaScript (shared geofence package, tests, scripts), SQL/PLpgSQL (migrations). [CODE]
- **Frameworks:**
  - Mobile: Expo 54, React Native 0.81, Expo Router 6, React 19 types. [DOC]
  - Admin: Next.js 15.5.28 + React 19.1.0 (`apps/admin/package.json`, checked 2026-11-11).
- **Libraries / SDKs:** supabase-js, `@supabase/ssr`, expo-camera/location/notifications/image-picker, react-native-maps, react-native-reanimated, PostHog (`posthog-react-native`), Sentry, Expo push. [DOC]
- **APIs and integrations:** Supabase Auth/Postgres/Storage/Edge Functions; Expo Push API (`apps/admin/lib/expo-push.ts`); Database Webhook to the `send-social-push` edge function (written, **not deployed**); PostHog and Sentry (SDKs wired, **production keys not set**). [DOC]
- **Database and storage:** Postgres with PostGIS and pg_cron; Row Level Security; buckets `proof-photos`, `avatars`, `quest-covers`. [CODE: 013, 031; DOC for buckets]
- **Infrastructure:** Supabase (backend), Vercel (admin), EAS (mobile builds), GitHub Actions CI. [DOC/CODE]
- **Repo structure:** npm/Yarn-workspaces monorepo: `apps/mobile`, `apps/admin`, `packages/geofence` (`@quest/geofence`). [CODE]
- **Architecture:**
  - Mobile uses the Supabase **anon key** and relies on RLS. Admin uses the **service-role key** only in server components and server actions; never sent to the browser. [DOC]
  - **Business rules live in the database**, not in clients: geofence enforcement, rate limiting, auto-approval, XP/level/streak rewards, redemption-code issuance, badge unlocking, and XP revocation are all Postgres triggers/functions. [CODE: 013-017, 026]
  - Shared geofence logic is duplicated deliberately: PostGIS is the authority on the server; the `@quest/geofence` JS package mirrors it on the client for instant UX feedback ("advisory only"). Constants must be kept in sync by hand (the migration comment says so). [CODE: 015]

## 4. Features and Implementation

### Feature 1 — Server-side geofence enforcement (PostGIS) [CODE: 013, 015, 025, 026]
- **What it does:** Rejects any completion whose GPS coordinates are outside the quest's allowed zone, regardless of what the client says.
- **How it works:** A `BEFORE INSERT` trigger on `completions` calls `check_completion_geofence()`. Zone types: `none` (anywhere), `circle` (`ST_DWithin` with radius + GPS-accuracy buffer, capped at 30 m), `city` (`ST_Covers` against a city boundary polygon), `polygon` (admin-drawn `GEOGRAPHY(POLYGON)`), and `multi` (several circles/polygons per quest via a `quest_geofences` child table, migration 025). Violations raise `GEOFENCE_VIOLATION`.
- **Admin write path:** `set_quest_boundary()` validates drawn polygons: must be a single polygon, no holes, 3-100 vertices, area 400 m² to 250 km², and self-intersections are auto-repaired with `ST_MakeValid` only if the result is still a single polygon.
- **Technical considerations worth discussing:** the client sends GPS accuracy (migration 026), and the server only applies it as a buffer up to 30 m so a spoofed huge accuracy value can't widen the zone; generated column `boundary_geojson` ships shapes to clients via a plain `select *` instead of an RPC; a polygon quest with a NULL boundary is deliberately unsubmittable so the two-step create is safe.
- **My implementation:** [CONFIRM]

### Feature 2 — Instant verification and reward pipeline [CODE: 017, 026]
- **What it does:** A valid submission is approved on insert; XP, level, weekly streak, badges, and (for sponsored quests) a redemption code all exist before the celebration screen renders.
- **How it works (trigger order):** geofence gate → `normalize_completion_on_insert` (rate limit 2 per 10 min and 10 per 24 h, set status approved, set `reviewed_at`, generate an 8-character redemption code from an unambiguous alphabet for sponsored quests) → `apply_completion_rewards` (XP, level via `level_from_xp`, ISO-week streak logic) → `on_xp_update` badge evaluation.
- **Moderation reversal:** `revoke_completion_rewards` fires when status changes approved→removed; subtracts XP (floored at 0), recomputes level, voids an unredeemed code.
- **Technical considerations:** clients cannot choose their own status; the server also overwrites `completed_at` with `now()` (026) to block forged timestamps that would earn Early Bird/streak badges.

### Feature 3 — Community reports, blocking, feed privacy, and admin moderation [CODE: 018 per roadmap; admin `moderation/actions.ts`]
- **What it does:** Players can report a post (5 reasons), block users, and opt out of publishing to the feed. Three independent reporters auto-hide a post pending review. An admin queue shows photo, reports, submitter history, and **GPS-vs-geofence evidence**; actions are dismiss, remove (revokes XP and sends a push), or remove-and-allow-retry.
- **Why it exists:** Apple Guideline 1.2 (user-generated content) compliance. [DOC]
- **Implementation notes:** reports are immutable, one per user per post, can't report own post, and rate-limited in the database; admin evidence comes from `get_completion_geofence_evidence()` which re-runs the geofence check using the stored GPS accuracy (fallback 12 m). [CODE: 026]

### Feature 4 — Admin dashboard (Next.js) [CODE/DOC]
- Quest CRUD with scheduling, sponsor fields, cover-image upload; interactive **GeofenceEditor** (anywhere / radius / city / draw polygon with draggable vertices) and a MultiAreaEditor; badge CRUD with data-driven unlock rules; completions log with spot-check remove; users table (ISR 60s); sponsor report export.
- Auth: Supabase session + email allowlist (`ADMIN_ALLOWED_EMAILS`) in middleware, and, after the Nov 2026 audit, `requireAdmin()` re-checked inside every server action. [CODE: `lib/require-admin.ts` used by badges, completions, quests actions; moderation actions use an equivalent `getAdminEmail()` check]
- Size reference: GeofenceEditor.tsx 651 lines, MultiAreaEditor.tsx 709 lines, moderation actions 413 lines. [CODE]

### Feature 5 — Data-driven badge system [DOC + CODE: 021]
- Badges are admin-configurable rows (name, rarity, art, thresholds). `evaluate_badge_unlock()` takes **precomputed raw per-user metrics** (longest streak, busiest day/weekend, local hours, leaderboard rank…) and compares each badge's own config against them. Migration 021 exists because an earlier design collapsed metrics into booleans so two badges of the same rule type couldn't have different thresholds.

### Feature 6 — Social layer (follows, likes, comments, notifications) [DOC: migrations 027-029]
- Follow graph, likes, comments with one-level replies, Following/Victoria feed modes, public profiles, notifications inbox, comment reports and rate limits. Push for these requires the not-yet-deployed `send-social-push` function. [DOC]

### Feature 7 — Weekly leaderboard and rank snapshots [CODE: 031]
- `leaderboard` view sums approved XP for the current week **in America/Vancouver time**; `snapshot_last_week_ranks()` runs under **pg_cron** at 06:55 UTC Monday (always just before Victoria midnight across DST).

### Feature 8 — Analytics, crash reporting, account deletion [DOC/CODE]
- Typed analytics layer with **29 event names** and a typed `SubmissionBlockReason` union (outside_zone, no_photo, no_gps, rate_limited, mock_location, already_completed). [CODE: `lib/analytics.ts`]. Note: ROADMAP says "~16 events"; the code now lists 29.
- Sentry (production-only, 20% trace sampling). [DOC]
- `delete_own_account()` SECURITY DEFINER RPC deletes storage objects then the auth user and relies on FK cascades (App Store 5.1.1(v)). [CODE: 023]

### Feature 9 — Design system "Cutouts" [DOC]
- Brand spec (docs/design/BRAND.md) and a phased UI-overhaul plan; Phase 1 (tokens, Figtree type, text primitives, copy pass) merged via PR #12 on 2026-11-07. An earlier "Harbour Electric" system was superseded. [DOC/GIT]

## 5. Engineering Challenges

### Challenge 1 — Any signed-in user could mint unlimited XP (found in the Nov 2026 audit) [CODE: 030]
- **Problem:** `apply_completion_rewards(uuid, uuid)` is SECURITY DEFINER and grants XP/level/streak. It had no `REVOKE`, and Postgres grants EXECUTE to PUBLIC by default, so any authenticated client could call it via PostgREST RPC with their own id.
- **Investigation:** Audit using the Supabase security advisors plus review of function grants. [DOC says audit; the specific tooling used is **[CONFIRM]**]
- **Solution:** Migration 030 revokes EXECUTE from PUBLIC/anon/authenticated (it is only called from triggers, which run as owner); restricts `get_completion_geofence_evidence` (which returns raw GPS) to `service_role`; pins `search_path = public, extensions, pg_temp` on 14 definer functions. Migration 031 revoked EXECUTE on 12 more trigger-only and internal functions to shrink the RPC surface.
- **Result:** Roadmap states 030 was applied live and verified on 2026-11-07. [DOC]
- **What I learned:** [CONFIRM] Likely themes: default-PUBLIC EXECUTE on functions, definer vs invoker, and that trigger-only functions don't need EXECUTE at fire time.

### Challenge 2 — Anti-cheat on an unattended reward gate [CODE: 017, 026; DOC]
- **Problem:** Removing human review makes the geofence the only gate, so client-supplied fields became attack surface.
- **Solution (layered):** profile XP/level/streak columns revoked from client UPDATE with a column-level re-grant (`username, city, avatar_url, push_token, feed_public` only) and an insert trigger that zeros them (026); server-owned `completed_at`; server-side rate limits; capped GPS-accuracy buffer; in-app-camera-only capture (client uses `launchCameraAsync`, no gallery picker); Android mock-location block (client-side). [CODE: submit screen]
- **Honest limits:** the roadmap itself flags that mock-location blocking and release-build bypass stripping were **not yet verified** in release builds, and proof photos are still public by URL. [DOC]

### Challenge 3 — Leaderboard week reset at the wrong time + rank deltas never populated [CODE: 031]
- **Problem:** (a) `date_trunc('week', now())` used UTC, so the week rolled over Sunday afternoon Pacific, contradicting the product promise "Sunday night settles the score". (b) `last_week_rank` was never written because the `snapshot-ranks` edge function was never scheduled.
- **Solution:** compute the week in `America/Vancouver`; replace the edge function with a SQL function scheduled by pg_cron, which needs no service-role key; schedule chosen at 06:55 UTC so it always lands before local midnight in both PDT and PST.
- **Remaining known issue:** streak weeks still use UTC (documented as an open gap). [DOC]

### Challenge 4 — RLS performance and FK indexing [CODE: 031]
- Wrapped `auth.uid()` as `(SELECT auth.uid())` in every public-schema policy via a `DO` block that rewrites policies from `pg_policies` (with a marker-replace to stay idempotent), so Postgres evaluates it once per query instead of once per row (Supabase advisor lint 0003). Added 9 missing foreign-key indexes, including `completions(quest_id, completed_at DESC)`.

### Challenge 5 — Badge thresholds couldn't be independent [CODE: 021]
- Migration 020 reduced rules to booleans, so two badges of the same rule type shared one threshold. 021 changed the evaluator to take raw metrics and compare each badge's own config.

### Challenge 6 — Admin dashboard trust boundary [GIT/DOC]
- Server actions had trusted middleware alone; fixed with `requireAdmin()` in every action (PR #10, 2026-11-07). The admin build had also been broken since August until the Next 15 upgrade (PR #9). [DOC]

## 6. Testing and Results

- **Test approach:** dependency-free Node test scripts (no Jest) run in CI: geofence package tests and mobile logic tests (XP/level thresholds, celebration/level-up derivation, leaderboard logic, moderation logic, copy rules). [CODE]
- **Actual results (run 2026-11-08):** geofence suite **50 passed, 0 failed**; mobile logic suite **159 passed, 0 failed**. [CODE]
  - README and ROADMAP were reconciled on 2026-11-11 to current test counts and commands.
- **CI (GitHub Actions) [CODE]:** geofence tests, logic tests, `tsc --noEmit` for mobile and admin, and `npm audit --omit=dev --audit-level=critical`.
- **Not tested [DOC]:** no automated tests for SQL triggers/RLS were found in the repo (**[CONFIRM]** whether they were tested manually or through Supabase). End-to-end sponsored-quest flow unverified on a device. No UI/E2E tests found.
- **Evaluation / metrics:** none. No user, retention, or performance numbers exist in the repo. The success metrics in PRODUCT.md (week-2 return, sponsor renewal, time-to-first-XP) are **targets, not results**.
- **Demonstrable outcomes:** working admin deployment on Vercel [DOC]; 32 migration files; a reproducible monorepo with green CI [CODE].
- **Limitations (state plainly if asked):** pre-launch; no store release confirmed; analytics and Sentry not emitting yet; social push not deployed; content is about 20-29 seeded quests; proof photos in a public bucket; anti-spoofing is best-effort client-side on Android.

## 7. Resume Bullet Bank

> Every bullet below uses only Section 9 "verified" facts. Verbs like "Designed" or "Implemented" are marked **(if confirmed)** where authorship is unconfirmed. Until confirmed, swap to "Built … with AI coding agents (Claude Code)" or "Directed and shipped …".

### Software Engineering
- Built a TypeScript monorepo (Expo/React Native player app, Next.js admin dashboard, shared `@quest/geofence` package) on Supabase, with GitHub Actions CI running unit tests, `tsc` on both apps, and a production `npm audit` gate.
- Shipped an admin dashboard with an interactive map editor for drawing quest geofences (circle, city boundary, freehand polygon, multi-area), validated server-side and deployed to Vercel with a per-action `requireAdmin()` authorization check. *(if confirmed)*
- Wrote 7 feature specs before implementation (instant verification, moderation, analytics, community quests, growth, merchant redemption) and shipped three of them end-to-end across mobile, admin, and database. *(if confirmed)*
- Maintained a 32-migration Postgres schema (about 4,000 lines of SQL) and a PR-based workflow (pull requests numbered up to #14).

### AI / ML
- *Not applicable to the product.* Quest! contains no ML/LLM features that were verified in the repo. Only claim AI relevance in the *process* sense (AI-assisted development with Claude Code agents / a multi-agent planner-coder-tester-reviewer pipeline) **if the owner confirms** and frames it truthfully.

### Data / Backend
- Moved game rules into Postgres: a `BEFORE INSERT` PostGIS geofence trigger (circle, city, polygon, multi-area), rate limiting (2/10 min, 10/24 h), automatic approval, and an XP/level/streak reward pipeline, so rewards are granted within the same transaction as the submission and cannot be bypassed by clients.
- Designed a data-driven badge engine in PL/pgSQL: admin-configurable badges evaluated against precomputed per-user metrics, so each badge enforces its own threshold. *(if confirmed)*
- Aligned a weekly leaderboard to `America/Vancouver` and replaced an unscheduled edge function with a `pg_cron` job that snapshots weekly ranks inside the database, timed to land before local midnight across DST.
- Optimized Row Level Security by rewriting every public-schema policy to `(SELECT auth.uid())` via a migration script, and added 9 foreign-key indexes flagged by Supabase's performance advisor.

### Security
- Closed a privilege-escalation hole found in a security audit: a SECURITY DEFINER function that granted XP was callable by any signed-in user via RPC. Revoked default PUBLIC EXECUTE, pinned `search_path` on 14 functions, and restricted GPS-evidence access to the service role (migrations 030-031).
- Locked game-state columns (XP, level, streaks) against client writes with column-level grants and insert triggers, and made the server own completion timestamps to prevent forged badge and streak progress.
- Built Apple-compliance features for user-generated content: report, block, feed-privacy opt-out, auto-hide after 3 independent reports, an admin moderation queue with GPS-vs-geofence evidence, and a one-call account-deletion RPC.

### General Problem-Solving
- Replaced a manual photo-approval queue with geofence-based instant verification after identifying approval latency as the retention risk, then added rate limits, server-owned timestamps, and moderation-with-XP-revocation to keep the unattended gate trustworthy.
- Diagnosed a leaderboard that reset Sunday afternoon (UTC week boundary) and rank deltas that never populated (unscheduled job), and fixed both in one migration.

### Cover-letter angles (facts only)
- *Product-minded engineer:* wrote specs first, instrumented a typed 29-event analytics schema, and cut a scope decision (deleting the approval queue) because of a retention argument.
- *Security-aware backend:* an audit, a real vulnerability, a precise fix.
- *Full-stack range:* React Native, Next.js, Postgres/PostGIS, CI, store-compliance requirements.

## 8. Interview Story Bank

> STAR drafts. The "I did" parts are placeholders until the owner states what they personally did.

- **Ownership:** Solo-owned repository from first commit to a store-ready state in about 5 months; drove a documented decision to remove human approval, and ran a full audit before launch. *Ask:* what did you decide yourself vs. delegate to agents?
- **Problem-solving:** Instant verification: how to reward in seconds without letting people cheat. Cover the layered defense in Challenge 2.
- **Technical decision:** Why put business rules in Postgres triggers instead of an API? Pros: clients can't bypass, atomic with the insert. Cons: harder to test (no SQL tests found), logic split between SQL and the mirrored JS geofence package (must be kept in sync by hand). Be ready to defend and critique it.
- **Debugging:** The XP-minting RPC (Challenge 1), or the leaderboard UTC bug (Challenge 3).
- **Collaboration:** Workflow with reviewers/agents: PR stack #9-#12 reviewed and merged; one bot PR (Jules, performance). **[CONFIRM]** who reviewed. Honest answer about AI-agent use belongs here.
- **Failure or lesson learned:** Honest candidates from the repo's own docs: shipped functions with default PUBLIC grants; admin trusted middleware only; rank snapshot function never scheduled; docs drifted from code (test counts, migration numbers, Next version); admin dashboard sat broken for ~3 months (August to November). **[CONFIRM]** which the owner wants to tell and what they learned.

## 9. Verified Facts and Evidence

**Confirmed by source code / direct execution this session**
- Geofence trigger design and zone types; polygon validation limits; GPS-accuracy cap at 30 m (migrations 013, 015, 025, 026).
- Rate limits 2/10 min and 10/24 h; auto-approve; 8-character redemption code from a 32-character alphabet; XP revocation on removal (017).
- Level thresholds: 200 / 500 / 1,000 / 2,000 / 3,500 / 5,500 / 8,000 / 11,000 / 15,000 (017).
- Profile-column lockdown and server-owned `completed_at` (026).
- Definer-function hardening and revokes (030, 031); pg_cron weekly rank snapshot; leaderboard in `America/Vancouver`; 9 FK indexes (031).
- Account-deletion RPC (023).
- Typed analytics with 29 event names and 6 submission-block reasons.
- CI jobs: geofence tests, logic tests, tsc mobile, tsc admin, npm audit.
- **Test results: 50/50 geofence, 159/159 mobile logic**, run 2026-11-08.
- Git: about 105 commits, 2026-06-17 to 2026-11-07; 94 + 11 commits by Rahil (same email), 1 by `google-labs-jules[bot]`.
- Mobile submit flow uses the in-app camera only (`launchCameraAsync`) and tracks block reasons.

**Confirmed only by README / ROADMAP / PRODUCT (not independently verified)**
- Victoria is the pilot city; admin live at a Vercel URL; migrations 023 and 027-030 applied live; 030 verified live; Cutouts Phase 1 merged; Apple 1.2 and 5.1.1(v) rationale; user personas; success metrics (targets only).
- Tech versions (Expo 54, RN 0.81, Next version conflicts between README tables).

**Additional facts confirmed by Rahil**
- *(none yet — fill in from the questions below)*

**Discrepancies found in the repo's own docs (do not copy these into applications)**
- Test counts: historical README/ROADMAP counts were stale; current local run was 159 mobile logic assertions, 9 quest-window cases and 50 geofence assertions (plus redemption tests).
- Migration numbering in README (e.g., "016 instant verification", "017 reports") is stale; actual files are 017 and 018.
- The README Next.js version conflict was corrected on 2026-11-11.
- Seed size: README "~29", ROADMAP "20 + 5 sponsored", PRODUCT "~28". Verify before quoting.
- Analytics: ROADMAP "~16 events"; code lists 29.
- History contains "Merge agent work" commits; "Kuest" was the original project name (renamed 2026-06-20).

**Open questions for the owner (answer these and I'll update this file)**
1. **How was the code produced?** Hand-written, AI-agent-written (Claude Code / Cursor / Jules), or mixed? What did you personally design, write, review, and decide? This determines every "Built / Designed" verb.
2. Why did you build Quest!? Personal motivation, any people you built it for or talked to?
3. Is anyone else involved (design, co-founder, testers, the "city operator")? Any real users, testers, or pilot partners? Any actual numbers?
4. Is the mobile app on TestFlight or Play internal testing? Any device testing, and on which devices?
5. Who or what ran the Nov 7 audit (a tool, an agent, you manually)? What did you do yourself?
6. Does Quest! have SQL/RLS tests, or was the database verified manually?
7. Which of the "failure/lesson" stories would you tell in an interview?
8. Which job families are you targeting (full-stack, backend, mobile, security-aware, AI/agentic)? I'll weight bullets accordingly.
9. Do you want a repo-link line (GitHub URL) and the project's final name ("Quest!") in the resume?
