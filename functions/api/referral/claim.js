import { assertSameOrigin,assertJson,errorStatus,noStore } from "../../_lib/security.js";
import { requireUser } from "../../_lib/supabase.js";
import { json,body,cors } from "../../_lib/http.js";
export const onRequestOptions=()=>new Response(null,{headers:cors});
export async function onRequestPost({request,env}){
 try{
  assertSameOrigin(request,env);assertJson(request);
  const {sb}=await requireUser(request,env);const {code}=await body(request);
  const {data,error}=await sb.rpc("claim_referral",{p_code:String(code||"").trim()});
  if(error)throw error;return json({result:data},200,cors);
 }catch(e){return json({error:e.message},errorStatus(e.message),noStore(cors))}
}
