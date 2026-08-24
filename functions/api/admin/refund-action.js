import { requireAdmin,adminClient } from "../../_lib/supabase.js";
import { stripeRequest } from "../../_lib/stripe.js";
import { json,body,cors } from "../../_lib/http.js";
import { assertSameOrigin,assertJson,cleanText,errorStatus,noStore } from "../../_lib/security.js";

export const onRequestOptions=()=>new Response(null,{headers:cors});

async function cancelSubscription(env,sb,userId){
 const {data}=await sb.from("subscriptions").select("stripe_subscription_id,status").eq("user_id",userId).maybeSingle();
 if(!data?.stripe_subscription_id||data.status==="canceled")return;
 try{
   await stripeRequest(env,`/subscriptions/${data.stripe_subscription_id}`,{method:"DELETE"});
 }catch(e){
   console.error("Subscription cancel failed",e);
   throw new Error("REFUND_CREATED_BUT_SUBSCRIPTION_CANCEL_FAILED");
 }
}

export async function onRequestPost({request,env}){
 try{
  assertSameOrigin(request,env);assertJson(request);
  const {user:admin}=await requireAdmin(request,env),sb=adminClient(env);const b=await body(request);
  const action=cleanText(b.action,{min:1,max:20,name:"action"});
  const id=String(b.refund_request_id||"");
  if(!/^[0-9a-f-]{36}$/i.test(id))throw new Error("INVALID_REFUND_REQUEST_ID");

  const {data:r,error}=await sb.from("refund_requests")
    .select("*,payment_events(*)").eq("id",id).single();
  if(error||!r)throw new Error("REFUND_REQUEST_NOT_FOUND");
  if(!["pending","approved"].includes(r.status))throw new Error("REFUND_REQUEST_NOT_PENDING");

  if(action==="reject"){
    const note=cleanText(b.admin_note||"Rejected",{min:1,max:1000,name:"admin_note"});
    const {error:ue}=await sb.from("refund_requests").update({
      status:"rejected",admin_note:note,reviewed_at:new Date().toISOString(),reviewed_by:admin.id
    }).eq("id",id);
    if(ue)throw ue;
    await sb.from("audit_log").insert({actor_user_id:admin.id,action:"reject_refund",object_type:"refund_request",object_id:id,metadata:{note}});
    return json({ok:true,status:"rejected"},200,noStore(cors));
  }

  if(action!=="approve")throw new Error("INVALID_ACTION");
  const pe=r.payment_events;
  if(!pe?.stripe_payment_intent_id)throw new Error("PAYMENT_INTENT_NOT_AVAILABLE");

  const requested=b.amount==null?null:Math.max(1,Number(b.amount)||0);
  if(requested && pe.amount && requested>pe.amount)throw new Error("REFUND_AMOUNT_TOO_HIGH");

  const {error:mark}=await sb.from("refund_requests").update({
    status:"processing",requested_amount:requested||pe.amount||null,reviewed_at:new Date().toISOString(),reviewed_by:admin.id,
    admin_note:b.admin_note?String(b.admin_note).slice(0,1000):null
  }).eq("id",id);
  if(mark)throw mark;

  const refund=await stripeRequest(env,"/refunds",{method:"POST",idempotencyKey:`refund-${id}`,params:{
    payment_intent:pe.stripe_payment_intent_id,
    ...(requested?{amount:requested}:{}),
    reason:"requested_by_customer",
    metadata:{refund_request_id:id,user_id:r.user_id}
  }});

  const fullRefund=!requested || !pe.amount || requested>=pe.amount;
  if(fullRefund && r.cancel_subscription)await cancelSubscription(env,sb,r.user_id);

  const {error:done}=await sb.from("refund_requests").update({
    status:refund.status==="failed"?"failed":"approved",
    stripe_refund_id:refund.id
  }).eq("id",id);
  if(done)throw done;

  await sb.from("audit_log").insert({
    actor_user_id:admin.id,action:"approve_refund",object_type:"refund_request",object_id:id,
    metadata:{stripe_refund_id:refund.id,amount:requested||pe.amount||null,full_refund:fullRefund,cancel_subscription:r.cancel_subscription}
  });

  return json({ok:true,status:refund.status,stripe_refund_id:refund.id},200,noStore(cors));
 }catch(e){return json({error:e.message},errorStatus(e.message),noStore(cors))}
}
