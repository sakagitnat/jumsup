// Paid plans are paused pre-launch (no users yet) -- everyone gets full
// access for free until this is flipped back on. Flip MONETIZATION_ENABLED
// back to true (and redeploy the matching Supabase migration that restores
// public.user_is_pro's real check) to re-enable billing.
export const MONETIZATION_ENABLED=false;

export function isPro(state){
  if(!MONETIZATION_ENABLED)return true;
  const p=state.profile||{};
  if(p.pro_lifetime)return true;
  if(p.pro_bonus_until && new Date(p.pro_bonus_until)>new Date())return true;
  const s=state.subscription;
  return Boolean(s && s.payment_account==="stripe_live_th" && ["active","trialing"].includes(s.status) && (!s.current_period_end || new Date(s.current_period_end)>new Date()));
}
export function proSource(state){
  const p=state.profile||{};
  if(p.pro_lifetime)return "Lifetime";
  if(p.pro_bonus_until && new Date(p.pro_bonus_until)>new Date())return "Bonus";
  if(state.subscription?.payment_account==="stripe_live_th" && ["active","trialing"].includes(state.subscription.status))return "Stripe";
  return "Free";
}
