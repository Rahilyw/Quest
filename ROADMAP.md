# Quest! — Product Roadmap

**Last updated:** July 7, 2026
**Stage:** **Store-Ready Code** → Ops Checklist ([LAUNCH-RUNBOOK.md](LAUNCH-RUNBOOK.md)) → TestFlight

All launch-blocking *code* is shipped: instant verification, moderation, analytics + crash reporting SDKs, account deletion (App Store 5.1.1(v)), real app icons, real Victoria boundary. What remains before real users is **operations, not engineering** — Apple credentials, PostHog/Sentry keys, one `db push`, and Vercel env vars; every step is written up in the runbook.

Completions are verified by the server-side geofence at the moment of submission (migrations 013–017); XP, level, streak, and sponsored redemption codes land before the celebration modal renders. Community reports, block-user, feed privacy, and an admin moderation queue (migration 018) replace pre-approval review — satisfying Apple Guideline 1.2. Badges are now fully admin-configurable with per-badge thresholds (migrations 019–021). The full spec set lives in [`docs/specs/`](docs/specs/README.md).

> **Migration numbering note (fixed Jul 7):** earlier revisions of this doc said 016 = instant verification and 017 = moderation. The actual files are `016_completion_status_removed` + `017_instant_verification` and `018_completion_reports`. This doc now uses the real file numbers; `supabase/migrations/README.md` is the source of truth.

**The strategy in one sentence:** automate approval so XP is instant, make the community generate the content, instrument everything, and ship the UGC moderation Apple will demand.

---

## Snapshot

| Area | Status |
|---|---|
| Mobile core loop | ✅ **Instant:** submit → server geofence verifies → XP/streak/code in the celebration, seconds after the real-world act (migrations 016–017) |
| Geofence system | ✅ **Four types shipped:** none / circle / city / drawn polygon — server-enforced at insert (013–015); **real Victoria municipal boundary live** (022) |
| Admin geofence drawing | ✅ Draw mode in quest create + edit (click-to-draw, drag vertices, midpoints, validation) |
| UGC moderation (Apple 1.2) | ✅ **Shipped:** report + block + feed privacy opt-out + admin moderation queue with GPS evidence and XP revocation (migration 018) |
| Badge system | ✅ **Admin-configurable:** badge CRUD with metadata/rarity/art, data-driven unlock rules, per-badge thresholds via raw-metric evaluator (migrations 019–021) |
| Account deletion (Apple 5.1.1(v)) | ✅ `delete_own_account()` RPC (023) + Settings → Danger Zone flow — **apply 023 live** |
| Mobile profile & settings | ✅ Profile, edit profile, avatar upload, feed-privacy toggle, account deletion, legal screens |
| Admin operations | ✅ Completions log + moderation queue + quest management + badge management (set `ADMIN_ALLOWED_EMAILS` before prod deploy) |
| Engagement plumbing | ⚠️ Removal push shipped + tap listeners mounted; new-quest/streak/Monday-drop pushes not built |
| Analytics & crash reporting | ✅ **SDKs wired** — PostHog (`lib/analytics.ts`, ~16 events) + Sentry; keys + 4 dashboards pending ([Spec 04](docs/specs/04-analytics-instrumentation.md), runbook 2–3) |
| Store assets | ✅ Real brand-mark icon / adaptive icon / splash (generated via `scripts/gen-app-icons.js`) |
| Sponsor / B2B loop | ⚠️ Codes now auto-issued in-DB (017) but merchants can't validate them ([Spec 07](docs/specs/07-merchant-redemption.md)) |
| Content pipeline | ❌ ~29 seeded quests, no refresh cadence or community input ([Spec 05](docs/specs/05-community-quests.md)) |
| Growth loop | ❌ Zero acquisition features ([Spec 06](docs/specs/06-growth-engagement.md)) |
| Production readiness | ⚠️ CI + tests green (105 mobile + 44 geofence); EAS project ID set; **remaining blockers are all ops** (runbook) |

**Highest-impact blockers before real users** (step-by-step: [LAUNCH-RUNBOOK.md](LAUNCH-RUNBOOK.md)):

1. **iOS App Store submit credentials** — `eas.json` still has `REPLACE_WITH_*` placeholders
2. **Apply migration `023` (account deletion) on live Supabase** — `npx supabase db push` (022 applied Jul 6; history repaired and synced through 022)
3. **PostHog + Sentry keys** — SDKs are wired but emit nothing until `EXPO_PUBLIC_POSTHOG_KEY` / `EXPO_PUBLIC_SENTRY_DSN` are set; build the 4 Spec 04 dashboards in PostHog
4. **`ADMIN_ALLOWED_EMAILS`** must be set in production (Vercel)

---

## Strategic Direction (July 2026)

Four findings reframed the roadmap — none were on any earlier list. Two are now fixed:

1. **Approval latency is reward latency.** ✅ **Fixed.** Geofence pass **is** the proof; completions auto-approve at insert with rewards applied before the celebration renders; rate limits + in-app-camera-only + mock-location block guard the gate. → Specs 01 ✅ / 02 ✅ / 03 ✅
2. **The feed is UGC.** ✅ **Fixed.** Report on every post, block-user, feed privacy opt-out (`feed_public`), auto-hide at 3 independent reports, admin moderation with GPS evidence, removal revokes XP. → Spec 03 ✅
3. **Unmeasured success metrics.** ✅ **Wired.** PostHog + ~16-event schema shipped through the mobile app; Sentry alongside. Remaining: set the production keys and build the 4 dashboards in PostHog (runbook). → Spec 04
4. **The content treadmill.** ❌ ~29 quests ≈ 4–6 weeks of engaged play, then churn. Fix: community-suggested quests with credit + a Monday drop / Sunday expiry ritual + quest chains. → Spec 05

Plus: duo quests as the referral loop (word-of-mouth **is** the distribution strategy in a 90k city), the Sunday recap share card as the organic marketing engine, merchant redemption validation as the sponsor-renewal proof, and XP economy events as cheap retention levers. → Specs 06 / 07

**Deliberately deferred:** multi-city, self-serve sponsor portal, follow/friend graph, feed likes/comments. One city with a shared leaderboard and public feed has all the social density the pilot needs; friends/follows would fragment a small community.

---

## What's Fully Implemented

### Mobile App (`apps/mobile`)

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

### Admin Dashboard (`apps/admin`)

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
| Sponsors view | Per-sponsor completion metrics (redemption validation is Spec 07) |

### Database & Backend (`supabase/`)

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
| Edge functions | `snapshot-ranks` active; `award-xp` + `generate-redemption-code` **retired** — absorbed into 017 DB triggers (folders kept for reference) |
| Shared package | `@quest/geofence` — haversine, point-in-polygon, polygon area/centroid/edge-distance/validation, labels; 44 tests |

### Tests & Infrastructure

| Area | Status |
|---|---|
| Geofence package tests | ✅ 44 assertions (`packages/geofence`) |
| Mobile logic tests | ✅ 105 assertions (incl. celebration/level-up + moderation logic); `npm test` |
| CI | ✅ `.github/workflows/ci.yml` — logic tests + `tsc` both apps |
| EAS build profiles + project ID | ✅ Set |
| EAS submit (iOS) | ❌ Apple ID / ASC / team placeholders in `eas.json` |
| EAS submit (Android) | ⚠️ Expects `./google-service-account.json` (not in repo) |
| Crash reporting (Sentry) | ✅ SDK wired — set `EXPO_PUBLIC_SENTRY_DSN` in prod builds |
| Analytics | ✅ PostHog wrapper + event schema (Spec 04) |

---

## Known Gaps

| Gap | Severity | Impact | Fix |
|---|---|---|---|
| **iOS submit credentials not configured** | 🔴 Critical (ship) | Blocks TestFlight / App Store | Ops: fill `eas.json` (runbook step 1) |
| **Migration 023 not applied on live DB** | 🔴 Critical (ops) | Account deletion RPC missing → App Store 5.1.1(v) fails at review | `npx supabase db push` (runbook step 0) |
| **PostHog/Sentry keys unset** | 🔴 Critical (learning) | SDKs wired but no events/crashes recorded; dashboards unbuilt | Runbook steps 2–3 |
| **`ADMIN_ALLOWED_EMAILS` unset in prod** | 🔴 Critical (ops) | All admin logins denied | Set on Vercel deploy (runbook step 4) |
| **Content treadmill (~29 quests)** | 🟠 High (retention) | Engaged players exhaust content in weeks | Spec 05 |
| **Merchant can't validate redemption codes** | 🟠 High (revenue) | No proof of value for sponsor renewals | Spec 07 (`redeemed_at` already in 017) |
| **No acquisition features** | 🟠 High (growth) | Word-of-mouth unassisted | Spec 06 (duo quests, recap card) |
| **Mock-location / bypass release checks** | 🟠 High (integrity) | Gate is now unattended | Verify Android `mocked` block + `bypassGeofence` stripped in release builds (Spec 02 §6) |
| **Sponsored quest E2E untested** | 🟡 Medium | Codes auto-issue (017) but full loop unverified on a device | With Spec 07 |
| **Offline submission failure** | 🟡 Medium | Bad signal at trail/breakwater loses the moment | Spec 06 §5 queue |
| **Season Veteran badge** | 🟢 Low | Needs seasons table | Deferred |
| **In-app quest search** | 🟢 Low | Category filter only | Deferred |

### Resolved since prior roadmap (July 2026)

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

---

## Roadmap

Status key: ✅ Done · ⚠️ Partial · ❌ Not started

### Phase 0 — Launch Hardening (ongoing)

| # | Task | Status | Notes |
|---|---|---|---|
| 0.1 | Admin role allowlist | ✅ | Set `ADMIN_ALLOWED_EMAILS` in prod |
| 0.2 | Service role server-side only | ✅ | |
| 0.3 | Badge unlock aligned (12/13) | ⚠️ | Confirm `005` applied live |
| 0.4 | EAS first real build + iOS submit creds | ⚠️ | Project ID done; creds are placeholders |
| 0.5 | Sentry / crash reporting | ✅ | Set `EXPO_PUBLIC_SENTRY_DSN` in EAS env |
| 0.6 | CI pipeline | ✅ | |
| 0.7 | Mount push tap listeners | ✅ | `lib/push-navigation.ts` mounted in `_layout.tsx` |
| 0.8 | Real Victoria boundary polygon | ✅ | Migration `022` + updated `seeds/victoria-bc-boundary.geojson` |
| 0.9 | Migration/env-var doc cleanup | ⚠️ | Migrations README covers 001–023; env drift remains |
| 0.10 | Account deletion (App Store 5.1.1(v)) | ✅ | Migration `023` RPC + Settings Danger Zone flow; **apply 023 live** |
| 0.11 | Real app icons + adaptive icon + splash | ✅ | Generated brand mark; `app.json` wired (adaptive icon, notification icon, navy splash) |

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
| D.2 | ~15-event schema wired through mobile | ✅ |
| D.3 | 4 dashboards: activation funnel, WAU retention post-first-quest, week-2 leaderboard return, per-quest content conversion | ⚠️ Build in PostHog UI (runbook step 2) |
| D.4 | Privacy policy analytics line | ✅ |

### Phase E — Content Engine ([Spec 05](docs/specs/05-community-quests.md)) — POST-LAUNCH WEEKS 1–4

| # | Task | Status |
|---|---|---|
| E.1 | Weekly drop ritual: "New this week" section, "Ends Sunday" chips, Monday drop push, admin scheduling presets (uses shipped migration 012) | ❌ |
| E.2 | Community quest suggestions: table + mobile form + admin curation queue + "Quest by @username" credit + suggester XP + City Author badge | ❌ |
| E.3 | Quest chains: chains tables, progress UI, chain bonus + badge, admin chain builder | ❌ |

### Phase F — Growth & Engagement ([Spec 06](docs/specs/06-growth-engagement.md)) — POST-LAUNCH WEEKS 2–8

| # | Task | Status |
|---|---|---|
| F.1 | First-quest onboarding: `is_starter` quest pinned post-signup; time-to-first-XP < 5 min | ❌ |
| F.2 | Sunday recap share card (view-shot + native share) + Sunday push | ❌ |
| F.3 | XP economy events: `xp_events` table, double-XP weekends, first-finisher bonus, lapsed-player win-back | ❌ |
| F.4 | Offline submission queue with retry | ❌ |
| F.5 | Duo quests: `min_party_size`, party codes/QR, duo bonus, referral kicker + Recruiter badge, duo seed quests | ❌ |

### Phase G — Sponsor Loop ([Spec 07](docs/specs/07-merchant-redemption.md)) — BEFORE SPONSOR RENEWALS

| # | Task | Status |
|---|---|---|
| G.1 | `sponsors` table + `redeemed_at`; merchant page `/redeem/[merchantKey]` (valid/used/invalid + mark redeemed) | ❌ |
| G.2 | Sponsor reporting: issued / redeemed / rate / last redemption + CSV columns | ❌ |
| G.3 | Sponsored seed rows + sponsor fields in admin create form + E2E test | ❌ |
| G.4 | Player-side redeemed state + "show at counter" framing | ❌ |

### Deferred (deliberate)

| Item | Why deferred |
|---|---|
| Multi-city support | Pilot must prove one city first |
| Self-serve sponsor portal | Manual sponsor ops fine at pilot scale; Spec 07 provides the proof-of-value first |
| Follow/friend graph, feed likes/comments | Fragments a small community; city-wide feed + leaderboard is the social layer for now |
| AI photo-content verification | Post-moderation covers it; the lighter **photo pre-screen auto-triage** (R2 below) is the first step if report volume demands |
| Season Veteran badge / seasons table | With a future seasons feature |
| iOS/Android widgets | Post-retention-mechanics |

---

## Recommendations & Future Candidates (July 7, 2026 review)

Findings from a full codebase + docs review. **R-items** are process/tooling recommendations; **C-items** are feature candidates that respect the existing deferrals (no multi-city, no follow graph, no likes/comments).

### Process & tooling (R)

| # | Recommendation | Why | When |
|---|---|---|---|
| R1 | **Closed TestFlight cohort (10–20 Victoria locals) before public launch** — *after* PostHog keys are live | First impressions in a 90k word-of-mouth city are spent once; burning them with zero data captured is the exact failure Spec 04 exists to prevent | First TestFlight build |
| R2 | **Photo pre-screen auto-triage** — NSFW/SafeSearch check (AWS Rekognition or Google Vision) on proof-photo upload that *auto-flags* into the existing moderation queue (a synthetic "reporter"), never auto-rejects | Strengthens the Apple 1.2 story beyond report-and-review; the moderation queue already has the review UX, so this is glue, not a system | If report volume grows, or pre-emptively before public launch (~1 day) |
| R3 | **EAS Update (OTA) as the primary pilot iteration channel** | Ship fixes without store-review latency during the pilot's learning weeks; `runtimeVersion: appVersion` is already configured | From first TestFlight build |
| R4 | **Adopt TanStack Query before Phase E** | Hooks currently re-fetch on every mount; content surfaces multiply in Phase E (drops, suggestions, chains) and retrofitting later costs more | Phase E kickoff |
| R5 | **`supabase gen types` replacing hand-maintained `lib/types.ts`** | The badge system (019–021) is exactly the kind of schema change where manual types silently drift | Phase 0.9 |
| R6 | **Sync ARCHITECTURE.md + root README.md to real migration numbers** (016–023) and the shipped badge/account-deletion/analytics work | Same drift this doc had until Jul 7; a wrong number near `db push` is an ops hazard | Phase 0.9 |
| R7 | **PostHog session replay stays off** | Proof photos are real people; replay would capture them | Standing policy |

### Feature candidates (C) — post-launch, in rough priority order

| # | Candidate | Fit | Effort | When to consider |
|---|---|---|---|---|
| C1 | **Streak insurance / freeze** — one per month, *earned* (e.g. complete 5 quests), auto-consumed on a missed week | Weekly streaks are the core retention loop and Victoria has weather; an earned freeze doesn't violate "earned, not given" | Low | With F.3 XP economy events |
| C2 | **Quest save-for-later / wishlist** — bookmark on quest cards, "Saved" filter on Explore | Near-zero effort; gives Explore a return-visit reason; saved-but-never-completed is a high-signal analytics segment for quest friction | Low | Any time post-launch |
| C3 | **Personal quest-log map** — profile map of everywhere you've completed quests ("my city, conquered") | Natural visual for the F.2 Sunday recap card — build them together; deepens the local-identity principle | Medium | With F.2 |
| C4 | **Flash quests** — time-boxed (e.g. 3-hour Saturday-market window) quests with a push at open | Retention lever that costs content, not code — migration 012 scheduling already supports it; pairs with E.1's drop ritual | Low (needs E.1 push infra) | With/after E.1 |
| C5 | **Leaderboard leagues/brackets** — cohorts of ~30 so rank stays motivating | Only if WAU > ~100; changes rank-snapshot design (011), so flag early | Medium | Post-pilot, data-gated |
| C6 | **Merchant QR-at-till for Spec 07** — printed QR linking to `/redeem/[merchantKey]`; no merchant accounts | Keeps Phase G rollout to "print this and tape it to the counter" | Trivial (part of G.1) | Phase G |

---

## Priority Matrix

| Feature | Effort | Impact | Priority | Status |
|---|---|---|---|---|
| iOS submit creds + first store build | Low | Critical (ship) | **P0** | ❌ |
| Analytics (Spec 04) | Low | Critical (learning) | **P0** | ✅ Wired — set key + build dashboards |
| Apply migration 023 live (022 applied; history synced) | Low | Critical (ops) | **P0** | ⚠️ `npx supabase db push` |
| `ADMIN_ALLOWED_EMAILS` in prod | Trivial | Critical | **P0** | ⚠️ Set on deploy |
| Account deletion (App Store 5.1.1(v)) | Low | Critical (review) | **P0** | ✅ Code shipped — apply 023 |
| Real Victoria boundary | Low | High | **P0** | ✅ Applied live (022) |
| Sentry | Low | High | **P0** | ✅ Wired — set DSN |
| Instant verification (Spec 02) | Medium | Critical (retention) | — | ✅ Shipped |
| Reports & moderation + block + opt-out (Spec 03) | Medium | Critical (store review) | — | ✅ Shipped |
| Geofence drawing (Spec 01) | Medium | High | — | ✅ Shipped |
| Weekly drop ritual (E.1) | Low | High (retention) | **P1** | ❌ |
| First-quest onboarding (F.1) | Low | High (activation) | **P1** | ❌ |
| Community quest suggestions (E.2) | Medium | High (content) | **P1** | ❌ |
| Sunday recap share card (F.2) | Medium | High (growth) | **P1** | ❌ |
| Merchant redemption validation (Spec 07) | Low–Med | High (revenue) | **P1** | ❌ |
| XP economy events (F.3) | Low | Medium–High | **P2** | ❌ |
| Offline submission queue (F.4) | Medium | Medium | **P2** | ❌ |
| Quest chains (E.3) | Medium | Medium | **P2** | ❌ |
| Duo quests + referral (F.5) | High | High (growth) | **P2** | ❌ |
| Push tap navigation | Low | Medium | **P2** | ✅ Mounted in `_layout.tsx` |
| Photo pre-screen auto-triage (R2) | Low | Medium–High (trust/review) | **P2** | ❌ New — Jul 7 review |
| Streak insurance / freeze (C1) | Low | Medium (retention) | **P3** | ❌ New — with F.3 |
| Quest save-for-later (C2) | Low | Medium (engagement + signal) | **P3** | ❌ New — Jul 7 review |
| Personal quest-log map (C3) | Medium | Medium (identity/share) | **P3** | ❌ New — build with F.2 |
| Flash quests (C4) | Low | Medium (retention) | **P3** | ❌ New — after E.1 |

---

## Tech Debt

| Area | Issue | When to fix |
|---|---|---|
| ~~`award-xp` / badge logic duplication~~ | ✅ Resolved — edge fn retired by 017; badge logic single-sourced in 019–021 evaluator | — |
| Doc drift: root README.md + ARCHITECTURE.md | Still describe 016 = instant verification / 017 = moderation and migrations "001–017"; badge system (019–021), account deletion (023), analytics not reflected | Phase 0.9 (R6) |
| Env var naming drift | Root `.env.example` vs admin `SUPABASE_SECRET_KEY` | Phase 0.9 |
| No React Query / SWR | Hooks re-fetch on every mount | Phase E kickoff (R4) |
| Manual TypeScript types | `lib/types.ts` vs `supabase gen types` | Phase 0.9 (R5) |
| Duplicate `push_token` migrations | `004` + timestamped duplicate | Phase 0.9 |
| App icon art | Generated brand mark (`scripts/gen-app-icons.js`) — swap in designed art anytime by replacing the three PNGs | Optional, pre-1.0 polish |
| Leaderboard weekly-only | No all-time/monthly scope | Post-pilot |
| No integration tests | Pure-logic tests only | Before first production build |
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

---

## Success Metrics (defined in PRODUCT.md, instrumented by Spec 04)

- **WAU retention after first quest** — primary retention signal
- **Sponsor quest renewal rate** — primary revenue signal (proof via Spec 07 redemption rates)
- **Leaderboard week-2 return** — secondary engagement signal
- **Average XP per MAU** — depth-of-play signal
- **Time-to-first-XP** *(new)* — activation signal; target median < 24 h, aspiration < 5 min via starter quest

---

## Changelog

| Date | Change |
|---|---|
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
