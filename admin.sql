-- supabase.sql-ийн дараа Supabase → SQL Editor дээр нэг удаа ажиллуулна.

-- 1) Админуудын жагсаалт. RLS асаалттай, policy байхгүй тул сайтаас шууд өөрчилж болохгүй.
create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.admins enable row level security;

-- 2) "Би админ уу?" гэдгийг шалгадаг функц
create function public.is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid())
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- 3) Админ хэний ч сэтгэгдэл, үнэлгээг устгаж чадна
create policy "comments: admin delete" on public.comments
  for delete to authenticated using (public.is_admin());
create policy "reviews: admin delete" on public.reviews
  for delete to authenticated using (public.is_admin());

-- 4) Өөрийгөө админ болгох: эхлээд сайтад бүртгүүлж, дараа нь доорх мөрийг
--    өөрийн имэйлээр солиод ажиллуулна.
-- insert into public.admins (user_id)
-- select id from auth.users where email = 'ТАНЫ_ИМЭЙЛ@example.com';
