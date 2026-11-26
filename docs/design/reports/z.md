# Z: Security review fixes (every row owned by Cursor)

Branch: `cursor/z-security`
Base: `origin/cursor/build-2` (merged at 74c51da, DZ-1..3 decisions in)
Code tip: `ff77430` (statuses and report are in later docs-only commits)

## What landed (table order)

| ID | Action |
|---|---|
| C-1 | Owner-only selfies (DZ-1): 046 owner-folder SELECT, `can_view_selfie_object` revoked; photo queries never select other players' `selfie_url`; viewer signs own selfie only. |
| A-1 | 046: proof-photos SELECT limited to owner folder; INSERT limited to `authenticated` in the caller's own folder. pgTAP in `046_hardening`. |
| C-2 | PKCE + deep-link guard (a25e4e8). |
| C-3 | Client clears the token on every sign-out path; 046 trigger `trg_profile_push_token` (format check, dedupe) per the 046 section. |
| D-1 | `023_account_deletion.test.sql` seeds a proof photo and a selfie; **db-local green**, so direct storage delete works on the pinned CLI. Owner still runs runbook Step 5 on production. |
| A-2 | 042 exact path compare; 043 rejects non-canonical `photo_url` (`INVALID_PHOTO_URL`, SQLSTATE 22023 so the client does not read it as `outside_zone`). Carry the check into 045's redefinition if it has one. |
| A-3 | 046: `set_starter_quest` refuses non-anywhere quests. |
| A-4 | 044: unreleased quest stickers hidden from anon; earned stickers stay readable. |
| B-1 | `isAdminUser` = allowlisted email plus `email_confirmed_at`, used in middleware, login, `requireAdmin`, places route. Owner part (DZ-3) is still open. |
| B-2 | Cover upload sniffs bytes with sharp (png/jpeg/webp), content type from the detected format. |
| B-3 | `limitInputPixels: 40_000_000` on the sticker pipeline and cover sniff. |
| C-4, C-5, C-13 | Social push: non-2xx and ticket errors do not mark pushed or log tokens; clear matches the sent token. Deno tests. |
| C-6 | Batch split on request-level 400, tokens redacted from logs and `last_error`. Deno tests. |
| C-7 | Queue seal before any await on purge; sealed queues refuse saves and photos; delete flow purges in `finally`. |
| C-8 | **Partial.** Orphan `queue/*` folders removed on sign-in. Backup exclusion needs a native or `app.json` change outside this card's files. |
| C-9 | "Share usage data" switch in settings; PostHog `disableGeoip`. |
| A-5, A-6, A-8 | 044: client writes narrowed by grants; retired stickers not granted; short alt text falls back to the title. |
| B-5, B-6, B-7 | Sponsors page `force-dynamic` and sends counts only; completions use explicit columns and a capped limit; `grantSticker` only for active manual or season stickers. |
| C-11 | Sentry `beforeBreadcrumb` and `beforeSend` strip query strings, fragments and storage paths. |

Migration 046 is `supabase/migrations/046_storage_and_token_hardening.sql`, with `supabase/verify/046.sql`, `supabase/tests/046_hardening.test.sql`, run-sheet row O9b, and the README section. 041-044 were edited in place (run-sheet rows O2/O3/O5/O9 unticked).

## Gates

- `npm test --workspace @quest/geofence --ignore-scripts`: 50 passed, 0 failed
- `npm test --workspace mobile --ignore-scripts`: all scripts pass (logic 147/147; new `securityHardening` 12 tests; script count 13 to 14)
- admin: `adminHardening` 12 tests plus `pilotFallback` 9, both pass
- mobile `tsc --noEmit`: clean; `lint:tokens --strict`: 0 raw tokens
- admin `tsc --noEmit`: clean; `next build` with CI placeholder env: passes
- pgTAP (db-local): 9 files, 75 tests, PASS (includes 023, 042, 044, 046)
- CI: https://github.com/Rahilyw/Quest/actions/runs/45741426933 (success)
- db-local: https://github.com/Rahilyw/Quest/actions/runs/45741426996 (success; `verify/046.sql` ok)

## Files touched

Migrations 042-044, 046 (new); `supabase/tests`, `supabase/verify`, `supabase/migrations/README.md`, `scripts/db-local/apply.sh`, `docs/design/OWNER-RUNSHEET.md`; edge `_shared/socialPush`, `_shared/pushOutbox`, `send-social-push` and their Deno tests; mobile photo, queue, settings, analytics and Sentry files with new `queueGuard`, `sentryScrub`, `analyticsPreference` and `securityHardening` test; admin auth, covers, sponsors, completions, stickers with new `adminIdentity`, `coverImage`, `adminRules` and `adminHardening` test. `apps/mobile/__tests__/pushOutbox.test.js` was updated for the renamed ticket variable.

## Findings

- 046 is not applied anywhere yet: owner applies it (row O9b) and 042-044 changes ship with O2/O3/O5/O9.
- B-1 only fully closes once the owner has set DZ-3 (confirm email on in the hosted project).

## STOP

None for D-1 (green). C-8 backup exclusion is the one item not done, for the file-list reason above.