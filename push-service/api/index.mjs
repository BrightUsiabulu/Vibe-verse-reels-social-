import {createHash,timingSafeEqual} from "node:crypto";
import webpush from "web-push";
const PUBLIC_ORIGIN="https://vibeverse-bright-studio.vercel.app";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const cors={"Access-Control-Allow-Origin":PUBLIC_ORIGIN,"Access-Control-Allow-Methods":"GET, OPTIONS","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
const output=(data,status=200,extra={})=>Response.json(data,{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff",...extra}});
const secretValid=(given,expected)=>{
 if(!given||!expected||given.length>500)return false;
 const a=createHash("sha256").update(given).digest(),b=createHash("sha256").update(expected).digest();
 return timingSafeEqual(a,b);
};
const hostAllowed=value=>{
 try{
  const url=new URL(value);
  if(url.protocol!=="https:"||url.port&&url.port!=="443"||url.username||url.password)return false;
  const hostname=url.hostname.toLowerCase();
  return hostname==="fcm.googleapis.com"||hostname==="updates.push.services.mozilla.com"||hostname==="web.push.apple.com"||hostname.endsWith(".notify.windows.com")||hostname.endsWith(".push.apple.com");
 }catch{return false}
};
async function supa(path,{method="GET",body=null,prefer=null}={}){
 const base=process.env.SUPABASE_URL,service=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!base||!service)throw new Error("Server environment incomplete");
 const headers={apikey:service,Authorization:"Bearer "+service,"Content-Type":"application/json"};
 if(prefer)headers.Prefer=prefer;
 const res=await fetch(base.replace(/\/$/,"")+"/rest/v1/"+path,{method,headers,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(12000)});
 const txt=await res.text();
 let data=null;try{data=txt?JSON.parse(txt):null}catch{}
 return {ok:res.ok,status:res.status,data};
}
export async function OPTIONS(request){
 if(request.headers.get("origin")!==PUBLIC_ORIGIN)return new Response(null,{status:403});
 return new Response(null,{status:204,headers:cors})
}
export async function GET(request){
 const action=new URL(request.url).searchParams.get("action");
 if(action==="key"){
  const key=process.env.VAPID_PUBLIC_KEY||"";
  if(!/^[A-Za-z0-9_-]{85,90}$/.test(key))return output({ready:false},503,cors);
  return output({ready:true,publicKey:key,registration:true},200,cors);
 }
 if(action==="status"){
  const configured=Boolean(process.env.VAPID_PUBLIC_KEY&&process.env.VAPID_PRIVATE_KEY&&process.env.SUPABASE_SERVICE_ROLE_KEY&&process.env.PUSH_INTERNAL_SECRET);
  return output({service:"vibeverse-web-push",configured,registration:configured,automaticDelivery:configured},configured?200:503,cors);
 }
 return output({error:"Not found"},404);
}
export async function POST(request){
 if(new URL(request.url).searchParams.get("action")!=="deliver")return output({error:"Not found"},404);
 if(!secretValid(request.headers.get("x-vv-push-secret"),process.env.PUSH_INTERNAL_SECRET))return output({error:"Forbidden"},403);
 if(!process.env.VAPID_PUBLIC_KEY||!process.env.VAPID_PRIVATE_KEY)return output({error:"Not configured"},503);
 let input=null;try{if(Number(request.headers.get("content-length")||0)>4096)return output({error:"Too large"},413);input=await request.json()}catch{return output({error:"Invalid request"},400)}
 const notificationId=String(input?.id||"");
 if(!UUID.test(notificationId))return output({error:"Invalid notification ID"},400);
 try{
  const nr=await supa("vv_notifications?id=eq."+encodeURIComponent(notificationId)+"&select=id,recipient_id,event_type,created_at");
  if(!nr.ok)throw new Error("Notification lookup failure");
  const n=nr.data?.[0];if(!n)return output({ok:true,sent:0,reason:"not_found"});
  if(!["follow","like","comment"].includes(n.event_type))return output({ok:true,sent:0,reason:"unsupported_type"});
  const pref=await supa("vv_notification_preferences?user_id=eq."+encodeURIComponent(n.recipient_id)+"&select=follows,likes,comments,browser_alerts");
  if(!pref.ok)throw new Error("Preferences lookup failure");
  const p=pref.data?.[0],field={follow:"follows",like:"likes",comment:"comments"}[n.event_type];
  if(!p||!p.browser_alerts||!p[field])return output({ok:true,sent:0,reason:"opted_out"});
  const subs=await supa("vv_push_subscriptions?user_id=eq."+encodeURIComponent(n.recipient_id)+"&select=id,endpoint,p256dh,auth_secret&limit=15");
  if(!subs.ok)throw new Error("Subscription lookup failure");
  webpush.setVapidDetails(PUBLIC_ORIGIN,process.env.VAPID_PUBLIC_KEY,process.env.VAPID_PRIVATE_KEY);
  let sent=0,skipped=0,failed=0;
  for(const sub of subs.data||[]){
   if(!hostAllowed(sub.endpoint)){skipped++;continue}
   const claim=await supa("vv_push_delivery_attempts",{method:"POST",prefer:"return=representation",body:{notification_id:n.id,subscription_id:sub.id}});
   if(!claim.ok){skipped++;continue}
   try{
    await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth_secret}},JSON.stringify({id:n.id,type:n.event_type}),{TTL:1800,urgency:"normal"});
    sent++;
    await supa("vv_push_delivery_attempts?notification_id=eq."+encodeURIComponent(n.id)+"&subscription_id=eq."+encodeURIComponent(sub.id),{method:"PATCH",body:{status:"delivered",processed_at:new Date().toISOString()}});
   }catch(e){
    failed++;const expired=[404,410].includes(Number(e?.statusCode));
    await supa("vv_push_delivery_attempts?notification_id=eq."+encodeURIComponent(n.id)+"&subscription_id=eq."+encodeURIComponent(sub.id),{method:"PATCH",body:{status:"failed",processed_at:new Date().toISOString()}});
    if(expired)await supa("vv_push_subscriptions?id=eq."+encodeURIComponent(sub.id)+"&user_id=eq."+encodeURIComponent(n.recipient_id),{method:"DELETE"});
   }
  }
  return output({ok:true,sent,skipped,failed});
 }catch{
  return output({ok:false,error:"Push processing unavailable"},503);
 }
}
