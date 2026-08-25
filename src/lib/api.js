import { supabase } from "./supabase.js";

async function token(){
  if(!supabase)return null;
  const {data}=await supabase.auth.getSession();
  return data.session?.access_token||null;
}
export async function api(path,options={}){
  const access=await token();
  const headers=new Headers(options.headers||{});
  if(options.body && !headers.has("content-type"))headers.set("content-type","application/json");
  if(access)headers.set("authorization",`Bearer ${access}`);
  const res=await fetch(path,{...options,headers});
  const text=await res.text();
  let data=null;
  try{data=text?JSON.parse(text):null}catch{data={message:text}}
  if(!res.ok){const error=new Error(data?.error||data?.message||`HTTP ${res.status}`);error.details=data;error.status=res.status;throw error}
  return data;
}

