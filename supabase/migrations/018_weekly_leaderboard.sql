-- Weekly XP leaderboard. A trigger mirrors every increase of profiles.xp into
-- weekly_xp for the current ISO week (Bangkok Monday boundary), so all server
-- XP sources (check-in, vocab mastery, future ones) are captured automatically.
-- Apply after 004_audit_fixes.sql.

create table if not exists public.weekly_xp (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  week_start date not null,
  xp integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, week_start)
);

create index if not exists weekly_xp_week_idx on public.weekly_xp(week_start, xp desc);

alter table public.weekly_xp enable row level security;
-- Direct reads are self-only; the cross-user board comes from the RPC below.
create policy weekly_xp_self on public.weekly_xp
  for select using (user_id = auth.uid());

create or replace function public.bkk_week_start()
returns date language sql stable as $$
  select date_trunc('week', (now() at time zone 'Asia/Bangkok'))::date;
$$;

create or replace function public.track_weekly_xp()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.xp > coalesce(OLD.xp, 0) then
    insert into public.weekly_xp(user_id, week_start, xp)
    values (NEW.user_id, public.bkk_week_start(), NEW.xp - coalesce(OLD.xp, 0))
    on conflict (user_id, week_start)
      do update set xp = public.weekly_xp.xp + excluded.xp, updated_at = now();
  end if;
  return NEW;
end $$;

drop trigger if exists profiles_weekly_xp on public.profiles;
create trigger profiles_weekly_xp
  after update of xp on public.profiles
  for each row execute function public.track_weekly_xp();

-- Seed this week from check-ins already recorded (each = +20 XP).
insert into public.weekly_xp(user_id, week_start, xp)
select user_id, public.bkk_week_start(), sum(coalesce(xp_awarded, 20))
from public.daily_checkins
where checkin_date >= public.bkk_week_start()
group by user_id
on conflict (user_id, week_start)
  do update set xp = greatest(public.weekly_xp.xp, excluded.xp), updated_at = now();

create or replace function public.weekly_leaderboard(p_limit integer default 20)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  wk date := public.bkk_week_start();
  top jsonb;
  me jsonb;
begin
  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into top from (
    select coalesce(p.username, 'ผู้เรียน') as username,
           w.xp,
           rank() over (order by w.xp desc) as rank
    from public.weekly_xp w
    join public.profiles p on p.user_id = w.user_id
    where w.week_start = wk and w.xp > 0
    order by w.xp desc, p.username
    limit greatest(1, least(p_limit, 100))
  ) t;

  select row_to_json(x) into me from (
    select w.xp,
           (select count(*) + 1 from public.weekly_xp w2
              where w2.week_start = wk and w2.xp > w.xp) as rank
    from public.weekly_xp w
    where w.user_id = auth.uid() and w.week_start = wk
  ) x;

  return jsonb_build_object('week_start', wk, 'top', top, 'me', me);
end $$;

revoke all on function public.weekly_leaderboard(integer) from public, anon;
grant execute on function public.weekly_leaderboard(integer) to authenticated;
