# Claude handoff: implement the next Quest! features

**Status, Nov 9, 2026 (later):** Spec 05 and Spec 07 are implemented in this working tree.
Do not rebuild them. Migrations `034`, `035`, and `036` are local only. `send-push-outbox`
is not deployed. Quest chains stay deferred. Merchant redemption has not been applied or
tried live. The next feature is Spec 06, one slice at a time, starting with the starter quest.

Copy the prompt below into Claude Code from the Quest repository root.

---

## Prompt

You are continuing implementation in the Quest! monorepo. Audit the current checkout, then
implement the next user-facing features in the sequence already defined by the product specs.
The immediate feature is the **weekly quest drop and community suggestion loop (Spec 05)**.
Implement it end to end in focused increments; do not stop at a plan or redesign already
completed surfaces from scratch.

### Read first

- Check `git status`, branch, recent commits and applicable `AGENTS.md` instructions. Preserve
  existing user changes and do not reset, clean, rebase, merge or switch branches without a
  clear need.
- Read `ROADMAP.md`, `PRODUCT.md`, `docs/specs/README.md`, Specs 04–07, and
  `docs/design/BRAND.md` plus `docs/design/UI-OVERHAUL-PLAN.md` for current visual patterns.
- Inspect relevant code in `apps/mobile`, `apps/admin`, `supabase/migrations`, and existing
  edge functions before designing new schema or duplicating existing behavior.

### Current audit context (Nov 9, 2026)

The current checkout is `cursor/cutouts-this-week-quests`, ahead of `main`. Cursor and Claude
have implemented most of the Cutouts redesign: mobile tokens and core screens; redesigned
quest detail, place/selfie camera, celebration, feed, rankings and profile; private selfie
signing; admin cutout upload; share card, onboarding, icon/splash, admin restyle; and a small
geofence map on the camera screen. Review the actual git history and docs before edits; these
changes are already in the working baseline. The history includes `cca0bcc`, `8121639`,
`68a6cb1`, `74003c5`, `ba32942`, `96349e0`, and `9dd6aa9` in addition to the earlier Cursor
redesign commits.

The most recent implementation record is in `docs/design/UI-OVERHAUL-PLAN.md`. Remaining
design/content work includes real quest photos and cutouts, store screenshots, admin live
folder/bubble preview, and some residual palette/accessibility/device audits. Keep the Cutouts
system for any new UI, but the next priority is product functionality.

Code inspection found these feature gaps:

- `quests.active_from` / `active_until` exist in migration 012, but the app/admin currently
  have no date-based drop flow or reliable active-window surfacing.
- There is no `quest_suggestions` schema, mobile suggestion form, or admin review queue.
- Redemption codes and `completions.redeemed_at` exist, but there is no public merchant
  validation route or redeemed reporting loop (Spec 07).
- There are no duo parties, XP events, offline submission queue, or Sunday recap screen
  (Spec 06). Per-completion share cards exist; they are not the weekly recap feature.
- `ROADMAP.md` still contains Nov 7 statuses that predate the current redesign and later
  Claude work. Verify operational claims from files and available project state; do not treat
  stale “pending” or “done” statements as current fact.

Migrations 032 and 033 are local code changes in this branch. Do not claim they are deployed
or apply migrations to a hosted database in this task. Migration 031 and the production
push/webhook configuration are operational state that must be verified separately.

### Implement next: Spec 05, in its declared sequence

#### Increment 1 — Weekly drops, using existing scheduling columns

Ship the smallest complete weekly-drop feature using `active_from` and `active_until`; do not
add duplicate schedule fields.

1. **Admin scheduling:** expose both timestamps in create/edit quest forms, with sensible
   defaults and a “Next Monday” preset. Show the next scheduled drop count on the dashboard
   so the operator can see an empty drop before Monday.
2. **Mobile availability:** make the quest data hooks respect the active window consistently
   using Victoria time (`America/Vancouver`) and clear inclusive/exclusive boundary rules.
   Surface quests activated in the last 7 days as “New this week” and quests ending Sunday as
   “Ends Sunday”. Ensure future quests do not leak into regular discovery early, while admins
   can still preview and edit them.
3. **Notifications:** inspect the existing push/inbox implementation first. Add the Monday
   drop notification using the project’s established Expo push and preference patterns if the
   code path is coherent. If deployment/webhook/cron setup is unavailable, implement the
   source and document the exact deployment step; never claim a push was delivered or deployed.
4. **Content and measurement:** use existing analytics conventions and add only events needed
   to measure drop visibility and quest starts. Keep empty, loading, error, pull-to-refresh and
   timezone-edge states intentional.

#### Increment 2 — Community quest suggestions and curation

Implement Spec 05 §1 as a full mobile-to-admin vertical slice after the scheduling behavior is
in place.

1. Add a forward-only migration after the highest existing migration number (inspect first;
   034 is expected if 033 remains latest). Add `quest_suggestions`, status, optional location,
   admin notes, and `quests.suggested_by`, following the spec while improving validation and
   indexes as needed.
2. Enforce ownership and the “at most 3 open suggestions per user” rule in the database, not
   only in the UI. A user can create and read their own submissions; status and admin fields
   cannot be self-edited. Admin reads/actions must use existing admin authorization patterns.
3. Add an on-brand mobile form reachable from Quests/You, with title, description, category,
   optional map pin, validation, submitting/success/error states, and a clear expectation that
   publishing is curated.
4. Add an admin review queue with nearby-quest duplicate context (500 m where coordinates
   exist), reject with an optional note, and accept into the existing quest creation/edit
   flow prefilled with the suggestion. Publishing must link the quest and suggester.
5. Award the specified +100 XP and City Author badge progress exactly once when a suggestion
   is published. Use an idempotent database-backed path; do not trust a client-supplied XP
   value or allow retries to double-award. Add/seed the badge consistently with the current
   admin-configurable badge system.
6. Add analytics events only where useful, with no user-submitted free text or precise GPS in
   event properties. Preserve the existing location/privacy policy.

Keep quest chains out of this increment. Spec 05 explicitly defers them until there are about
35 quests; the current seeded content base is still small.

### Next features after Spec 05

Once the weekly-drop and suggestion flow is complete and documented, proceed in this order
unless code inspection reveals a blocker:

1. **Spec 07 merchant redemption:** public `/redeem/[merchantKey]` phone-friendly validation,
   sponsor-scoped lookups, idempotent mark-redeemed action, guessing/rate-limit protection,
   redeemed state in the player UI, sponsor redemption metrics and CSV columns. Keep the
   merchant key unguessable and keep service-role access server-only. Follow the spec’s
   no-login v1 scope.
2. **Spec 06 early activation/share:** starter quest flag/surfacing, then Sunday recap card
   (rank, weekly XP, streak, best own proof photo) using the existing Cutouts share-card
   patterns and explicit sharing consent.
3. **Spec 06 retention/growth:** XP events, offline submission queue, then duo quests. These
   alter reward and completion state, so design DB idempotency, race handling, geofence/rate
   limits and failure recovery before implementing. Do not weaken the instant-verification
   authority.

Do not implement all of Spec 06 in one broad change. Finish each as a reviewable vertical
slice, with an updated spec/roadmap status after each.

### Product, security and design constraints

- Keep the mobile redesign consistent with `docs/design/BRAND.md`: warm paper and ink,
  Figtree interface type, existing tokens and text primitives, category colors as information,
  sentence-case local copy. No return to the superseded Harbour Electric visual system.
- Preserve server-side geofence verification, rate limits, XP/reward triggers, moderation,
  feed privacy, block rules, admin authorization, account deletion and signed private selfie
  access. Do not weaken RLS or expose service-role credentials to mobile/public code.
- Use migrations for schema and security changes. Keep local migration state separate from
  remote deployment state and update `supabase/migrations/README.md`.
- Make reward grants, suggestion acceptance, push enqueueing and redemption idempotent where
  retries or concurrent requests are possible.
- Keep scheduling and weekly metrics aligned with the established `America/Vancouver`
  product timezone and the existing Monday leaderboard boundary.
- Build accessible loading, empty, error, retry and permission-denied states. Respect reduced
  motion, large text, screen readers and outdoor touch targets.
- Keep cutout/photo content status honest. Do not fabricate final Victoria photography or
  report placeholder art as commissioned content.

### Implementation workflow and completion bar

1. Reconcile this audit against the checkout. Update this prompt or the roadmap if facts have
   changed; do not reimplement features already present.
2. Implement Increment 1 completely, then Increment 2, keeping each change focused and
   reviewable. If scope or a genuine dependency requires splitting, finish a complete vertical
   slice and record the next step rather than leaving half-wired UI/schema.
3. Run the existing relevant checks for touched packages and add focused tests for new
   business rules and security-sensitive behavior. Record exact commands and results; do not
   claim device/backend verification unless performed.
4. Update `docs/specs/05-community-quests.md`, `docs/specs/README.md`, `ROADMAP.md`, and
   `docs/design/UI-OVERHAUL-PLAN.md` with implemented state, migration/deployment status,
   operational dependencies and the next feature. Keep older historical notes clearly dated
   so they cannot be mistaken for current status.
5. End with a concise report of user-visible behavior, migrations, checks and limitations.

Start by checking the current git state and reading Spec 05, then implement weekly drops.

---

## Audit source

This handoff reflects a code audit of the current branch on Nov 9, 2026. Files and branch state
can change; Claude must verify them before implementation. For design progress and Cursor/Claude
work provenance, see [UI-OVERHAUL-PLAN.md](UI-OVERHAUL-PLAN.md). For the broader product
sequence, see [ROADMAP.md](../../ROADMAP.md) and [docs/specs/](../specs/README.md).
