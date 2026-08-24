import { requireUser,adminClient } from "../../_lib/supabase.js";
import { json,body,cors } from "../../_lib/http.js";
import { assertSameOrigin,assertJson,cleanText,errorStatus,noStore } from "../../_lib/security.js";

export const onRequestOptions=()=>new Response(null,{headers:cors});
const normalizeWord=value=>value.normalize("NFKC").trim().toLocaleLowerCase("en-US");

export async function onRequestPost({request,env}){
 try{
  assertSameOrigin(request,env);assertJson(request);
  const {user}=await requireUser(request,env);const b=await body(request),raw=Array.isArray(b.items)?b.items:[b];
  if(!raw.length||raw.length>1000)throw new Error("INVALID_DICTIONARY_BATCH");
  const unique=new Map();
  for(const item of raw){
   const sourceWord=cleanText(item.word,{min:1,max:80,name:"word"});
   const meaning=cleanText(item.meaning,{min:1,max:300,name:"meaning"});
   const target=/^[a-z]{2,8}(-[A-Z]{2})?$/.test(item.target||"")?item.target:"th";
   const normalizedWord=normalizeWord(sourceWord);
   if(!/^[\p{L}\p{M}'’-]+$/u.test(normalizedWord))continue;
   unique.set(`${normalizedWord}\u0000${target}\u0000${meaning}`,{user_id:user.id,source_word:sourceWord,normalized_word:normalizedWord,target_language:target,suggested_meaning:meaning,status:"pending"});
  }
  const rows=[...unique.values()];
  if(!rows.length)return json({ok:true,status:"pending",accepted:0},200,noStore(cors));
  const {error}=await adminClient(env).from("dictionary_suggestions").upsert(rows,{onConflict:"user_id,normalized_word,target_language,suggested_meaning",ignoreDuplicates:true});
  if(error)throw error;
  return json({ok:true,status:"pending",accepted:rows.length},200,noStore(cors));
 }catch(e){return json({error:e.message},errorStatus(e.message),noStore(cors))}
}
