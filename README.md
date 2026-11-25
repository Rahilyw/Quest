# Quest!

**Real life, gamified.** Quest! is a city exploration app that turns your neighbourhood into a game. Players complete real-world challenges — trying a local café, running a trail, joining a community event — capture photo proof on location, and earn XP, badges, and leaderboard ranking **instantly**: completions are **geofence-verified server-side** (PostGIS) at the moment of submission, so the reward lands seconds after the real-world act. Community reports, block-user, feed privacy, and an admin moderation queue keep the public feed honest. See [ROADMAP.md](ROADMAP.md) and [docs/specs/](docs/specs/README.md) for the full plan.

Built for Victoria, BC as the pilot city, but designed to drop into any city with a new seed file.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Database Schema](#database-schema)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Mobile App](#mobile-app)
- [Admin Dashboard](#admin-dashboard)
- [Supabase Backend](#supabase-backend)
- [Design System](#design-system)
- [Testing & CI](#testing--ci)
- [Deployment](#deployment)
- [Roadmap](#roadmap)

---

## Overview

Quest! has three moving parts:

| Part | What it is | Who uses it |
|------|-----------|-------------|
| **Mobile app** | Expo / React Native | Players |
| **Admin dashboard** | Next.js 15 | City operators, admins |
| **Supabase backend** | Auth + Postgres + Storage + Edge Functions | Both |

The core loop is:

1. Player opens the app, browses quests on the **Explore** tab
2. Player travels to the quest location — **four geofence types** (anywhere / circle / city / drawn polygon), enforced server-side on insert
3. Player captures a **photo proof** with the in-app camera (no gallery picker)
4. Submission uploads to Storage and inserts a completion row
5. **Geofence pass = proof:** the row auto-approves at insert (rate-limited) — XP, level, streak, badges, and any sponsored redemption code land instantly; the celebration shows the real numbers
6. Completion appears on the **public activity feed** — unless the player turned off feed publishing in Settings
7. The community can **report** posts (3 independent reports auto-hide) and **block** users; the admin **moderation queue** reviews flagged posts with GPS evidence — removal revokes the XP

**Status (Nov 25, 2026).** Production has the baseline and migrations 002–040 applied; the 039 verification queries are not yet recorded. Migrations 041–044 (push draining and recap push, proof-photo owner policies, XP events, stickers) are in this checkout and locally tested on a throwaway Supabase stack in CI; they are not applied. Migration 045 (duo quests) is on the `cursor/d-duo` branch, held for the pilot cohort. The two push functions are not deployed, and no feature is device-verified yet. The [roadmap](ROADMAP.md) has the full status table; the [owner run sheet](docs/design/OWNER-RUNSHEET.md) and [launch runbook](LAUNCH-RUNBOOK.md) cover the hosted steps.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Client Layer                        │
│                                                         │
│   ┌──────────────────┐      ┌──────────────────────┐   │
│   │   Mobile App     │      │   Admin Dashboard    │   │
│   │  Expo / RN       │      │   Next.js 15         │   │
│   │  iOS + Android   │      │   Web only           │   │
│   └────────┬─────────┘      └──────────┬───────────┘   │
└────────────┼───────────────────────────┼───────────────┘
             │                           │
             │ supabase-js (anon key)    │ supabase-js
             │                           │ (service-role key)
             ▼                           ▼
┌─────────────────────────────────────────────────────────┐
│                   Supabase Backend                      │
│                                                         │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │  Auth   │  │ Postgres │  │ Storage  │  │  Edge  │  │
│  │ (email) │  │ + RLS    │  │ Buckets  │  │  Fns   │  │
│  └─────────┘  └──────────┘  └──────────┘  └────────┘  │
└─────────────────────────────────────────────────────────┘
```

The mobile app uses the **anon key** with Row Level Security enforced at the database. The admin dashboard uses the **service-role key** exclusively in server-side Next.js components and server actions — the key is never sent to the browser.

---

## Project Structure

```
Quest! (monorepo root)
├── apps/
│   ├── mobile/                   Expo mobile app (player client)
│   │   ├── app/                  Expo Router file-based navigation
│   │   │   ├── (auth)/           Sign in, sign up, forgot password
│   │   │   ├── (tabs)/           5-tab main navigation
│   │   │   ├── quest/[id].tsx    Quest detail page
│   │   │   ├── submit/[questId]  Camera + GPS submission flow
│   │   │   ├── onboarding.tsx    3-screen Victoria pilot introduction
│   │   │   └── ...               Edit profile, settings, legal
│   │   ├── components/           Reusable UI components (incl. ReportPostSheet)
│   │   ├── hooks/                Data-fetching hooks (Supabase queries)
│   │   ├── lib/                  Supabase client, constants, types, celebration
│   │   └── __tests__/            Logic and quest-window tests
│   │
│   └── admin/                    Next.js admin dashboard
│       ├── app/                  App Router pages
│       │   ├── login/            Admin login (email allowlist)
│       │   ├── completions/      Read-only completions log (spot-check + remove)
│       │   ├── moderation/       Flagged-post queue — reports + GPS evidence
│       │   ├── quests/           Quest management + GeofenceEditor (draw mode)
│       │   ├── badges/           Badge CRUD and unlock rules
│       │   ├── suggestions/      Community quest suggestion queue
│       │   ├── stickers/         Sticker library (044)
│       │   ├── xp-events/        XP multiplier events (043)
│       │   ├── pilot/            Pilot dashboard (soft fallback without 043/044)
│       │   ├── redeem/           Merchant redemption page (no login)
│       │   ├── users/            User directory
│       │   └── sponsors/         Sponsor completion reports
│       ├── lib/                  Supabase clients (server + SSR), Expo push
│       └── middleware.ts         Auth redirect guard
│
├── packages/
│   ├── geofence/                 @quest/geofence — shared geofence and redemption logic
│   └── db-types/                 @quest/db-types — Database types generated from the local stack
│
├── docs/
│   └── specs/                    Feature specs 01–07 (instant verification era)
│
├── supabase/
│   ├── migrations/               timestamped initial schema + 002–044 (see migration index;
│   │                             045 duo is on cursor/d-duo, held)
│   ├── tests/                    pgTAP suites, run on the CI local stack
│   ├── verify/                   Per-migration verify SQL (039, 041–044)
│   ├── functions/
│   │   ├── _shared/              Push logic shared by both senders, with Deno tests
│   │   ├── send-social-push/     Push for comments, replies and follows (webhook required)
│   │   ├── send-push-outbox/     Outbox sender: weekly drops, recap, win-back (webhook or 041 cron)
│   │   └── deno.json             Deno import map for the functions
│   ├── seed.sql                  Victoria quests, badges and geofence examples
│   └── config.toml               Edge function config
│
├── scripts/db-local/             Throwaway local Supabase stack: apply, verify, pgtap, types, stop
│
├── docs/design/                  Cutouts brand spec (BRAND.md) + UI overhaul plan
├── DESIGN.md                     Earlier Harbour Electric spec (superseded)
├── ARCHITECTURE.md               Visual architecture maps
├── PRODUCT.md                    Product positioning, content engine, safety
├── ROADMAP.md                    Development status, phases, and blockers
└── .github/workflows/            ci.yml (tests, tokens, type checks, Deno) and db-local.yml (local stack)
```

---

## Features

### For Players (Mobile App)

**Discover quests**
- Explore tab shows hero-image quest cards with category colour coding
- Category filters: Fitness, Social, Food, Community, Nature
- Map view with quest location pins across the city
- Completed quests are automatically hidden from the feed

**Complete quests**
- Tap a quest card to view full details (description, XP reward, sponsor info, geofence type)
- Client geofence pre-check via `@quest/geofence` (circle, city, polygon, or anywhere)
- **Server-side geofence trigger** is the authority — inserts outside the zone are rejected
- In-app camera captures photo proof
- Submission uploads to Supabase Storage; the completion **auto-approves at insert** — the celebration shows real total XP, level-ups, the updated streak, and the redemption code for sponsored quests
- Rate limits (2 per 10 min, 10 per 24 h) and Android mock-location blocking guard the unattended gate

**Track progress**
- XP earned instantly on verification; 10-level progression (0 → 15,000 XP)
- Weekly leaderboard resets every Monday — compete for the top spot
- Streak system: maintain a weekly completion streak to build momentum
- Collectible badges with admin-configurable unlock rules and per-badge thresholds

**Social feed**
- Activity tab shows a live feed of approved completions from the community
- See who completed what, their level, and when
- **Report** any post (⋯ menu, five reasons) and **block** users you don't want to see
- **Feed privacy:** a Settings toggle lets you complete quests without publishing to the feed
- Map preview shows quest pin distribution across the city

**Rankings**
- Gold / silver / bronze podium for the top 3 weekly players
- Ranked "chasers" list for positions 4–10
- Featured badges section highlights the community's rarest achievements

**Profile**
- 2×2 stats: level, total XP, current streak, longest streak
- Recent approved completions with timestamps
- Settings for push notification preferences and weekly digest

### For Admins (Dashboard)

**Moderation queue**
- Flagged completions (reported by the community) with photo, report reasons, submitter history, and **GPS-vs-geofence evidence**
- Actions: dismiss reports (post restored) · remove (XP revoked + owner notified by push) · remove-and-allow-retry
- Posts auto-hide from the feed at 3 independent reports pending review

**Completions log**
- Read-only recent completions with photo, GPS, and quest info for spot-checking, with a one-click Remove
- All admin queries run server-side with the service-role key

**Quest management**
- Create and edit quests with title, description, category, XP reward, scheduling (`active_from` / `active_until`)
- **GeofenceEditor:** anywhere / radius slider / Victoria city boundary / **draw custom polygon** on map
- Sponsor fields: sponsor name, reward description, toggle
- Toggle any quest active/inactive without deleting

**User directory**
- Full user list sorted by total XP
- Revalidates every 60 seconds (ISR)

**Sponsor reports**
- Per-sponsor completion metrics
- Export button for CSV/reporting

**Dashboard overview**
- Live counts: total users, approved completions, flagged posts, active quests

---

## Tech Stack

### Mobile

| Technology | Version | Role |
|-----------|---------|------|
| Expo | 54 | Build toolchain, OTA updates, EAS |
| React Native | 0.81.5 | UI framework |
| Expo Router | 6 | File-based navigation |
| TypeScript | 5.9 | Type safety |
| Supabase JS | 2.39 | Database, auth, storage |
| expo-camera | 17 | In-app photo capture |
| expo-location | 19 | GPS geofence verification |
| expo-notifications | 0.32 | Push notification delivery |
| expo-image-picker | 17 | Profile avatar selection |
| react-native-maps | 1.20.1 | Quest pin map |
| react-native-reanimated | 4.1.1 | Tab bar animations |
| AsyncStorage | 2.2 | Session persistence |

### Admin

| Technology | Version | Role |
|-----------|---------|------|
| Next.js | 15.5.28 | Framework (App Router) |
| React | 19.1.0 | UI library |
| TypeScript | 5 | Type safety |
| @supabase/ssr | 0.5.2 | SSR-safe auth client |
| @supabase/server | 1.1 | Service-role admin client |

### Backend

| Technology | Role |
|-----------|------|
| Supabase Auth | Email/password authentication |
| Supabase Postgres | Primary database with RLS |
| Supabase Storage | Photo proof, avatars, quest covers |
| Supabase Edge Functions | Push senders (`send-push-outbox`, `send-social-push`); rewards, redemption codes and the rank snapshot run in the database |
| PostGIS | Geofence enforcement at insert (4 zone types) |
| Row Level Security | Per-user data access enforced at DB layer |

---

## Database Schema

The tables below are an orientation, not a complete current schema dump. Later migrations add
social relations, notifications, quest suggestions, sponsors, weekly-drop outbox tables,
multi-area geofences, cutout/selfie fields and additional profile preferences. Use
[`supabase/migrations/README.md`](supabase/migrations/README.md) and the SQL files as the schema
reference. Client grants can expose fewer columns than a table contains.

### Tables

#### `profiles`
Extends Supabase Auth users with game data.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Matches `auth.users.id` |
| `username` | text | Display name |
| `city` | text | Selected city (e.g., "Victoria") |
| `total_xp` | integer | Cumulative XP across all completions |
| `level` | integer | 1–10; recalculated on each XP change |
| `avatar_url` | text | Public URL from `avatars` storage bucket |
| `push_token` | text | Expo push token for notifications |
| `current_streak` | integer | Consecutive weeks with ≥1 approved completion |
| `longest_streak` | integer | Historical best streak |
| `last_completion_week` | text | ISO week string (e.g., "2026-W25") |
| `last_week_rank` | integer | Prior week's leaderboard rank (011) |
| `feed_public` | boolean | Feed privacy opt-out — `false` hides posts from the public feed (018) |
| `push_social` / `push_drops` | boolean | Social and weekly-drop push preferences (029, 034) |

#### `quests`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Quest identifier |
| `title` | text | Quest name |
| `description` | text | What the player must do |
| `category` | enum | `fitness`, `social`, `food`, `community`, `nature` |
| `lat` / `lng` | float | Quest location coordinates |
| `geofence_type` | enum | `none`, `circle`, `city`, `polygon`, `multi` (migrations 013–015, 024–025) |
| `radius_meters` | integer | Circle radius (50–2000 m) when type is `circle` |
| `boundary` | geometry | PostGIS polygon when type is `polygon` |
| `boundary_geojson` | json (generated) | Client-friendly boundary for map rendering |
| `active_from` / `active_until` | timestamptz | Quest scheduling window (012) |
| `xp_reward` | integer | XP awarded on approval (100–300) |
| `is_sponsored` | boolean | Whether this quest has a sponsor |
| `sponsor_name` | text | Sponsor display name |
| `sponsor_reward` | text | Description of the real-world reward |
| `status` | text | `active` or `inactive` |
| `cover_image_url` | text | Hero image URL for quest cards |
| `cutout_url` | text | Transparent quest cutout asset (032) |
| `action_phrase` | text | Short quest action copy (032) |
| `distance_m` / `duration_min` | integer | Optional distance/time estimate (032) |
| `is_starter` | boolean | Starter quest designation (037) |
| `suggested_by` | uuid | Player credited for a published suggestion (035) |

#### `completions`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Completion identifier |
| `user_id` | uuid (FK) | References `profiles.id` |
| `quest_id` | uuid (FK) | References `quests.id` |
| `photo_url` | text | Proof photo URL in `proof-photos` bucket |
| `selfie_url` | text | Optional private selfie object path (032–033) |
| `lat` / `lng` | float | GPS coordinates at submission time |
| `gps_accuracy` | float | GPS accuracy in meters (026) |
| `completed_at` | timestamptz | Submission timestamp |
| `status` | enum | `approved` (set at insert) or `removed` (moderation); older values may remain for history |
| `redemption_code` | text | Auto-generated at insert for sponsored quests (017) |
| `redeemed_at` | timestamptz | When the merchant marked the code redeemed (Spec 07) |
| `reviewed_at` | timestamptz | Verification timestamp (set at insert) |
| `reviewed_by` | text | Admin who actioned a moderation decision (017) |
| `open_report_count` | integer | Open community reports (maintained by trigger, 017) |
| `hidden_pending_review` | boolean | Auto-hidden from feed at 3 distinct reporters (017) |

#### `completion_reports` (018)

One report per user per post; immutable; can't report your own post; rate-limited (10/24 h) in-DB.

| Column | Type | Description |
|--------|------|-------------|
| `completion_id` | uuid (FK) | Reported post |
| `reporter_id` | uuid (FK) | Who reported |
| `reason` | enum | `not_at_location`, `photo_mismatch`, `inappropriate`, `spam`, `other` |
| `details` | text | Optional free text (≤500 chars) |
| `status` | enum | `open`, `dismissed`, `actioned` |

#### `blocked_users` (018)

Composite PK (`blocker_id`, `blocked_id`). Users manage their own rows; the feed filters blocked users client-side.

#### `cities` (013)

City boundary polygons (PostGIS geography) for city-wide geofences. Pilot row: `victoria-bc`.

#### `badges`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Badge identifier |
| `name` | text | Display name |
| `description` | text | What this badge means |
| `icon` | text | Emoji icon |
| `unlock_condition` | text | Machine-readable condition key |

#### `user_badges`
Junction table. Composite PK on (`user_id`, `badge_id`).

#### `quest_badges`
Links badges to specific quests. Composite PK on (`quest_id`, `badge_id`).

### Views

**`leaderboard`** — Aggregates approved completions from the current ISO week, summing `xp_reward` per user, ordered highest first.

### Key Database Triggers (execution order on submit)

For current column grants and the full evolved schema, see the migration index. In particular,
migration 038 restricts client SELECT columns on `completions`; the public row policy does not
grant access to its excluded GPS, redemption-code or reviewer columns. Migration 039 does the
same for `profiles.push_token` (SEC-01 in the [audit](docs/design/CODEBASE-AUDIT-2026-11-11.md)).
039 was applied to production Nov 11, 2026; run the "Verifying 039" queries in the migration index to confirm.

**`trg_enforce_completion_geofence`** (BEFORE INSERT, 013–015) — validates the submission coordinates against the quest's geofence via `check_completion_geofence()`; inserts outside the zone are rejected. Unbypassable by clients.

**`trg_normalize_completion`** (BEFORE INSERT, 017/026/038) — server-sets the timestamp, enforces rate limits (2/10 min, 10/24 h), sets `status = 'approved'` and `reviewed_at = now()`, and assigns a redemption code only for sponsored quests. Clients cannot choose their own status or preserve a supplied code on a non-sponsored quest.

**`trg_apply_completion_rewards_on_insert`** (AFTER INSERT, 017; hardened in 030/031/038) — calls `apply_completion_rewards()`: XP increment, level recalculation, weekly streak update. Streak and leaderboard weeks use `America/Vancouver` after migration 038.

**`on_xp_update`** (005) — fires on `profiles.total_xp` change; evaluates all badge unlock conditions and inserts newly earned badges.

**`trg_revoke_completion_rewards`** (AFTER UPDATE, 016) — when moderation sets `status = 'removed'`: subtracts the XP (floored at 0), recalculates level, voids an unredeemed redemption code.

**`trg_sync_completion_report_counts`** (017) — maintains `open_report_count` and flips `hidden_pending_review` at 3 distinct open reporters.

### Storage Buckets

| Bucket | Access | Purpose |
|--------|--------|---------|
| `proof-photos` | Public bucket | Place-proof images; completion row visibility is separately controlled by RLS |
| `proof-selfies` | Private | Optional selfie proof, served through authorized signed URLs |
| `avatars` | Public read, auth upload | Player profile photos |
| `quest-covers` | Public read, admin upload | Hero images for quest cards |
| `quest-cutouts` | Public read, admin upload | Quest cutout assets |

### Row Level Security Summary

| Table | Who can read | Who can write |
|-------|-------------|---------------|
| `profiles` | Anyone with the anon key, all columns except `push_token` once migration 039 is applied (before 039, `push_token` too: SEC-01) | Own permitted columns only; XP and progression are server-owned |
| `quests` | All authenticated users (active only) | Admin (service-role) |
| `completions` | Own rows + approved rows that aren't hidden and whose owner has `feed_public = true` (017) | Own rows only (insert) |
| `completion_reports` | Own reports | Own reports (insert only, not own posts) |
| `blocked_users` | Own rows | Own rows |
| `cities` | Everyone | Admin (service-role) |
| `badges` | All authenticated users | Admin (service-role) |
| `user_badges` | Own rows | DB trigger only |

### Migrations

The initial schema is `20260619010246_initial_schema.sql`; numbered follow-ups run from
`002` through `044` in this checkout. `045_duo_quests.sql` is on the `cursor/d-duo` branch and is
held. There is no `001_initial_schema.sql`. Lexical ordering puts the timestamped baseline after
the numbered migrations, so a naive clean-project push order is unsafe. Do not rename files
already recorded in hosted history.

| Range | State |
|---|---|
| Baseline, 002–040 | Applied to production (039 and 040 by the owner on Nov 11, 2026; the 039 verify queries are not recorded) |
| 041–044 | In checkout. Locally tested on the CI local stack. **Not applied.** Apply in order, one per dry-run ([run sheet](docs/design/OWNER-RUNSHEET.md)) |
| 045 | On `cursor/d-duo`. Held for the pilot cohort. Not yet run on a local stack. Not applied |
| 046–053 | Reserved by [build 3](docs/design/BUILD-3-PLAN-2026-11-25.md) §6 |

The complete migration list, descriptions and "Verifying" blocks are maintained in
[`supabase/migrations/README.md`](supabase/migrations/README.md). Most migrations from 039 on also
have a verify file in `supabase/verify/` (039 and 041–044; 040 has none). Local migration presence does not prove remote application
or function and webhook deployment.

**Clean install (local stack).** `scripts/db-local/apply.sh` applies the baseline, then `002`–`044`
in order, then the seed, on a throwaway Supabase stack. `.github/workflows/db-local.yml` runs it in
CI, then the verify pack, the pgTAP suites in `supabase/tests/` and a drift check on
`packages/db-types`. It needs Docker. See the migration index for the steps.

---

## Getting Started

### Prerequisites

- Node.js 22.13+ (required by Expo SDK 58)
- npm (the repo uses npm workspaces and `package-lock.json`)
- [Supabase account](https://supabase.com)
- [Expo Go](https://expo.dev/go) app on your phone (for development) or a simulator

### 1. Clone and install

```bash
git clone https://github.com/your-org/quest.git
cd quest

# Install all workspaces (mobile, admin, geofence) from the repo root
npm install

# Install app dependencies
cd apps/mobile && npm install
cd ../admin && npm install
```

### 2. Set up Supabase

1. Create or select a Supabase project at [supabase.com](https://supabase.com).
2. **Do not apply these files in naive filename order to a fresh project.** The baseline is timestamped `20260619010246_initial_schema.sql`, while numbered follow-ups begin at 002 and sort before it. For a local stack, use `scripts/db-local/apply.sh` (Docker required); CI runs the same script. For a new hosted project, follow "New hosted project" in [`supabase/migrations/README.md`](supabase/migrations/README.md).
3. For the existing Quest project, consult [LAUNCH-RUNBOOK.md](LAUNCH-RUNBOOK.md) before touching its migration history. Do not reapply migrations already recorded there.
4. Run `supabase/seed.sql` only after the complete schema is established.
5. Go to **Project Settings → API keys** (or the **Connect** dialog) and copy your:
   - Project URL
   - publishable key (`sb_publishable_...`)
   - secret key (`sb_secret_...`), for the admin server only

### 3. Configure environment variables

```bash
cp apps/mobile/.env.example apps/mobile/.env
cp apps/admin/.env.example apps/admin/.env.local
```

Fill in both files with your Supabase credentials (see [Environment Variables](#environment-variables) below). The root `.env.example` is only an index of every name the code reads; nothing loads a root `.env`.

### 4. Start the mobile app

```bash
cd apps/mobile
npm start
```

Scan the QR code with Expo Go (Android) or the Camera app (iOS) to run on your device. Use `npm run ios` or `npm run android` to open in a simulator.

#### Demoing on the Android emulator (Windows)

1. Boot an AVD (e.g. `Pixel_8_Pro`; `adb`/`emulator` may not be on your PATH):

   ```powershell
   & "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -avd Pixel_8_Pro
   ```

2. Confirm adb sees it:

   ```powershell
   & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices
   ```

3. Start Expo and open on the emulator (installs Expo Go if missing; you can also press `a` in the Expo terminal):

   ```bash
   cd apps/mobile
   npm run android
   ```

   If the SDK isn't found, set `ANDROID_HOME` to `%LOCALAPPDATA%\Android\Sdk`.

Demo tips:

- **Geofence:** set `EXPO_PUBLIC_BYPASS_GEOFENCE=true` in `apps/mobile/.env` and restart with `npx expo start -c`, or set the emulator location (`...` menu → Location) to a quest site.
- **Camera:** set the AVD camera to Virtual Scene or Webcam so photo quests work.
- **Push notifications:** not supported in Expo Go on Android. Build a dev client with `npx eas-cli build --profile development --platform android` (see `apps/mobile/BUILDING.md`).
- **Test data:** run `supabase/seed.sql` so quests and badges appear, and use a signed-in test account.

### 5. Start the admin dashboard

```bash
cd apps/admin
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in with an email listed in `ADMIN_ALLOWED_EMAILS`.

---

## Environment Variables

### Mobile (`apps/mobile/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Yes | The publishable key (`sb_publishable_...`). The name says ANON_KEY because `lib/supabase.ts` reads that name |
| `EXPO_PUBLIC_EAS_PROJECT_ID` | No | Fallback only; `app.json` `extra.eas.projectId` is used first |
| `EXPO_PUBLIC_POSTHOG_KEY` | No | PostHog project key; no events are sent without it |
| `EXPO_PUBLIC_POSTHOG_HOST` | No | PostHog host, e.g. `https://us.i.posthog.com` |
| `EXPO_PUBLIC_SENTRY_DSN` | No | Sentry DSN; Sentry starts in production builds only |
| `EXPO_PUBLIC_BYPASS_GEOFENCE` | No | Set to `true` to skip GPS checks; honoured only in `__DEV__` builds |

### Admin (`apps/admin/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Your Supabase project URL (server clients and middleware) |
| `SUPABASE_PUBLISHABLE_KEY` | Yes | Publishable key for the session client in server components and middleware |
| `SUPABASE_SECRET_KEY` | Yes | Secret key with service-role access, server only — **never expose to browser** |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Project URL for the browser client (password reset) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Publishable key for the browser client (password reset) |
| `ADMIN_ALLOWED_EMAILS` | Yes | Comma-separated admin email allowlist (e.g. `you@example.com,ops@example.com`). Empty denies all logins in every environment |
| `ADMIN_DEV_ALLOW_ALL` | No | Local dev only: `1` allows any email while the allowlist is empty. Ignored when `NODE_ENV=production`; never set on Vercel |

`apps/admin/.env.example` also lists `SUPABASE_JWKS_URL` and a commented `ADMIN_SITE_URL`. The admin
code in this checkout reads neither.

### Edge functions (Supabase secrets)

| Variable | Read by | Notes |
|----------|---------|-------|
| `DROP_PUSH_WEBHOOK_SECRET` | `send-push-outbox` | Set with `npx supabase secrets set`; the 041 cron sends it from Vault |
| `SOCIAL_PUSH_WEBHOOK_SECRET` | `send-social-push` | Set with `npx supabase secrets set` |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | both | Provided by the Supabase functions runtime |

---

## Mobile App

### Navigation

The app uses [Expo Router](https://expo.github.io/router/) with file-based routing.

**Auth stack** (`app/(auth)/`)

| Route | Screen |
|-------|--------|
| `sign-in` | Email + password login |
| `sign-up` | Account creation; creates profile row on submit |
| `forgot-password` | Send password reset email |

**Main tabs** (`app/(tabs)/`)

| Tab | Route | What's here |
|-----|-------|------------|
| This week | `index` | Weekly highlights, starter quest and featured quests |
| Quests | `quests` | Quest discovery and category browsing |
| City | `feed` | Community activity and social feed |
| Rankings | `leaderboard` | Weekly podium, chasers and featured badges |
| You | `profile` | Player stats, completed cutouts, badges and settings |

**Other routes**

| Route | Purpose |
|-------|---------|
| `quest/[id]` | Quest detail — description, category, XP, sponsor info |
| `submit/[questId]` | Photo capture + GPS submission flow |
| `onboarding` | 3-screen intro shown once on first launch |
| `edit-profile` | Update username and profile details |
| `settings` | Push toggle, **feed privacy toggle**, weekly digest, sign out |
| `legal/privacy` | Privacy policy |
| `legal/terms` | Terms of service |

### Key Hooks

| Hook | File | What it does |
|------|------|-------------|
| `useAuth` | `hooks/useAuth.ts` | Provides session, profile, and sign-out; persists session in AsyncStorage |
| `useQuests` | `hooks/useQuests.ts` | Fetches active quests; accepts optional category filter |
| `useActivityFeed` | `hooks/useActivityFeed.ts` | Queries approved completions with user and quest joins for the feed |
| `useUserCompletions` | `hooks/useUserCompletions.ts` | Returns the current user's completed quest IDs to hide from Explore |
| `useLocation` | `hooks/useLocation.ts` | GPS location with geofence check helper + mock-location detection |
| `useBlockedUsers` | `hooks/useBlockedUsers.ts` | Block/unblock users; feeds the activity-feed filter |

### Quest Submission Flow

```
Explore tab
    │
    ▼
Quest detail page
  (category colour, description, XP, sponsor)
    │
    ▼  tap "Start Quest"
GPS geofence pre-check (@quest/geofence) ─ fail ──→ "You're not close enough"
    │ pass
    ▼
Camera opens (in-app only)
    │ capture photo
    ▼
Photo uploaded to proof-photos bucket
    │
    ▼
INSERT completion → server geofence trigger (013–015)
    │ inside zone
    ▼
Auto-approved at insert (016): rate-limit check → status = approved
  → XP + level + streak applied → badges checked → sponsored code assigned
    │
    ▼
Celebration modal — real total XP, level-up, streak, redemption code
Post appears on the public feed (unless feed_public = false)
```

### XP and Level System

| Level | XP Required |
|-------|------------|
| 1 | 0 |
| 2 | 200 |
| 3 | 500 |
| 4 | 1,000 |
| 5 | 2,000 |
| 6 | 3,500 |
| 7 | 5,500 |
| 8 | 8,000 |
| 9 | 11,000 |
| 10 | 15,000 |

### Badge Catalogue

| Badge | Icon | Condition |
|-------|------|-----------|
| First Quest | 🌟 | Complete 1 quest |
| Getting Warmed Up | 🔥 | Complete 5 quests |
| Local Hero | 🏆 | Complete 10 quests |
| Explorer | 🗺️ | Complete quests in 3+ categories |
| Fitness Fanatic | 💪 | 3+ Fitness quests |
| Social Butterfly | 🦋 | 3+ Social quests |
| Foodie | 🍴 | 3+ Food quests |
| Community Champion | 🤝 | 3+ Community quests |
| Nature Lover | 🌿 | 3+ Nature quests |
| Early Bird | 🐦 | Complete a quest before 9 AM |
| Weekend Warrior | ⚔️ | Complete a quest on a weekend |
| Top 10 | 🎯 | Appear in the weekly leaderboard top 10 |
| Season Veteran | 🎖️ | Streak across 4 consecutive weeks |

---

## Admin Dashboard

The admin dashboard lives at `apps/admin/` and is a standard Next.js 15 app with the App Router.

### Pages

| Route | Purpose |
|-------|---------|
| `/login` | Email sign-in; email must be in `ADMIN_ALLOWED_EMAILS` |
| `/` | Overview dashboard with 4 stat cards (incl. flagged-post count) |
| `/moderation` | Flagged-post queue — reports, GPS evidence, dismiss / remove / remove-and-retry |
| `/completions` | Read-only completions log with spot-check Remove |
| `/quests` | Quest list with edit + active toggle |
| `/quests/new` | Create quest form (incl. geofence draw mode) |
| `/badges` | Badge CRUD, art and unlock rules |
| `/suggestions` | Community quest suggestion queue |
| `/stickers` | Sticker library (needs 044) |
| `/xp-events` | XP multiplier events (needs 043) |
| `/pilot` | Pilot dashboard; falls back softly when 043 or 044 is missing |
| `/redeem/[merchantKey]` | Merchant redemption page; the key in the URL is the credential, no login |
| `/users` | User directory sorted by XP (ISR 60 s) |
| `/sponsors` | Per-sponsor completion counts and export |

### Auth Model

- Admins log in with email/password through Supabase Auth
- `middleware.ts` redirects unauthenticated requests to `/login`
- The `ADMIN_ALLOWED_EMAILS` allowlist is checked at login time
- All database queries use the `service_role` key in server components and server actions — it never reaches the browser

### Moderating a Flagged Completion

There is no approval step — completions verify instantly at submission. The admin's job is post-hoc review of community-reported posts:

1. Navigate to `/moderation` (flagged count shows on the dashboard)
2. Each flagged post shows the proof photo, report reasons and reporters, the submitter's history, and **GPS evidence** — whether the submission coordinates were inside the quest's geofence
3. Choose an action:
   - **Dismiss reports** — reports closed, post restored to the feed
   - **Remove** — status → `removed`; the DB trigger revokes the XP, recalculates level, voids an unredeemed code; the owner gets a push notification
   - **Remove + allow retry** — as above, then deletes the row so an honest re-attempt is possible

---

## Supabase Backend

### Edge Functions

**`send-social-push`**

Called by a Database Webhook on inserts into `notifications` (migration 029). Sends Expo pushes for
comments, replies and follows; likes stay inbox-only. Authenticates with the `x-webhook-secret`
header (`verify_jwt = false`). Not deployed yet: see LAUNCH-RUNBOOK.md Step 0b and run sheet O4.

**`send-push-outbox`**

Drains `push_outbox` (weekly drops from 034; recap and win-back pushes once 041 and 043 are
applied). With 041, a 5-minute pg_cron job calls it through `pg_net` when rows are claimable, using
a URL and secret from Vault. Authenticates with `x-webhook-secret`. Not deployed yet: run sheet O2
and O4.

Both functions keep their logic in `supabase/functions/_shared/` (`pushOutbox.ts`, `socialPush.ts`)
with `fetch` and the Supabase client passed in, so `deno test` can fake them. CI runs `deno check`
and `deno test` from `supabase/functions/`.

**Weekly rank snapshot** now runs in the database: `snapshot_last_week_ranks()` scheduled by pg_cron
(migration 031) every Monday just before midnight Pacific. The `snapshot-ranks` edge function it
replaces was never scheduled and has been removed.

**Retired:** `award-xp` and `generate-redemption-code` were absorbed into database triggers by
migration 017. Both are still deployed on the hosted project and should be deleted
(runbook Step 6).

### Deploying Edge Functions

```bash
# With Supabase CLI (owner only; see the run sheet for secrets and webhooks)
npx supabase functions deploy send-push-outbox
npx supabase functions deploy send-social-push
```

### Local Development with Supabase CLI

Do not use `supabase db reset` or a plain `supabase start` with the migrations folder: filename
order applies `002` before the baseline and fails. Use the db-local scripts instead (Docker
required):

```bash
scripts/db-local/apply.sh        # temp stack: baseline → 002..044 → seed
scripts/db-local/verify.sh       # supabase/verify/*.sql
scripts/db-local/pgtap.sh        # supabase/tests/*.test.sql
scripts/db-local/types.sh        # regenerate packages/db-types (add --check to fail on drift)
scripts/db-local/stop.sh         # tear the stack down

# Edge function tests (Deno)
cd supabase/functions && deno test --allow-env
```

---

## Design System

Quest! uses the **Cutouts** design direction (approved Nov 7, 2026): warm paper and ink,
one bright colour per quest category, Figtree for interface text with the Pilowlava
wordmark, real photographed cutouts you collect, place photos on every quest, and
pillow-shaped proof photos. The full spec is [docs/design/BRAND.md](docs/design/BRAND.md)
and the build plan is [docs/design/UI-OVERHAUL-PLAN.md](docs/design/UI-OVERHAUL-PLAN.md).

| Layer | Location |
|---|---|
| Spec | `docs/design/BRAND.md` |
| Mobile tokens | `apps/mobile/lib/theme.ts` (legacy `COLORS` in `lib/constants.ts` maps onto it) |
| Text primitives | `apps/mobile/components/ui/Text.tsx` |
| Copy helpers | `apps/mobile/lib/copy.js` |
| Token report | `cd apps/mobile && npm run lint:tokens` |
| Admin CSS | `apps/admin/app/globals.css` (restyled in overhaul Phase 6) |

`DESIGN.md` describes the earlier Harbour Electric spec and is kept for history.

---

## Testing & CI

### Unit Tests

`npm test --workspace mobile` runs every file in `apps/mobile/__tests__/` (logic, quest window, recap, profile privacy, push outbox, submission attempt, submission queue, XP events, sticker board, relative time, own selfie path, feedback). The build logs record **290** passing at the end of build 1. `npm test --workspace @quest/geofence` runs the geofence suite (**50 assertions**) and the redemption tests. The admin pilot fallback test is `node apps/admin/__tests__/pilotFallback.test.js`.

Database behaviour is tested with pgTAP in `supabase/tests/` on the CI local stack: **53 assertions** at build 2 card M2 (insert normalisation, privacy, push outbox, storage, XP, stickers, definer hygiene). Edge function logic is tested with Deno in `supabase/functions/_shared/`.

Coverage includes XP/level thresholds, celebration/level-up derivation, leaderboard logic, Haversine and polygon geofence checks, moderation logic, greeting text, and avatar URL helpers.

```bash
npm test --workspace mobile --ignore-scripts
npm test --workspace @quest/geofence --ignore-scripts
cd apps/mobile && npm run lint:tokens -- --strict   # raw tokens must stay at 0
```

### Type Checking

```bash
# Mobile
cd apps/mobile && npx tsc --noEmit

# Admin
cd apps/admin && npx tsc --noEmit
```

### CI (GitHub Actions)

Pushes to `main`, `cursor/**` and `claude/**`, and pull requests targeting `main`, run two workflows.

`.github/workflows/ci.yml`:

1. **geofence-tests** — the `@quest/geofence` workspace tests (geofence and redemption)
2. **logic-tests** — the `mobile` workspace tests
3. **token-report** — `check-tokens.js --strict` (fails on any raw token)
4. **typescript-check-mobile** — `tsc --noEmit` and `expo config` on the mobile app
5. **edge-functions** — `deno check` on both push functions, then `deno test`
6. **typescript-check-admin** — `tsc --noEmit` and `next build` with placeholder env vars
7. **dependency-audit** — `npm audit --omit=dev --audit-level=critical`

`.github/workflows/db-local.yml`: apply the migrations to a throwaway local stack in dependency
order, run the verify pack and the pgTAP suites, and check `packages/db-types` for drift.

---

## Deployment

### Mobile — EAS Build

The mobile app uses [Expo Application Services](https://expo.dev/eas) for builds and OTA updates.

```bash
cd apps/mobile

# Install EAS CLI
npm install -g eas-cli
eas login

# Development build (run on physical device)
npm run build:dev

# Preview build (TestFlight / internal testing)
npm run build:preview

# Production build
npm run build:prod

# Submit to App Store and Google Play
npm run submit:prod

# Push an OTA update without a new store submission
npm run update
```

Build profiles are defined in `apps/mobile/eas.json`.

### Admin — Vercel (Recommended)

```bash
cd apps/admin
npx vercel deploy
```

Set the following environment variables in your Vercel project settings:

```
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ADMIN_ALLOWED_EMAILS
```

Never set `ADMIN_DEV_ALLOW_ALL` on Vercel. LAUNCH-RUNBOOK Step 4 lists what the production
project has.

The admin app uses Next.js ISR for the user directory page (60-second revalidation). All other pages are dynamically server-rendered.

---

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the full phase plan and [docs/specs/README.md](docs/specs/README.md) for feature specs.

**Applied (baseline and 002–040):** geofence drawing and multi-geofences, instant verification,
moderation and the social layer, weekly drops and suggestions, starter quest, merchant
redemption, the Sunday recap (040) and the profile push-token fix (039, verify queries not yet
recorded). None of these is device-verified.

**In checkout and locally tested, not applied:** push draining and the recap push (041),
proof-photo owner policies (042), XP events (043), stickers (044), the offline submission queue,
the admin pilot dashboard, in-app feedback, and the build 1 polish cards. Duo quests (045) are on
`cursor/d-duo`, held. The clean-install order is executed in CI by `scripts/db-local`.

**Operational state:** use the [owner run sheet](docs/design/OWNER-RUNSHEET.md) and the dated
[launch runbook](LAUNCH-RUNBOOK.md) for hosted migrations, keys, webhooks, builds and device
validation. Do not infer deployment from local source. Next work is in the
[build 3 plan](docs/design/BUILD-3-PLAN-2026-11-25.md). Quest chains wait for 35 live quests.
Multi-city and a self-serve sponsor portal remain out of v1 scope.
