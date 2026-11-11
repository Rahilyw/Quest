# Quest! Feature Specs — Current Status

The product specifications for Quest!'s verification, safety, analytics, content, growth and merchant flows. Status below describes implementation in this checkout; deployment is called out separately in the [launch runbook](../../LAUNCH-RUNBOOK.md).

| # | Spec | One-liner | Status |
|---|---|---|---|
| [01](01-geofence-drawing.md) | **Geofences** | Anywhere, circle, city, polygon and multi-area zones | Implemented in checkout (013–015, 022, 024–026); local tests pass |
| [02](02-instant-verification.md) | **Instant Verification** | Server geofence validation; instant rewards and moderation removal | Implemented in checkout (016–017, later hardening) |
| [03](03-report-moderation.md) | **Reports & Moderation** | Post/comment reports, blocking, feed privacy and admin moderation | Implemented in checkout (018, 028–030) |
| [04](04-analytics-instrumentation.md) | **Analytics** | PostHog event wrapper and product event schema | Mobile wrapper present; production keys/dashboards are operational work |
| [05](05-community-quests.md) | **Community Quests & Drops** | Suggestions, weekly drops and chains | Drops/suggestions implemented (034–035); push deployment remains; chains deferred |
| [06](06-growth-engagement.md) | **Growth & Engagement** | Starter quest, recap, XP events, offline queue and duo loop | Starter quest implemented (037). Sunday recap implemented in checkout (040, not applied or device-tested; no reminder push). Other features planned |
| [07](07-merchant-redemption.md) | **Merchant Redemption** | No-login merchant validation and redemption reporting | Implemented in checkout (036); live counter flow unverified |

**Next feature handoff:** [Claude implementation prompt](../design/CLAUDE-NEXT-IMPLEMENTATION-PROMPT.md).
The Nov 10 runbook reports migrations through 038 applied remotely. This doc update did not
independently query Supabase. Migrations 039 (profile-token privacy) and 040 (recap) are in the
checkout and not applied. After they are applied and the recap is device-tested, the next
product feature is Spec 06 §3 (XP events).

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
