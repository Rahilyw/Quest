# Build 2 log

Base: `cursor/big-build` @ `e3c8f42`. Started 2026-11-20.

| # | Card | Branch | Merge commit | db-local CI | pgTAP | Mobile tests | tsc mobile | tsc admin | deno test | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | M1 | `cursor/m1-db-local` @ `90a9755` | — (blocked) | **fail** (043 verify sanitize) | n/a | 290 | ok | ok | n/a (pre-existing deno fail on CI) | Apply path green (baseline→044+seed). Verify 039/041/042 pass. 043 fails: line-based placeholder strip leaves broken multi-line INSERTs → orphan `ROLLBACK`. Fix: drop whole BEGIN…ROLLBACK (or statement) when any line has `<placeholder>`. Two harness fixes already landed (no auto-seed; keep stack across steps). Stop condition 1. |
