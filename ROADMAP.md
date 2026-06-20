# Quest! — Product Roadmap

**Last updated:** June 19, 2026  
**Stage:** MVP Complete → Pre-Launch Hardening

The core product loop works end-to-end: discover quest → submit proof → admin approves → XP + leaderboard update. What remains is ship infrastructure (store submit creds, CI), redemption wiring, and retention mechanics — not greenfield feature work.

---

## Snapshot

| Area | Status |
|---|---|
| Mobile core loop | ✅ Shippable |
| Mobile profile & settings | ✅ Profile + edit profile done; legal links stubbed |
| Admin operations | ✅ Usable (set `ADMIN_ALLOWED_EMAILS` before prod deploy) |
| Engagement plumbing | ⚠️ Push on approve wired server-side; needs device build + prod function deploy |
| Sponsor / B2B loop | ❌ Not connected (no sponsored seed rows; admin create hides sponsor fields) |
| Production readiness | ⚠️ EAS project ID set; iOS submit creds + CI still missing |
| Brand / rename | ✅ App renamed to **Quest!** (`APP_NAME`, `app.json`, docs) |

**Highest-impact blockers before real users:**

1. **iOS App Store submit credentials** — `eas.json` still has `REPLACE_WITH_*` placeholders; blocks TestFlight / App Store submit
2. **`ADMIN_ALLOWED_EMAILS`** must be set in production — code denies all logins if unset (safe default)
3. **Confirm migration `005_align_badge_unlock_logic.sql`** is applied on live Supabase (12/13 badges; Season Veteran deferred)
4. **Redemption code flow not wired** — `generate-redemption-code` has no caller; no mobile UI
5. **No CI pipeline** — logic tests exist but nothing runs them on push

---

## What's Fully Implemented

### Mobile App (`apps/mobile`)

| Feature | Notes |
|---|---|
| Email/password auth | Sign up, sign in, sign out; profile auto-created on sign up |
| Onboarding (3 screens) | First-launch intro, city pick (Victoria pilot), sign-up/sign-in CTA — `app/onboarding.tsx` |
| Quest feed | Category filter, pull-to-refresh, featured sponsored hero (client-side; empty if no sponsored quests) |
| Quest detail | Full info, category colors, start/submit CTA |
| Quest submission | Camera proof, GPS geofence (300 m), Supabase Storage upload |
| Submission celebration | Post-submit modal (pending approval) — `CompletionCelebration.tsx` |
| Map view | Category-colored markers + geofence circles — `app/(tabs)/map.tsx` |
| Weekly leaderboard | Top 50, user highlight strip, DB `leaderboard` view |
| User profile | Hero card, stats (quests / XP / badges / level), XP bar, weekly rank card, top categories, badge grid, quest history (last 20 approved), pull-to-refresh — `app/(tabs)/profile.tsx` |
| Edit profile | Username + city update with validation — `app/edit-profile.tsx` (linked from profile + settings) |
| Settings screen | Account display, Edit Profile link, push toggle (wired to token register/clear), weekly digest pref (local AsyncStorage), sign out |
| XP & level system | 10 levels, 0–15k XP; DB trigger on approval |
| Push token registration | Permission, Expo token, save to `profiles.push_token`; cleared on sign out |
| Root error boundary | `components/ErrorBoundary.tsx` wraps Stack in `_layout.tsx` |
| Home → profile shortcut | Avatar on feed header navigates to Profile tab |
| Design system | Saltwater Saturday — `DESIGN.md` spec'd + implemented; `APP_NAME = 'Quest!'` in `lib/constants.ts` |
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
| Migrations 001–005 | Schema, badges, categories, push_token, badge alignment (+ duplicate push_token migration — see tech debt) |
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
| **Push notifications** | Client registration, settings toggle wired to token, sign-out cleanup, `award-xp` sends push on approve | No in-app notification listeners; no new-quest / streak pushes; weekly digest is local pref only; physical device build required for tokens |
| **Badge auto-unlock** | 12/13 badges via `005` DB trigger + `award-xp` redundancy | Season Veteran needs seasons table; confirm `005` applied on live DB |
| **Admin auth** | Session gate + email allowlist in middleware | Must set `ADMIN_ALLOWED_EMAILS` in prod; dev allows all with warning if unset |
| **Settings** | Account display, Edit Profile link, push toggle, weekly digest pref, sign out | Privacy Policy / Terms — empty `onPress` handlers; weekly digest not backed by scheduled notifications |
| **EAS Build / Submit** | Project ID, build profiles, scripts, docs | iOS submit credentials placeholders; first preview / store build not verified |
| **Error handling** | Root `ErrorBoundary` with on-brand fallback + Try Again | No Sentry or crash reporting service |
| **Sponsored quests (UI)** | Feed hero + sponsor pill on `QuestCard`; admin list shows sponsor column | Create form has sponsor state but **no UI fields**; no sponsored rows in seed — can't test E2E |
| **Quest management (admin)** | Create + toggle status | No edit; sponsor fields not exposed in create form |
| **Leaderboard UX** | Weekly XP ranking from DB view | Rank delta (`↑`) is static decoration; "Resets Monday" is copy only |
| **Onboarding city** | Victoria selectable; saved to profile on sign-up | "More cities — Coming soon" is placeholder; multi-city not scoped in DB |
| **Profile avatar** | Hash-based initials + `avatar_url` display if set | No pick / crop / upload flow |

---

## Known Gaps

| Gap | Severity | Impact |
|---|---|---|
| **iOS submit credentials not configured** | 🔴 Critical (ship) | `eas.json` placeholders block App Store / TestFlight submit |
| **`ADMIN_ALLOWED_EMAILS` unset in prod** | 🔴 Critical (ops) | All admin logins denied until env is set |
| **No CI pipeline** | 🟠 High | Logic tests not run automatically; no lint/build gate on PRs |
| **Migration 005 not applied on live DB** | 🟠 High | Badge unlock may still use old `002` logic if only 001–004 were run manually |
| **Redemption code flow** | 🟠 High | Edge function + DB column exist; no admin invoke or mobile UI |
| **Streak system** | 🟠 High | Retention mechanic from PRODUCT.md — not started |
| **Sponsored quest E2E** | 🟠 High | Zero sponsored seed rows + admin create hides sponsor fields |
| **Season Veteran badge** | 🟡 Medium | Requires seasons table — deferred in `005` + `award-xp` |
| **Avatar photo upload** | 🟡 Medium | Display only; hash-based fallback |
| **Crash reporting (Sentry)** | 🟡 Medium | Error boundary catches UI crashes; no remote reporting |
| **Sponsor export** | 🟡 Medium | Copy mentions export; no CSV action on sponsors page |
| **Quest expiry / scheduling** | 🟡 Medium | No `active_from` / `active_until` in schema |
| **Admin quest editing** | 🟡 Medium | Create + toggle only |
| **Duplicate completion UX** | 🟡 Medium | DB unique constraint blocks re-attempt after rejection — no friendly message |
| **Social features** | 🟢 Low | Friends, activity feed — v2 |
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
| 0.4 | **Settings + profile editing** | ⚠️ Partial | Edit profile (username + city) done; wire Privacy/Terms links; weekly digest backend |
| 0.5 | **Error boundary + crash reporting** | ⚠️ Partial | `ErrorBoundary` shipped; add Sentry or equivalent |
| 0.6 | **EAS Build — first real build** | ⚠️ Partial | Project ID + profiles done; run first `build:preview`, then configure iOS submit creds |
| 0.7 | **Wire `award-xp` on approval** | ✅ Done | `apps/admin/lib/invoke-edge-function.ts` + completions action after approve |
| 0.8 | **Fix map `React` import** | ✅ Done | `import { Fragment } from 'react'` in `app/(tabs)/map.tsx` |
| 0.9 | **Consolidate migrations + docs** | ❌ | Duplicate `push_token` migrations; README only documents `001` — document full order + env naming |
| 0.10 | **CI pipeline** | ❌ | Add GitHub Actions: run `logic.test.js`, TypeScript check, admin build |
| 0.11 | **App rebrand to Quest!** | ✅ Done | `APP_NAME`, `app.json`, docs, admin UI, seed badge copy |

**Suggested order:** 0.6 (preview build) → 0.10 (CI) → 0.9 (migration docs) → 0.5 (Sentry) → confirm 0.3 on live DB

---

### Phase 1 — Retention Mechanics (Weeks 2–4)

| # | Task | Status | Why / next step |
|---|---|---|---|
| 1.1 | **Push notifications — full pipeline** | ⚠️ Partial | Approve push wired via `award-xp`; add in-app listeners, new-quest + streak reminders |
| 1.2 | **Streak system** | ❌ | Daily/weekly completion counter + profile display |
| 1.3 | **Submission celebration** | ✅ Done | Modal after submit, not after approval — matches PRODUCT.md |
| 1.4 | **Avatar photo upload** | ❌ | Pick, crop, upload to Storage; update `profiles.avatar_url` |
| 1.5 | **Quest history on profile** | ✅ Done | Approved completions, last 20, empty state |
| 1.6 | **Onboarding flow** | ✅ Done | 3 screens, city pick, AsyncStorage gate |
| 1.7 | **Enhanced profile tab** | ✅ Done | Weekly rank, top categories, member-since, pull-to-refresh, edit CTA |
| 1.8 | **Edit profile** | ✅ Done | Username + city — `app/edit-profile.tsx` |

---

### Phase 2 — Business Model (Weeks 4–6)

| # | Task | Status | Why / next step |
|---|---|---|---|
| 2.1 | **Redemption code flow** | ❌ | Wire `generate-redemption-code` from admin on sponsored approval; show code in mobile post-approval |
| 2.2 | **Sponsor export** | ❌ | CSV export of completion metrics per sponsor |
| 2.3 | **Sponsored quest UI (admin create)** | ⚠️ Partial | Mobile feed supports sponsors; expose sponsor fields in admin create form + add sponsored rows to seed |
| 2.4 | **Quest expiry + scheduling** | ❌ | `active_from` / `active_until` columns + admin UI |
| 2.5 | **Admin quest editing** | ❌ | Edit existing quest fields, not just create + toggle |

---

### Phase 3 — Social Layer (Weeks 6–10)

| # | Task | Status |
|---|---|---|
| 3.1 | Activity feed — friends' recent completions | ❌ |
| 3.2 | Follow/friend system | ❌ |
| 3.3 | Quest detail: "X friends completed" counter | ❌ |
| 3.4 | Share quest / completion (native share sheet) | ❌ |
| 3.5 | In-app quest comments or reactions | ❌ |
| 3.6 | Neighborhood / area filtering on map | ❌ |

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
| Confirm migration 005 on live DB | Low | High | **P0** | ⚠️ Ops check |
| CI pipeline (logic tests + build) | Low | High | **P0** | ❌ |
| Error boundary + Sentry | Low | High | **P0** | ⚠️ Boundary done; Sentry not |
| Badge unlock (12/13) | — | Critical | **P0** | ⚠️ Code done; verify DB |
| Wire `award-xp` on approval | Low | Critical | **P0** | ✅ Done |
| Admin role allowlist | Low | Critical | **P0** | ✅ Done |
| App rebrand to Quest! | — | Medium | — | ✅ Done |
| Edit profile | Low | Medium | — | ✅ Done |
| Enhanced profile tab | — | Medium | — | ✅ Done |
| Push notification sending | Medium | High | **P1** | ⚠️ Partial |
| Streak system | Medium | High | **P1** | ❌ |
| Avatar upload | Low | Medium | **P1** | ❌ |
| Redemption code flow | Medium | High | **P2** | ❌ |
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
| `generate-redemption-code` orphaned | No caller in admin or DB webhooks | Phase 2.1 |
| Duplicate `push_token` migrations | `004_push_token.sql` + `20250618120000_add_push_token_to_profiles.sql` | Phase 0.9 |
| Migration docs incomplete | README stops at `001`; run order for 002–005 undocumented | Phase 0.9 |
| Env var naming drift | Root `.env.example` says `SUPABASE_SERVICE_ROLE_KEY`; admin uses `SUPABASE_SECRET_KEY` | Phase 0.9 |
| No npm test script | `logic.test.js` must be run manually | Phase 0.10 |
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
  ✗ generate-redemption-code — not called
  ✗ mobile redemption code UI — not built
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
├── (auth)/sign-in, sign-up
├── (tabs)/index, map, leaderboard, profile
├── quest/[id]
├── submit/[questId]  (modal)
├── settings
└── edit-profile
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
| Jun 19, 2026 | Full re-audit after profile work + Quest! rebrand. Marked edit profile, enhanced profile, app rename, EAS project ID as done. Added CI gap (0.10). Corrected EAS status (project ID set; iOS submit still placeholder). Updated settings partial status (edit done, legal links stubbed). Added mobile screen map, resolved-items table, and tech-debt entries for test script + leaderboard delta. |
| Jun 18, 2026 | Full rewrite after codebase audit. Marked onboarding, quest history, submission celebration, settings, push registration, admin session auth as done/partial. Added badge mismatch, award-xp wiring, map bug, EAS placeholders as P0 blockers. |
| Jun 18, 2026 | Badge unlock aligned: 12/13 badges now award via `005_align_badge_unlock_logic.sql` + `award-xp` rewrite; Season Veteran deferred (requires seasons table). |
| Jun 18, 2026 | Phase 0 progress: `award-xp` wired on admin approve, map Fragment fix, root ErrorBoundary, admin email allowlist, `BUILDING.md` + mobile `.env.example`. |

---

*Update this document when a phase item ships or when audit reveals drift.*
