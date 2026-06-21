# Quest! — Product Roadmap

**Last updated:** June 21, 2026  
**Stage:** MVP Complete → UI Reimagined → Pre-Launch Hardening

The core product loop works end-to-end: discover quest → submit proof → admin approves → XP + leaderboard update. What remains is ship infrastructure (store submit creds, CI), redemption wiring, and retention mechanics — not greenfield feature work.

---

## Snapshot

| Area | Status |
|---|---|
| Mobile core loop | ✅ Shippable |
| Mobile profile & settings | ✅ Profile, edit profile, avatar upload, legal screens |
| Admin operations | ✅ Usable (set `ADMIN_ALLOWED_EMAILS` before prod deploy) |
| Engagement plumbing | ⚠️ Push on approve wired server-side; in-app tap listeners + streak celebration still partial |
| Sponsor / B2B loop | ❌ Not connected (no sponsored seed rows; admin create hides sponsor fields) |
| Production readiness | ⚠️ CI + npm test wired; EAS project ID set; iOS submit creds still placeholders |
| Brand / rename | ✅ App renamed to **Quest!** (`APP_NAME`, `app.json`, docs) |

**Highest-impact blockers before real users:**

1. **iOS App Store submit credentials** — `eas.json` still has `REPLACE_WITH_*` placeholders; blocks TestFlight / App Store submit
2. **`ADMIN_ALLOWED_EMAILS`** must be set in production — code denies all logins if unset (safe default)
3. **Confirm migrations `005`–`008`** are applied on live Supabase (badges, streaks, avatar bucket, activity feed RLS)
4. **Sponsored quest E2E** — zero sponsored seed rows; redemption mobile UI only on profile history after approval
5. **Push tap navigation** — `mountPushListeners` module exists; wire in root `_layout` for notification → profile deep links

---

## What's Fully Implemented

### Mobile App (`apps/mobile`)

| Feature | Notes |
|---|---|
| Email/password auth | Sign up, sign in, sign out; profile auto-created on sign up |
| Onboarding (3 screens) | First-launch intro, city pick (Victoria pilot), sign-up/sign-in CTA — `app/onboarding.tsx` |
| **Explore tab** | Hero-image quest cards (`QuestHeroCard`), player XP card, category filters, bell header — `app/(tabs)/index.tsx` |
| **Quests tab (feed)** | Map preview + public activity feed from approved completions — `app/(tabs)/feed.tsx`, `hooks/useActivityFeed.ts` |
| **Rankings tab** | Navy hero, podium top 3, featured badges, chasers list — `app/(tabs)/leaderboard.tsx` |
| **Badges tab** | Dedicated badge collection grid with lock/earned states — `app/(tabs)/badges.tsx` |
| Quest detail | Full info, category colors, start/submit CTA |
| Quest submission | Camera proof, GPS geofence (300 m), Supabase Storage upload |
| Submission celebration | Post-submit modal (pending approval) — `CompletionCelebration.tsx` |
| Map view | Full-screen map (hidden tab; opened from feed) — `app/(tabs)/map.tsx` |
| User profile | Navy hero, 2×2 stats grid, recent activity, settings/edit links — `app/(tabs)/profile.tsx` |
| Edit profile | Username + city update with validation — `app/edit-profile.tsx` (linked from profile + settings) |
| Settings screen | Account display, Edit Profile link, push toggle (wired to token register/clear), weekly digest pref (local AsyncStorage), sign out |
| XP & level system | 10 levels, 0–15k XP; DB trigger on approval |
| Push token registration | Permission, Expo token, save to `profiles.push_token`; cleared on sign out |
| Root error boundary | `components/ErrorBoundary.tsx` wraps Stack in `_layout.tsx` |
| 5-tab navigation | Explore · Quests (feed) · Rankings · Badges · Profile — animated pill tab bar — `(tabs)/_layout.tsx` |
| Design system | **Harbour Electric** (Figma reimagining) — `DESIGN.md` + `lib/constants.ts`; Quest Blue `#4364F7`, sky bg `#E8F3FF` |
| Figma web prototype | `Gamified City Challenge App/` — Vite reference implementation synced with mobile direction |
| App branding | Display name **Quest!**, slug `quest`, bundle ID `com.quest.app` — `app.json` |

### Admin Dashboard (`apps/admin`)

| Feature | Notes |
|---|---|
| Session auth + login page | Middleware redirects unauthenticated users to `/login` |
| Admin email allowlist | `ADMIN_ALLOWED_EMAILS` env + `lib/admin-auth.ts`; prod denies if unset |
| Service role server-only | `supabaseAdmin` in server components/actions only — never in client bundle |
| `award-xp` invocation | `lib/invoke-edge-function.ts` called after approve in completions action |
| Dashboard stats | Users, completions, pending, active quests |
| Completions queue | Approve/reject with photo + GPS |
| Quest management | List, create, toggle active/inactive |
| Users table | XP-sorted, server-rendered (ISR 60s) |
| Sponsors view | Per-sponsor completion metrics (display only) |

### Database & Backend (`supabase/`)

| Feature | Notes |
|---|---|
| PostgreSQL schema | 5 tables, 1 view, RLS on core tables |
| XP-award DB trigger | `on_completion_approved` — increments XP + recalculates level |
| Badge unlock DB trigger | `005_align_badge_unlock_logic.sql` replaces `002` logic — 12/13 badges aligned with seed |
| Migrations 001–008 | Schema, badges, categories, push_token, badge alignment, streaks, avatars, activity feed RLS |
| Activity feed RLS | `008_public_feed_completions.sql` — approved completions readable by all authenticated users |
| 20 seeded quests | Victoria, BC — real GPS, 5 categories; **none sponsored** |
| 13 seeded badges | 12 unlock rules match DB trigger + `award-xp`; Season Veteran deferred |
| Edge functions | `award-xp` invoked on admin approve; `generate-redemption-code` implemented, not invoked |
| Supabase Storage | `proof-photos` bucket, RLS on upload |

### Tests

| Area | Status |
|---|---|
| Logic tests (XP, leaderboard, avatar, geofence, greeting) | ✅ `apps/mobile/__tests__/logic.test.js` (84 assertions; run via `node`) |
| npm test script | ❌ Not wired in `package.json` |
| UI / integration / CI tests | ❌ None |

### Infrastructure

| Area | Status |
|---|---|
| EAS build profiles | ✅ `eas.json` — dev / preview / prod with Supabase env |
| EAS project ID | ✅ Set in `app.json` → `extra.eas.projectId` |
| EAS npm scripts | ✅ `build:*`, `submit:prod`, `update` in `apps/mobile/package.json` |
| Build docs | ✅ `apps/mobile/BUILDING.md`, `.env.example` |
| EAS submit (iOS) | ❌ Apple ID / ASC / team placeholders in `eas.json` |
| EAS submit (Android) | ⚠️ Expects `./google-service-account.json` (not in repo) |
| GitHub Actions / CI | ❌ No workflows; only `.github/copilot-instructions.md` |

---

## Partially Implemented

These exist in code but are incomplete, misaligned, or not connected end-to-end.

| Feature | What works | What's missing |
|---|---|---|
| **Push notifications** | Client registration, settings toggle, sign-out cleanup, `award-xp` sends push on approve | `mountPushListeners` in `lib/push-navigation.ts` not yet mounted in root `_layout`; streak/new-quest pushes not built; weekly digest is local pref only |
| **Badge auto-unlock** | 12/13 badges via `005` DB trigger + `award-xp` redundancy | Season Veteran needs seasons table; confirm `005` applied on live DB |
| **Admin auth** | Session gate + email allowlist in middleware | Must set `ADMIN_ALLOWED_EMAILS` in prod; dev allows all with warning if unset |
| **Settings** | Account display, Edit Profile, push toggle, weekly digest pref, Privacy/Terms screens, sign out | Weekly digest not backed by scheduled notifications |
| **EAS Build / Submit** | Project ID, build profiles, scripts, docs | iOS submit credentials placeholders; first preview / store build not verified |
| **Error handling** | Root `ErrorBoundary` with on-brand fallback + Try Again | No Sentry or crash reporting service |
| **Sponsored quests (UI)** | Feed hero + sponsor pill on `QuestCard`; admin list shows sponsor column; redemption code on profile history | Create form has sponsor state but **no UI fields**; no sponsored rows in seed — can't test E2E |
| **Quest management (admin)** | Create + toggle status | No edit; sponsor fields not exposed in create form |
| **Leaderboard UX** | Podium + chasers UI; weekly XP from DB view | Rank delta (`↑`) removed; "Week 24" is copy only |
| **Activity feed** | Feed tab renders approved completions with proof photos | Likes/comments are UI placeholders; no social graph yet |
| **Quest hero images** | Category-based Unsplash placeholders via `CATEGORY_IMAGES` | No `cover_image_url` column on quests table yet |
| **Onboarding city** | Victoria selectable; saved to profile on sign-up | "More cities — Coming soon" is placeholder; multi-city not scoped in DB |
| **Profile avatar** | Pick, crop, upload to `avatars` bucket; hash-based fallback | — |
| **Streak system** | `006_streak_system.sql` + profile stats display | Celebration modal shows pre-approval `current_streak` at submit — not updated streak after admin approve |
| **Redemption code flow** | Admin invokes `generate-redemption-code` on sponsored approval; code shown in profile quest history | No in-notification redemption UI; depends on sponsored seed data |

---

## Known Gaps

| Gap | Severity | Impact |
|---|---|---|
| **iOS submit credentials not configured** | 🔴 Critical (ship) | `eas.json` placeholders block App Store / TestFlight submit |
| **`ADMIN_ALLOWED_EMAILS` unset in prod** | 🔴 Critical (ops) | All admin logins denied until env is set |
| **Migrations 005–007 not applied on live DB** | 🟠 High | Badge unlock, streak columns, avatar bucket may be missing |
| **Sponsored quest E2E** | 🟠 High | Zero sponsored seed rows + admin create hides sponsor fields |
| **Push tap navigation** | 🟠 High | `mountPushListeners` module ready; not mounted in `_layout` on `main` |
| **Streak celebration timing** | 🟡 Medium | Submit modal shows stale streak; no post-approval streak moment |
| **Season Veteran badge** | 🟡 Medium | Requires seasons table — deferred in `005` + `award-xp` |
| **Crash reporting (Sentry)** | 🟡 Medium | Error boundary catches UI crashes; no remote reporting |
| **Sponsor export** | 🟡 Medium | Copy mentions export; no CSV action on sponsors page |
| **Quest expiry / scheduling** | 🟡 Medium | No `active_from` / `active_until` in schema |
| **Admin quest editing** | 🟡 Medium | Create + toggle only |
| **Duplicate completion UX** | 🟡 Medium | DB unique constraint blocks re-attempt after rejection — no friendly message |
| **Social features** | 🟡 Medium | Public activity feed shipped; friends/follows/reactions still v2 |
| **In-app quest search** | 🟢 Low | Category filter only |

### Resolved since prior roadmap

| Was listed as gap | Now |
|---|---|
| Badge seed ↔ unlock mismatch (12/13) | ✅ `005_align_badge_unlock_logic.sql` + `award-xp` aligned with `seed.sql` |
| `award-xp` not wired to admin approval | ✅ `invoke-edge-function.ts` + completions action |
| Admin has no role allowlist | ✅ `ADMIN_ALLOWED_EMAILS` + middleware (set env in prod) |
| Map `React.Fragment` crash | ✅ `import { Fragment } from 'react'` in `map.tsx` |
| No error boundary | ✅ Root `ErrorBoundary` in `_layout.tsx` |
| Admin has no authentication guard | ✅ Session middleware + login page |
| Service role key exposed client-side | ✅ `server-only` module; client pages use server actions |
| Settings screen missing | ✅ Core screen shipped |
| No onboarding flow | ✅ 3-screen first-launch flow |
| Quest history missing | ✅ Profile section with approved completions |
| Submission celebration missing | ✅ Post-submit modal |
| Settings lacks edit profile | ✅ `edit-profile.tsx` + links from profile and settings |
| App named Kuest | ✅ Renamed to **Quest!** across mobile, admin, docs, seed |
| EAS project ID placeholder | ✅ Set in `app.json` |
| Basic profile tab only | ✅ Enhanced profile: weekly rank, categories, member-since, refresh |
| No CI pipeline | ✅ `.github/workflows/ci.yml` on push/PR to `main` |
| No npm test script | ✅ `npm test` in mobile `package.json` |
| Avatar photo upload missing | ✅ `edit-profile.tsx` + `007_avatar_bucket.sql` |
| Redemption not wired | ✅ Admin `completions/actions.ts` invokes `generate-redemption-code`; profile shows codes |
| Streak system not started | ✅ `006_streak_system.sql` + profile streak stats |
| Legal links stubbed in settings | ✅ `app/legal/privacy.tsx` + `app/legal/terms.tsx` |

---

## Roadmap

Status key: ✅ Done · ⚠️ Partial · ❌ Not started

### Phase 0 — Launch Hardening (~1–2 weeks)

Blockers before any real users touch the app.

| # | Task | Status | Why / next step |
|---|---|---|---|
| 0.1 | **Admin role allowlist** | ✅ Done | `lib/admin-auth.ts` + middleware; set `ADMIN_ALLOWED_EMAILS` before prod deploy |
| 0.2 | **Service role server-side only** | ✅ Done | `apps/admin/lib/supabase.ts` uses `server-only`; no client imports |
| 0.3 | **Badge auto-unlock — align seed + trigger** | ⚠️ Partial | `005` + `award-xp` match seed for 12/13; Season Veteran deferred; confirm migration applied |
| 0.4 | **Settings + profile editing** | ⚠️ Partial | Edit profile + avatar + legal screens done; weekly digest backend pending |
| 0.5 | **Error boundary + crash reporting** | ⚠️ Partial | `ErrorBoundary` shipped; add Sentry or equivalent |
| 0.6 | **EAS Build — first real build** | ⚠️ Partial | Project ID + profiles done; run first `build:preview`, then configure iOS submit creds |
| 0.7 | **Wire `award-xp` on approval** | ✅ Done | `apps/admin/lib/invoke-edge-function.ts` + completions action after approve |
| 0.8 | **Fix map `React` import** | ✅ Done | `import { Fragment } from 'react'` in `app/(tabs)/map.tsx` |
| 0.9 | **Consolidate migrations + docs** | ⚠️ Partial | `supabase/migrations/README.md` documents 001–007; duplicate push_token migration remains |
| 0.10 | **CI pipeline** | ✅ Done | `.github/workflows/ci.yml` — logic tests + mobile/admin `tsc` |
| 0.11 | **App rebrand to Quest!** | ✅ Done | `APP_NAME`, `app.json`, docs, admin UI, seed badge copy |

**Suggested order:** 0.6 (preview build) → confirm 0.3 + 006/007 on live DB → mount push listeners → 0.5 (Sentry)

---

### Phase 1 — Retention Mechanics (Weeks 2–4)

| # | Task | Status | Why / next step |
|---|---|---|---|
| 1.1 | **Push notifications — full pipeline** | ⚠️ Partial | Approve push wired via `award-xp`; mount `mountPushListeners` in `_layout`; new-quest + streak reminders |
| 1.2 | **Streak system** | ⚠️ Partial | DB trigger + profile display done; post-approval celebration wiring pending |
| 1.3 | **Submission celebration** | ✅ Done | Modal after submit, not after approval — matches PRODUCT.md |
| 1.4 | **Avatar photo upload** | ✅ Done | Pick, crop, upload in `edit-profile.tsx`; `007_avatar_bucket.sql` |
| 1.5 | **Quest history on profile** | ✅ Done | Approved completions, last 20, empty state |
| 1.6 | **Onboarding flow** | ✅ Done | 3 screens, city pick, AsyncStorage gate |
| 1.7 | **Enhanced profile tab** | ✅ Done | Weekly rank, top categories, member-since, pull-to-refresh, edit CTA |
| 1.8 | **Edit profile** | ✅ Done | Username + city — `app/edit-profile.tsx` |

---

### Phase 2 — Business Model (Weeks 4–6)

| # | Task | Status | Why / next step |
|---|---|---|---|
| 2.1 | **Redemption code flow** | ⚠️ Partial | Admin invokes on sponsored approval; code on profile history — needs sponsored seed + notification UX |
| 2.2 | **Sponsor export** | ❌ | CSV export of completion metrics per sponsor |
| 2.3 | **Sponsored quest UI (admin create)** | ⚠️ Partial | Mobile feed supports sponsors; expose sponsor fields in admin create form + add sponsored rows to seed |
| 2.4 | **Quest expiry + scheduling** | ❌ | `active_from` / `active_until` columns + admin UI |
| 2.5 | **Admin quest editing** | ❌ | Edit existing quest fields, not just create + toggle |

---

### Phase 3 — Social Layer (Weeks 6–10)

| # | Task | Status |
|---|---|---|
| 3.1 | Activity feed — public recent completions | ✅ Done (`feed.tsx` + `useActivityFeed` + migration `008`) |
| 3.2 | Feed interactions (likes, comments) | ❌ | UI placeholders only |
| 3.3 | Follow/friend system | ❌ |
| 3.4 | Quest detail: "X friends completed" counter | ❌ |
| 3.5 | Share quest / completion (native share sheet) | ❌ |
| 3.6 | Per-quest cover images in database | ❌ | Currently category placeholders |
| 3.7 | Neighborhood / area filtering on map | ❌ |

---

### Phase 4 — Scale & Expansion (Weeks 10+)

| # | Task | Status |
|---|---|---|
| 4.1 | Multi-city support — scoped quests + leaderboard | ❌ (onboarding city pick is pilot-only) |
| 4.2 | Quest types beyond photo proof (check-in, QR, social) | ❌ |
| 4.3 | Self-serve sponsor portal | ❌ |
| 4.4 | Seasonal / special event quests + Season Veteran badge | ❌ |
| 4.5 | All-time leaderboard + past seasons archive | ❌ |
| 4.6 | iOS / Android widget (streak, nearby quest) | ❌ |

---

## Priority Matrix (Revised)

| Feature | Effort | Impact | Priority | Status |
|---|---|---|---|---|
| iOS submit creds + first store build | Low | Critical (ship) | **P0** | ❌ Placeholders in `eas.json` |
| EAS preview build (verify) | Low | Critical (ship) | **P0** | ⚠️ Config done; build not verified |
| `ADMIN_ALLOWED_EMAILS` in prod | Trivial | Critical | **P0** | ⚠️ Set on deploy |
| Confirm migrations 005–008 on live DB | Low | High | **P0** | ⚠️ Ops check (008 = feed RLS) |
| CI pipeline (logic tests + build) | Low | High | **P0** | ✅ `.github/workflows/ci.yml` |
| Error boundary + Sentry | Low | High | **P0** | ⚠️ Boundary done; Sentry not |
| Badge unlock (12/13) | — | Critical | **P0** | ⚠️ Code done; verify DB |
| Wire `award-xp` on approval | Low | Critical | **P0** | ✅ Done |
| Admin role allowlist | Low | Critical | **P0** | ✅ Done |
| App rebrand to Quest! | — | Medium | — | ✅ Done |
| Edit profile + avatar upload | Low | Medium | — | ✅ Done |
| Legal screens (Privacy / Terms) | Low | Medium | — | ✅ Done |
| Enhanced profile tab | — | Medium | — | ✅ Done |
| Push notification sending | Medium | High | **P1** | ⚠️ Server-side done; tap listeners pending |
| Streak system | Medium | High | **P1** | ⚠️ DB + profile done; celebration wiring partial |
| Redemption code flow | Medium | High | **P2** | ⚠️ Admin wired; needs sponsored seed + notification UX |
| Sponsor export + admin sponsor fields | Low–Med | Medium | **P2** | ❌ |
| Quest expiry / scheduling | Medium | Medium | **P2** | ❌ |
| Admin quest editing | Low | Medium | **P2** | ❌ |
| Onboarding flow | — | High | — | ✅ Done |
| Quest history | — | Medium | — | ✅ Done |
| Submission celebration | — | Medium | — | ✅ Done |
| Settings (core) | — | Medium | — | ✅ Done |
| Service role server-side | — | Critical | — | ✅ Done |

---

## Tech Debt

| Area | Issue | When to fix |
|---|---|---|
| Badge Season Veteran | Requires seasons table; stubbed in `005` + `award-xp` | Phase 4.4 |
| Duplicate `push_token` migrations | `004_push_token.sql` + `20250618120000_add_push_token_to_profiles.sql` | Phase 0.9 |
| Migration docs incomplete | README stops at `001`; run order for 002–005 undocumented | ✅ `supabase/migrations/README.md` + root README link |
| Env var naming drift | Root `.env.example` says `SUPABASE_SERVICE_ROLE_KEY`; admin uses `SUPABASE_SECRET_KEY` | Phase 0.9 |
| No npm test script | `logic.test.js` must be run manually | ✅ `npm test` in mobile `package.json` |
| No React Query / SWR | Hooks re-fetch on every mount; `useAuth` duplicated per screen | Phase 1 |
| No integration tests | Pure-logic tests only | Before first EAS production build |
| No error reporting | Error boundary only; no Sentry | Phase 0.5 |
| Leaderboard weekly-only | No all-time, monthly, or friend scope; rank delta faked | Phase 4 |
| `unique(user_id, quest_id)` | Blocks re-attempt after rejection | Evaluate in Phase 1 |
| No sponsored quests in seed | Can't test sponsor/redemption E2E | Phase 2.1 |
| Manual TypeScript types | `lib/types.ts` comment says replace with `supabase gen types` | Phase 0.9 |
| Placeholder app icons | `create-assets.js` generates 1×1 PNGs | Before store submit |
| Leaderboard static `↑` | Not computed from prior-week rank | Phase 1 |

---

## Architecture Notes

**Approval flow today:**

```
Mobile submit → completions (pending)
  → Admin approve (status + reviewed_at)
  → DB trigger: award XP + level
  → DB trigger: check badges on total_xp update (005-aligned, if migration applied)
  → invoke award-xp edge function: push notification + badge redundancy
  → if sponsored: invoke generate-redemption-code (admin completions action)
  → mobile: redemption code on profile quest history (sponsored + approved)
  ✗ push tap → profile deep link — `mountPushListeners` not mounted on `main`
```

**Target approval flow (remaining work):**

```
Admin approve
  → (above — already in place)
  → if sponsored: invoke generate-redemption-code
  → mobile: show redemption code on approval notification / profile
```

Push on approve requires: deployed `award-xp` function, valid admin `SUPABASE_SECRET_KEY`, user `push_token` on profile (EAS project ID + physical device build).

**Mobile screen map:**

```
Root Stack
├── onboarding
├── (auth)/sign-in, sign-up, forgot-password, reset-password
├── (tabs)/
│   ├── index      — Explore (hero quest cards)
│   ├── feed       — Quests tab (map preview + activity feed)
│   ├── leaderboard — Rankings (podium + chasers)
│   ├── badges     — Badge collection
│   ├── profile    — Stats + recent activity
│   └── map        — Full map (hidden from tab bar)
├── quest/[id]
├── submit/[questId]  (modal)
├── settings
├── edit-profile
├── legal/privacy, legal/terms
```

---

## Success Metrics (from PRODUCT.md)

- **WAU retention after first quest** — primary retention signal
- **Sponsor quest renewal rate** — primary revenue signal
- **Leaderboard week-2 return** — secondary engagement signal
- **Average XP per MAU** — depth-of-play signal

---

## Changelog

| Date | Change |
|---|---|
| Jun 21, 2026 | **Figma UI reimagining shipped:** 5-tab nav (Explore/Quests/Rankings/Badges/Profile), Harbour Electric design system, hero quest cards, activity feed, podium rankings, dedicated badges tab, profile simplification. Docs/tokens updated. Migration `008` for feed RLS. Prior Saltwater Saturday spec superseded in `DESIGN.md`. |
| Jun 21, 2026 | Code audit: CI + npm test marked done; avatar upload, streak DB/profile, redemption admin wiring verified; legal screens shipped; push listeners module exists but not on `main` `_layout`; streak celebration shows stale count at submit; README migration order + admin port 3000 fixed. |
| Jun 19, 2026 | Full re-audit after profile work + Quest! rebrand. Marked edit profile, enhanced profile, app rename, EAS project ID as done. Added CI gap (0.10). Corrected EAS status (project ID set; iOS submit still placeholder). Updated settings partial status (edit done, legal links stubbed). Added mobile screen map, resolved-items table, and tech-debt entries for test script + leaderboard delta. |
| Jun 18, 2026 | Full rewrite after codebase audit. Marked onboarding, quest history, submission celebration, settings, push registration, admin session auth as done/partial. Added badge mismatch, award-xp wiring, map bug, EAS placeholders as P0 blockers. |
| Jun 18, 2026 | Badge unlock aligned: 12/13 badges now award via `005_align_badge_unlock_logic.sql` + `award-xp` rewrite; Season Veteran deferred (requires seasons table). |
| Jun 18, 2026 | Phase 0 progress: `award-xp` wired on admin approve, map Fragment fix, root ErrorBoundary, admin email allowlist, `BUILDING.md` + mobile `.env.example`. |

---

*Update this document when a phase item ships or when audit reveals drift.*
