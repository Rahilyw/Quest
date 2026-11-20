# Owner run sheet (O1–O12)

One-page checklist for the ultra plan §5 owner track. Apply migrations in order
**041 → 042 → 043 → 044**. Before each apply, dry-run must list **exactly one** file.
Paste verify SQL into **Supabase → SQL Editor** (project `xuviwarpgvxzpouqesrv`).
Do not edit applied migrations. Agents never run these against hosted services.

Working directory for every PowerShell block:

```powershell
cd C:\Users\rahil\Documents\Projects\Quest
```

| # | Step | Do this | Verify | Done |
|---|---|---|---|---|
| **O1** | Verifying 039 (already applied) | Paste [`supabase/verify/039.sql`](../../supabase/verify/039.sql) into SQL Editor. Paste results into the campaign ledger. | `supabase/verify/039.sql` | [ ] |
| **O2** | Apply 041 → verify → Vault | Dry-run must list **only** `041_push_outbox_draining.sql`:<br>`npx supabase db push --remote --dry-run`<br>Then: `npx supabase db push --remote`<br>Vault (SQL Editor, replace placeholders):<br>`SELECT vault.create_secret('https://xuviwarpgvxzpouqesrv.supabase.co/functions/v1/send-push-outbox','push_outbox_function_url');`<br>`SELECT vault.create_secret('<DROP_PUSH_WEBHOOK_SECRET>','push_outbox_webhook_secret');`<br>Confirm Database → Extensions → `pg_net` enabled. | `supabase/verify/041.sql` | [ ] |
| **O3** | Apply 042 → verify | Dry-run must list **only** `042_proof_photo_owner_policies.sql`:<br>`npx supabase db push --remote --dry-run`<br>Then: `npx supabase db push --remote` | `supabase/verify/042.sql` | [ ] |
| **O4** | Deploy push functions + webhooks; drain >100 | Secrets + deploys:<br>`npx supabase secrets set DROP_PUSH_WEBHOOK_SECRET=<long random>` *(skip if set)*<br>`npx supabase secrets set SOCIAL_PUSH_WEBHOOK_SECRET=<long random>`<br>`npx supabase functions deploy send-push-outbox`<br>`npx supabase functions deploy send-social-push`<br>Dashboard → Database → Webhooks:<br>1. `public.notifications` Insert → POST `…/functions/v1/send-social-push`, header `x-webhook-secret`<br>2. Optional: `public.weekly_drop_sends` Insert → POST `…/functions/v1/send-push-outbox`, same header<br>Drain test: runbook Step 0c SQL (150 rows → `invoke_push_outbox_drain`). | Runbook Step 0c drain queries (not a verify file) | [ ] |
| **O5** | Apply 043 → verify; admin `/xp-events` | Dry-run must list **only** `043_xp_events.sql`:<br>`npx supabase db push --remote --dry-run`<br>Then: `npx supabase db push --remote`<br>Deploy admin build that includes `/xp-events` (Vercel owner deploy). | `supabase/verify/043.sql` | [ ] |
| **O6** | Merge PR #15 → `main` | GitHub → PR #15 → Merge (after card H CI green). New card branches cut from `main` after this. | — | [ ] |
| **O7** | Apple + ASC + `eas.json` | Enroll: https://developer.apple.com/programs/enroll/<br>Team ID: https://developer.apple.com/account → Membership<br>ASC app: https://appstoreconnect.apple.com → My Apps → + → iOS **Quest!**, bundle `com.quest.app`<br>Fill `apps/mobile/eas.json` `submit.production.ios`: `appleId`, `ascAppId`, `appleTeamId` | — | [ ] |
| **O8** | PostHog + Sentry | PostHog: https://us.posthog.com/signup → project **Quest! Mobile** → disable Session replay<br>`cd apps\mobile`<br>`npx eas-cli env:create --scope project --name EXPO_PUBLIC_POSTHOG_KEY --value phc_… --environment production`<br>`npx eas-cli env:create --scope project --name EXPO_PUBLIC_POSTHOG_HOST --value https://us.i.posthog.com --environment production`<br>Build 4 dashboards (runbook Step 2).<br>Sentry: https://sentry.io → React Native **quest-mobile**<br>`npx eas-cli env:create --scope project --name EXPO_PUBLIC_SENTRY_DSN --value <dsn> --environment production` | — | [ ] |
| **O9** | Apply 044 stickers → verify | Close PR #16 first (owner). Dry-run must list **only** `044_stickers.sql`:<br>`npx supabase db push --remote --dry-run`<br>Then: `npx supabase db push --remote` | `supabase/verify/044.sql` | [ ] |
| **O10** | TestFlight build #1 + device checks | `cd apps\mobile`<br>`npx eas-cli login`<br>`npm run build:prod`<br>`npm run submit:prod`<br>ASC → TestFlight → add internal tester.<br>Device: runbook Step 5 (geofence, offline queue, XP, stickers, recap). | — | [ ] |
| **O11** | Content (~25 stickers) | Admin https://kuest-admin.vercel.app → upload ~25 sticker photos, `cutout_alt`, `action_phrase` on live quests. | Content readiness on admin Pilot page (after card P) | [ ] |
| **O12** | Step 6 clean-up; invite R1 | `npx supabase functions delete award-xp`<br>`npx supabase functions delete generate-redemption-code`<br>`npx supabase functions delete snapshot-ranks`<br>Dashboard → Authentication → Settings → enable leaked-password protection.<br>Invite 10–20 locals (TestFlight / cohort). | — | [ ] |

## Dry-run gate (O2, O3, O5, O9)

```powershell
cd C:\Users\rahil\Documents\Projects\Quest
npx supabase db push --remote --dry-run
```

| After | Dry-run must list exactly |
|---|---|
| Before O2 | `041_push_outbox_draining.sql` |
| Before O3 | `042_proof_photo_owner_policies.sql` |
| Before O5 | `043_xp_events.sql` |
| Before O9 | `044_stickers.sql` |

If the list is wrong, **stop**. Do not push.

## Related

- Full detail: [LAUNCH-RUNBOOK.md](../../LAUNCH-RUNBOOK.md)
- Ultra plan §5: [ULTRA-PLAN-2026-11-20.md](ULTRA-PLAN-2026-11-20.md)
- Migration notes: [supabase/migrations/README.md](../../supabase/migrations/README.md)
