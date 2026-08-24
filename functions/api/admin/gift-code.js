import { assertSameOrigin,assertJson,errorStatus,noStore } from "../../_lib/security.js";
import { requireAdmin,adminClient } from "../../_lib/supabase.js";
import { json,body,cors } from "../../_lib/http.js";
export const onRequestOptions=()=>new Response(null,{headers:cors});
export async function onRequestPost({request,env}){
 try{
  assertSameOrigin(request,env);assertJson(request);
  const {user}=await requireAdmin(request,env),sb=adminClient(env),b=await body(request);
  const code=String(b.code||"").trim().toUpperCase(),days=Number(b.days),maxUses=Number(b.max_uses),expiryDays=Number(b.expiry_days);
  if(!/^[A-Z0-9_-]{4,32}$/.test(code))throw new Error("INVALID_CODE");
  if(!Number.isInteger(days)||days<1||days>90)throw new Error("DAYS_MUST_BE_1_TO_90");
  if(!Number.isInteger(maxUses)||maxUses<1||maxUses>100)throw new Error("MAX_USES_MUST_BE_1_TO_100");
  if(!Number.isInteger(expiryDays)||expiryDays<1||expiryDays>90)throw new Error("EXPIRY_MUST_BE_1_TO_90_DAYS");
  const {data:active,error:ae}=await sb.from("gift_codes").select("pro_days,max_uses,used_count").eq("active",true);if(ae)throw ae;
  const liability=(active||[]).reduce((n,x)=>n+Math.max(0,x.max_uses-x.used_count)*x.pro_days,0);
  if((active||[]).length>=50)throw new Error("ACTIVE_CODE_LIMIT_REACHED");
  if(liability+days*maxUses>5000)throw new Error("GIFT_LIABILITY_LIMIT_REACHED");
  const expiresAt=new Date(Date.now()+expiryDays*86400000).toISOString();
  const {data,error}=await sb.from("gift_codes").insert({code,pro_days:days,max_uses:maxUses,expires_at:expiresAt,created_by:user.id}).select("id").single();
  if(error)throw error;await sb.from("audit_log").insert({actor_user_id:user.id,action:"gift_code_created",object_type:"gift_code",object_id:data.id,metadata:{code,days,max_uses:maxUses,expires_at:expiresAt,liability_days:days*maxUses}});return json({ok:true,code,days,max_uses:maxUses,expires_at:expiresAt},200,noStore(cors));
 }catch(e){return json({error:e.message},e.message==="FORBIDDEN"?403:400,cors)}
}
