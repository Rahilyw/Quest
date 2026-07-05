# Spec 05 — Community Quests, Weekly Drops & Quest Chains

**Status:** Draft
**Depends on:** Spec 02 (instant verification) for the suggester-XP moment; migration `012_quest_scheduling.sql` (shipped) for drops
**Problem:** ~28 seeded quests. An engaged player exhausts them in 4–6 weeks and churns. The roadmap covers quest *scheduling* but not where new content comes from.

## 1. Community-suggested quests

Locals submit quest ideas; the admin curates and publishes with credit. On-brand ("every surface should feel written by someone standing on that street"), turns the most engaged players into content creators, and scales to future cities without the founder knowing those streets.

### Data (migration)

```sql
CREATE TYPE suggestion_status AS ENUM ('submitted', 'accepted', 'rejected');

CREATE TABLE quest_suggestions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL CHECK (char_length(title) <= 80),
  description TEXT NOT NULL CHECK (char_length(description) <= 500),
  category    quest_category NOT NULL,
  lat         DOUBLE PRECISION,
  lng         DOUBLE PRECISION,
  status      suggestion_status NOT NULL DEFAULT 'submitted',
  admin_notes TEXT,
  quest_id    UUID REFERENCES quests(id),   -- set when accepted & published
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- RLS: insert own (rate limit: 3 open suggestions per user), read own.

ALTER TABLE quests ADD COLUMN suggested_by UUID REFERENCES profiles(id);
```

### Mobile

- **Entry points:** "💡 Suggest a quest" card at the end of the Explore list + a row on Profile.
- **Form:** title, description, category, optional map pin. Copy sets expectations: *"If we publish it, the quest carries your name."*
- **Credit:** published quests show a "Quest by @username" chip on `QuestHeroCard` and quest detail.
- **Reward:** suggester gets **+100 XP** when their quest goes live, and a **City Author** badge (🖋️) at 3 published suggestions. Push: *"Your quest idea is live in Victoria."*

### Admin

- `/suggestions` queue: submitted ideas with suggester, status actions (accept → opens the existing create-quest form prefilled, links `quest_suggestions.quest_id` + `quests.suggested_by`; reject with optional note).
- Duplicate radar: list nearby existing quests (500 m) next to each suggestion.

## 2. Weekly drop ritual

A predictable content cadence creates an appointment: **new quests drop Monday morning, expiring quests end Sunday night** — bookending the leaderboard week that already resets Monday.

- **Already in place:** `active_from` / `active_until` (migration 012). This spec is mostly *operational + surfacing*:
- **Admin:** create-quest form exposes the scheduling fields with a "Next Monday" preset; dashboard shows "next drop" count so empty Mondays are visible in advance.
- **Mobile:**
  - "NEW THIS WEEK" section pinned at the top of Explore for quests activated in the last 7 days.
  - "Ends Sunday" countdown chip on expiring quest cards (urgency without fake scarcity).
  - **Monday drop push:** *"3 new quests just dropped in Victoria."* (extends the push pipeline; respects the existing toggle).
- **Cadence target:** 2–4 new quests/week, ≥1 from community suggestions once §1 is live. The Spec 04 content dashboard (view→submit conversion per quest) decides what kind of quests to make more of.

## 3. Quest chains

Storylines built from existing quests — progression depth without new content volume. *"The Old Town Trilogy: Chinatown Gate → Bastion Square → Antique Row."*

### Data (migration)

```sql
CREATE TABLE quest_chains (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  bonus_xp    INTEGER NOT NULL DEFAULT 200,
  badge_id    UUID REFERENCES badges(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE quest_chain_steps (
  chain_id UUID NOT NULL REFERENCES quest_chains(id) ON DELETE CASCADE,
  quest_id UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  PRIMARY KEY (chain_id, quest_id)
);
```

- Completion order is **not** enforced (real cities don't work that way); the chain completes when all member quests are verified. A trigger on completions awards `bonus_xp` + the chain badge when the last member lands.
- **Mobile:** chain progress strip on quest detail ("Part 2 of 3 — Old Town Trilogy"), a chains section on the Badges tab, chain-complete celebration variant.
- **Admin:** minimal chain builder — pick quests, order them, set bonus + badge.
- Chains map naturally onto neighbourhoods → future "neighbourhood mastery" without new schema.

## 4. Sequencing

1. Weekly drops (surfacing + push) — smallest lift, uses shipped schema.
2. Community suggestions — the content flywheel.
3. Chains — once there are ~35+ quests to weave together.

## 5. Non-goals (v1)

Fully self-serve user-published quests (curation is the quality bar), suggestion voting/comments, chain ordering enforcement, per-neighbourhood leaderboards.
