# Building Quest! (mobile)

Step-by-step path for a new developer to produce the first runnable EAS build.

## Prerequisites

- Node.js 20+ and npm
- Expo account ([expo.dev](https://expo.dev))
- Apple Developer account (iOS) and/or Google Play Console (Android) for store builds
- Supabase project URL and anon key (from the Quest! Supabase dashboard)

## 1. Install dependencies

From the monorepo root:

```bash
npm install
```

Or from this app only:

```bash
cd apps/mobile
npm install
```

## 2. Local environment (optional, for `expo start`)

```bash
cd apps/mobile
cp .env.example .env
```

Fill in `.env` using `.env.example` as a template:

| Variable | Where to get it |
|----------|-----------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API (anon/public key) |
| `EXPO_PUBLIC_EAS_PROJECT_ID` | Printed by `eas init` (step 3); optional locally if `app.json` already has `extra.eas.projectId` |

## 3. Link the Expo project (`eas init`)

**You must run this yourself** — it requires your Expo login and creates the project in the Expo dashboard.

```bash
cd apps/mobile
npx eas init
```

When prompted, create or link a project. `eas init` prints a **project ID** (UUID).

## 4. Replace placeholders before the first real build

Search the repo for `REPLACE_` and update every match.

### `app.json`

- `extra.eas.projectId` — paste the UUID from `eas init`
- `updates.url` — should become `https://u.expo.dev/<your-project-id>` (often updated automatically by `eas init`)

### `eas.json`

Replace `REPLACE_WITH_REAL_VALUE` in each build profile's `env` block with your Supabase values (same as `.env`):

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_POSTHOG_KEY` (production/preview — analytics no-ops without it)
- `EXPO_PUBLIC_POSTHOG_HOST` (default `https://us.i.posthog.com`)
- `EXPO_PUBLIC_SENTRY_DSN` (production — crash reporting; disabled in `__DEV__`)

Alternatively, store secrets in EAS and remove inline values:

```bash
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://..."
eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJ..."
```

### `eas.json` submit block (production store submit only)

Replace before `npm run submit:prod`:

- `REPLACE_WITH_APPLE_ID` — Apple ID email
- `REPLACE_WITH_APP_STORE_CONNECT_APP_ID` — App Store Connect app ID
- `REPLACE_WITH_APPLE_TEAM_ID` — Apple Developer Team ID
- `google-service-account.json` — Android service account key (path in `eas.json`)

## 5. Build commands

Run from `apps/mobile` after placeholders are set:

| Command | Profile | Use case |
|---------|---------|----------|
| `npm run build:dev` | `development` | Dev client; iOS simulator + physical devices |
| `npm run build:preview` | `preview` | Internal TestFlight / APK for QA |
| `npm run build:prod` | `production` | Store-ready release |

Each script runs `eas build --profile <name> --platform all`. To target one platform:

```bash
eas build --profile preview --platform ios
```

## 6. Push notifications

Push requires:

- A valid EAS project ID in `app.json` (`extra.eas.projectId`) or `EXPO_PUBLIC_EAS_PROJECT_ID`
- A **physical device** — simulators cannot receive remote push
- A **development or production build** — Expo Go on Android does not support push for this app; use a dev client or preview/production build

After installing a build, sign in so `registerForPushNotifications` can save the Expo push token to the user's profile.

## 7. OTA updates (after a build is installed)

```bash
npm run update -- "fix: short description of change"
```

Requires `updates.url` and `runtimeVersion` in `app.json` to match your linked EAS project.

## Quick checklist

- [ ] `npm install` in `apps/mobile`
- [ ] `.env` copied from `.env.example` (local dev)
- [ ] `npx eas init` in `apps/mobile`
- [ ] `app.json` → `extra.eas.projectId` set (no `REPLACE_AFTER_RUNNING_eas_init`)
- [ ] `eas.json` → Supabase env vars set (no `REPLACE_WITH_REAL_VALUE`)
- [ ] `npm run build:preview` succeeds
- [ ] Push tested on a physical device with a non–Expo Go build
