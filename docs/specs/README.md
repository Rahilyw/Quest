# Quest! Specs — Instant Verification Era

The spec set behind the post-MVP strategy: make rewards instant, let the community generate content, instrument everything, and ship the moderation Apple demands.

| # | Spec | One-liner | Status |
|---|---|---|---|
| [01](01-geofence-drawing.md) | **Geofence Drawing** | Admin draws quest perimeters on a map — none / circle / city / custom polygon | ✅ **Shipped** (migrations 014–015, admin draw UI, mobile rendering) |
| [02](02-instant-verification.md) | **Instant Verification** | Geofence pass = proof. Completions auto-approve on submit; XP, streaks, badges, redemption codes fire instantly. Manual approval removed. | Draft |
| [03](03-report-moderation.md) | **Reports & Moderation** | Report button on feed posts, block user, admin moderation queue with XP revocation — Apple Guideline 1.2 compliance | Draft |
| [04](04-analytics-instrumentation.md) | **Analytics** | PostHog + ~15-event schema so the success metrics in PRODUCT.md are actually measurable | Draft |
| [05](05-community-quests.md) | **Community Quests & Drops** | Player-suggested quests with credit, Monday drop ritual, quest chains — solves the content treadmill | Draft |
| [06](06-growth-engagement.md) | **Growth & Engagement** | Duo quests + referral loop, Sunday recap share card, XP economy events, first-quest onboarding, offline queue | Draft |
| [07](07-merchant-redemption.md) | **Merchant Redemption** | No-login merchant page to validate & redeem sponsor codes; redemption-rate reporting | Draft |

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

## Rollout plan

| Phase | Contents | Migrations | Status |
|---|---|---|---|
| **A** | Polygon geofences: enum, `boundary` + generated `boundary_geojson`, `set_quest_boundary()`, admin draw UI, mobile display | `014`, `015` | ✅ Shipped |
| **B** | Instant verification: auto-approve on insert, rewards on insert path, in-DB redemption codes, revocation, anti-abuse guards; mobile celebration with real XP/streak | `016` | Next |
| **C** | Reports & moderation: `completion_reports`, feed report button, block user, admin moderation queue; **approval queue + pending UI removed in the same release** | `017` | With B |
| **D** | Analytics: PostHog wrapper, event schema, 4 dashboards | — | Before launch |
| **E** | Content engine: weekly drop surfacing + push, community suggestions, chains | `018+` | Post-launch weeks 1–4 |
| **F** | Growth: starter quest, recap card, XP events, offline queue, duo quests | `019+` | Post-launch weeks 2–8 |
| **G** | Sponsor loop: merchant redemption page, redemption reporting | `020+` | Before sponsor renewals |

## Deliberately deferred

Multi-city, self-serve sponsor portal, follow/friend graph, feed likes/comments. One pilot city with a city-wide leaderboard and public feed already has all the social density it needs — friends/follows would fragment a small community. The pilot's job is proving one city loves this.

## Non-goals (v1, across specs)

- Multi-polygon / donut-hole geofences (single ring only)
- AI photo-content verification — post-moderation covers it; revisit as an auto-triage layer for report-prone quests if abuse demands
- Automated bans / strike systems (admin judgment, surfaced by repeat-offender counts)
