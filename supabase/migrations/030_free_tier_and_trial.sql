-- Freemium tuning to build a daily habit before asking for money:
--   1. Every new signup gets a 7-day Pro trial (pro_bonus_until), auto-expiring.
--   2. Free private/community set limit 3 -> 5.
--   3. Free practice (reading/listening/writing/mock): was 3 attempts per rolling
--      3 days per skill (too harsh — kills the habit on day 1). Now 1 set per
--      skill per local day, so a student can still practise every day.
-- Apply after 029_push_subscriptions.sql. Games and Pro behaviour unchanged.

------------------------------------------------------------------------------
-- 1. 7-DAY TRIAL ON SIGNUP
------------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare base_name text;
begin
  base_name := regexp_replace(
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1), 'user'),
    '[^a-zA-Z0-9_]+', '_', 'g');
  insert into public.profiles(user_id, username, avatar_url, referral_code, pro_bonus_until)
  values(
    new.id,
    lower(base_name) || '_' || substr(new.id::text, 1, 5),
    new.raw_user_meta_data->>'avatar_url',
    public.make_referral_code(),
    now() + interval '7 days'
  )
  on conflict(user_id) do nothing;
  return new;
end $$;

------------------------------------------------------------------------------
-- 2. FREE SET LIMIT 3 -> 5 (own + community both use this)
------------------------------------------------------------------------------
create or replace function public.enforce_vocab_set_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare n integer; lim integer;
begin
  if public.user_is_pro(new.user_id) then return new; end if;
  lim := 5;
  select count(*) into n from vocab_sets
   where user_id = new.user_id and source_type = new.source_type and id <> new.id;
  if n >= lim then
    if new.source_type = 'community' then raise exception 'COMMUNITY_SET_LIMIT_REACHED';
    else raise exception 'VOCAB_SET_LIMIT_REACHED'; end if;
  end if;
  return new;
end $$;

------------------------------------------------------------------------------
-- 3. FREE PRACTICE: 1 set per skill per local day
------------------------------------------------------------------------------
create or replace function public.start_usage_session(p_feature text, p_session_key text, p_state jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); r usage_sessions%rowtype; d date; pro boolean;
        mins integer; lim integer; used integer; cooldown timestamptz;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if p_feature not in ('reading','listening','writing','mock','match','crossword') then
    raise exception 'Invalid feature';
  end if;
  d := public.user_local_date(uid);
  pro := public.user_is_pro(uid);
  mins := greatest(1, least(240, coalesce((p_state->>'minutes')::integer, 10)));

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

  if pro then
    insert into usage_sessions(user_id, feature, usage_date, session_key, state, ends_at)
    values(uid, p_feature, d, p_session_key, coalesce(p_state,'{}'::jsonb), now() + make_interval(mins => mins))
    returning * into r;
    return jsonb_build_object('allowed', true, 'pro', true, 'session_id', r.id, 'resume', false, 'ends_at', r.ends_at);
  end if;

  -- games: unchanged daily caps
  if p_feature in ('match','crossword') then
    lim := case when p_feature = 'match' then 10 else 3 end;
    select count(*) into used from usage_sessions where user_id = uid and feature = p_feature and usage_date = d;
    if used >= lim then
      return jsonb_build_object('allowed', false, 'pro', false, 'reason', 'DAILY_GAME_LIMIT', 'remaining', 0);
    end if;
    insert into usage_sessions(user_id, feature, usage_date, session_key, state, ends_at)
    values(uid, p_feature, d, p_session_key, coalesce(p_state,'{}'::jsonb), now() + interval '4 hours')
    returning * into r;
    return jsonb_build_object('allowed', true, 'pro', false, 'session_id', r.id, 'remaining', lim - used - 1);
  end if;

  -- reading/listening/writing/mock: 1 free set per skill per local day
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
