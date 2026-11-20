-- 045: Duo quests and referral (Spec 06 §1, build plan Nov 19 Phase 5).
--
-- REQUIRES 043 AND 044 APPLIED FIRST. This file redefines
-- normalize_completion_on_insert() from 043; every XP-award rule from 043 is
-- kept, then a party gate and duo bonus are added. Apply order:
-- 041 → 042 → 043 → 044 → 045, each followed by its "Verifying" block in
-- supabase/migrations/README.md.
--
-- What changes:
--   1. quests.min_party_size (1|2, default 1) with a client column grant.
--   2. quest_parties + quest_party_members (max 2). RLS: members read only.
--   3. Definer RPCs create_party / join_party / leave_party / own_party
--      (authenticated). Rate limit: 10 creates or joins per hour.
--   4. normalize_completion_on_insert: duo quests require an open 2-member
--      party (PARTY_REQUIRED). When the second member verifies, add
--      +round(0.5×base) (or +base if either account is under 48 h old) to
--      NEW.xp_awarded and set xp_reason = 'duo'.
--   5. AFTER INSERT: link completion_id; pay the first member the same bonus
--      (xp_awarded + profiles.total_xp + level); notify them (duo_bonus).
--   6. evaluate_badge_unlock gains rule type 'recruits'; Recruiter badge seed
--      (threshold 3).
--   7. notifications.kind enum + CHECK widen for 'duo_bonus'.
--
-- Edge case (accepted): the first member's bonus counts toward the week of
-- their completion. A party spanning Sunday midnight is possible within 2 h.
--
-- This file changes nothing on a hosted database until an owner applies it.

-- ─── 1. Party size on quests ────────────────────────────────────────────────

ALTER TABLE quests
  ADD COLUMN IF NOT EXISTS min_party_size smallint NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.quests'::regclass
       AND conname = 'quests_min_party_size_check'
  ) THEN
    ALTER TABLE quests
      ADD CONSTRAINT quests_min_party_size_check
      CHECK (min_party_size IN (1, 2));
  END IF;
END;
$$;

-- Same pattern as 044 cutout_alt: explicit column grant for clients.
GRANT SELECT (min_party_size) ON TABLE quests TO anon, authenticated;

-- ─── 2. Party tables ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS quest_parties (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id    uuid NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  code        char(6) NOT NULL,
  created_by  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL,
  CONSTRAINT quest_parties_code_format CHECK (code ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$'),
  CONSTRAINT quest_parties_window CHECK (expires_at > created_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS quest_parties_code_uidx ON quest_parties (code);

-- is_open is the stable predicate for "one open party per creator" (partial
-- unique indexes cannot use now()). leave_party / expiry paths clear it.
ALTER TABLE quest_parties ADD COLUMN IF NOT EXISTS is_open boolean NOT NULL DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS quest_parties_one_open_per_creator
  ON quest_parties (created_by)
  WHERE is_open;

CREATE INDEX IF NOT EXISTS quest_parties_quest_id_idx ON quest_parties (quest_id);
CREATE INDEX IF NOT EXISTS quest_parties_created_by_idx ON quest_parties (created_by);

CREATE TABLE IF NOT EXISTS quest_party_members (
  party_id      uuid NOT NULL REFERENCES quest_parties(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at     timestamptz NOT NULL DEFAULT now(),
  completion_id uuid REFERENCES completions(id) ON DELETE SET NULL,
  PRIMARY KEY (party_id, user_id)
);

CREATE INDEX IF NOT EXISTS quest_party_members_user_id_idx ON quest_party_members (user_id);
CREATE INDEX IF NOT EXISTS quest_party_members_completion_id_idx
  ON quest_party_members (completion_id)
  WHERE completion_id IS NOT NULL;

-- At most 2 members per party (enforced in join_party; trigger as belt).
CREATE OR REPLACE FUNCTION enforce_party_member_cap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  n integer;
BEGIN
  SELECT count(*)::integer INTO n
    FROM quest_party_members
   WHERE party_id = NEW.party_id;

  IF n >= 2 THEN
    RAISE EXCEPTION 'PARTY_FULL'
      USING ERRCODE = 'check_violation',
            HINT   = 'PARTY_FULL';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_party_member_cap ON quest_party_members;
CREATE TRIGGER trg_enforce_party_member_cap
  BEFORE INSERT ON quest_party_members
  FOR EACH ROW
  EXECUTE FUNCTION enforce_party_member_cap();

REVOKE ALL ON FUNCTION enforce_party_member_cap() FROM PUBLIC, anon, authenticated;

ALTER TABLE quest_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE quest_party_members ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE quest_parties FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE quest_party_members FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE quest_parties TO authenticated;
GRANT SELECT ON TABLE quest_party_members TO authenticated;

-- Members read their own party and its members. No client writes.
DROP POLICY IF EXISTS "Members read own parties" ON quest_parties;
CREATE POLICY "Members read own parties"
  ON quest_parties FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quest_party_members m
       WHERE m.party_id = quest_parties.id
         AND m.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Members read party roster" ON quest_party_members;
CREATE POLICY "Members read party roster"
  ON quest_party_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quest_party_members self
       WHERE self.party_id = quest_party_members.party_id
         AND self.user_id = (SELECT auth.uid())
    )
  );

-- ─── 3. Code helper + RPCs ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION party_code_alphabet()
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'::text;
$$;

CREATE OR REPLACE FUNCTION generate_party_code()
RETURNS char(6)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  alphabet text := party_code_alphabet();
  alen     integer := length(alphabet);
  raw      bytea;
  out_code text;
  i        integer;
  attempts integer := 0;
BEGIN
  LOOP
    attempts := attempts + 1;
    IF attempts > 32 THEN
      RAISE EXCEPTION 'PARTY_CODE_EXHAUSTED'
        USING ERRCODE = 'check_violation', HINT = 'PARTY_CODE_EXHAUSTED';
    END IF;

    raw := gen_random_bytes(6);
    out_code := '';
    FOR i IN 0..5 LOOP
      out_code := out_code || substr(alphabet, (get_byte(raw, i) % alen) + 1, 1);
    END LOOP;

    EXIT WHEN NOT EXISTS (SELECT 1 FROM quest_parties WHERE code = out_code);
  END LOOP;

  RETURN out_code::char(6);
END;
$$;

REVOKE ALL ON FUNCTION generate_party_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION party_code_alphabet() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION party_code_alphabet() TO authenticated;

CREATE OR REPLACE FUNCTION party_rate_limit_ok(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  n integer;
BEGIN
  SELECT (
    (SELECT count(*)::integer FROM quest_parties
      WHERE created_by = p_user_id
        AND created_at >= now() - interval '1 hour')
    +
    (SELECT count(*)::integer
       FROM quest_party_members m
       JOIN quest_parties p ON p.id = m.party_id
      WHERE m.user_id = p_user_id
        AND p.created_by <> p_user_id
        AND m.joined_at >= now() - interval '1 hour')
  ) INTO n;

  RETURN n < 10;
END;
$$;

REVOKE ALL ON FUNCTION party_rate_limit_ok(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION close_party(p_party_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE quest_parties
     SET is_open = false,
         expires_at = LEAST(expires_at, now())
   WHERE id = p_party_id
     AND is_open;
END;
$$;

REVOKE ALL ON FUNCTION close_party(uuid) FROM PUBLIC, anon, authenticated;

-- create_party(quest_id) → {code, expires_at}
CREATE OR REPLACE FUNCTION create_party(p_quest_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  uid uuid := auth.uid();
  q_min smallint;
  q_status text;
  existing record;
  new_id uuid;
  new_code char(6);
  new_exp timestamptz;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'create_party requires a signed-in player';
  END IF;

  IF NOT party_rate_limit_ok(uid) THEN
    RAISE EXCEPTION 'PARTY_RATE_LIMITED'
      USING ERRCODE = 'check_violation', HINT = 'PARTY_RATE_LIMITED';
  END IF;

  SELECT min_party_size, status::text
    INTO q_min, q_status
    FROM quests
   WHERE id = p_quest_id;

  IF q_status IS NULL OR q_status <> 'active' THEN
    RAISE EXCEPTION 'PARTY_QUEST_NOT_FOUND'
      USING ERRCODE = 'check_violation', HINT = 'PARTY_QUEST_NOT_FOUND';
  END IF;

  IF coalesce(q_min, 1) < 2 THEN
    RAISE EXCEPTION 'PARTY_NOT_DUO'
      USING ERRCODE = 'check_violation', HINT = 'PARTY_NOT_DUO';
  END IF;

  -- Reuse own open party for this quest.
  SELECT p.id, p.code, p.expires_at
    INTO existing
    FROM quest_parties p
   WHERE p.created_by = uid
     AND p.quest_id = p_quest_id
     AND p.is_open
     AND p.expires_at > now()
   LIMIT 1;

  IF existing.id IS NOT NULL THEN
    RETURN jsonb_build_object('code', existing.code, 'expires_at', existing.expires_at);
  END IF;

  -- Close any other open party this player holds.
  UPDATE quest_parties
     SET is_open = false,
         expires_at = LEAST(expires_at, now())
   WHERE created_by = uid
     AND is_open;

  new_code := generate_party_code();
  new_exp := now() + interval '2 hours';
  new_id := gen_random_uuid();

  INSERT INTO quest_parties (id, quest_id, code, created_by, expires_at, is_open)
  VALUES (new_id, p_quest_id, new_code, uid, new_exp, true);

  INSERT INTO quest_party_members (party_id, user_id)
  VALUES (new_id, uid);

  RETURN jsonb_build_object('code', new_code, 'expires_at', new_exp);
END;
$$;

REVOKE ALL ON FUNCTION create_party(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION create_party(uuid) TO authenticated;

-- join_party(code) → {quest_id, partner_username}
CREATE OR REPLACE FUNCTION join_party(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid uuid := auth.uid();
  normalized text;
  party quest_parties%ROWTYPE;
  member_count integer;
  partner_name text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'join_party requires a signed-in player';
  END IF;

  IF NOT party_rate_limit_ok(uid) THEN
    RAISE EXCEPTION 'PARTY_RATE_LIMITED'
      USING ERRCODE = 'check_violation', HINT = 'PARTY_RATE_LIMITED';
  END IF;

  normalized := upper(btrim(coalesce(p_code, '')));
  IF normalized !~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$' THEN
    RAISE EXCEPTION 'PARTY_NOT_FOUND'
      USING ERRCODE = 'check_violation', HINT = 'PARTY_NOT_FOUND';
  END IF;

  SELECT * INTO party
    FROM quest_parties
   WHERE code = normalized
   FOR UPDATE;

  IF party.id IS NULL THEN
    RAISE EXCEPTION 'PARTY_NOT_FOUND'
      USING ERRCODE = 'check_violation', HINT = 'PARTY_NOT_FOUND';
  END IF;

  IF NOT party.is_open OR party.expires_at <= now() THEN
    IF party.is_open THEN
      PERFORM close_party(party.id);
    END IF;
    RAISE EXCEPTION 'PARTY_EXPIRED'
      USING ERRCODE = 'check_violation', HINT = 'PARTY_EXPIRED';
  END IF;

  IF party.created_by = uid THEN
    RAISE EXCEPTION 'PARTY_SELF'
      USING ERRCODE = 'check_violation', HINT = 'PARTY_SELF';
  END IF;

  IF EXISTS (
    SELECT 1 FROM quest_party_members
     WHERE party_id = party.id AND user_id = uid
  ) THEN
    SELECT pr.username INTO partner_name
      FROM quest_party_members m
      JOIN profiles pr ON pr.id = m.user_id
     WHERE m.party_id = party.id AND m.user_id <> uid
     LIMIT 1;
    RETURN jsonb_build_object(
      'quest_id', party.quest_id,
      'partner_username', partner_name
    );
  END IF;

  SELECT count(*)::integer INTO member_count
    FROM quest_party_members
   WHERE party_id = party.id;

  IF member_count >= 2 THEN
    RAISE EXCEPTION 'PARTY_FULL'
      USING ERRCODE = 'check_violation', HINT = 'PARTY_FULL';
  END IF;

  -- Close the joiner's other open party, if any.
  UPDATE quest_parties
     SET is_open = false,
         expires_at = LEAST(expires_at, now())
   WHERE created_by = uid
     AND is_open
     AND id <> party.id;

  INSERT INTO quest_party_members (party_id, user_id)
  VALUES (party.id, uid);

  SELECT pr.username INTO partner_name
    FROM profiles pr
   WHERE pr.id = party.created_by;

  RETURN jsonb_build_object(
    'quest_id', party.quest_id,
    'partner_username', partner_name
  );
END;
$$;

REVOKE ALL ON FUNCTION join_party(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION join_party(text) TO authenticated;

CREATE OR REPLACE FUNCTION leave_party(p_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid uuid := auth.uid();
  normalized text;
  party quest_parties%ROWTYPE;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'leave_party requires a signed-in player';
  END IF;

  normalized := upper(btrim(coalesce(p_code, '')));

  SELECT * INTO party
    FROM quest_parties
   WHERE code = normalized
   FOR UPDATE;

  IF party.id IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM quest_party_members
     WHERE party_id = party.id AND user_id = uid
  ) THEN
    RETURN;
  END IF;

  IF party.created_by = uid THEN
    PERFORM close_party(party.id);
    DELETE FROM quest_party_members WHERE party_id = party.id;
  ELSE
    DELETE FROM quest_party_members
     WHERE party_id = party.id AND user_id = uid;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION leave_party(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION leave_party(text) TO authenticated;

-- own_party(quest_id) → open party + members for the lobby
CREATE OR REPLACE FUNCTION own_party(p_quest_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid uuid := auth.uid();
  party quest_parties%ROWTYPE;
  members jsonb;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'own_party requires a signed-in player';
  END IF;

  SELECT p.* INTO party
    FROM quest_parties p
    JOIN quest_party_members m ON m.party_id = p.id
   WHERE p.quest_id = p_quest_id
     AND m.user_id = uid
     AND p.is_open
     AND p.expires_at > now()
   ORDER BY p.created_at DESC
   LIMIT 1;

  IF party.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT coalesce(
           jsonb_agg(
             jsonb_build_object(
               'user_id', m.user_id,
               'username', pr.username,
               'joined_at', m.joined_at,
               'completion_id', m.completion_id,
               'is_creator', m.user_id = party.created_by
             )
             ORDER BY m.joined_at, m.user_id
           ),
           '[]'::jsonb
         )
    INTO members
    FROM quest_party_members m
    JOIN profiles pr ON pr.id = m.user_id
   WHERE m.party_id = party.id;

  RETURN jsonb_build_object(
    'id', party.id,
    'quest_id', party.quest_id,
    'code', party.code,
    'created_by', party.created_by,
    'created_at', party.created_at,
    'expires_at', party.expires_at,
    'is_open', party.is_open AND party.expires_at > now(),
    'members', members
  );
END;
$$;

REVOKE ALL ON FUNCTION own_party(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION own_party(uuid) TO authenticated;

-- ─── 4. notifications: duo_bonus ────────────────────────────────────────────

ALTER TYPE social_notification_type ADD VALUE IF NOT EXISTS 'duo_bonus';

-- Widen the shape CHECK so duo_bonus looks like like (completion required).
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conname
      FROM pg_constraint c
     WHERE c.conrelid = 'public.notifications'::regclass
       AND c.contype = 'c'
       AND pg_get_constraintdef(c.oid) ILIKE '%comment_id%'
  LOOP
    EXECUTE format('ALTER TABLE notifications DROP CONSTRAINT %I', r.conname);
  END LOOP;

  ALTER TABLE notifications
    ADD CONSTRAINT notifications_type_shape CHECK (
      (type = 'follow' AND completion_id IS NULL AND comment_id IS NULL)
      OR (type IN ('like', 'duo_bonus') AND completion_id IS NOT NULL AND comment_id IS NULL)
      OR (type IN ('comment', 'reply') AND completion_id IS NOT NULL AND comment_id IS NOT NULL)
    );
END;
$$;

-- ─── 5. normalize_completion_on_insert (043 body + party gate + duo) ───────

CREATE OR REPLACE FUNCTION normalize_completion_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  recent_10min integer;
  recent_24h integer;
  sponsored boolean;
  base_xp integer;
  quest_start timestamptz;
  m_event numeric;
  m_event_global numeric;
  m_personal numeric;
  win_back_id uuid;
  m numeric;
  reason text;
  party_min smallint;
  party_id uuid;
  member_count integer;
  done_count integer;
  partner_id uuid;
  partner_created timestamptz;
  self_created timestamptz;
  duo_bonus integer;
  referral boolean;
BEGIN
  NEW.completed_at := now();

  SELECT count(*)::integer INTO recent_10min
    FROM completions
   WHERE user_id = NEW.user_id
     AND completed_at >= now() - interval '10 minutes';

  IF recent_10min >= 2 THEN
    RAISE EXCEPTION 'RATE_LIMITED'
      USING ERRCODE = 'check_violation',
            HINT   = 'RATE_LIMITED';
  END IF;

  SELECT count(*)::integer INTO recent_24h
    FROM completions
   WHERE user_id = NEW.user_id
     AND completed_at >= now() - interval '24 hours';

  IF recent_24h >= 10 THEN
    RAISE EXCEPTION 'RATE_LIMITED'
      USING ERRCODE = 'check_violation',
            HINT   = 'RATE_LIMITED';
  END IF;

  NEW.status := 'approved';
  NEW.reviewed_at := now();

  SELECT is_sponsored, xp_reward, coalesce(active_from, created_at), min_party_size
    INTO sponsored, base_xp, quest_start, party_min
    FROM quests
   WHERE id = NEW.quest_id;

  IF sponsored THEN
    NEW.redemption_code := generate_redemption_code();
  ELSE
    NEW.redemption_code := NULL;
  END IF;

  -- ── Party gate (045). Duo quests need a full open party. ────────────────
  IF coalesce(party_min, 1) >= 2 THEN
    SELECT p.id INTO party_id
      FROM quest_parties p
      JOIN quest_party_members m ON m.party_id = p.id
     WHERE p.quest_id = NEW.quest_id
       AND m.user_id = NEW.user_id
       AND p.is_open
       AND p.expires_at > now()
     ORDER BY p.created_at DESC
     LIMIT 1;

    IF party_id IS NULL THEN
      RAISE EXCEPTION 'PARTY_REQUIRED'
        USING ERRCODE = 'check_violation',
              HINT   = 'PARTY_REQUIRED';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtext(party_id::text));

    SELECT count(*)::integer INTO member_count
      FROM quest_party_members
     WHERE party_id = party_id;

    IF member_count < 2 THEN
      RAISE EXCEPTION 'PARTY_REQUIRED'
        USING ERRCODE = 'check_violation',
              HINT   = 'PARTY_REQUIRED';
    END IF;
  END IF;

  -- ── XP award (043). Client-supplied xp_awarded / xp_reason are ignored. ──

  base_xp := coalesce(base_xp, 0);

  -- Highest active multiplier event that is global or for this quest.
  SELECT max(e.multiplier),
         max(e.multiplier) FILTER (WHERE e.quest_id IS NULL)
    INTO m_event, m_event_global
    FROM xp_events e
   WHERE e.kind = 'multiplier'
     AND e.user_id IS NULL
     AND (e.quest_id IS NULL OR e.quest_id = NEW.quest_id)
     AND e.starts_at <= now()
     AND e.ends_at > now();

  m_event := coalesce(m_event, 1);

  -- The caller's oldest active, unconsumed win-back row. FOR UPDATE makes a
  -- concurrent insert by the same player wait, then skip the consumed row.
  SELECT e.id, e.multiplier
    INTO win_back_id, m_personal
    FROM xp_events e
   WHERE e.kind = 'win_back'
     AND e.user_id = NEW.user_id
     AND e.consumed_at IS NULL
     AND e.starts_at <= now()
     AND e.ends_at > now()
   ORDER BY e.created_at, e.id
   LIMIT 1
   FOR UPDATE;

  IF win_back_id IS NOT NULL THEN
    -- Rolled back with the insert if a later check or constraint fails.
    UPDATE xp_events SET consumed_at = now() WHERE id = win_back_id;
  END IF;

  m_personal := coalesce(m_personal, 1);

  -- No stacking: the highest multiplier wins. A tie goes to the win-back row,
  -- because it was just used up.
  m := greatest(1, m_event, m_personal);
  reason := CASE
    WHEN m = 1 THEN NULL
    WHEN m_personal >= m_event THEN 'win_back'
    WHEN m_event_global IS NOT NULL AND m_event_global >= m_event THEN 'weekend'
    ELSE 'quest'
  END;

  -- First finisher: only for a quest that started in the last 7 days. The
  -- advisory lock is held to the end of this transaction, so a second
  -- finisher waits for the first to commit and then sees its row.
  IF quest_start IS NOT NULL AND quest_start > now() - interval '7 days' THEN
    PERFORM pg_advisory_xact_lock(hashtext(NEW.quest_id::text));

    IF NOT EXISTS (
      SELECT 1 FROM completions c
       WHERE c.quest_id = NEW.quest_id
         AND c.status = 'approved'
    ) THEN
      m := m * 1.5;
      reason := 'first_finisher';
    END IF;
  END IF;

  NEW.xp_awarded := round(base_xp * least(m, 3))::integer;
  NEW.xp_reason := reason;

  -- ── Duo bonus on the second member's insert (045). ─────────────────────
  IF party_id IS NOT NULL THEN
    SELECT count(*)::integer INTO done_count
      FROM quest_party_members
     WHERE party_id = party_id
       AND completion_id IS NOT NULL
       AND user_id <> NEW.user_id;

    IF done_count >= 1 THEN
      SELECT m.user_id INTO partner_id
        FROM quest_party_members m
       WHERE m.party_id = party_id
         AND m.user_id <> NEW.user_id
       LIMIT 1;

      SELECT created_at INTO partner_created FROM profiles WHERE id = partner_id;
      SELECT created_at INTO self_created FROM profiles WHERE id = NEW.user_id;

      referral := (partner_created IS NOT NULL AND partner_created > now() - interval '48 hours')
               OR (self_created IS NOT NULL AND self_created > now() - interval '48 hours');

      duo_bonus := CASE WHEN referral THEN base_xp ELSE round(0.5 * base_xp)::integer END;
      NEW.xp_awarded := NEW.xp_awarded + duo_bonus;
      NEW.xp_reason := 'duo';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION normalize_completion_on_insert() FROM PUBLIC, anon, authenticated;

-- ─── 6. AFTER INSERT: link + partner bonus + inbox ─────────────────────────

CREATE OR REPLACE FUNCTION apply_duo_party_on_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  party_id uuid;
  partner_id uuid;
  partner_completion uuid;
  base_xp integer;
  duo_bonus integer;
  referral boolean;
  self_created timestamptz;
  partner_created timestamptz;
  partner_username text;
  new_xp integer;
BEGIN
  IF NEW.status IS DISTINCT FROM 'approved' THEN
    RETURN NEW;
  END IF;

  SELECT p.id INTO party_id
    FROM quest_parties p
    JOIN quest_party_members m ON m.party_id = p.id
   WHERE p.quest_id = NEW.quest_id
     AND m.user_id = NEW.user_id
     AND p.is_open
     AND p.expires_at > now()
   ORDER BY p.created_at DESC
   LIMIT 1;

  IF party_id IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(('duo:' || party_id::text)));

  UPDATE quest_party_members
     SET completion_id = NEW.id
   WHERE party_id = party_id
     AND user_id = NEW.user_id
     AND completion_id IS NULL;

  SELECT m.user_id, m.completion_id
    INTO partner_id, partner_completion
    FROM quest_party_members m
   WHERE m.party_id = party_id
     AND m.user_id <> NEW.user_id
   LIMIT 1;

  -- First member of the pair: nothing else to pay yet.
  IF partner_id IS NULL OR partner_completion IS NULL THEN
    RETURN NEW;
  END IF;

  -- Second member: partner already verified. Pay them the same duo bonus
  -- (this insert already included it in NEW.xp_awarded via normalize).
  SELECT q.xp_reward INTO base_xp FROM quests q WHERE q.id = NEW.quest_id;
  base_xp := coalesce(base_xp, 0);

  SELECT created_at INTO self_created FROM profiles WHERE id = NEW.user_id;
  SELECT created_at, username INTO partner_created, partner_username
    FROM profiles WHERE id = partner_id;

  referral := (partner_created IS NOT NULL AND partner_created > now() - interval '48 hours')
           OR (self_created IS NOT NULL AND self_created > now() - interval '48 hours');

  duo_bonus := CASE WHEN referral THEN base_xp ELSE round(0.5 * base_xp)::integer END;

  -- Only bump the partner once (idempotent if xp_reason already duo and
  -- award already includes the bump — detect via a matching notification).
  IF NOT EXISTS (
    SELECT 1 FROM notifications
     WHERE recipient_id = partner_id
       AND actor_id = NEW.user_id
       AND type = 'duo_bonus'
       AND completion_id = NEW.id
  ) THEN
    UPDATE completions
       SET xp_awarded = xp_awarded + duo_bonus,
           xp_reason = 'duo'
     WHERE id = partner_completion;

    UPDATE profiles
       SET total_xp = total_xp + duo_bonus
     WHERE id = partner_id
     RETURNING total_xp INTO new_xp;

    UPDATE profiles
       SET level = level_from_xp(new_xp)
     WHERE id = partner_id;

    INSERT INTO notifications (recipient_id, actor_id, type, completion_id)
    VALUES (partner_id, NEW.user_id, 'duo_bonus', NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_duo_party_on_completion ON completions;
CREATE TRIGGER trg_apply_duo_party_on_completion
  AFTER INSERT ON completions
  FOR EACH ROW
  EXECUTE FUNCTION apply_duo_party_on_completion();

REVOKE ALL ON FUNCTION apply_duo_party_on_completion() FROM PUBLIC, anon, authenticated;

-- ─── 7. Recruiter badge (recruits rule) ─────────────────────────────────────

DROP FUNCTION IF EXISTS evaluate_badge_unlock(
  text, jsonb, integer, integer, integer, integer, integer, integer, integer,
  integer, integer, integer, integer, integer, integer, boolean, integer
);

CREATE OR REPLACE FUNCTION evaluate_badge_unlock(
  p_rule_type      text,
  p_config         jsonb,
  p_total_xp       integer,
  p_total          integer,
  p_fitness        integer,
  p_social         integer,
  p_food           integer,
  p_community      integer,
  p_nature         integer,
  p_sponsored      integer,
  p_min_hour       integer,
  p_max_hour       integer,
  p_max_weekend    integer,
  p_max_day        integer,
  p_max_streak     integer,
  p_main_character boolean,
  p_rank           integer,
  p_recruits       integer DEFAULT 0
) RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_min      integer;
  v_category text;
BEGIN
  CASE p_rule_type
    WHEN 'completion_count' THEN
      RETURN p_total >= coalesce((p_config->>'min')::integer, 1);

    WHEN 'category_count' THEN
      v_category := p_config->>'category';
      v_min := coalesce((p_config->>'min')::integer, 1);
      RETURN CASE v_category
        WHEN 'fitness'   THEN p_fitness   >= v_min
        WHEN 'social'    THEN p_social    >= v_min
        WHEN 'food'      THEN p_food      >= v_min
        WHEN 'community' THEN p_community >= v_min
        WHEN 'nature'    THEN p_nature    >= v_min
        ELSE false
      END;

    WHEN 'all_categories' THEN
      RETURN p_fitness >= 1 AND p_social >= 1 AND p_food >= 1
         AND p_community >= 1 AND p_nature >= 1;

    WHEN 'time_before_hour' THEN
      RETURN p_min_hour IS NOT NULL
         AND p_min_hour < coalesce((p_config->>'hour')::integer, 8);

    WHEN 'time_after_hour' THEN
      RETURN p_max_hour IS NOT NULL
         AND p_max_hour >= coalesce((p_config->>'hour')::integer, 22);

    WHEN 'weekend_completions' THEN
      RETURN p_max_weekend >= coalesce((p_config->>'min')::integer, 3);

    WHEN 'completions_per_day' THEN
      RETURN p_max_day >= coalesce((p_config->>'min')::integer, 3);

    WHEN 'consecutive_days' THEN
      RETURN p_max_streak >= coalesce((p_config->>'min')::integer, 7);

    WHEN 'sponsored_quests' THEN
      RETURN p_sponsored >= coalesce((p_config->>'min')::integer, 1);

    WHEN 'first_on_quest' THEN
      RETURN p_main_character;

    WHEN 'total_xp' THEN
      RETURN p_total_xp >= coalesce((p_config->>'min')::integer, 1);

    WHEN 'leaderboard_top' THEN
      RETURN p_rank IS NOT NULL
         AND p_rank <= coalesce((p_config->>'n')::integer, 10);

    WHEN 'recruits' THEN
      RETURN coalesce(p_recruits, 0) >= coalesce((p_config->>'min')::integer, 3);

    WHEN 'manual' THEN
      RETURN false;

    ELSE
      RETURN false;
  END CASE;
END;
$$;

REVOKE ALL ON FUNCTION evaluate_badge_unlock(
  text, jsonb, integer, integer, integer, integer, integer, integer, integer,
  integer, integer, integer, integer, integer, integer, boolean, integer, integer
) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION check_badges_on_xp_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_total          integer;
  v_fitness        integer;
  v_social         integer;
  v_food           integer;
  v_community      integer;
  v_nature         integer;
  v_sponsored      integer;
  v_min_hour       integer;
  v_max_hour       integer;
  v_max_weekend    integer;
  v_max_day        integer;
  v_max_streak     integer;
  v_main_character boolean;
  v_rank           integer;
  v_recruits       integer;
  v_tz             text := 'America/Vancouver';
  badge_rec        record;
  condition_met    boolean;
BEGIN
  SELECT count(*) INTO v_total
  FROM completions
  WHERE user_id = new.id AND status = 'approved';

  SELECT
    count(*) FILTER (WHERE q.category::text = 'fitness'),
    count(*) FILTER (WHERE q.category::text = 'social'),
    count(*) FILTER (WHERE q.category::text = 'food'),
    count(*) FILTER (WHERE q.category::text = 'community'),
    count(*) FILTER (WHERE q.category::text = 'nature'),
    count(distinct c.quest_id) FILTER (WHERE q.is_sponsored)
  INTO v_fitness, v_social, v_food, v_community, v_nature, v_sponsored
  FROM completions c
  JOIN quests q ON q.id = c.quest_id
  WHERE c.user_id = new.id AND c.status = 'approved';

  SELECT
    min(extract(hour FROM completed_at AT TIME ZONE v_tz))::int,
    max(extract(hour FROM completed_at AT TIME ZONE v_tz))::int
  INTO v_min_hour, v_max_hour
  FROM completions
  WHERE user_id = new.id AND status = 'approved';

  SELECT coalesce(max(cnt), 0) INTO v_max_weekend
  FROM (
    SELECT count(*) AS cnt
    FROM completions
    WHERE user_id = new.id
      AND status = 'approved'
      AND extract(dow FROM completed_at AT TIME ZONE v_tz) IN (0, 6)
    GROUP BY date(completed_at AT TIME ZONE v_tz)
      - (CASE
           WHEN extract(dow FROM completed_at AT TIME ZONE v_tz) = 0
           THEN 1 ELSE 0
         END)::int
  ) w;

  SELECT coalesce(max(cnt), 0) INTO v_max_day
  FROM (
    SELECT count(*) AS cnt
    FROM completions
    WHERE user_id = new.id AND status = 'approved'
    GROUP BY date(completed_at AT TIME ZONE v_tz)
  ) d;

  SELECT coalesce(max(cnt), 0) INTO v_max_streak
  FROM (
    SELECT count(*) AS cnt
    FROM (
      SELECT d, d - (row_number() OVER (ORDER BY d))::int AS grp
      FROM (
        SELECT DISTINCT date(completed_at AT TIME ZONE v_tz) AS d
        FROM completions
        WHERE user_id = new.id AND status = 'approved'
      ) days
    ) runs
    GROUP BY grp
  ) s;

  SELECT EXISTS (
    SELECT 1
    FROM completions c
    WHERE c.user_id = new.id
      AND c.status = 'approved'
      AND c.completed_at = (
        SELECT min(c2.completed_at)
        FROM completions c2
        WHERE c2.quest_id = c.quest_id AND c2.status = 'approved'
      )
  ) INTO v_main_character;

  SELECT rnk INTO v_rank
  FROM (
    SELECT user_id, row_number() OVER (ORDER BY weekly_xp DESC) AS rnk
    FROM leaderboard
  ) ranked
  WHERE ranked.user_id = new.id;

  -- Distinct duo partners whose accounts were under 48 h old when the duo
  -- completed (both members have a completion_id). Credit goes to the party
  -- creator.
  SELECT coalesce(count(DISTINCT partner.user_id), 0)::integer
    INTO v_recruits
    FROM quest_parties p
    JOIN quest_party_members me ON me.party_id = p.id AND me.user_id = p.created_by
    JOIN quest_party_members partner ON partner.party_id = p.id AND partner.user_id <> me.user_id
    JOIN profiles pr ON pr.id = partner.user_id
    JOIN completions c_me ON c_me.id = me.completion_id
    JOIN completions c_partner ON c_partner.id = partner.completion_id
   WHERE p.created_by = new.id
     AND me.completion_id IS NOT NULL
     AND partner.completion_id IS NOT NULL
     AND pr.created_at > LEAST(c_me.completed_at, c_partner.completed_at) - interval '48 hours';

  FOR badge_rec IN
    SELECT b.id, b.unlock_rule_type, b.unlock_rule_config
    FROM badges b
    LEFT JOIN user_badges ub ON ub.badge_id = b.id AND ub.user_id = new.id
    WHERE ub.badge_id IS NULL
      AND b.is_active = true
      AND b.unlock_rule_type <> 'manual'
  LOOP
    condition_met := evaluate_badge_unlock(
      badge_rec.unlock_rule_type,
      badge_rec.unlock_rule_config,
      new.total_xp,
      v_total,
      v_fitness,
      v_social,
      v_food,
      v_community,
      v_nature,
      v_sponsored,
      v_min_hour,
      v_max_hour,
      v_max_weekend,
      v_max_day,
      v_max_streak,
      v_main_character,
      v_rank,
      v_recruits
    );

    IF condition_met THEN
      INSERT INTO user_badges (user_id, badge_id)
      VALUES (new.id, badge_rec.id)
      ON CONFLICT (user_id, badge_id) DO NOTHING;
    END IF;
  END LOOP;

  RETURN new;
END;
$$;

REVOKE ALL ON FUNCTION check_badges_on_xp_update() FROM PUBLIC, anon, authenticated;

INSERT INTO badges (
  name, description, icon, unlock_condition, rarity, art_key, art_style,
  unlock_rule_type, unlock_rule_config, sort_order, is_active, locked_hint
)
SELECT
  'Recruiter',
  'Bring three new friends on duo quests.',
  '🤝',
  'Complete 3 duo quests with new players',
  'rare',
  'recruiter',
  'medal',
  'recruits',
  '{"min":3}'::jsonb,
  46,
  true,
  'Invite friends who just joined.'
WHERE NOT EXISTS (
  SELECT 1 FROM badges WHERE lower(name) = 'recruiter'
);
