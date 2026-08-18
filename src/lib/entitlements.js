export function isPro(state){
  const p=state.profile||{};
  if(p.pro_lifetime)return true;
  if(p.pro_bonus_until && new Date(p.pro_bonus_until)>new Date())return true;
  const s=state.subscription;
  return Boolean(s && ["active","trialing"].includes(s.status) && (!s.current_period_end || new Date(s.current_period_end)>new Date()));
}
export function proSource(state){
  const p=state.profile||{};
  if(p.pro_lifetime)return "Lifetime";
  if(p.pro_bonus_until && new Date(p.pro_bonus_until)>new Date())return "Bonus";
  if(state.subscription && ["active","trialing"].includes(state.subscription.status))return "Stripe";
  return "Free";
}
