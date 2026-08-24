import { requireUser } from "../_lib/supabase.js";
import { json,body,cors } from "../_lib/http.js";
import { assertSameOrigin,assertJson,errorStatus,noStore } from "../_lib/security.js";
export const onRequestOptions=()=>new Response(null,{headers:cors});
const normalizeWord=value=>value.normalize("NFKC").trim().toLocaleLowerCase("en-US");
function candidates(word){
 const out=[word];
 if(word.endsWith("ies")&&word.length>4)out.push(`${word.slice(0,-3)}y`);
 if(word.endsWith("es")&&word.length>3)out.push(word.slice(0,-2));
 if(word.endsWith("s")&&word.length>2)out.push(word.slice(0,-1));
 if(word.endsWith("ied")&&word.length>4)out.push(`${word.slice(0,-3)}y`);
 if(word.endsWith("ed")&&word.length>3)out.push(word.slice(0,-2),word.slice(0,-1));
 if(word.endsWith("ing")&&word.length>5)out.push(word.slice(0,-3),`${word.slice(0,-3)}e`);
 return [...new Set(out)];
}
export async function onRequestPost({request,env}){
 try{
  assertSameOrigin(request,env);assertJson(request);
  const {sb}=await requireUser(request,env);const {text,target="th",local_translation:localTranslation}=await body(request);
  if(!text)throw new Error("Text is required");
  if([...String(text)].length>500)throw new Error("TEXT_TOO_LONG");
  if(!/^[a-z]{2}(?:-[A-Z]{2})?$/.test(String(target)))throw new Error("INVALID_TARGET_LANGUAGE");
  const normalized=normalizeWord(String(text));
  let result=null;
  if(typeof localTranslation==="string"&&localTranslation.trim()&&localTranslation.length<=300){
   result={translation:localTranslation.trim(),provider:"user-flashcard"};
  }
  if(!result&&normalized.length<=80&&/^[\p{L}\p{M}'’-]+$/u.test(normalized)){
   const variants=candidates(normalized);
   const {data:entries,error:dictionaryError}=await sb.from("dictionary_entries")
    .select("source_word,normalized_word,meaning,part_of_speech,source")
    .in("normalized_word",variants).eq("target_language",target).eq("status","approved").limit(5);
   if(dictionaryError&&!/dictionary_entries/.test(dictionaryError.message||""))throw dictionaryError;
   if(entries?.length){
    const entry=variants.map(v=>entries.find(x=>x.normalized_word===v)).find(Boolean);
    result={translation:entry.meaning,provider:"offline-dictionary",entry};
   }
  }
  if(!result&&!env.GOOGLE_TRANSLATE_API_KEY)return json({translation:null,provider:"not-configured",quota_consumed:false},200,cors);
  const {data:quota,error:qe}=await sb.rpc("consume_translation_quota");
  if(qe)throw qe;
  if(quota && quota.allowed===false)return json({error:"Daily translation quota reached",quota},402,cors);
  if(result)return json({...result,quota,quota_consumed:true},200,cors);
  const characterCount=[...String(text)].length;
  const {data:providerQuota,error:providerQuotaError}=await sb.rpc("reserve_google_translation_characters",{p_characters:characterCount});
  if(providerQuotaError)throw providerQuotaError;
  if(providerQuota?.allowed===false)return json({error:"Online translation monthly limit reached",quota,provider_quota:providerQuota},503,cors);
  const r=await fetch(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(env.GOOGLE_TRANSLATE_API_KEY)}`,{
   method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({q:text,target,format:"text"})
  });
  const d=await r.json();
  if(!r.ok){await sb.rpc("release_google_translation_characters",{p_characters:characterCount});throw new Error(d?.error?.message||"Translation failed")}
  return json({translation:d.data?.translations?.[0]?.translatedText||null,quota,provider:"google",quota_consumed:true,provider_quota:providerQuota},200,cors);
 }catch(e){return json({error:e.message},errorStatus(e.message),noStore(cors))}
}
