import { requireAdmin } from "../../_lib/supabase.js";
import { json,cors } from "../../_lib/http.js";
import { assertSameOrigin,errorStatus,noStore } from "../../_lib/security.js";
export async function onRequestGet({request,env}){
 try{
  assertSameOrigin(request,env);const {sb}=await requireAdmin(request,env);
  const {data,error}=await sb.from("refund_requests")
   .select("id,user_id,reason,status,requested_amount,cancel_subscription,requested_at,profiles!refund_requests_user_id_fkey(username),payment_events(id,amount,currency,kind,stripe_payment_intent_id,stripe_invoice_id,created_at)")
   .in("status",["pending","approved","processing"]).order("requested_at",{ascending:true}).limit(100);
  if(error)throw error;
  return json({refunds:data||[]},200,noStore(cors));
 }catch(e){return json({error:e.message},errorStatus(e.message),noStore(cors))}
}
