-- ── Battle matches: one row per 1v1 game, holds authoritative scores/round ──
create table if not exists battle_matches (
  id uuid primary key default gen_random_uuid(),
  player1_id uuid references auth.users(id) not null,
  player2_id uuid references auth.users(id) not null,
  player1_score int not null default 0,
  player2_score int not null default 0,
  player1_streak int not null default 0,
  player2_streak int not null default 0,
  current_round int not null default 1,
  total_rounds int not null default 5,
  category text not null default 'General',
  status text not null default 'active' check (status in ('active', 'finished')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Questions per round, pre-generated when the match starts ──
create table if not exists battle_match_questions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references battle_matches(id) on delete cascade not null,
  round int not null,
  question_tag text not null,
  instruction text not null,
  question_text text not null,
  answers jsonb not null, -- array of 4 strings
  correct_index int not null check (correct_index between 0 and 3),
  unique (match_id, round)
);

-- ── One row per player per round once they answer ──
create table if not exists battle_answers (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references battle_matches(id) on delete cascade not null,
  round int not null,
  player_id uuid references auth.users(id) not null,
  selected_index int not null check (selected_index between 0 and 3),
  is_correct boolean not null,
  answered_at timestamptz not null default now(),
  unique (match_id, round, player_id)
);

-- ── Trigger: whenever a player answers, update their score/streak on the match row.
--    Doing this server-side (not client-side) prevents a player from just writing
--    whatever score they want directly to battle_matches. ──
create or replace function handle_battle_answer()
returns trigger
language plpgsql
security definer
as $$
declare
  is_player1 boolean;
begin
  select (player1_id = new.player_id) into is_player1
  from battle_matches where id = new.match_id;

  if is_player1 then
    update battle_matches
    set
      player1_score = player1_score + case when new.is_correct then (100 + player1_streak * 10) else 0 end,
      player1_streak = case when new.is_correct then player1_streak + 1 else 0 end,
      updated_at = now()
    where id = new.match_id;
  else
    update battle_matches
    set
      player2_score = player2_score + case when new.is_correct then (100 + player2_streak * 10) else 0 end,
      player2_streak = case when new.is_correct then player2_streak + 1 else 0 end,
      updated_at = now()
    where id = new.match_id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_battle_answer_insert on battle_answers;
create trigger on_battle_answer_insert
  after insert on battle_answers
  for each row execute function handle_battle_answer();

-- ── Row Level Security ──
alter table battle_matches enable row level security;
alter table battle_match_questions enable row level security;
alter table battle_answers enable row level security;

-- Players can only see/act on matches they're part of.
create policy "Players can view their own matches"
  on battle_matches for select
  using (auth.uid() = player1_id or auth.uid() = player2_id);

create policy "Players can view questions for their matches"
  on battle_match_questions for select
  using (
    exists (
      select 1 from battle_matches m
      where m.id = match_id
      and (m.player1_id = auth.uid() or m.player2_id = auth.uid())
    )
  );

create policy "Players can view answers for their matches"
  on battle_answers for select
  using (
    exists (
      select 1 from battle_matches m
      where m.id = match_id
      and (m.player1_id = auth.uid() or m.player2_id = auth.uid())
    )
  );

-- A player can only ever insert THEIR OWN answer (not the opponent's).
create policy "Players can insert their own answer"
  on battle_answers for insert
  with check (
    auth.uid() = player_id
    and exists (
      select 1 from battle_matches m
      where m.id = match_id
      and (m.player1_id = auth.uid() or m.player2_id = auth.uid())
    )
  );

-- ── Enable Realtime on the tables the client subscribes to ──
alter publication supabase_realtime add table battle_matches;
alter publication supabase_realtime add table battle_answers;
