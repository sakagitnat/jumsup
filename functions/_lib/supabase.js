import { createClient } from "@supabase/supabase-js";
export function adminClient(env){
 const serverKey=env.SUPABASE_SERVICE_ROLE_KEY||env.SUPABASE_SERVER_KEY;
 if(!env.SUPABASE_URL||!serverKey)throw new Error("SERVER_NOT_CONFIGURED");
 return createClient(env.SUPABASE_URL,serverKey,{auth:{persistSession:false,autoRefreshToken:false}});
}
export async function requireUser(request,env){
 const auth=request.headers.get("authorization")||"";
 const jwt=auth.startsWith("Bearer ")?auth.slice(7):null;
 if(!jwt)throw new Error("UNAUTHORIZED");
 const admin=adminClient(env);
 const {data,error}=await admin.auth.getUser(jwt);
 if(error||!data.user)throw new Error("UNAUTHORIZED");
 const serverKey=env.SUPABASE_SERVICE_ROLE_KEY||env.SUPABASE_SERVER_KEY;
 const sb=createClient(env.SUPABASE_URL,serverKey,{
  auth:{persistSession:false,autoRefreshToken:false},
  global:{headers:{Authorization:`Bearer ${jwt}`}}
 });
 return {user:data.user,sb,jwt};
}
export async function requireAdmin(request,env){
 const ctx=await requireUser(request,env);
 const {data,error}=await ctx.sb.from("profiles").select("role").eq("user_id",ctx.user.id).single();
 if(error||data?.role!=="admin")throw new Error("FORBIDDEN");
 return ctx;
}
