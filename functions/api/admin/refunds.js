import { requireAdmin,adminClient } from "../../_lib/supabase.js";
import { json,cors } from "../../_lib/http.js";
import { assertSameOrigin,errorStatus,noStore } from "../../_lib/security.js";
export const onRequestOptions=()=>new Response(null,{headers:cors});
export async function onRequestGet({request,env}){
 try{
  assertSameOrigin(request,env);await requireAdmin(request,env);const sb=adminClient(env);
  const {data,error}=await sb.from("refund_requests")
   .select("id,user_id,reason,status,requested_amount,cancel_subscription,requested_at,profiles!refund_requests_user_id_fkey(username),payment_events(id,amount,currency,kind,stripe_payment_intent_id,stripe_invoice_id,created_at)")
   .in("status",["pending","approved","processing"]).order("requested_at",{ascending:true}).limit(100);
  if(error)throw error;

  const list=data||[];
  const userIds=[...new Set(list.map(r=>r.user_id))];
  const prior={};
  if(userIds.length){
   const {data:hist}=await sb.from("refund_requests").select("user_id,status").in("user_id",userIds);
   for(const h of hist||[]){
    const p=prior[h.user_id]||(prior[h.user_id]={granted:0,rejected:0});
    if(["refunded","processing","approved"].includes(h.status))p.granted++;
    else if(h.status==="rejected")p.rejected++;
   }
  }
  const refunds=list.map(r=>({
   ...r,
   prior_granted:prior[r.user_id]?.granted||0,
   prior_rejected:prior[r.user_id]?.rejected||0,
  }));
  return json({refunds},200,noStore(cors));
 }catch(e){return json({error:e.message},errorStatus(e.message),noStore(cors))}
}
