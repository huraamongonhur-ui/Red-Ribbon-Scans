-- Red Ribbon Scans: User Profile 2.0 (run once in Supabase SQL Editor).
-- Preserves existing auth users, profiles, reviews and comments.

alter table public.profiles
  add column if not exists bio text not null default '',
  add column if not exists avatar_emoji text not null default '📚',
  add column if not exists avatar_path text,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conname='profiles_bio_length_v2') then
    alter table public.profiles add constraint profiles_bio_length_v2 check (char_length(bio)<=280);
  end if;
  if not exists (select 1 from pg_constraint where conname='profiles_avatar_emoji_v2') then
    alter table public.profiles add constraint profiles_avatar_emoji_v2
      check (avatar_emoji in ('📚','🌸','🦊','🐱','🐼','🐉','⭐','🎮'));
  end if;
  if not exists (select 1 from pg_constraint where conname='profiles_avatar_path_v2') then
    alter table public.profiles add constraint profiles_avatar_path_v2
      check (avatar_path is null or left(avatar_path, length(id::text)+1) = id::text || '/');
  end if;
end $$;

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Separate cloud reading history, scoped to the authenticated owner.
create table if not exists public.reading_history (
  user_id uuid not null references auth.users(id) on delete cascade,
  manga_id text not null,
  chapter text not null,
  read_at timestamptz not null default now(),
  primary key (user_id, manga_id, chapter)
);
alter table public.reading_history enable row level security;

drop policy if exists "reading_history: select own" on public.reading_history;
create policy "reading_history: select own" on public.reading_history
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "reading_history: insert own" on public.reading_history;
create policy "reading_history: insert own" on public.reading_history
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "reading_history: update own" on public.reading_history;
create policy "reading_history: update own" on public.reading_history
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Public avatar images, but only a signed-in user may write inside their own folder.
-- No service_role key or admin key is needed in the browser.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('profile-avatars','profile-avatars',true,2097152,array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists "profile avatars: owner upload" on storage.objects;
create policy "profile avatars: owner upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'profile-avatars' and
    (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "profile avatars: owner delete" on storage.objects;
create policy "profile avatars: owner delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'profile-avatars' and
    (storage.foldername(name))[1] = (select auth.uid())::text
  );
