-- Jumsup V6 audit fixes
-- Run after 001, 002, 003.

-- 1) Prevent users from granting themselves role/xp/streak/pro flags through profiles UPDATE.
alter table public.profiles add column if not exists timezone text not null default 'UTC';
revoke update on public.profiles from authenticated;
grant update(username,avatar_url,ui_language,ui_theme,sound_enabled,timezone) on public.profiles to authenticated;

create or replace function public.validate_profile_timezone()
returns trigger language plpgsql set search_path=public as $$
begin
  if not exists(select 1 from pg_timezone_names where name=new.timezone) then
    raise exception 'INVALID_TIMEZONE';
  end if;
  return new;
end $$;
drop trigger if exists trg_profile_timezone on public.profiles;
create trigger trg_profile_timezone before insert or update of timezone on public.profiles
for each row execute function public.validate_profile_timezone();

create or replace function public.user_local_date(p_user uuid)
returns date language sql stable security definer set search_path=public as $$
  select (now() at time zone coalesce((select timezone from profiles where user_id=p_user),'UTC'))::date
$$;

-- 2) Daily check-in and translation quotas respect the account timezone.
create or replace function public.do_daily_checkin()
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); p profiles%rowtype; d date; new_streak int;
begin
 if uid is null then raise exception 'Not authenticated'; end if;
 d:=public.user_local_date(uid);
 select * into p from profiles where user_id=uid for update;
 if p.last_checkin=d then return jsonb_build_object('checked',true,'streak',p.streak,'xp',p.xp); end if;
 new_streak:=case when p.last_checkin=d-1 then p.streak+1 else 1 end;
 insert into daily_checkins(user_id,checkin_date,xp_awarded) values(uid,d,20) on conflict do nothing;
 update profiles set last_checkin=d,streak=new_streak,xp=xp+20,updated_at=now() where user_id=uid;
 return jsonb_build_object('checked',true,'streak',new_streak,'xp',p.xp+20,'local_date',d);
end $$;

create or replace function public.consume_translation_quota()
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); c int; d date;
begin
 if uid is null then raise exception 'Not authenticated'; end if;
 if public.user_is_pro(uid) then return jsonb_build_object('allowed',true,'pro',true,'remaining',null); end if;
 d:=public.user_local_date(uid);
 insert into translation_usage(user_id,usage_date,usage_count) values(uid,d,0) on conflict do nothing;
 select usage_count into c from translation_usage where user_id=uid and usage_date=d for update;
 if c>=10 then return jsonb_build_object('allowed',false,'pro',false,'remaining',0); end if;
 update translation_usage set usage_count=usage_count+1 where user_id=uid and usage_date=d;
 return jsonb_build_object('allowed',true,'pro',false,'remaining',9-c);
end $$;

-- 3) Pro users must be able to create multiple Listening/Writing/Mock sessions per day.
alter table public.usage_sessions drop constraint if exists usage_sessions_user_id_feature_usage_date_key;
create index if not exists usage_sessions_daily_lookup_idx on public.usage_sessions(user_id,feature,usage_date);

create or replace function public.start_usage_session(p_feature text,p_session_key text,p_state jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); r usage_sessions%rowtype; d date;
begin
 if uid is null then raise exception 'Not authenticated'; end if;
 if p_feature not in ('listening','writing','mock') then raise exception 'Invalid feature'; end if;
 d:=public.user_local_date(uid);

 if public.user_is_pro(uid) then
   select * into r from usage_sessions where user_id=uid and session_key=p_session_key;
   if not found then
     insert into usage_sessions(user_id,feature,usage_date,session_key,state)
     values(uid,p_feature,d,p_session_key,coalesce(p_state,'{}'::jsonb)) returning * into r;
   end if;
   return jsonb_build_object('allowed',true,'pro',true,'session_id',r.id,'resume',r.started_at < now()-interval '1 second');
 end if;

 select * into r from usage_sessions where user_id=uid and feature=p_feature and usage_date=d order by started_at desc limit 1;
 if found then
   return jsonb_build_object('allowed',r.session_key=p_session_key,'pro',false,'session_id',r.id,'resume',true,'existing_session_key',r.session_key);
 end if;
 insert into usage_sessions(user_id,feature,usage_date,session_key,state)
 values(uid,p_feature,d,p_session_key,coalesce(p_state,'{}'::jsonb)) returning * into r;
 return jsonb_build_object('allowed',true,'pro',false,'session_id',r.id,'resume',false);
end $$;

-- 4) Stripe webhook retry state: failed processing can be retried safely.
alter table public.processed_webhook_events add column if not exists status text not null default 'completed'
  check(status in ('processing','completed','failed'));
alter table public.processed_webhook_events add column if not exists attempts integer not null default 1;
alter table public.processed_webhook_events add column if not exists last_error text;
alter table public.processed_webhook_events add column if not exists completed_at timestamptz;
update public.processed_webhook_events set completed_at=coalesce(completed_at,processed_at),status='completed' where status='completed';

create or replace function public.claim_stripe_event(p_event_id text,p_event_type text,p_payload_hash text)
returns boolean language plpgsql security definer set search_path=public as $$
declare r processed_webhook_events%rowtype;
begin
 insert into processed_webhook_events(event_id,event_type,payload_hash,status,attempts,processed_at)
 values(p_event_id,p_event_type,p_payload_hash,'processing',1,now())
 on conflict(event_id) do nothing;
 if found then return true; end if;

 select * into r from processed_webhook_events where event_id=p_event_id for update;
 if r.status='completed' then return false; end if;
 if r.status='processing' and r.processed_at > now()-interval '5 minutes' then return false; end if;
 update processed_webhook_events
 set status='processing',attempts=attempts+1,processed_at=now(),last_error=null
 where event_id=p_event_id;
 return true;
end $$;

create or replace function public.complete_stripe_event(p_event_id text)
returns void language sql security definer set search_path=public as $$
 update processed_webhook_events set status='completed',completed_at=now(),last_error=null where event_id=p_event_id
$$;
create or replace function public.fail_stripe_event(p_event_id text,p_error text)
returns void language sql security definer set search_path=public as $$
 update processed_webhook_events set status='failed',last_error=left(coalesce(p_error,'unknown'),2000) where event_id=p_event_id
$$;
revoke execute on function public.claim_stripe_event(text,text,text) from authenticated,anon;
revoke execute on function public.complete_stripe_event(text) from authenticated,anon;
revoke execute on function public.fail_stripe_event(text,text) from authenticated,anon;
grant execute on function public.claim_stripe_event(text,text,text) to service_role;
grant execute on function public.complete_stripe_event(text) to service_role;
grant execute on function public.fail_stripe_event(text,text) to service_role;

-- 5) Keep direct browser writes away from server-authoritative payment/security records.
revoke insert,update,delete on public.refund_requests from authenticated,anon;
revoke insert,update,delete on public.usage_sessions from anon;

-- 6) Server-authoritative vocabulary mastery/XP. Users cannot reset progress to farm XP.
revoke insert,update,delete on public.learning_progress from authenticated,anon;

create or replace function public.sync_learning_progress(p_set_id text,p_indices integer[])
returns integer[] language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); valid integer[]; current_vals integer[];
begin
 if uid is null then raise exception 'Not authenticated'; end if;
 if not exists(select 1 from vocab_sets where id=p_set_id and user_id=uid) then raise exception 'FORBIDDEN'; end if;
 select coalesce(array_agg(distinct i order by i),'{}'::integer[]) into valid
 from unnest(coalesce(p_indices,'{}'::integer[])) i
 where i>=0 and i<(select count(*) from vocab_words where set_id=p_set_id);

 insert into learning_progress(user_id,set_id,mastered_indices,updated_at)
 values(uid,p_set_id,valid,now())
 on conflict(user_id,set_id) do update
 set mastered_indices=(select coalesce(array_agg(distinct x order by x),'{}'::integer[]) from unnest(learning_progress.mastered_indices||excluded.mastered_indices) x),
     updated_at=now()
 returning mastered_indices into current_vals;
 return current_vals;
end $$;

create or replace function public.mark_word_mastered(p_set_id text,p_index integer)
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); vals integer[]; already boolean; new_xp integer;
begin
 if uid is null then raise exception 'Not authenticated'; end if;
 if not exists(select 1 from vocab_sets where id=p_set_id and user_id=uid) then raise exception 'FORBIDDEN'; end if;
 if p_index<0 or p_index>=(select count(*) from vocab_words where set_id=p_set_id) then raise exception 'INVALID_WORD_INDEX'; end if;

 insert into learning_progress(user_id,set_id,mastered_indices,updated_at) values(uid,p_set_id,'{}'::integer[],now()) on conflict do nothing;
 select coalesce(mastered_indices,'{}'::integer[]) into vals from learning_progress where user_id=uid and set_id=p_set_id for update;
 already:=p_index=any(vals);
 if not already then vals:=array_append(vals,p_index); end if;

 insert into learning_progress(user_id,set_id,mastered_indices,updated_at)
 values(uid,p_set_id,vals,now())
 on conflict(user_id,set_id) do update set mastered_indices=excluded.mastered_indices,updated_at=now();

 if not already then update profiles set xp=xp+10,updated_at=now() where user_id=uid returning xp into new_xp;
 else select xp into new_xp from profiles where user_id=uid;
 end if;
 return jsonb_build_object('mastered',vals,'xp',new_xp,'awarded',not already);
end $$;

grant execute on function public.sync_learning_progress(text,integer[]) to authenticated;
grant execute on function public.mark_word_mastered(text,integer) to authenticated;
