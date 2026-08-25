-- Three independent free attempts per skill in a rolling three-day window.
-- Active timed attempts resume without consuming another attempt.
create or replace function public.start_usage_session(p_feature text,p_session_key text,p_state jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); r usage_sessions%rowtype; d date; pro boolean;
        mins integer; lim integer; used integer; cooldown timestamptz;
begin
 if uid is null then raise exception 'Not authenticated'; end if;
 if p_feature not in ('reading','listening','writing','mock','match','crossword') then raise exception 'Invalid feature'; end if;
 d:=public.user_local_date(uid); pro:=public.user_is_pro(uid);
 mins:=greatest(1,least(240,coalesce((p_state->>'minutes')::integer,10)));

 select * into r from usage_sessions where user_id=uid and session_key=p_session_key;
 if found then
  return jsonb_build_object('allowed',r.ends_at is null or r.ends_at>now(),'pro',pro,'session_id',r.id,
   'resume',true,'existing_session_key',r.session_key,'ends_at',r.ends_at,
   'remaining_seconds',greatest(0,extract(epoch from (r.ends_at-now()))::integer));
 end if;

 if p_feature in ('reading','listening','writing','mock') and coalesce(p_state->>'content_id','')<>'' then
  select * into r from usage_sessions where user_id=uid and feature=p_feature and ends_at>now()
   and state->>'content_id'=p_state->>'content_id' order by started_at desc limit 1;
  if found then
   return jsonb_build_object('allowed',true,'pro',pro,'session_id',r.id,'resume',true,
    'existing_session_key',r.session_key,'ends_at',r.ends_at,
    'remaining_seconds',greatest(0,extract(epoch from (r.ends_at-now()))::integer));
  end if;
 end if;

 if pro then
  insert into usage_sessions(user_id,feature,usage_date,session_key,state,ends_at)
  values(uid,p_feature,d,p_session_key,coalesce(p_state,'{}'::jsonb),now()+make_interval(mins=>mins)) returning * into r;
  return jsonb_build_object('allowed',true,'pro',true,'session_id',r.id,'resume',false,'ends_at',r.ends_at);
 end if;

 if p_feature in ('match','crossword') then
  lim:=case when p_feature='match' then 10 else 3 end;
  select count(*) into used from usage_sessions where user_id=uid and feature=p_feature and usage_date=d;
  if used>=lim then return jsonb_build_object('allowed',false,'pro',false,'reason','DAILY_GAME_LIMIT','remaining',0); end if;
  insert into usage_sessions(user_id,feature,usage_date,session_key,state,ends_at)
  values(uid,p_feature,d,p_session_key,coalesce(p_state,'{}'::jsonb),now()+interval '4 hours') returning * into r;
  return jsonb_build_object('allowed',true,'pro',false,'session_id',r.id,'remaining',lim-used-1);
 end if;

 select count(*) into used from usage_sessions
  where user_id=uid and feature=p_feature and started_at>now()-interval '3 days';
 if used>=3 then
  select min(started_at)+interval '3 days' into cooldown from (
   select started_at from usage_sessions where user_id=uid and feature=p_feature
    and started_at>now()-interval '3 days' order by started_at desc limit 3
  ) recent;
  return jsonb_build_object('allowed',false,'pro',false,'reason','COOLDOWN','limit',3,'remaining',0,
   'retry_at',cooldown,'remaining_seconds',greatest(0,extract(epoch from (cooldown-now()))::integer));
 end if;

 insert into usage_sessions(user_id,feature,usage_date,session_key,state,ends_at)
 values(uid,p_feature,d,p_session_key,coalesce(p_state,'{}'::jsonb)||jsonb_build_object('free_attempt',true),now()+make_interval(mins=>mins)) returning * into r;
 return jsonb_build_object('allowed',true,'pro',false,'session_id',r.id,'resume',false,'ends_at',r.ends_at,
  'limit',3,'remaining',2-used);
end $$;

grant execute on function public.start_usage_session(text,text,jsonb) to authenticated;

