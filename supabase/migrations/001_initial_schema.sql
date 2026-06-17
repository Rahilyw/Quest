-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── PROFILES ────────────────────────────────────────────────────────────────
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  city text not null default 'Victoria, BC',
  total_xp integer not null default 0,
  level integer not null default 1,
  avatar_url text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;
create policy "Users can read all profiles" on profiles for select using (true);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- ─── QUESTS ──────────────────────────────────────────────────────────────────
create type quest_category as enum ('fitness', 'social', 'food', 'community', 'nature');
create type quest_status as enum ('active', 'inactive');

create table quests (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text not null,
  category quest_category not null,
  lat double precision not null,
  lng double precision not null,
  radius_meters integer not null default 300,
  xp_reward integer not null default 100,
  is_sponsored boolean not null default false,
  sponsor_name text,
  sponsor_reward text,
  status quest_status not null default 'active',
  created_at timestamptz default now()
);

alter table quests enable row level security;
create policy "Anyone can read active quests" on quests for select using (status = 'active');

-- ─── COMPLETIONS ─────────────────────────────────────────────────────────────
create type completion_status as enum ('pending', 'approved', 'rejected');

create table completions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade not null,
  quest_id uuid references quests(id) on delete cascade not null,
  photo_url text not null,
  lat double precision not null,
  lng double precision not null,
  completed_at timestamptz not null,
  status completion_status not null default 'pending',
  redemption_code text,
  reviewed_at timestamptz,
  created_at timestamptz default now(),
  -- Prevent duplicate completions of the same quest
  unique(user_id, quest_id)
);

alter table completions enable row level security;
create policy "Users can read own completions" on completions for select using (auth.uid() = user_id);
create policy "Users can insert own completions" on completions for insert with check (auth.uid() = user_id);

-- ─── BADGES ──────────────────────────────────────────────────────────────────
create table badges (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text not null,
  icon text not null default '🏅',
  unlock_condition text not null
);

create table user_badges (
  user_id uuid references profiles(id) on delete cascade,
  badge_id uuid references badges(id) on delete cascade,
  earned_at timestamptz default now(),
  primary key (user_id, badge_id)
);

alter table badges enable row level security;
alter table user_badges enable row level security;
create policy "Anyone can read badges" on badges for select using (true);
create policy "Users can read own user_badges" on user_badges for select using (auth.uid() = user_id);

-- ─── LEADERBOARD VIEW ────────────────────────────────────────────────────────
-- Weekly XP: sum XP from completions approved this week (Mon–Sun)
create or replace view leaderboard as
select
  p.id as user_id,
  p.username,
  p.avatar_url,
  coalesce(sum(q.xp_reward), 0)::integer as weekly_xp
from profiles p
left join completions c on c.user_id = p.id
  and c.status = 'approved'
  and c.reviewed_at >= date_trunc('week', now())
left join quests q on q.id = c.quest_id
group by p.id, p.username, p.avatar_url
order by weekly_xp desc;

-- ─── AWARD XP TRIGGER ────────────────────────────────────────────────────────
create or replace function award_xp_on_approval()
returns trigger language plpgsql security definer as $$
declare
  quest_xp integer;
  new_xp integer;
  new_level integer;
begin
  -- Only run when status changes to 'approved'
  if new.status = 'approved' and old.status != 'approved' then
    select xp_reward into quest_xp from quests where id = new.quest_id;

    update profiles
    set total_xp = total_xp + quest_xp
    where id = new.user_id
    returning total_xp into new_xp;

    -- Recalculate level
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

    update profiles set level = new_level where id = new.user_id;
  end if;
  return new;
end;
$$;

create trigger on_completion_approved
  after update on completions
  for each row execute procedure award_xp_on_approval();

-- ─── STORAGE ─────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public) values ('proof-photos', 'proof-photos', true);

create policy "Authenticated users can upload proof photos"
  on storage.objects for insert
  with check (bucket_id = 'proof-photos' and auth.role() = 'authenticated');

create policy "Anyone can view proof photos"
  on storage.objects for select
  using (bucket_id = 'proof-photos');
