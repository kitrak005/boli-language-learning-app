-- Monthly badge progress tracking, stored directly on profiles.
alter table profiles
  add column if not exists monthly_quest_count int not null default 0,
  add column if not exists monthly_quest_period text not null default to_char(now(), 'YYYY-MM');

-- Catalog of 12 badge themes, one per calendar month (reused every year —
-- the actual unlocked instance in user_monthly_badges below is what's
-- tied to a specific year+month).
create table if not exists monthly_badge_themes (
  month_number int primary key check (month_number between 1 and 12),
  label text not null,
  icon text not null,
  accent_color text not null,
  threshold int not null default 20,
  xp_reward int not null default 100
);

alter table monthly_badge_themes enable row level security;
create policy "Badge themes are public"
  on monthly_badge_themes for select
  using (true);
grant select on public.monthly_badge_themes to authenticated, anon;

insert into monthly_badge_themes (month_number, label, icon, accent_color) values
  (1,  'Śiśira''s Winter Śloka',        '❄️', '#9FD8FF'),
  (2,  'Vasanta''s Blossom Verse',      '🌸', '#FFB3D1'),
  (3,  'Grīṣma''s Rising Scholar',      '☀️', '#FFD166'),
  (4,  'Varṣā''s First Rain Wisdom',    '🌧️', '#6FAFE0'),
  (5,  'Śarad''s Harvest Hymn',         '🌾', '#D9A441'),
  (6,  'Hemanta''s Steady Flame',       '🔥', '#E0703A'),
  (7,  'Guru Vidyadhar''s Midyear Māyā','📿', '#C5A059'),
  (8,  'Sabhā''s Summer Śāstrārtha',    '🏛️', '#C5A059'),
  (9,  'Ṛṣi''s Autumn Awakening',       '🍂', '#B5651D'),
  (10, 'Deepāvali''s Golden Diya',      '🪔', '#FFC14D'),
  (11, 'Sādhaka''s Late Bloom',         '🌙', '#9D8CFF'),
  (12, 'Varṣānta''s Year-End Vidyā',    '❄️', '#9FD8FF')
on conflict (month_number) do update set
  label = excluded.label, icon = excluded.icon, accent_color = excluded.accent_color;

-- Badges a user has actually earned, one row per (user, calendar month).
create table if not exists user_monthly_badges (
  user_id uuid references auth.users(id) on delete cascade not null,
  year_month text not null, -- e.g. '2026-10'
  month_number int references monthly_badge_themes(month_number) not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, year_month)
);

alter table user_monthly_badges enable row level security;
create policy "Earned badges are public"
  on user_monthly_badges for select
  using (true);
grant select on public.user_monthly_badges to authenticated, anon;

-- BEFORE UPDATE so we can modify NEW.* directly (no extra UPDATE
-- statement needed, so no recursion risk). Fires on every total_xp
-- increase from any source, counts it toward this month's quest count,
-- resets the counter when the calendar month rolls over, and unlocks the
-- badge (+ a flat XP reward, same trigger) once the threshold is hit.
create or replace function track_monthly_quest_progress()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_period text := to_char(now(), 'YYYY-MM');
  v_month_number int := extract(month from now())::int;
  v_threshold int;
  v_xp_reward int;
begin
  if new.total_xp > old.total_xp then
    if old.monthly_quest_period is distinct from v_current_period then
      new.monthly_quest_count := 1;
      new.monthly_quest_period := v_current_period;
    else
      new.monthly_quest_count := old.monthly_quest_count + 1;
    end if;

    select threshold, xp_reward into v_threshold, v_xp_reward
    from monthly_badge_themes where month_number = v_month_number;

    if new.monthly_quest_count >= v_threshold then
      insert into user_monthly_badges (user_id, year_month, month_number)
      values (new.id, v_current_period, v_month_number)
      on conflict (user_id, year_month) do nothing;

      -- Only award the bonus XP the first time this month's badge is hit,
      -- not on every subsequent XP-earning action this month.
      if not exists (
        select 1 from user_monthly_badges
        where user_id = new.id and year_month = v_current_period and earned_at < now() - interval '2 seconds'
      ) then
        new.total_xp := new.total_xp + v_xp_reward;
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists before_profile_xp_update on profiles;
create trigger before_profile_xp_update
  before update on profiles
  for each row execute function track_monthly_quest_progress();
