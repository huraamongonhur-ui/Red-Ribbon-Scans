-- Light Novel Admin 4.0 · Phase 1. Run manually after admin.sql.
-- Supabase client never uses a service-role key. Drafts are hidden by RLS.
create extension if not exists pgcrypto;
create table if not exists public.ln_novels(
 id uuid primary key default gen_random_uuid(),slug text unique not null check(slug ~ '^[a-z0-9-]{2,80}$'),
 title text not null,subtitle text not null default '',author text not null default '',
 illustrator text not null default '',synopsis text not null default '',
 genres text[] not null default '{}',cover_url text not null default '',
 original_volumes int not null default 0,publication_status text not null default 'draft'
 check(publication_status in('draft','published')),created_at timestamptz default now());
create table if not exists public.ln_reviewers(
 novel_id uuid references public.ln_novels on delete cascade,
 user_id uuid references auth.users on delete cascade,
 primary key(novel_id,user_id));
create or replace function public.is_ln_reviewer(p_novel uuid)
returns boolean language sql stable security definer set search_path=''
as $$select auth.uid() is not null and exists(
 select 1 from public.ln_reviewers where novel_id=p_novel and user_id=auth.uid())$$;
revoke all on function public.is_ln_reviewer(uuid) from public,anon;
grant execute on function public.is_ln_reviewer(uuid) to authenticated;
create table if not exists public.ln_chapters(
 id uuid primary key default gen_random_uuid(),
 novel_id uuid not null references public.ln_novels on delete cascade,
 volume_number int not null default 1 check(volume_number>0),
 sort_order int not null default 0,slug text not null,
 title text not null,blocks jsonb not null default '[]'
 check(jsonb_typeof(blocks)='array' and jsonb_array_length(blocks)<=2000),
 status text not null default 'draft' check(status in('draft','review','approved','scheduled','published')),
 release_at timestamptz,created_at timestamptz default now(),
 unique(novel_id,slug),check(status<>'scheduled' or release_at is not null));
create index if not exists ln_chapters_order on public.ln_chapters(novel_id,volume_number,sort_order);
create table if not exists public.ln_glossary(
 id uuid primary key default gen_random_uuid(),
 novel_id uuid not null references public.ln_novels on delete cascade,
 source_term text not null,translated_term text not null,note text not null default '',
 unique(novel_id,source_term));
create table if not exists public.ln_review_notes(
 id uuid primary key default gen_random_uuid(),
 chapter_id uuid not null references public.ln_chapters on delete cascade,
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 note text not null check(length(trim(note)) between 1 and 5000),
 created_at timestamptz default now());
create table if not exists public.ln_chapter_versions(
 id bigint generated always as identity primary key,
 chapter_id uuid not null references public.ln_chapters on delete cascade,
 editor_id uuid, title text not null,blocks jsonb not null,status text not null,
 release_at timestamptz,saved_at timestamptz default now());
create table if not exists public.ln_subscriptions(
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 novel_id uuid not null references public.ln_novels on delete cascade,
 primary key(user_id,novel_id));
create table if not exists public.ln_read_events(
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 novel_id uuid not null references public.ln_novels on delete cascade,
 chapter_id uuid not null references public.ln_chapters on delete cascade,
 event_type text not null check(event_type in('opened','completed')),
 reading_day date not null default (now() at time zone 'UTC')::date,
 primary key(user_id,chapter_id,event_type,reading_day));
create or replace function public.ln_prior_version() returns trigger language plpgsql
security definer set search_path='' as $$
begin
 if row(old.title,old.blocks,old.status,old.release_at) is distinct from
 row(new.title,new.blocks,new.status,new.release_at) then
 insert into public.ln_chapter_versions(chapter_id,editor_id,title,blocks,status,release_at)
 values(old.id,auth.uid(),old.title,old.blocks,old.status,old.release_at);
 end if;
 return new;
end$$;
drop trigger if exists ln_revision on public.ln_chapters;
create trigger ln_revision before update on public.ln_chapters
for each row execute function public.ln_prior_version();
alter table public.ln_novels enable row level security;
alter table public.ln_reviewers enable row level security;
alter table public.ln_chapters enable row level security;
alter table public.ln_glossary enable row level security;
alter table public.ln_review_notes enable row level security;
alter table public.ln_chapter_versions enable row level security;
alter table public.ln_subscriptions enable row level security;
alter table public.ln_read_events enable row level security;
create policy "ln novel read" on public.ln_novels for select to anon,authenticated
using(publication_status='published' or (select public.is_admin()) or
 (auth.uid() is not null and public.is_ln_reviewer(id)));
create policy "ln novel write" on public.ln_novels for all to authenticated
using((select public.is_admin())) with check((select public.is_admin()));
create policy "ln chapter read" on public.ln_chapters for select to anon,authenticated
using(((status='published' or (status='scheduled' and release_at<=now()))
 and exists(select 1 from public.ln_novels n where n.id=novel_id
  and n.publication_status='published')) or (select public.is_admin())
 or (auth.uid() is not null and public.is_ln_reviewer(novel_id)));
create policy "ln chapter write" on public.ln_chapters for all to authenticated
using((select public.is_admin())) with check((select public.is_admin()));
create policy "ln reviewer read" on public.ln_reviewers for select to authenticated
using(user_id=auth.uid() or (select public.is_admin()));
create policy "ln reviewer write" on public.ln_reviewers for all to authenticated
using((select public.is_admin())) with check((select public.is_admin()));
create policy "ln glossary read" on public.ln_glossary for select to authenticated
using((select public.is_admin()) or public.is_ln_reviewer(novel_id));
create policy "ln glossary write" on public.ln_glossary for all to authenticated
using((select public.is_admin())) with check((select public.is_admin()));
create policy "ln notes read" on public.ln_review_notes for select to authenticated
using(exists(select 1 from public.ln_chapters c where c.id=chapter_id and
 ((select public.is_admin()) or public.is_ln_reviewer(c.novel_id))));
create policy "ln notes add" on public.ln_review_notes for insert to authenticated
with check(user_id=auth.uid() and exists(select 1 from public.ln_chapters c
 where c.id=chapter_id and ((select public.is_admin()) or public.is_ln_reviewer(c.novel_id))));
create policy "ln versions read" on public.ln_chapter_versions for select to authenticated
using((select public.is_admin()) or exists(select 1 from public.ln_chapters c
 where c.id=chapter_id and public.is_ln_reviewer(c.novel_id)));
create policy "ln subscription own" on public.ln_subscriptions for all to authenticated
using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "ln event add" on public.ln_read_events for insert to authenticated
with check(user_id=auth.uid() and exists(select 1 from public.ln_chapters c
 join public.ln_novels n on n.id=c.novel_id where c.id=chapter_id
 and c.novel_id=ln_read_events.novel_id and n.publication_status='published'
 and (c.status='published' or (c.status='scheduled' and c.release_at<=now()))));
create policy "ln event read" on public.ln_read_events for select to authenticated
using(user_id=auth.uid() or (select public.is_admin()));
grant select on public.ln_novels,public.ln_chapters to anon,authenticated;
grant insert,update,delete on public.ln_novels,public.ln_chapters to authenticated;
grant select,insert,update,delete on public.ln_reviewers,public.ln_glossary to authenticated;
grant select,insert on public.ln_review_notes to authenticated;
grant select on public.ln_chapter_versions to authenticated;
grant select,insert,delete on public.ln_subscriptions to authenticated;
grant select,insert on public.ln_read_events to authenticated;
