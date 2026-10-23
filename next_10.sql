-- Red Ribbon Scans 4.0 — run once in Supabase SQL Editor BEFORE merging the PR.
-- Requires supabase.sql, admin.sql, admin_2.sql, community_3.sql already installed.
-- Safe to re-run. No changes to or deletion of existing reading history.
create table if not exists public.user_chapter_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  manga_id text not null check (char_length(manga_id) between 1 and 120),
  chapter text not null check (char_length(chapter) between 1 and 32),
  page integer not null default 1 check (page between 1 and 10000),
  bookmarked boolean not null default false,
  read_at timestamptz not null default now(),
  primary key (user_id,manga_id,chapter)
);
create index if not exists user_chapter_progress_recent
  on public.user_chapter_progress(user_id,read_at desc);
alter table public.user_chapter_progress enable row level security;
grant select,insert,update,delete on public.user_chapter_progress to authenticated;
revoke all on public.user_chapter_progress from anon;
drop policy if exists "chapter progress owner select" on public.user_chapter_progress;
create policy "chapter progress owner select" on public.user_chapter_progress
 for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists "chapter progress owner insert" on public.user_chapter_progress;
create policy "chapter progress owner insert" on public.user_chapter_progress
 for insert to authenticated with check(user_id=(select auth.uid()));
drop policy if exists "chapter progress owner update" on public.user_chapter_progress;
create policy "chapter progress owner update" on public.user_chapter_progress
 for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
drop policy if exists "chapter progress owner delete" on public.user_chapter_progress;
create policy "chapter progress owner delete" on public.user_chapter_progress
 for delete to authenticated using(user_id=(select auth.uid()));

-- Manga publication status is distinct from editorial workflow stages.
alter table public.catalog_manga add column if not exists publication_status text not null default 'ongoing';
alter table public.catalog_manga drop constraint if exists catalog_manga_publication_status_check;
alter table public.catalog_manga add constraint catalog_manga_publication_status_check
 check(publication_status in ('ongoing','completed','hiatus'));

-- Comment System 3.0: owner can change own text, without changing ownership.
alter table public.comments add column if not exists edited_at timestamptz;
drop policy if exists "comments: edit own" on public.comments;
create policy "comments: edit own" on public.comments
 for update to authenticated using(user_id=(select auth.uid()))
 with check(user_id=(select auth.uid()));
create or replace function public.comments_preserve_owner()
returns trigger language plpgsql set search_path=public as $$
begin
  if new.user_id is distinct from old.user_id or new.manga_id is distinct from old.manga_id
     or new.chapter is distinct from old.chapter or new.created_at is distinct from old.created_at then
    raise exception 'Only comment body can be edited';
  end if;
  new.edited_at=now(); return new;
end $$;
drop trigger if exists comments_edit_timestamp on public.comments;
create trigger comments_edit_timestamp before update on public.comments
 for each row execute function public.comments_preserve_owner();

-- Permit comment reports through the existing, private reader_submissions moderation queue.
alter table public.reader_submissions drop constraint if exists reader_submissions_kind_check;
alter table public.reader_submissions add constraint reader_submissions_kind_check
 check(kind in ('manga_request','page_report','comment_report'));

-- Audit trail: database triggers record actual catalog changes and admin workflow changes.
create table if not exists public.admin_activity_log (
 id bigint generated always as identity primary key,
 actor uuid references auth.users(id) on delete set null,
 event text not null check(event in ('manga_insert','manga_update','manga_delete','workflow_insert','workflow_update','workflow_delete')),
 manga_id text not null default '',
 recorded_at timestamptz not null default now()
);
create index if not exists admin_activity_log_recent on public.admin_activity_log(recorded_at desc);
alter table public.admin_activity_log enable row level security;
revoke all on public.admin_activity_log from anon, authenticated;
grant select on public.admin_activity_log to authenticated;
drop policy if exists "admin log: read only admins" on public.admin_activity_log;
create policy "admin log: read only admins" on public.admin_activity_log
 for select to authenticated using ((select public.is_admin()));

create or replace function public.log_red_ribbon_changes()
returns trigger language plpgsql security definer set search_path=public as $$
declare changed_id text;
begin
 if tg_table_name='manga_workflow' then
   if tg_op='DELETE' then changed_id=old.manga_id; else changed_id=new.manga_id; end if;
 else
   if tg_op='DELETE' then changed_id=old.id; else changed_id=new.id; end if;
 end if;
 insert into public.admin_activity_log(actor,event,manga_id)
 values(auth.uid(),case when tg_table_name='catalog_manga' then 'manga_' else 'workflow_' end || lower(tg_op),changed_id);
 return coalesce(new,old);
end $$;
revoke all on function public.log_red_ribbon_changes() from public,anon,authenticated;
drop trigger if exists audit_catalog_manga on public.catalog_manga;
create trigger audit_catalog_manga after insert or update or delete on public.catalog_manga
 for each row execute function public.log_red_ribbon_changes();
drop trigger if exists audit_manga_workflow on public.manga_workflow;
create trigger audit_manga_workflow after insert or update or delete on public.manga_workflow
 for each row execute function public.log_red_ribbon_changes();

-- Ensures audit event enum and trigger prefixes match (e.g. manga_insert).
-- No direct client INSERT/UPDATE/DELETE on admin_activity_log is granted.
