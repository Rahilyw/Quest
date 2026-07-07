# Quest! Launch Runbook — Your Remaining Steps

**Last updated:** July 6, 2026

Everything code-side is done and committed. The steps below are the ones that need
**your accounts** (Apple, PostHog, Sentry, Vercel) or **your approval** (production DB).
Work top to bottom; each step says what it unblocks.

---

## Step 0 — Apply migration 023 to the live database (2 min) 🔴

Account deletion (App Store requirement) exists in code but the RPC isn't on the
remote database until you push it:

```powershell
cd C:\Users\rahil\Documents\Projects\Quest
npx supabase db push
```

Confirm the prompt lists `023_account_deletion.sql` and answer `Y`.

**Verify:** in the Supabase dashboard → SQL Editor, run
`select proname from pg_proc where proname = 'delete_own_account';` — one row expected.

---

## Step 1 — Apple Developer + iOS submit credentials (30–60 min) 🔴

This is the only thing blocking a TestFlight build.

1. **Enroll in the Apple Developer Program** (if not already): <https://developer.apple.com/programs/enroll/> — $99 USD/yr. Use your personal Apple ID; approval is usually same-day for individuals.
2. **Find your Team ID:** <https://developer.apple.com/account> → Membership details → *Team ID* (10 characters, e.g. `A1BC23DEF4`).
3. **Create the app record in App Store Connect:** <https://appstoreconnect.apple.com> → My Apps → **+** → New App:
   - Platform **iOS**, Name **Quest!**, Language **English (Canada)**
   - Bundle ID: register/select **`com.quest.app`** (must match `app.json`)
   - SKU: anything, e.g. `quest-victoria-001`
4. **Get the ASC App ID:** open the new app in App Store Connect → App Information → *Apple ID* (a number like `6451234567`).
5. **Fill `apps/mobile/eas.json`** — replace the three placeholders under `submit.production.ios`:
   ```json
   "appleId": "your-apple-id-email@example.com",
   "ascAppId": "6451234567",
   "appleTeamId": "A1BC23DEF4"
   ```
6. **First build + submit:**
   ```powershell
   cd apps\mobile
   npx eas-cli login          # your Expo account (owner: rahil1)
   npm run build:prod         # EAS handles signing certs — accept the prompts
   npm run submit:prod        # sends the build to App Store Connect / TestFlight
   ```
7. In App Store Connect → TestFlight, add yourself as an internal tester.

> Android note: `eas.json` expects `./google-service-account.json` for Play submits.
> Defer until you start the Play Store track; TestFlight first.

---

## Step 2 — PostHog project (15 min) 🟠

Analytics code ships in the app but emits nothing until a key exists.

1. Sign up at <https://us.posthog.com/signup> (free tier is plenty for the pilot).
2. Create project **Quest! Mobile** → copy the **Project API key** (`phc_...`).
3. **Privacy:** Settings → disable **Session replay** (proof photos are real people).
4. Local dev — add to `apps/mobile/.env`:
   ```
   EXPO_PUBLIC_POSTHOG_KEY=phc_your_key_here
   EXPO_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
   ```
5. Production builds — store it as an EAS secret so store builds get it:
   ```powershell
   cd apps\mobile
   npx eas-cli env:create --scope project --name EXPO_PUBLIC_POSTHOG_KEY --value phc_your_key_here --environment production
   npx eas-cli env:create --scope project --name EXPO_PUBLIC_POSTHOG_HOST --value https://us.i.posthog.com --environment production
   ```
6. **Verify:** run the app (`npm start`), sign in, open a quest — events
   (`quest_viewed`, `feed_viewed`, …) appear in PostHog → Activity within ~1 min.
7. **Build the 4 dashboards** (Spec 04, docs/specs/04-analytics-instrumentation.md):
   - **Activation funnel:** `signed_up` → `quest_viewed` → `quest_started` → `proof_submitted` → `completion_verified`
   - **WAU retention:** retention insight on `completion_verified`, weekly
   - **Week-2 leaderboard return:** retention on `leaderboard_viewed`, weekly
   - **Content conversion:** `quest_viewed` → `completion_verified` broken down by `quest_id`

---

## Step 3 — Sentry project (10 min) 🟡

1. Sign up at <https://sentry.io> → Create project → platform **React Native** → name **quest-mobile**.
2. Copy the **DSN** (Settings → Client Keys).
3. Add as an EAS secret (Sentry init is production-only, so `.env` is optional):
   ```powershell
   cd apps\mobile
   npx eas-cli env:create --scope project --name EXPO_PUBLIC_SENTRY_DSN --value https://your-dsn@o0.ingest.sentry.io/0 --environment production
   ```

---

## Step 4 — Admin dashboard production env on Vercel (10 min) 🔴

The admin app denies **all** logins until `ADMIN_ALLOWED_EMAILS` is set.

1. <https://vercel.com> → your admin project (or `cd apps\admin && npx vercel deploy` for the first deploy).
2. Project → Settings → Environment Variables → add for **Production**:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://xuviwarpgvxzpouqesrv.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your anon key (Supabase → Settings → API) |
   | `SUPABASE_SERVICE_ROLE_KEY` | your service-role key — **server-side secret** |
   | `ADMIN_ALLOWED_EMAILS` | `rahilwijeyesekera1@gmail.com` |

3. Redeploy, then log in at the production URL with that email.

---

## Step 5 — Release-integrity spot checks (before submitting for review) 🟠

- **Mock-location/bypass stripped:** confirm no `EXPO_PUBLIC_BYPASS_GEOFENCE` in any
  production env/EAS secret, and submit once on a real device to confirm the geofence gate.
- **Account deletion E2E:** on a device build, create a throwaway account, complete a
  quest, then Settings → Delete Account — confirm the feed post, XP, and login all disappear.
- **Icons:** `assets/icon.png`, `adaptive-icon.png`, `splash.png` are now real brand
  marks (generated by `scripts/gen-app-icons.js`). If you later get designed art,
  drop the files in at the same paths — nothing else to change.
- **Sponsored quest E2E:** complete one sponsored quest on a device and confirm the
  redemption code appears in the celebration.

---

## Done when

- [ ] Migration 023 applied (`npx supabase db push`)
- [ ] TestFlight build installed on your phone
- [ ] PostHog shows live events + 4 dashboards exist
- [ ] Sentry DSN set as EAS secret
- [ ] Admin login works on the production Vercel URL
- [ ] Account deletion verified on a device

After this list, the remaining work is post-launch product (Specs 05–07): weekly
drops, community quests, growth loop, merchant redemption — see ROADMAP.md.
