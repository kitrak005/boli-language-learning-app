-- ============================================================
-- Profiles matching your real UserProfile shape (see
-- ProfileView.tsx: totalXp, streakDays, scholarLevel, roleTitle,
-- languageMastery, weeklyXpHistory, dailyXp, maxDailyXp), plus
-- a real achievements catalog with auto-unlock — replacing the
-- earlier version of this file, which guessed a different shape
-- (level/title/wins-losses only) before you shared the real code.
-- ============================================================

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'Sādhaka',
  avatar_url text,
  scholar_level text not null default 'Navāgata', -- e.g. "Arya Sādhaka" — a text tier label, not a number
  role_title text not null default 'Beginner',     -- e.g. "Senior Grammarian", "Vedic Scholar"
  total_xp int not null default 0,
  streak_days int not null default 0,
  daily_xp int not null default 0,
  max_daily_xp int not null default 80,
  language_mastery jsonb not null default '{"sanskrit": 0, "pali": 0, "tamil": 0}'::jsonb,
  weekly_xp_history jsonb not null default '[]'::jsonb,
  location text, -- optional, used for opponent display on the battle face-off screen
  -- Internal battle stats — not shown in ProfileView, but needed for
  -- XP-reward math and the "Champion" (win-count) achievement.
  wins int not null default 0,
  losses int not null default 0,
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on profiles for select
  using (true);

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- Achievements catalog + auto-unlock.
--
-- Scoped for now to what the battle feature actually drives:
-- streak, XP, and win count (the three from the Wildfire/Sage/
-- Champion screenshot). Your existing lesson-based achievements
-- ("First Steps", "50 Words") aren't in here yet since they'd
-- need lesson-completion tracking this migration doesn't touch —
-- add rows for those once that data exists, same shape.
-- ============================================================

create table if not exists achievements (
  id text primary key,
  title text not null,
  level_label text not null,       -- e.g. "LEVEL 5" — shown on the badge
  icon text not null,               -- emoji, used by AchievementsPanel
  icon_bg text not null,            -- tailwind bg classes, used by AchievementsPanel
  target int not null,
  description text not null,
  metric text not null check (metric in ('streak_days', 'total_xp', 'wins'))
);

alter table achievements enable row level security;
create policy "Achievements catalog is public"
  on achievements for select
  using (true);

insert into achievements (id, title, level_label, icon, icon_bg, target, description, metric)
values
  ('wildfire', 'Wildfire', 'LEVEL 5', '🔥', 'bg-gradient-to-br from-red-500 to-orange-500', 50, 'Reach a 50 day streak', 'streak_days'),
  ('sage', 'Sage', 'LEVEL 7', '🧙', 'bg-gradient-to-br from-emerald-500 to-green-600', 7500, 'Earn 7500 XP', 'total_xp'),
  ('champion', 'Champion', 'LEVEL 6', '🛡️', 'bg-gradient-to-br from-purple-500 to-fuchsia-600', 6, 'Advance to the Emerald League', 'wins')
on conflict (id) do update set
  title = excluded.title,
  level_label = excluded.level_label,
  icon = excluded.icon,
  icon_bg = excluded.icon_bg,
  target = excluded.target,
  description = excluded.description,
  metric = excluded.metric;

create table if not exists user_achievements (
  user_id uuid references auth.users(id) on delete cascade not null,
  achievement_id text references achievements(id) on delete cascade not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

alter table user_achievements enable row level security;
create policy "Unlocked achievements are viewable by everyone"
  on user_achievements for select
  using (true);

-- Checks every achievement against the row's new stats and unlocks any
-- that are now met. to_jsonb(new) ->> a.metric dynamically reads
-- whichever profiles column that achievement's metric names.
create or replace function check_achievement_unlocks()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  a record;
begin
  for a in select * from achievements loop
    if (to_jsonb(new) ->> a.metric)::numeric >= a.target then
      insert into user_achievements (user_id, achievement_id)
      values (new.id, a.id)
      on conflict (user_id, achievement_id) do nothing;
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists on_profile_stats_updated on profiles;
create trigger on_profile_stats_updated
  after update on profiles
  for each row execute function check_achievement_unlocks();

-- Win/loss + XP awarding on match finish (same trigger 004 will replace
-- with the XP-computing version — this one just keeps wins/losses in
-- sync if you run 003 without 004 for any reason).
create or replace function record_match_result()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'finished' and old.status <> 'finished' then
    if new.player1_score > new.player2_score then
      update profiles set wins = wins + 1 where id = new.player1_id;
      update profiles set losses = losses + 1 where id = new.player2_id;
    elsif new.player2_score > new.player1_score then
      update profiles set wins = wins + 1 where id = new.player2_id;
      update profiles set losses = losses + 1 where id = new.player1_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_battle_match_finished on battle_matches;
create trigger on_battle_match_finished
  after update on battle_matches
  for each row execute function record_match_result();
