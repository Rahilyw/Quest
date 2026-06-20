alter table profiles add column if not exists current_streak integer not null default 0;
alter table profiles add column if not exists longest_streak integer not null default 0;
alter table profiles add column if not exists last_completion_week text;

create or replace function award_xp_on_approval()
returns trigger language plpgsql security definer as $$
declare
  quest_xp integer;
  new_xp integer;
  new_level integer;
  current_week text;
  previous_week text;
  last_week text;
  new_streak integer;
  new_longest integer;
begin
  if new.status = 'approved' and old.status != 'approved' then
    select xp_reward into quest_xp from quests where id = new.quest_id;

    update profiles
    set total_xp = total_xp + quest_xp
    where id = new.user_id
    returning total_xp into new_xp;

    new_level := case
      when new_xp >= 15000 then 10
      when new_xp >= 11000 then 9
      when new_xp >= 8000  then 8
      when new_xp >= 5500  then 7
      when new_xp >= 3500  then 6
      when new_xp >= 2000  then 5
      when new_xp >= 1000  then 4
      when new_xp >= 500   then 3
      when new_xp >= 200   then 2
      else 1
    end;

    current_week := to_char(now(), 'IYYY-"W"IW');
    previous_week := to_char(date_trunc('week', now())::date - interval '7 days', 'IYYY-"W"IW');

    select last_completion_week, current_streak, longest_streak
    into last_week, new_streak, new_longest
    from profiles
    where id = new.user_id;

    if last_week is distinct from current_week then
      if last_week = previous_week then
        new_streak := new_streak + 1;
      else
        new_streak := 1;
      end if;

      if new_streak > new_longest then
        new_longest := new_streak;
      end if;
    end if;

    update profiles
    set
      level = new_level,
      current_streak = new_streak,
      longest_streak = new_longest,
      last_completion_week = current_week
    where id = new.user_id;
  end if;
  return new;
end;
$$;
