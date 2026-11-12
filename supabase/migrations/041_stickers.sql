-- 041: Stickers — library, ownership and page placements (BRAND.md §6, §6c, §7 "Your page")
--
-- NOT APPLIED TO PRODUCTION. Apply only with the founder (see README.md).
--
-- A. quests.cutout_alt (alt text for the quest's sticker, written on upload)
-- B. stickers: one per quest (unlock_rule 'quest') plus library stickers that
--    unlock with a badge, a season or by hand
-- C. user_stickers: a player's drawer. Quest stickers are earned when a
--    completion is verified; badge stickers when the badge is earned
-- D. sticker_placements: where a player put a drawer sticker on their page,
--    stored as fractions of the board so it looks the same on every phone
-- E. Triggers that grant and revoke stickers, plus a backfill
-- F. RLS: owners write their own placements; public pages are readable,
--    following the same feed_public and block rules as the City feed

-- ─── A. QUESTS: sticker alt text ─────────────────────────────────────────────

ALTER TABLE quests ADD COLUMN IF NOT EXISTS cutout_alt TEXT;

-- ─── B. STICKERS ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS stickers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Set for a quest's own sticker; NULL for library stickers.
  quest_id        UUID REFERENCES quests(id) ON DELETE CASCADE,
  image_url       TEXT NOT NULL,
  -- Object path inside the quest-cutouts bucket, for cleanup on replace.
  storage_path    TEXT,
  alt_text        TEXT NOT NULL CHECK (char_length(btrim(alt_text)) BETWEEN 3 AND 140),
  -- quest:  earned by a verified completion of quest_id
  -- badge:  earned with unlock_badge_id
  -- season: granted to everyone active in unlock_season (by an admin job)
  -- manual: granted by an admin
  unlock_rule     TEXT NOT NULL DEFAULT 'manual'
                    CHECK (unlock_rule IN ('quest', 'badge', 'season', 'manual')),
  unlock_badge_id UUID REFERENCES badges(id) ON DELETE SET NULL,
  unlock_season   TEXT,
  -- Shown under a greyed sticker in the drawer: "Verify Run Dallas Road".
  unlock_hint     TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT stickers_rule_matches CHECK (
    (unlock_rule = 'quest'  AND quest_id IS NOT NULL)
    OR (unlock_rule = 'badge'  AND quest_id IS NULL AND unlock_badge_id IS NOT NULL)
    OR (unlock_rule = 'season' AND quest_id IS NULL AND unlock_season IS NOT NULL)
    OR (unlock_rule = 'manual' AND quest_id IS NULL)
  )
);

-- Exactly one sticker per quest.
CREATE UNIQUE INDEX IF NOT EXISTS stickers_one_per_quest
  ON stickers (quest_id) WHERE quest_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS stickers_unlock_badge_idx
  ON stickers (unlock_badge_id) WHERE unlock_badge_id IS NOT NULL;

ALTER TABLE stickers ENABLE ROW LEVEL SECURITY;

-- Anyone can read stickers (they are shown greyed in the drawer before you
-- earn them). Writes go through the admin service role only.
DROP POLICY IF EXISTS "Anyone can read stickers" ON stickers;
CREATE POLICY "Anyone can read stickers"
  ON stickers FOR SELECT
  USING (true);

-- ─── C. USER_STICKERS (the drawer) ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_stickers (
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sticker_id    UUID NOT NULL REFERENCES stickers(id) ON DELETE CASCADE,
  -- The verified completion that earned it, for quest stickers.
  completion_id UUID REFERENCES completions(id) ON DELETE CASCADE,
  earned_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, sticker_id)
);

CREATE INDEX IF NOT EXISTS user_stickers_sticker_idx ON user_stickers (sticker_id);

ALTER TABLE user_stickers ENABLE ROW LEVEL SECURITY;

-- ─── D. STICKER_PLACEMENTS (the board) ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS sticker_placements (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL,
  sticker_id UUID NOT NULL,
  -- Centre of the sticker as a fraction of the board's width and height.
  x          REAL NOT NULL CHECK (x >= 0 AND x <= 1),
  y          REAL NOT NULL CHECK (y >= 0 AND y <= 1),
  tilt       REAL NOT NULL DEFAULT 0 CHECK (tilt >= -12 AND tilt <= 12),
  scale      REAL NOT NULL DEFAULT 1 CHECK (scale >= 0.6 AND scale <= 1.6),
  z          INTEGER NOT NULL DEFAULT 0 CHECK (z >= 0 AND z <= 10000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- You can only place a sticker you own; losing it removes its placements.
  FOREIGN KEY (user_id, sticker_id)
    REFERENCES user_stickers (user_id, sticker_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS sticker_placements_user_idx ON sticker_placements (user_id, z);

ALTER TABLE sticker_placements ENABLE ROW LEVEL SECURITY;

-- At most 60 stickers on one page, so a board stays readable and cheap to load.
CREATE OR REPLACE FUNCTION enforce_sticker_placement_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  IF (SELECT count(*) FROM sticker_placements WHERE user_id = NEW.user_id) >= 60 THEN
    RAISE EXCEPTION 'STICKER_BOARD_FULL'
      USING ERRCODE = 'check_violation', HINT = 'STICKER_BOARD_FULL';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sticker_placement_limit ON sticker_placements;
CREATE TRIGGER trg_sticker_placement_limit
  BEFORE INSERT ON sticker_placements
  FOR EACH ROW
  EXECUTE FUNCTION enforce_sticker_placement_limit();

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sticker_placements_touch ON sticker_placements;
CREATE TRIGGER trg_sticker_placements_touch
  BEFORE UPDATE ON sticker_placements
  FOR EACH ROW
  EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_stickers_touch ON stickers;
CREATE TRIGGER trg_stickers_touch
  BEFORE UPDATE ON stickers
  FOR EACH ROW
  EXECUTE FUNCTION touch_updated_at();

-- ─── E. GRANTS AND REVOCATION ────────────────────────────────────────────────

-- Keep the quest's sticker row in step with quests.cutout_url / cutout_alt, so
-- an upload through the admin, the dashboard or a script all behave the same.
CREATE OR REPLACE FUNCTION sync_quest_sticker()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_alt TEXT;
BEGIN
  IF NEW.cutout_url IS NULL THEN
    IF TG_OP = 'INSERT' THEN
      RETURN NEW;
    END IF;
    UPDATE stickers SET is_active = false WHERE quest_id = NEW.id;
    RETURN NEW;
  END IF;

  v_alt := COALESCE(NULLIF(btrim(NEW.cutout_alt), ''), NEW.title || ' sticker');
  IF char_length(v_alt) > 140 THEN
    v_alt := left(v_alt, 140);
  END IF;

  INSERT INTO stickers (quest_id, image_url, alt_text, unlock_rule, unlock_hint, is_active)
  VALUES (NEW.id, NEW.cutout_url, v_alt, 'quest', 'Verify ' || NEW.title, true)
  ON CONFLICT (quest_id) WHERE quest_id IS NOT NULL DO UPDATE
    SET image_url   = EXCLUDED.image_url,
        alt_text    = EXCLUDED.alt_text,
        unlock_hint = EXCLUDED.unlock_hint,
        is_active   = true;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_quest_sticker ON quests;
CREATE TRIGGER trg_sync_quest_sticker
  AFTER INSERT OR UPDATE OF cutout_url, cutout_alt, title ON quests
  FOR EACH ROW
  EXECUTE FUNCTION sync_quest_sticker();

-- A verified completion puts the quest's sticker in the player's drawer.
CREATE OR REPLACE FUNCTION grant_quest_sticker_on_verify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  IF NEW.status = 'approved' THEN
    INSERT INTO user_stickers (user_id, sticker_id, completion_id)
    SELECT NEW.user_id, s.id, NEW.id
      FROM stickers s
     WHERE s.quest_id = NEW.quest_id
       AND s.unlock_rule = 'quest'
    ON CONFLICT (user_id, sticker_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_grant_quest_sticker_insert ON completions;
CREATE TRIGGER trg_grant_quest_sticker_insert
  AFTER INSERT ON completions
  FOR EACH ROW
  WHEN (NEW.status = 'approved')
  EXECUTE FUNCTION grant_quest_sticker_on_verify();

DROP TRIGGER IF EXISTS trg_grant_quest_sticker_update ON completions;
CREATE TRIGGER trg_grant_quest_sticker_update
  AFTER UPDATE OF status ON completions
  FOR EACH ROW
  WHEN (NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved')
  EXECUTE FUNCTION grant_quest_sticker_on_verify();

-- Moderation removal takes the sticker back (and, by cascade, its placements):
-- a sticker is earned there.
CREATE OR REPLACE FUNCTION revoke_quest_sticker_on_remove()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  DELETE FROM user_stickers us
   USING stickers s
   WHERE us.user_id = NEW.user_id
     AND us.sticker_id = s.id
     AND s.quest_id = NEW.quest_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_revoke_quest_sticker ON completions;
CREATE TRIGGER trg_revoke_quest_sticker
  AFTER UPDATE OF status ON completions
  FOR EACH ROW
  WHEN (OLD.status = 'approved' AND NEW.status IS DISTINCT FROM 'approved')
  EXECUTE FUNCTION revoke_quest_sticker_on_remove();

-- A new sticker reaches everyone who already qualifies: past completers of its
-- quest, or holders of its badge.
CREATE OR REPLACE FUNCTION grant_new_sticker_to_qualified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  IF NEW.unlock_rule = 'quest' THEN
    INSERT INTO user_stickers (user_id, sticker_id, completion_id)
    SELECT c.user_id, NEW.id, c.id
      FROM completions c
     WHERE c.quest_id = NEW.quest_id
       AND c.status = 'approved'
    ON CONFLICT (user_id, sticker_id) DO NOTHING;
  ELSIF NEW.unlock_rule = 'badge' THEN
    INSERT INTO user_stickers (user_id, sticker_id)
    SELECT ub.user_id, NEW.id
      FROM user_badges ub
     WHERE ub.badge_id = NEW.unlock_badge_id
    ON CONFLICT (user_id, sticker_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_grant_new_sticker ON stickers;
CREATE TRIGGER trg_grant_new_sticker
  AFTER INSERT ON stickers
  FOR EACH ROW
  EXECUTE FUNCTION grant_new_sticker_to_qualified();

-- Earning a badge unlocks any library stickers tied to it.
CREATE OR REPLACE FUNCTION grant_badge_stickers()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  INSERT INTO user_stickers (user_id, sticker_id)
  SELECT NEW.user_id, s.id
    FROM stickers s
   WHERE s.unlock_rule = 'badge'
     AND s.unlock_badge_id = NEW.badge_id
  ON CONFLICT (user_id, sticker_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_grant_badge_stickers ON user_badges;
CREATE TRIGGER trg_grant_badge_stickers
  AFTER INSERT ON user_badges
  FOR EACH ROW
  EXECUTE FUNCTION grant_badge_stickers();

REVOKE EXECUTE ON FUNCTION enforce_sticker_placement_limit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION sync_quest_sticker()               FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION grant_quest_sticker_on_verify()    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION revoke_quest_sticker_on_remove()   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION grant_new_sticker_to_qualified()   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION grant_badge_stickers()             FROM PUBLIC, anon, authenticated;

-- ─── F. RLS ──────────────────────────────────────────────────────────────────

-- A page is visible to its owner, and to others when the owner's completions
-- are public (feed_public) and neither has blocked the other. Stickers say
-- where someone has been, so they follow the City feed's rules.
CREATE OR REPLACE FUNCTION can_view_sticker_page(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
  SELECT p_user_id = auth.uid()
      OR EXISTS (
           SELECT 1 FROM profiles p
            WHERE p.id = p_user_id
              AND p.feed_public = true
              AND NOT is_blocked_pair(auth.uid(), p_user_id)
         );
$$;

REVOKE EXECUTE ON FUNCTION can_view_sticker_page(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION can_view_sticker_page(UUID) TO authenticated;

-- Drawer: readable on visible pages; written only by the triggers above.
DROP POLICY IF EXISTS "Visible pages show their drawer" ON user_stickers;
CREATE POLICY "Visible pages show their drawer"
  ON user_stickers FOR SELECT
  TO authenticated
  USING (can_view_sticker_page(user_id));

-- Board: readable on visible pages; the owner places, moves and removes.
DROP POLICY IF EXISTS "Visible pages show their board" ON sticker_placements;
CREATE POLICY "Visible pages show their board"
  ON sticker_placements FOR SELECT
  TO authenticated
  USING (can_view_sticker_page(user_id));

DROP POLICY IF EXISTS "Owners place their stickers" ON sticker_placements;
CREATE POLICY "Owners place their stickers"
  ON sticker_placements FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Owners move their stickers" ON sticker_placements;
CREATE POLICY "Owners move their stickers"
  ON sticker_placements FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Owners remove their stickers" ON sticker_placements;
CREATE POLICY "Owners remove their stickers"
  ON sticker_placements FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Only the placement fields are writable by clients; user_id and sticker_id
-- are fixed at insert (and the composite FK proves ownership).
REVOKE INSERT, UPDATE ON sticker_placements FROM anon, authenticated;
GRANT INSERT (user_id, sticker_id, x, y, tilt, scale, z) ON sticker_placements TO authenticated;
GRANT UPDATE (x, y, tilt, scale, z) ON sticker_placements TO authenticated;
GRANT SELECT, DELETE ON sticker_placements TO authenticated;
GRANT SELECT ON user_stickers TO authenticated;
GRANT SELECT ON stickers TO anon, authenticated;

-- ─── BACKFILL ────────────────────────────────────────────────────────────────

-- Quests that already have a cutout get their sticker row (which, through
-- trg_grant_new_sticker, fills the drawers of everyone who verified them).
INSERT INTO stickers (quest_id, image_url, alt_text, unlock_rule, unlock_hint)
SELECT q.id,
       q.cutout_url,
       left(COALESCE(NULLIF(btrim(q.cutout_alt), ''), q.title || ' sticker'), 140),
       'quest',
       'Verify ' || q.title
  FROM quests q
 WHERE q.cutout_url IS NOT NULL
ON CONFLICT (quest_id) WHERE quest_id IS NOT NULL DO NOTHING;

-- ─── REWARDS ON PUBLIC PAGES ─────────────────────────────────────────────────
-- Your page leads with badges, medals and trophies (BRAND.md §7). Visitors can
-- read a player's earned badges on the same terms as their sticker board.
DROP POLICY IF EXISTS "Visible pages show their badges" ON user_badges;
CREATE POLICY "Visible pages show their badges"
  ON user_badges FOR SELECT
  TO authenticated
  USING (can_view_sticker_page(user_id));
