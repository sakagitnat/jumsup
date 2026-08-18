import { requireUser } from "../../_lib/supabase.js";
import { json,body,cors } from "../../_lib/http.js";
import { assertSameOrigin,assertJson,cleanText,cleanId,errorStatus,noStore } from "../../_lib/security.js";
export const onRequestOptions=()=>new Response(null,{headers:cors});
export async function onRequestPost({request,env}){
 try{
  assertSameOrigin(request,env);assertJson(request);
  const {user,sb}=await requireUser(request,env);const b=await body(request);
  if(b.confirm_public!==true)throw new Error("PUBLIC_CONFIRMATION_REQUIRED");
  const kind=cleanText(b.kind,{min:1,max:20,name:"kind"}),id=cleanId(b.id||`${kind}-${crypto.randomUUID()}`),title=cleanText(b.title,{min:1,max:160,name:"title"});
  if(kind==="vocab"){
    const {error}=await sb.from("vocab_sets").upsert({id,user_id:user.id,name:title,visibility:"public",updated_at:new Date().toISOString()},{onConflict:"id"});if(error)throw error;
  }else{
    if(!["reading","listening","writing","mock"].includes(kind))throw new Error("INVALID_KIND");
    const payload=b.payload&&typeof b.payload==="object"?b.payload:{};if(JSON.stringify(payload).length>200000)throw new Error("PAYLOAD_TOO_LARGE");
    const {error}=await sb.from("practice_sets").upsert({id,user_id:user.id,kind,title,visibility:"public",payload,updated_at:new Date().toISOString()},{onConflict:"id"});if(error)throw error;
  }
  await sb.from("audit_log").insert({actor_user_id:user.id,action:"publish_content",object_type:kind,object_id:id,metadata:{confirmed:true}});
  return json({ok:true,id,visibility:"public"},200,noStore(cors));
 }catch(e){return json({error:e.message},errorStatus(e.message),noStore(cors))}
}
