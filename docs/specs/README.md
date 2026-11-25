# Quest! Feature Specs — Current Status

The product specifications for Quest!'s verification, safety, analytics, content, growth and merchant flows. Status below was reconciled on Nov 25, 2026. It uses the status words strictly: **in checkout**, **locally tested** (local checks or CI, including the CI local Supabase stack), **applied** (on the production database), **deployed**, **device-verified**. Deployment steps are in the [launch runbook](../../LAUNCH-RUNBOOK.md) and the [owner run sheet](../design/OWNER-RUNSHEET.md).

| # | Spec | One-liner | Status |
|---|---|---|---|
| [01](01-geofence-drawing.md) | **Geofences** | Anywhere, circle, city, polygon and multi-area zones | Applied (013–015, 022, 024–026); local tests pass |
| [02](02-instant-verification.md) | **Instant Verification** | Server geofence validation; instant rewards and moderation removal | Applied (016–017, hardening through 038); insert normalisation has pgTAP coverage |
| [03](03-report-moderation.md) | **Reports & Moderation** | Post/comment reports, blocking, feed privacy and admin moderation | Applied (018, 028–030). Photo pre-screen auto-triage is build 3 card N4 |
| [04](04-analytics-instrumentation.md) | **Analytics** | PostHog event wrapper and product event schema | Mobile wrapper in checkout. Keys and dashboards not set (owner O8). Wave 2 events and dashboard spec: card N0 |
| [05](05-community-quests.md) | **Community Quests & Drops** | Suggestions, weekly drops and chains | Drops and suggestions applied (034–035). Drop push sender not deployed; its drain is 041 (not applied). Chains: card G1, gated on 35 live quests. Flash quests: card N1 |
| [06](06-growth-engagement.md) | **Growth & Engagement** | Starter quest, recap, XP events, offline queue and duo loop | See the Spec 06 rows below |
| 06 §4 | Starter quest | `is_starter` quest pinned after sign-up | 037 applied. Not device-verified |
| 06 §2 | Sunday recap | Recap screen and share card; Sunday push | 040 applied Nov 11; not device-verified. The push (`enqueue_week_recap`) is in 041: in checkout, locally tested, not applied |
| 06 §3 | XP events | Event multipliers, first-finisher bonus, win-back | In checkout and locally tested: 043 (13 pgTAP assertions), mobile card C, admin `/xp-events`. **Not applied** |
| 06 §5 | Offline queue | Queue and retry a failed submission | In checkout and locally tested (mobile). Needs 042 applied (5 pgTAP assertions, not applied) before a device check |
| 06 §1 | Duo quests | Party codes, duo bonus, referral | In checkout on `cursor/d-duo` (045). Held for R1. 045 has not run on a local stack yet (card M5). **Not applied** |
| — | Stickers ([BRAND.md §6–§7](../design/BRAND.md), no spec) | Sticker collection and board, replacing sprites | In checkout and locally tested: 044 (7 pgTAP assertions), card S, admin `/stickers`. **Not applied** |
| [07](07-merchant-redemption.md) | **Merchant Redemption** | No-login merchant validation and redemption reporting | Applied (036); live counter flow unverified |

**Next build plan:** [BUILD-3-PLAN-2026-11-25.md](../design/BUILD-3-PLAN-2026-11-25.md) (Nov 25, 2026).
Earlier plans: [build 2](../design/CURSOR-BUILD-2-2026-11-20.md), [build 1](../design/CURSOR-BIG-BUILD-2026-11-20.md),
[Nov 19](../design/NEXT-BUILD-PLAN-2026-11-19.md) and [Nov 17](../design/NEXT-BUILD-PLAN-2026-11.md).
Production has the baseline and 002–040 applied (039 and 040 by the owner on Nov 11); the 039
verification queries are not yet recorded. 041–044 are locally tested on the CI local stack and
not applied. No Spec 06 feature is device-verified.

**Design.** Cutouts is the approved visual direction in [`docs/design/BRAND.md`](../design/BRAND.md).
The implementation snapshot and remaining founder-owned assets/device checks are in
[`docs/design/UI-OVERHAUL-PLAN.md`](../design/UI-OVERHAUL-PLAN.md). Local code, remote migrations,
deployed functions and device verification are separate states.

## Why (product rationale)

Four findings drive this set, none of which were on the original roadmap:

1. **Approval latency is reward latency.** The whole dopamine loop waits on a solo founder opening a dashboard. Migration 013+ already validates presence server-side — that *is* the proof. (Specs 01–02)
2. **~28 quests is a content treadmill.** An engaged player is done in 4–6 weeks. Community suggestions + a weekly drop cadence make content compound. (Spec 05)
3. **The success metrics aren't measured.** PRODUCT.md defines them; nothing records them. (Spec 04)
4. **The feed is UGC and Apple will check.** Guideline 1.2 requires report + block + moderation, and a privacy opt-out is owed to users regardless. (Spec 03)

Plus the growth reality: word-of-mouth in a ~90k city is the entire distribution strategy, and duo quests are the referral loop that fits the product's soul. (Specs 06–07 round out retention and revenue.)

## Dependency order

```
01 Geofence Drawing ✅ ──┐
                         ├──> 02 Instant Verification ──> 03 Reports & Moderation
(013 geofence system) ───┘         (removes approval)        (must ship WITH 02)

04 Analytics ── independent; ship first or alongside anything

02 ──> 05 Community Quests & Drops (suggester XP moment)
02 ──> 06 Growth & Engagement (instant duo verification, starter quest)
02 ──> 07 Merchant Redemption (codes assigned at verification)
```

**Hard rule:** 02 and 03 ship in the same release — never auto-approval without the report mechanism, for both content safety and App Store review.

## Original rollout sequence (historical)

The phase names below preserve the dependency sequence from the initial Spec 01–07 rollout.
For current status, use the table at the top of this page and the [roadmap](../../ROADMAP.md).

| Phase | Contents | Migrations | Status |
|---|---|---|---|
| **A** | Polygon geofences: enum, `boundary` + generated `boundary_geojson`, `set_quest_boundary()`, admin draw UI, mobile display | `014`, `015` | ✅ Shipped |
| **B** | Instant verification: auto-approve on insert, rewards on insert path, in-DB redemption codes, revocation, anti-abuse guards; mobile celebration with real XP/streak | `016` | ✅ Shipped |
| **C** | Reports & moderation: `completion_reports`, feed report button, block user, feed privacy opt-out, admin moderation queue; **approval queue + pending UI removed in the same release** | `017` | ✅ Shipped (with B) |
| **D** | Analytics: PostHog wrapper, event schema, 4 dashboards | — | Code shipped; keys + dashboards are ops (runbook) |
| **E** | Content engine: weekly drop surfacing + push, community suggestions, chains | `034`, `035` | Drops + suggestions implemented Nov 9, 2026 (local migrations, push not deployed). Chains still deferred until ~35 quests. |
| **F** | Growth: starter quest, recap card, XP events, offline queue, duo quests | `032+` | Post-launch weeks 2–8 |
| **G** | Sponsor loop: merchant redemption page, redemption reporting | `032+` | Before sponsor renewals |

## Deliberately deferred

Multi-city and a self-serve sponsor portal. One pilot city with a city-wide leaderboard and public feed is the pilot's job.

*Update Aug 2026:* the follow graph and feed likes/comments were un-deferred and shipped (migrations 027 to 029).

## Non-goals (v1, across specs)

- Multi-polygon / donut-hole geofences (single ring only)
- AI photo-content verification — post-moderation covers it; revisit as an auto-triage layer for report-prone quests if abuse demands
- Automated bans / strike systems (admin judgment, surfaced by repeat-offender counts)
