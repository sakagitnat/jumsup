import { requireUser } from "../../_lib/supabase.js";
import { json,body,cors } from "../../_lib/http.js";
import { assertSameOrigin,assertJson,cleanText,errorStatus,noStore } from "../../_lib/security.js";
export const onRequestOptions=()=>new Response(null,{headers:cors});
export async function onRequestPost({request,env}){
 try{
  assertSameOrigin(request,env);assertJson(request);const {sb}=await requireUser(request,env);const b=await body(request);
  const k=cleanText(b.session_key,{min:8,max:160,name:"session_key"});if(JSON.stringify(b.state||{}).length>100000)throw new Error("STATE_TOO_LARGE");
  const {error}=await sb.rpc("save_usage_session",{p_session_key:k,p_state:b.state||{},p_complete:!!b.complete});if(error)throw error;
  return json({ok:true},200,noStore(cors));
 }catch(e){return json({error:e.message},errorStatus(e.message),noStore(cors))}
}
