import * as overview from "../functions/api/admin/overview.js";
import * as dictionary from "../functions/api/admin/dictionary.js";
import * as reports from "../functions/api/admin/reports.js";
import * as gift from "../functions/api/admin/gift-code.js";
import * as gifts from "../functions/api/admin/gift-codes.js";
import * as refunds from "../functions/api/admin/refunds.js";
import * as refundAction from "../functions/api/admin/refund-action.js";
const routes=new Map([["/api/admin/overview",overview],["/api/admin/dictionary",dictionary],["/api/admin/reports",reports],["/api/admin/gift-code",gift],["/api/admin/gift-codes",gifts],["/api/admin/refunds",refunds],["/api/admin/refund-action",refundAction]]);
const json=(value,status=200,extra={})=>new Response(JSON.stringify(value),{status,headers:{"content-type":"application/json; charset=utf-8","X-Content-Type-Options":"nosniff",...extra}});
export default{async fetch(request,env,ctx){
 if(env.SUPABASE_SERVER_KEY)env.SUPABASE_SERVICE_ROLE_KEY=env.SUPABASE_SERVER_KEY;
 const url=new URL(request.url);
 if(url.pathname==="/api/config"){
  if(!env.SUPABASE_URL||!env.SUPABASE_ANON_KEY)return json({error:"ADMIN_NOT_CONFIGURED"},503,{"cache-control":"no-store"});
  return json({supabase_url:env.SUPABASE_URL,supabase_anon_key:env.SUPABASE_ANON_KEY},200,{"cache-control":"public, max-age=300"});
 }
 const route=routes.get(url.pathname);
 if(!route){const response=await env.ASSETS.fetch(request),headers=new Headers(response.headers);headers.set("X-Robots-Tag","noindex, nofollow");headers.set("X-Frame-Options","DENY");headers.set("Referrer-Policy","no-referrer");headers.set("Permissions-Policy","camera=(), microphone=(), geolocation=()");headers.set("Content-Security-Policy","default-src 'self'; connect-src 'self' https://vhzpmnirzgrzyaaotcep.supabase.co; img-src 'self' data:; style-src 'self'; script-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");return new Response(response.body,{status:response.status,headers})}
 const name=`onRequest${request.method[0]}${request.method.slice(1).toLowerCase()}`,handler=route[name];
 if(!handler)return json({error:"METHOD_NOT_ALLOWED"},405,{allow:"GET, POST, OPTIONS"});
 return handler({request,env,ctx,params:{},data:{}})
}};
