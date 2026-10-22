-- Red Ribbon Scans — My Library 2.0
-- Run once in the existing Supabase SQL Editor BEFORE merging the PR.
-- Each user can only read/write their own manga statuses.

create table if not exists public.user_manga_library (
  user_id uuid not null references auth.users(id) on delete cascade,
  manga_id text not null check (char_length(manga_id) between 1 and 120),
  status text not null check (status in ('reading', 'completed', 'planned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, manga_id)
);

create index if not exists user_manga_library_by_status
  on public.user_manga_library (user_id, status, updated_at desc);

alter table public.user_manga_library enable row level security;

drop policy if exists "my library: read own" on public.user_manga_library;
create policy "my library: read own" on public.user_manga_library
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "my library: add own" on public.user_manga_library;
create policy "my library: add own" on public.user_manga_library
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "my library: edit own" on public.user_manga_library;
create policy "my library: edit own" on public.user_manga_library
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "my library: remove own" on public.user_manga_library;
create policy "my library: remove own" on public.user_manga_library
  for delete to authenticated using (user_id = (select auth.uid()));

create or replace function public.user_manga_library_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists user_manga_library_touch on public.user_manga_library;
create trigger user_manga_library_touch
  before update on public.user_manga_library
  for each row execute function public.user_manga_library_updated_at();

-- No public/anon read policy: lists remain private.
-- No changes to profiles, comments, reviews, manga catalogs, or admin rights.
