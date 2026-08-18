import { requireUser } from "../../_lib/supabase.js";
import { json,cors } from "../../_lib/http.js";
import { assertSameOrigin,errorStatus,noStore } from "../../_lib/security.js";
export async function onRequestGet({request,env}){
 try{
  assertSameOrigin(request,env);const {user,sb}=await requireUser(request,env);const {data,error}=await sb.rpc("export_my_data");if(error)throw error;
  await sb.from("audit_log").insert({actor_user_id:user.id,action:"export_account_data"});
  return json(data,200,{...noStore(cors),"content-disposition":"attachment; filename=jumsup-data.json"});
 }catch(e){return json({error:e.message},errorStatus(e.message),noStore(cors))}
}
