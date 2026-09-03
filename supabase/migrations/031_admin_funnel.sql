-- Activation funnel for the admin console, computed from existing tables (no new
-- instrumentation). Cohort = users who signed up in the last p_days.
-- Apply after 030_free_tier_and_trial.sql.

create or replace function public.admin_funnel(p_days integer default 30)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with win as (select greatest(1, least(coalesce(p_days, 30), 365)) as d),
  cohort as (
    select p.user_id, p.created_at
    from public.profiles p, win
    where p.created_at >= now() - make_interval(days => win.d)
  )
  select jsonb_build_object(
    'days', (select d from win),
    'signup', (select count(*) from cohort),
    'onboarded', (
      select count(*) from cohort c
      join public.profiles p on p.user_id = c.user_id
      where p.onboarding_completed_at is not null),
    'first_word', (
      select count(*) from cohort c
      where exists (select 1 from public.xp_events e
                    where e.user_id = c.user_id and e.source = 'flashcard')),
    'first_practice', (
      select count(*) from cohort c
      where exists (select 1 from public.practice_attempts a where a.user_id = c.user_id)),
    'first_checkin', (
      select count(*) from cohort c
      where exists (select 1 from public.daily_checkins d where d.user_id = c.user_id)),
    'returned_day2', (
      select count(*) from cohort c
      where exists (select 1 from public.daily_checkins d
                    where d.user_id = c.user_id and d.checkin_date > c.created_at::date)),
    'started_pro', (
      select count(*) from cohort c
      where exists (select 1 from public.subscriptions s where s.user_id = c.user_id))
  );
$$;

revoke all on function public.admin_funnel(integer) from public, anon, authenticated;
grant execute on function public.admin_funnel(integer) to service_role;
