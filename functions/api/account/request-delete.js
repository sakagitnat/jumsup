import { requireUser } from "../../_lib/supabase.js";
import { json,cors } from "../../_lib/http.js";
import { assertSameOrigin,errorStatus,noStore } from "../../_lib/security.js";
export async function onRequestPost({request,env}){
 try{
  assertSameOrigin(request,env);const {user,sb}=await requireUser(request,env);const execute=new Date(Date.now()+7*86400000).toISOString();
  const {error}=await sb.from("account_deletion_requests").upsert({user_id:user.id,requested_at:new Date().toISOString(),execute_after:execute,canceled_at:null},{onConflict:"user_id"});if(error)throw error;
  await sb.from("audit_log").insert({actor_user_id:user.id,action:"request_account_deletion",metadata:{execute_after:execute}});
  return json({ok:true,execute_after:execute},200,noStore(cors));
 }catch(e){return json({error:e.message},errorStatus(e.message),noStore(cors))}
}
