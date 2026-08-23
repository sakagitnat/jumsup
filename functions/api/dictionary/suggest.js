import { requireUser } from "../../_lib/supabase.js";
import { json,body,cors } from "../../_lib/http.js";
import { assertSameOrigin,assertJson,cleanText,errorStatus,noStore } from "../../_lib/security.js";

export const onRequestOptions=()=>new Response(null,{headers:cors});
const normalizeWord=value=>value.normalize("NFKC").trim().toLocaleLowerCase("en-US");

export async function onRequestPost({request,env}){
 try{
  assertSameOrigin(request,env);assertJson(request);
  const {user,sb}=await requireUser(request,env);const b=await body(request);
  const sourceWord=cleanText(b.word,{min:1,max:80,name:"word"});
  const meaning=cleanText(b.meaning,{min:1,max:300,name:"meaning"});
  const target=/^[a-z]{2,8}(-[A-Z]{2})?$/.test(b.target||"")?b.target:"th";
  const normalizedWord=normalizeWord(sourceWord);
  if(!/^[\p{L}\p{M}'’-]+$/u.test(normalizedWord))throw new Error("INVALID_DICTIONARY_WORD");
  const {error}=await sb.from("dictionary_suggestions").upsert({
   user_id:user.id,source_word:sourceWord,normalized_word:normalizedWord,
   target_language:target,suggested_meaning:meaning,status:"pending"
  },{onConflict:"user_id,normalized_word,target_language,suggested_meaning",ignoreDuplicates:true});
  if(error)throw error;
  return json({ok:true,status:"pending"},200,noStore(cors));
 }catch(e){return json({error:e.message},errorStatus(e.message),noStore(cors))}
}
