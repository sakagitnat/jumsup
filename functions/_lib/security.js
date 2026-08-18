export function assertSameOrigin(request,env){
  const origin=request.headers.get("origin");
  if(!origin)return;
  const allowed=[env.APP_URL,...String(env.ALLOWED_ORIGINS||"").split(",")].filter(Boolean);
  if(allowed.length&&!allowed.includes(origin))throw new Error("INVALID_ORIGIN");
}
export function assertJson(request){
  if(!(request.headers.get("content-type")||"").toLowerCase().includes("application/json"))throw new Error("INVALID_CONTENT_TYPE");
}
export function cleanText(value,{min=0,max=2000,name="text"}={}){
  const s=String(value??"").normalize("NFKC").trim().replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,"");
  if(s.length<min)throw new Error(`${name.toUpperCase()}_TOO_SHORT`);
  if(s.length>max)throw new Error(`${name.toUpperCase()}_TOO_LONG`);
  return s;
}
export function cleanId(v){const s=String(v||"");if(!/^[A-Za-z0-9._:-]{1,160}$/.test(s))throw new Error("INVALID_ID");return s}
export function cleanVisibility(v){if(v!=="private"&&v!=="public")throw new Error("INVALID_VISIBILITY");return v}
export function errorStatus(m){
  if(m==="UNAUTHORIZED")return 401;if(m==="FORBIDDEN"||m==="INVALID_ORIGIN")return 403;
  if(m==="PAYMENT_REQUIRED")return 402;if(m==="DAILY_LIMIT_REACHED")return 429;
  if(m==="PRIVATE_QUOTA_REACHED")return 409;return 400
}
export function noStore(headers={}){return {"cache-control":"no-store","x-content-type-options":"nosniff",...headers}}
