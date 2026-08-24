import { assertSameOrigin,assertJson,errorStatus,noStore } from "../../_lib/security.js";
import { requireUser } from "../../_lib/supabase.js";
import { stripeRequest } from "../../_lib/stripe.js";
import { json,body,cors } from "../../_lib/http.js";
export const onRequestOptions=()=>new Response(null,{headers:cors});
export async function onRequestPost({request,env}){
 try{
  assertSameOrigin(request,env);assertJson(request);
  const {user,sb}=await requireUser(request,env);
  const {plan="monthly",currency="thb"}=await body(request);
  if(!["monthly","yearly"].includes(plan))return json({error:"Invalid subscription plan"},400,noStore(cors));
  if(!["thb","usd"].includes(String(currency).toLowerCase()))return json({error:"Unsupported billing currency"},400,noStore(cors));
  const billingCurrency=String(currency).toLowerCase();
  const price=plan==="yearly"?(env.STRIPE_PRICE_PRO_YEARLY_GLOBAL||env.STRIPE_PRICE_PRO_YEARLY):(env.STRIPE_PRICE_PRO_MONTHLY_GLOBAL||env.STRIPE_PRICE_PRO_MONTHLY);
  if(!price)throw new Error("Stripe price is not configured");
  const {data:sub}=await sb.from("subscriptions").select("*").eq("user_id",user.id).maybeSingle();
  if(sub&&["active","trialing"].includes(sub.status))return json({error:"Subscription is already active"},409,noStore(cors));
  let customer=sub?.stripe_customer_id;
  if(!customer){
   const c=await stripeRequest(env,"/customers",{method:"POST",params:{email:user.email,metadata:{user_id:user.id}}});
   customer=c.id;
   await sb.from("subscriptions").upsert({user_id:user.id,stripe_customer_id:customer,status:"incomplete"},{onConflict:"user_id"});
  }
  const session=await stripeRequest(env,"/checkout/sessions",{method:"POST",idempotencyKey:crypto.randomUUID(),params:{
    mode:"subscription",customer,
    currency:billingCurrency,
    line_items:[{price,quantity:1}],
    success_url:`${env.APP_URL}/?payment=success`,
    cancel_url:`${env.APP_URL}/?payment=cancelled`,
    client_reference_id:user.id,
    metadata:{user_id:user.id,plan,billing_currency:billingCurrency,payment_account:"stripe_th"},
    subscription_data:{metadata:{user_id:user.id,plan,billing_currency:billingCurrency,payment_account:"stripe_th"}}
  }});
  return json({url:session.url},200,cors);
 }catch(e){return json({error:e.message},errorStatus(e.message),noStore(cors))}
}
