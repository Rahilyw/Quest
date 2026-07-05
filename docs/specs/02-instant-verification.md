# Spec 02 — Instant Verification (remove the approval system)

**Status:** ✅ Implemented (July 2026) — migration `016_instant_verification.sql`
**Depends on:** migration `013` (geofence enforcement on insert); Spec 01 recommended first
**Must ship with:** Spec 03 (reports & moderation) in the same release — shipped together (migration `017`)

> **Implementation notes (deltas from this spec):** `completions.redeemed_at` (Spec 07 §2) landed early in 016. Rewards logic was extracted to `apply_completion_rewards()` + `level_from_xp()`; the `AFTER UPDATE` trigger remains for moderation re-instates and the one-time pending backfill. The admin completions page is now a read-only log with `getRecentCompletions` / `removeCompletion`; `PendingQuestItem` and all pending UI were deleted; the celebration shows real total XP, level-up, streak, and redemption code via `lib/celebration.ts`.

## Summary

Being inside the geofence with an in-app camera photo **is** the proof. Completions are approved at the moment of insert; XP, level, streak, badges, and (for sponsored quests) redemption codes fire instantly. The admin approval queue is removed and replaced by post-hoc moderation (Spec 03).

**Player-visible change:** submit at the location → the celebration modal shows your *real* new XP, level-up, and updated streak, seconds after you were actually there. No more "awaiting approval" limbo. (This also fixes the known stale-streak-in-celebration bug — the streak is now updated before the modal renders.)

## 1. Trust model

| Threat | Mitigation |
|---|---|
| Submitting from home for a location quest | Server-side geofence trigger (013) rejects the insert — already live |
| GPS spoofing (Android mock locations) | Block when `Location.getCurrentPositionAsync` returns `mocked: true` (client) — see §6 |
| Wrong/junk photo at the right location | In-app camera only (already enforced — `launchCameraAsync`, no gallery picker) + community reports + admin removal with XP revocation (Spec 03) |
| Completion farming | One completion per quest per user (existing unique constraint) + rate limit (§6) |
| Dev geofence bypass leaking to prod | `bypassGeofence` must be compiled out of production builds (`__DEV__` guard) — verify in release checklist |

Post-moderation replaces pre-moderation. This is the same trade Strava, BeReal, and every UGC feed makes — and at pilot scale (one city, admin knows the community) the abuse surface is small while the retention upside is large.

## 2. Database changes (migration `016_instant_verification.sql`)

### 2.1 Auto-approve on insert

A `BEFORE INSERT` trigger normalizes every completion server-side — clients cannot choose their own status:

```sql
CREATE OR REPLACE FUNCTION normalize_completion_on_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  NEW.status      := 'approved';
  NEW.reviewed_at := now();   -- semantic: "verified_at"; kept for leaderboard-view compat
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_normalize_completion
  BEFORE INSERT ON completions
  FOR EACH ROW EXECUTE FUNCTION normalize_completion_on_insert();
```

Ordering note: `BEFORE INSERT` triggers fire alphabetically — `trg_enforce_completion_geofence` (013) runs before `trg_normalize_completion`, so the geofence gate still runs first. Keep the names as-is.

The weekly `leaderboard` view filters on `reviewed_at >= date_trunc('week', now())` — with `reviewed_at = now()` at insert this keeps working unchanged.

### 2.2 Rewards fire on the insert path

The XP/level/streak logic lives in `award_xp_on_approval()` (redefined in `006`), attached to `AFTER UPDATE` only. Refactor:

- Extract the body into `apply_completion_rewards(p_user_id UUID, p_quest_id UUID)` — XP increment, level recalc, weekly-streak update, exactly as in 006.
- `AFTER INSERT ... WHEN (NEW.status = 'approved')` → calls it (the new normal path).
- Keep `AFTER UPDATE` trigger for the moderation path only (re-instating a wrongly-removed completion re-applies rewards).

Badges need **no change**: the `on_xp_update` trigger (005) fires on any `profiles.total_xp` change, so badge unlocks chain off the insert path automatically.

### 2.3 Reward revocation (needed by Spec 03)

```sql
ALTER TYPE completion_status ADD VALUE IF NOT EXISTS 'removed';  -- (own migration file, see 014 note)

CREATE OR REPLACE FUNCTION revoke_completion_rewards() RETURNS TRIGGER ...
-- AFTER UPDATE WHEN (OLD.status = 'approved' AND NEW.status = 'removed'):
--   total_xp := greatest(total_xp - quest_xp, 0); level recalc;
--   redemption_code := NULL when not yet redeemed
```

Documented decisions (keep it simple, revisit if abused):
- **Badges are not revoked** on removal. Recomputing badge history backwards is complex and the stakes are low; a moderator can note repeat offenders instead.
- **Streaks are not rewound.** The weekly streak counter reflects behavior at the time; retroactive rewinding creates confusing UX for a marginal integrity gain.

### 2.4 Redemption codes move in-DB

Today the admin action invokes the `generate-redemption-code` edge function after approving. Replace with a trigger so sponsored quests reward instantly:

```sql
CREATE TRIGGER trg_assign_redemption_code
  AFTER INSERT ON completions FOR EACH ROW
  WHEN (NEW.status = 'approved')
  EXECUTE FUNCTION assign_redemption_code();  -- port code-gen logic from the edge function to SQL
```

The `generate-redemption-code` edge function is retired (or kept only as an admin "regenerate" utility).

### 2.5 Backfill

One-time: `UPDATE completions SET status='approved', reviewed_at=now() WHERE status='pending';` — the AFTER UPDATE rewards trigger awards their XP. Pilot has no real users, so this is safe; run before deploying the new mobile build.

### 2.6 Duplicate-completion debt (resolved as a side effect)

`unique(user_id, quest_id)` no longer creates the "rejected → can never retry" dead end, because rejection no longer exists pre-award. A `removed` row still blocks resubmission — that's now a *feature* (cheaters don't get a second try without admin intervention). The admin "remove" flow may optionally delete the row instead of flagging it `removed` when the admin wants to allow a retry (moderation UI offers both — Spec 03).

## 3. Mobile changes (`apps/mobile`)

**`app/submit/[questId].tsx`**
- Delete the pending-state machinery: `alreadySubmitted` pending banner ("⏳ Awaiting approval…"), `alreadyPending` celebration variant, the `status: 'pending'` insert field (server sets it anyway).
- After a successful insert: `select` the inserted row (returns `redemption_code` for sponsored quests) and refetch the profile, **then** show the celebration with real values: actual new XP total, level-up moment if crossed, true `current_streak`.
- Duplicate insert (`23505`) now means "already completed" → celebration variant `alreadyDone` routing to profile history.

**`components/CompletionCelebration.tsx`**
- Copy changes from "Submitted — pending approval" to earned: **"Quest complete! +150 XP"**, streak line, level-up state, and — for sponsored quests — the redemption code / "Show this at the counter" card.
- This is now the *only* reward moment, so it can carry weight without violating the "earned, not given" principle — the effort already happened at the location.

**`components/PendingQuestItem.tsx`**, profile "Pending Quests" section, and any `status === 'pending'` handling in `useUserCompletions` / profile: **deleted**.

**Push notifications:** the "Quest Approved! 🎉" push (sent by `award-xp`) is obsolete — the user is in-app at reward time. Remove it. (Future: repurpose the channel for "Badge unlocked" / streak reminders.)

## 4. Admin changes (`apps/admin`)

- **`app/completions/`** — the approve/reject queue becomes a read-only **Completions log** (newest first, photo, user, quest, GPS-vs-fence indicator) with a single admin action: **Remove** (invokes the Spec 03 removal flow). Spot-check tool, not a gate.
- **`app/completions/actions.ts`** — `getPendingCompletions` / `updateCompletionStatus` deleted; replaced by `getRecentCompletions` + `removeCompletion` (shared with moderation).
- **Dashboard (`app/page.tsx`)** — "Pending" stat card → "Flagged" (Spec 03 count).
- **`lib/invoke-edge-function.ts`** — no longer needed for the approve path; keep only if other functions still use it (`snapshot-ranks`).

## 5. Edge function changes (`supabase/functions`)

| Function | Fate |
|---|---|
| `award-xp` | Retired from the approval path. Badge logic is redundant with the 005 DB trigger; approval push is obsolete. Delete, or slim to a future badge-push notifier. |
| `generate-redemption-code` | Logic ported into the DB trigger (§2.4); function retired. |
| `snapshot-ranks` | Unchanged. |

## 6. Anti-abuse guards (part of migration 016 + mobile)

- **Rate limit (DB):** in `normalize_completion_on_insert`, reject when the user has ≥ 2 completions in the last 10 minutes or ≥ 10 in the last 24 h (`ERRCODE check_violation`, `HINT 'RATE_LIMITED'`). Generous for honest play (nobody finishes 3 real quests in 10 minutes), hostile to farming.
- **Mock-location block (mobile):** on Android, if the position object reports `mocked`, block submission with "Turn off mock location to submit."
- **Release checklist:** confirm `bypassGeofence` is `__DEV__`-only and absent from production builds.

## 7. Docs & cleanup

- ROADMAP.md: mark the approval queue as removed; move "streak celebration timing" and "duplicate completion UX" gaps to resolved; add Spec 03 items.
- ARCHITECTURE.md: replace the approval-flow sequence diagram with the instant-verification flow:

```
Mobile submit → geofence trigger validates (013)
  → normalize: status = approved, reviewed_at = now
  → apply_completion_rewards: XP + level + streak
  → badge trigger (005) via total_xp update
  → sponsored: redemption code assigned in-DB
  → celebration modal shows real XP / streak / code
  → post appears on the public feed immediately (008)
```

## 8. Testing

- SQL-level: insert inside fence → status approved, XP applied, streak bumped, sponsored code present; insert outside fence → rejected; rate-limit trips; revoke → XP decremented, level recalculated, floor at 0.
- `apps/mobile/__tests__/logic.test.js`: celebration state derivation (level-up boundary cases), duplicate-insert handling.
- E2E happy path on a physical device before release (geofence + camera can't be simulator-verified).
