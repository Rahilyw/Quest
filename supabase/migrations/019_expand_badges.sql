-- ─── 019_expand_badges.sql ───────────────────────────────────────────────────
-- Grows the badge set from 13 to 20 and teaches the unlock trigger the new
-- rules. Badge names must match apps/mobile/lib/badgeCatalog.ts exactly —
-- the mobile app keys art and copy off the name.
--
-- New badges:
--   Touch Grass              — 1+ approved nature completion
--   Night Owl                — 1+ approved completion at 22:00+ local
--   Gotta Go Fast            — 3+ approved completions in one local day
--   Tourist In Your Own Town — 3+ distinct sponsored quests completed
--   One Does Not Simply      — approved completions on 7 consecutive local days
--   Main Character           — earliest approved completion on any quest
--   It's Over 9000!          — 9,000+ lifetime XP
-- ─────────────────────────────────────────────────────────────────────────────

insert into badges (name, description, icon, unlock_condition)
select v.name, v.description, v.icon, v.unlock_condition
from (values
  ('Touch Grass', 'Completed a nature quest. The internet is proud.', '🌱', 'complete 1 nature quest'),
  ('Night Owl', 'Completed a quest after 10pm', '🦉', 'complete a quest after 10pm'),
  ('Gotta Go Fast', 'Completed 3 quests in a single day', '👟', 'complete 3 quests in 1 day'),
  ('Tourist In Your Own Town', 'Completed 3 sponsored quests', '📸', 'complete 3 sponsored quests'),
  ('One Does Not Simply', 'Completed quests 7 days in a row', '🌋', 'complete quests 7 days in a row'),
  ('Main Character', 'First in the city to complete a quest', '😎', 'be first to complete a quest'),
  ('It''s Over 9000!', 'Earned 9,000 lifetime XP', '💥', 'earn 9,000 lifetime XP')
) as v(name, description, icon, unlock_condition)
where not exists (select 1 from badges b where b.name = v.name);

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
begin
  -- ── Total approved completions ──────────────────────────────────────────
  select count(*) into v_total
  from completions
  where user_id = new.id and status = 'approved';

  -- ── Per-category counts (single scan) ──────────────────────────────────
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

  -- ── Explorer: at least 1 in each of the 5 core categories ─────────────
  v_explorer := (
    v_fitness >= 1 and v_social >= 1 and v_food >= 1
    and v_community >= 1 and v_nature >= 1
  );

  -- ── Early Bird / Night Owl: local-hour completions ──────────────────────
  select
    bool_or(extract(hour from completed_at at time zone 'America/Vancouver') < 8),
    bool_or(extract(hour from completed_at at time zone 'America/Vancouver') >= 22)
  into v_early_bird, v_night_owl
  from completions
  where user_id = new.id and status = 'approved';

  v_early_bird := coalesce(v_early_bird, false);
  v_night_owl  := coalesce(v_night_owl, false);

  -- ── Weekend Warrior: 3+ completions on Sat/Sun of the same weekend ─────
  select exists (
    select 1
    from (
      select
        date(completed_at at time zone 'America/Vancouver')
          - (case
               when extract(dow from completed_at at time zone 'America/Vancouver') = 0
               then 1 else 0
             end)::int as weekend_sat
      from completions
      where user_id = new.id
        and status = 'approved'
        and extract(dow from completed_at at time zone 'America/Vancouver') in (0, 6)
    ) sub
    group by weekend_sat
    having count(*) >= 3
  ) into v_weekend_warrior;

  -- ── Gotta Go Fast: 3+ completions inside one local day ──────────────────
  select exists (
    select 1
    from completions
    where user_id = new.id and status = 'approved'
    group by date(completed_at at time zone 'America/Vancouver')
    having count(*) >= 3
  ) into v_speedrun;

  -- ── One Does Not Simply: 7 consecutive local days with a completion ─────
  select exists (
    select 1
    from (
      select d, d - (row_number() over (order by d))::int as grp
      from (
        select distinct date(completed_at at time zone 'America/Vancouver') as d
        from completions
        where user_id = new.id and status = 'approved'
      ) days
    ) runs
    group by grp
    having count(*) >= 7
  ) into v_streak7;

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

  -- ── Top 10: user currently in top 10 of the weekly leaderboard ─────────
  select exists (
    select 1
    from (select user_id from leaderboard order by weekly_xp desc limit 10) top10
    where top10.user_id = new.id
  ) into v_top10;

  -- ── Award any unearned badges whose condition is now met ────────────────
  for badge_rec in
    select b.id, b.name
    from badges b
    left join user_badges ub on ub.badge_id = b.id and ub.user_id = new.id
    where ub.badge_id is null
  loop
    condition_met := case badge_rec.name
      when 'First Quest'              then v_total >= 1
      when 'Getting Warmed Up'        then v_total >= 5
      when 'Local Hero'               then v_total >= 10
      when 'Explorer'                 then v_explorer
      when 'Fitness Fanatic'          then v_fitness >= 3
      when 'Social Butterfly'         then v_social >= 3
      when 'Foodie'                   then v_food >= 3
      when 'Community Champion'       then v_community >= 3
      when 'Nature Lover'             then v_nature >= 3
      when 'Touch Grass'              then v_nature >= 1
      when 'Early Bird'               then v_early_bird
      when 'Night Owl'                then v_night_owl
      when 'Weekend Warrior'          then v_weekend_warrior
      when 'Gotta Go Fast'            then v_speedrun
      when 'Tourist In Your Own Town' then v_sponsored >= 3
      when 'One Does Not Simply'      then v_streak7
      when 'Main Character'           then v_main_character
      when 'It''s Over 9000!'         then new.total_xp >= 9000
      when 'Top 10'                   then v_top10
      -- Season Veteran: requires seasons table; not yet implemented
      else false
    end;

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
