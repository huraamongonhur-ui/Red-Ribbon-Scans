-- Red Ribbon Scans — Admin Dashboard 2.0.
-- Run ONCE in the existing Supabase project's SQL Editor, before merging the PR.
-- Requires public.is_admin() and public.admins from admin.sql.
-- Existing manga.json and legacy pages remain untouched.

create table if not exists public.catalog_manga (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{1,79}$'),
  title text not null check (char_length(trim(title)) between 1 and 160),
  genres text[] not null default '{}',
  cover text not null default '',
  chapters jsonb not null default '[]'::jsonb
    check (jsonb_typeof(chapters) = 'array' and jsonb_array_length(chapters) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.catalog_manga enable row level security;

drop policy if exists "catalog manga: public read" on public.catalog_manga;
create policy "catalog manga: public read" on public.catalog_manga
  for select to anon, authenticated using (true);

drop policy if exists "catalog manga: admin insert" on public.catalog_manga;
create policy "catalog manga: admin insert" on public.catalog_manga
  for insert to authenticated with check ((select public.is_admin()));

drop policy if exists "catalog manga: admin update" on public.catalog_manga;
create policy "catalog manga: admin update" on public.catalog_manga
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "catalog manga: admin delete" on public.catalog_manga;
create policy "catalog manga: admin delete" on public.catalog_manga
  for delete to authenticated using ((select public.is_admin()));

create or replace function public.catalog_manga_set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists catalog_manga_updated_at on public.catalog_manga;
create trigger catalog_manga_updated_at
  before update on public.catalog_manga
  for each row execute function public.catalog_manga_set_updated_at();

-- Public-read manga art, writable only by admins; never expose service-role keys.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('manga-assets','manga-assets',true,10485760,
  array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "manga assets: admin insert" on storage.objects;
create policy "manga assets: admin insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'manga-assets' and (select public.is_admin()));

drop policy if exists "manga assets: admin list" on storage.objects;
create policy "manga assets: admin list" on storage.objects
  for select to authenticated
  using (bucket_id = 'manga-assets' and (select public.is_admin()));

drop policy if exists "manga assets: admin delete" on storage.objects;
create policy "manga assets: admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'manga-assets' and (select public.is_admin()));

-- No auth.users or service-role access is exposed to the dashboard.
-- Aggregate counts are derived from public.profiles, comments, reviews
-- and catalog_manga with their existing RLS policies.
