-- Tightens the Free tier now that signup no longer grants an automatic Pro
-- trial (033_remove_signup_pro_trial.sql): Free needs real, sellable limits
-- rather than the generous "build a habit" numbers from 030.
--   1. Own vocab sets: 5 -> 2 (community-set limit stays 5).
--   2. Match: 10 -> 5 rounds/day. Crossword: 3 -> 2 rounds/day.
--   3. Reading/Listening/Writing/Mock: sets with more than 10 questions are
--      Pro-only regardless of the daily/weekly quota. The client reports the
--      question count via p_state->>'item_count'.
--   4. Mock specifically moves from a daily reset to a 7-day cooldown for
--      Free (Reading/Listening/Writing stay at 1 set per skill per day).
-- Apply after 033_remove_signup_pro_trial.sql.

create or replace function public.enforce_vocab_set_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare n integer; lim integer;
begin
  if public.user_is_pro(new.user_id) then return new; end if;
  lim := case when new.source_type = 'community' then 5 else 2 end;
  select count(*) into n from vocab_sets
   where user_id = new.user_id and source_type = new.source_type and id <> new.id;
  if n >= lim then
    if new.source_type = 'community' then raise exception 'COMMUNITY_SET_LIMIT_REACHED';
    else raise exception 'VOCAB_SET_LIMIT_REACHED'; end if;
  end if;
  return new;
end $$;

create or replace function public.start_usage_session(p_feature text, p_session_key text, p_state jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); r usage_sessions%rowtype; d date; pro boolean;
        mins integer; lim integer; used integer; cooldown timestamptz;
        item_count integer; last_mock_date date;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if p_feature not in ('reading','listening','writing','mock','match','crossword') then
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

  -- sets larger than 10 questions are Pro-only, independent of the daily/weekly quota
  if p_feature in ('reading','listening','writing','mock') and not pro
     and item_count is not null and item_count > 10 then
    return jsonb_build_object('allowed', false, 'pro', false, 'reason', 'PRO_ONLY_LARGE_SET',
      'limit', 10, 'item_count', item_count);
  end if;

  if pro then
    insert into usage_sessions(user_id, feature, usage_date, session_key, state, ends_at)
    values(uid, p_feature, d, p_session_key, coalesce(p_state,'{}'::jsonb), now() + make_interval(mins => mins))
    returning * into r;
    return jsonb_build_object('allowed', true, 'pro', true, 'session_id', r.id, 'resume', false, 'ends_at', r.ends_at);
  end if;

  -- games: tightened daily caps
  if p_feature in ('match','crossword') then
    lim := case when p_feature = 'match' then 5 else 2 end;
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
