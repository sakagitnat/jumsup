import { createClient } from "@supabase/supabase-js";
export function adminClient(env){
 return createClient(env.SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
}
export async function requireUser(request,env){
 const auth=request.headers.get("authorization")||"";
 const jwt=auth.startsWith("Bearer ")?auth.slice(7):null;
 if(!jwt)throw new Error("UNAUTHORIZED");
 const sb=adminClient(env);
 const {data,error}=await sb.auth.getUser(jwt);
 if(error||!data.user)throw new Error("UNAUTHORIZED");
 return {user:data.user,sb,jwt};
}
export async function requireAdmin(request,env){
 const ctx=await requireUser(request,env);
 const {data,error}=await ctx.sb.from("profiles").select("role").eq("user_id",ctx.user.id).single();
 if(error||data?.role!=="admin")throw new Error("FORBIDDEN");
 return ctx;
}
