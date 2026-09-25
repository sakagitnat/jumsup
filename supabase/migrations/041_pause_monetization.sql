-- Paid plans are paused pre-launch (no real users/subscriptions yet). Every
-- server-side limit that gates on public.user_is_pro() -- private deck/practice
-- counts, words-per-deck cap, Match/Crossword/Wordle daily limits,
-- Reading/Listening/Writing/Mock daily+weekly limits and the "large set"
-- Pro-only gate, and the daily translation quota -- flows through this one
-- function, so redefining it to unconditionally return true grants everyone
-- full access without touching any of those call sites individually.
--
-- To re-enable billing later, restore the original body from
-- 012_live_subscription_entitlements.sql in a new migration:
--
--   create or replace function public.user_is_pro(p_user uuid)
--   returns boolean language sql stable security definer set search_path=public as $$
--    select
--      coalesce((select pro_lifetime from profiles where user_id=p_user),false)
--      or coalesce((select pro_bonus_until>now() from profiles where user_id=p_user),false)
--      or exists(
--        select 1 from subscriptions
--        where user_id=p_user
--          and payment_provider='stripe'
--          and payment_account='stripe_live_th'
--          and status in ('active','trialing')
--          and (current_period_end is null or current_period_end>now())
--      )
--      or exists(
--        select 1 from entitlements
--        where user_id=p_user and entitlement='pro' and active=true
--          and starts_at<=now() and (ends_at is null or ends_at>now())
--      )
--   $$;
--
-- and also flip MONETIZATION_ENABLED back to true in src/lib/entitlements.js.

create or replace function public.user_is_pro(p_user uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select true
$$;
