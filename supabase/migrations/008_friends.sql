-- Friendships: a simple directed follow graph (follower_id follows followed_id).
create table if not exists friendships (
  follower_id uuid references auth.users(id) on delete cascade not null,
  followed_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  check (follower_id <> followed_id)
);

alter table friendships enable row level security;

-- Public read, same reasoning as profiles: two users need to see each
-- other's follow relationships (follower/following counts, lists).
create policy "Friendships are viewable by everyone"
  on friendships for select
  using (true);

create policy "Users can follow others as themselves"
  on friendships for insert
  with check (auth.uid() = follower_id);

create policy "Users can unfollow as themselves"
  on friendships for delete
  using (auth.uid() = follower_id);

grant select, insert, delete on public.friendships to authenticated;

-- Simple name search for "Find Friends". Public profiles only (name,
-- avatar_url, total_xp are already non-sensitive per the existing
-- profiles RLS policy).
create or replace function search_profiles(p_query text)
returns setof profiles
language sql
security definer
set search_path = public
as $$
  select * from profiles
  where name ilike '%' || p_query || '%'
  limit 20;
$$;

grant execute on function search_profiles(text) to authenticated;
