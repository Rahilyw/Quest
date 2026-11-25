# Z: Security review Cursor P0/P1 fixes

Branch: `cursor/z-security`
Base: `origin/cursor/build-2`
Tip SHA: `a876fba76c427fe835fd1b52f31cfb4abeda81ba`

## What landed (table order)

| ID | Action |
|---|---|
| C-1 | **Blocked on DZ-1** (selfie visibility). No code change. |
| C-2 | PKCE + deep-link guard; Node test. **fixed in a25e4e8** |
| C-3 | Client clear on session-clear + retry. **046** waiting on DZ-2. |
| D-1 | `023_account_deletion.test.sql` — **db-local green** (direct storage delete works on pinned CLI). |

## Gates / CI

- mobile tests + tsc: pass
- CI: success — https://github.com/Rahilyw/Quest/actions/runs/45704081490
- db-local: success — https://github.com/Rahilyw/Quest/actions/runs/45704081422

## STOP

None. Remaining owner decisions: DZ-1 (C-1), DZ-2 (046 for A-1 / C-3 server).
