-- Bots go back to a FIXED weekly score (base_xp + deterministic wobble) so every
-- player sees the exact same leaderboard. Apply after 024_display_name.sql.

create or replace function public.bot_week_xp(p_name text, p_base integer, p_wk date)
returns integer language sql immutable as $$
  select greatest(15, p_base + (abs(hashtext(p_name || p_wk::text)) % 25) - 12);
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
  show_bots := coalesce(real_players, 0) < 15;

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
             public.bot_week_xp(b.name, b.base_xp, wk),
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

-- Drop the now-unused 4-arg variant from 020.
drop function if exists public.bot_week_xp(text, numeric, integer, date);
