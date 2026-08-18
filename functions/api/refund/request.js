import { requireUser } from "../../_lib/supabase.js";
import { json,body,cors } from "../../_lib/http.js";
import { assertSameOrigin,assertJson,cleanText,errorStatus,noStore } from "../../_lib/security.js";

export const onRequestOptions=()=>new Response(null,{headers:cors});
export async function onRequestPost({request,env}){
 try{
  assertSameOrigin(request,env);assertJson(request);
  const {sb}=await requireUser(request,env);const b=await body(request);
  const reason=cleanText(b.reason,{min:5,max:1000,name:"reason"});

  let paymentEventId=b.payment_event_id||null;
  if(!paymentEventId){
    const {data,error}=await sb.from("payment_events")
      .select("id,kind,amount,currency,status,created_at")
      .eq("status","succeeded")
      .order("created_at",{ascending:false}).limit(1).maybeSingle();
    if(error)throw error;
    if(!data)throw new Error("NO_REFUNDABLE_PAYMENT");
    paymentEventId=data.id;
  }

  const {data,error}=await sb.rpc("request_refund",{
    p_payment_event_id:paymentEventId,
    p_reason:reason,
    p_cancel_subscription:b.cancel_subscription!==false
  });
  if(error)throw error;
  return json({ok:true,refund_request_id:data},200,noStore(cors));
 }catch(e){return json({error:e.message},errorStatus(e.message),noStore(cors))}
}
