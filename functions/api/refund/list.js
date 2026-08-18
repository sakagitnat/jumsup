import { requireUser } from "../../_lib/supabase.js";
import { json,cors } from "../../_lib/http.js";
import { assertSameOrigin,errorStatus,noStore } from "../../_lib/security.js";
export async function onRequestGet({request,env}){
 try{
  assertSameOrigin(request,env);const {user,sb}=await requireUser(request,env);
  const {data,error}=await sb.from("refund_requests")
    .select("id,reason,status,requested_amount,cancel_subscription,admin_note,stripe_refund_id,requested_at,reviewed_at,completed_at,payment_events(amount,currency,kind,created_at)")
    .eq("user_id",user.id).order("requested_at",{ascending:false});
  if(error)throw error;
  return json({refunds:data||[]},200,noStore(cors));
 }catch(e){return json({error:e.message},errorStatus(e.message),noStore(cors))}
}
