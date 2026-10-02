-- ── 007_same_level_matchmaking.sql ──
-- Ensures online players are matched ONLY if they are at the same level (same league tier).

-- 1. Helper function to determine a player's league ID (tier 1 to 5) from their rating
create or replace function get_player_league_id(p_rating int)
returns int
language sql
immutable
as $$
  select case
    when coalesce(p_rating, 800) >= 1900 then 5
    when coalesce(p_rating, 800) >= 1600 then 4
    when coalesce(p_rating, 800) >= 1300 then 3
    when coalesce(p_rating, 800) >= 1000 then 2
    else 1
  end;
$$;

-- 2. Upgrade find_match to strictly enforce same-level matchmaking
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
  v_player_league int;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  v_player_league := get_player_league_id(coalesce(p_rating, 800));

  -- Select best candidate strictly at the SAME LEVEL (same league tier):
  -- Closest rating first, then oldest queue time.
  -- SKIP LOCKED ensures concurrent pairs don't clash.
  select user_id into v_opponent
  from battle_queue
  where category = p_category
    and user_id <> auth.uid()
    and get_player_league_id(rating) = v_player_league
    and abs(rating - coalesce(p_rating, 800)) <= coalesce(p_window, 150)
  order by abs(rating - coalesce(p_rating, 800)) asc, joined_at asc
  limit 1
  for update skip locked;

  if v_opponent is null then
    -- No candidate yet at the same level in window: enter or update queue
    insert into battle_queue (user_id, category, rating, joined_at)
    values (auth.uid(), p_category, coalesce(p_rating, 800), now())
    on conflict (user_id) do update 
      set category = excluded.category, 
          rating = excluded.rating,
          joined_at = now();
    return null;
  end if;

  -- Opponent found at the same level: remove both from queue and create match
  delete from battle_queue where user_id in (auth.uid(), v_opponent);

  insert into battle_matches (player1_id, player2_id, category, status)
  values (v_opponent, auth.uid(), p_category, 'active')
  returning id into v_match_id;

  return v_match_id;
end;
$$;
