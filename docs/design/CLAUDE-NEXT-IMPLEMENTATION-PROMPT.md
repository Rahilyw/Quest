# Claude implementation handoff: continue the Cutouts redesign

Copy the prompt below into Claude Code from the Quest repository root.

---

## Prompt

You are continuing implementation in the Quest! monorepo. Your task is to **continue and
finish the Cutouts redesign**, with the redesign as the top product priority. Implement the
next coherent increment in the codebase; do not stop after writing another plan.

### Repository and source of truth

- Read `AGENTS.md` files and applicable agent instructions first. Also read
  `docs/design/BRAND.md`, `docs/design/UI-OVERHAUL-PLAN.md`, `PRODUCT.md`, and the relevant
  app/build docs before editing.
- `docs/design/BRAND.md` is the visual and copy source of truth. The seven-phase execution
  plan and the dated progress snapshot are in `docs/design/UI-OVERHAUL-PLAN.md`.
- The current mobile app is Expo / React Native in `apps/mobile`; the admin app is Next.js in
  `apps/admin`; database changes are in `supabase/migrations`.
- Preserve the product's existing geofence verification, XP/reward logic, social privacy,
  moderation and account-deletion behavior while redesigning their presentation.

### Work already done by Cursor on the side

Cursor has landed redesign work on the current branch, `cursor/cutouts-this-week-quests`.
These commits are in the checkout you are continuing from; inspect the code and git state
before touching anything:

- `ed70048`: new design tokens and primitives, category folders, This week and Quests
  surfaces, `Cutout`/`Pillow`/`Sprite`/scrap components, quest-photo and This week hooks, and
  migration 032 groundwork.
- `55bc433`: redesigned quest detail, location status and the proof photo viewer.
- `86fb7de`: in-app place/selfie camera flow and the Verified celebration.
- `c5e4ecb`: redesigned City/feed bubbles, Rankings, You, notifications, comments and reports.

The exact status and remaining phase work are documented in
`docs/design/UI-OVERHAUL-PLAN.md`. Do not rebuild these completed surfaces from scratch. First
review the actual files and current branch/worktree; commit titles are only an index, not proof
that every checklist item is complete. The Cursor branch may not yet be merged to `main`.

### First: audit the current implementation

Inspect the live code, not only the roadmap. At minimum review:

- `apps/mobile/lib/theme.ts`, `components/ui/Text.tsx`, `components/FontProvider.tsx`, and
  `scripts/check-tokens.js`.
- `app/(tabs)/_layout.tsx`, `index.tsx`, `quests.tsx`, `feed.tsx`, `leaderboard.tsx`, and
  `profile.tsx`.
- `app/quest/[id].tsx`, `app/submit/[questId].tsx`, and the related cutout, pillow, viewer,
  celebration, feed and social components/hooks.
- `apps/admin` quest create/edit forms and `supabase/migrations/032_quest_cutouts.sql`.
- Existing docs and git status, including any user changes. Do not overwrite unrelated work.

Write a short status update in the docs before or as you begin implementation if the current
snapshot has drifted. Identify what is present, what is incomplete, and the single next
increment you will ship.

### Redesign priorities

1. **Close the mobile core-loop gaps and verify the Cutouts behavior.** Compare the current
   This week → Quests → quest detail → zone check → camera → Verified journey against BRAND.md
   and repair concrete gaps in hierarchy, copy, states, accessibility, or navigation. Keep
   real-world proof, geofence enforcement and instant rewards intact.
2. **Finish the data and asset pipeline needed to make the redesign real.** The current
   checkout has migration 032, `scripts/make-cutout.js`, and mobile Cutout components; the
   migration is now listed in `supabase/migrations/README.md`. The admin app has no cutout
   upload/preview flow or populated category defaults. Implement the smallest coherent
   admin-to-mobile path for uploading and previewing a cutout, or document any external asset
   dependency precisely. Never invent production photography or claim the hosted migration
   has been applied.
3. **Resolve privacy-sensitive selfie delivery.** Migration 032 stores selfies in private
   `proof-selfies`. The mobile submission flow writes a storage path to `selfie_url`, while
   the viewer currently accepts only HTTP(S) URLs and deliberately skips bare paths. Add
   short-lived signed URL delivery only for viewers authorized to see the associated
   completion, matching `can_view_completion`/feed privacy and block rules. Do not make
   selfies public or expose a service-role key to mobile. Ensure failures to load an optional
   selfie never block a valid place-proof completion.
4. **Finish the remaining redesign phases.** Audit City, Rankings and You against BRAND.md;
   then continue with the Phase 5 brand surfaces (icon, splash, share card, onboarding) and
   Phase 6 admin styling. Prioritize implementation based on what is actually incomplete and
   ship a focused, coherent increment rather than making superficial edits across every
   screen.
5. **Keep content status honest.** Real Victoria place photography and per-quest cutouts,
   reviewed action phrases, and commissioned sprites remain content work. Make graceful
   fallbacks visually consistent; don't substitute emoji or stock imagery as if it were final.

### Design requirements

- Follow Cutouts: warm paper and ink, Figtree interface type, Pilowlava only for the
  wordmark/icon/splash, and category color used consistently as category information.
- Use the existing theme tokens and text primitives. Avoid new raw color, typography or radius
  values outside the token system; do not bring back the superseded Harbour Electric system.
- Maintain the intended hierarchy and distinct jobs of This week, Quests, City, Rankings and
  You. Badges remain reachable from You, outside the primary tab bar.
- Keep copy in sentence case and in the local, confident voice defined in BRAND.md. No emoji
  category icons, generic app copy, `·` metadata strings, or arrow buttons.
- Support reduced motion, screen readers, large text and practical outdoor touch targets.
  Follow BRAND.md's contrast and accessibility guidance.
- Reuse existing components and data hooks where they fit. Avoid broad rewrites that obscure
  the already-completed Cursor work.

### Engineering and privacy constraints

- Check the working tree before edits. Preserve user changes and do not reset, clean, rebase,
  merge, or switch branches without a clear need.
- Treat migration 032 as a local migration until verified otherwise. Do not apply migrations
  to the hosted Supabase project as part of this task.
- Keep private selfie objects in the private bucket. Any signed URL must be short lived and
  generated through an authorized server-side path; apply the same privacy, hidden-post and
  block checks as the public feed. Avoid leaking private paths into public responses if not
  needed.
- Do not weaken geofence checks, rate limits, RLS, report/block flows or admin authorization.
- Follow existing patterns for loading, empty, error, offline and permission-denied states.
- Keep changes scoped to the redesign increment and its necessary docs/data flow.

### Completion bar

- Implement the chosen increment in the app; a proposal alone is not complete.
- Review the changed screens/components against BRAND.md and make sure no old visual system
  remains in the surfaces you touched.
- Run relevant existing checks for the touched packages (including the mobile token guard
  when mobile UI changes); fix regressions caused by your changes. Do not claim a check passed
  if it was not run.
- Update `docs/design/UI-OVERHAUL-PLAN.md` with what Cursor had already completed, what you
  completed, any remaining blockers/dependencies, and the next recommended phase. Keep the
  Cursor provenance/context so future Claude/Cursor sessions know these changes happened on
  the side and do not duplicate them.
- Update `supabase/migrations/README.md` whenever migration inventory changes. Keep
  `README.md`, `DESIGN.md`, and build docs consistent if implementation changes their claims.
- End with a concise report: files/surfaces changed, behavior delivered, checks run and
  results, migration/deployment state, and remaining redesign work.

Begin by checking git status and reading the design plan and brand spec, then implement the
highest-priority incomplete redesign increment you find.

---

## Handoff notes

The implementation snapshot above reflects repository inspection on Nov 8, 2026. Recheck it
against the current checkout before acting. In particular, migration 032 is present in the
repository but is not evidence that the remote database has been migrated. Cursor's work is
already in this branch's history and should be treated as the baseline for the next phase.
