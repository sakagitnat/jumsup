-- Server-enforced Free/Pro product limits, persistent exam timers and moderation.

alter table public.vocab_sets add column if not exists source_type text not null default 'own'
  check(source_type in ('own','community'));
alter table public.vocab_sets add column if not exists moderation_status text not null default 'visible'
  check(moderation_status in ('visible','hidden'));
alter table public.practice_sets add column if not exists moderation_status text not null default 'visible'
  check(moderation_status in ('visible','hidden'));
alter table public.usage_sessions add column if not exists ends_at timestamptz;
alter table public.usage_sessions drop constraint if exists usage_sessions_feature_check;
alter table public.usage_sessions add constraint usage_sessions_feature_check
  check(feature in ('reading','listening','writing','mock','match','crossword'));

create or replace function public.enforce_vocab_set_limit()
returns trigger language plpgsql security definer set search_path=public as $$
declare n integer; lim integer;
begin
 if public.user_is_pro(new.user_id) then return new; end if;
 lim:=3;
 select count(*) into n from vocab_sets
  where user_id=new.user_id and source_type=new.source_type and id<>new.id;
 if n>=lim then
  if new.source_type='community' then raise exception 'COMMUNITY_SET_LIMIT_REACHED';
  else raise exception 'VOCAB_SET_LIMIT_REACHED'; end if;
 end if;
 return new;
end $$;
drop trigger if exists enforce_vocab_set_limit_trigger on public.vocab_sets;
create trigger enforce_vocab_set_limit_trigger before insert on public.vocab_sets
for each row execute function public.enforce_vocab_set_limit();

create or replace function public.enforce_vocab_word_limit()
returns trigger language plpgsql security definer set search_path=public as $$
declare uid uuid; n integer; lim integer;
begin
 select user_id into uid from vocab_sets where id=new.set_id;
 if uid is null then raise exception 'SET_NOT_FOUND'; end if;
 lim:=case when public.user_is_pro(uid) then 1000 else 100 end;
 select count(*) into n from vocab_words where set_id=new.set_id and id<>new.id;
 if n>=lim then raise exception 'VOCAB_WORD_LIMIT_REACHED'; end if;
 return new;
end $$;
drop trigger if exists enforce_vocab_word_limit_trigger on public.vocab_words;
create trigger enforce_vocab_word_limit_trigger before insert on public.vocab_words
for each row execute function public.enforce_vocab_word_limit();

create or replace function public.start_usage_session(p_feature text,p_session_key text,p_state jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); r usage_sessions%rowtype; d date; pro boolean;
        mins integer; lim integer; used integer; first_use boolean; cooldown timestamptz;
begin
 if uid is null then raise exception 'Not authenticated'; end if;
 if p_feature not in ('reading','listening','writing','mock','match','crossword') then raise exception 'Invalid feature'; end if;
 d:=public.user_local_date(uid); pro:=public.user_is_pro(uid);
 mins:=greatest(1,least(240,coalesce((p_state->>'minutes')::integer,10)));

 select * into r from usage_sessions where user_id=uid and session_key=p_session_key;
 if found then
  return jsonb_build_object('allowed',r.ends_at is null or r.ends_at>now(),'pro',pro,'session_id',r.id,
   'resume',true,'existing_session_key',r.session_key,'ends_at',r.ends_at,'remaining_seconds',greatest(0,extract(epoch from (r.ends_at-now()))::integer));
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

 select not exists(select 1 from usage_sessions where user_id=uid and feature=p_feature) into first_use;
 if not first_use then
  if p_feature='mock' then
   select max(started_at)+interval '7 days' into cooldown from usage_sessions
    where user_id=uid and feature='mock' and coalesce(state->>'trial','false')='false';
  else
   select max(started_at)+interval '3 days' into cooldown from usage_sessions
    where user_id=uid and feature in ('reading','listening','writing') and coalesce(state->>'trial','false')='false';
  end if;
  if cooldown is not null and cooldown>now() then
   return jsonb_build_object('allowed',false,'pro',false,'reason','COOLDOWN','retry_at',cooldown,
    'remaining_seconds',extract(epoch from (cooldown-now()))::integer);
  end if;
 end if;

 insert into usage_sessions(user_id,feature,usage_date,session_key,state,ends_at)
 values(uid,p_feature,d,p_session_key,coalesce(p_state,'{}'::jsonb)||jsonb_build_object('trial',first_use),now()+make_interval(mins=>mins)) returning * into r;
 return jsonb_build_object('allowed',true,'pro',false,'trial',first_use,'session_id',r.id,'resume',false,'ends_at',r.ends_at);
end $$;

grant execute on function public.start_usage_session(text,text,jsonb) to authenticated;

create index if not exists usage_sessions_cooldown_idx on public.usage_sessions(user_id,feature,started_at desc);
create index if not exists vocab_sets_source_idx on public.vocab_sets(user_id,source_type);
create index if not exists vocab_sets_moderation_idx on public.vocab_sets(visibility,moderation_status);
create index if not exists practice_sets_moderation_idx on public.practice_sets(visibility,moderation_status);
