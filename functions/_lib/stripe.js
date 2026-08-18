const base="https://api.stripe.com/v1";
function encode(params,prefix=""){
 const out=new URLSearchParams();
 const walk=(value,key)=>{
   if(value===undefined||value===null)return;
   if(Array.isArray(value))return value.forEach((v,i)=>walk(v,`${key}[${i}]`));
   if(typeof value==="object")return Object.entries(value).forEach(([k,v])=>walk(v,key?`${key}[${k}]`:k));
   out.append(key,String(value));
 };
 Object.entries(params).forEach(([k,v])=>walk(v,k));
 return out;
}
export async function stripeRequest(env,path,{method="GET",params,idempotencyKey}={}){
 const headers={authorization:`Bearer ${env.STRIPE_SECRET_KEY}`};
 const init={method,headers};
 let url=base+path;
 if(method==="GET"&&params){url+="?"+encode(params).toString()}
 else if(params){headers["content-type"]="application/x-www-form-urlencoded";init.body=encode(params)}
 if(idempotencyKey)headers["idempotency-key"]=idempotencyKey;
 const res=await fetch(url,init);
 const data=await res.json();
 if(!res.ok)throw new Error(data?.error?.message||"Stripe request failed");
 return data;
}
function hex(buffer){return [...new Uint8Array(buffer)].map(b=>b.toString(16).padStart(2,"0")).join("")}
function safeEqual(a,b){
 if(a.length!==b.length)return false;let r=0;
 for(let i=0;i<a.length;i++)r|=a.charCodeAt(i)^b.charCodeAt(i);
 return r===0;
}
export async function verifyWebhook(raw,signature,secret,tolerance=300){
 if(!signature||!secret)return false;
 const parts=signature.split(",").map(x=>x.split("="));
 const timestamp=parts.find(x=>x[0]==="t")?.[1];
 const sigs=parts.filter(x=>x[0]==="v1").map(x=>x[1]);
 if(!timestamp||!sigs.length)return false;
 if(Math.abs(Date.now()/1000-Number(timestamp))>tolerance)return false;
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const digest=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(`${timestamp}.${raw}`));
 const expected=hex(digest);
 return sigs.some(s=>safeEqual(s,expected));
}
