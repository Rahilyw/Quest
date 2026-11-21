# Build 2 log

Base: `cursor/big-build` @ `e3c8f42`. Started 2026-11-20.

| # | Card | Branch | Merge commit | db-local CI | pgTAP | Mobile tests | tsc mobile | tsc admin | deno test | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | M1 | `cursor/m1-db-local` | `223c2e2` | [success](https://github.com/Rahilyw/Quest/actions/runs/44826850577) | n/a | 290 | ok | ok | n/a (pre-existing deno on CI; M4) | Clean install harness. Tip `64c392b`. Verify sanitize drops whole txn blocks with placeholders. No edits to 041–044. Docker not local — CI evidence. |
| 2 | M2 | `cursor/m2-pgtap` | `3229777` | [success](https://github.com/Rahilyw/Quest/actions/runs/44842130268) | 53 (6+12+6+5+13+7+4) | n/a | n/a | n/a | n/a | pgTAP vs M1 stack. Tip `29a7a91`. Suites: insert 6, privacy 12, push 6, storage 5, xp 13, stickers 7, definer 4. No 041–044 edits. PostGIS `st_*` excluded from search_path check. |
| 3 | M3 | `cursor/m3-types` | `ea48c5e` | [success](https://github.com/Rahilyw/Quest/actions/runs/44845057914) | 53 | pass | ok | ok | n/a | `@quest/db-types` + drift check. Tip `fe51da9`. FINDING fixed: `useQuestPhotos` filtered missing `completions.feed_public` → `profiles!inner`. Casts: submitCompletion `as never` (server xp_awarded), category/Json enums in suggest + admin badges/quests. |
| 4 | M4 | `cursor/m4-deno-tests` | `16cb59e` | n/a | n/a | pass | ok | ok | [success](https://github.com/Rahilyw/Quest/actions/runs/44846631476) | `_shared/pushOutbox` + `socialPush` with injectable fetch. Tip `01a3068`. DeviceNotRegistered still clears tokens (pinned). `deno.json` nodeModulesDir auto. |
