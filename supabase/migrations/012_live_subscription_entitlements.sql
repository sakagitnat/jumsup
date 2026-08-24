-- Only a subscription created by the configured live Jumsup Stripe account
-- may unlock paid server-side quotas. This prevents legacy/test subscription
-- rows from being treated as paid access by database functions.
create or replace function public.user_is_pro(p_user uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select
   coalesce((select pro_lifetime from profiles where user_id=p_user),false)
   or coalesce((select pro_bonus_until>now() from profiles where user_id=p_user),false)
   or exists(
     select 1 from subscriptions
     where user_id=p_user
       and payment_provider='stripe'
       and payment_account='stripe_live_th'
       and status in ('active','trialing')
       and (current_period_end is null or current_period_end>now())
   )
   or exists(
     select 1 from entitlements
     where user_id=p_user and entitlement='pro' and active=true
       and starts_at<=now() and (ends_at is null or ends_at>now())
   )
$$;

revoke execute on function public.user_is_pro(uuid) from anon;
grant execute on function public.user_is_pro(uuid) to authenticated,service_role;
