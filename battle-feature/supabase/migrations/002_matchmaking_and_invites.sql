-- ============================================================
-- Matchmaking (online queue) + invite-by-link, on top of the
-- battle_matches / battle_match_questions / battle_answers
-- schema from migration 001.
-- ============================================================

-- A match can now start life "waiting" (invite created, no opponent yet)
-- before becoming "active". player2_id is therefore nullable until
-- someone joins.
alter table battle_matches
  alter column player2_id drop not null;

alter table battle_matches
  add column if not exists invite_code text unique;

alter table battle_matches
  drop constraint if exists battle_matches_status_check;
alter table battle_matches
  add constraint battle_matches_status_check
  check (status in ('waiting', 'active', 'finished'));

-- ── Online matchmaking queue ──
-- One row per user currently searching for an opponent.
create table if not exists battle_queue (
  user_id uuid primary key references auth.users(id) on delete cascade,
  category text not null default 'General',
  joined_at timestamptz not null default now()
);

alter table battle_queue enable row level security;

create policy "Users manage their own queue entry"
  on battle_queue for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Existing RLS policy on battle_matches only lets a participant SELECT
-- rows they're already in, which is fine for active/finished matches.
-- For a 'waiting' invite match, the joiner isn't a participant yet, so
-- they can't look it up directly — that's handled by the SECURITY
-- DEFINER functions below instead, which run with elevated rights and
-- do their own authorization checks (not RLS).

-- ── Random matchmaking: call this from the client with the desired
-- category. If someone else is already waiting in that category, this
-- pairs with them immediately and returns the new match id. Otherwise
-- it queues the caller and returns null; the caller should then listen
-- on realtime for a battle_matches row naming them as a participant. ──
create or replace function find_match(p_category text)
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

  -- Lock one other waiting player in the same category. SKIP LOCKED
  -- means two simultaneous callers can't both grab the same opponent.
  select user_id into v_opponent
  from battle_queue
  where category = p_category
    and user_id <> auth.uid()
  order by joined_at
  limit 1
  for update skip locked;

  if v_opponent is null then
    insert into battle_queue (user_id, category)
    values (auth.uid(), p_category)
    on conflict (user_id) do update set category = excluded.category, joined_at = now();
    return null;
  end if;

  delete from battle_queue where user_id in (auth.uid(), v_opponent);

  insert into battle_matches (player1_id, player2_id, category, status)
  values (v_opponent, auth.uid(), p_category, 'active')
  returning id into v_match_id;

  return v_match_id;
end;
$$;

-- Call when the player gives up searching / navigates away.
create or replace function leave_queue()
returns void
language sql
security definer
set search_path = public
as $$
  delete from battle_queue where user_id = auth.uid();
$$;

-- ── Invite by link ──
-- Creates a 'waiting' match owned by the caller and returns a short
-- shareable code. player2_id stays null until someone joins.
create or replace function create_invite_match(p_category text)
returns table(match_id uuid, invite_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  v_code := substr(md5(random()::text || clock_timestamp()::text), 1, 8);

  insert into battle_matches (player1_id, player2_id, category, status, invite_code)
  values (auth.uid(), null, p_category, 'waiting', v_code)
  returning id into v_id;

  return query select v_id, v_code;
end;
$$;

-- Lets the (not-yet-a-participant) joiner see just enough about an
-- invite to render a "join match?" screen, without exposing it to RLS.
create or replace function get_invite_preview(p_code text)
returns table(match_id uuid, category text, status text)
language sql
security definer
set search_path = public
as $$
  select id, category, status from battle_matches where invite_code = p_code;
$$;

-- Joins an existing 'waiting' invite match as player2 and activates it.
create or replace function join_match_by_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match battle_matches%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_match from battle_matches where invite_code = p_code for update;

  if not found then
    raise exception 'Invite not found';
  end if;
  if v_match.status <> 'waiting' then
    raise exception 'This invite has already been used';
  end if;
  if v_match.player1_id = auth.uid() then
    raise exception 'You cannot join your own invite';
  end if;

  update battle_matches
  set player2_id = auth.uid(), status = 'active', updated_at = now()
  where id = v_match.id;

  return v_match.id;
end;
$$;
