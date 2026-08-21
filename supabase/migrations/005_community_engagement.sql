-- Community likes, reviews and import counters.
-- Apply after migrations 001 -> 004. Existing migrations must not be edited.

create table if not exists public.content_likes (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  content_type text not null check (content_type in ('vocab','skill')),
  content_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id,content_type,content_id)
);
create index if not exists content_likes_content_idx on public.content_likes(content_type,content_id);

create table if not exists public.content_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  content_type text not null check (content_type in ('vocab','skill')),
  content_id text not null,
  rating integer not null check (rating between 1 and 5),
  body text not null default '' check (char_length(body) <= 1000),
  status text not null default 'visible' check (status in ('visible','hidden','removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,content_type,content_id)
);
create index if not exists content_reviews_content_idx on public.content_reviews(content_type,content_id,status);

create table if not exists public.content_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  content_type text not null check (content_type in ('vocab','skill')),
  source_content_id text not null,
  imported_content_id text not null,
  created_at timestamptz not null default now(),
  unique(user_id,content_type,source_content_id)
);
create index if not exists content_imports_source_idx on public.content_imports(content_type,source_content_id);

alter table public.content_likes enable row level security;
alter table public.content_reviews enable row level security;
alter table public.content_imports enable row level security;

drop policy if exists "likes readable" on public.content_likes;
create policy "likes readable" on public.content_likes for select using (true);
drop policy if exists "users manage own likes" on public.content_likes;
create policy "users manage own likes" on public.content_likes for all using (auth.uid()=user_id) with check (auth.uid()=user_id);

drop policy if exists "visible reviews readable" on public.content_reviews;
create policy "visible reviews readable" on public.content_reviews for select using (status='visible' or auth.uid()=user_id or exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.role='admin'));
drop policy if exists "users create own reviews" on public.content_reviews;
create policy "users create own reviews" on public.content_reviews for insert with check (auth.uid()=user_id);
drop policy if exists "users update own reviews" on public.content_reviews;
create policy "users update own reviews" on public.content_reviews for update using (auth.uid()=user_id) with check (auth.uid()=user_id);
drop policy if exists "users delete own reviews" on public.content_reviews;
create policy "users delete own reviews" on public.content_reviews for delete using (auth.uid()=user_id);

drop policy if exists "import counts readable" on public.content_imports;
create policy "import counts readable" on public.content_imports for select using (true);
drop policy if exists "users create own import records" on public.content_imports;
create policy "users create own import records" on public.content_imports for insert with check (auth.uid()=user_id);

grant select,insert,delete on public.content_likes to authenticated;
grant select,insert,update,delete on public.content_reviews to authenticated;
grant select,insert on public.content_imports to authenticated;
