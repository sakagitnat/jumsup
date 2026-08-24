import { requireAdmin,adminClient } from "../../_lib/supabase.js";
import { json,body,cors } from "../../_lib/http.js";
import { assertSameOrigin,assertJson,cleanText,errorStatus,noStore } from "../../_lib/security.js";
export const onRequestOptions=()=>new Response(null,{headers:cors});
export async function onRequestGet({request,env}){try{assertSameOrigin(request,env);await requireAdmin(request,env);const sb=adminClient(env);const {data,error}=await sb.from("dictionary_suggestions").select("id,source_word,target_language,suggested_meaning,status,created_at").eq("status","pending").order("created_at").limit(100);if(error)throw error;return json({items:data||[]},200,noStore(cors))}catch(e){return json({error:e.message},errorStatus(e.message),noStore(cors))}}
export async function onRequestPost({request,env}){
 try{assertSameOrigin(request,env);assertJson(request);const {user}=await requireAdmin(request,env),sb=adminClient(env),b=await body(request),id=Number(b.id);if(!Number.isSafeInteger(id)||id<1)throw new Error("INVALID_ID");if(!["approve","reject"].includes(b.action))throw new Error("INVALID_ACTION");
  const {data:item,error}=await sb.from("dictionary_suggestions").select("*").eq("id",id).eq("status","pending").single();if(error||!item)throw new Error("SUGGESTION_NOT_FOUND");
  if(b.action==="approve"){const meaning=cleanText(b.meaning||item.suggested_meaning,{min:1,max:300,name:"meaning"});const {error:ie}=await sb.from("dictionary_entries").upsert({source_word:item.source_word,normalized_word:item.normalized_word,target_language:item.target_language,meaning,source:"community-reviewed",status:"approved",reviewed_at:new Date().toISOString()},{onConflict:"normalized_word,target_language,meaning"});if(ie)throw ie}
  const status=b.action==="approve"?"approved":"rejected";const {error:ue}=await sb.from("dictionary_suggestions").update({status,reviewed_at:new Date().toISOString()}).eq("id",id);if(ue)throw ue;await sb.from("audit_log").insert({actor_user_id:user.id,action:`dictionary_${status}`,object_type:"dictionary_suggestion",object_id:String(id),metadata:{source_word:item.source_word,target_language:item.target_language}});return json({ok:true,status},200,noStore(cors));
 }catch(e){return json({error:e.message},errorStatus(e.message),noStore(cors))}
}
