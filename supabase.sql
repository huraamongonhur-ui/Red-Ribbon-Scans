-- Supabase -> SQL Editor дээр нэг удаа бүтнээр нь ажиллуулна.

-- 1) Хэрэглэгчийн нэр
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (char_length(username) between 2 and 24),
  created_at timestamptz not null default now()
);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare v text := left(trim(coalesce(new.raw_user_meta_data->>'username','')), 24);
begin
  if char_length(v) < 2 then v := 'user' || substr(new.id::text, 1, 6); end if;
  insert into public.profiles (id, username) values (new.id, v);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2) Сэтгэгдэл (бүлэг бүрт)
create table public.comments (
  id bigint generated always as identity primary key,
  manga_id text not null,
  chapter text not null,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index on public.comments (manga_id, chapter, created_at desc);

-- 3) Үнэлгээ (манга бүрт, хүн бүр нэг удаа)
create table public.reviews (
  id bigint generated always as identity primary key,
  manga_id text not null,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  body text not null default '' check (char_length(body) <= 1000),
  created_at timestamptz not null default now(),
  unique (user_id, manga_id)
);

-- 4) Хамгаалалт: нэвтэрсэн хүн л унших, зөвхөн өөрийнхөө мэдээллийг бичих, засах, устгах
alter table public.profiles enable row level security;
alter table public.comments enable row level security;
alter table public.reviews  enable row level security;

create policy "profiles: logged in read" on public.profiles for select to authenticated using (true);

create policy "comments: logged in read" on public.comments for select to authenticated using (true);
create policy "comments: write own"      on public.comments for insert to authenticated with check (auth.uid() = user_id);
create policy "comments: delete own"     on public.comments for delete to authenticated using (auth.uid() = user_id);

create policy "reviews: logged in read" on public.reviews for select to authenticated using (true);
create policy "reviews: write own"      on public.reviews for insert to authenticated with check (auth.uid() = user_id);
create policy "reviews: update own"     on public.reviews for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "reviews: delete own"     on public.reviews for delete to authenticated using (auth.uid() = user_id);

-- 5) Дундаж үнэлгээ бүгдэд харагдана (текст биш, зөвхөн тоо)
create view public.manga_ratings as
  select manga_id, round(avg(rating)::numeric, 1) as avg, count(*) as n
  from public.reviews group by manga_id;
grant select on public.manga_ratings to anon, authenticated;
