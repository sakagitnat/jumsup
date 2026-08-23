import { requireUser } from "../_lib/supabase.js";
import { json,body,cors } from "../_lib/http.js";
export const onRequestOptions=()=>new Response(null,{headers:cors});
export async function onRequestPost({request,env}){
 try{
  const {text,target="th"}=await body(request);
  if(!text)throw new Error("Text is required");
  if(!env.GOOGLE_TRANSLATE_API_KEY)return json({translation:null,provider:"not-configured"},200,cors);
  const characterCount=[...String(text)].length;
  if(characterCount>5000)throw new Error("Text is too long");
  const {sb}=await requireUser(request,env);
  const {data:providerQuota,error:providerQuotaError}=await sb.rpc("reserve_google_translation_characters",{p_characters:characterCount});
  if(providerQuotaError)throw providerQuotaError;
  if(providerQuota?.allowed===false)return json({error:"Online translation monthly limit reached",provider_quota:providerQuota},503,cors);
  const {data:quota,error:qe}=await sb.rpc("consume_translation_quota");
  if(qe){await sb.rpc("release_google_translation_characters",{p_characters:characterCount});throw qe}
  if(quota&&quota.allowed===false){
   await sb.rpc("release_google_translation_characters",{p_characters:characterCount});
   return json({error:"Daily translation quota reached",quota},402,cors);
  }
  const r=await fetch(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(env.GOOGLE_TRANSLATE_API_KEY)}`,{
   method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({q:text,target,format:"text"})
  });
  const d=await r.json();
  if(!r.ok){await sb.rpc("release_google_translation_characters",{p_characters:characterCount});throw new Error(d?.error?.message||"Translation failed")}
  return json({translation:d.data?.translations?.[0]?.translatedText||null,quota,provider:"google",provider_quota:providerQuota},200,cors);
 }catch(e){return json({error:e.message},e.message==="UNAUTHORIZED"?401:e.message.includes("monthly limit")?503:400,cors)}
}
