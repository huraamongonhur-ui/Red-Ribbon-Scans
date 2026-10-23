-- Light Novel Admin 4.0 · Phase 2. Run after light_novel_admin.sql.
-- Order changes are transactional; only admins may call this function.
create or replace function public.ln_reorder_chapters(p_novel uuid,p_ids uuid[])
returns void language plpgsql security definer set search_path='' as $$
declare existing_count integer;
begin
 if not public.is_admin() then raise exception 'Admin only'; end if;
 select count(*) into existing_count from public.ln_chapters where novel_id=p_novel;
 if p_ids is null or existing_count=0 or existing_count<>cardinality(p_ids)
 or cardinality(p_ids)<>(select count(distinct u.id) from unnest(p_ids) u(id))
 or exists(select 1 from unnest(p_ids) u(id) where not exists(
     select 1 from public.ln_chapters c where c.id=u.id and c.novel_id=p_novel))
 then raise exception 'Chapter list mismatch'; end if;
 update public.ln_chapters c set sort_order=u.ordinality::integer
 from unnest(p_ids) with ordinality u(id,ordinality)
 where c.id=u.id and c.novel_id=p_novel;
end$$;
revoke all on function public.ln_reorder_chapters(uuid,uuid[]) from public,anon;
grant execute on function public.ln_reorder_chapters(uuid,uuid[]) to authenticated;

-- Public art may be viewed by anybody with its URL. Never upload confidential draft art here.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('ln-public-art','ln-public-art',true,10485760,
 array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=excluded.file_size_limit,
allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "ln art insert" on storage.objects;
create policy "ln art insert" on storage.objects for insert to authenticated
with check(bucket_id='ln-public-art' and (select public.is_admin()));
drop policy if exists "ln art select" on storage.objects;
create policy "ln art select" on storage.objects for select to authenticated
using(bucket_id='ln-public-art' and (select public.is_admin()));
drop policy if exists "ln art delete" on storage.objects;
create policy "ln art delete" on storage.objects for delete to authenticated
using(bucket_id='ln-public-art' and (select public.is_admin()));

-- Important: scheduled chapter visibility uses release_at at query time, no cron required.
-- In-app follow notifications appear on the next visit; web push is not enabled.
