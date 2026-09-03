import { supabase,backendEnabled } from "./supabase.js";

export async function getSession(){
  if(!supabase)return null;
  const {data,error}=await supabase.auth.getSession();
  if(error)throw error;
  return data.session;
}
export async function signInGoogle(){
  if(!supabase)throw new Error("Supabase is not configured");
  const {error}=await supabase.auth.signInWithOAuth({
    provider:"google",
    options:{
      redirectTo:window.location.origin,
      // always show Google's account picker instead of silently reusing the
      // one session already signed in on the device
      queryParams:{prompt:"select_account"}
    }
  });
  if(error)throw error;
}
export async function signOut(){
  if(!supabase)return;
  const {error}=await supabase.auth.signOut();
  if(error)throw error;
}
export function onAuthChange(callback){
  if(!supabase)return()=>{};
  const {data}=supabase.auth.onAuthStateChange((_event,session)=>callback(session));
  return()=>data.subscription.unsubscribe();
}
export { backendEnabled };
