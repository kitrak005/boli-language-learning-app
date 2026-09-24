-- ============================================================
-- Server-authoritative XP awards, computed the moment a match
-- finishes. Replaces the win/loss-only trigger from 003.
-- ============================================================

alter table battle_matches
  add column if not exists player1_xp_awarded int,
  add column if not exists player2_xp_awarded int;

create or replace function record_match_result()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_p1_xp int;
  v_p2_xp int;
begin
  if new.status = 'finished' and old.status <> 'finished' then

    -- Base XP from performance, plus a flat bonus depending on outcome.
    -- Both players always get *something* for playing.
    v_p1_xp := floor(new.player1_score / 10.0)
      + case
          when new.player1_score > new.player2_score then 50  -- win
          when new.player1_score = new.player2_score then 30  -- tie
          else 20                                              -- loss (participation)
        end;

    v_p2_xp := floor(new.player2_score / 10.0)
      + case
          when new.player2_score > new.player1_score then 50
          when new.player2_score = new.player1_score then 30
          else 20
        end;

    update battle_matches
    set player1_xp_awarded = v_p1_xp, player2_xp_awarded = v_p2_xp
    where id = new.id;

    update profiles set total_xp = total_xp + v_p1_xp where id = new.player1_id;
    update profiles set total_xp = total_xp + v_p2_xp where id = new.player2_id;

    if new.player1_score > new.player2_score then
      update profiles set wins = wins + 1 where id = new.player1_id;
      update profiles set losses = losses + 1 where id = new.player2_id;
    elsif new.player2_score > new.player1_score then
      update profiles set wins = wins + 1 where id = new.player2_id;
      update profiles set losses = losses + 1 where id = new.player1_id;
    end if;
    -- ties: no wins/losses change, XP above still applies

  end if;
  return new;
end;
$$;

-- Trigger already exists from 003_profiles.sql (on_battle_match_finished)
-- and points at this same function name, so no need to recreate it —
-- CREATE OR REPLACE FUNCTION above is enough. Included here for safety
-- in case you're running this on a fresh DB without 003 first:
drop trigger if exists on_battle_match_finished on battle_matches;
create trigger on_battle_match_finished
  after update on battle_matches
  for each row execute function record_match_result();
