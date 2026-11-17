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

## Step 0a — Apply 039 and 040 (15 min) 🟡 applied, checks pending

Applied to production (`xuviwarpgvxzpouqesrv`) by the owner on Nov 11, 2026 with `npx supabase db push --remote --include-all`. Steps 1–3 are done.
The CLI needed `--include-all` because the remote history records the timestamped baseline after
the numbered files. Steps 4–6 (the 039 checks, Settings toggle, recap on device) are not recorded
as done.

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

## Step 0c — Push outbox: weekly drop and Sunday recap (migrations 034 + 041) 🟠

`enqueue_weekly_drop()` (034, Monday) and `enqueue_week_recap()` (041, Sunday 18:00 Victoria)
only write `push_outbox`. Phones get nothing until the sender is deployed and the drain cron
can reach it. The Nov 10 migration report includes 034; do not push it again. **041 is in the
checkout only (not applied, not deployed, not device-verified).**

What 041 changes: the sender now claims rows in batches of 100 and loops for up to 20 batches
or about 50 seconds, checks Expo's HTTP status and ticket shape, retries failures with backoff,
and stops retrying a row after 5 attempts (a dead letter). A pg_cron job calls it every
5 minutes, through `pg_net`, only while rows are waiting. The old one-shot 100-row limit is gone.

**1. Apply and deploy (owner).**

```powershell
cd C:\Users\rahil\Documents\Projects\Quest
npx supabase db push --remote --dry-run    # expect exactly 041
npx supabase db push --remote
npx supabase secrets set DROP_PUSH_WEBHOOK_SECRET=<long random string>   # skip if already set
npx supabase functions deploy send-push-outbox
```

Deploy the function in the same sitting as 041: the new sender calls `claim_push_outbox`,
which only exists after 041, and the old sender does not know about claims.

**2. Vault secrets for the drain cron** (SQL editor; same secret as above):

```sql
SELECT vault.create_secret('https://<project-ref>.supabase.co/functions/v1/send-push-outbox',
                           'push_outbox_function_url');
SELECT vault.create_secret('<DROP_PUSH_WEBHOOK_SECRET value>', 'push_outbox_webhook_secret');
SELECT invoke_push_outbox_drain();   -- expect 'idle' when nothing is queued
```

Check Database → Extensions shows `pg_net` enabled. Then run the checks under
"Verifying 041" in `supabase/migrations/README.md`.

**3. Optional webhook.** The cron delivers within 5 minutes. If you want the Monday drop to go
out the moment it is enqueued, keep (or create) the Database Webhook: table
`public.weekly_drop_sends`, **Insert** only, HTTP `POST` to the function URL, header
`x-webhook-secret` = the same secret. Both callers can run at once; claims stop double sends.

**Schedules.** 034 enqueues the drop at 16:15 and 17:15 UTC on Mondays (about 09:15
Victoria in PST and PDT); an empty Monday does not lock the week. 041 enqueues the recap at
01:00 and 02:00 UTC on Mondays; a local-time guard only lets it run on Sunday at 18:00 or later
in Victoria, and `week_recap_sends` stops a second send that week. The recap goes to players
with a push token, the Weekly digest toggle on (`push_drops`), and approved XP that week.

**Verify — drain more than 100 rows.** Use test accounts you own, on a quiet hour.

```sql
-- 1. Queue 150 rows for one test player who has a real device token and push_drops on.
--    (Same user 150 times is fine for the drain; dedupe_key keeps them distinct.)
INSERT INTO push_outbox (user_id, kind, title, body, data, dedupe_key)
SELECT '<test-user-uuid>', 'weekly_drop', 'Quest!', 'Drain test ' || g,
       jsonb_build_object('type', 'weekly_drop', 'test', true),
       'drain_test:' || g
  FROM generate_series(1, 150) g;

-- 2. Trigger once instead of waiting for the cron.
SELECT invoke_push_outbox_drain();   -- expect 'requested <id>'
```

Then, within a minute:

```sql
SELECT count(*) FILTER (WHERE sent_at IS NOT NULL) AS done,
       count(*) FILTER (WHERE sent_at IS NULL)     AS waiting,
       max(attempts) AS max_attempts
  FROM push_outbox WHERE dedupe_key LIKE 'drain_test:%';
-- expect: done = 150, waiting = 0, max_attempts = 0
```

The function log (Edge Functions → `send-push-outbox` → Logs) should show one line with
`"batches":2`, `"pushed":150` (or `skipped` if the token is missing or the toggle is off)
and `"stop":"drained"`. Expo may rate-limit 150 pushes to one device; rows that fail come back
with `attempts = 1` and a `last_error`, and the next cron run retries them. Clean up:
`DELETE FROM push_outbox WHERE dedupe_key LIKE 'drain_test:%';`

**Verify — failure path.** Temporarily set the Vault URL secret to a wrong path
(`.../functions/v1/send-push-outbox-nope`), queue one row, run `SELECT invoke_push_outbox_drain();`,
and confirm `net._http_response` shows a 404 and the row is still waiting with `attempts = 0`.
Put the secret back. A dead letter shows up as `sent_at IS NULL AND attempts >= 5`.

**Verify — recap push.** On a Sunday after 18:00 Victoria (or wait for the first scheduled
run), with a test account that finished a quest that week: confirm one `week_recap_sends` row,
a `week_recap` outbox row for that player, the phone shows "Your week in Victoria is in.", and
tapping it opens the recap screen. Do not treat a successful enqueue, or an `ok` Expo ticket,
as a delivered notification: check the phone.

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
| `ADMIN_DEV_ALLOW_ALL` | **Do not set on Vercel.** Local-only: `1` lets any email in when the allowlist is empty; ignored in production |

An empty `ADMIN_ALLOWED_EMAILS` denies every login in every environment unless
`ADMIN_DEV_ALLOW_ALL=1` is set locally (outside production).

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
- [x] Migrations 039 and 040 applied (Nov 11, 2026, `db push --remote --include-all`)
- [ ] 039 checks run (Step 0a, step 4)
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
