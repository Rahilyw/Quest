# Z: Security review Cursor P0/P1 fixes

Branch: `cursor/z-security`
Base: `origin/cursor/build-2`
Tip SHA: `a25e4e88fef64d34575fe8691d855730223c971e`

## What landed (table order)

| ID | Action |
|---|---|
| C-1 | **Blocked on DZ-1** (selfie visibility). No code change. |
| C-2 | PKCE + `decideAuthDeepLinkAction`: ignore without pending flow or when a live session exists. Node test. |
| C-3 | Client: clear push on any session-clear path + retry on signOut. **046** (`register_push_token`) still waiting on DZ-2. |
| D-1 | `supabase/tests/023_account_deletion.test.sql` (2 assertions). If CI fails, need 046 (owner). |

A-1 is Owner `046` only — not Cursor in this pass.

## Gates

- mobile tests: pass (authLinking suite added)
- mobile tsc: clean
- token lint: 0

## CI

*(fill after push)*

## STOP

None for Cursor-only client/test work. **Blocked:** C-1 on DZ-1; C-3 server half and A-1 on DZ-2 / 046.
