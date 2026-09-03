-- Three systems that share one new foundation: a Cloudflare Cron Trigger that
-- calls the worker's scheduled() handler.
--   1. Weekly leaderboard "season close" — snapshot the final board (real players
--      + bots), pay tiered rewards, and leave every player a one-time recap card.
--      History is browsable in-app and in the admin console.
--   2. xp_integrity_report — admin-only view over xp_events that flags suspicious
--      earning patterns.
--   3. (no schema here) account-deletion execution: the worker reads
--      account_deletion_requests directly with the service role.
-- Apply after 027_xp_economy.sql.

------------------------------------------------------------------------------
-- 1. WEEKLY SEASON CLOSE
------------------------------------------------------------------------------

-- Final standings, one row per rank per closed week. Bots are kept so the board
-- reads the same in history as it did live; user_id is nulled if the account is
-- later deleted but the historical name/score stay.
create table if not exists public.weekly_leaderboard_history (
  week_start      date    not null,
  rank            integer not null,
  user_id         uuid    references public.profiles(user_id) on delete set null,
  is_bot          boolean not null default false,
  display_name    text    not null,
  xp              integer not null default 0,
  reward_xp       integer not null default 0,
  reward_pro_days integer not null default 0,
  created_at      timestamptz not null default now(),
  primary key (week_start, rank)
);
create index if not exists wlh_user_idx
  on public.weekly_leaderboard_history(user_id, week_start desc);

alter table public.weekly_leaderboard_history enable row level security;
-- The leaderboard is public inside the app; any signed-in user may read history.
drop policy if exists wlh_read on public.weekly_leaderboard_history;
create policy wlh_read on public.weekly_leaderboard_history
  for select to authenticated using (true);

-- Reward bands by finishing rank. Admin-editable; only the service role reads it
-- (no RLS policy => authenticated/anon cannot select).
create table if not exists public.weekly_reward_tiers (
  id              serial primary key,
  min_rank        integer not null,
  max_rank        integer not null,
  reward_xp       integer not null default 0,
  reward_pro_days integer not null default 0,
  label           text    not null default '',
  check (min_rank >= 1 and max_rank >= min_rank),
  check (reward_xp >= 0 and reward_pro_days >= 0)
);
alter table public.weekly_reward_tiers enable row level security;

insert into public.weekly_reward_tiers (min_rank, max_rank, reward_xp, reward_pro_days, label)
select v.min_rank, v.max_rank, v.reward_xp, v.reward_pro_days, v.label
from (values
  (1, 1,  300, 3, 'อันดับ 1'),
  (2, 3,  150, 1, 'อันดับ 2–3'),
  (4, 10, 60,  0, 'อันดับ 4–10')
) as v(min_rank, max_rank, reward_xp, reward_pro_days, label)
where not exists (select 1 from public.weekly_reward_tiers);

-- One recap per user per closed week. seen is flipped by mark_week_recap_seen().
create table if not exists public.user_week_recap (
  user_id         uuid not null references public.profiles(user_id) on delete cascade,
  week_start      date not null,
  rank            integer not null,
  prev_rank       integer,
  xp              integer not null default 0,
  reward_xp       integer not null default 0,
  reward_pro_days integer not null default 0,
  tier_label      text not null default '',
  seen            boolean not null default false,
  created_at      timestamptz not null default now(),
  primary key (user_id, week_start)
);
alter table public.user_week_recap enable row level security;
drop policy if exists uwr_self_read on public.user_week_recap;
create policy uwr_self_read on public.user_week_recap
  for select to authenticated using (user_id = auth.uid());

-- Close one week: snapshot standings, write history + per-user recap, pay rewards.
-- Idempotent (re-running a closed week is a no-op). Defaults to the week that
-- just ended. Runs as the table owner; invoked by the worker (service role) or
-- the admin "close now" button.
create or replace function public.close_weekly_leaderboard(p_week date default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  wk          date := coalesce(p_week, public.bkk_week_start() - 7);
  cur_wk      date := public.bkk_week_start();
  n_players   integer;
  show_bots   boolean;
  rec         record;
  rwd_xp      integer;
  rwd_days    integer;
  tier_lbl    text;
  prev_rank_v integer;
  n_rows      integer := 0;
begin
  if wk >= cur_wk then
    return jsonb_build_object('ok', false, 'error', 'WEEK_NOT_FINISHED', 'week_start', wk);
  end if;
  if exists (select 1 from public.weekly_leaderboard_history where week_start = wk) then
    return jsonb_build_object('ok', true, 'already_closed', true, 'week_start', wk);
  end if;

  select count(*) into n_players
  from public.weekly_xp where week_start = wk and xp > 0;
  show_bots := coalesce(n_players, 0) < 15;

  for rec in
    with rows as (
      select p.user_id,
             false as is_bot,
             case
               when p.leaderboard_anon
                 then 'ผู้เรียน #' || substr(md5(p.user_id::text), 1, 4)
               else coalesce(nullif(p.display_name, ''), nullif(p.username::text, ''), 'ผู้เรียน')
             end as display_name,
             w.xp
      from public.weekly_xp w
      join public.profiles p on p.user_id = w.user_id
      where w.week_start = wk and w.xp > 0
      union all
      select null::uuid,
             true,
             case when b.hidden
                    then 'ผู้เรียน #' || substr(md5(b.id::text), 1, 4)
                  else b.name end,
             public.bot_week_xp(b.name, b.base_xp, wk)
      from public.leaderboard_bots b
      where b.active and show_bots
    ),
    ranked as (
      select user_id, is_bot, display_name, xp,
             row_number() over (order by xp desc, display_name) as rnk
      from rows
      where xp > 0
    )
    select * from ranked order by rnk
  loop
    select coalesce(sum(t.reward_xp), 0),
           coalesce(max(t.reward_pro_days), 0),
           coalesce(string_agg(t.label, ', ' order by t.min_rank), '')
      into rwd_xp, rwd_days, tier_lbl
      from public.weekly_reward_tiers t
     where rec.rnk between t.min_rank and t.max_rank;

    if rec.is_bot then
      rwd_xp := 0; rwd_days := 0;
    end if;

    insert into public.weekly_leaderboard_history
      (week_start, rank, user_id, is_bot, display_name, xp, reward_xp, reward_pro_days)
    values (wk, rec.rnk, rec.user_id, rec.is_bot, rec.display_name, rec.xp, rwd_xp, rwd_days);
    n_rows := n_rows + 1;

    if not rec.is_bot and rec.user_id is not null then
      select h.rank into prev_rank_v
        from public.weekly_leaderboard_history h
       where h.user_id = rec.user_id and h.week_start = wk - 7
       limit 1;

      insert into public.user_week_recap
        (user_id, week_start, rank, prev_rank, xp, reward_xp, reward_pro_days, tier_label)
      values (rec.user_id, wk, rec.rnk, prev_rank_v, rec.xp, rwd_xp, rwd_days, tier_lbl)
      on conflict (user_id, week_start) do nothing;

      if rwd_xp > 0 then
        -- Grant to lifetime XP + xp_events, then undo the weekly-XP side effect of
        -- the profiles.xp trigger so a prize can't inflate the new week's board.
        perform public._grant_xp(rec.user_id, 'weekly_reward', rwd_xp,
          jsonb_build_object('week_start', wk, 'rank', rec.rnk));
        update public.weekly_xp
           set xp = greatest(0, xp - rwd_xp), updated_at = now()
         where user_id = rec.user_id and week_start = cur_wk;
      end if;

      if rwd_days > 0 then
        update public.profiles
           set pro_bonus_until = greatest(coalesce(pro_bonus_until, now()), now())
                                 + make_interval(days => rwd_days),
               updated_at = now()
         where user_id = rec.user_id;
      end if;
    end if;
  end loop;

  return jsonb_build_object('ok', true, 'week_start', wk, 'rows', n_rows, 'bots_shown', show_bots);
end $$;

revoke all on function public.close_weekly_leaderboard(date) from public, anon, authenticated;
grant execute on function public.close_weekly_leaderboard(date) to service_role;

-- The signed-in user's latest unseen recap (for the pop-up card).
create or replace function public.my_week_recap()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select row_to_json(r) from (
       select week_start, rank, prev_rank, xp, reward_xp, reward_pro_days, tier_label
       from public.user_week_recap
       where user_id = auth.uid() and seen = false
       order by week_start desc
       limit 1
     ) r),
    'null'::json)::jsonb;
$$;
grant execute on function public.my_week_recap() to authenticated;

create or replace function public.mark_week_recap_seen()
returns void
language sql
security definer
set search_path = public
as $$
  update public.user_week_recap
     set seen = true
   where user_id = auth.uid() and seen = false;
$$;
grant execute on function public.mark_week_recap_seen() to authenticated;

-- Weeks that have been closed (newest first) for the history switcher.
create or replace function public.leaderboard_history_weeks()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(week_start order by week_start desc), '[]'::jsonb)
  from (select distinct week_start from public.weekly_leaderboard_history) w;
$$;
grant execute on function public.leaderboard_history_weeks() to authenticated;

-- One past week's standings. Marks the caller's own row so the UI can highlight it.
create or replace function public.leaderboard_history(p_week date, p_limit integer default 20)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'week_start', p_week,
    'top', coalesce((
      select jsonb_agg(row_to_json(t) order by t.rank)
      from (
        select h.rank, h.display_name as username, h.xp,
               h.reward_xp, h.reward_pro_days,
               (h.user_id is not null and h.user_id = auth.uid()) as is_me
        from public.weekly_leaderboard_history h
        where h.week_start = p_week
        order by h.rank
        limit greatest(1, least(p_limit, 100))
      ) t
    ), '[]'::jsonb),
    'me', (
      select row_to_json(x) from (
        select h.rank, h.xp, h.reward_xp, h.reward_pro_days
        from public.weekly_leaderboard_history h
        where h.week_start = p_week and h.user_id = auth.uid()
        limit 1
      ) x
    )
  );
$$;
grant execute on function public.leaderboard_history(date, integer) to authenticated;

------------------------------------------------------------------------------
-- 2. XP INTEGRITY REPORT (admin only)
------------------------------------------------------------------------------

-- Aggregates xp_events over a window and flags users whose earning pattern looks
-- off. Read-only signal for the admin; it takes no action.
create or replace function public.xp_integrity_report(p_days integer default 14)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  win_days integer := greatest(1, least(coalesce(p_days, 14), 90));
  since    timestamptz := now() - make_interval(days => win_days);
  items    jsonb;
begin
  with ev as (
    select e.user_id, e.source, e.amount, e.meta,
           (e.created_at at time zone 'Asia/Bangkok')::date as d
    from public.xp_events e
    where e.created_at >= since
  ),
  daily as (
    select user_id, d, sum(amount) as day_xp
    from ev group by user_id, d
  ),
  per_user as (
    select
      u.user_id,
      coalesce(max(dd.day_xp), 0)       as peak_day_xp,
      coalesce(sum(dd.day_xp), 0)       as window_xp,
      count(distinct dd.d)              as active_days,
      coalesce((
        select max(c) from (
          select count(*) c
          from ev x
          where x.user_id = u.user_id and x.source = 'practice'
          group by x.meta->>'set_id', x.d
        ) s), 0)                        as max_same_set_day,
      p.created_at                      as account_created,
      p.xp                              as lifetime_xp,
      coalesce(nullif(p.display_name, ''), nullif(p.username::text, ''), 'ผู้เรียน') as name,
      (p.banned_at is not null)         as banned
    from (select distinct user_id from ev) u
    join public.profiles p on p.user_id = u.user_id
    left join daily dd on dd.user_id = u.user_id
    group by u.user_id, p.created_at, p.xp, p.display_name, p.username, p.banned_at
  ),
  flagged as (
    select pu.*,
      array_remove(array[
        case when pu.peak_day_xp > 800 then 'xp_spike' end,
        case when pu.max_same_set_day >= 6 then 'set_farming' end,
        case when pu.account_created > now() - interval '3 days'
              and pu.window_xp > 500 then 'fast_new_account' end,
        case when pu.banned then 'earning_while_banned' end
      ], null) as flags
    from per_user pu
  )
  select coalesce(
    jsonb_agg(row_to_json(f)
      order by coalesce(array_length(f.flags, 1), 0) desc, f.peak_day_xp desc),
    '[]'::jsonb)
    into items
  from flagged f
  where array_length(f.flags, 1) >= 1;

  return jsonb_build_object('since', since, 'days', win_days, 'items', items);
end $$;

revoke all on function public.xp_integrity_report(integer) from public, anon, authenticated;
grant execute on function public.xp_integrity_report(integer) to service_role;
