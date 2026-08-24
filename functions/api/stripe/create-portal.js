import { assertSameOrigin,assertJson,errorStatus,noStore } from "../../_lib/security.js";
import { requireUser } from "../../_lib/supabase.js";
import { stripeRequest } from "../../_lib/stripe.js";
import { json,cors } from "../../_lib/http.js";
export const onRequestOptions=()=>new Response(null,{headers:cors});
export async function onRequestPost({request,env}){
 try{
  assertSameOrigin(request,env);assertJson(request);
  const {user,sb}=await requireUser(request,env);
  const {data}=await sb.from("subscriptions").select("stripe_customer_id,payment_account").eq("user_id",user.id).maybeSingle();
  if(!data?.stripe_customer_id||data.payment_account!=="stripe_live_th")throw new Error("No live Stripe customer found");
  const session=await stripeRequest(env,"/billing_portal/sessions",{method:"POST",params:{customer:data.stripe_customer_id,return_url:env.APP_URL}});
  return json({url:session.url},200,cors);
 }catch(e){return json({error:e.message},errorStatus(e.message),noStore(cors))}
}
