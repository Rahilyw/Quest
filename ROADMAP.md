# Quest! — Product Roadmap

**Last reconciled:** November 25, 2026
**Current product priority:** pilot launch first, with a closed TestFlight cohort of 10–20 Victoria locals (R1). Close build 2 (Z security review, M5 duo proof, then the build-2 PR). Then run Wave 1 of [build 3](docs/design/BUILD-3-PLAN-2026-11-25.md), the launch pack (K1–K5) that feeds TestFlight build #1. Alongside, the owner works the [run sheet](docs/design/OWNER-RUNSHEET.md): verify 039, apply 041 → 042 → 043 → 044 one at a time, deploy the push functions, and set up Apple, PostHog and Sentry. Duo quests (045) stay held until R1 starts. Chains wait for 35 live quests and leagues for WAU > 100.

## Current status (Nov 25, 2026)

This is the status of the repository and of what the logs and ledger record about production. It
is not a deployment certification. The status words are used strictly:

- **in checkout**: the code is on a branch in this repo;
- **locally tested**: it passed local checks or CI, including the CI local Supabase stack;
- **applied**: the migration is on the production database;
- **deployed**: the function, admin build or app build is live;
- **device-verified**: someone checked it on a phone.

Sources: [build 1 log](docs/design/BIG-BUILD-LOG.md), [build 2 log](docs/design/BUILD-2-LOG.md),
[campaign ledger](docs/design/QUEST-FABLE-CAMPAIGN-LEDGER.md), [owner run sheet](docs/design/OWNER-RUNSHEET.md)
and the [migration index](supabase/migrations/README.md).

| Area | State | Next step |
|---|---|---|
| Build 1 (`cursor/big-build`) | Cards R, Q, S, V, C, E4, P, F, E1, E2 and E5 merged. Locally tested: 290 mobile tests, 50 geofence tests plus redemption, both `tsc`, admin `next build`. Raw tokens are at 0 and the CI token job is strict. | Reaches `main` through PR #15 and the build chain (owner, O6). |
| Build 2 (`cursor/build-2`) | M1–M4 merged with green CI: clean install on a local stack (M1), 53 pgTAP assertions (M2), generated `@quest/db-types` with a drift check (M3), Deno edge-function tests (M4). Z (security review) is published in `docs/design/SECURITY-REVIEW-2026-11.md` with fixes pending; M5 (prove 045) is in progress. The build-2 PR is not open. | Finish Z and M5, then open the build-2 PR (B2). |
| `main` | Still at `7f76a69`. PR #15 is open. Builds 1 and 2 are not on `main`. | Owner merges PR #15 (O6). |
| Production database | The baseline and 002–040 are applied (repo-recorded: through 038 on Nov 10, 039 and 040 by the owner on Nov 11). The "Verifying 039" queries are not recorded as run. | O1: run `supabase/verify/039.sql`. |
| Migrations 041–044 | In checkout. Locally tested on the CI local stack: clean install, verify SQL, pgTAP. **Not applied.** | O2, O3, O5, O9: apply in number order, one file per dry-run. |
| Migration 045 (duo) | In checkout on `cursor/d-duo` (tip `66ac0b3`); mobile and admin checks pass. Held for R1. Its SQL has not yet run on a local stack; that is M5's job. **Not applied.** | M5 proves 045 and adds the dark-launch guard; owner O13 after R1 starts. |
| Push draining and recap push (041) | In checkout, locally tested (6 pgTAP assertions; Deno tests for the shared push logic in `supabase/functions/_shared`). Functions not deployed; webhooks and Vault values not set. | O2, O4. |
| Proof-photo owner policies (042) | In checkout, locally tested (5 pgTAP assertions). Not applied. | O3. |
| XP events (043, card C, admin `/xp-events`) | In checkout, locally tested (13 pgTAP assertions, mobile XP tests). Not applied. | O5. |
| Stickers (044, card S, admin `/stickers`) | In checkout, locally tested (7 pgTAP assertions, sticker board tests). Collage sprites removed. Not applied; sticker photos not uploaded. | O9, then O11 (content). |
| Offline submission queue (Spec 06 §5) | In checkout, locally tested (mobile only). Needs 042 applied before a device check. | O3, then the K3 device checklist. |
| Pilot dashboard (admin `/pilot`, card P) | In checkout, locally tested (`next build`, fallback test). Falls back softly when 043 or 044 is missing. Not recorded as deployed. | Owner Vercel deploy with O5. |
| Feedback (F), own selfie (E4), skeletons (E2), accessibility (E5) | In checkout, locally tested. None device-verified. | K3, then O10 and O18. |
| Local database CI | `.github/workflows/db-local.yml` runs `scripts/db-local/*` on `main`, `cursor/**` and `claude/**`: baseline → 002–044 → seed, the verify SQL pack, pgTAP in `supabase/tests`, and a type drift check. DB-01 (F-005) is resolved for local stacks. | Every new migration adds a verify file, pgTAP and a README block. |
| Sunday recap (040) | Applied Nov 11. Not device-verified. The Sunday push needs 041 and the deployed sender. | K3; O2, O4. |
| App Review | Nothing in the repo yet: no reviewer notes, demo account, privacy-label mapping, screenshots or listing copy. | K2, then O14. |
| iOS submit | `eas.json` still has `REPLACE_WITH_*` values for Apple ID, ASC app ID and team ID. | O7. |
| Analytics and crash reporting | PostHog and Sentry SDKs are wired. Keys and dashboards are not set. | O8; N0 adds the Wave 2 events; O17 builds the dashboards. |
| Device validation | No feature is device-verified. | K3 writes one checklist; the owner runs it on TestFlight #1 (O10, O18). |
| Docs | This table, `README.md`, `ARCHITECTURE.md` and the specs index were reconciled on Nov 25 (card K1). | Keep in step with the migration index. |

Local source, CI, the production migration history, function deployment, webhook delivery and
device checks are separate states. A row says only what the sources above record.

### What build 3 owns

[Build 3](docs/design/BUILD-3-PLAN-2026-11-25.md) assigns a card to most open items. The card ID
appears next to the item in the tables below.

| Wave | Cards |
|---|---|
| 0: close build 2 | Z security review, M5 duo proof and dark-launch guard, B2 build-2 PR |
| 1: launch pack | K1 doc sweep, K2 App Review pack, K3 device checklist, K4 map tab audit, K5 admin quest preview |
| 2: R1 retention | N0 analytics contract, N1 flash quests, N2 save for later, N3 streak freeze, N4 photo pre-screen; owner O13 ships duo |
| 3: data-gated | G1 chains (35 live quests), G2 leagues (WAU > 100), G3 quest-log map, G4 TanStack Query, G5 Android, G6 party-code links, G7 search and leaderboard scopes |

Migration numbers 046–053 are reserved in plan §6. Multi-city, the sponsor portal, seasons,
widgets, AI photo verification and session replay stay deferred.

---

## Strategic Direction (July 2026)

Four findings reframed the roadmap — none were on any earlier list. Two are now fixed:

1. **Approval latency is reward latency.** ✅ **Fixed.** Geofence pass **is** the proof; completions auto-approve at insert with rewards applied before the celebration renders; rate limits + in-app-camera-only + mock-location block guard the gate. → Specs 01 ✅ / 02 ✅ / 03 ✅
2. **The feed is UGC.** ✅ **Fixed.** Report on every post, block-user, feed privacy opt-out (`feed_public`), auto-hide at 3 independent reports, admin moderation with GPS evidence, removal revokes XP. → Spec 03 ✅
3. **Unmeasured success metrics.** ✅ **Wired.** PostHog + ~16-event schema shipped through the mobile app; Sentry alongside. Remaining: set the production keys and build the 4 dashboards in PostHog (runbook). → Spec 04
4. **The content treadmill.** ❌ ~29 quests ≈ 4–6 weeks of engaged play, then churn. Fix: community-suggested quests with credit + a Monday drop / Sunday expiry ritual + quest chains. → Spec 05

Plus: duo quests as the referral loop (word-of-mouth **is** the distribution strategy in a 90k city), the Sunday recap share card as the organic marketing engine, merchant redemption validation as the sponsor-renewal proof, and XP economy events as cheap retention levers. → Specs 06 / 07

**Deliberately deferred:** multi-city, self-serve sponsor portal. One city with a shared leaderboard and public feed has all the social density the pilot needs.

**Deferral overridden (Aug 9, 2026):** the follow graph and feed likes/comments shipped as the Instagram-style social layer (migration `027`): likes, comments + one-level replies, follows, Victoria/Following feed modes, public profiles with photo grids, and Strava-style completion share cards via the OS share sheet. The city-wide feed remains the default; Following is an additional tab.

---

## Roadmap

Status key: ✅ Done · ⚠️ Partial · ❌ Not started. A card ID such as K2 or N1 means build 3 owns the
item ([plan §2](docs/design/BUILD-3-PLAN-2026-11-25.md)). Where a cell uses a status word (in checkout,
locally tested, applied, deployed, device-verified), it is used strictly.

### Phase 0 — Launch Hardening (ongoing)

| # | Task | Status | Notes |
|---|---|---|---|
| 0.1 | Admin role allowlist | ✅ | Set `ADMIN_ALLOWED_EMAILS` in prod |
| 0.2 | Service role server-side only | ✅ | |
| 0.3 | Badge unlock aligned (12/13) | ✅ | `005` is inside 002–040, which is recorded as applied |
| 0.4 | EAS first real build + iOS submit creds | ⚠️ | Project ID and `expo-updates` done (card R); Apple creds are still placeholders (O7). App Review pack: K2 |
| 0.5 | Sentry / crash reporting | ✅ | Set `EXPO_PUBLIC_SENTRY_DSN` in EAS env |
| 0.6 | CI pipeline | ✅ | `ci.yml`: Node tests, strict token report, both `tsc`, admin `next build`, Deno check and test, npm audit. `db-local.yml`: local-stack install, verify SQL, pgTAP, type drift |
| 0.7 | Mount push tap listeners | ✅ | `lib/push-navigation.ts` mounted in `_layout.tsx` |
| 0.8 | Real Victoria boundary polygon | ✅ | Migration `022` + updated `seeds/victoria-bc-boundary.geojson` |
| 0.9 | Migration/env-var doc cleanup | ✅ | K1 (Nov 25): migration lists through 044 with 045 held; `.env.example` names match the code |
| 0.10 | Account deletion (App Store 5.1.1(v)) | ✅ | Migration `023` RPC + Settings Danger Zone flow; 023 applied. Not device-verified (K3) |
| 0.11 | Real app icons + adaptive icon + splash | ✅ | Generated brand mark; `app.json` wired (adaptive icon, notification icon, navy splash) |
| 0.12 | Definer-function lockdown + admin action auth | ✅ | Migration 030 (live) + `requireAdmin()` (#10) |
| 0.13 | Nov 2026 audit fixes | ✅ | Migration 031 (rank snapshot cron, Pacific leaderboard week, RPC surface, FK indexes, RLS perf) applied; 038–039 secret-column fixes applied |
| 0.14 | Admin on Vercel | ✅ | Env vars set, production live Nov 7. The build 1 admin pages (`/pilot`, `/stickers`, `/xp-events`) are not recorded as deployed |
| 0.15 | Security review of 041–045 and admin actions | ⚠️ | Z: review published, fixes pending. Forward fixes use migration 046 if 041–045 are applied first |
| 0.16 | App Review pack: reviewer notes, demo account, privacy labels, screenshots, listing | ❌ | K2; owner O14 |
| 0.17 | One device checklist for every phase | ❌ | K3; owner O10, O18 |

### Phase A — Geofence Drawing ([Spec 01](docs/specs/01-geofence-drawing.md)) — ✅ SHIPPED July 2026

| # | Task | Status |
|---|---|---|
| A.1 | `polygon` geofence type + `boundary` column + generated `boundary_geojson` (migrations 014–015) | ✅ |
| A.2 | `set_quest_boundary()` validated write path; polygon branch in `check_completion_geofence()` | ✅ |
| A.3 | Admin draw mode (draw / drag / midpoints / delete / validation / centroid autofill) in create + edit | ✅ |
| A.4 | Mobile: polygon check in `@quest/geofence` + submit-screen indicator + map rendering | ✅ |
| A.5 | Seed polygon example (Beacon Hill Park) + package tests (44) | ✅ |

### Phase B — Instant Verification ([Spec 02](docs/specs/02-instant-verification.md)) — ✅ SHIPPED July 2026

| # | Task | Status |
|---|---|---|
| B.1 | Migrations 016–017: auto-approve on insert, rewards on insert path, `removed` status + XP revocation, in-DB redemption codes, rate limits (2/10 min, 10/24 h) | ✅ |
| B.2 | Mobile: pending UI deleted (`PendingQuestItem` gone); celebration shows real XP / level-up / streak / redemption code | ✅ |
| B.3 | Admin: approval queue → read-only completions log with Remove | ✅ |
| B.4 | Retire `award-xp` approval push + `generate-redemption-code` invocation | ✅ |
| B.5 | Anti-abuse: DB rate limits + mock-location block | ✅ (verify `bypassGeofence` stripped in release build — release checklist) |
| B.6 | Backfill legacy `pending` rows | ✅ (in 016) |

### Phase C — Reports & Moderation ([Spec 03](docs/specs/03-report-moderation.md)) — ✅ SHIPPED July 2026 (with B)

| # | Task | Status |
|---|---|---|
| C.1 | Migration 018: `completion_reports`, counters, auto-hide at 3 distinct reporters, `blocked_users`, `feed_public` | ✅ |
| C.2 | Mobile: ⋯ menu → `ReportPostSheet` (5 reasons); block user; feed filtering | ✅ |
| C.3 | Admin `/moderation`: GPS-vs-fence evidence, dismiss / remove (+ owner push) / remove-with-retry, flagged count on dashboard | ✅ |
| C.4 | Feed privacy opt-out (`feed_public` toggle in Settings, enforced by RLS) | ✅ |
| C.5 | EULA/objectionable-content line in legal screens | ✅ (`legal/terms.tsx` updated) |

### Phase D — Analytics ([Spec 04](docs/specs/04-analytics-instrumentation.md)) — ✅ CODE SHIPPED July 2026 (keys + dashboards: runbook steps 2–3)

| # | Task | Status |
|---|---|---|
| D.1 | PostHog + `lib/analytics.ts` wrapper (no-op without key) | ✅ |
| D.2 | ~15-event schema wired through mobile | ✅ (Wave 2 events: N0) |
| D.3 | 4 dashboards: activation funnel, WAU retention post-first-quest, week-2 leaderboard return, per-quest content conversion | ⚠️ Build in PostHog UI (O8, runbook step 2); N0 writes the Wave 2 dashboard spec, owner O17 builds it |
| D.4 | Privacy policy analytics line | ✅ |

### Phase H — Cutouts UI overhaul ([BRAND.md](docs/design/BRAND.md), [plan](docs/design/UI-OVERHAUL-PLAN.md)) — STARTED NOV 2026

| # | Task | Status |
|---|---|---|
| H.1 | Foundations: tokens, Figtree, text primitives, category model, copy pass, token report | ✅ Merged (#12) |
| H.2 | Cutout pipeline: `cutout_url`, processing script, admin upload, `<Cutout>`, `<Pillow>`, quest-photos query, dual-camera proof data (private selfie bucket), collage kit components | ✅ In repo (032–033); collage sprites retired by BRAND Nov 12 |
| H.3 | Core loop: floating tab bar + new tabs, This week, Quests folders, quest page + photo viewer, camera (place then selfie), Verified | ✅ In checkout; skeletons (E2) and accessibility pass (E5) locally tested; not device-verified (K3) |
| H.4 | City bubbles, Rankings, You (collection shelf + badges) | ✅ In checkout; sticker board from 044 (card S). Map tab still on the legacy palette: K4 |
| H.5 | Brand surfaces: icon, splash, share card, onboarding | ✅ In checkout; store screenshots open (K2 shot list) |
| H.6 | Admin restyle | ✅ In checkout; live folder and bubble preview in the quest form: K5 |
| H.7 | Content: ~29 place photos, ~29 cutouts, action phrases (the sprite set is retired; stickers replace it) | ❌ (founder; ~25 sticker photos are O11) |

Decisions D1 to D8 are recorded in the plan (wordmark, tabs, category colours, distance/time, dual-camera proof approved Nov 7, place photos, sprites).

### Phase E — Content Engine ([Spec 05](docs/specs/05-community-quests.md)) — POST-LAUNCH WEEKS 1–4

| # | Task | Status |
|---|---|---|
| E.1 | Weekly drop ritual: "New this week" section, "Ends Sunday" chips, Monday drop push, admin scheduling presets (uses shipped migration 012) | ✅ 034 applied. Push sender not deployed and its drain (041) not applied (O2, O4) |
| E.2 | Community quest suggestions: table + mobile form + admin curation queue + "Quest by @username" credit + suggester XP + City Author badge | ✅ 035 applied. Not device-verified |
| E.3 | Quest chains: chains tables, progress UI, chain bonus + badge, admin chain builder | ❌ G1, gated on 35 live quests (migration 051 reserved) |

### Phase F — Growth & Engagement ([Spec 06](docs/specs/06-growth-engagement.md)) — POST-LAUNCH WEEKS 2–8

| # | Task | Status |
|---|---|---|
| F.1 | First-quest onboarding: `is_starter` quest pinned post-signup; time-to-first-XP < 5 min | 037 applied; seed, admin designation and This week card in checkout. Not device-verified. K2 checks that a reviewer outside Victoria can finish the loop |
| F.2 | Sunday recap share card (view-shot + native share) + Sunday push | Card and screen in checkout; 040 **applied** Nov 11; not device-verified. The Sunday push is in 041 (`enqueue_week_recap`): in checkout, locally tested, not applied, sender not deployed |
| F.3 | XP economy events: `xp_events` table, double-XP weekends, first-finisher bonus, lapsed-player win-back | **in checkout**, **locally tested**: 043 (13 pgTAP assertions on the CI local stack), mobile card C, admin `/xp-events`. 043 **not applied** (O5). Not device-verified |
| F.4 | Offline submission queue with retry | **in checkout**, **locally tested** (mobile queue tests; 042 has 5 pgTAP assertions). Needs 042 **applied** (O3) before a device check (K3) |
| F.5 | Duo quests: `min_party_size`, party codes/QR, duo bonus, referral kicker + Recruiter badge, duo seed quests | **in checkout** on `cursor/d-duo` (045). Mobile and admin checks pass, but 045 has not run on a local stack yet. Held until R1, **not applied**. M5 proves 045 and adds the dark-launch guard; owner O13 ships it. Party-code universal links: G6 |

### Phase G — Sponsor Loop ([Spec 07](docs/specs/07-merchant-redemption.md)) — BEFORE SPONSOR RENEWALS

| # | Task | Status |
|---|---|---|
| G.1 | `sponsors` table + `redeemed_at`; merchant page `/redeem/[merchantKey]` (valid/used/invalid + mark redeemed) | Done; 036 applied. Live counter flow not verified. `redeemed_at` was already in 017. |
| G.2 | Sponsor reporting: issued / redeemed / rate / last redemption + CSV columns | Done in repo |
| G.3 | Sponsored seed rows + sponsor fields in admin create form + E2E test | ⚠️ Seed rows (`seed.sql`) and form fields exist; a live counter pass is still open |
| G.4 | Player-side redeemed state + "show at counter" framing | Done in repo (You tab; refetches on focus) |

### Deferred (deliberate)

| Item | Why deferred |
|---|---|
| Multi-city support | Pilot must prove one city first |
| Self-serve sponsor portal | Manual sponsor ops fine at pilot scale; Spec 07 provides the proof-of-value first |
| ~~Follow/friend graph, feed likes/comments~~ | Un-deferred Aug 2026; shipped in 027 to 029 |
| AI photo-content verification | Post-moderation covers it; the lighter **photo pre-screen auto-triage** (R2 below, card N4) is the first step |
| Season Veteran badge / seasons table | With a future seasons feature |
| iOS/Android widgets | Post-retention-mechanics |

---

## Recommendations & Future Candidates (July 7, 2026 review)

Findings from a full codebase + docs review. **R-items** are process/tooling recommendations; **C-items** are feature candidates that respect the existing deferrals (no multi-city, no follow graph, no likes/comments). The last column is the Nov 25 status and the build 3 card, if any.

### Process & tooling (R)

| # | Recommendation | Why | When | Status (Nov 25) |
|---|---|---|---|---|
| R1 | **Closed TestFlight cohort (10–20 Victoria locals) before public launch** — *after* PostHog keys are live | First impressions in a 90k word-of-mouth city are spent once; burning them with zero data captured is the exact failure Spec 04 exists to prevent | First TestFlight build | Planned; starts after TestFlight #1 (O10, O12) |
| R2 | **Photo pre-screen auto-triage** — NSFW/SafeSearch check (AWS Rekognition or Google Vision) on proof-photo upload that *auto-flags* into the existing moderation queue (a synthetic "reporter"), never auto-rejects | Strengthens the Apple 1.2 story beyond report-and-review; the moderation queue already has the review UX, so this is glue, not a system | If report volume grows, or pre-emptively before public launch (~1 day) | Not started. N4 (Wave 2; vendor decision DB3-3; migration 050) |
| R3 | **EAS Update (OTA) as the primary pilot iteration channel** | Ship fixes without store-review latency during the pilot's learning weeks; `runtimeVersion: appVersion` is already configured | From first TestFlight build | `expo-updates` added (card R). Wave 2 ships over the air |
| R4 | **Adopt TanStack Query before Phase E** | Hooks currently re-fetch on every mount; content surfaces multiply in Phase E (drops, suggestions, chains) and retrofitting later costs more | Phase E kickoff | Not started. G4 (Wave 3, runs alone) |
| R5 | **`supabase gen types` replacing hand-maintained `lib/types.ts`** | The badge system (019–021) is exactly the kind of schema change where manual types silently drift | Phase 0.9 | Done in build 2: `@quest/db-types` with a CI drift check (M3). `lib/types.ts` still holds app-level shapes |
| R6 | **Sync ARCHITECTURE.md + root README.md to real migration numbers** (016–023) and the shipped badge/account-deletion/analytics work | Same drift this doc had until Jul 7; a wrong number near `db push` is an ops hazard | Phase 0.9 | K1 (Nov 25) |
| R7 | **PostHog session replay stays off** | Proof photos are real people; replay would capture them | Standing policy | Standing policy |

### Feature candidates (C) — post-launch, in rough priority order

| # | Candidate | Fit | Effort | When to consider | Status (Nov 25) |
|---|---|---|---|---|---|
| C1 | **Streak insurance / freeze** — one per month, *earned* (e.g. complete 5 quests), auto-consumed on a missed week | Weekly streaks are the core retention loop and Victoria has weather; an earned freeze doesn't violate "earned, not given" | Low | With F.3 XP economy events | Not started. N3 (Wave 2; rules need DB3-4; migration 049) |
| C2 | **Quest save-for-later / wishlist** — bookmark on quest cards, "Saved" filter on Explore | Near-zero effort; gives Explore a return-visit reason; saved-but-never-completed is a high-signal analytics segment for quest friction | Low | Any time post-launch | Not started. N2 (Wave 2; migration 048) |
| C3 | **Personal quest-log map** — profile map of everywhere you've completed quests ("my city, conquered") | Natural visual for the F.2 Sunday recap card — build them together; deepens the local-identity principle | Medium | With F.2 | Not started. G3 (Wave 3, after N3) |
| C4 | **Flash quests** — time-boxed (e.g. 3-hour Saturday-market window) quests with a push at open | Retention lever that costs content, not code — migration 012 scheduling already supports it; pairs with E.1's drop ritual | Low (needs E.1 push infra) | With/after E.1 | Not started. N1 (Wave 2; migration 047) |
| C5 | **Leaderboard leagues/brackets** — cohorts of ~30 so rank stays motivating | Only if WAU > ~100; changes rank-snapshot design (011), so flag early | Medium | Post-pilot, data-gated | Not started. G2, gated on WAU > 100 for 2 weeks (migration 052) |
| C6 | **Merchant QR-at-till for Spec 07** — printed QR linking to `/redeem/[merchantKey]`; no merchant accounts | Keeps Phase G rollout to "print this and tape it to the counter" | Trivial (part of G.1) | Phase G | Not started; no card |

---

## Priority Matrix

| Feature | Effort | Impact | Priority | Status |
|---|---|---|---|---|
| iOS submit creds + first store build | Low | Critical (ship) | **P0** | ❌ O7, O10; App Review pack K2 |
| Analytics (Spec 04) | Low | Critical (learning) | **P0** | ✅ Wired; keys and dashboards not set (O8). Wave 2 events: N0 |
| Apply migration 023 live (022 applied; history synced) | Low | Critical (ops) | **P0** | ✅ Applied (inside 002–040) |
| Apply 041 → 042 → 043 → 044 | Low | Critical (ops) | **P0** | ❌ Locally tested on the CI local stack; not applied (O2, O3, O5, O9) |
| `ADMIN_ALLOWED_EMAILS` in prod | Trivial | Critical | **P0** | ✅ Set on Vercel Nov 7 |
| Account deletion (App Store 5.1.1(v)) | Low | Critical (review) | **P0** | ✅ 023 applied; not device-verified (K3) |
| Real Victoria boundary | Low | High | **P0** | ✅ Applied live (022) |
| Sentry | Low | High | **P0** | ✅ Wired; DSN not set (O8). In-app feedback goes through Sentry (card F) |
| Instant verification (Spec 02) | Medium | Critical (retention) | — | ✅ Shipped |
| Reports & moderation + block + opt-out (Spec 03) | Medium | Critical (store review) | — | ✅ Shipped |
| Geofence drawing (Spec 01) | Medium | High | — | ✅ Shipped |
| Weekly drop ritual (E.1) | Low | High (retention) | **P1** | ✅ 034 applied; push sender not deployed (O4) |
| First-quest onboarding (F.1) | Low | High (activation) | **P1** | ✅ 037 applied; not device-verified |
| Community quest suggestions (E.2) | Medium | High (content) | **P1** | ✅ 035 applied; not device-verified |
| Sunday recap share card (F.2) | Medium | High (growth) | **P1** | 040 applied Nov 11; not device-verified. Push in 041: locally tested, not applied |
| Merchant redemption validation (Spec 07) | Low–Med | High (revenue) | **P1** | 036 applied; live counter flow not verified |
| XP economy events (F.3) | Low | Medium–High | **P2** | In checkout, locally tested (043, card C); not applied |
| Offline submission queue (F.4) | Medium | Medium | **P2** | In checkout, locally tested; needs 042 applied |
| Quest chains (E.3) | Medium | Medium | **P2** | ❌ G1, gated on 35 live quests |
| Duo quests + referral (F.5) | High | High (growth) | **P2** | In checkout on `cursor/d-duo` (045), held for R1; M5 in progress; O13 |
| Push tap navigation | Low | Medium | **P2** | ✅ Mounted in `_layout.tsx` |
| Photo pre-screen auto-triage (R2) | Low | Medium–High (trust/review) | **P2** | ❌ N4 |
| Streak insurance / freeze (C1) | Low | Medium (retention) | **P3** | ❌ N3 |
| Quest save-for-later (C2) | Low | Medium (engagement + signal) | **P3** | ❌ N2 |
| Personal quest-log map (C3) | Medium | Medium (identity/share) | **P3** | ❌ G3 |
| Flash quests (C4) | Low | Medium (retention) | **P3** | ❌ N1 |
| Stickers (BRAND §6–§7) | Medium | Medium (collection) | **P2** | In checkout, locally tested (044, card S); not applied; photos are O11 |
| Leaderboard leagues (C5) | Medium | Medium | **P3** | ❌ G2, gated on WAU > 100 |
| Android on Play internal testing | Low | Medium | **P3** | ❌ G5 (DB3-6: iOS first) |
| Universal links for party codes | Low | Medium | **P3** | ❌ G6 (domain decision DB3-7) |
| Quest search; monthly and all-time leaderboard | Medium | Low–Medium | **P3** | ❌ G7 |

---

## Tech Debt

| Area | Issue | When to fix |
|---|---|---|
| ~~`award-xp` / badge logic duplication~~ | ✅ Resolved — edge fn retired by 017; badge logic single-sourced in 019–021 evaluator | — |
| Doc drift: root README.md + ARCHITECTURE.md | Migration lists brought up to 044 (045 held) on Nov 25 (K1); keep them in step with `supabase/migrations/README.md` (the source of truth) | Ongoing |
| Hand-written DB types | Mostly resolved: `@quest/db-types` is generated on the CI local stack with a drift check (M3), and both Supabase clients are typed with it. `lib/types.ts` still holds hand-written app shapes | Move remaining shapes onto `Database` types when touched |
| Raw tokens in components | ✅ Resolved: 0 raw tokens since card E1; CI runs `check-tokens.js --strict` | Keep at 0 |
| Env var naming drift | ✅ Example files aligned with the code on Nov 25 (K1). Admin reads `SUPABASE_SECRET_KEY` and the publishable key; edge functions read `SUPABASE_SERVICE_ROLE_KEY` from the functions runtime | — |
| No React Query / SWR | Hooks re-fetch on every mount | G4 (R4), Wave 3, alone |
| Manual TypeScript types | See 'Hand-written DB types' above (M3) | — |
| Duplicate `push_token` migrations | History, not a fix: `20250618120000_add_push_token_to_profiles.sql` duplicated `004_push_token.sql` and was deleted in `b92d15d` (Jun 23, 2026). Only `004` remains; both used `ADD COLUMN IF NOT EXISTS`. See ARCHITECTURE.md | No action in code. Whether the hosted history table still has a row for `20250618120000` is not recorded |
| App icon art | Generated brand mark (`scripts/gen-app-icons.js`) — swap in designed art anytime by replacing the three PNGs | Optional, pre-1.0 polish |
| Leaderboard weekly-only | No all-time/monthly scope | G7 (migration 053) |
| No integration tests | Partly resolved: pgTAP runs against a real local stack in CI (53 assertions, M2) and Deno tests cover the push functions (M4). No end-to-end app tests (DB3-8: not in build 3) | K3 manual device checklist covers R1 |
| `sponsors` identity on `sponsor_name` string | Formal FK deferred | Spec 07 §2 note / sponsor portal |

---

## Architecture Notes

**Live flow (Phases B+C shipped — migrations 016–018; badge evaluator 019–021):**

```
Mobile submit → geofence trigger validates (013–015 + real boundary 022, all 4 zone types, unbypassable)
  → normalize (017): rate-limit check → status = approved, reviewed_at = now
  → apply_completion_rewards: XP + level + streak (insert path)
  → badge evaluator via total_xp (019–021: data-driven rules, per-badge thresholds)
  → sponsored: redemption code assigned in-DB
  → celebration shows real XP / level-up / streak / code, seconds after the real-world effort
  → analytics: completion_verified / celebration_viewed / badge_unlocked events (Spec 04)
  → post appears on public feed (unless feed_public = false or hidden by reports)
  → community reports (018) → auto-hide at 3 → admin moderation
      → dismiss (restore) | remove (revoke XP + owner push) | remove-and-allow-retry
Account deletion (023): Settings → delete_own_account() → storage objects + auth.users → full cascade
```

**Mobile screen map:** unchanged from June (5 tabs + stack screens); Phase C adds report/block sheets, Phase E adds suggest-a-quest, Phase F adds recap screen.

This is the flow on the applied schema (through 040). Once 043 is applied, `normalize_completion_on_insert`
also stores the XP award (`completions.xp_awarded`, event multipliers, first-finisher bonus) and
`apply_completion_rewards` pays that stored amount. Once 044 is applied, the same reward and revoke
path grants and removes stickers. Both are in checkout and locally tested, not applied.

---

## Success Metrics (defined in PRODUCT.md, instrumented by Spec 04)

- **WAU retention after first quest** — primary retention signal
- **Sponsor quest renewal rate** — primary revenue signal (proof via Spec 07 redemption rates)
- **Leaderboard week-2 return** — secondary engagement signal
- **Average XP per MAU** — depth-of-play signal
- **Time-to-first-XP** *(new)* — activation signal; target median < 24 h, aspiration < 5 min via starter quest

---

## History

Everything in this section is a dated snapshot. It is kept for the record and is superseded by
"Current status" at the top of this file. Do not read its ✅ marks, test counts or "apply pending"
notes as the present state.

### Status table (Nov 17, 2026)

This was the top status table from Nov 17 to Nov 25, 2026. Builds 1 and 2 have since changed
most rows.

| Area | Current code/docs status | Next step |
|---|---|---|
| Core verification and moderation | Implemented in migrations and app code: geofences, instant rewards, reports, blocks, moderation, account deletion, badges and social layer. | Resolve audit issues and maintain server authority. |
| Profile privacy | **P1, fix written:** migration 039 removes `push_token` from client SELECT; mobile reads explicit columns. Applied to production Nov 11, 2026; verification queries not yet recorded. | Owner runs the "Verifying 039" checks in the migration README. See SEC-01. |
| Migration bootstrap | Files are timestamped initial schema plus numbered 002–040. Fresh lexical order is unsafe. A clean-install procedure is documented in the migration README. | Run the procedure once on a throwaway database; it has not been executed. |
| Community content | Weekly drops and suggestions are implemented in code (034–035); chains remain deferred. | Verify sender/webhook separately; improve outbox draining before enabling at scale. |
| Merchant redemption | Implementation is present (036) with public merchant page and sponsor reporting. | Live counter flow remains unverified; do not infer from code. |
| Starter quest | Implemented (037) and surfaced in This week. | Keep current as implemented; no duplicate work. |
| Cutouts | Main mobile and admin surfaces are implemented. Real place photography/cutouts and device/accessibility validation remain. | See [UI overhaul status](docs/design/UI-OVERHAUL-PLAN.md). |
| Analytics | Mobile event wrapper/SDK integration is present. Production keys and dashboards are operational tasks. | See Spec 04 and runbook. |
| Growth | Sunday recap implemented in checkout (migration 040, recap screen from Rankings, on-device share card). 040 applied to production Nov 11, 2026; not device-tested. No Sunday reminder push. XP events, offline queue and duo quests are not implemented. | Test on iOS and Android, then XP events (Spec 06 §3). |
| Push | Social and weekly sender source exists. Repository docs report the functions/webhooks are not deployed. Weekly sender caps each invocation at 100 rows. | Deploy and validate only through the runbook; harden repeat draining. |

The Nov 10 runbook reports hosted migrations through 038 plus the timestamped initial schema.
That is a repository-recorded operational claim, not independently verified during this doc
update. Local source, remote migration history, function deployment, webhook delivery and
device verification are separate states. See [LAUNCH-RUNBOOK.md](LAUNCH-RUNBOOK.md).

### Status snapshot (early Nov 2026)

An older snapshot, written before migration 031 was applied and before most of the Cutouts
overhaul landed.

| Area | Status |
|---|---|
| Mobile core loop | ✅ **Instant:** submit → server geofence verifies → XP/streak/code in the celebration, seconds after the real-world act (migrations 016–017) |
| Geofence system | ✅ **Four types shipped:** none / circle / city / drawn polygon — server-enforced at insert (013–015); **real Victoria municipal boundary live** (022) |
| Admin geofence drawing | ✅ Draw mode in quest create + edit (click-to-draw, drag vertices, midpoints, validation) |
| UGC moderation (Apple 1.2) | ✅ **Shipped:** report + block + feed privacy opt-out + admin moderation queue with GPS evidence and XP revocation (migration 018) |
| Badge system | ✅ **Admin-configurable:** badge CRUD with metadata/rarity/art, data-driven unlock rules, per-badge thresholds via raw-metric evaluator (migrations 019–021) |
| Account deletion (Apple 5.1.1(v)) | ✅ `delete_own_account()` RPC (023) + Settings → Danger Zone flow — **apply 023 live** |
| Mobile profile & settings | ✅ Profile, edit profile, avatar upload, feed-privacy toggle, account deletion, legal screens |
| Admin operations | ✅ Completions log + moderation queue + quest management + badge management; every server action checks the admin allowlist itself (#10); **live at kuest-admin.vercel.app** with env vars set |
| Engagement plumbing | ⚠️ Removal push shipped + tap listeners mounted; social inbox live (029) but `send-social-push` **not deployed** and no webhook, so comment/follow pushes don't send. Monday-drop enqueue and `send-push-outbox` are written (034) and **not deployed** (runbook Step 0c). Streak pushes are not built. |
| Analytics & crash reporting | ✅ **SDKs wired** — PostHog (`lib/analytics.ts`, ~16 events) + Sentry; keys + 4 dashboards pending ([Spec 04](docs/specs/04-analytics-instrumentation.md), runbook 2–3) |
| Store assets | ✅ Real brand-mark icon / adaptive icon / splash (generated via `scripts/gen-app-icons.js`) |
| Sponsor / B2B loop | ⚠️ Codes auto-issue (017). Merchant validation is in the repo ([Spec 07](docs/specs/07-merchant-redemption.md), migration 036 local) and has not been applied or tried live. |
| Content pipeline | 🔄 Weekly drops + suggestion queue implemented on this branch (migrations 034–035, local only; Monday push not deployed). Chains still deferred. ([Spec 05](docs/specs/05-community-quests.md)) |
| Growth loop | ❌ Zero acquisition features ([Spec 06](docs/specs/06-growth-engagement.md)) |
| Production readiness | ⚠️ CI + tests green (159 mobile + 50 geofence); EAS project ID set; admin live on Vercel; **remaining blockers are ops** (runbook) |
| Visual design | 🔄 **Cutouts** direction approved Nov 7 ([BRAND.md](docs/design/BRAND.md)); core app, brand surfaces, admin restyle and cutout upload implemented on current branch; assets, device validation and residual polish remain ([UI-OVERHAUL-PLAN.md](docs/design/UI-OVERHAUL-PLAN.md)) |
| Rank deltas | ⚠️ `last_week_rank` never populated: the snapshot edge function was never scheduled. Fixed in SQL + pg_cron by migration 031 (apply pending) |

**Highest-impact blockers before real users** (step-by-step: [LAUNCH-RUNBOOK.md](LAUNCH-RUNBOOK.md)):

1. **iOS App Store submit credentials** — `eas.json` still has `REPLACE_WITH_*` placeholders
2. **PostHog + Sentry keys** — SDKs are wired but emit nothing until `EXPO_PUBLIC_POSTHOG_KEY` / `EXPO_PUBLIC_SENTRY_DSN` are set; build the 4 Spec 04 dashboards in PostHog
3. **Apply migration `031`** — `npx supabase db push --remote --include-all` (001 to 030 are live)
4. **Deploy `send-social-push`** + notifications webhook (runbook Step 0b)
5. ~~Merge the review stack~~ — done: #9 (Next 15 + demo-login gate), #10 (admin/RPC hardening), #11 (design docs), #12 (Cutouts Phase 1)

Done since July: migration 023 and 027 to 030 applied live; `ADMIN_ALLOWED_EMAILS` and all admin env vars set on Vercel; admin production deploy live.

### What was implemented (July 2026 snapshot)

#### Mobile App (`apps/mobile`)

| Feature | Notes |
|---|---|
| Email/password auth | Sign up, sign in, sign out; profile auto-created on sign up |
| Onboarding (3 screens) | First-launch intro, city pick (Victoria pilot), sign-up/sign-in CTA |
| **Explore tab** | Hero-image quest cards, player XP card, category filters |
| **Quests tab (feed)** | Map preview + public activity feed from approved completions |
| **Rankings tab** | Navy hero, podium top 3, featured badges, chasers list |
| **Badges tab** | Badge collection grid with lock/earned states |
| Quest detail | Full info, category colors, geofence label (all 4 types), start/submit CTA |
| Quest submission | In-app camera proof, GPS + client geofence pre-check, Supabase Storage upload; **server-side geofence trigger is the authority** |
| **Geofence support** | All 4 types checked client-side via `@quest/geofence` (incl. polygon w/ GPS-accuracy edge buffer); polygon zones rendered on map |
| **Instant verification** | Completion auto-approved at insert; celebration shows **real** total XP, level-up moment, updated streak, and redemption code (`lib/celebration.ts`) — no pending state anywhere |
| **Report & block** | ⋯ menu on feed posts → `ReportPostSheet` (5 reasons, rate-limited in-DB); block user hides their posts (`useBlockedUsers`) |
| **Feed privacy** | `feed_public` toggle in Settings — complete quests without publishing to the feed (enforced by 018 RLS) |
| **Account deletion** | Settings → Danger Zone → destructive confirm → `delete_own_account()` RPC → local sign-out (App Store 5.1.1(v)) |
| **Analytics** | `lib/analytics.ts` + `AnalyticsProvider` — ~16 typed events across onboarding/quest/feed/leaderboard/streak/redemption; no-op without key; opt-out support |
| **Crash reporting** | `lib/sentry.ts` — production-only init, 20% traces sample |
| Push tap navigation | `mountPushListeners` in `_layout.tsx` routes notification taps |
| Map view | Full-screen map; circle radii, city boundary, and drawn polygon zones rendered |
| User profile | Navy hero, stats grid, recent activity, settings/edit links |
| Edit profile / avatar | Username + city + avatar upload |
| Settings, legal screens | Push toggle, digest pref, feed privacy, account deletion, privacy (incl. analytics section), terms |
| XP & level system | 10 levels, 0–15k XP; DB trigger on approval |
| Push token registration | Permission, Expo token, cleared on sign out |
| Root error boundary | On-brand fallback + Try Again |
| 5-tab navigation | Animated pill tab bar |
| Design system | **Harbour Electric** — `DESIGN.md` + `lib/constants.ts`; real brand-mark app icons |

#### Admin Dashboard (`apps/admin`)

| Feature | Notes |
|---|---|
| Session auth + email allowlist | `ADMIN_ALLOWED_EMAILS`; service role server-only |
| Dashboard stats | Users, completions, **flagged count**, active quests |
| **Completions log** | Read-only recent-completions view with spot-check **Remove** (approval queue deleted) |
| **Moderation queue** | `/moderation` — flagged posts with photo, reports by reason, **GPS-vs-fence evidence** (`get_completion_geofence_evidence`); actions: dismiss / remove (revokes XP + owner push) / remove-and-allow-retry |
| Quest management | List, **create, edit**, toggle active/inactive |
| **GeofenceEditor** | 4 modes: Anywhere / Radius (slider + presets) / Victoria / **✏️ Draw** (click-to-draw polygon, drag vertices, midpoint insertion, right-click delete, live area + validation, centroid autofill) |
| Quest covers + badge linking | Cover upload, quest_badges junction |
| **Badge management** | Badge CRUD (`BadgeForm`) — name/description/locked hint, rarity, art style/key, emoji fallback, icon upload, sort order, **data-driven unlock rules** (13 rule types with per-badge config, migrations 019–021) |
| Users table | XP-sorted, ISR 60s |
| Sponsors view | Per-sponsor issued / redeemed / rate / last redemption, CSV columns, and a merchant link (036 local) |

#### Database & Backend (`supabase/`)

| Feature | Notes |
|---|---|
| PostgreSQL schema | Tables + views, RLS on core tables |
| **Geofence system (013–015)** | PostGIS; `geofence_type` enum (none/circle/city/**polygon**); `cities` boundary table; `quests.boundary` + generated `boundary_geojson`; `set_quest_boundary()` validated write path (3–100 vertices, 400 m²–250 km², self-intersection repair); `check_completion_geofence()` enforced by BEFORE INSERT trigger — **no client can submit outside the zone** |
| **Instant verification (016–017)** | `normalize_completion_on_insert()` — rate limits (2/10 min, 10/24 h) → auto-approve → in-DB redemption code for sponsored quests; `apply_completion_rewards()` on the insert path (XP + level + streak); `revoke_completion_rewards()` on removal; legacy pending rows backfilled |
| **Moderation (018)** | `completion_reports` (immutable, one per user per post, can't report own, 10/day limit), `blocked_users`, `profiles.feed_public`, auto-hide at 3 distinct reporters, feed RLS excludes hidden + opted-out, `get_completion_geofence_evidence()` for admin; report-count trigger fires on DELETE too (023) so cascades can't leave phantom counts |
| **Admin badge system (019–021)** | Expanded badge set; badge metadata columns + icon storage; `evaluate_badge_unlock()` data-driven evaluator — 021 precomputes raw per-user metrics (streaks, busiest day/weekend, local hours, rank, first-on-quest) so every badge honours its own thresholds independently |
| **Victoria boundary (022)** | Official municipal polygon replaces 013's placeholder bounding box — **applied to live DB Jul 6** |
| **Account deletion (023)** | `delete_own_account()` security-definer RPC: deletes caller's storage objects + `auth.users` row; FK cascades remove all game data — **pending live apply** |
| Quest scheduling (012) | `active_from` / `active_until` — the schema behind Spec 05's weekly drops |
| Rank snapshot (011) | `last_week_rank` for rank delta |
| Migrations 001–023 | Documented in `supabase/migrations/README.md`; remote history repaired + synced through 022 (Jul 6) |
| Seed data | 20 Victoria quests + 5 sponsored + 4 geofence examples (incl. polygon) + 13 badges |
| Edge functions | `snapshot-ranks` active; `award-xp` removed; `generate-redemption-code` **retired** — absorbed into 017 DB triggers |
| Shared package | `@quest/geofence` — haversine, point-in-polygon, polygon area/centroid/edge-distance/validation, labels; 44 tests |

#### Tests & Infrastructure

| Area | Status |
|---|---|
| Geofence package tests | ✅ 44 assertions (`packages/geofence`) |
| Mobile logic tests | ✅ 139 assertions (incl. celebration/level-up + moderation logic); `npm test` |
| CI | ✅ `.github/workflows/ci.yml` — logic tests + `tsc` both apps |
| EAS build profiles + project ID | ✅ Set |
| EAS submit (iOS) | ❌ Apple ID / ASC / team placeholders in `eas.json` |
| EAS submit (Android) | ⚠️ Expects `./google-service-account.json` (not in repo) |
| Crash reporting (Sentry) | ✅ SDK wired — set `EXPO_PUBLIC_SENTRY_DSN` in prod builds |
| Analytics | ✅ PostHog wrapper + event schema (Spec 04) |

### Known gaps (July–Nov 2026 snapshot)

| Gap | Severity | Impact | Fix |
|---|---|---|---|
| **iOS submit credentials not configured** | 🔴 Critical (ship) | Blocks TestFlight / App Store | Ops: fill `eas.json` (runbook step 1) |
| **PostHog/Sentry keys unset** | 🔴 Critical (learning) | SDKs wired but no events/crashes recorded; dashboards unbuilt | Runbook steps 2–3 |
| **Migration 031 not applied** | 🟠 High | No rank deltas; leaderboard week resets Sunday afternoon Pacific instead of midnight | `db push --remote` (runbook step 0) |
| **Social push not deployed** | 🟠 High (engagement) | Comment/reply/follow pushes never send; inbox only | Runbook step 0b |
| **Proof photos are public by URL** | 🟠 High (privacy) | `proof-photos` bucket is public, so files stay reachable after a post is hidden or opted out; matters more once selfies ship | Private bucket + signed URLs (UI-OVERHAUL-PLAN Phase 2, step 7) |
| **Retired edge functions still deployed** | 🟡 Medium | `award-xp`, `generate-redemption-code` (service-role only, dead code) | Delete (runbook step 6) |
| **Streak weeks use UTC** | 🟡 Medium | `apply_completion_rewards` computes ISO weeks in UTC; a Sunday-evening quest counts toward the next week | Align to `America/Vancouver` like the leaderboard (031) |
| **Content treadmill (~29 quests)** | 🟠 High (retention) | Engaged players exhaust content in weeks | Spec 05 |
| **Merchant redemption not live yet** | 🟠 High (revenue) | The counter page is in the repo; renewal numbers wait on applying 036 and a real redemption | Spec 07 |
| **No acquisition features** | 🟠 High (growth) | Word-of-mouth unassisted | Spec 06 (duo quests, recap card) |
| **Mock-location / bypass release checks** | 🟠 High (integrity) | Gate is now unattended | Verify Android `mocked` block + `bypassGeofence` stripped in release builds (Spec 02 §6) |
| **Sponsored quest E2E untested** | 🟡 Medium | Codes auto-issue (017) but full loop unverified on a device | With Spec 07 |
| **Offline submission failure** | 🟡 Medium | Bad signal at trail/breakwater loses the moment | Spec 06 §5 queue |
| **Season Veteran badge** | 🟢 Low | Needs seasons table | Deferred |
| **In-app quest search** | 🟢 Low | Category filter only | Deferred |

#### Resolved since prior roadmap (July 2026)

| Was listed as gap | Now |
|---|---|
| Apple 1.2: no report/block/moderation | ✅ Migration 018 + `ReportPostSheet` + `/moderation` + `blocked_users` |
| Approval latency (retention killer) | ✅ Migrations 016–017 — instant verification, rewards on insert |
| Feed privacy opt-out missing | ✅ `profiles.feed_public` + Settings toggle + 018 RLS |
| Streak celebration showed stale count | ✅ Celebration reads post-reward profile (`lib/celebration.ts`) |
| Duplicate completion dead-end after rejection | ✅ Rejection no longer exists pre-award; moderation offers "remove + allow retry" |
| Redemption not wired E2E | ✅ Codes auto-issued in-DB at verification for sponsored quests |
| Placeholder Victoria city boundary | ✅ Migration `022` applied to live DB Jul 6 — official municipal polygon |
| Push tap navigation unmounted | ✅ `mountPushListeners` mounted in `_layout.tsx` |
| No crash reporting | ✅ Sentry SDK wired (production-only; DSN via EAS secret) |
| No in-app account deletion (App Store 5.1.1(v)) | ✅ Migration `023` `delete_own_account()` RPC + Settings → Danger Zone flow (apply 023 live) |
| Placeholder 1×1 app icons | ✅ Brand-mark icon/adaptive-icon/splash generated (`scripts/gen-app-icons.js`), wired in `app.json` |
| Migration 023 + 027–029 not applied live | ✅ Applied (Nov 2026) |
| `ADMIN_ALLOWED_EMAILS` unset in prod | ✅ Set with all admin env vars; production deployed Nov 7 |
| Any signed-in user could call `apply_completion_rewards` over RPC (unlimited XP) | ✅ Migration 030, applied live and verified Nov 7 |
| Admin server actions trusted middleware alone | ✅ `requireAdmin()` in every action (#10) |
| Release builds shipped a demo login with hardcoded credentials | ✅ Gated to `__DEV__` (#9) |
| Android tab bar blur hazed the whole screen | ✅ Blur removed on Android (#12) |

---

## Changelog

| Date | Change |
|---|---|
| Nov 25, 2026 | **Doc truth sweep (build 3 card K1).** New current-status table covering build 1 (R, Q, S, V, C, E4, P, F, E1, E2, E5 merged; raw tokens 0), build 2 (M1–M4 merged with green CI; Z and M5 in progress), 041–044 locally tested on the CI local stack and not applied, 045 held on `cursor/d-duo`, and `main` still behind (PR #15 open). Roadmap items now carry their build 3 card IDs. Priority matrix and tech debt status cells updated. The older status tables moved under History. |
| Nov 7, 2026 | **Audit, security and design.** Found any signed-in user could call `apply_completion_rewards` over RPC; migration `030` revokes it plus locks GPS evidence to the service role (applied live). Admin server actions now call `requireAdmin()`. Demo login gated to dev builds. Migration `031` (ready): weekly rank snapshot in SQL on pg_cron (the edge function never ran), leaderboard week in `America/Vancouver`, trimmed RPC surface, FK indexes, RLS `auth.uid()` once per query; `snapshot-ranks` edge function removed. Admin env vars set on Vercel and production deployed (builds had failed since Aug 10). New **Cutouts** design direction and 7-phase overhaul plan; Phase 1 foundations built (tokens, Figtree, copy pass, 159 tests). Docs updated: runbook (correct Vercel var names, `--remote`), migrations index, specs index, architecture, README, product. |
| Oct 1, 2026 (2) | **Social rate limits + Activity inbox.** Migration `029`: per-user rate limits on comments (10/10 min, 100/day), likes (120/h), follows (60/h, 200/day) with client copy; `notifications` table fed by triggers (like → owner, comment → owner, reply → parent author, follow → followed user), deduped so re-like / re-follow never stack, hidden for blocked pairs and hidden/removed comments; `profiles.push_social`. Edge fn `send-social-push` (Database Webhook on insert) pushes comments, replies and follows — likes inbox-only — with a 5-per-10-min burst cap and dead-token cleanup. Mobile: Activity screen (`/notifications`), bell with unread badge on Explore + Feed, push taps deep-link to the completion / profile, Settings → "Comments & Followers" push toggle; comment failures now alert instead of blanking the thread. **Runbook Step 0b.** |
| Oct 1, 2026 | **Comment moderation (Apple 1.2 for the 027 social layer).** Migration `028`: `comment_reports` (5 comment-specific reasons, one per user per comment, can't report own, 10/day budget shared with post reports), auto-hide at 3 distinct reporters, admin soft-removal via `removed_at`; clients restricted to updating comment `body` (027 let authors un-hide their own comments). Mobile: Report on others' comments in `CommentsSheet` (reported comments vanish for the reporter; authors see "hidden while under review"); `ReportPostSheet` made reusable. Admin: Comments section in `/moderation` (dismiss / remove) + flagged count includes comments. **Blocking:** 028 also makes the completions read policy block-aware both ways (a blocked user could previously still open the blocker's grid/completions); profile ⋯ menu with Block/Unblock + blocked state; new Settings → Blocked accounts screen (the feed's "unblock later in Settings" promise had no screen behind it). **Store config:** removed `REPLACE_WITH_*` PostHog/Sentry placeholders from `eas.json` (its `env` overrides EAS env vars, so they would have shadowed the real keys set per the runbook); `lib/publicKey.ts` ignores placeholder values. Tests 119 mobile. **Apply 027 + 028 live.** |
| Jul 7, 2026 | **Roadmap refresh.** Stage advanced to Store-Ready Code → ops checklist; all remaining launch blockers are operations (runbook steps). Migration numbering drift fixed doc-wide (016–017 instant verification, 018 moderation — matching real files); shipped-but-undocumented **admin badge system (019–021)** now recorded across snapshot/implemented/architecture sections. New **Recommendations & Future Candidates** section: R1–R7 (TestFlight cohort, photo pre-screen auto-triage, OTA-first iteration, TanStack Query before Phase E, generated DB types, README/ARCHITECTURE sync, replay-off policy) and C1–C6 (streak freeze, save-for-later, quest-log map, flash quests, leagues, merchant QR); strongest candidates added to the priority matrix as P2/P3. |
| Jul 6, 2026 (2) | **Store-readiness sweep.** Account deletion shipped (migration `023` `delete_own_account()` RPC + Settings Danger Zone flow with destructive confirm + local sign-out; report-count trigger extended to DELETE so cascades can't leave phantom counts). Real app icons: `scripts/gen-app-icons.js` renders the Q! brand mark → icon/adaptive-icon/splash; `app.json` gains adaptive icon, alpha-correct notification icon, navy splash. Migration history repaired + `022` (real Victoria boundary) applied to live DB via CLI. `LAUNCH-RUNBOOK.md` added — step-by-step owner guide for Apple creds, PostHog, Sentry, Vercel env, release spot-checks. Tests 105+44 green, tsc clean both apps. |
| Jul 6, 2026 | **Pre-launch hardening + analytics.** PostHog wrapper (`lib/analytics.ts`) + ~15 events wired; Sentry SDK; push tap listeners mounted; removal push includes navigation payload; migration `022` real Victoria boundary; privacy policy analytics section. Remaining: PostHog dashboards (manual), iOS submit creds, live migration apply, `ADMIN_ALLOWED_EMAILS`. |
| Jul 5, 2026 | **Instant verification era shipped (Phases B+C).** Migration 016: auto-approve on insert, rewards on insert path, in-DB redemption codes, rate limits, `removed` status + XP revocation, pending backfill. Migration 017: reports (reasons, rate limits, auto-hide at 3), `blocked_users`, `feed_public` privacy opt-out, feed RLS, GPS-evidence RPC. Mobile: pending UI deleted, real-XP celebration, `ReportPostSheet`, block user, settings privacy toggle. Admin: approval queue → completions log, `/moderation` queue with dismiss/remove/remove-and-retry, flagged dashboard stat, owner removal push. Edge fns `award-xp` + `generate-redemption-code` retired. Tests 105 mobile + 44 geofence, tsc clean. Remaining before launch: analytics (Spec 04), store creds, live migration apply. |
| Jul 4, 2026 | **Strategic reframe + spec set.** Docs/specs 01–07 authored. Phase A (geofence drawing: migrations 014–015, admin draw UI, mobile polygon support, 44 package tests) shipped. Roadmap restructured around instant verification (removes approval queue), reports/moderation (Apple 1.2 + block + privacy opt-out), analytics instrumentation, content engine (community quests, weekly drops, chains), growth loop (duo quests, recap card, XP events, starter quest, offline queue), and merchant redemption validation. Multi-city, sponsor portal, and follow graph explicitly deferred. |
| Jun 21, 2026 | Figma UI reimagining shipped: 5-tab nav, Harbour Electric design system, hero quest cards, activity feed, podium rankings, badges tab, profile simplification. Migration `008` for feed RLS. |
| Jun 21, 2026 | Code audit: CI + npm test marked done; avatar upload, streak DB/profile, redemption admin wiring verified; legal screens shipped. |
| Jun 19, 2026 | Full re-audit after profile work + Quest! rebrand. |
| Jun 18, 2026 | Full rewrite after codebase audit; badge alignment (`005`); Phase 0 hardening progress. |

---

*Update this document when a phase item ships or when audit reveals drift.*
