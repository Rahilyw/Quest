# Security review, build 2 (card Z), Nov 25, 2026 (32 findings)

**Scope:** `git diff 7b587ae...cursor/build-2`, which is the build-1 base through build 2 at
`3c332b9`, plus migrations 041–044 in full. Applied migrations (the baseline and 002–040) were
read only where 041–044 build on them.

**Method:**
- Three independent reviewers worked read-only in a detached worktree, with no build history:
  - A: database, RLS and storage;
  - B: admin and server code;
  - C: mobile privacy and edge functions.
- The coordinator then checked every P0 and P1 finding against the code. One finding was
  re-rated: C-1 is a conflict between two design docs, not a confirmed bug.
- No SQL was executed, no hosted service was touched, and nothing was deployed.

**How to use this table:**
- **Owner** says who fixes the row:
  - `Cursor` means fix it now, on `cursor/z-security`;
  - `Owner` means a hosted setting or a decision;
  - `Later` means it's tracked, with no fix in build 2.
- Rows marked **046** need a new forward migration, because the policy or function lives in an
  applied migration. 046 is reserved for exactly this (build-3 plan §6). **The owner approved
  DZ-2 on Nov 25, 2026**, so Cursor writes 046 to the spec in "Migration 046" below, and only
  that spec.
- Fixes inside 041–044 are made in place while their run-sheet rows are unticked. With every
  fix, add a pgTAP or Node test when the finding is a rule.

## Owner decisions (answered Nov 25, 2026)

The owner accepted all three recommendations:

- **DZ-1:** selfies are owner only for R1.
- **DZ-2:** 046 is approved.
- **DZ-3:** the owner will check the dashboard. It isn't confirmed done yet.

| # | Decision | Recommendation |
|---|---|---|
| DZ-1 | **Who sees selfies?** `BRAND.md` (selfie section) says the selfie appears wherever the proof photo does, under the same visibility rules. Card E4 (CURSOR-HANDOFF) says "Only the owner ever sees it (D6)". The code does both: `PhotoViewer.tsx:86` signs other players' selfies, which storage policy 033 allows for any viewer of a visible completion. Own-profile views use `ownSelfiePath`. | **Owner only for R1.** It's the safer default for strangers' faces in a public city feed, it matches E4 and the Verified-screen copy, and it can be widened later. If you pick owner only, C-1 becomes P0 and needs a client fix plus 046 for the 033 policy. If you pick BRAND, close C-1 and fix the privacy copy (C-10). |
| DZ-2 | Approve migration **046_storage_and_token_hardening.sql** for A-1, A-3, C-3 (server part) and, under DZ-1 = owner only, C-1 (server part) | **Yes.** These are real gaps in applied migrations, and 046 can land before or after 041–044 because it only touches the baseline policies and 033. |
| DZ-3 | Hosted Auth: confirm that "Confirm email" is on for the production project, and pre-create every allowlisted admin account before adding it to `ADMIN_ALLOWED_EMAILS` | Yes. It's a dashboard check (B-1). |

## Findings

| ID | Sev | Owner | File:line | Issue | Fix | Status |
|---|---|---|---|---|---|---|
| C-1 | P0 (DZ-1 = owner only) | Cursor + 046 | `apps/mobile/components/PhotoViewer.tsx:86`; `hooks/useQuestPhotos.ts:19`; `user/[id]/index.tsx:94`; `033_selfie_signed_url_access.sql:15-40` | Other players' selfies are signed and shown in the quest-page viewer. Build 2 made this live by fixing the `useQuestPhotos` filter (M3), so the photo stack now loads. | Client: wrap the call in `ownSelfiePath(photo.user_id === viewerId, …)`, and drop `selfie_url` from the non-owner selects. 046: replace the 033 SELECT policy on `proof-selfies` with owner (plus service role) only. | fixed in ff77430 |
| A-1 | P1 | Cursor (046) | `20260619010246_initial_schema.sql:151-153` | `"Anyone can view proof photos"` is a SELECT policy on `storage.objects` for proof-photos with no role and no folder limit. That policy also lets anyone **list** the bucket. Since 042 the paths are `<user>/<quest>/<attempt>`, so the anon key can list any player's quest history, including players with `feed_public = false`, blocked pairs and removed posts. | 046: drop the policy. Public URLs keep working on a public bucket without it. If owners need to list, add an owner-only folder policy. pgTAP: anon and another user can't list `<victim>/`. | fixed in ff77430 |
| C-2 | P1 | Cursor | `apps/mobile/lib/auth-linking.ts:16-27` | Any `quest://…#access_token=…` link replaces the current session (login CSRF). A victim who taps an attacker's link silently becomes the attacker's account. Their next proofs, selfies and coordinates then go to that account, and their offline queue is purged. | Set `flowType: 'pkce'` in `lib/supabase.ts` and use `exchangeCodeForSession`. Accept auth links only while a reset or sign-in started on this device is pending, and never overwrite a live session without confirmation. Add a Node test for the guard. | fixed in ff77430 |
| C-3 | P1 | Cursor + 046 | `lib/notifications.ts:59-66`; `hooks/useAuth.tsx:48-58,70-78` | A push token can sit on two accounts at once. It's cleared only by an explicit `signOut()`, and that clear's errors are ignored. Expiry or revocation (the SIGNED_OUT event) leaves the token behind, and registering doesn't take it off other rows. A's pushes, including comment text, then show on B's phone. This is likely with test devices in R1. | Client: clear the token on every SIGNED_OUT path, and retry before sign-out finishes. 046: a definer `register_push_token(text)` that nulls the same token on other profiles and checks the `ExponentPushToken[…]` format (also covers C-6). | fixed in ff77430 (client clear on every sign-out path; 046 trigger `trg_profile_push_token` per the 046 section, instead of an RPC) |
| D-1 | P0 candidate | Cursor (test), then 046 if it fails | `023_account_deletion.sql:27`; `032_quest_cutouts.sql:89` | Found by card K2. `delete_own_account()` deletes `storage.objects` rows directly with SQL. Newer Supabase storage versions refuse direct deletes from the storage tables, so account deletion may fail on production. That would break App Store 5.1.1(v) and the player's right to delete. It isn't proven either way: there's no test, and production can't be queried. | Add a pgTAP test that calls `delete_own_account()` as a user who owns a proof photo and a selfie, on the CI local stack (same storage version as the pinned CLI). If it fails, 046 moves file removal to the Storage API, for example an edge function the app calls before the RPC. The owner also runs the runbook Step 5 deletion test on production before submitting. | test added in ff77430, CI result pending; **owner still proves on production before App Review** |
| A-2 | P2 | Cursor (in place: 042, 043) | `042:28,47`; `043` `normalize_completion_on_insert` | The 042 "claimed" guard matches `photo_url LIKE '%/proof-photos/' \|\| name`, but `photo_url` is free client text. Adding `?v=1` keeps the photo displaying, makes the guard miss, and lets the owner swap the image after approval. | In 043's `normalize_completion_on_insert`, reject `photo_url` unless it's the canonical public URL under `proof-photos/<NEW.user_id>/<NEW.quest_id>/`. In 042, compare exact paths. pgTAP for both. | fixed in ff77430 (042 exact-path compare; 043 canonical URL check). Carry the INVALID_PHOTO_URL block into 045's redefinition of `normalize_completion_on_insert` if it has one |
| A-3 | P2 | Cursor (046) | `initial_schema:147-149` | The proof-photos INSERT policy has no folder check, so A can upload into `<B>/…`. | 046: `WITH CHECK ((storage.foldername(name))[1] = auth.uid()::text)`. pgTAP. | fixed in ff77430 |
| A-4 | P2 | Cursor (in place: 044) | `044:68-71,453` | `"Anyone can read stickers" USING (true)` is open to anon. It leaks titles, alt text and art for drafts and for weekly drops that haven't opened yet (034 hides those quests). | Policy: `is_active AND (quest_id IS NULL OR EXISTS (select 1 from quests q where q.id = stickers.quest_id))`, which applies the quests RLS as the caller. pgTAP: anon can't read an unreleased quest's sticker. | fixed in ff77430 |
| A-11 | P2 | Cursor | `supabase/verify/043.sql:109-126` | The first-finisher check **commits a real completion in production** and only tells the operator to mark it removed afterwards. Run sheet O5 would leave test data behind. | Wrap it in `BEGIN … ROLLBACK`, or move it to pgTAP (043_xp already proves it) and remove it from the verify file. | open, **fix before O5** |
| B-1 | P2 | Owner (DZ-3) + Cursor | `apps/admin/lib/admin-auth.ts:29`; `lib/require-admin.ts:16` | Admin access is keyed on an email any player can register through mobile sign-up. If confirmation is off, or an allowlisted address has no account yet, an attacker gets service-role admin. | Cursor: also require `user.email_confirmed_at`. Owner: DZ-3. Later: key admin access to `app_metadata.role`. | fixed in ff77430 (Cursor part: confirmed email; owner DZ-3 setting still open) |
| B-2 | P2 | Cursor | `apps/admin/app/quests/actions.ts:197-205` | Quest covers keep their client-declared Content-Type in a public bucket, so an SVG or HTML file is possible (stored XSS on the storage origin). | Sniff with sharp (png/jpeg/webp only) and set the type from the detected format. Bucket MIME and size limits are owner settings or later. | fixed in ff77430 |
| B-3 | P2 | Cursor | `apps/admin/lib/sticker-pipeline.js:273,285` | sharp has no `limitInputPixels`, so a decompression bomb can take the admin function down. | `{ limitInputPixels: 40_000_000 }` on both calls. | fixed in ff77430 |
| C-4 | P2 | Cursor | `supabase/functions/_shared/socialPush.ts:138-143` | Expo error messages, which include the push token, are logged and returned in the response. | Log only `details.error` and the id; return a fixed string. Deno test. | fixed in ff77430 |
| C-5 | P2 | Cursor | `_shared/socialPush.ts:111-147` | A non-2xx from Expo counts as success, so social pushes are dropped silently. | Check `res.ok` and `status === 'ok'` before `markPushed`. Deno test. | fixed in ff77430 |
| C-6 | P2 | Cursor + 046 | `_shared/pushOutbox.ts:212-219,246-249` | One foreign-project token fails a whole batch of 100, and the stored errors can list other users' tokens. | 046 format check (C-3). Split the batch on a request-level 400, and strip tokens from logs and `last_error`. Deno test. | fixed in ff77430 |
| C-7 | P2 | Cursor | `hooks/useSubmissionQueue.tsx:125-136` | Sign-out race: a flush in flight can re-save the queue, with coordinates, after the purge. | Set a signing-out flag before the purge, and refuse to commit when the owner has changed. Node test. | fixed in ff77430 |
| C-8 | P2 | Cursor | `lib/submissionQueueStore.ts:26-29,118-128`; `settings.tsx:137-139` | Queued photos live in a backed-up folder. Orphan folders aren't cleaned up. Deletion purges only after the RPC returns. | Exclude the folder from backup. On sign-in, remove every `queue/*` folder except the current user's. Purge in a `finally` around delete. | partly fixed in ff77430 (orphan folders removed on sign-in, purge in a `finally`). Backup exclusion needs a native or `app.json` change outside the Z file list: owner/follow-up |
| C-9 | P2 | Cursor | `components/AnalyticsProvider.tsx:24-29` | PostHog GeoIP is on, so every event gets an IP-derived location. Opt-out is never offered to the player. | `disableGeoip: true`, plus an analytics toggle in Settings. | fixed in ff77430 |
| C-10 | P2 | K6 (build 3), not Z | `apps/mobile/app/legal/privacy.tsx:86-90` | The copy says proof photos are in a private bucket. Place photos are public URLs. | Rewrite it to match DZ-1's answer. | open |
| A-5 | P3 | Cursor (in place: 044) | `044:448-453` | The new sticker tables keep the default ALL grants; only RLS stops writes. | `REVOKE ALL … FROM PUBLIC, anon, authenticated`, then grant back what's intended. pgTAP: a client INSERT into `user_stickers` is refused. | fixed in ff77430 |
| A-6 | P3 | Cursor (in place: 044) | `044:267-273` | Retired (inactive) stickers are still granted. | Add `AND s.is_active`. | fixed in ff77430 |
| A-7 | P3 | Later | `044:112-125` | The 60-placement cap can be raced. | An advisory lock per user. | open |
| A-8 | P3 | Cursor (in place: 044) | `044:177-183` | `cutout_alt` under 3 characters makes the whole quest save fail. | Fall back to the title. | fixed in ff77430 |
| A-9 | P3 | Later | `044:394-411` | `can_view_sticker_page` over RPC reveals whether a user has blocked you. | Revoke EXECUTE from authenticated if RLS still works without it. | open |
| A-10 | P3 | Later | `043:349,390` | Admin moves from approved to rejected and back can pay XP twice. There's no client path. | Revoke on any move away from approved, and award once (a paid flag). | open |
| B-4 | P3 | Later | `036:79-104` | One shared redeem rate bucket per sponsor, so a leaked merchant link can lock the counter out. | A per-IP limit in the action; count only failed lookups. | open |
| B-5 | P3 | Cursor | `apps/admin/app/sponsors/page.tsx:32,97` | Every redemption code is sent to the client `ExportButton` and sits in the ISR cache. | Pass counts only; make the page `force-dynamic`. | fixed in ff77430 |
| B-6 | P3 | Cursor | `apps/admin/app/completions/actions.ts:27` | `select('*')` sends GPS coordinates and codes to the admin browser. | Select explicit columns and cap `limit` on the server. | fixed in ff77430 |
| B-7 | P3 | Cursor | `apps/admin/app/stickers/actions.ts:143-156` | `grantSticker` doesn't enforce the manual or season rule. | Look the sticker up and refuse other rules. | fixed in ff77430 |
| C-11 | P3 | Cursor | `apps/mobile/lib/sentry.ts:16-20` | Breadcrumbs carry query strings and storage paths. | `beforeBreadcrumb` and `beforeSend` that strip them. | fixed in ff77430 |
| C-12 | P3 | Later | `_shared/pushOutbox.ts:344`, `socialPush.ts:45` | The webhook secret is compared with `===`. | Constant-time comparison. | open |
| C-13 | P3 | Cursor | `send-social-push/index.ts:196-198` | DeviceNotRegistered can wipe a token that was re-registered in the meantime. | `.eq('push_token', sentToken)`. | fixed in ff77430 |

## Migration 046 (approved by the owner Nov 25, 2026, under DZ-2)

**File:** `supabase/migrations/046_storage_and_token_hardening.sql`.

**Requires:** the baseline, 023, 032, 033, 037 and 039. It doesn't depend on 041–045, and they
don't depend on it.

**Order exception:** the owner applies 046 before TestFlight build #1, which is before 045
(duo, O13). This is the one approved exception to the build-3 §6 order rule. When O13 comes,
the owner runs `db push --remote --include-all`, and the dry-run must list exactly
`045_duo_quests.sql`.

What 046 contains, and nothing else:

1. **A-1.** Drop `"Anyone can view proof photos"`. Add an owner-only SELECT policy:
   `TO authenticated USING (bucket_id = 'proof-photos' AND (storage.foldername(name))[1] = auth.uid()::text)`.
   Owners still need SELECT for the 042 upsert and retry path. Public URLs keep loading,
   because the bucket stays public.
2. **A-3.** Replace `"Authenticated users can upload proof photos"` with the same folder
   check in `WITH CHECK`. First confirm that `lib/submitCompletion.ts` always uploads under
   `<auth.uid()>/…`.
3. **C-1.** Replace the 033 policy `"Viewers can view permitted proof selfies"` with an owner
   folder check on `proof-selfies`. Admin reads use the service role and are unaffected.
   Leave `can_view_selfie_object` in place, but revoke EXECUTE from authenticated once
   nothing references it.
4. **C-3 and C-6.** Add a `BEFORE INSERT OR UPDATE OF push_token` trigger on `profiles`,
   as a SECURITY DEFINER with `SET search_path`:
   - it rejects a non-null token that doesn't match `^ExponentPushToken\[[A-Za-z0-9_-]+\]$`;
   - it sets `push_token = NULL` on every other profile that holds the same value.

   Keep the 029 column grant, so builds already installed keep working.
5. **K2.** `set_starter_quest(p_quest_id)` raises unless the quest's `geofence_type = 'none'`.
   Redefine it with `CREATE OR REPLACE`, and keep its revokes and grants exactly as in 037.

**D-1 is not in 046 unless its test fails.** First add `supabase/tests/023_account_deletion.test.sql`.
It calls `delete_own_account()` as a user who owns a proof photo and a selfie. If the test
passes on the CI local stack, D-1 closes. If it fails because direct storage deletes are
refused, **stop and report**: the fix needs an edge function and a deploy, which is the
owner's call.

**Each item gets:**
- a pgTAP test in `supabase/tests/046_hardening.test.sql`, covering anon and another user both
  failing to list `<victim>/`, cross-folder upload refused, a non-owner unable to read a selfie
  object, the token format check, dedupe, and the starter-quest guard;
- `supabase/verify/046.sql`, read-only;
- a "Verifying 046" README block that opens with a Requires line;
- `scripts/db-local/apply.sh` extended to 046;
- a regenerated `packages/db-types`;
- a new row **O9b: Apply 046 → verify** in `docs/design/OWNER-RUNSHEET.md`, after O9, using the
  same dry-run gate.

## Checked and clean

- Every admin server action and route calls `requireAdmin()` first. Sessions are checked with
  `getUser()`. An empty allowlist denies everyone in production. The service-role key never
  reaches a client file. No secrets are tracked in git, and the run sheet has placeholders only.
- Merchant keys are 48 hex characters, and `mark_redemption` can't redeem twice in a race.
- The sticker pipeline checks the format from the bytes and refuses SVG. Storage paths are built
  on the server.
- `/pilot` shows aggregates only.
- 041 and 043: every definer function sets `search_path` and is revoked from clients.
  `xp_awarded` can't be written by a client. The first-finisher and win-back checks are
  serialised. Vault is read only inside a service-role definer.
- Mobile: no release-build bypass (both the geofence bypass and the demo login are dev-only).
  Clients never write XP, streaks or stickers. "Verified" shows only after the server accepts.
  Analytics event properties carry no coordinates, names or free text. Session replay is off.
  Share cards have no selfie.

## Tests to add (not covered today)

- A client-supplied `xp_awarded` is ignored.
- Client INSERTs into `user_stickers` and `xp_events` are refused.
- A `photo_url` with a query string is rejected (A-2).
- Anon can't list `proof-photos` (A-1, after 046).
- Anon can't read the sticker of an unreleased quest (A-4).
