-- New minigame: Wordle. Both start_usage_session (daily-limit gate) and
-- award_game_xp (completion XP) hardcode which game names they accept --
-- re-declare each in full with 'wordle' added, since create or replace
-- function replaces the whole body.

create or replace function public.award_game_xp(p_game text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); d date; n integer;
begin
  if uid is null then raise exception 'UNAUTHORIZED'; end if;
  if p_game not in ('match','crossword','wordle') then raise exception 'INVALID_GAME'; end if;
  d := public.user_local_date(uid);
  select count(*) into n from public.xp_events
  where user_id = uid and source = 'game' and meta->>'game' = p_game
    and (created_at at time zone 'Asia/Bangkok')::date = d;
  if n > 0 then
    return jsonb_build_object('awarded', 0, 'xp', (select xp from public.profiles where user_id = uid));
  end if;
  perform public._grant_xp(uid, 'game', 12, jsonb_build_object('game', p_game));
  return jsonb_build_object('awarded', 12, 'xp', (select xp from public.profiles where user_id = uid));
end $$;
grant execute on function public.award_game_xp(text) to authenticated;

create or replace function public.start_usage_session(p_feature text, p_session_key text, p_state jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); r usage_sessions%rowtype; d date; pro boolean;
        mins integer; lim integer; used integer; cooldown timestamptz;
        item_count integer; last_mock_date date; max_free_items integer;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if p_feature not in ('reading','listening','writing','mock','match','crossword','wordle') then
    raise exception 'Invalid feature';
  end if;
  d := public.user_local_date(uid);
  pro := public.user_is_pro(uid);
  mins := greatest(1, least(240, coalesce((p_state->>'minutes')::integer, 10)));
  item_count := nullif(p_state->>'item_count', '')::integer;

  -- resume an existing session by key
  select * into r from usage_sessions where user_id = uid and session_key = p_session_key;
  if found then
    return jsonb_build_object('allowed', r.ends_at is null or r.ends_at > now(), 'pro', pro,
      'session_id', r.id, 'resume', true, 'existing_session_key', r.session_key, 'ends_at', r.ends_at,
      'remaining_seconds', greatest(0, extract(epoch from (r.ends_at - now()))::integer));
  end if;

  -- resume an in-progress attempt on the same content
  if p_feature in ('reading','listening','writing','mock') and coalesce(p_state->>'content_id','') <> '' then
    select * into r from usage_sessions where user_id = uid and feature = p_feature and ends_at > now()
      and state->>'content_id' = p_state->>'content_id' order by started_at desc limit 1;
    if found then
      return jsonb_build_object('allowed', true, 'pro', pro, 'session_id', r.id, 'resume', true,
        'existing_session_key', r.session_key, 'ends_at', r.ends_at,
        'remaining_seconds', greatest(0, extract(epoch from (r.ends_at - now()))::integer));
    end if;
  end if;

  -- large sets are Pro-only, independent of the daily/weekly quota. Mock gets a
  -- higher cutoff (30) since a full mock exam naturally runs longer.
  max_free_items := case when p_feature = 'mock' then 30 else 10 end;
  if p_feature in ('reading','listening','writing','mock') and not pro
     and item_count is not null and item_count > max_free_items then
    return jsonb_build_object('allowed', false, 'pro', false, 'reason', 'PRO_ONLY_LARGE_SET',
      'limit', max_free_items, 'item_count', item_count);
  end if;

  if pro then
    insert into usage_sessions(user_id, feature, usage_date, session_key, state, ends_at)
    values(uid, p_feature, d, p_session_key, coalesce(p_state,'{}'::jsonb), now() + make_interval(mins => mins))
    returning * into r;
    return jsonb_build_object('allowed', true, 'pro', true, 'session_id', r.id, 'resume', false, 'ends_at', r.ends_at);
  end if;

  -- games: tightened daily caps
  if p_feature in ('match','crossword','wordle') then
    lim := case when p_feature = 'match' then 5 when p_feature = 'wordle' then 5 else 2 end;
    select count(*) into used from usage_sessions where user_id = uid and feature = p_feature and usage_date = d;
    if used >= lim then
      return jsonb_build_object('allowed', false, 'pro', false, 'reason', 'DAILY_GAME_LIMIT', 'limit', lim, 'remaining', 0);
    end if;
    insert into usage_sessions(user_id, feature, usage_date, session_key, state, ends_at)
    values(uid, p_feature, d, p_session_key, coalesce(p_state,'{}'::jsonb), now() + interval '4 hours')
    returning * into r;
    return jsonb_build_object('allowed', true, 'pro', false, 'session_id', r.id, 'remaining', lim - used - 1);
  end if;

  -- mock: 1 free attempt per 7 days (instead of daily)
  if p_feature = 'mock' then
    select max(usage_date) into last_mock_date from usage_sessions where user_id = uid and feature = 'mock';
    if last_mock_date is not null and d - last_mock_date < 7 then
      cooldown := ((last_mock_date + 7)::timestamp at time zone 'Asia/Bangkok');
      return jsonb_build_object('allowed', false, 'pro', false, 'reason', 'WEEKLY_LIMIT', 'limit', 1, 'remaining', 0,
        'retry_at', cooldown,
        'remaining_seconds', greatest(0, extract(epoch from (cooldown - now()))::integer));
    end if;
    insert into usage_sessions(user_id, feature, usage_date, session_key, state, ends_at)
    values(uid, p_feature, d, p_session_key,
           coalesce(p_state,'{}'::jsonb) || jsonb_build_object('free_attempt', true),
           now() + make_interval(mins => mins))
    returning * into r;
    return jsonb_build_object('allowed', true, 'pro', false, 'session_id', r.id, 'resume', false,
      'ends_at', r.ends_at, 'limit', 1, 'remaining', 0);
  end if;

  -- reading/listening/writing: 1 free set per skill per local day
  select count(*) into used from usage_sessions
   where user_id = uid and feature = p_feature and usage_date = d;
  if used >= 1 then
    cooldown := ((d + 1)::timestamp at time zone 'Asia/Bangkok');
    return jsonb_build_object('allowed', false, 'pro', false, 'reason', 'DAILY_LIMIT', 'limit', 1, 'remaining', 0,
      'retry_at', cooldown,
      'remaining_seconds', greatest(0, extract(epoch from (cooldown - now()))::integer));
  end if;

  insert into usage_sessions(user_id, feature, usage_date, session_key, state, ends_at)
  values(uid, p_feature, d, p_session_key,
         coalesce(p_state,'{}'::jsonb) || jsonb_build_object('free_attempt', true),
         now() + make_interval(mins => mins))
  returning * into r;
  return jsonb_build_object('allowed', true, 'pro', false, 'session_id', r.id, 'resume', false,
    'ends_at', r.ends_at, 'limit', 1, 'remaining', 0);
end $$;

grant execute on function public.start_usage_session(text, text, jsonb) to authenticated;
