# Spec 03 — Reports & Moderation

**Status:** Draft
**Depends on:** Spec 02 (`removed` status + `revoke_completion_rewards`)
**Ship rule:** must release together with Spec 02 — auto-approval without a report mechanism fails both content safety and Apple App Store Guideline 1.2 (UGC apps require reporting, blocking, and moderation).

## Summary

Every quest post in the social feed gets a **Report** action. Reports flag the completion into an admin **Moderation queue**; enough independent reports auto-hide the post pending review. The admin either dismisses the reports or removes the completion — removal revokes the XP (Spec 02 §2.3) and pulls the post from the feed.

This is the safety net that makes instant verification viable: pre-approval review is replaced by community-triggered post-review.

## 1. Data model (migration `017_completion_reports.sql`)

```sql
CREATE TYPE report_reason AS ENUM (
  'not_at_location',   -- "They weren't really there"
  'photo_mismatch',    -- "Photo doesn't show the quest"
  'inappropriate',     -- offensive / unsafe content
  'spam',              -- junk / farming
  'other'
);

CREATE TYPE report_status AS ENUM ('open', 'dismissed', 'actioned');

CREATE TABLE completion_reports (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  completion_id UUID NOT NULL REFERENCES completions(id) ON DELETE CASCADE,
  reporter_id   UUID NOT NULL REFERENCES profiles(id)    ON DELETE CASCADE,
  reason        report_reason NOT NULL,
  details       TEXT CHECK (char_length(details) <= 500),
  status        report_status NOT NULL DEFAULT 'open',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (completion_id, reporter_id)          -- one report per user per post
);
```

**RLS:**
- INSERT: `reporter_id = auth.uid()` AND reporter is not the completion's owner (enforced via a `WITH CHECK` subquery).
- SELECT: reporters can read their own reports (drives "you reported this" UI state). Admin reads via service role.
- No UPDATE/DELETE for users — reports are immutable once filed.

**Report counters on completions:**

```sql
ALTER TABLE completions
  ADD COLUMN open_report_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN hidden_pending_review BOOLEAN NOT NULL DEFAULT false;
```

Maintained by an `AFTER INSERT/UPDATE` trigger on `completion_reports`:
- recount `open` reports for the completion;
- when distinct open reporters ≥ **`AUTO_HIDE_THRESHOLD = 3`** → `hidden_pending_review = true` (post disappears from the feed until an admin rules);
- when reports are dismissed → counter drops, `hidden_pending_review = false`.

**Feed visibility:** update the migration-008 feed policy (or the `useActivityFeed` query) so the public feed excludes `hidden_pending_review = true` and `status = 'removed'` rows. The owner still sees their own completion (with a "under review" marker) — silent-but-visible-to-self avoids tipping off bad actors mid-review while not vanishing honest users' history.

## 2. Mobile UX (`apps/mobile`)

**`components/FeedPostCard.tsx`**
- Add an overflow **⋯** button (top-right of the card header, 44×44 pt touch target).
- Menu for others' posts: **🚩 Report post**. Own posts: no report entry (server enforces too).
- Report flow (bottom sheet):
  1. Reason list — *"They weren't at the location" / "Photo doesn't match the quest" / "Inappropriate content" / "Spam" / "Something else"* (maps to the enum).
  2. Optional free-text (500 chars) for `other`/`inappropriate`.
  3. Confirm → insert into `completion_reports`.
- After reporting: the card collapses to a quiet *"Reported — thanks for keeping Quest real."* stub for that user (local state + `reports` join on subsequent fetches). Duplicate report (unique violation) resolves to the same stub.
- Copy stays on-brand: matter-of-fact, no moralizing.

**Feed query (`hooks/useActivityFeed.ts`):** exclude hidden/removed posts (§1); left-join the viewer's own reports to render the stub state after refresh.

**Removal notice (owner-facing):** when an admin removes a completion, the owner gets a push — *"Your '[quest title]' completion was removed after review. The XP has been returned."* — and the item shows as removed in their profile history. No public shaming; the feed post just disappears.

## 3. Admin UX (`apps/admin`)

New **Moderation** section (replaces the old approval queue as the review surface; nav item where Completions sat).

**Queue (`/moderation`):** completions with ≥ 1 open report, ordered by open-report count desc, then oldest first. Each row/card shows:
- proof photo (full-size on click), quest title + geofence type, submitter username + level + join date;
- **GPS check:** submitted coords vs the quest fence — "inside fence (±12 m)" or distance outside — computed via `check_completion_geofence` / PostGIS distance. This is the admin's strongest signal for `not_at_location` claims;
- reports: reason breakdown, reporter usernames, free-text details;
- submitter history: total completions, previously removed count (repeat-offender signal, highlighted at ≥ 2).

**Actions (server actions in `app/moderation/actions.ts`, service role):**

| Action | Effect |
|---|---|
| **Dismiss reports** | All open reports → `dismissed`; `hidden_pending_review` cleared; post returns to feed |
| **Remove completion** | Status → `removed` (Spec 02 revocation trigger: −XP, level recalc, code voided); reports → `actioned`; owner push sent |
| **Remove + allow retry** | As above, then delete the completion row so the `unique(user_id, quest_id)` constraint permits an honest re-attempt (for "right person, wrong photo" cases) |

Every action writes `reviewed_by` (admin email) + `reviewed_at` — reuse the existing column. Idempotency: actions no-op if the completion is already `removed` (mirrors the double-processing guard the old approval action had).

**Dashboard (`app/page.tsx`):** "Flagged" stat = completions with open reports; links to `/moderation`.

## 4. Blocking users (required for App Store, small scope)

Guideline 1.2 requires *block* alongside *report*. Minimal v1:

```sql
CREATE TABLE blocked_users (
  blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
```

RLS: users manage their own rows. The ⋯ menu gains **Block @username**; `useActivityFeed` filters posts from blocked users client-side (fine at pilot scale; move server-side with the follow graph later). No other product surface changes in v1.

## 5. Abuse of the report system itself

- One report per user per completion (unique constraint).
- Rate limit: max 10 reports per user per day (trigger check, same pattern as Spec 02 §6).
- Report-brigading (3 friends mass-reporting a rival to hide their post): auto-hide is temporary and always lands in front of the admin, who sees the GPS check and can dismiss; dismissed reports count against reporters in the queue's "reporter history" tooltip. No automated punishment in v1 — pilot scale doesn't need it.

## 6. Notifications & copy summary

| Event | Recipient | Channel | Copy |
|---|---|---|---|
| Post auto-hidden (3 reports) | — | none | silent; admin queue only |
| Completion removed | owner | push + profile history state | "Your '[quest]' completion was removed after review." |
| Reports dismissed | — | none | post silently returns |

## 7. Testing

- SQL: report insert bumps counter; 3 distinct reporters auto-hide; dismiss un-hides; remove triggers XP revocation exactly once; owner cannot report own post; duplicate report rejected.
- Mobile logic tests: menu visibility (own vs others' posts), stub state after report, feed filter for hidden/removed/blocked.
- Admin: dismiss/remove idempotency; remove-with-retry deletes the row and permits re-submission.

## 8. Out of scope (v1)

- Automated strikes/bans, shadowbanning, ML content screening
- Reporting profiles/avatars/usernames (add before public launch if avatars become abusable)
- Appeals flow (admin email in the removal push suffices at pilot scale)
