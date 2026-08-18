
-- Jumsup V5 Refund Workflow
-- Run after 001_full_production.sql and 002_production_hardening.sql

create table if not exists public.refund_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  payment_event_id uuid not null references public.payment_events(id) on delete restrict,
  reason text not null,
  requested_amount integer,
  status text not null default 'pending'
    check(status in ('pending','approved','rejected','processing','refunded','failed','canceled')),
  cancel_subscription boolean not null default true,
  admin_note text,
  stripe_refund_id text unique,
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(user_id) on delete set null,
  completed_at timestamptz,
  unique(user_id,payment_event_id,status)
);

create index if not exists refund_requests_user_idx on public.refund_requests(user_id,requested_at desc);
create index if not exists refund_requests_status_idx on public.refund_requests(status,requested_at);

alter table public.refund_requests enable row level security;
create policy refund_self_read on public.refund_requests for select using(user_id=auth.uid());

-- Replace referral reward implementation so each bonus can be revoked independently.
create or replace function public.reward_referral_after_first_payment(p_invitee uuid,p_stripe_event_id text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  rc referral_claims%rowtype;
  inviter_end timestamptz;
  invitee_end timestamptz;
begin
 select * into rc from referral_claims where invitee_user_id=p_invitee for update;
 if not found then return jsonb_build_object('rewarded',false,'reason','no_referral'); end if;
 if rc.rewarded_at is not null then return jsonb_build_object('rewarded',false,'reason','already_rewarded'); end if;

 inviter_end := now()+interval '14 days';
 invitee_end := now()+interval '7 days';

 insert into entitlements(user_id,entitlement,source,starts_at,ends_at,active,source_ref,metadata)
 values
   (rc.inviter_user_id,'pro','referral_inviter',now(),inviter_end,true,rc.id::text,jsonb_build_object('days',14,'invitee_user_id',rc.invitee_user_id)),
   (rc.invitee_user_id,'pro','referral_invitee',now(),invitee_end,true,rc.id::text,jsonb_build_object('days',7,'inviter_user_id',rc.inviter_user_id))
 on conflict(user_id,entitlement,source,source_ref) do nothing;

 update referral_claims
 set qualified_at=now(),rewarded_at=now(),first_paid_event_id=p_stripe_event_id
 where id=rc.id;

 insert into referral_rewards(referral_claim_id,stripe_event_id)
 values(rc.id,p_stripe_event_id)
 on conflict do nothing;

 return jsonb_build_object('rewarded',true,'inviter_until',inviter_end,'invitee_until',invitee_end);
end $$;

create or replace function public.revoke_referral_reward_for_payment(p_invitee uuid,p_reason text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare rc referral_claims%rowtype;
begin
 select * into rc from referral_claims where invitee_user_id=p_invitee and rewarded_at is not null;
 if not found then return jsonb_build_object('revoked',false,'reason','no_reward'); end if;

 update entitlements
 set active=false,
     metadata=metadata||jsonb_build_object('revoked_at',now(),'revoke_reason',p_reason)
 where source_ref=rc.id::text and source in ('referral_inviter','referral_invitee') and active=true;

 update referral_rewards set revoked_at=coalesce(revoked_at,now()),revoke_reason=coalesce(revoke_reason,p_reason)
 where referral_claim_id=rc.id;

 return jsonb_build_object('revoked',true);
end $$;

grant execute on function public.revoke_referral_reward_for_payment(uuid,text) to service_role;
revoke execute on function public.revoke_referral_reward_for_payment(uuid,text) from authenticated,anon;

-- Users request a refund against their own latest successful payment record.
create or replace function public.request_refund(
  p_payment_event_id uuid,
  p_reason text,
  p_cancel_subscription boolean default true
)
returns uuid language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); rid uuid;
begin
 if uid is null then raise exception 'Not authenticated'; end if;
 if length(trim(coalesce(p_reason,'')))<5 then raise exception 'Refund reason is too short'; end if;

 if not exists(
   select 1 from payment_events
   where id=p_payment_event_id and user_id=uid and status='succeeded'
 ) then raise exception 'Payment not found'; end if;

 if exists(
   select 1 from refund_requests
   where user_id=uid and payment_event_id=p_payment_event_id
   and status in ('pending','approved','processing','refunded')
 ) then raise exception 'Refund request already exists'; end if;

 insert into refund_requests(user_id,payment_event_id,reason,cancel_subscription)
 values(uid,p_payment_event_id,left(trim(p_reason),1000),p_cancel_subscription)
 returning id into rid;

 insert into audit_log(actor_user_id,action,object_type,object_id,metadata)
 values(uid,'request_refund','refund_request',rid::text,jsonb_build_object('payment_event_id',p_payment_event_id));

 return rid;
end $$;

grant execute on function public.request_refund(uuid,text,boolean) to authenticated;

create policy payment_events_self_read on public.payment_events for select using(user_id=auth.uid());
