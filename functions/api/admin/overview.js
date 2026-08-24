import { requireAdmin,adminClient } from "../../_lib/supabase.js";
import { json,cors } from "../../_lib/http.js";
import { assertSameOrigin,errorStatus,noStore } from "../../_lib/security.js";
export const onRequestOptions=()=>new Response(null,{headers:cors});
const count=async(q)=>{const {count,error}=await q;if(error)throw error;return count||0};
export async function onRequestGet({request,env}){
 try{
  assertSameOrigin(request,env);await requireAdmin(request,env);const sb=adminClient(env),month=new Date().toISOString().slice(0,7)+"-01",today=new Date().toISOString().slice(0,10);
  const [users,paid,pendingDictionary,pendingReports,pendingRefunds,codes,provider,usage,payments]=await Promise.all([
   count(sb.from("profiles").select("user_id",{count:"exact",head:true})),
   count(sb.from("subscriptions").select("user_id",{count:"exact",head:true}).eq("payment_account","stripe_live_th").in("status",["active","trialing"])),
   count(sb.from("dictionary_suggestions").select("id",{count:"exact",head:true}).eq("status","pending")),
   count(sb.from("content_reports").select("id",{count:"exact",head:true}).eq("status","pending")),
   count(sb.from("refund_requests").select("id",{count:"exact",head:true}).in("status",["pending","approved","processing"])),
   sb.from("gift_codes").select("pro_days,max_uses,used_count,expires_at").eq("active",true),
   sb.from("translation_provider_usage").select("reserved_characters").eq("usage_month",month).maybeSingle(),
   sb.from("translation_usage").select("usage_count").eq("usage_date",today).limit(5000),
   sb.from("payment_events").select("amount,currency").eq("status","succeeded").gte("created_at",month).limit(5000)
  ]);
  if(codes.error)throw codes.error;if(provider.error)throw provider.error;if(usage.error)throw usage.error;if(payments.error)throw payments.error;
  const revenue={};for(const p of payments.data||[])if(p.amount!=null)revenue[p.currency]=(revenue[p.currency]||0)+p.amount;
  const active=(codes.data||[]).filter(x=>!x.expires_at||new Date(x.expires_at)>new Date()),giftLiability=active.reduce((n,x)=>n+Math.max(0,(x.max_uses||0)-(x.used_count||0))*(x.pro_days||0),0);
  return json({users,paid,free_users:Math.max(0,users-paid),pending_dictionary:pendingDictionary,pending_reports:pendingReports,pending_refunds:pendingRefunds,active_codes:active.length,gift_liability_days:giftLiability,translations_today:(usage.data||[]).reduce((n,x)=>n+(x.usage_count||0),0),google_configured:Boolean(env.GOOGLE_TRANSLATE_API_KEY),google_characters:provider.data?.reserved_characters||0,google_cap:400000,revenue},200,noStore(cors));
 }catch(e){return json({error:e.message},errorStatus(e.message),noStore(cors))}
}
