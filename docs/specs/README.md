# Quest! Specs — Instant Verification Era

Three linked specs that together replace the manual approval system:

| # | Spec | One-liner |
|---|---|---|
| [01](01-geofence-drawing.md) | **Geofence Drawing** | Admin draws quest perimeters on a map — none / circle / city / custom polygon |
| [02](02-instant-verification.md) | **Instant Verification** | Geofence pass = proof. Completions auto-approve on submit; XP, streaks, badges, and redemption codes fire instantly. Manual approval removed. |
| [03](03-report-moderation.md) | **Reports & Moderation** | Feed posts get a report button; reported completions flag to admin, who can remove them (revoking XP) |

## Why (product rationale)

The current loop is: submit → wait for a solo founder to open the admin dashboard → XP. Approval latency is reward latency, which is the single biggest retention risk in the product. The geofence system (migration 013) already validates location server-side at insert time — that *is* the proof of presence. The photo becomes social proof for the feed, and community reports + admin moderation replace pre-approval review (post-moderation instead of pre-moderation).

## Dependency order

```
01 Geofence Drawing ──┐
                      ├──> 02 Instant Verification ──> 03 Reports & Moderation
(013 geofence system)─┘         (removes approval)        (replaces approval's safety net)
```

02 can technically ship before 01 (circle/city/none already work end-to-end), but **03 must ship in the same release as 02** — never ship auto-approval without the report mechanism, both for content safety and Apple App Store Guideline 1.2 (UGC apps require report + moderation).

## Rollout plan

| Phase | Contents | Migrations |
|---|---|---|
| **A** | Polygon geofence: enum value, `boundary` column, updated `check_completion_geofence`, admin draw UI, mobile boundary display | `014`, `015` |
| **B** | Instant verification: auto-approve on insert, rewards on insert path, in-DB redemption codes, revocation function, anti-abuse guards; mobile celebration shows real XP/streak | `016` |
| **C** | Reports: `completion_reports` table, feed report button, admin moderation queue; **remove approval queue + pending UI in the same release** | `017` |
| **D** | Cleanup: retire `award-xp` approval push, delete `PendingQuestItem`, update ROADMAP.md / ARCHITECTURE.md, backfill legacy `pending` rows | — |

## Non-goals (v1)

- Multi-polygon / donut-hole geofences (single ring only)
- AI photo-content verification (post-moderation covers it; revisit if abuse rate demands)
- Automated bans / strike systems (admin judgment, surfaced by repeat-offender counts)
- Follower-graph or per-user feed privacy (separate feature)
