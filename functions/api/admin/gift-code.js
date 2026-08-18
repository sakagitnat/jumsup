import { assertSameOrigin,assertJson,errorStatus,noStore } from "../../_lib/security.js";
import { requireAdmin } from "../../_lib/supabase.js";
import { json,body,cors } from "../../_lib/http.js";
export const onRequestOptions=()=>new Response(null,{headers:cors});
export async function onRequestPost({request,env}){
 try{
  assertSameOrigin(request,env);assertJson(request);
  const {user,sb}=await requireAdmin(request,env);const b=await body(request);
  const code=String(b.code||"").trim().toUpperCase();const days=Math.max(1,Number(b.days)||30);
  if(!code)throw new Error("Code is required");
  const {error}=await sb.from("gift_codes").insert({code,pro_days:days,max_uses:Math.max(1,Number(b.max_uses)||1),created_by:user.id});
  if(error)throw error;return json({ok:true,code,days},200,cors);
 }catch(e){return json({error:e.message},e.message==="FORBIDDEN"?403:400,cors)}
}
