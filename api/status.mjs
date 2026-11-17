import {json,paymentsEnabled} from '../lib/vv-backend.mjs';
export async function GET(){
const ready=!!(process.env.SUPABASE_URL&&process.env.SUPABASE_ANON_KEY);
let db=ready?'client-configured':'not-connected',metrics=false;
if(ready)try{const r=await fetch(process.env.SUPABASE_URL.replace(/\/$/,'')+'/rest/v1/vv_video_metrics?select=video_id&limit=1',{headers:{apikey:process.env.SUPABASE_ANON_KEY},cache:'no-store',signal:AbortSignal.timeout(5500)});metrics=r.ok;db=metrics?'connected':'migration-required'}catch{db='unreachable'}
const paid=metrics&&paymentsEnabled();
return json({service:'vibeverse',version:'9.1',database:db,publicClientConfigured:ready,viewMetricsReady:metrics,payments:paid?'configured-not-tested':'disabled',paymentMode:paid?'live':'disabled',verifiedEarnings:paid?'payment-records-only':'not-connected',note:'Only signed-in, deduplicated account viewing events can add video counts. These are not necessarily unique human viewers.'});
}