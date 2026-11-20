# Quest! ultra plan: from here to the pilot (Nov 20, 2026)

This is the master plan for everything between today's checkout and the R1 closed pilot, which is
10–20 locals in Victoria on TestFlight. It sits above the
[Nov 19 build plan](NEXT-BUILD-PLAN-2026-11-19.md), which stays the detailed spec for cards C and D.
This plan adds what that one missed:

- the state of the repo as of today;
- a migration-number collision;
- the stickers PR;
- release readiness;
- a file-ownership map, so that several Cursor agents can run at once without colliding.

Cursor task cards: [CURSOR-HANDOFF-2026-11-20.md](CURSOR-HANDOFF-2026-11-20.md).

Status words, used strictly: **in checkout**, **locally tested**, **applied**, **deployed**,
**device-verified**.

---

## 1. The goal

The pilot is ready when all of these are true:

1. A TestFlight build from this repo is installed on the owner's iPhone. It is built with
   `expo-updates`, so later JS-only phases can ship over the air.
2. Migrations through the stickers migration are applied to production. Every "Verifying 0xx"
   block has been run and recorded.
3. Both push functions are deployed with their webhooks. A weekly drop, a Sunday recap and a
   social push each reach a phone.
4. The core loop is device-verified on one iPhone and one Android phone: open quest → walk into
   zone → photo → verified → XP, sticker, rank. This includes the offline queue.
5. About 25 quests have real sticker photos, alt text and `action_phrase` copy.
6. PostHog shows live events and Sentry receives a test error from the build.

Duo quests (card D) are **not** needed for R1. They ship over the air to the cohort once R1 is
running, because they need a pool of players to be worth anything.

---

## 2. Where things stand today (checked in the repo on Nov 20)

| Item | State |
|---|---|
| Branch `cursor/cutouts-this-week-quests` | **8 commits ahead of `origin`, not pushed.** PR #15 on GitHub therefore lacks Phases 3 and 4a and the admin polish. PR #15 is mergeable and its CI is green, but only for the older head. |
| Working tree | **10 uncommitted admin files** (badges, completions, moderation, dashboard, redeem, sponsors, users, `globals.css`, `GeofenceEditor`). This is in-flight UI polish: `formatVictoriaDate`, confirm copy, `aria-live`. Nobody has committed it. |
| Migrations 002–040 | Applied to production. The 039 checks were never recorded as run. |
| 041 push draining, 042 proof-photo policies, 043 XP events | In checkout and locally tested. **Not applied.** The apply order is fixed: 041 → 042 → 043. |
| Phase 3 offline queue | Merged and locally tested. Not device-tested. |
| Phase 4a XP events (server and admin) | Merged and locally tested. Mobile does not read `xp_awarded` yet; only `__tests__/xpEvents.test.js` mentions it. |
| Card C (4b XP mobile) | Not started. |
| Card D (duo quests) | Not started. |
| PR #16, stickers and the rewards-first direction | Open and **conflicting.** Its base is this branch from before Phases 1–4a. 45 files, +3411/−952. |
| `BRAND.md` | Committed. It already describes stickers and retires the sprite cast, so PR #16 is the implementation of the current brand. |
| Token debt | 126 raw tokens in 16 files (24 hex, 34 rgb, 68 `fontSize`). No change since Nov 19. |
| Spinners | 17 screens or components still import `ActivityIndicator`. |
| Sprite code | `components/Sprite.tsx` and `badges/pixel.tsx` / `art.tsx` remain. 8 screens mention sprites. |
| Release config | `expo-updates` is not installed. `eas.json` has three `REPLACE_WITH_*` placeholders. Android requests `RECORD_AUDIO`, which nothing uses. There is no `ITSAppUsesNonExemptEncryption` key. |

### New findings today

| ID | Sev | Finding | Resolution in this plan |
|---|---|---|---|
| U-01 | **P0** | PR #16 adds `supabase/migrations/041_stickers.sql`. `041_push_outbox_draining.sql` already holds that number. If the PR merges as written, the migration history breaks: `db push` would treat both files as version 041. | Card S renumbers the stickers migration to **044**. Duo quests move from 044 to **045**. |
| U-02 | P1 | PR #16 edits the same files as card C: `CompletionCelebration.tsx`, `submit/[questId].tsx`, `(tabs)/index.tsx` and `quest/[id].tsx`. It also deletes `Sprite.tsx`, which is slice E6. | Card S runs first, alone on those files. E6 is folded into S. Card C starts after S merges. |
| U-03 | P1 | PR #16's grant and revoke triggers fire on completion verify. 043 redefines `apply_completion_rewards` and the revoke path, and the stickers SQL was written before 043 existed. | Card S re-reads 043 and makes the sticker grant hang off the 043 reward path. It adds SQL text guards for this. |
| U-04 | P1 | The local branch is ahead of `origin`, and PR #15's green CI is for a stale head. | Card H commits the admin polish and pushes. CI then re-runs on the real head. |
| U-05 | P2 | Without `expo-updates` in the first native build, phases C, D and E can never ship over the air. Every fix would need a new store build. | Card R adds it before the first TestFlight build. |
| U-06 | P2 | The Android `RECORD_AUDIO` permission is unused. It draws a Play review question and a scary permission prompt. | Card R removes it. Expo's camera plugin is set with `recordAudioAndroid: false`. |

---

## 3. Two tracks

```
OWNER TRACK (hosted services, money, accounts)        CODE TRACK (Cursor agents, branches)
───────────────────────────────────────────────       ─────────────────────────────────────────
O1 Run "Verifying 039"                                 Wave 0  H  Land admin polish, push, PR #15 green
O2 Apply 041 → verify → set drain Vault values                  │
O3 Apply 042 → verify                                  Wave 1  S  Stickers reconcile (044) ─┐   R  Release readiness
O4 Deploy send-push-outbox + send-social-push,                                              │
   both webhooks; test a >100-row drain                                                     │
O5 Apply 043 → verify                                  Wave 2  C  XP events mobile ◄────────┘   E4 Own selfie
O6 Merge PR #15 to main (after Wave 0 CI)                        │
O7 Apple Developer, ASC record, fill eas.json          Wave 3  E1 Tokens → 0 + strict CI   E2 Skeletons   E5 A11y pass
O8 PostHog key + 4 dashboards; Sentry DSN                        │
O9 Apply 044 stickers → verify                         ── TestFlight build #1 (O10) ──
O10 build:prod → TestFlight; device checklists         Wave 4  D  Duo quests (045) → OTA to cohort
O11 Content: ~25 sticker photos, alt text, copy
O12 Step 6 clean-up; invite R1 cohort
```

### How the tracks join

- O2–O5 can start today. Code waves 0–3 do not wait on them. Nothing ships to a phone until
  they are done.
- O9 needs card S merged.
- O10, the first TestFlight build, needs:
  - cards H, S, R and C merged;
  - O1–O9 done;
  - ideally Wave 3 as well, though the E slices can follow over the air once R has landed.
- Card D goes after the first build. It is JS plus migration 045, and it ships over the air.

---

## 4. Code cards

| Card | Wave | Size | Depends on | Owns these files (no other open card may edit them) |
|---|---|---|---|---|
| **H** Hygiene: land the in-flight admin polish and push | 0 | 1 h | — | The 10 dirty admin files |
| **S** Stickers: reconcile PR #16, migration 044, fold in E6 | 1 | 2–3 d | H | Everything PR #16 touches, plus `components/Sprite.tsx`, `components/badges/*`, `supabase/migrations/044_stickers.sql`, the migration README |
| **R** Release readiness | 1 | 0.5 d | H | `apps/mobile/app.json`, `apps/mobile/eas.json` (non-secret fields only), `apps/mobile/package.json` deps, `LAUNCH-RUNBOOK.md` Step 1 |
| **C** XP events, mobile (Phase 4b), plus E3 | 2 | 1.5 d | S merged | `hooks/useXpBoosts.ts`, `(tabs)/index.tsx`, `quest/[id].tsx`, `lib/submitCompletion.ts`, `CompletionCelebration.tsx`, `lib/analytics.ts`. E3 ("Photos from here" relative time) is folded in here because the strip lives in `quest/[id].tsx`. |
| **E4** Own selfie in profile completion views | 2 | 0.5 d | S merged | `completion/[id].tsx`, own-profile completion rows. **Not** the celebration. |
| **E1** Tokens to 0, strict CI gate | 3 | 1 d | C merged | The 16 flagged files, `lib/theme.ts`, `.github/workflows/ci.yml` |
| **E2** Skeletons for the remaining spinners | 3 | 1 d | C merged | The 17 `ActivityIndicator` files, minus the submit screen |
| **E5** Accessibility pass | 3 | 1–2 d | E1, E2 merged | Every screen. Run it alone, last. |
| **D** Duo quests and referral (Phase 5) | 4 | 6 d | C merged, TestFlight #1 cut | `044` → **`045_duo_quests.sql`**, `app/party/*`, the party hooks, deep links, the admin quest form |

Cards in the same wave may run in parallel. Within a wave, no two cards share a file. This table
is the contract. If a card needs a file outside its row, the agent stops and reports it; it does
not edit the file.

### Card notes beyond the Nov 19 plan

**S. Stickers reconcile**

1. Cut a fresh branch from the pushed head after card H.
2. Port PR #16 commit by commit, or as one squashed port. Do not merge the stale PR branch.
3. Rename `041_stickers.sql` to `044_stickers.sql` and fix every reference to it: README index,
   apply order, runbook, comments.
4. The stickers SQL must sit on top of 043:
   - grant quest stickers from the 043 path, `apply_completion_rewards(p_completion_id)`, or
     from an AFTER trigger that reads the verified status;
   - revoke them from the 043 revoke path;
   - keep 043's `xp_awarded` behaviour unchanged.
5. Add SQL text guards to a new `__tests__/stickers.test.js`, or extend PR #16's
   `stickerBoard.test.js`:
   - the file is numbered 044;
   - it does not redefine `normalize_completion_on_insert`;
   - grants exist for any new client-readable column;
   - the definer functions set `search_path` and revoke from `PUBLIC`.
6. Fold in E6: delete `Sprite.tsx` and the sprite and category-default code paths. A quest
   without a real sticker shows no sticker.
7. Keep the offline queue (Phase 3) and the submit pipeline (`lib/submitCompletion.ts`) intact.
   PR #16 predates both. Re-apply its submit-screen UI changes onto the new pipeline.
8. Admin: `next.config.ts` with the 16 MB body limit, plus `sharp`. Check that `next build`
   still passes with the CI placeholder env vars.
9. Close PR #16 with a link to the new PR once that PR is open. **The owner closes it, not
   the agent.**

**R. Release readiness**

- `npx expo install expo-updates`. Configure `updates.url` from the EAS project ID, and use
  `runtimeVersion.policy: appVersion`, which is already set. The `preview` and `production`
  channels already exist in `eas.json`.
- Remove `android.permission.RECORD_AUDIO`. Add `"recordAudioAndroid": false` to the existing
  `expo-camera` plugin entry in `app.json`. Also add `"blockedPermissions":
  ["android.permission.RECORD_AUDIO"]` under `android`, so no library adds it back.
- Add `ios.infoPlist.ITSAppUsesNonExemptEncryption: false`.
- Check that every permission string matches what the app does today. Add a microphone string
  only if something records audio; nothing should.
- Add `"autoIncrement": true` to the production build profile, or document the manual build
  number.
- Do **not** fill the `REPLACE_WITH_*` values. They are the owner's (O7).
- Runbook Step 1 gets an "OTA after the first build" subsection:
  `npx eas-cli update --channel production --message "..."`. Note that native dependency
  changes still need a new build.

**C, D, E1, E2, E4, E5.** As specified in the Nov 19 plan and the handoff cards, with three
changes:

- Duo uses migration **045**.
- E6 is folded into S.
- E3 is folded into C.

---

## 5. Owner track, in order

| # | Step | Where | Unblocks |
|---|---|---|---|
| O1 | Run "Verifying 039" and paste the result into the ledger | `supabase/migrations/README.md` | Closes SEC-01 for real |
| O2 | Apply 041. Run "Verifying 041". Set the drain-cron Vault values. | runbook 0c | O4, O5 |
| O3 | Apply 042. Run "Verifying 042". | runbook 0c | The offline queue on a device |
| O4 | Set the webhook secrets, deploy `send-push-outbox` and `send-social-push`, create both webhooks. Test a drain of more than 100 rows. | runbook 0b/0c | Pushes on phones |
| O5 | Apply 043. Run "Verifying 043". Then deploy the admin build that has `/xp-events`. | runbook 0d | Card C device test |
| O6 | Merge PR #15 into `main` after card H's CI is green. New branches then cut from `main`. | GitHub | Clean review for S, R, C |
| O7 | Apple Developer enrolment, App Store Connect record, fill the 3 `eas.json` values | runbook 1 | O10 |
| O8 | PostHog key with replay off, plus the 4 dashboards. Sentry DSN as an EAS secret. | runbook 2–3 | Pilot telemetry |
| O9 | Apply 044 stickers and run its Verifying block. **Before this, close PR #16**; the new PR replaces it. | README | Stickers on device |
| O10 | `npm run build:prod` → TestFlight. Run the device checklists: Step 5, queue, XP, stickers, recap. | runbook 1, 5 | R1 |
| O11 | Content: about 25 sticker photos through the admin uploader, alt text, `action_phrase` | admin | R1 |
| O12 | Step 6: delete the retired functions, turn on leaked-password protection. Invite the 10–20 locals. | runbook 6 | Pilot starts |

The owner track is the long pole. Cards H, S, R and C total about 5 working days of agent time.
O7 (Apple approval) and O11 (photographing 25 objects) are the steps most likely to set the
launch date.

---

## 6. Decisions the owner needs to make

| # | Decision | Recommendation |
|---|---|---|
| D1 | Do stickers ship in the first TestFlight build? | **Yes.** BRAND.md already makes stickers the reward, and the sprite cast is retired. Shipping without them means shipping the old design. |
| D2 | Migration numbering: stickers 044, duo 045 | **Yes.** Stickers are written; duo is not. |
| D3 | Duo quests in R1 or after? | **After.** Ship them over the air two weeks into R1, with 3–5 duo quests written by then. |
| D4 | Universal links domain for `quest://party/CODE` | Defer. Players type the code after install until a domain exists. |
| D5 | Android in R1? | iOS-first through TestFlight. Play internal testing can follow with the same build profile once `google-service-account.json` exists. |
| D6 | Chains | Stay deferred until there are 35 live quests (no change). |

---

## 7. Risks

| Risk | Mitigation |
|---|---|
| Two agents edit the same screen | The file-ownership table in §4 is a hard rule. Each card stops and reports instead of crossing the line. |
| A migration is applied out of order | The order is fixed: 041 → 042 → 043 → 044 → 045. Every README entry starts with a "Requires" line. `db push --dry-run` must show exactly one new file. |
| The stickers port drops Phase 3 or 4a behaviour | Card S is done only when the full mobile suite passes (submission queue and XP tests included) and the submit screen still enqueues on `network`. |
| The first native build lacks `expo-updates` | Card R is a hard prerequisite of O10. |
| Untested SQL reaches production | Agents never execute SQL. The owner applies each migration and runs its Verifying block before the next one. |
| Stale docs mislead the next agent | Every card updates the ledger "Current continuation" section and the status table in the handoff. |

---

## 8. Verification for every card

```
npm test --workspace @quest/geofence --ignore-scripts
npm test --workspace mobile --ignore-scripts
cd apps/mobile && npx tsc --noEmit
cd apps/mobile && npm run lint:tokens          # must not go up; after E1, --strict must pass
cd apps/admin && npx tsc --noEmit              # if admin was touched
cd apps/admin && npx next build                # if admin was touched (CI placeholder env vars)
```

Device checks go into `LAUNCH-RUNBOOK.md` Step 5 as numbered lists, one per card.
