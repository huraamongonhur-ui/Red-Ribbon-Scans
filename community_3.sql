-- Red Ribbon Scans — Community requests, reader reports and admin planning.
-- Run once in Supabase SQL Editor BEFORE merging PR #15.
-- Requires existing public.is_admin() function (from admin.sql).
create table if not exists public.reader_submissions (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('manga_request','page_report')),
  manga_title text not null default '' check (char_length(manga_title) <= 160),
  manga_id text not null default '' check (char_length(manga_id) <= 120),
  chapter text not null default '' check (char_length(chapter) <= 32),
  page_number integer check (page_number is null or page_number between 1 and 10000),
  message text not null check (char_length(trim(message)) between 10 and 1000),
  status text not null default 'new' check (status in ('new','reviewing','approved','resolved','rejected')),
  admin_note text not null default '' check (char_length(admin_note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists reader_submissions_queue on public.reader_submissions(status,created_at desc);
create index if not exists reader_submissions_user on public.reader_submissions(user_id,created_at desc);
alter table public.reader_submissions enable row level security;
grant select,insert,update,delete on public.reader_submissions to authenticated;
revoke all on public.reader_submissions from anon;
drop policy if exists "submissions read owner or admin" on public.reader_submissions;
create policy "submissions read owner or admin" on public.reader_submissions
  for select to authenticated using (user_id=(select auth.uid()) or (select public.is_admin()));
drop policy if exists "submissions create own new" on public.reader_submissions;
create policy "submissions create own new" on public.reader_submissions
  for insert to authenticated with check (
    user_id=(select auth.uid()) and status='new' and admin_note=''
  );
drop policy if exists "submissions admin updates" on public.reader_submissions;
create policy "submissions admin updates" on public.reader_submissions
  for update to authenticated using ((select public.is_admin()))
  with check ((select public.is_admin()));
drop policy if exists "submissions admin delete" on public.reader_submissions;
create policy "submissions admin delete" on public.reader_submissions
  for delete to authenticated using ((select public.is_admin()));

create table if not exists public.manga_workflow (
  manga_id text primary key references public.catalog_manga(id) on delete cascade,
  stage text not null default 'planned'
    check (stage in ('planned','translating','editing','ready','published','paused')),
  target_date date,
  notes text not null default '' check (char_length(notes) <= 1000),
  updated_at timestamptz not null default now()
);
alter table public.manga_workflow enable row level security;
grant select,insert,update,delete on public.manga_workflow to authenticated;
revoke all on public.manga_workflow from anon;
drop policy if exists "workflow admin read" on public.manga_workflow;
create policy "workflow admin read" on public.manga_workflow
  for select to authenticated using ((select public.is_admin()));
drop policy if exists "workflow admin insert" on public.manga_workflow;
create policy "workflow admin insert" on public.manga_workflow
  for insert to authenticated with check ((select public.is_admin()));
drop policy if exists "workflow admin update" on public.manga_workflow;
create policy "workflow admin update" on public.manga_workflow
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "workflow admin delete" on public.manga_workflow;
create policy "workflow admin delete" on public.manga_workflow
  for delete to authenticated using ((select public.is_admin()));
-- Safe to re-run; do not expose reader email or workflow notes to the public.


-- Optional manga synopsis shown on Manga Details 2.0.
alter table public.catalog_manga add column if not exists description text not null default '';
alter table public.catalog_manga drop constraint if exists catalog_manga_description_length;
alter table public.catalog_manga add constraint catalog_manga_description_length
  check (char_length(description) <= 4000);
