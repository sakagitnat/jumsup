-- Let an individual bot hide its name on the board like an anonymous player.
-- Apply after 019_leaderboard_anon_and_bots.sql.

alter table public.leaderboard_bots
  add column if not exists hidden boolean not null default false;

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
               else coalesce(nullif(p.username, ''), 'ผู้เรียน')
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
        from (select username, xp, rank from ranked
              order by rank limit greatest(1, least(p_limit, 100))) t
      ), '[]'::jsonb),
      'me', (select row_to_json(x) from (select xp, rank from ranked where is_me limit 1) x)
    )
  );
end $$;

grant execute on function public.weekly_leaderboard(integer) to authenticated;
