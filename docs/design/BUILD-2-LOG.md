# Build 2 log

Base: `cursor/big-build` @ `e3c8f42`. Started 2026-11-20.

| # | Card | Branch | Merge commit | db-local CI | pgTAP | Mobile tests | tsc mobile | tsc admin | deno test | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | M1 | `cursor/m1-db-local` | `223c2e2` | [success](https://github.com/Rahilyw/Quest/actions/runs/44826850577) | n/a | 290 | ok | ok | n/a (pre-existing deno on CI; M4) | Clean install harness. Tip `64c392b`. Verify sanitize drops whole txn blocks with placeholders. No edits to 041–044. Docker not local — CI evidence. |
