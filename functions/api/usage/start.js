import { requireUser } from "../../_lib/supabase.js";
import { json,body,cors } from "../../_lib/http.js";
import { assertSameOrigin,assertJson,cleanText,errorStatus,noStore } from "../../_lib/security.js";
export const onRequestOptions=()=>new Response(null,{headers:cors});
export async function onRequestPost({request,env}){
 try{
  assertSameOrigin(request,env);assertJson(request);const {sb}=await requireUser(request,env);const b=await body(request);
  const feature=cleanText(b.feature,{min:1,max:20,name:"feature"}),sessionKey=cleanText(b.session_key,{min:8,max:160,name:"session_key"});
  const {data,error}=await sb.rpc("start_usage_session",{p_feature:feature,p_session_key:sessionKey,p_state:b.state||{}});if(error)throw error;
  if(data?.allowed===false)return json({error:"DAILY_LIMIT_REACHED",...data},429,noStore(cors));
  return json(data,200,noStore(cors));
 }catch(e){return json({error:e.message},errorStatus(e.message),noStore(cors))}
}
