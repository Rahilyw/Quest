-- Seed 20 Victoria, BC quests for Season 1 pilot
-- Run this after 001_initial_schema.sql

insert into quests (title, description, category, lat, lng, xp_reward) values
('Run Dallas Road', 'Log a run along the Dallas Road oceanfront path — one of Victoria''s most iconic routes. Go from Clover Point to Beacon Hill Park and back.', 'fitness', 48.4097, -123.3686, 150),
('Beacon Hill Park Loop', 'Complete a loop through Beacon Hill Park, Canada''s most beloved urban park. Find the totem poles and the petting zoo while you''re at it.', 'nature', 48.4143, -123.3611, 100),
('Sunrise at Clover Point', 'Catch the sunrise at Clover Point before 7am. Take a photo with the ocean in the background. Worth getting out of bed for.', 'nature', 48.4063, -123.3582, 200),
('Fisherman''s Wharf Wander', 'Walk the floating homes at Fisherman''s Wharf. Say hi to the harbour seals if they''re around. Get a snack from one of the floating restaurants.', 'food', 48.4209, -123.3854, 100),
('Inner Harbour Loop', 'Walk the full Inner Harbour waterfront from the Empress to the Convention Centre and back. Classic Victoria.', 'community', 48.4230, -123.3699, 100),
('Saturday Market at Bastion Square', 'Visit the Saturday Market at Bastion Square. Buy something from a local vendor — anything counts.', 'food', 48.4265, -123.3694, 150),
('Chinatown Gate Photo', 'Find the Gate of Harmonious Interest on Fisgard Street — the oldest Chinatown in Canada. Get a photo in front of it.', 'community', 48.4283, -123.3690, 80),
('Coffee Crawl: 3 Local Cafes', 'Visit 3 independent coffee shops in a single day. Chains don''t count — find the local ones.', 'food', 48.4265, -123.3600, 250),
('Breakwater Lighthouse Walk', 'Walk out to the Ogden Point breakwater lighthouse. It''s windier than you think. Take a photo from the end.', 'fitness', 48.4107, -123.3929, 120),
('Fernwood Village Explore', 'Wander the Fernwood neighbourhood. Find a piece of street art, grab a snack from a local spot, and report back.', 'community', 48.4355, -123.3530, 150),
('Fort Street Antiques Hunt', 'Browse Antique Row on Fort Street. You don''t have to buy anything — just find the most interesting object in a shop.', 'social', 48.4254, -123.3566, 100),
('Gorge Waterway Kayak', 'Rent a kayak or paddleboard on the Gorge Waterway and spend at least 45 minutes on the water.', 'fitness', 48.4438, -123.3693, 300),
('Parliament Buildings at Night', 'Get a photo of the BC Legislature at night when it''s lit up. Best view from the Inner Harbour.', 'community', 48.4208, -123.3704, 80),
('Help at a Community Cleanup', 'Join a community cleanup event in Victoria. Check with the city events calendar or local Nextdoor.', 'community', 48.4284, -123.3656, 300),
('Royal BC Museum Visit', 'Visit the Royal BC Museum. Spend at least an hour inside. Tell us one thing you learned.', 'community', 48.4218, -123.3686, 200),
('Cook Street Village Brunch', 'Have brunch at a Cook Street Village restaurant — one of Victoria''s best neighbourhood strips.', 'food', 48.4170, -123.3570, 100),
('Chat with a Stranger', 'Strike up a real conversation with someone you don''t know in a public place — a park bench, a coffee shop, a bookstore. Make it more than just small talk.', 'social', 48.4284, -123.3656, 250),
('Attend a Live Music Show', 'Go to a live music show at a local venue. Any genre, any size. Just show up and stay for at least one set.', 'social', 48.4270, -123.3660, 200),
('Hatley Castle Grounds Walk', 'Walk the grounds at Royal Roads University (Hatley Castle). The gardens are free and worth it.', 'nature', 48.4296, -123.4900, 150),
('Find a Hidden Mural', 'Victoria has incredible street murals scattered across the city. Find one you''ve never seen before and document it.', 'community', 48.4284, -123.3656, 120);

-- Starter badges
insert into badges (name, description, icon, unlock_condition) values
('First Quest', 'Completed your first Quest!', '🌟', 'complete 1 quest'),
('Getting Warmed Up', 'Completed 5 quests', '🔥', 'complete 5 quests'),
('Local Hero', 'Completed 10 quests', '🏆', 'complete 10 quests'),
('Explorer', 'Completed a quest in every category', '🧭', 'complete 1 quest in each category'),
('Fitness Fanatic', 'Completed 3 fitness quests', '🏃', 'complete 3 fitness quests'),
('Social Butterfly', 'Completed 3 social quests', '🦋', 'complete 3 social quests'),
('Foodie', 'Completed 3 food quests', '🍴', 'complete 3 food quests'),
('Community Champion', 'Completed 3 community quests', '🏘️', 'complete 3 community quests'),
('Nature Lover', 'Completed 3 nature quests', '🌿', 'complete 3 nature quests'),
('Early Bird', 'Completed a quest before 8am', '🌅', 'complete a quest before 8am'),
('Weekend Warrior', 'Completed 3 quests in a single weekend', '⚡', 'complete 3 quests in 1 weekend'),
('Top 10', 'Reached top 10 on the weekly leaderboard', '🎯', 'reach top 10 on weekly leaderboard'),
('Season Veteran', 'Participated in 2 full seasons', '🎖️', 'participate in 2 seasons');

-- Sponsored Victoria, BC quests
insert into quests (title, description, category, lat, lng, xp_reward, is_sponsored, sponsor_name, sponsor_reward, status, radius_meters) values
('Habit Coffee Pitstop', 'Grab a premium beverage from Habit Coffee on Yates Street. Take a photo of your drink inside or outside the cafe.', 'food', 48.4262, -123.3615, 120, true, 'Habit Coffee', 'Free double shot upgrade', 'active', 300),
('Mile 0 Run with Frontrunners', 'Run to the Mile 0 monument of the Trans-Canada Highway. Take a photo at the monument. Sponsored by Frontrunners Victoria.', 'fitness', 48.4107, -123.3678, 150, true, 'Frontrunners Victoria', 'Free pair of athletic socks', 'active', 300),
('Board Games at Interactivity', 'Play a game at Interactivity Board Game Cafe on Yates Street. Take a photo of your game board.', 'community', 48.4246, -123.3618, 100, true, 'Interactivity Board Game Cafe', 'Waived cover fee', 'active', 300),
('Try the Harbour Espresso Flight', 'Order the espresso flight at Blue Fox Cafe and try all three single-origin shots. A serious coffee experience steps from the Inner Harbour.', 'food', 48.4236, -123.3656, 120, true, 'Blue Fox Cafe', 'Free pastry with any coffee purchase', 'active', 200),
('Visit the Inner Harbour at Sunset', 'Head to the Inner Harbour between 7:30 and 9pm on any evening and take a photo of the sunset over the water. Victoria at its most iconic.', 'nature', 48.4230, -123.3699, 100, true, 'Tourism Victoria', 'Enter prize draw for hotel stay', 'active', 400);
