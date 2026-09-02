-- Review v2: helpful votes, creator replies, "imported" badge, sorting.
-- Apply after 009_review_anonymity.sql.

alter table public.content_reviews
  add column if not exists helpful_count integer not null default 0,
  add column if not exists creator_reply text,
  add column if not exists creator_replied_at timestamptz;

create table if not exists public.content_review_helpful (
  review_id uuid not null references public.content_reviews(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (review_id, user_id)
);
alter table public.content_review_helpful enable row level security;

drop policy if exists "helpful readable" on public.content_review_helpful;
create policy "helpful readable" on public.content_review_helpful for select using (true);
drop policy if exists "users manage own helpful" on public.content_review_helpful;
create policy "users manage own helpful" on public.content_review_helpful
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, delete on public.content_review_helpful to authenticated;

-- Does the current user own the piece of content a review is attached to?
create or replace function public.owns_content(p_type text, p_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select
    (p_type = 'vocab' and exists (select 1 from public.vocab_sets s
       where s.id = p_id and s.user_id = auth.uid()))
    or
    (p_type = 'skill' and exists (select 1 from public.practice_sets s
       where s.id = p_id and s.user_id = auth.uid()));
$$;

-- Reviews for one content id, name-masked, with helpful + reply + imported flags.
-- p_sort: 'recent' (default) | 'top' (rating desc) | 'helpful'
drop function if exists public.get_content_reviews(text, text);
drop function if exists public.get_content_reviews(text, text, text);
create function public.get_content_reviews(p_type text, p_id text, p_sort text default 'recent')
returns table (
  id uuid,
  rating integer,
  body text,
  anonymous boolean,
  created_at timestamptz,
  updated_at timestamptz,
  is_mine boolean,
  display_name text,
  helpful_count integer,
  helpful_by_me boolean,
  imported boolean,
  creator_reply text,
  creator_replied_at timestamptz
)
language sql security definer set search_path = public as $$
  select
    r.id,
    r.rating,
    r.body,
    r.anonymous,
    r.created_at,
    r.updated_at,
    (r.user_id = auth.uid()) as is_mine,
    case
      when not r.anonymous
        or r.user_id = auth.uid()
        or exists (select 1 from public.profiles p
                   where p.user_id = auth.uid() and p.role = 'admin')
      then coalesce(pr.username, '')
      else ''
    end as display_name,
    r.helpful_count,
    exists (select 1 from public.content_review_helpful h
            where h.review_id = r.id and h.user_id = auth.uid()) as helpful_by_me,
    exists (select 1 from public.content_imports ci
            where ci.user_id = r.user_id
              and ci.content_type = r.content_type
              and ci.source_content_id = r.content_id) as imported,
    r.creator_reply,
    r.creator_replied_at
  from public.content_reviews r
  left join public.profiles pr on pr.user_id = r.user_id
  where r.content_type = p_type
    and r.content_id = p_id
    and (r.status = 'visible' or r.user_id = auth.uid())
  order by
    case when p_sort = 'top' then r.rating end desc nulls last,
    case when p_sort = 'helpful' then r.helpful_count end desc nulls last,
    r.updated_at desc
$$;
grant execute on function public.get_content_reviews(text, text, text) to authenticated, anon;
grant execute on function public.owns_content(text, text) to authenticated;

create or replace function public.toggle_review_helpful(p_review_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); n integer;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if exists (select 1 from public.content_review_helpful where review_id = p_review_id and user_id = uid) then
    delete from public.content_review_helpful where review_id = p_review_id and user_id = uid;
  else
    insert into public.content_review_helpful(review_id, user_id) values (p_review_id, uid);
  end if;
  select count(*) into n from public.content_review_helpful where review_id = p_review_id;
  update public.content_reviews set helpful_count = n where id = p_review_id;
  return n;
end $$;
grant execute on function public.toggle_review_helpful(uuid) to authenticated;

create or replace function public.reply_to_review(p_review_id uuid, p_reply text)
returns void language plpgsql security definer set search_path = public as $$
declare r public.content_reviews;
begin
  select * into r from public.content_reviews where id = p_review_id;
  if not found then raise exception 'Review not found'; end if;
  if not public.owns_content(r.content_type, r.content_id) then raise exception 'FORBIDDEN'; end if;
  update public.content_reviews
    set creator_reply = nullif(btrim(p_reply), ''),
        creator_replied_at = case when nullif(btrim(p_reply), '') is null then null else now() end
    where id = p_review_id;
end $$;
grant execute on function public.reply_to_review(uuid, text) to authenticated;
