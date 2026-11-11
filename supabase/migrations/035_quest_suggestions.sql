-- 035: Community quest suggestions (Spec 05 §1). Chains stay deferred.
--
-- A player can insert and read their own rows. They cannot set status,
-- admin notes, or the published quest. At most 3 rows in `submitted`
-- per user, enforced with a transaction lock so two requests can't both
-- pass a count check.
--
-- Publishing is service-role only: publish_suggested_quest links the
-- quest, pays +100 XP once, and grants City Author at the badge's
-- configured minimum (seeded at 3). The client never supplies the XP.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'suggestion_status') THEN
    CREATE TYPE suggestion_status AS ENUM ('submitted', 'accepted', 'rejected');
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS quest_suggestions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  category    quest_category NOT NULL,
  lat         DOUBLE PRECISION,
  lng         DOUBLE PRECISION,
  status      suggestion_status NOT NULL DEFAULT 'submitted',
  admin_notes TEXT,
  quest_id    UUID REFERENCES quests(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT quest_suggestions_title_len CHECK (char_length(title) BETWEEN 3 AND 80),
  CONSTRAINT quest_suggestions_description_len CHECK (char_length(description) BETWEEN 10 AND 500),
  CONSTRAINT quest_suggestions_notes_len CHECK (admin_notes IS NULL OR char_length(admin_notes) <= 500),
  CONSTRAINT quest_suggestions_pin CHECK (
    (lat IS NULL AND lng IS NULL)
    OR (lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180)
  )
);

CREATE INDEX IF NOT EXISTS quest_suggestions_user_status_idx
  ON quest_suggestions (user_id, status);
CREATE INDEX IF NOT EXISTS quest_suggestions_queue_idx
  ON quest_suggestions (status, created_at DESC);
CREATE INDEX IF NOT EXISTS quest_suggestions_quest_idx
  ON quest_suggestions (quest_id);

ALTER TABLE quests
  ADD COLUMN IF NOT EXISTS suggested_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS quests_suggested_by_idx ON quests (suggested_by);

CREATE TABLE IF NOT EXISTS suggestion_xp_grants (
  suggestion_id UUID PRIMARY KEY REFERENCES quest_suggestions(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quest_id      UUID REFERENCES quests(id) ON DELETE SET NULL,
  xp            INTEGER NOT NULL DEFAULT 100 CHECK (xp = 100),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS suggestion_xp_grants_user_idx
  ON suggestion_xp_grants (user_id);

ALTER TABLE quest_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestion_xp_grants ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON quest_suggestions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON suggestion_xp_grants FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON quest_suggestions TO authenticated;

DROP POLICY IF EXISTS "Users read own suggestions" ON quest_suggestions;
CREATE POLICY "Users read own suggestions"
  ON quest_suggestions FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users insert own suggestions" ON quest_suggestions;
CREATE POLICY "Users insert own suggestions"
  ON quest_suggestions FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND status = 'submitted'
    AND admin_notes IS NULL
    AND quest_id IS NULL
  );

-- No UPDATE or DELETE policy: players cannot change status or notes.
-- Service role bypasses RLS for the review queue.

CREATE OR REPLACE FUNCTION enforce_suggestion_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_open integer;
BEGIN
  IF auth.uid() IS NULL OR NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'You can only submit your own quest idea.';
  END IF;

  NEW.title := btrim(NEW.title);
  NEW.description := btrim(NEW.description);
  NEW.status := 'submitted';
  NEW.admin_notes := NULL;
  NEW.quest_id := NULL;

  IF char_length(NEW.title) < 3 OR char_length(NEW.title) > 80 THEN
    RAISE EXCEPTION 'Title needs 3 to 80 characters.';
  END IF;
  IF char_length(NEW.description) < 10 OR char_length(NEW.description) > 500 THEN
    RAISE EXCEPTION 'Description needs 10 to 500 characters.';
  END IF;

  -- Serialize this user's open submissions so the cap can't be raced past.
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.user_id::text, 0::bigint));

  SELECT count(*) INTO v_open
  FROM quest_suggestions
  WHERE user_id = NEW.user_id
    AND status = 'submitted';

  IF v_open >= 3 THEN
    RAISE EXCEPTION 'You already have 3 open quest ideas.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_suggestion_insert ON quest_suggestions;
CREATE TRIGGER trg_enforce_suggestion_insert
  BEFORE INSERT ON quest_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION enforce_suggestion_insert();

CREATE OR REPLACE FUNCTION protect_suggestion_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF coalesce(auth.role(), '') IN ('authenticated', 'anon') THEN
    RAISE EXCEPTION 'Quest ideas are reviewed by the city.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_suggestion_update ON quest_suggestions;
CREATE TRIGGER trg_protect_suggestion_update
  BEFORE UPDATE ON quest_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION protect_suggestion_update();

REVOKE EXECUTE ON FUNCTION enforce_suggestion_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION protect_suggestion_update() FROM PUBLIC, anon, authenticated;

-- ─── City Author ────────────────────────────────────────────────────────────
-- Manual rule: the completion evaluator skips it. publish_suggested_quest
-- reads unlock_rule_config.min (default 3) and inserts user_badges once.

INSERT INTO badges (
  name, description, icon, unlock_condition, rarity, art_key, art_style,
  unlock_rule_type, unlock_rule_config, sort_order, is_active, locked_hint
)
SELECT
  'City Author',
  'Three of your quest ideas are live in Victoria.',
  '🖋️',
  'Publish 3 suggested quests',
  'rare',
  'city-author',
  'medal',
  'manual',
  '{"min":3}'::jsonb,
  45,
  true,
  'Suggest quests the city publishes.'
WHERE NOT EXISTS (
  SELECT 1 FROM badges WHERE lower(name) = 'city author'
);

-- ─── Publish + one-time reward ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION publish_suggested_quest(p_suggestion_id uuid, p_quest_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  s            quest_suggestions%ROWTYPE;
  v_inserted   integer := 0;
  v_published  integer := 0;
  v_badge      uuid;
  v_min        integer := 3;
  v_awarded    boolean := false;
BEGIN
  IF coalesce(auth.role(), '') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'publish_suggested_quest is server-only';
  END IF;

  SELECT * INTO s
  FROM quest_suggestions
  WHERE id = p_suggestion_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Suggestion not found.';
  END IF;
  IF s.status = 'rejected' THEN
    RAISE EXCEPTION 'That idea was rejected.';
  END IF;
  IF s.status = 'accepted' AND s.quest_id IS NOT NULL AND s.quest_id IS DISTINCT FROM p_quest_id THEN
    RAISE EXCEPTION 'That idea is already published.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM quests WHERE id = p_quest_id) THEN
    RAISE EXCEPTION 'Quest not found.';
  END IF;

  UPDATE quests
     SET suggested_by = s.user_id
   WHERE id = p_quest_id;

  UPDATE quest_suggestions
     SET status = 'accepted',
         quest_id = p_quest_id
   WHERE id = s.id;

  INSERT INTO suggestion_xp_grants (suggestion_id, user_id, quest_id, xp)
  VALUES (s.id, s.user_id, p_quest_id, 100)
  ON CONFLICT (suggestion_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF v_inserted = 1 THEN
    UPDATE profiles
       SET total_xp = total_xp + 100,
           level = level_from_xp(total_xp + 100)
     WHERE id = s.user_id;
    v_awarded := true;
  END IF;

  SELECT count(*) INTO v_published
  FROM suggestion_xp_grants
  WHERE user_id = s.user_id;

  SELECT id,
         COALESCE(NULLIF(unlock_rule_config->>'min', '')::integer, 3)
    INTO v_badge, v_min
  FROM badges
  WHERE art_key = 'city-author'
    AND is_active = true
  ORDER BY created_at
  LIMIT 1;

  IF v_badge IS NOT NULL AND v_published >= GREATEST(v_min, 1) THEN
    INSERT INTO user_badges (user_id, badge_id)
    VALUES (s.user_id, v_badge)
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'awarded', v_awarded,
    'published_count', v_published,
    'user_id', s.user_id,
    'badge_id', v_badge
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION publish_suggested_quest(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION publish_suggested_quest(uuid, uuid) TO service_role;
