
-- Jumsup Production Hardening V4
-- Run after 001_full_production.sql

create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  entitlement text not null default 'pro',
  source text not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  active boolean not null default true,
  source_ref text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(user_id,entitlement,source,source_ref)
);

create table if not exists public.processed_webhook_events (
  event_id text primary key,
  event_type text not null,
  payload_hash text,
  processed_at timestamptz not null default now()
);

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(user_id) on delete set null,
  stripe_event_id text unique not null,
  stripe_payment_intent_id text,
  stripe_invoice_id text,
  kind text not null,
  amount integer,
  currency text,
  status text,
  created_at timestamptz not null default now()
);

create table if not exists public.referral_rewards (
  id uuid primary key default gen_random_uuid(),
  referral_claim_id uuid not null references public.referral_claims(id) on delete cascade,
  stripe_event_id text unique not null,
  inviter_days integer not null default 14,
  invitee_days integer not null default 7,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoke_reason text,
  unique(referral_claim_id)
);

create table if not exists public.usage_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  feature text not null check(feature in ('listening','writing','mock')),
  usage_date date not null default current_date,
  session_key text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  state jsonb not null default '{}'::jsonb,
  unique(user_id,feature,usage_date),
  unique(user_id,session_key)
);

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid references public.profiles(user_id) on delete set null,
  action text not null,
  object_type text,
  object_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.account_deletion_requests (
  user_id uuid primary key references public.profiles(user_id) on delete cascade,
  requested_at timestamptz not null default now(),
  execute_after timestamptz not null default now()+interval '7 days',
  canceled_at timestamptz,
  completed_at timestamptz
);

alter table public.referral_claims add column if not exists qualified_at timestamptz;
alter table public.referral_claims add column if not exists rewarded_at timestamptz;
alter table public.referral_claims add column if not exists first_paid_event_id text unique;

create or replace function public.user_is_pro(p_user uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select
   coalesce((select pro_lifetime from profiles where user_id=p_user),false)
   or coalesce((select pro_bonus_until>now() from profiles where user_id=p_user),false)
   or exists(select 1 from subscriptions where user_id=p_user and status in ('active','trialing') and (current_period_end is null or current_period_end>now()))
   or exists(select 1 from entitlements where user_id=p_user and entitlement='pro' and active=true and starts_at<=now() and (ends_at is null or ends_at>now()))
$$;

create or replace function public.private_quota(p_kind text)
returns integer language sql immutable as $$
 select case when p_kind='vocab' then 3 when p_kind in ('reading','listening','writing','mock') then 1 else 0 end
$$;

create or replace function public.can_make_private(p_user uuid,p_kind text,p_exclude_id text default null)
returns boolean language plpgsql stable security definer set search_path=public as $$
declare c integer;
begin
 if public.user_is_pro(p_user) then return true; end if;
 if p_kind='vocab' then
   select count(*) into c from vocab_sets where user_id=p_user and visibility='private' and (p_exclude_id is null or id<>p_exclude_id);
 else
   select count(*) into c from practice_sets where user_id=p_user and kind=p_kind and visibility='private' and (p_exclude_id is null or id<>p_exclude_id);
 end if;
 return c<public.private_quota(p_kind);
end $$;

create or replace function public.enforce_vocab_visibility()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.visibility='private' and not public.can_make_private(new.user_id,'vocab',new.id) then raise exception 'PRIVATE_QUOTA_REACHED'; end if;
 return new;
end $$;
drop trigger if exists trg_vocab_visibility on public.vocab_sets;
create trigger trg_vocab_visibility before insert or update of visibility,user_id on public.vocab_sets
for each row execute function public.enforce_vocab_visibility();

create or replace function public.enforce_practice_visibility()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.visibility='private' and not public.can_make_private(new.user_id,new.kind,new.id) then raise exception 'PRIVATE_QUOTA_REACHED'; end if;
 return new;
end $$;
drop trigger if exists trg_practice_visibility on public.practice_sets;
create trigger trg_practice_visibility before insert or update of visibility,user_id,kind on public.practice_sets
for each row execute function public.enforce_practice_visibility();

create or replace function public.start_usage_session(p_feature text,p_session_key text,p_state jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); r usage_sessions%rowtype;
begin
 if uid is null then raise exception 'Not authenticated'; end if;
 if p_feature not in ('listening','writing','mock') then raise exception 'Invalid feature'; end if;

 if public.user_is_pro(uid) then
   select * into r from usage_sessions where user_id=uid and session_key=p_session_key;
   if not found then
     insert into usage_sessions(user_id,feature,usage_date,session_key,state)
     values(uid,p_feature,current_date,p_session_key,coalesce(p_state,'{}'::jsonb)) returning * into r;
   end if;
   return jsonb_build_object('allowed',true,'pro',true,'session_id',r.id,'resume',false);
 end if;

 select * into r from usage_sessions where user_id=uid and feature=p_feature and usage_date=current_date;
 if found then
   return jsonb_build_object('allowed',r.session_key=p_session_key,'pro',false,'session_id',r.id,'resume',true,'existing_session_key',r.session_key);
 end if;

 insert into usage_sessions(user_id,feature,usage_date,session_key,state)
 values(uid,p_feature,current_date,p_session_key,coalesce(p_state,'{}'::jsonb)) returning * into r;
 return jsonb_build_object('allowed',true,'pro',false,'session_id',r.id,'resume',false);
end $$;

create or replace function public.save_usage_session(p_session_key text,p_state jsonb,p_complete boolean default false)
returns void language plpgsql security definer set search_path=public as $$
begin
 update usage_sessions
 set state=coalesce(p_state,'{}'::jsonb),
     completed_at=case when p_complete then coalesce(completed_at,now()) else completed_at end
 where user_id=auth.uid() and session_key=p_session_key;
 if not found then raise exception 'SESSION_NOT_FOUND'; end if;
end $$;

create or replace function public.claim_referral(p_code text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); inviter uuid;
begin
 if uid is null then raise exception 'Not authenticated'; end if;
 select user_id into inviter from profiles where upper(referral_code)=upper(trim(p_code));
 if inviter is null then raise exception 'Referral code not found'; end if;
 if inviter=uid then raise exception 'Cannot use your own referral code'; end if;
 if exists(select 1 from referral_claims where invitee_user_id=uid) then raise exception 'Referral already claimed'; end if;
 insert into referral_claims(inviter_user_id,invitee_user_id) values(inviter,uid);
 return jsonb_build_object('ok',true,'status','pending_payment');
end $$;

create or replace function public.reward_referral_after_first_payment(p_invitee uuid,p_stripe_event_id text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare rc referral_claims%rowtype; inviter_until timestamptz; invitee_until timestamptz;
begin
 select * into rc from referral_claims where invitee_user_id=p_invitee for update;
 if not found then return jsonb_build_object('rewarded',false,'reason','no_referral'); end if;
 if rc.rewarded_at is not null then return jsonb_build_object('rewarded',false,'reason','already_rewarded'); end if;

 update profiles set pro_bonus_until=greatest(coalesce(pro_bonus_until,now()),now())+interval '14 days',updated_at=now()
 where user_id=rc.inviter_user_id returning pro_bonus_until into inviter_until;
 update profiles set pro_bonus_until=greatest(coalesce(pro_bonus_until,now()),now())+interval '7 days',updated_at=now()
 where user_id=rc.invitee_user_id returning pro_bonus_until into invitee_until;

 update referral_claims set qualified_at=now(),rewarded_at=now(),first_paid_event_id=p_stripe_event_id where id=rc.id;
 insert into referral_rewards(referral_claim_id,stripe_event_id) values(rc.id,p_stripe_event_id);
 return jsonb_build_object('rewarded',true,'inviter_until',inviter_until,'invitee_until',invitee_until);
end $$;

create or replace function public.export_my_data()
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'Not authenticated'; end if;
 return jsonb_build_object(
  'profile',(select to_jsonb(p) from profiles p where user_id=uid),
  'vocab_sets',(select coalesce(jsonb_agg(to_jsonb(v)),'[]'::jsonb) from vocab_sets v where user_id=uid),
  'vocab_words',(select coalesce(jsonb_agg(to_jsonb(w)),'[]'::jsonb) from vocab_words w join vocab_sets v on v.id=w.set_id where v.user_id=uid),
  'practice_sets',(select coalesce(jsonb_agg(to_jsonb(p)),'[]'::jsonb) from practice_sets p where user_id=uid),
  'progress',(select coalesce(jsonb_agg(to_jsonb(lp)),'[]'::jsonb) from learning_progress lp where user_id=uid),
  'checkins',(select coalesce(jsonb_agg(to_jsonb(dc)),'[]'::jsonb) from daily_checkins dc where user_id=uid),
  'subscription',(select to_jsonb(s) from subscriptions s where user_id=uid),
  'entitlements',(select coalesce(jsonb_agg(to_jsonb(e)),'[]'::jsonb) from entitlements e where user_id=uid)
 );
end $$;

alter table public.entitlements enable row level security;
alter table public.processed_webhook_events enable row level security;
alter table public.payment_events enable row level security;
alter table public.referral_rewards enable row level security;
alter table public.usage_sessions enable row level security;
alter table public.audit_log enable row level security;
alter table public.account_deletion_requests enable row level security;

create policy entitlements_self_read on public.entitlements for select using(user_id=auth.uid());
create policy usage_self_read on public.usage_sessions for select using(user_id=auth.uid());
create policy usage_self_update on public.usage_sessions for update using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy deletion_self_read on public.account_deletion_requests for select using(user_id=auth.uid());
create policy referral_reward_read on public.referral_rewards for select using(
 exists(select 1 from referral_claims r where r.id=referral_claim_id and (r.inviter_user_id=auth.uid() or r.invitee_user_id=auth.uid()))
);
create policy audit_self_read on public.audit_log for select using(actor_user_id=auth.uid());

grant execute on function public.start_usage_session(text,text,jsonb) to authenticated;
grant execute on function public.save_usage_session(text,jsonb,boolean) to authenticated;
grant execute on function public.export_my_data() to authenticated;
grant execute on function public.can_make_private(uuid,text,text) to authenticated;

revoke insert,update,delete on public.subscriptions from authenticated,anon;
revoke insert,update,delete on public.entitlements from authenticated,anon;
revoke insert,update,delete on public.processed_webhook_events from authenticated,anon;
revoke insert,update,delete on public.payment_events from authenticated,anon;
revoke insert,update,delete on public.referral_rewards from authenticated,anon;
revoke insert,update,delete on public.audit_log from authenticated,anon;
