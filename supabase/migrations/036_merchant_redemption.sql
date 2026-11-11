-- Spec 07: merchant redemption.
-- redeemed_at and the 8-character code already exist (017). This adds an
-- unguessable per-sponsor link, a lookup budget, and server-only functions
-- that mark a code used exactly once. Nothing here is granted to the app.

CREATE TABLE IF NOT EXISTS sponsors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  merchant_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sponsors_name_len CHECK (char_length(btrim(name)) BETWEEN 1 AND 80),
  CONSTRAINT sponsors_key_format CHECK (merchant_key ~ '^[a-f0-9]{48}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS sponsors_name_lower_idx ON sponsors (lower(btrim(name)));
CREATE UNIQUE INDEX IF NOT EXISTS sponsors_merchant_key_idx ON sponsors (merchant_key);

CREATE TABLE IF NOT EXISTS redemption_lookups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id uuid NOT NULL REFERENCES sponsors (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS redemption_lookups_recent_idx
  ON redemption_lookups (sponsor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS completions_redemption_code_idx
  ON completions (redemption_code)
  WHERE redemption_code IS NOT NULL;

ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemption_lookups ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE sponsors FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE redemption_lookups FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE sponsors TO service_role;
GRANT ALL ON TABLE redemption_lookups TO service_role;

-- A player insert must not arrive already redeemed.
CREATE OR REPLACE FUNCTION clear_client_redeemed_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.redeemed_at := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clear_client_redeemed_at ON completions;
CREATE TRIGGER trg_clear_client_redeemed_at
  BEFORE INSERT ON completions
  FOR EACH ROW
  EXECUTE FUNCTION clear_client_redeemed_at();

-- Only the service-role redeem function may set redeemed_at.
CREATE OR REPLACE FUNCTION protect_redeemed_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_setting('quest.redeeming', true) IS DISTINCT FROM '1'
     AND coalesce(auth.role(), '') IS DISTINCT FROM 'service_role' THEN
    NEW.redeemed_at := OLD.redeemed_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_redeemed_at ON completions;
CREATE TRIGGER trg_protect_redeemed_at
  BEFORE UPDATE ON completions
  FOR EACH ROW
  WHEN (OLD.redeemed_at IS DISTINCT FROM NEW.redeemed_at)
  EXECUTE FUNCTION protect_redeemed_at();

-- Sliding window: 10 attempts per minute per sponsor. A rejected attempt
-- is not inserted, so hammering does not push the window forward.
CREATE OR REPLACE FUNCTION redemption_attempt_allowed(p_sponsor_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  recent integer;
BEGIN
  DELETE FROM redemption_lookups
   WHERE sponsor_id = p_sponsor_id
     AND created_at < now() - interval '1 hour';

  SELECT count(*)::integer INTO recent
    FROM redemption_lookups
   WHERE sponsor_id = p_sponsor_id
     AND created_at > now() - interval '1 minute';

  IF recent >= 10 THEN
    RETURN false;
  END IF;

  INSERT INTO redemption_lookups (sponsor_id) VALUES (p_sponsor_id);
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION lookup_redemption(p_merchant_key text, p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  sponsor sponsors%ROWTYPE;
  v_code text;
  rec record;
BEGIN
  IF coalesce(auth.role(), '') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'lookup_redemption is server-only';
  END IF;

  IF p_merchant_key IS NULL OR char_length(p_merchant_key) > 64 THEN
    RETURN jsonb_build_object('result', 'invalid');
  END IF;

  SELECT * INTO sponsor FROM sponsors WHERE merchant_key = p_merchant_key;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('result', 'invalid');
  END IF;

  IF NOT redemption_attempt_allowed(sponsor.id) THEN
    RETURN jsonb_build_object('result', 'limited');
  END IF;

  v_code := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  IF v_code !~ '^[A-Z0-9]{8}$' THEN
    RETURN jsonb_build_object('result', 'invalid');
  END IF;

  SELECT q.title, q.sponsor_reward, p.level, c.redeemed_at
    INTO rec
    FROM completions c
    JOIN quests q ON q.id = c.quest_id
    JOIN profiles p ON p.id = c.user_id
   WHERE c.redemption_code = v_code
     AND c.status = 'approved'
     AND q.is_sponsored = true
     AND lower(btrim(q.sponsor_name)) = lower(btrim(sponsor.name))
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('result', 'invalid');
  END IF;

  IF rec.redeemed_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'result', 'used',
      'title', rec.title,
      'reward', rec.sponsor_reward,
      'level', rec.level,
      'redeemed_at', rec.redeemed_at
    );
  END IF;

  RETURN jsonb_build_object(
    'result', 'valid',
    'title', rec.title,
    'reward', rec.sponsor_reward,
    'level', rec.level
  );
END;
$$;

CREATE OR REPLACE FUNCTION mark_redemption(p_merchant_key text, p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  sponsor sponsors%ROWTYPE;
  v_code text;
  rec record;
  stamped timestamptz;
BEGIN
  IF coalesce(auth.role(), '') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'mark_redemption is server-only';
  END IF;

  IF p_merchant_key IS NULL OR char_length(p_merchant_key) > 64 THEN
    RETURN jsonb_build_object('result', 'invalid');
  END IF;

  SELECT * INTO sponsor FROM sponsors WHERE merchant_key = p_merchant_key;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('result', 'invalid');
  END IF;

  IF NOT redemption_attempt_allowed(sponsor.id) THEN
    RETURN jsonb_build_object('result', 'limited');
  END IF;

  v_code := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  IF v_code !~ '^[A-Z0-9]{8}$' THEN
    RETURN jsonb_build_object('result', 'invalid');
  END IF;

  SELECT c.id, q.title, q.sponsor_reward, p.level, c.redeemed_at
    INTO rec
    FROM completions c
    JOIN quests q ON q.id = c.quest_id
    JOIN profiles p ON p.id = c.user_id
   WHERE c.redemption_code = v_code
     AND c.status = 'approved'
     AND q.is_sponsored = true
     AND lower(btrim(q.sponsor_name)) = lower(btrim(sponsor.name))
   LIMIT 1
   FOR UPDATE OF c;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('result', 'invalid');
  END IF;

  IF rec.redeemed_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'result', 'used',
      'title', rec.title,
      'reward', rec.sponsor_reward,
      'level', rec.level,
      'redeemed_at', rec.redeemed_at
    );
  END IF;

  -- Local to this transaction. The trigger refuses every other writer.
  PERFORM set_config('quest.redeeming', '1', true);

  UPDATE completions
     SET redeemed_at = now()
   WHERE id = rec.id
     AND redeemed_at IS NULL
   RETURNING redeemed_at INTO stamped;

  IF stamped IS NULL THEN
    SELECT redeemed_at INTO stamped FROM completions WHERE id = rec.id;
    RETURN jsonb_build_object(
      'result', 'used',
      'title', rec.title,
      'reward', rec.sponsor_reward,
      'level', rec.level,
      'redeemed_at', stamped
    );
  END IF;

  RETURN jsonb_build_object(
    'result', 'redeemed',
    'title', rec.title,
    'reward', rec.sponsor_reward,
    'level', rec.level,
    'redeemed_at', stamped
  );
END;
$$;

REVOKE ALL ON FUNCTION clear_client_redeemed_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION protect_redeemed_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION redemption_attempt_allowed(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION lookup_redemption(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION mark_redemption(text, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION lookup_redemption(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION mark_redemption(text, text) TO service_role;
