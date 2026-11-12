-- 040: Weekly recap for the signed-in player (Spec 06 §2).
--
-- The leaderboard view only knows the current week, and profiles.last_week_rank
-- is a single rank number with no XP. A recap for a chosen week needs rank and
-- XP for that week, and a client cannot compute rank itself: completions RLS
-- hides other players' private or blocked rows, and the recap must not pull
-- other players' data onto the device anyway.
--
-- own_week_recap(p_week_start) computes everything server-side and returns
-- only the caller's numbers plus the caller's own best place photo.
--
--   * Week = Monday 00:00 to the following Monday 00:00 in America/Vancouver.
--     `date::timestamp AT TIME ZONE` resolves each boundary with the tz
--     database, so a week containing a DST change is 167 or 169 hours.
--   * XP and rank use the same rule as the leaderboard view (031): approved
--     completions by reviewed_at, summing quests.xp_reward. Rank order matches
--     snapshot_last_week_ranks(): weekly_xp DESC, user_id.
--   * Only the current week and the one before it are accepted.
--
-- Known limits of recomputing a past week from live rows (no snapshot table):
-- a completion removed by moderation since then no longer counts, a quest whose
-- xp_reward was edited counts at its new value, and deleted accounts are gone.
-- Bonus XP that is not tied to a completion (035 suggestion bonus) is not in
-- weekly XP, same as the leaderboard.
--
-- Streak: profiles keeps only the current streak. For the two weeks allowed
-- here it can be derived exactly from last_completion_week; anything else
-- returns null and the card leaves the streak out.
--
-- Photo: the caller's own approved, not-hidden completion photo from that
-- week. Most liked first, then highest XP, then latest. Never selfie_url,
-- never coordinates.
--
-- This file changes nothing on a hosted database until an owner applies it.

CREATE OR REPLACE FUNCTION own_week_recap(p_week_start date)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid uuid := auth.uid();
  this_monday date;
  week_from timestamptz;
  week_to timestamptz;
  own_xp integer := 0;
  own_quests integer := 0;
  own_rank integer;
  ranked_players integer := 0;
  cur_streak integer;
  last_week text;
  sel_label text;
  next_label text;
  streak integer;
  photo jsonb;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'own_week_recap requires a signed-in player';
  END IF;

  this_monday := date_trunc('week', now() AT TIME ZONE 'America/Vancouver')::date;

  IF p_week_start IS NULL
     OR (p_week_start <> this_monday AND p_week_start <> this_monday - 7) THEN
    RAISE EXCEPTION 'RECAP_WEEK_OUT_OF_RANGE'
      USING ERRCODE = 'invalid_parameter_value',
            HINT    = 'RECAP_WEEK_OUT_OF_RANGE';
  END IF;

  week_from := p_week_start::timestamp AT TIME ZONE 'America/Vancouver';
  week_to   := (p_week_start + 7)::timestamp AT TIME ZONE 'America/Vancouver';

  WITH xp AS (
    SELECT c.user_id,
           COALESCE(sum(q.xp_reward), 0)::integer AS weekly_xp,
           count(*)::integer AS quests
      FROM completions c
      JOIN quests q ON q.id = c.quest_id
     WHERE c.status = 'approved'
       AND c.reviewed_at >= week_from
       AND c.reviewed_at <  week_to
     GROUP BY c.user_id
  ),
  ranked AS (
    SELECT user_id,
           row_number() OVER (ORDER BY weekly_xp DESC, user_id)::integer AS rnk
      FROM xp
     WHERE weekly_xp > 0
  )
  SELECT x.weekly_xp, x.quests, r.rnk
    INTO own_xp, own_quests, own_rank
    FROM xp x
    LEFT JOIN ranked r ON r.user_id = x.user_id
   WHERE x.user_id = uid;

  own_xp := COALESCE(own_xp, 0);
  own_quests := COALESCE(own_quests, 0);

  SELECT count(*)::integer
    INTO ranked_players
    FROM (
      SELECT c.user_id
        FROM completions c
        JOIN quests q ON q.id = c.quest_id
       WHERE c.status = 'approved'
         AND c.reviewed_at >= week_from
         AND c.reviewed_at <  week_to
       GROUP BY c.user_id
      HAVING COALESCE(sum(q.xp_reward), 0) > 0
    ) players;

  SELECT current_streak, last_completion_week
    INTO cur_streak, last_week
    FROM profiles
   WHERE id = uid;

  sel_label  := to_char(p_week_start, 'IYYY-"W"IW');
  next_label := to_char(p_week_start + 7, 'IYYY-"W"IW');

  streak := CASE
    WHEN own_quests = 0 THEN 0
    WHEN last_week = sel_label THEN cur_streak
    WHEN last_week = next_label THEN GREATEST(cur_streak - 1, 1)
    ELSE NULL
  END;

  SELECT jsonb_build_object(
           'completion_id', c.id,
           'photo_url', c.photo_url,
           'quest_title', q.title,
           'category', q.category::text
         )
    INTO photo
    FROM completions c
    JOIN quests q ON q.id = c.quest_id
   WHERE c.user_id = uid
     AND c.status = 'approved'
     AND c.hidden_pending_review = false
     AND c.photo_url IS NOT NULL
     AND c.reviewed_at >= week_from
     AND c.reviewed_at <  week_to
   ORDER BY (SELECT count(*) FROM completion_likes l WHERE l.completion_id = c.id) DESC,
            q.xp_reward DESC,
            c.completed_at DESC
   LIMIT 1;

  RETURN jsonb_build_object(
    'week_start', p_week_start,
    'starts_at', week_from,
    'ends_at', week_to,
    'in_progress', now() < week_to,
    'weekly_xp', own_xp,
    'quests_completed', own_quests,
    'rank', own_rank,
    'ranked_players', ranked_players,
    'streak_weeks', streak,
    'best_photo', photo
  );
END;
$$;

REVOKE ALL ON FUNCTION own_week_recap(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION own_week_recap(date) TO authenticated;
