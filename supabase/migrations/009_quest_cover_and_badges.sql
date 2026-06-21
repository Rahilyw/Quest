-- Quest cover image + badge associations for admin-created quests

alter table quests add column if not exists cover_image_url text;

comment on column quests.cover_image_url is 'Public URL for hero card / quest detail cover image';

create table if not exists quest_badges (
  quest_id uuid references quests(id) on delete cascade not null,
  badge_id uuid references badges(id) on delete cascade not null,
  created_at timestamptz default now(),
  primary key (quest_id, badge_id)
);

alter table quest_badges enable row level security;

create policy "Anyone can read quest_badges"
  on quest_badges for select using (true);
