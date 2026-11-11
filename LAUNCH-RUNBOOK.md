# Quest! Launch Runbook — Your Remaining Steps

**Last updated:** November 11, 2026

This runbook records hosted/credential-dependent launch steps. It does not mean all engineering
work is complete: the Nov 11 code audit found a profile `push_token` exposure (SEC-01) and a
clean-install migration ordering hazard. The fix for the first is written as migration 039 and
is **not applied** (Step 0a). See
[the audit](docs/design/CODEBASE-AUDIT-2026-11-11.md) and
[roadmap](ROADMAP.md). Steps below that need **your accounts** (Apple, PostHog, Sentry, Vercel)
or hosted-project access remain owner tasks. Work top to bottom; each step says what it unblocks.

---

## Step 0 — Database migrations ✅ through 038

**Status (Nov 10, 2026):** `migration list --remote` shows **002–038** and
`20260619010246` on production project Quest (`xuviwarpgvxzpouqesrv`). An earlier
history row, `20261109032058`, was the same cutouts SQL as **032** under a timestamp.
That row was marked reverted, then **032** was applied under its real version.

**038** is live. Anon and authenticated have no table-level SELECT on `completions`.
Column SELECT covers the public columns only. `redemption_code`, `lat`, `lng`,
`gps_accuracy`, and `reviewed_by` are not granted. Owners read a sponsor code through
`own_completion_reward` / `own_reward_codes`.

A dev build older than this working tree fails quest submission until it is updated.
The insert returns `id`, then asks for the code. There is no TestFlight/store binary
yet, so this is a dev-build cutoff.

Weekly-drop rows are written by **034**. No phone receives them until
`send-push-outbox` is deployed.

The sender processes at most 100 pending outbox rows per invocation and returns a remaining
hint; confirm the webhook or a scheduled drain invokes it again until caught up before relying
on delivery to a large audience.

The Supabase CLI targets the local stack by default, so always pass `--remote`.

Do not push again. The Nov 7 instruction to apply `delete_own_account` is already done; that function has been on production since migration 023, and 032 extended it to delete proof selfies.

---

## Step 0a — Apply 039 and 040 (15 min) 🔴 not done

Two migrations exist only in the repository. Nothing below has been run.

- **039** stops anyone with the anon key from reading `profiles.push_token` (SEC-01). Until it
  is applied the production database still exposes every player's Expo push token.
- **040** adds `own_week_recap`, which the Sunday recap screen calls. Without it the recap
  screen shows its "couldn't load" state.

Order:

1. Put every test phone on a build from this checkout **first**. After 039, a build that
   still sends `select=*` on `profiles` cannot load its profile and looks signed out.
2. Dry-run and read the list. It should name exactly 039 and 040:

   ```powershell
   cd C:\Users\rahil\Documents\Projects\Quest
   npx supabase db push --remote --dry-run
   ```

3. If the list is right, apply:

   ```powershell
   npx supabase db push --remote
   ```

4. Run the checks under "Verifying 039" in
   [`supabase/migrations/README.md`](supabase/migrations/README.md). The repository tests only
   read the SQL text; these queries are the real proof.
5. Open Settings on a phone: "Quest alerts" should show the real state and toggle both ways.
6. Open Rankings → the recap row. Check a week with quests, a week without, and Share.

Neither file's SQL has been executed anywhere. If the push fails, stop and read the error; do
not edit an applied migration.

---

## Step 0b — Social push delivery (10 min) 🟠

The Nov 10 migration report includes 027–029, which provide likes, comments, follows, comment
reports, rate limits and the Activity inbox. Do not push those migrations again. **Push** for
comments, replies and new followers needs the Edge Function and webhook:

```powershell
cd C:\Users\rahil\Documents\Projects\Quest
npx supabase secrets set SOCIAL_PUSH_WEBHOOK_SECRET=<long random string>
npx supabase functions deploy send-social-push
```

Then in the Supabase dashboard → **Database → Webhooks → Create a new hook**:

- Table: `public.notifications`, Events: **Insert** only
- Type: **HTTP Request**, Method `POST`,
  URL `https://<project-ref>.supabase.co/functions/v1/send-social-push`
- HTTP header: `x-webhook-secret` = the same random string

**Verify:** follow a test account from another device — the followed phone gets
"New follower", and Edge Functions → `send-social-push` → Logs shows `pushed: true`.
Likes never push (inbox only) by design.

---

## Step 0c — Weekly drop push (migration 034) 🟠

The SQL job `enqueue_weekly_drop()` writes `push_outbox`; phones get nothing until you deploy
the function and webhook. The Nov 10 migration report includes migration 034. Do not push it
again as part of this step. Before enabling delivery, verify the sender's batch-drain behavior
and delivery preferences, then:

```powershell
cd C:\Users\rahil\Documents\Projects\Quest
npx supabase secrets set DROP_PUSH_WEBHOOK_SECRET=<long random string>
npx supabase functions deploy send-push-outbox
```

In the Supabase dashboard → **Database → Webhooks → Create a new hook**:

- Table: `public.weekly_drop_sends`, Events: **Insert** only
- Type: **HTTP Request**, Method `POST`,
  URL `https://<project-ref>.supabase.co/functions/v1/send-push-outbox`
- HTTP header: `x-webhook-secret` = the same random string

Cron (created by 034 if `pg_cron` is installed) calls the enqueue at 16:15 and 17:15 UTC
on Mondays so both PST and PDT land near 09:00 Victoria. An empty Monday does not lock
the week. A second run the same week inserts nothing.

**Verify:** insert a quest with `active_from` earlier today (Victoria Monday), call
`select enqueue_weekly_drop();` from the SQL editor, confirm one `weekly_drop_sends` row
and `push_outbox` rows, then confirm the function log says `pushed`. Do not treat a
successful enqueue as a delivered notification.

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
   > ⚠️ Don't add `EXPO_PUBLIC_POSTHOG_KEY` / `EXPO_PUBLIC_SENTRY_DSN` to the `env` block in `apps/mobile/eas.json` — values there override EAS environment variables. (The app also ignores `REPLACE_…` / `your_key` placeholder values, so a leftover placeholder disables the SDK instead of breaking it.)
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

## Step 4 — Admin dashboard production env on Vercel ✅ Done Nov 7, 2026

Project `kuest-admin` (root directory `apps/admin`). All seven variables from
`apps/admin/.env.example` are set for Production and Preview, and production is live at
<https://kuest-admin.vercel.app>. Builds had failed since Aug 10 because the project had
**no** variables; the table below previously listed the wrong names.

| Name | Notes |
|---|---|
| `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key |
| `SUPABASE_JWKS_URL` | Auth JWKS endpoint |
| `SUPABASE_SECRET_KEY` | Server-only. Switch it to **Sensitive** in Vercel (still Encrypted) |
| `ADMIN_ALLOWED_EMAILS` | Comma-separated admin emails |

Original instructions, kept for reference (variable names corrected above):

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

## Step 6 — Clean-up from the Nov 2026 audit 🟡

- **Delete retired edge functions** still deployed: `award-xp` and
  `generate-redemption-code` (retired by migration 017), and `snapshot-ranks` (031 is
  applied). All require the service-role secret, so they aren't publicly callable, but they're
  dead code. `npx supabase functions delete <name>`.
- **Enable leaked-password protection:** Supabase → Authentication → Settings.
- **`send-social-push` is not deployed** and no notifications webhook exists (Step 0b), so
  comment, reply and follow pushes don't send. The in-app inbox works.
- **Known advisor notes, intentional:** `leaderboard` is a definer view so weekly XP counts
  every player; PostGIS lives in `public` and `spatial_ref_sys` has no RLS (moving PostGIS is
  risky and not needed for the pilot).

---

## Done when

- [x] Migrations 023 and 027 to 038 applied (confirmed Nov 10, 2026)
- [ ] Migrations 039 and 040 applied, 039 checks run (Step 0a)
- [ ] Recap screen and share checked on an iPhone and an Android phone
- [ ] `send-social-push` deployed + notifications webhook created
- [ ] TestFlight build installed on your phone
- [ ] PostHog shows live events + 4 dashboards exist
- [ ] Sentry DSN set as EAS secret
- [x] Admin deployed to production on Vercel with env vars (Nov 7, 2026)
- [ ] Admin login verified on <https://kuest-admin.vercel.app>
- [ ] Retired edge functions deleted; leaked-password protection on
- [ ] Account deletion verified on a device

After this list, the remaining work is post-launch product (Specs 05–07): weekly
drops, community quests, growth loop, merchant redemption — see ROADMAP.md.
