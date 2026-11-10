# Quest! campaign ledger

Durable state for the Nov 2026 audit-and-implementation campaign. One current status per item.
Updated at every phase boundary. Historical notes are labelled as history.

## 1. Baseline (recorded Nov 10, 2026, 15:12 PT)

| Fact | Value |
|---|---|
| Branch | `cursor/cutouts-this-week-quests`, tracking `origin/cursor/cutouts-this-week-quests` |
| HEAD | `6d6c458` feat: implement starter quest feature and update roadmap |
| vs `main` | 13 commits ahead, 0 behind. `main` == `origin/main` at `7f76a69` |
| Dirty tree at start | **Not clean.** Modified: `apps/mobile/app/(auth)/{forgot-password,reset-password,sign-in,sign-up}.tsx`, `apps/mobile/app/(tabs)/feed.tsx`, `apps/mobile/app/(tabs)/leaderboard.tsx`. Untracked: `apps/mobile/components/auth/AuthKit.tsx`, `docs/design/CLAUDE-FABLE-MASTER-ORCHESTRATION-PROMPT.md`. File mtimes advanced between two consecutive `git` calls (15:07 → 15:10), so **another editor is active on this checkout**. These files are excluded from campaign edits; they are preserved, not reviewed as campaign work. |
| Auxiliary worktrees | `.claude/worktrees/redesign-demo` (`claude/redesign-demo`, 28 behind / 0 ahead), `sleepy-fermat-6a44f5` (45 behind / 0 ahead), `whats-next-e00154` (42 behind / 1 ahead: `bac8b0f`, screenshots + small sign-in/feed tweaks). All historical; HEAD is the most advanced source. |
| Agent instructions | No `CLAUDE.md`, `AGENTS.md`, or `CLAUDE.local.md`. `.claude/settings.json` allows planner/coder/tester/reviewer tasks, git, npm test; denies `rm -r*`. `.agents/rules/claude-mem-context.md` is an empty memory stub. `.agents/skills/*` are design-taste skills (not project policy). |

### Orchestration capability (verified)

"Fable" is the coordinator model (Claude Fable 5.1). The installed orchestration mechanism is the
Claude Code **Workflow** tool (ultracode enabled) plus the **Agent** tool. Confirmed controls:
model identifiers `sonnet`, `opus`, `haiku`, `fable`; effort `low`–`max`; `isolation: 'worktree'`;
per-workflow concurrency cap min(16, CPUs−2). There is **no `/fable` command**; none was invented.
Routing used: Sonnet for read-only scouts and builders, Opus for independent review/verification,
Fable for synthesis, security judgments and acceptance.

### Command matrix (read from scripts, then run)

| Check | Command | Baseline result (Nov 10) |
|---|---|---|
| Geofence tests | `node packages/geofence/src/__tests__/geofence.test.js` | 50 passed, 0 failed |
| Redemption tests | `node packages/geofence/src/__tests__/redemption.test.js` | passed |
| Mobile logic tests | `node apps/mobile/__tests__/logic.test.js` | 159 passed, 0 failed |
| Quest window tests | `node apps/mobile/__tests__/questWindow.test.js` | 9 passed |
| Mobile typecheck | `cd apps/mobile && npx tsc --noEmit` | exit 0 |
| Admin typecheck | `cd apps/admin && npx tsc --noEmit` | exit 0 |
| Token lint (informational) | `cd apps/mobile && node scripts/check-tokens.js` | 218 raw tokens in 28 files |
| CI (`.github/workflows/ci.yml`) | geofence tests, logic tests, tsc mobile, tsc admin, `npm audit --omit=dev --audit-level=critical` | runs on push/PR to `main` only. **CI does not run** `redemption.test.js` or `questWindow.test.js`. |

Not run (external/credentialed): EAS builds, `supabase db push`, edge function deploy, Vercel deploy,
any Supabase MCP call (read or write). Remote migration state is **unknown** to this campaign.

## 2. Conflict register

Populated after audit synthesis (section 4).

## 3. Phase plan and state

| Phase | Scope | State | Notes |
|---|---|---|---|
| Audit | Repo-wide read-only audit, spec matrix (01–07), Cutouts matrix (phases 1–7), migration audit 001–037 | in progress | Workflow dispatched Nov 10 |
| 0 | Baseline, security and launch truth | queued | |
| 1 | Spec and documentation reconciliation | queued | |
| 2 | Cutouts design completion and accessibility | queued | |
| 3 | Spec 06 §2 Sunday recap | queued | |
| 4 | Spec 06 §3 XP economy events | queued | |
| 5 | Spec 06 §5 offline submission queue | queued | |
| 6 | Spec 06 §1 duo quests and referral loop | queued | |
| 7 | Spec 05 chains (decision gate) | queued | Deferred unless catalog ≥ ~35 and owner intent confirmed |
| 8 | Spec 05/07/weekly drops integration hardening | queued | |
| 9 | Final integration and release-readiness report | queued | |

## 4. Findings

Populated after audit synthesis.

## 5. Unresolved questions for the owner

1. May the campaign use the **read-only** Supabase MCP tools (`list_migrations`, `list_edge_functions`,
   `get_advisors`) to establish remote state? Until answered, remote state is reported as unknown.
2. Chains (Spec 05 §3): current intent to build before ~35 quests? Default: stay deferred.

## 6. Next concrete action

Wait for the audit workflow; synthesize findings into sections 2 and 4; define Phase 0 acceptance criteria.
