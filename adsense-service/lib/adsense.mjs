import { randomBytes, createCipheriv, createDecipheriv, timingSafeEqual } from 'node:crypto';
export const SCOPE='https://www.googleapis.com/auth/adsense.readonly';
const headers={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};
export const reply=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{...headers,...extra}});
export const error=(code,message)=>reply({error:message},code);
const env=name=>{if(!process.env[name])throw Error('Missing required server setting: '+name);return process.env[name]};
export function configured(){return ['GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET','GOOGLE_REDIRECT_URI','SUPABASE_URL','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','ADSENSE_ADMIN_UID','ADSENSE_ENCRYPTION_KEY'].every(k=>Boolean(process.env[k]))}
export async function admin(request){
  const bearer=/^Bearer (\S+)$/i.exec(request.headers.get('authorization')||'');
  if(!bearer)return false;
  const r=await fetch(new URL('/auth/v1/user',env('SUPABASE_URL')),{headers:{apikey:env('SUPABASE_ANON_KEY'),authorization:'Bearer '+bearer[1]},cache:'no-store',signal:AbortSignal.timeout(8000)});
  if(!r.ok)return false;
  const user=await r.json();
  if(!user?.id||user.id!==env('ADSENSE_ADMIN_UID'))return false;
  if(process.env.REQUIRE_AAL2==='true'){
    try{const payload=JSON.parse(Buffer.from(bearer[1].split('.')[1],'base64url').toString('utf8'));if(payload.aal!=='aal2')return false}catch{return false}
  }
  return true;
}
export function oauthCookie(state,seconds=600){return 'vv_adsense_state='+encodeURIComponent(state)+'; Path=/api/oauth/callback; HttpOnly; Secure; SameSite=Lax; Max-Age='+seconds}
export function generateState(){return randomBytes(32).toString('base64url')}
export function validState(request,received){
  const m=/(?:^|;\s*)vv_adsense_state=([^;]+)/.exec(request.headers.get('cookie')||'');
  if(!m||!received)return false;
  const a=Buffer.from(decodeURIComponent(m[1])),b=Buffer.from(received);
  return a.length===b.length&&timingSafeEqual(a,b);
}
export function authUrl(state){
  const u=new URL('https://accounts.google.com/o/oauth2/v2/auth');
  for(const [k,v] of Object.entries({client_id:env('GOOGLE_CLIENT_ID'),redirect_uri:env('GOOGLE_REDIRECT_URI'),response_type:'code',scope:SCOPE,access_type:'offline',prompt:'consent',state}))u.searchParams.set(k,v);
  return u.toString();
}
export async function tokenRequest(values){
  const body=new URLSearchParams({client_id:env('GOOGLE_CLIENT_ID'),client_secret:env('GOOGLE_CLIENT_SECRET'),...values});
  const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body,cache:'no-store',signal:AbortSignal.timeout(12000)});
  if(!r.ok)throw Error('Google OAuth failed ('+r.status+')');return r.json();
}
const key=()=>{const b=Buffer.from(env('ADSENSE_ENCRYPTION_KEY'),'base64');if(b.length!==32)throw Error('Expected 32-byte encryption key');return b};
export function encrypt(value){
  const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',key(),iv);
  const ct=Buffer.concat([c.update(value,'utf8'),c.final()]);
  return ['v1',iv.toString('base64url'),c.getAuthTag().toString('base64url'),ct.toString('base64url')].join('.');
}
export function decrypt(value){
  const [v,iv,tag,ct]=String(value).split('.');
  if(v!=='v1'||!iv||!tag||!ct)throw Error('Invalid encrypted credential');
  const c=createDecipheriv('aes-256-gcm',key(),Buffer.from(iv,'base64url'));c.setAuthTag(Buffer.from(tag,'base64url'));
  return Buffer.concat([c.update(Buffer.from(ct,'base64url')),c.final()]).toString('utf8');
}
async function storage(path,options={}){
  const secret=env('SUPABASE_SERVICE_ROLE_KEY');
  const r=await fetch(new URL('/rest/v1/'+path,env('SUPABASE_URL')),{...options,headers:{apikey:secret,authorization:'Bearer '+secret,...options.headers},cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(!r.ok)throw Error('Private storage failed ('+r.status+')');
  // PostgREST may return 201 Created with an empty body for Prefer: return=minimal.
  // A successful write must not be reported as a failed OAuth callback.
  const body=await r.text();
  return body.trim()?JSON.parse(body):null;
}
export async function saveRefreshToken(token){
  return storage('adsense_connections?on_conflict=id',{method:'POST',headers:{'content-type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({id:1,owner_uid:env('ADSENSE_ADMIN_UID'),encrypted_refresh_token:encrypt(token),updated_at:new Date().toISOString()})});
}
export async function readRefreshToken(){
  const rows=await storage('adsense_connections?id=eq.1&select=encrypted_refresh_token,owner_uid');
  return Array.isArray(rows)&&rows[0]?.owner_uid===env('ADSENSE_ADMIN_UID')?decrypt(rows[0].encrypted_refresh_token):null;
}
export async function googleGet(uri,accessToken){
  const r=await fetch(uri,{headers:{authorization:'Bearer '+accessToken},cache:'no-store',signal:AbortSignal.timeout(12000)});
  if(!r.ok)throw Error('Google API unavailable ('+r.status+')');return r.json();
}
export function html(message,status=200,cookie=null){
  const h={'content-type':'text/html; charset=utf-8','cache-control':'no-store','content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",'x-content-type-options':'nosniff'};
  if(cookie)h['set-cookie']=cookie;
  return new Response('<!doctype html><html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>VibeVerse AdSense</title><body style="font:16px system-ui;background:#10101a;color:#f9f9fa;padding:2rem"><h1>VibeVerse AdSense</h1><p>'+message+'</p></body></html>',{status,headers:h});
}