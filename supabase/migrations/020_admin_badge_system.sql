-- 020: Admin-managed badge system — metadata columns, icon uploads, data-driven unlock rules

-- ─── BADGE METADATA COLUMNS ──────────────────────────────────────────────────

alter table badges
  add column if not exists icon_url text,
  add column if not exists rarity text not null default 'common'
    check (rarity in ('common', 'rare', 'epic', 'legendary')),
  add column if not exists art_style text not null default 'medal'
    check (art_style in ('medal', 'animated', 'pixel')),
  add column if not exists locked_hint text,
  add column if not exists is_secret boolean not null default false,
  add column if not exists art_key text,
  add column if not exists unlock_rule_type text not null default 'manual',
  add column if not exists unlock_rule_config jsonb not null default '{}'::jsonb,
  add column if not exists sort_order integer not null default 0,
  add column if not exists is_active boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists badges_name_lower_unique on badges (lower(name));

-- ─── BACKFILL UNLOCK RULES (from legacy name-based trigger) ──────────────────

update badges set unlock_rule_type = 'completion_count', unlock_rule_config = '{"min":1}'::jsonb
  where name = 'First Quest';
update badges set unlock_rule_type = 'completion_count', unlock_rule_config = '{"min":5}'::jsonb
  where name = 'Getting Warmed Up';
update badges set unlock_rule_type = 'completion_count', unlock_rule_config = '{"min":10}'::jsonb
  where name = 'Local Hero';
update badges set unlock_rule_type = 'all_categories', unlock_rule_config = '{}'::jsonb
  where name = 'Explorer';
update badges set unlock_rule_type = 'category_count', unlock_rule_config = '{"category":"fitness","min":3}'::jsonb
  where name = 'Fitness Fanatic';
update badges set unlock_rule_type = 'category_count', unlock_rule_config = '{"category":"social","min":3}'::jsonb
  where name = 'Social Butterfly';
update badges set unlock_rule_type = 'category_count', unlock_rule_config = '{"category":"food","min":3}'::jsonb
  where name = 'Foodie';
update badges set unlock_rule_type = 'category_count', unlock_rule_config = '{"category":"community","min":3}'::jsonb
  where name = 'Community Champion';
update badges set unlock_rule_type = 'category_count', unlock_rule_config = '{"category":"nature","min":3}'::jsonb
  where name = 'Nature Lover';
update badges set unlock_rule_type = 'category_count', unlock_rule_config = '{"category":"nature","min":1}'::jsonb
  where name = 'Touch Grass';
update badges set unlock_rule_type = 'time_before_hour',
  unlock_rule_config = '{"hour":8,"timezone":"America/Vancouver"}'::jsonb
  where name = 'Early Bird';
update badges set unlock_rule_type = 'time_after_hour',
  unlock_rule_config = '{"hour":22,"timezone":"America/Vancouver"}'::jsonb
  where name = 'Night Owl';
update badges set unlock_rule_type = 'weekend_completions', unlock_rule_config = '{"min":3}'::jsonb
  where name = 'Weekend Warrior';
update badges set unlock_rule_type = 'completions_per_day', unlock_rule_config = '{"min":3}'::jsonb
  where name = 'Gotta Go Fast';
update badges set unlock_rule_type = 'sponsored_quests', unlock_rule_config = '{"min":3}'::jsonb
  where name = 'Tourist In Your Own Town';
update badges set unlock_rule_type = 'consecutive_days', unlock_rule_config = '{"min":7}'::jsonb
  where name = 'One Does Not Simply';
update badges set unlock_rule_type = 'first_on_quest', unlock_rule_config = '{}'::jsonb
  where name = 'Main Character';
update badges set unlock_rule_type = 'total_xp', unlock_rule_config = '{"min":9000}'::jsonb
  where name = 'It''s Over 9000!';
update badges set unlock_rule_type = 'leaderboard_top', unlock_rule_config = '{"n":10}'::jsonb
  where name = 'Top 10';
update badges set unlock_rule_type = 'manual', unlock_rule_config = '{}'::jsonb
  where name = 'Season Veteran';

-- Backfill presentation metadata from mobile catalog
update badges set rarity = 'legendary', art_key = 'top-10', sort_order = 1
  where name = 'Top 10';
update badges set rarity = 'legendary', art_key = 'over-9000', art_style = 'animated', sort_order = 2
  where name = 'It''s Over 9000!';
update badges set rarity = 'legendary', art_key = 'season-veteran', sort_order = 3
  where name = 'Season Veteran';
update badges set rarity = 'epic', art_key = 'explorer', art_style = 'animated', sort_order = 10
  where name = 'Explorer';
update badges set rarity = 'epic', art_key = 'local-hero', sort_order = 11
  where name = 'Local Hero';
update badges set rarity = 'epic', art_key = 'weekend-warrior', art_style = 'animated', sort_order = 12
  where name = 'Weekend Warrior';
update badges set rarity = 'epic', art_key = 'one-does-not-simply', art_style = 'pixel', sort_order = 13
  where name = 'One Does Not Simply';
update badges set rarity = 'epic', art_key = 'main-character', art_style = 'pixel', is_secret = true, sort_order = 14
  where name = 'Main Character';
update badges set rarity = 'rare', art_key = 'fitness-fanatic', sort_order = 20
  where name = 'Fitness Fanatic';
update badges set rarity = 'rare', art_key = 'social-butterfly', art_style = 'animated', sort_order = 21
  where name = 'Social Butterfly';
update badges set rarity = 'rare', art_key = 'foodie', sort_order = 22
  where name = 'Foodie';
update badges set rarity = 'rare', art_key = 'community-champion', sort_order = 23
  where name = 'Community Champion';
update badges set rarity = 'rare', art_key = 'nature-lover', sort_order = 24
  where name = 'Nature Lover';
update badges set rarity = 'rare', art_key = 'gotta-go-fast', art_style = 'pixel', sort_order = 25
  where name = 'Gotta Go Fast';
update badges set rarity = 'rare', art_key = 'tourist', art_style = 'animated', sort_order = 26
  where name = 'Tourist In Your Own Town';
update badges set rarity = 'common', art_key = 'first-quest', sort_order = 30
  where name = 'First Quest';
update badges set rarity = 'common', art_key = 'touch-grass', art_style = 'pixel', sort_order = 31
  where name = 'Touch Grass';
update badges set rarity = 'common', art_key = 'early-bird', art_style = 'animated', sort_order = 32
  where name = 'Early Bird';
update badges set rarity = 'common', art_key = 'night-owl', art_style = 'animated', sort_order = 33
  where name = 'Night Owl';
update badges set rarity = 'common', art_key = 'warmed-up', art_style = 'animated', sort_order = 34
  where name = 'Getting Warmed Up';

-- ─── BADGE ICON STORAGE ──────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('badge-icons', 'badge-icons', true)
on conflict (id) do nothing;

drop policy if exists "Anyone can view badge icons" on storage.objects;
create policy "Anyone can view badge icons"
  on storage.objects for select
  using (bucket_id = 'badge-icons');

-- ─── DATA-DRIVEN UNLOCK EVALUATOR ────────────────────────────────────────────

create or replace function evaluate_badge_unlock(
  p_rule_type text,
  p_config jsonb,
  p_user_id uuid,
  p_total_xp integer,
  p_total integer,
  p_fitness integer,
  p_social integer,
  p_food integer,
  p_community integer,
  p_nature integer,
  p_sponsored integer,
  p_early_bird boolean,
  p_night_owl boolean,
  p_weekend_warrior boolean,
  p_speedrun boolean,
  p_streak7 boolean,
  p_main_character boolean,
  p_top10 boolean
) returns boolean
language plpgsql
immutable
as $$
declare
  v_min integer;
  v_category text;
  v_tz text;
begin
  case p_rule_type
    when 'completion_count' then
      v_min := coalesce((p_config->>'min')::integer, 1);
      return p_total >= v_min;
    when 'category_count' then
      v_category := p_config->>'category';
      v_min := coalesce((p_config->>'min')::integer, 1);
      return case v_category
        when 'fitness' then p_fitness >= v_min
        when 'social' then p_social >= v_min
        when 'food' then p_food >= v_min
        when 'community' then p_community >= v_min
        when 'nature' then p_nature >= v_min
        else false
      end;
    when 'all_categories' then
      return p_fitness >= 1 and p_social >= 1 and p_food >= 1
         and p_community >= 1 and p_nature >= 1;
    when 'time_before_hour' then
      return p_early_bird;
    when 'time_after_hour' then
      return p_night_owl;
    when 'weekend_completions' then
      return p_weekend_warrior;
    when 'completions_per_day' then
      return p_speedrun;
    when 'sponsored_quests' then
      v_min := coalesce((p_config->>'min')::integer, 1);
      return p_sponsored >= v_min;
    when 'consecutive_days' then
      return p_streak7;
    when 'first_on_quest' then
      return p_main_character;
    when 'total_xp' then
      v_min := coalesce((p_config->>'min')::integer, 1);
      return p_total_xp >= v_min;
    when 'leaderboard_top' then
      return p_top10;
    when 'manual' then
      return false;
    else
      return false;
  end case;
end;
$$;

-- ─── BADGE AWARD TRIGGER (reads unlock_rule_* from badges table) ─────────────

drop trigger if exists on_xp_update on profiles;

create or replace function check_badges_on_xp_update()
returns trigger language plpgsql security definer as $$
declare
  v_total           integer;
  v_fitness         integer;
  v_social          integer;
  v_food            integer;
  v_community       integer;
  v_nature          integer;
  v_sponsored       integer;
  v_explorer        boolean;
  v_early_bird      boolean;
  v_night_owl       boolean;
  v_weekend_warrior boolean;
  v_speedrun        boolean;
  v_streak7         boolean;
  v_main_character  boolean;
  v_top10           boolean;
  badge_rec         record;
  condition_met     boolean;
  v_tz              text;
begin
  select count(*) into v_total
  from completions
  where user_id = new.id and status = 'approved';

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

  v_tz := 'America/Vancouver';

  select
    bool_or(extract(hour from completed_at at time zone v_tz) < 8),
    bool_or(extract(hour from completed_at at time zone v_tz) >= 22)
  into v_early_bird, v_night_owl
  from completions
  where user_id = new.id and status = 'approved';

  v_early_bird := coalesce(v_early_bird, false);
  v_night_owl  := coalesce(v_night_owl, false);

  select exists (
    select 1
    from (
      select
        date(completed_at at time zone v_tz)
          - (case
               when extract(dow from completed_at at time zone v_tz) = 0
               then 1 else 0
             end)::int as weekend_sat
      from completions
      where user_id = new.id
        and status = 'approved'
        and extract(dow from completed_at at time zone v_tz) in (0, 6)
    ) sub
    group by weekend_sat
    having count(*) >= coalesce((
      select (unlock_rule_config->>'min')::integer
      from badges
      where unlock_rule_type = 'weekend_completions'
      limit 1
    ), 3)
  ) into v_weekend_warrior;

  select exists (
    select 1
    from completions
    where user_id = new.id and status = 'approved'
    group by date(completed_at at time zone v_tz)
    having count(*) >= coalesce((
      select (unlock_rule_config->>'min')::integer
      from badges
      where unlock_rule_type = 'completions_per_day'
      limit 1
    ), 3)
  ) into v_speedrun;

  select exists (
    select 1
    from (
      select d, d - (row_number() over (order by d))::int as grp
      from (
        select distinct date(completed_at at time zone v_tz) as d
        from completions
        where user_id = new.id and status = 'approved'
      ) days
    ) runs
    group by grp
    having count(*) >= coalesce((
      select (unlock_rule_config->>'min')::integer
      from badges
      where unlock_rule_type = 'consecutive_days'
      limit 1
    ), 7)
  ) into v_streak7;

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

  select exists (
    select 1
    from (select user_id from leaderboard order by weekly_xp desc limit 10) top10
    where top10.user_id = new.id
  ) into v_top10;

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
      new.id,
      new.total_xp,
      v_total,
      v_fitness,
      v_social,
      v_food,
      v_community,
      v_nature,
      v_sponsored,
      v_early_bird,
      v_night_owl,
      v_weekend_warrior,
      v_speedrun,
      v_streak7,
      v_main_character,
      v_top10
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
