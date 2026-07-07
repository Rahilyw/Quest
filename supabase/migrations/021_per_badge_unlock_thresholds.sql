-- 021: Per-badge unlock thresholds
--
-- Migration 020 reduced several rules to a single precomputed boolean, so the
-- threshold came from ONE badge of that type (weekend/per-day/streak read the
-- first matching row; leaderboard_top and the hour rules ignored their config
-- entirely). Two badges sharing a rule type could not have different limits.
--
-- Fix: precompute raw per-user METRICS that carry no threshold (longest streak,
-- busiest weekend, busiest day, leaderboard rank, earliest/latest local hour),
-- then let evaluate_badge_unlock() compare each badge's own config against them.
-- Every badge now honours its own numbers independently.

-- ─── DATA-DRIVEN UNLOCK EVALUATOR (new signature: raw metrics, not booleans) ──

drop function if exists evaluate_badge_unlock(
  text, jsonb, uuid, integer, integer, integer, integer, integer, integer,
  integer, integer, boolean, boolean, boolean, boolean, boolean, boolean, boolean
);

create or replace function evaluate_badge_unlock(
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
  p_min_hour       integer,   -- earliest local completion hour (null if none)
  p_max_hour       integer,   -- latest local completion hour (null if none)
  p_max_weekend    integer,   -- most completions in any one Sat–Sun weekend
  p_max_day        integer,   -- most completions in any one local day
  p_max_streak     integer,   -- longest run of consecutive local days
  p_main_character boolean,   -- holds the earliest completion on some quest
  p_rank           integer    -- weekly leaderboard rank (null if unranked)
) returns boolean
language plpgsql
immutable
as $$
declare
  v_min      integer;
  v_category text;
begin
  case p_rule_type
    when 'completion_count' then
      return p_total >= coalesce((p_config->>'min')::integer, 1);

    when 'category_count' then
      v_category := p_config->>'category';
      v_min := coalesce((p_config->>'min')::integer, 1);
      return case v_category
        when 'fitness'   then p_fitness   >= v_min
        when 'social'    then p_social    >= v_min
        when 'food'      then p_food      >= v_min
        when 'community' then p_community >= v_min
        when 'nature'    then p_nature    >= v_min
        else false
      end;

    when 'all_categories' then
      return p_fitness >= 1 and p_social >= 1 and p_food >= 1
         and p_community >= 1 and p_nature >= 1;

    when 'time_before_hour' then
      return p_min_hour is not null
         and p_min_hour < coalesce((p_config->>'hour')::integer, 8);

    when 'time_after_hour' then
      return p_max_hour is not null
         and p_max_hour >= coalesce((p_config->>'hour')::integer, 22);

    when 'weekend_completions' then
      return p_max_weekend >= coalesce((p_config->>'min')::integer, 3);

    when 'completions_per_day' then
      return p_max_day >= coalesce((p_config->>'min')::integer, 3);

    when 'consecutive_days' then
      return p_max_streak >= coalesce((p_config->>'min')::integer, 7);

    when 'sponsored_quests' then
      return p_sponsored >= coalesce((p_config->>'min')::integer, 1);

    when 'first_on_quest' then
      return p_main_character;

    when 'total_xp' then
      return p_total_xp >= coalesce((p_config->>'min')::integer, 1);

    when 'leaderboard_top' then
      return p_rank is not null
         and p_rank <= coalesce((p_config->>'n')::integer, 10);

    when 'manual' then
      return false;

    else
      return false;
  end case;
end;
$$;

-- ─── BADGE AWARD TRIGGER (precomputes raw metrics, evaluates each badge) ──────

drop trigger if exists on_xp_update on profiles;

create or replace function check_badges_on_xp_update()
returns trigger language plpgsql security definer as $$
declare
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
  v_tz             text := 'America/Vancouver';
  badge_rec        record;
  condition_met    boolean;
begin
  -- ── Total approved completions ──────────────────────────────────────────
  select count(*) into v_total
  from completions
  where user_id = new.id and status = 'approved';

  -- ── Per-category counts + distinct sponsored (single scan) ──────────────
  select
    count(*) filter (where q.category::text = 'fitness'),
    count(*) filter (where q.category::text = 'social'),
    count(*) filter (where q.category::text = 'food'),
    count(*) filter (where q.category::text = 'community'),
    count(*) filter (where q.category::text = 'nature'),
    count(distinct c.quest_id) filter (where q.is_sponsored)
  into v_fitness, v_social, v_food, v_community, v_nature, v_sponsored
  from completions c
  join quests q on q.id = c.quest_id
  where c.user_id = new.id and c.status = 'approved';

  -- ── Earliest / latest local completion hour ─────────────────────────────
  select
    min(extract(hour from completed_at at time zone v_tz))::int,
    max(extract(hour from completed_at at time zone v_tz))::int
  into v_min_hour, v_max_hour
  from completions
  where user_id = new.id and status = 'approved';

  -- ── Busiest weekend: max completions in any one Sat–Sun pair ────────────
  -- Normalise Sunday to the previous Saturday so both days share a group key.
  select coalesce(max(cnt), 0) into v_max_weekend
  from (
    select count(*) as cnt
    from completions
    where user_id = new.id
      and status = 'approved'
      and extract(dow from completed_at at time zone v_tz) in (0, 6)
    group by date(completed_at at time zone v_tz)
      - (case
           when extract(dow from completed_at at time zone v_tz) = 0
           then 1 else 0
         end)::int
  ) w;

  -- ── Busiest single local day ────────────────────────────────────────────
  select coalesce(max(cnt), 0) into v_max_day
  from (
    select count(*) as cnt
    from completions
    where user_id = new.id and status = 'approved'
    group by date(completed_at at time zone v_tz)
  ) d;

  -- ── Longest run of consecutive local days (gaps and islands) ────────────
  select coalesce(max(cnt), 0) into v_max_streak
  from (
    select count(*) as cnt
    from (
      select d, d - (row_number() over (order by d))::int as grp
      from (
        select distinct date(completed_at at time zone v_tz) as d
        from completions
        where user_id = new.id and status = 'approved'
      ) days
    ) runs
    group by grp
  ) s;

  -- ── Main Character: holds the earliest approved completion on a quest ───
  select exists (
    select 1
    from completions c
    where c.user_id = new.id
      and c.status = 'approved'
      and c.completed_at = (
        select min(c2.completed_at)
        from completions c2
        where c2.quest_id = c.quest_id and c2.status = 'approved'
      )
  ) into v_main_character;

  -- ── Weekly leaderboard rank (null when the user is not on the board) ────
  select rnk into v_rank
  from (
    select user_id, row_number() over (order by weekly_xp desc) as rnk
    from leaderboard
  ) ranked
  where ranked.user_id = new.id;

  -- ── Award any unearned, active, auto-award badge whose rule now passes ──
  for badge_rec in
    select b.id, b.unlock_rule_type, b.unlock_rule_config
    from badges b
    left join user_badges ub on ub.badge_id = b.id and ub.user_id = new.id
    where ub.badge_id is null
      and b.is_active = true
      and b.unlock_rule_type <> 'manual'
  loop
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
      v_rank
    );

    if condition_met then
      insert into user_badges (user_id, badge_id)
      values (new.id, badge_rec.id)
      on conflict (user_id, badge_id) do nothing;
    end if;
  end loop;

  return new;
end;
$$;

create trigger on_xp_update
  after update of total_xp on profiles
  for each row execute procedure check_badges_on_xp_update();
