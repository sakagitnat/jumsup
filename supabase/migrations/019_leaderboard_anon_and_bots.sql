-- Leaderboard name-hiding + filler bots (removable once the userbase grows).
-- Apply after 018_weekly_leaderboard.sql.

alter table public.profiles
  add column if not exists leaderboard_anon boolean not null default false;

create table if not exists public.leaderboard_bots (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  base_xp integer not null default 200,
  active boolean not null default true
);
alter table public.leaderboard_bots enable row level security;
-- No policies: unreadable directly. weekly_leaderboard() (security definer) reads it.

insert into public.leaderboard_bots(name, base_xp) values
  ('ครูอ้อย', 520),
  ('น้องพลอย', 470),
  ('เจฟฟรี่', 430),
  ('มะปราง', 380),
  ('TutorTuk', 340),
  ('ปังปอนด์', 300),
  ('เบสท์', 260),
  ('lisa_eng', 220),
  ('นักเรียนดี99', 180),
  ('พี่หมี', 140)
on conflict do nothing;

-- Deterministic per-week XP for a bot: base ± ~70, never below 20.
create or replace function public.bot_week_xp(p_name text, p_base integer, p_wk date)
returns integer language sql immutable as $$
  select greatest(20, p_base + (abs(hashtext(p_name || p_wk::text)) % 141) - 70);
$$;

create or replace function public.weekly_leaderboard(p_limit integer default 20)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  wk date := public.bkk_week_start();
  uid uuid := auth.uid();
  real_players integer;
  show_bots boolean;
begin
  select count(*) into real_players
  from public.weekly_xp where week_start = wk and xp > 0;
  -- Bots fill the board only while real participation is thin.
  show_bots := coalesce(real_players, 0) < 15;

  return (
    with rows as (
      select case
               when p.leaderboard_anon and p.user_id is distinct from uid
                 then 'ผู้เรียน #' || substr(md5(p.user_id::text), 1, 4)
               else coalesce(nullif(p.username, ''), 'ผู้เรียน')
             end as username,
             w.xp,
             (p.user_id = uid) as is_me
      from public.weekly_xp w
      join public.profiles p on p.user_id = w.user_id
      where w.week_start = wk and w.xp > 0
      union all
      select b.name, public.bot_week_xp(b.name, b.base_xp, wk), false
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
        from (select username, xp, rank from ranked
              order by rank limit greatest(1, least(p_limit, 100))) t
      ), '[]'::jsonb),
      'me', (select row_to_json(x) from (select xp, rank from ranked where is_me limit 1) x)
    )
  );
end $$;

grant execute on function public.weekly_leaderboard(integer) to authenticated;
