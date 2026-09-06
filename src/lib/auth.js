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
  const {data}=supabase.auth.onAuthStateChange((event,session)=>callback(session,event));
  return()=>data.subscription.unsubscribe();
}
/** Force a session check (refreshes the access token from the stored refresh
 *  token if it's expired). Call this when the tab regains visibility -- on
 *  mobile Safari, autoRefreshToken's timer is paused while the tab/PWA is
 *  backgrounded, so a long time away can leave the access token expired with
 *  nothing having tried to renew it until something else fails first. */
export async function refreshSessionIfNeeded(){
  if(!supabase)return null;
  const {data,error}=await supabase.auth.getSession();
  if(error){console.error(error);return null}
  return data.session;
}
export { backendEnabled };
