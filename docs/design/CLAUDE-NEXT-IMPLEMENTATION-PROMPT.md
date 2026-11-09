# Claude handoff: implement the Sunday recap

Copy the prompt below into Claude Code from the Quest repository root.

---

## Prompt

You are continuing implementation in the Quest! monorepo. Audit the current checkout, then
implement the next product feature: **the Sunday recap share card from Spec 06 §2**. The
Cutouts redesign is the visual source of truth. Deliver a complete mobile flow, not just a
proposal.

### Read first

- Check `git status`, branch and recent commits. Preserve uncommitted user changes; do not
  reset, clean, rebase, merge or switch branches without a clear need.
- Read applicable `AGENTS.md` files, `docs/specs/06-growth-engagement.md`,
  `docs/specs/04-analytics-instrumentation.md`, `docs/design/BRAND.md`,
  `docs/design/UI-OVERHAUL-PLAN.md` and `ROADMAP.md`.
- Inspect `ShareCompletionCard`, `ShareStoryModal`, existing `react-native-view-shot` and
  `expo-sharing` use, Rankings, leaderboard/completion queries and push/outbox code before
  designing new data or duplicating existing behavior.

### Current implementation state (Nov 9, 2026)

- Commit `5221cdb` added weekly drops, community suggestions and merchant redemption. Their
  migrations 034–036 are local. The weekly push outbox function is not deployed, and the
  merchant flow has not been tried live. Do not rebuild these features or claim deployment.
- Migration 037 and the working changes designate the seeded anywhere journal quest, let
  admins choose another live starter quest, and surface it on This week until a player records
  their first completion. Preserve these changes. Migration 037 is local.
- Per-completion Cutouts share cards already exist. They are not the weekly recap.
- Remaining Spec 06 features are recap, XP events, offline submission queue and duo quests.
  Build one complete slice at a time.

### Recap requirements

1. Add a recap screen reachable from Rankings throughout the week. Show the player's weekly
   rank, XP, streak and best proof photo from the selected week.
2. Align week boundaries with the product's `America/Vancouver` timezone: Monday 00:00 to the
   following Monday 00:00. Define whether the screen shows the current or most recently
   completed week, including when opened Monday or later. Make the selected period explicit;
   never combine weeks or use the current leaderboard for a prior week.
3. Render a Cutouts share image on-device, using existing card, pillow, brand and capture
   patterns where they fit. Use only the signed-in player's own proof photo and stats. Never
   include another player's content or selfie. Sharing must be an explicit user action; do
   not auto-open the share sheet or publish automatically.
4. Add the Sunday-evening reminder only if the existing push/outbox source can deliver it
   safely and respects notification preferences. If cron/function configuration is needed,
   implement the source and document deployment separately; do not claim delivery or remote
   deployment.
5. Track `share_completed { surface: 'recap' }` through the existing analytics wrapper. Keep
   event properties minimal; never send images, usernames or precise location.
6. Handle no completions, no available photo, loading/error, share cancellation and retry
   states without data loss or a false success message.

### Product and security constraints

- Follow `BRAND.md`: warm paper and ink, Figtree interface type, existing tokens, category
  color as information, accessible contrast, sentence-case local copy, reduced motion and
  large-text layout.
- Reuse existing components and do not replace the per-completion share card.
- Respect leaderboard and completion privacy, RLS, feed visibility/block rules, and signed
  private selfie access. The recap may read the player's own proof even when their feed is
  private; it must not broaden access to anyone else's proof.
- Keep service-role credentials server-side. Avoid schema changes unless the database cannot
  supply correct week/rank data. Any needed migration must be forward-only and documented.
- Preserve geofence verification and XP/reward triggers.

### Completion bar

- Implement the complete recap flow and link it from Rankings.
- Cover week selection and recap data rules with focused tests, and run relevant checks for
  touched packages. Report exact commands/results; don't claim device or remote-backend
  verification unless performed.
- Update Spec 06, the specs index, `ROADMAP.md` and design progress notes. Record local versus
  deployed migration and push state accurately.
- Leave XP events, offline queue and duo quests as later slices; end with behavior, changed
  files, checks, deployment dependencies and remaining work.

Start by checking the working tree and reading Spec 06 §2, then implement the recap.

---

## Audit links

- [Spec 06 — Growth & Engagement](../specs/06-growth-engagement.md)
- [Product roadmap](../../ROADMAP.md)
- [Cutouts design status](UI-OVERHAUL-PLAN.md)
