# Cursor big build: every remaining code card, one run (Nov 20, 2026)

This document turns the [ultra plan](ULTRA-PLAN-2026-11-20.md) into one long Cursor run. The run
builds all the remaining code for the pilot on one integration branch, and then builds duo quests
on a branch of their own. It uses the cards in
[CURSOR-HANDOFF-2026-11-20.md](CURSOR-HANDOFF-2026-11-20.md) and adds four cards: Q, V, P and F.

When the run ends, the owner reviews **one PR** (`cursor/big-build`) and cuts TestFlight build #1
from it. Duo quests wait in a second PR until the pilot is running.

---

## Paste this into Cursor (Agent mode)

```
Run the big build in docs/design/CURSOR-BIG-BUILD-2026-11-20.md.

Before anything else, read that file, docs/design/CURSOR-HANDOFF-2026-11-20.md
(the shared brief and every card) and docs/design/ULTRA-PLAN-2026-11-20.md
(sections 2 and 4). .cursor/rules/quest-hard-rules.mdc is always on.

Work through the run order one card at a time. For each card:
1. Cut a card branch from the current cursor/big-build head.
2. Build it, staying inside the card's file list.
3. Run the full checks.
4. Merge the card branch into cursor/big-build with --no-ff, then push it.
5. Append a row to docs/design/BIG-BUILD-LOG.md.
6. Go on to the next card.

Stop and report if you hit a stop condition. Don't stop for anything else.
Card D goes last, on its own branch, and is never merged into cursor/big-build.
When you finish, open the two PRs described in "Finish", then report.
```

To resume after a crash or a stop, paste the same prompt and add: "Resume from the last row of
docs/design/BIG-BUILD-LOG.md."

---

## Setup (the agent does this once)

1. Check out `cursor/cutouts-this-week-quests` and run `git pull --ff-only`. Then push it if it is
   ahead of `origin`: this plan was committed locally, so the base must include that commit. If
   PR #15 has already merged, base on `main` after pulling, and cherry-pick the plan commit if
   `main` lacks it.
2. Create `cursor/big-build` from the base and push it.
3. Create `docs/design/BIG-BUILD-LOG.md` with the table below and commit it.

```markdown
# Big build log

Base: <branch> @ <sha>. Started <date>.

| # | Card | Branch | Merge commit | Mobile tests | Geofence tests | tsc mobile | tsc admin | next build | Tokens | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
```

Quote the totals in each row, for example "212 passed". Put "n/a" when a check doesn't apply.

---

## Run order

Run the cards in this order. Each card branches from the `cursor/big-build` head **after** the card
before it has merged. If Cursor runs background agents, the cards that share a group number may
run at the same time. The coordinator still merges them one by one and re-runs the checks after
each merge.

| # | Card | Group | Size | Spec | Branch |
|---|---|---|---|---|---|
| 1 | R: Release readiness | 1 | 0.5 d | handoff, card R | `cursor/r-release` |
| 2 | Q: CI hardening | 1 | 2 h | below | `cursor/q-ci` |
| 3 | S: Stickers reconcile, migration 044, sprite removal | 2 | 2–3 d | handoff, card S | `cursor/s-stickers` |
| 4 | V: Owner verification pack | 3 | 2 h | below | `cursor/v-verify` |
| 5 | C: XP events mobile, plus "Photos from here" time | 3 | 1.5 d | handoff, card C, and Nov 19 plan §4b | `cursor/c-xp-mobile` |
| 6 | E4: Own selfie in completion views | 3 | 0.5 d | handoff, card E4 | `cursor/e4-selfie` |
| 7 | P: Admin pilot dashboard | 3 | 1 d | below | `cursor/p-pilot-admin` |
| 8 | F: In-app feedback | 4 | 0.5 d | below | `cursor/f-feedback` |
| 9 | E1: Tokens to 0, strict CI | 5 | 1 d | handoff, card E1 | `cursor/e1-tokens` |
| 10 | E2: Skeletons | 5 | 1 d | handoff, card E2 | `cursor/e2-skeletons` |
| 11 | E5: Accessibility pass | 6 | 1.5 d | handoff, card E5 | `cursor/e5-a11y` |
| 12 | D: Duo quests, migration 045 | 7 | 6 d | handoff card D, Nov 19 plan §5 | `cursor/d-duo` (**not merged**) |

The total is about 16 agent-days if the cards run one after another.

The order is set by file ownership:

- R goes before S because both edit `apps/mobile/package.json`.
- F goes after C because both edit `lib/analytics.ts`.
- E1 and E2 go after F because `settings.tsx` is on their lists.
- E5 touches every screen, so it runs alone.

---

## The four new cards

### Q: CI hardening (only `.github/workflows/ci.yml`)

```
1. Add a job "edge-functions (deno check)": use denoland/setup-deno@v2, then
   run `deno check supabase/functions/send-push-outbox/index.ts
   supabase/functions/send-social-push/index.ts`. Fix type errors in those
   files only if the fix is mechanical and doesn't change behaviour.
   Otherwise report them and add continue-on-error with a TODO.
2. Add a step to the mobile typecheck job:
   `cd apps/mobile && npx expo config --type public > /dev/null`. It
   catches a broken app.json, which card R changes.
3. Leave the token job alone. E1 makes it strict later.
Done when the workflow file is valid YAML and the commands run locally
(or report that Deno isn't installed locally and CI will run it).
```

### V: Owner verification pack (new files only; runs after S)

```
1. Copy each "Verifying 0xx" block from supabase/migrations/README.md for
   039, 041, 042, 043 and 044 into its own file:
   supabase/verify/039.sql, 041.sql, 042.sql, 043.sql, 044.sql.
   Copy the SQL exactly; don't change it. Each file opens with a comment
   that says which migration it checks, what a pass looks like, and that
   it is read-only (wrap it in BEGIN ... ROLLBACK where the block writes
   test rows).
2. Write docs/design/OWNER-RUNSHEET.md, a one-page ordered checklist for
   owner steps O1-O12 from the ultra plan §5. Each step gets the exact
   PowerShell command or dashboard path, the verify file to paste into the
   Supabase SQL editor, and a checkbox. Apply order:
   041 -> 042 -> 043 -> 044, with a `db push --dry-run` before each one
   that must list exactly one file.
3. Link the run sheet from LAUNCH-RUNBOOK.md (one line at the top).
Don't edit the README SQL. The agent executes nothing.
```

### P: Admin pilot dashboard (`apps/admin/app/pilot/*`, plus one nav link in `app-shell.tsx`)

```
A read-only /pilot page for watching the R1 cohort. Server components,
service-role reads through the existing lib/supabase-server.ts, and
requireAdmin() at the top. No charts library: tables and CSS bars using
admin theme tokens.

Sections:
1. Cohort: players total, new in the last 7 days, weekly active players
   (distinct users with an approved completion this Victoria week, using
   lib/format.ts or lib/schedule.ts week helpers), push opt-in rate
   (push_token is not null and push_drops).
2. Activity: completions per day for the last 14 days (Victoria dates),
   reports opened and posts removed in the last 7 days.
3. Quests: top 10 by completions this week, live quests with zero
   completions in 14 days.
4. Content readiness (ultra plan O11): live quests missing cutout_url,
   missing cutout_alt (after 044) or missing action_phrase. Each links to
   the quest edit page.
5. Boosts: the active XP event, if any (after 043).

It must work whatever the owner has applied. Detect missing columns or
tables (043, 044 not applied) and show "Needs migration 0xx" in place of
that section instead of throwing. Put that check in one helper with a
Node test of the fallback logic.
Add "Pilot" to the admin nav. Run tsc and next build.
```

### F: In-app feedback (`app/settings.tsx` one row, `components/FeedbackSheet.tsx`, `components/ErrorBoundary.tsx`, `lib/sentry.ts`, `lib/analytics.ts`)

```
Pilot players need a way to tell us what broke.
1. Settings gets a row "Send feedback" that opens FeedbackSheet: a text
   box (max 1000 characters, with a counter), a "Send" button, and the
   line "Sends your message, app version and device model. No photos or
   location."
2. Send through Sentry user feedback (@sentry/react-native 8:
   Sentry.captureFeedback({ message, associatedEventId? })). Wrap it in
   lib/sentry.ts as sendFeedback(message, eventId?). It returns
   'sent' | 'unavailable' | 'failed'.
3. If Sentry isn't initialised (no DSN yet, owner step O8), the row stays
   visible. The sheet says "Feedback isn't switched on in this build yet."
   and offers no input. Nothing crashes.
4. ErrorBoundary's fallback gets a "Tell us what happened" button that
   opens the same sheet with the Sentry event id attached.
5. Analytics: feedback_sent {} with no text and no length (rule: no free
   text in analytics).
6. Tokens only, 48pt targets, sentence case, a label on every control.
Test: a pure helper for the length limit and the result-to-copy mapping,
in a Node test registered in the mobile test script.
```

---

## Gates between cards

After each card, run all of these on the card branch. Run them again on `cursor/big-build` after
the merge.

```
npm test --workspace @quest/geofence --ignore-scripts
npm test --workspace mobile --ignore-scripts
cd apps/mobile && npx tsc --noEmit
cd apps/mobile && npm run lint:tokens
cd apps/admin && npx tsc --noEmit && npx next build    # CI placeholder env vars
```

Once a card passes, these rules hold for every card after it:

- The mobile test count never goes down.
- The raw-token count never goes up. After E1 it stays at 0.
- `tsc` stays at exit 0.

### Stop conditions (stop, write the reason in the log row, report)

1. A check still fails after two honest fix attempts.
2. The card needs a file outside its list, or outside the files the plan says it may create.
3. Card S can't hook the sticker grant or revoke into 043's reward path without redefining
   `normalize_completion_on_insert` or changing `xp_awarded`.
4. A step needs a hosted service: SQL execution, a deploy, EAS, or any Supabase MCP or plugin call.
5. A merge into `cursor/big-build` conflicts in a file that the incoming card doesn't own.
6. A card would change the behaviour of the offline queue: the submit screen must enqueue only on
   `network`, and `duplicate` counts as success.

Nothing else is a reason to stop. Make the reasonable call, note it in the log's Notes column, and
keep going.

---

## Finish

1. On `cursor/big-build`:
   - update the status table in `CURSOR-HANDOFF-2026-11-20.md`: every card is "Merged into
     cursor/big-build" except D, which is "PR open, held";
   - add a continuation entry to `QUEST-FABLE-CAMPAIGN-LEDGER.md`;
   - set ROADMAP status words to "in checkout" / "locally tested".
2. Open PR **`cursor/big-build` → base**, titled "Big build: stickers, XP mobile, release
   readiness, pilot tooling, polish". The body lists:
   - each card with its merge commit;
   - the final check totals;
   - every migration added (044 only), marked **not applied**;
   - the owner run sheet link;
   - the combined device checklist.
3. Open PR **`cursor/d-duo` → `cursor/big-build`**, titled "Duo quests and referral (migration
   045). Hold until R1 is running."
4. Report:
   - the log table;
   - both PR links;
   - anything changed from the spec;
   - every stop that happened.

Don't merge either PR. The owner merges them.

---

## What the owner does while the run is going

The owner track runs alongside the build; [OWNER-RUNSHEET.md](OWNER-RUNSHEET.md) exists once
card V lands. Before card S merges, the owner can already:

- verify 039;
- apply 041 → 042 → 043;
- deploy the push functions;
- start Apple enrolment;
- set up PostHog and Sentry.

Migration 044 is applied after the big-build PR is reviewed and merged. TestFlight build #1 is cut
from the merged result.
