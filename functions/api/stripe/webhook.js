import { adminClient } from "../../_lib/supabase.js";
import { stripeRequest,verifyWebhook } from "../../_lib/stripe.js";
import { json } from "../../_lib/http.js";
function iso(s){return s?new Date(s*1000).toISOString():null}
function plan(env,p){return [env.STRIPE_PRICE_PRO_YEARLY_GLOBAL,env.STRIPE_PRICE_PRO_YEARLY].includes(p)?"pro_yearly":[env.STRIPE_PRICE_PRO_MONTHLY_GLOBAL,env.STRIPE_PRICE_PRO_MONTHLY].includes(p)?"pro_monthly":"pro"}
async function sha(s){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function begin(sb,e,raw){
 const {data,error}=await sb.rpc("claim_stripe_event",{p_event_id:e.id,p_event_type:e.type,p_payload_hash:await sha(raw)});
 if(error)throw error;return !!data
}
async function complete(sb,e){const {error}=await sb.rpc("complete_stripe_event",{p_event_id:e.id});if(error)throw error}
async function fail(sb,e,err){try{await sb.rpc("fail_stripe_event",{p_event_id:e.id,p_error:String(err?.message||err)})}catch(x){console.error("Failed to mark webhook failed",x)}}
async function userByCustomer(sb,c){if(!c)return null;const {data}=await sb.from("subscriptions").select("user_id").eq("stripe_customer_id",c).maybeSingle();return data?.user_id||null}
async function syncSub(env,sb,o,hint){
 const c=typeof o.customer==="string"?o.customer:o.customer?.id;let uid=o.metadata?.user_id||hint||await userByCustomer(sb,c);if(!uid)return null;
 const item=o.items?.data?.[0];await sb.from("subscriptions").upsert({user_id:uid,stripe_customer_id:c||null,stripe_subscription_id:o.id,status:o.status,price_id:item?.price?.id||null,plan:plan(env,item?.price?.id),current_period_end:iso(o.current_period_end),cancel_at_period_end:!!o.cancel_at_period_end,payment_provider:"stripe",payment_account:o.metadata?.payment_account||"stripe_live_th",billing_currency:(o.currency||o.metadata?.billing_currency||item?.price?.currency||"").toLowerCase()||null,updated_at:new Date().toISOString()},{onConflict:"user_id"});return uid
}
async function payment(sb,e,uid,o,kind,status){
 await sb.from("payment_events").upsert({user_id:uid||null,stripe_event_id:e.id,stripe_payment_intent_id:typeof o.payment_intent==="string"?o.payment_intent:null,stripe_invoice_id:typeof o.invoice==="string"?o.invoice:null,kind,amount:o.amount_total??o.amount_paid??o.amount??null,currency:(o.currency||"").toLowerCase()||null,status,payment_provider:"stripe",payment_account:o.metadata?.payment_account||"stripe_live_th"},{onConflict:"stripe_event_id"})
}

async function findUserByPaymentIntent(sb,paymentIntent){
 if(!paymentIntent)return null;
 const {data}=await sb.from("payment_events").select("user_id").eq("stripe_payment_intent_id",paymentIntent).not("user_id","is",null).order("created_at",{ascending:true}).limit(1).maybeSingle();
 return data?.user_id||null;
}
async function handleRefundEvent(sb,e){
 const o=e.data.object;
 const paymentIntent=typeof o.payment_intent==="string"?o.payment_intent:null;
 const uid=await findUserByPaymentIntent(sb,paymentIntent);
 const requestId=o.metadata?.refund_request_id||null;

 if(requestId){
   const status=e.type==="refund.failed"?"failed":(o.status==="succeeded"?"refunded":"processing");
   await sb.from("refund_requests").update({
     status,
     stripe_refund_id:o.id,
     completed_at:status==="refunded"?new Date().toISOString():null,
     admin_note:e.type==="refund.failed"?(o.failure_reason||"Refund failed"):undefined
   }).eq("id",requestId);
 }

 if(e.type==="refund.updated"||e.type==="refund.created"){
   if(o.status==="succeeded"&&uid){
     const {data:pe}=await sb.from("payment_events").select("amount").eq("stripe_payment_intent_id",paymentIntent).not("amount","is",null).order("created_at",{ascending:true}).limit(1).maybeSingle();
     const full=pe?.amount!=null && o.amount>=pe.amount;
     if(full){
       const {error}=await sb.rpc("revoke_referral_reward_for_payment",{p_invitee:uid,p_reason:"qualifying_payment_refunded"});
       if(error)console.error("Referral revoke failed",error);
     }
   }
 }
}

async function handleChargeRefunded(sb,e){
 const o=e.data.object;
 const paymentIntent=typeof o.payment_intent==="string"?o.payment_intent:null;
 const uid=await findUserByPaymentIntent(sb,paymentIntent);
 if(uid&&o.amount!=null&&o.amount_refunded!=null&&o.amount_refunded>=o.amount){
   const {error}=await sb.rpc("revoke_referral_reward_for_payment",{p_invitee:uid,p_reason:"qualifying_payment_fully_refunded"});
   if(error)console.error("Referral revoke failed",error);
 }
}

export async function onRequestPost({request,env}){
 const raw=await request.text();if(!(await verifyWebhook(raw,request.headers.get("stripe-signature"),env.STRIPE_WEBHOOK_SECRET)))return json({error:"Invalid signature"},400);
 const e=JSON.parse(raw),sb=adminClient(env);
 try{
  if(!(await begin(sb,e,raw)))return json({received:true,duplicate:true});
  if(["refund.created","refund.updated","refund.failed"].includes(e.type))await handleRefundEvent(sb,e);
  if(["customer.subscription.created","customer.subscription.updated","customer.subscription.deleted"].includes(e.type))await syncSub(env,sb,e.data.object);

  if(e.type==="checkout.session.completed"){
   const s=e.data.object;let uid=s.client_reference_id||s.metadata?.user_id||null;
   if(s.mode==="subscription"&&s.subscription){const sub=await stripeRequest(env,`/subscriptions/${s.subscription}`,{method:"GET"});uid=await syncSub(env,sb,sub,uid)}
   await payment(sb,e,uid,s,"checkout_completed","succeeded");
  }

  if(e.type==="invoice.paid"){
   const inv=e.data.object,c=typeof inv.customer==="string"?inv.customer:inv.customer?.id,uid=await userByCustomer(sb,c);
   await payment(sb,e,uid,inv,"invoice_paid","succeeded");
   if(uid){const {error}=await sb.rpc("reward_referral_after_first_payment",{p_invitee:uid,p_stripe_event_id:e.id});if(error)throw error}
  }

  if(e.type==="payment_intent.succeeded"){
   const pi=e.data.object,c=typeof pi.customer==="string"?pi.customer:pi.customer?.id,uid=(c?await userByCustomer(sb,c):null)||pi.metadata?.user_id||null;
   await payment(sb,e,uid,pi,"payment_intent","succeeded");
   if(uid&&pi.metadata?.qualifies_referral==="true"){const {error}=await sb.rpc("reward_referral_after_first_payment",{p_invitee:uid,p_stripe_event_id:e.id});if(error)throw error}
  }

  if(["charge.refunded","charge.dispute.created","charge.dispute.funds_withdrawn"].includes(e.type)){
   const o=e.data.object,c=typeof o.customer==="string"?o.customer:o.customer?.id,uid=await userByCustomer(sb,c);
   await payment(sb,e,uid,o,e.type,e.type==="charge.refunded"?"refunded":"disputed");
   if(e.type==="charge.refunded")await handleChargeRefunded(sb,e);
   await sb.from("audit_log").insert({actor_user_id:uid||null,action:"payment_reversal",object_type:"stripe_event",object_id:e.id,metadata:{type:e.type}});
  }
  await complete(sb,e);
  return json({received:true});
 }catch(err){console.error(err);await fail(sb,e,err);return json({error:err.message},500)}
}
