-- Split identity: username stays a unique @handle (022); display_name is a
-- free-form nickname shown to other users, duplicates allowed.
-- Apply after 022_username_uniqueness.sql + 023_bot_hidden_name.sql.

alter table public.profiles add column if not exists display_name text;

alter table public.profiles drop constraint if exists profiles_display_name_len;
alter table public.profiles add constraint profiles_display_name_len
  check (
    display_name is null
    or (char_length(btrim(display_name)) between 1 and 40 and display_name !~ '[[:cntrl:]]')
  ) not valid;
alter table public.profiles validate constraint profiles_display_name_len;

create or replace function public.set_display_name(p_name text)
returns text language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); clean text;
begin
  if uid is null then raise exception 'UNAUTHORIZED'; end if;
  clean := nullif(btrim(p_name), '');
  if clean is not null and (char_length(clean) > 40 or clean ~ '[[:cntrl:]]') then
    raise exception 'DISPLAY_NAME_INVALID';
  end if;
  update public.profiles set display_name = clean, updated_at = now() where user_id = uid;
  return coalesce(clean, '');
end $$;
grant execute on function public.set_display_name(text) to authenticated;

-- Reviews: show the nickname (fall back to @handle) unless masked.
create or replace function public.get_content_reviews(p_type text, p_id text, p_sort text default 'recent')
returns table (
  id uuid, rating integer, body text, anonymous boolean,
  created_at timestamptz, updated_at timestamptz, is_mine boolean,
  display_name text, helpful_count integer, helpful_by_me boolean,
  imported boolean, creator_reply text, creator_replied_at timestamptz
)
language sql security definer set search_path = public as $$
  select
    r.id, r.rating, r.body, r.anonymous, r.created_at, r.updated_at,
    (r.user_id = auth.uid()) as is_mine,
    case
      when not r.anonymous
        or r.user_id = auth.uid()
        or exists (select 1 from public.profiles p
                   where p.user_id = auth.uid() and p.role = 'admin')
      then coalesce(nullif(pr.display_name, ''), '@' || pr.username::text, '')
      else ''
    end as display_name,
    r.helpful_count,
    exists (select 1 from public.content_review_helpful h
            where h.review_id = r.id and h.user_id = auth.uid()) as helpful_by_me,
    exists (select 1 from public.content_imports ci
            where ci.user_id = r.user_id
              and ci.content_type = r.content_type
              and ci.source_content_id = r.content_id) as imported,
    r.creator_reply, r.creator_replied_at
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

-- Leaderboard: nickname first, and expose is_me per row for reliable highlight.
create or replace function public.weekly_leaderboard(p_limit integer default 20)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  wk date := public.bkk_week_start();
  uid uuid := auth.uid();
  real_players integer;
  show_bots boolean;
  my_xp integer;
  ref integer;
begin
  select count(*) into real_players
  from public.weekly_xp where week_start = wk and xp > 0;
  show_bots := coalesce(real_players, 0) < 15;

  select coalesce(xp, 0) into my_xp
  from public.weekly_xp where user_id = uid and week_start = wk;
  ref := greatest(coalesce(my_xp, 0), 150);

  return (
    with rows as (
      select case
               when p.leaderboard_anon and p.user_id is distinct from uid
                 then 'ผู้เรียน #' || substr(md5(p.user_id::text), 1, 4)
               else coalesce(nullif(p.display_name, ''), nullif(p.username::text, ''), 'ผู้เรียน')
             end as username,
             w.xp,
             (p.user_id = uid) as is_me
      from public.weekly_xp w
      join public.profiles p on p.user_id = w.user_id
      where w.week_start = wk and w.xp > 0
      union all
      select case when b.hidden
                    then 'ผู้เรียน #' || substr(md5(b.id::text), 1, 4)
                  else b.name end,
             public.bot_week_xp(b.name, b.factor, ref, wk),
             false
      from public.leaderboard_bots b
      where b.active and show_bots
    ),
    ranked as (
      select username, xp, is_me,
             rank() over (order by xp desc) as rank
      from rows
    )
    select jsonb_build_object(
      'week_start', wk,
      'top', coalesce((
        select jsonb_agg(row_to_json(t) order by t.rank)
        from (select username, xp, rank, is_me from ranked
              order by rank limit greatest(1, least(p_limit, 100))) t
      ), '[]'::jsonb),
      'me', (select row_to_json(x) from (select xp, rank from ranked where is_me limit 1) x)
    )
  );
end $$;
grant execute on function public.weekly_leaderboard(integer) to authenticated;
