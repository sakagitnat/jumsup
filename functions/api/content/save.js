import { requireUser } from "../../_lib/supabase.js";
import { json,body,cors } from "../../_lib/http.js";
import { assertSameOrigin,assertJson,cleanText,cleanId,cleanVisibility,errorStatus,noStore } from "../../_lib/security.js";
export const onRequestOptions=()=>new Response(null,{headers:cors});
export async function onRequestPost({request,env}){
 try{
  assertSameOrigin(request,env);assertJson(request);
  const {user,sb}=await requireUser(request,env);const b=await body(request);
  const kind=cleanText(b.kind,{min:1,max:20,name:"kind"}),visibility=cleanVisibility(b.visibility);
  if(!["vocab","reading","listening","writing","mock"].includes(kind))throw new Error("INVALID_KIND");
  const id=cleanId(b.id||`${kind}-${crypto.randomUUID()}`),title=cleanText(b.title,{min:1,max:160,name:"title"});
  if(visibility==="private"){
    const {data,error}=await sb.rpc("can_make_private",{p_user:user.id,p_kind:kind,p_exclude_id:id});
    if(error)throw error;if(!data)throw new Error("PRIVATE_QUOTA_REACHED");
  }
  if(kind==="vocab"){
    const {error}=await sb.from("vocab_sets").upsert({id,user_id:user.id,name:title,visibility,updated_at:new Date().toISOString()},{onConflict:"id"});if(error)throw error;
  }else{
    const payload=b.payload&&typeof b.payload==="object"?b.payload:{};if(JSON.stringify(payload).length>200000)throw new Error("PAYLOAD_TOO_LARGE");
    const {error}=await sb.from("practice_sets").upsert({id,user_id:user.id,kind,title,visibility,payload,updated_at:new Date().toISOString()},{onConflict:"id"});if(error)throw error;
  }
  return json({ok:true,id,visibility},200,noStore(cors));
 }catch(e){return json({error:e.message},errorStatus(e.message),noStore(cors))}
}
