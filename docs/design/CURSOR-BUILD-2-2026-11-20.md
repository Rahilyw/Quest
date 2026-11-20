# Cursor build 2: prove the backend (Nov 20, 2026)

Build 1 ([big build](CURSOR-BIG-BUILD-2026-11-20.md)) finished the pilot's app code. Its weak point
is the database:

- Migrations **041, 042, 043 and 044** were written but have **never been executed** anywhere.
- 045 (duo quests) is next.
- Every "locally tested" claim about them comes from SQL text guards, not from a running
  Postgres. Nothing on the [owner run sheet](OWNER-RUNSHEET.md) is ticked.
- The clean-install procedure (DB-01) has never been run either.

Build 2 closes that gap without touching production. GitHub Actions runners have Docker, so CI
can start a throwaway local Supabase stack and apply every migration in order. It then runs
behaviour tests against it and generates the database types from it. The owner then applies
041–044 to production knowing they ran cleanly, instead of hoping.

The run model is the same as build 1:

- one integration branch, `cursor/build-2`;
- each card on its own branch, merged in with `--no-ff` after the checks pass;
- a resumable log in `docs/design/BUILD-2-LOG.md`;
- stop conditions, and two PRs at the end.

---

## Before it starts

| Gate | Who | Why |
|---|---|---|
| Build 1 finished: E5 merged into `cursor/big-build`, the `cursor/d-duo` PR open, the big-build PR open | Cursor | Build 2 starts from the finished build-1 head. |
| Ideally: big-build PR merged into `cursor/cutouts-this-week-quests`, then PR #15 merged into `main`, then PR #16 closed | Owner | Build 2 then bases on `main` and CI runs on PRs to `main`. If these haven't happened, build 2 bases on the `cursor/big-build` head; nothing else changes. |
| **Hold applying 041–044 to production until card M2 is green** | Owner | Only a few days' wait, and a broken migration then gets fixed in place, not by a follow-up migration. O1 (verify 039), O7 (Apple) and O8 (PostHog, Sentry) can go ahead. |

---

## Paste this into Cursor (Agent mode)

```
Run build 2 in docs/design/CURSOR-BUILD-2-2026-11-20.md.

Before anything else, read that file, the shared brief in
docs/design/CURSOR-HANDOFF-2026-11-20.md, supabase/migrations/README.md
(clean install order + every Verifying block) and docs/design/OWNER-RUNSHEET.md.
.cursor/rules/quest-hard-rules.mdc is always on.

Check the gates in "Before it starts". If build 1 isn't finished, stop and
tell me.

Then do Setup and work through the run order one card at a time. For each card:
1. Cut a card branch from the current cursor/build-2 head.
2. Build it, staying inside the card's file list.
3. Run the checks, and push the card branch so CI runs the db-local job.
4. When the checks and CI are green, merge the card branch into
   cursor/build-2 with --no-ff, then push it.
5. Append a row to docs/design/BUILD-2-LOG.md.
6. Go on to the next card.

Stop and report if you hit a stop condition. Don't stop for anything else.
Never run SQL against the hosted project. Everything runs in CI's
throwaway local stack, or locally only if Docker is running.
When you finish, open the PRs described in "Finish", then report.
```

To resume after a crash or a stop, paste the same prompt and add: "Resume from the last row of
docs/design/BUILD-2-LOG.md."

---

## Setup

1. Base on `main` if PR #15 has merged and `main` contains the big-build merge. Otherwise base on
   the `cursor/big-build` head. Pull first.
2. Create `cursor/build-2` and push it.
3. Create `docs/design/BUILD-2-LOG.md`:

```markdown
# Build 2 log

Base: <branch> @ <sha>. Started <date>.

| # | Card | Branch | Merge commit | db-local CI | pgTAP | Mobile tests | tsc mobile | tsc admin | deno test | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
```

---

## The rule that changes for build 2

On production, migrations **041–045 are not applied**. That makes them editable, but only while
both of these hold:

1. Its row on `OWNER-RUNSHEET.md` is unticked: O2 for 041, O3 for 042, O5 for 043, O9 for 044.
   045 has no row yet.
2. The owner has not said in chat or in the ledger that it was applied.

Before editing any of 041–045, re-read the run sheet. If the migration has been applied, **do not
edit it**. Write the fix as a new forward migration, `046_<name>.sql` or the next free number, and
record that in the log.

Files **002–040 and the baseline are applied on production and must never be edited**. If one of
them fails on a clean install, work around it in the CI harness and document it. Card M1 gives the
details.

`.cursor/rules/quest-hard-rules.mdc` is updated to say this.

---

## Run order

| # | Card | Size | Owns | Branch |
|---|---|---|---|---|
| 1 | M1: Local stack in CI, clean install, verify files | 1 d | `scripts/db-local/*`, `.github/workflows/db-local.yml`, the clean-install section of `supabase/migrations/README.md`, fixes inside 041–044 | `cursor/m1-db-local` |
| 2 | M2: pgTAP behaviour tests, 038–044 | 2–3 d | `supabase/tests/*`, the test step in `db-local.yml`, fixes inside 041–044 | `cursor/m2-pgtap` |
| 3 | M3: Generated database types | 1–1.5 d | `packages/db-types/*`, the types step in `db-local.yml`, `apps/*/lib/supabase*.ts`, call sites that need type fixes | `cursor/m3-types` |
| 4 | M4: Edge function tests | 1 d | `supabase/functions/*/*.test.ts`, `supabase/functions/_shared/*` (new), small injection seams in the two `index.ts` files, the deno job in `ci.yml` | `cursor/m4-deno-tests` |
| 5 | Z: Independent security review and fixes | 1 d | `docs/design/SECURITY-REVIEW-2026-11.md`, plus fixes within any card's files | `cursor/z-security` |
| 6 | M5: Prove 045 on the duo line | 1 d | Same as M1–M3, applied to `045_duo_quests.sql` | `cursor/m5-duo-proof`, cut from `cursor/d-duo` with `cursor/build-2` merged in |

The total is about 8 agent-days. M1 has to land first. M2, M3 and M4 each add their own job or
step and can run as background agents at the same time; the coordinator merges them one by one.
Z runs after M1–M4. M5 runs last, on the duo line.

---

## Cards

### M1: Local stack in CI, clean install, verify files

```
Goal: every migration applied, in dependency order, to a throwaway local
Supabase stack on every push, with the read-only verify files executed.

1. scripts/db-local/apply.sh (bash, set -euo pipefail):
   - Starts a local stack with NO migrations auto-applied: copy
     supabase/config.toml and supabase/seed.sql into a temp project
     dir, add the [api]/[db] defaults `supabase init` would write, and
     run `supabase start` there. Keep the repo's config.toml unchanged
     unless the CLI refuses it; if you change it, the change must not
     alter hosted behaviour.
   - Applies, with psql -v ON_ERROR_STOP=1 against the local DB URL:
     first 20260619010246_initial_schema.sql, then 002..044 ascending.
     This is the README "Clean install order (DB-01)".
   - Then runs supabase/seed.sql.
   - Prints one line per file: "applied <file> in <ms>".
2. scripts/db-local/verify.sh runs supabase/verify/*.sql in order and
   fails on any SQL error. Any verify file that writes test rows must
   already be wrapped in BEGIN ... ROLLBACK; if one isn't, fix the
   verify file.
3. .github/workflows/db-local.yml, on push to cursor/**, claude/** and
   main, and on PRs to main:
   supabase/setup-cli@v1 (pin a CLI version) -> apply.sh -> verify.sh.
   Upload the psql output as an artifact on failure.
4. When a file fails:
   - 041-044 (unapplied): fix the file in place, following the build-2
     rule, and note the root cause in the log.
   - 002-040 or the baseline (applied on prod): NEVER edit it. Add a
     minimal pre-step in apply.sh (for example create a missing
     extension, role or schema that hosted Supabase provides) with a
     comment naming the file and why. If no harness shim can fix it,
     STOP.
   - pg_net / vault / pg_cron differences from hosted: the migrations
     already guard pg_net. Make the harness provide what hosted
     provides, not weaken the migrations.
5. Rewrite the "Clean install order (DB-01)" section of
   supabase/migrations/README.md as the executed recipe ("executed in
   CI on <sha>"), and mark F-005/DB-01 resolved for local stacks in the
   ledger.
Done when db-local is green in CI on the card branch. Locally, run it
only if Docker is running; otherwise say CI is the evidence.
```

### M2: pgTAP behaviour tests, 038–044

```
Goal: the money, privacy and reward rules proven against real Postgres.
Tests live in supabase/tests/*.test.sql and run with `supabase test db`
against the M1 stack (add a step after verify.sh in db-local.yml).

Helpers (supabase/tests/00_helpers.sql or a setup block in each file):
create test users in auth.users and profiles; act_as(uid) =
set local role authenticated + set local request.jwt.claims to
{"sub": uid, "role": "authenticated"}; a quest with a point geofence
and coords inside and outside it. Every test file runs in a
transaction and rolls back.

Must cover (one file per area, each assertion named):
- 038/039 privacy: authenticated and anon can't select
  completions.redemption_code/lat/lng/gps_accuracy or
  profiles.push_token; the owner reads their own code through
  own_completion_reward.
- Insert normalisation (017/026/038): completed_at forced to now();
  the rate limit trips at its threshold; inside the zone -> approved,
  outside -> raises the zone error.
- 043 XP: the backfill leaves no null xp_awarded; a global x2 doubles;
  quest x2 + global x1.5 gives the max, not the product; the cap is 3;
  first finisher applies once (second finisher gets none); the win_back
  row is consumed once; xp_reason is set; revoke subtracts the stored
  award; leaderboard weekly XP = sum(xp_awarded); own_week_recap sums
  the same; active_xp_boosts() shows only the caller's win_back.
- 041 push outbox: the claim function hands each row to one caller
  only (two claims in one test don't overlap); the win_back kind is
  accepted; push_drops = false rows are not sent.
- 042 storage: the owner can insert and delete their own proof object;
  another user can't (storage.objects policies, bucket from 042).
- 044 stickers: a verified completion grants the quest sticker;
  revoking the completion removes it; placements are owner-write only;
  a public page is readable only when feed_public and not blocked.
- Definer hygiene, across all functions in public: every SECURITY
  DEFINER function has search_path set; none that the README lists as
  internal is executable by anon/authenticated.

When a test fails because a migration is wrong: fix 041-044 under the
build-2 rule; if the bug is in 002-040, STOP and report with the
failing assertion (it needs a forward migration and an owner decision).
Done when `supabase test db` is green in CI and the log lists the
assertion count per file.
```

### M3: Generated database types

```
1. New workspace package packages/db-types (@quest/db-types) holding
   src/database.ts, generated in CI by
   `supabase gen types typescript --local` against the M1 stack.
   Commit the generated file.
2. db-local.yml: regenerate, then `git diff --exit-code
   packages/db-types`, so a migration change without a type refresh
   fails CI. scripts/db-local/types.sh does the same locally.
3. Thread `Database` into createClient<Database>() in
   apps/mobile/lib/supabase.ts and apps/admin/lib/supabase*.ts. Make
   sure metro resolves the workspace package, the same way
   @quest/geofence does.
4. Fix the tsc errors that follow, with no behaviour change. When the
   types show a query is actually wrong (a missing column, a wrong
   table, a column that only exists after 043/044), that is a FINDING:
   fix it if the fix is obvious and covered by tests, otherwise list
   it. `as` casts are allowed only with a `// types:` comment, and
   every one is listed in the report.
5. Delete hand-written row types in apps/mobile/lib/types.ts that the
   generated types replace, when nothing else needs them.
Done when both tsc runs are clean, the drift check is green in CI and
the mobile tests pass.
```

### M4: Edge function tests

```
1. Move pure logic out of send-push-outbox/index.ts and
   send-social-push/index.ts into supabase/functions/_shared/*.ts
   (message building, batching, response handling), with fetch and
   the Supabase client passed in. The handler behaviour stays exactly
   as it is.
2. Deno tests (*.test.ts) with a fake fetch and a fake client:
   - a non-2xx Expo response leaves rows unsent and claimable again;
   - per-ticket errors are recorded; DeviceNotRegistered handling
     matches what the code does today (if the code doesn't clear dead
     tokens, add a test that pins today's behaviour and list "clear
     dead tokens" as a finding, don't build it);
   - more than 100 rows are drained across batches;
   - a bad webhook secret gives 401 and sends nothing;
   - push_drops / push_social opt-outs are respected.
3. ci.yml: the deno job runs `deno test supabase/functions` after
   `deno check`.
Done when deno test is green in CI.
```

### Z: Independent security review and fixes

```
Run this in a FRESH Cursor chat with no build history, so it reviews
the code as written, not as intended. Review
`git diff <build-1 base>...cursor/build-2` plus migrations 041-044.

Check:
- RLS on every new table;
- definer functions (search_path, revokes, input validation);
- storage policies (042, 044, quest-cutouts);
- every admin server action and route calls requireAdmin;
- the sticker upload (size limit, sharp limitInputPixels, MIME
  sniffing, no SVG);
- what /pilot exposes;
- feedback and analytics carry no PII, coordinates or free text;
- selfie privacy (D6);
- the offline queue's on-device files are purged on sign-out and
  account deletion;
- no secrets in the repo; the run sheet contains placeholders only.

Write docs/design/SECURITY-REVIEW-2026-11.md as a table: ID,
severity (P0-P3), file:line, issue, fix, status. Fix every P0 and P1 on
the card branch (with a pgTAP or Node test where it's a rule). List
P2/P3 as open.
```

### M5: Prove 045 on the duo line

```
1. Branch cursor/m5-duo-proof from cursor/d-duo, then merge
   cursor/build-2 into it. Resolve conflicts in favour of build 2's
   harness and tests.
2. Extend apply.sh to 045. Add supabase/verify/045.sql from the README
   "Verifying 045" block.
3. Add pgTAP supabase/tests/045_duo.test.sql:
   - the code alphabet and length;
   - one open party per creator;
   - a third member is refused (PARTY_FULL), as are PARTY_SELF and
     PARTY_EXPIRED;
   - a solo insert on a duo quest raises PARTY_REQUIRED;
   - the second member's verify pays both +round(0.5*base), or +base
     when either account is under 48 h old;
   - revoke removes the bonus;
   - the Recruiter badge ticks at 3;
   - the rate limit trips at 10 per hour.
4. Regenerate db-types (045 adds tables).
5. Open PR cursor/m5-duo-proof -> cursor/d-duo, titled "Prove duo
   quests (045) on a local stack". Keep it held, like D.
```

---

## Gates between cards

Run these on every card branch, and again on `cursor/build-2` after each merge:

```
npm test --workspace @quest/geofence --ignore-scripts
npm test --workspace mobile --ignore-scripts
cd apps/mobile && npx tsc --noEmit && npm run lint:tokens -- --strict
cd apps/admin && npx tsc --noEmit && npx next build      # CI placeholder env vars
CI: the db-local workflow (M1 onwards) and the deno job (M4 onwards) are green
```

These hold from build 1 and keep holding:

- the mobile test count never goes down;
- raw tokens stay at 0;
- both `tsc` runs stay clean.

### Stop conditions

1. A check or CI job still fails after two honest fix attempts.
2. A migration from 002–040 or the baseline fails on a clean install, and no harness shim can fix it.
3. A pgTAP test shows a bug in 002–040. It needs a forward migration and an owner decision.
4. You need to edit 041–045, but the run sheet or the ledger says the owner applied it.
5. A step needs the hosted project: SQL there, a deploy, a `link`, `db push`, EAS, or any Supabase
   MCP or plugin call.
6. The card needs a file outside its list.

---

## Finish

1. On `cursor/build-2`:
   - fill in `BUILD-2-LOG.md`;
   - add a ledger continuation entry;
   - set 041–044 to "locally tested (executed on a local stack in CI at `<sha>`)" in the migration
     README, ROADMAP and runbook. They stay **not applied**;
   - add a line under each apply step on `OWNER-RUNSHEET.md`: "Proven in CI: db-local `<run url>`".
2. Open PR **`cursor/build-2` → base**, titled "Build 2: prove the backend (local stack CI, pgTAP,
   db types, edge tests, security review)". The body lists:
   - each card and its merge commit;
   - assertion counts;
   - every edit made to 041–044, and why;
   - any 046+ forward migrations;
   - the security table summary.
3. M5's PR stays held against `cursor/d-duo`.
4. Report:
   - the log;
   - the PR links;
   - every stop;
   - the findings the owner must decide on.

Don't merge either PR.

## After build 2 (owner)

1. Merge the build-2 PR. CI's db-local run is now the evidence for each apply step.
2. Work through `OWNER-RUNSHEET.md` O2 → O5 → O9, applying 041 → 042 → 043 → 044 with a dry run
   before each. Run each verify file.
3. Cut TestFlight build #1 (O10).
4. Duo quests ship over the air two weeks into R1: merge M5 into D, D into the base, apply 045,
   then run `eas update`.
