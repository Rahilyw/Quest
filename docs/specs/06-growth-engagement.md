# Spec 06 — Growth & Engagement (duo quests, recap card, XP events, first-quest onboarding)

**Status:** Draft
**Depends on:** Spec 02 (instant verification), Spec 04 (to measure any of it)
**Problem:** the roadmap has zero acquisition features, and the mission — real-world *connection* — is currently entirely single-player. In a city of ~90k, word-of-mouth is the whole distribution strategy.

## 1. Duo quests + referral loop

Quests requiring 2+ people. Both are at the location, both submit, both get bonus XP — and bringing a non-user is the referral mechanic.

### Data

```sql
ALTER TABLE quests ADD COLUMN min_party_size INTEGER NOT NULL DEFAULT 1;  -- 1 = solo, 2 = duo

CREATE TABLE quest_parties (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quest_id   UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  code       TEXT UNIQUE NOT NULL,             -- 6-char join code
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL              -- created_at + 2 hours
);

CREATE TABLE quest_party_members (
  party_id UUID NOT NULL REFERENCES quest_parties(id) ON DELETE CASCADE,
  user_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  completion_id UUID REFERENCES completions(id),
  PRIMARY KEY (party_id, user_id)
);
```

### Flow (v1, deliberately simple)

1. On a duo quest, "Start with a friend" creates a party → 6-char code + QR + native share link.
2. Friend joins by code (existing user) or lands on the app-store page with the code attached (new user — the referral hook).
3. Both submit from inside the geofence while the party is open. Each submission is a normal completion (all Spec 02 validation applies) linked via `completion_id`.
4. When the second member's completion verifies, a trigger pays the **duo bonus: +50% XP to both**. Celebration shows the pair.
5. **Referral kicker:** if a party member's account is under 48h old, the inviter earns a **Recruiter** badge progress tick and both get the duo bonus doubled on that quest (2× total). No cash-like rewards — XP only, on-brand.

Seed 3–5 duo quests ("Board games for two at Interactivity", "Sunset watch with a friend"). Anti-abuse: party members must be distinct accounts; both completions still pass geofence + rate limits; a user can hold one open party at a time.

## 2. Sunday recap share card

The organic marketing engine. End of week, generate a share image — rank, weekly XP, streak, best proof photo — and hand it to the native share sheet.

- **Client-rendered:** an off-screen branded view (Harbour Electric, Quest Blue, big rank numeral) captured with `react-native-view-shot`; no server rendering.
- **Entry points:** Sunday-evening push (*"Your week in Victoria is in."*) → recap screen; also reachable from Rankings all week.
- **Privacy:** the card uses only the user's own data + their own photo; sharing is explicit.
- **Measure:** `share_completed {surface: 'recap'}` (Spec 04). This supersedes roadmap 3.5 (share-a-quest) — share-your-week is the stronger unit.

## 3. XP economy events

Cheap, high-leverage retention levers, run from a single table:

```sql
CREATE TABLE xp_events (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kind       TEXT NOT NULL CHECK (kind IN ('multiplier', 'first_finisher')),
  multiplier NUMERIC NOT NULL DEFAULT 2.0,
  quest_id   UUID REFERENCES quests(id),     -- null = applies to all quests
  starts_at  TIMESTAMPTZ NOT NULL,
  ends_at    TIMESTAMPTZ NOT NULL
);
```

- **Double-XP weekend:** admin inserts a `multiplier` row; the Spec 02 reward function checks active events at verification time. Mobile shows a "2× XP this weekend" banner on Explore.
- **First-finisher bonus:** first verified completion of a quest created in the last 7 days gets +50% — makes Monday drops (Spec 05) a race.
- **Lapsed-player win-back:** scheduled job (Supabase cron) finds players quiet for 10+ days with a push token → *"Victoria misses you. Double XP on your next quest this week."* (personal multiplier row; cap once per 30 days per user).

## 4. First-quest onboarding (time-to-first-XP)

The no-geofence starter quest ("Write a Journal Entry About Your City") is the perfect first quest — surface it instead of hoping it's found:

- After sign-up, Explore pins a **"Your first quest"** card pointing at a designated starter quest (`quests` gets a `is_starter` boolean; exactly one active).
- With Spec 02, verification is instant → every new player can earn XP within 5 minutes of installing.
- Target metric (Spec 04): median time-to-first-XP < 24h, aspiration < 5 min.

## 5. Offline submission queue

People submit from breakwaters and summits with one bar of signal; a failed upload at the moment of triumph is a brutal first impression.

- On upload/insert failure with a network error: persist `{questId, photoUri, coords, capturedAt}` to AsyncStorage, show *"Saved — we'll submit when you're back online."*
- Foreground retry with backoff; badge on the profile tab while anything is queued; the queued `capturedAt`/coords are what get submitted (the player was there when it counted).
- Geofence is validated server-side against the *captured* coordinates; the rate-limit and mock-location checks still apply on flush.

## 6. Sequencing & non-goals

Order: 4 (starter quest, ~a day) → 2 (recap card) → 3 (XP events) → 5 (offline queue) → 1 (duo quests — biggest lift, biggest payoff).

Non-goals: cash/discount referral incentives, contact-book import, DMs or friend graphs (deliberately deferred — a small community fragments), parties larger than 2 (revisit after duo data).
