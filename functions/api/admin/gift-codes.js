import { requireAdmin,adminClient } from "../../_lib/supabase.js";
import { json,body,cors } from "../../_lib/http.js";
import { assertSameOrigin,assertJson,errorStatus,noStore } from "../../_lib/security.js";
export const onRequestOptions=()=>new Response(null,{headers:cors});
export async function onRequestGet({request,env}){try{assertSameOrigin(request,env);await requireAdmin(request,env);const sb=adminClient(env);const {data,error}=await sb.from("gift_codes").select("id,code,pro_days,max_uses,used_count,expires_at,active,created_at").order("created_at",{ascending:false}).limit(100);if(error)throw error;return json({items:data||[]},200,noStore(cors))}catch(e){return json({error:e.message},errorStatus(e.message),noStore(cors))}}
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function randomCode(prefix) {
  let s = "";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  for (const byte of bytes) s += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  return `${prefix}${s}`;
}

export async function onRequestPost({request,env}){try{assertSameOrigin(request,env);assertJson(request);const {user}=await requireAdmin(request,env),sb=adminClient(env),b=await body(request);

  if(b.action==="bulk_create"){
    const prefix=String(b.prefix||"").trim().toUpperCase();
    const count=Number(b.count),days=Number(b.days),expiryDays=Number(b.expiry_days);
    if(!/^[A-Z0-9_-]{2,16}$/.test(prefix))throw new Error("INVALID_PREFIX");
    if(!Number.isInteger(count)||count<1||count>200)throw new Error("COUNT_MUST_BE_1_TO_200");
    if(!Number.isInteger(days)||days<1||days>90)throw new Error("DAYS_MUST_BE_1_TO_90");
    if(!Number.isInteger(expiryDays)||expiryDays<1||expiryDays>180)throw new Error("EXPIRY_MUST_BE_1_TO_180_DAYS");
    const {data:active,error:ae}=await sb.from("gift_codes").select("pro_days,max_uses,used_count").eq("active",true);if(ae)throw ae;
    const liability=(active||[]).reduce((n,x)=>n+Math.max(0,x.max_uses-x.used_count)*x.pro_days,0);
    if(liability+days*count>5000)throw new Error("GIFT_LIABILITY_LIMIT_REACHED");
    const expiresAt=new Date(Date.now()+expiryDays*86400000).toISOString();
    const rows=Array.from({length:count},()=>({code:randomCode(prefix),pro_days:days,max_uses:1,expires_at:expiresAt,created_by:user.id}));
    const {data,error}=await sb.from("gift_codes").insert(rows).select("code");
    if(error)throw error;
    await sb.from("audit_log").insert({actor_user_id:user.id,action:"gift_codes_bulk_created",object_type:"gift_code",object_id:prefix,metadata:{count,days,expires_at:expiresAt}});
    return json({ok:true,codes:(data||[]).map(x=>x.code)},200,noStore(cors));
  }

  if(b.action!=="revoke")throw new Error("INVALID_ACTION");if(!/^[0-9a-f-]{36}$/i.test(String(b.id||"")))throw new Error("INVALID_ID");const {data,error}=await sb.from("gift_codes").update({active:false}).eq("id",b.id).eq("active",true).select("code").single();if(error)throw error;await sb.from("audit_log").insert({actor_user_id:user.id,action:"gift_code_revoked",object_type:"gift_code",object_id:b.id,metadata:{code:data.code}});return json({ok:true},200,noStore(cors))}catch(e){return json({error:e.message},errorStatus(e.message),noStore(cors))}}
