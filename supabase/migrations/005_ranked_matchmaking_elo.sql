-- ── 005_ranked_matchmaking_elo.sql ──
-- Adds rating-based matchmaking, ELO fields, and active presence stats.

-- 1. Add ELO rating fields to profiles if not present
alter table if exists profiles 
  add column if not exists elo_rating int not null default 800,
  add column if not exists peak_rating int not null default 800,
  add column if not exists win_streak int not null default 0,
  add column if not exists league_id int not null default 1;

-- 2. Add rating and joined_at to battle_queue
alter table if exists battle_queue 
  add column if not exists rating int not null default 800;

-- 3. Upgrade find_match to support rating windows and closest-rated matching
-- Practical for 10+ concurrent players:
-- - Matches within [rating - window, rating + window]
-- - Orders by abs(rating - p_rating) asc (closest rated first)
-- - Breaks ties with joined_at asc (waiting longest)
-- - Uses FOR UPDATE SKIP LOCKED to prevent race conditions
create or replace function find_match(
  p_category text,
  p_rating int default 800,
  p_window int default 100
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_opponent uuid;
  v_match_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- Select best candidate inside search window:
  -- Closest rating first, then oldest queue time.
  -- SKIP LOCKED ensures concurrent pairs don't clash.
  select user_id into v_opponent
  from battle_queue
  where category = p_category
    and user_id <> auth.uid()
    and abs(rating - coalesce(p_rating, 800)) <= coalesce(p_window, 100)
  order by abs(rating - coalesce(p_rating, 800)) asc, joined_at asc
  limit 1
  for update skip locked;

  if v_opponent is null then
    -- No candidate yet in window: enter or update queue with current rating & timestamp
    insert into battle_queue (user_id, category, rating, joined_at)
    values (auth.uid(), p_category, coalesce(p_rating, 800), now())
    on conflict (user_id) do update 
      set category = excluded.category, 
          rating = excluded.rating,
          joined_at = now();
    return null;
  end if;

  -- Opponent found: remove both from queue and create match
  delete from battle_queue where user_id in (auth.uid(), v_opponent);

  insert into battle_matches (player1_id, player2_id, category, status)
  values (v_opponent, auth.uid(), p_category, 'active')
  returning id into v_match_id;

  return v_match_id;
end;
$$;

-- 4. Get active queue count and players searching
create or replace function get_queue_stats(p_category text default null)
returns table(in_queue int, active_matches int)
language sql
security definer
set search_path = public
as $$
  select 
    (select count(*)::int from battle_queue where p_category is null or category = p_category),
    (select count(*)::int from battle_matches where status = 'active');
$$;
