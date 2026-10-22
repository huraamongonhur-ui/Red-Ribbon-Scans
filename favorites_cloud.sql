-- Red Ribbon Scans: Fix Favorites / My Library 2.0.
-- Run once in the Supabase SQL Editor BEFORE merging the pull request.
-- Does NOT alter or delete existing manga lists or local favorites.

create table if not exists public.user_manga_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  manga_id text not null check (char_length(manga_id) between 1 and 120),
  created_at timestamptz not null default now(),
  primary key (user_id,manga_id)
);
create index if not exists user_manga_favorites_recent on public.user_manga_favorites(user_id,created_at desc);
alter table public.user_manga_favorites enable row level security;

grant select,insert,delete on public.user_manga_favorites to authenticated;
revoke all on public.user_manga_favorites from anon;

drop policy if exists "favorites: read own" on public.user_manga_favorites;
create policy "favorites: read own" on public.user_manga_favorites
 for select to authenticated using (user_id=(select auth.uid()));

drop policy if exists "favorites: add own" on public.user_manga_favorites;
create policy "favorites: add own" on public.user_manga_favorites
 for insert to authenticated with check (user_id=(select auth.uid()));

drop policy if exists "favorites: delete own" on public.user_manga_favorites;
create policy "favorites: delete own" on public.user_manga_favorites
 for delete to authenticated using (user_id=(select auth.uid()));

-- No anonymous read/write, no changes to user_manga_library status values.
