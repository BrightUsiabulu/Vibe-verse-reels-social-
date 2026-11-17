(()=>{
'use strict';
const el=id=>document.getElementById(id), message=t=>{el('notice').textContent=t};
let sb=null;
async function session(){
  if(!sb)return null;
  const r=await sb.auth.getSession();return r.data.session?.access_token||null;
}
async function authed(path,options={}){
  const token=await session();
  if(!token)throw Error('Sign in to continue.');
  const r=await fetch(path,{...options,cache:'no-store',headers:{...options.headers,Authorization:'Bearer '+token}});
  const body=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(body.error||'Request failed');
  return body;
}
async function load(){
  el('money').textContent='—';el('impressions').textContent='—';el('clicks').textContent='—';el('updated').textContent='—';
  message('Requesting real AdSense report...');
  try{
    const d=await authed('/api/earnings?period='+encodeURIComponent(el('period').value));
    el('money').textContent=d.currency?new Intl.NumberFormat(undefined,{style:'currency',currency:d.currency}).format(d.estimatedEarnings):String(d.estimatedEarnings);
    el('impressions').textContent=Number(d.impressions).toLocaleString();
    el('clicks').textContent=Number(d.clicks).toLocaleString();
    el('updated').textContent=new Date(d.retrievedAt).toLocaleString();
    message('Real Google AdSense report received. Values are estimates, not payments.');
  }catch(e){message(e.message)}
}
async function update(){
  const token=await session();el('login').hidden=!!token;el('reports').hidden=!token;
  message(token?'Signed in. Admin permissions are checked by the server.':'Sign in with your existing VibeVerse administrator account.');
}
async function setup(){
  try{
    const r=await fetch('/api/public',{cache:'no-store'});if(!r.ok)throw Error('The backend is not configured yet. An authorized project administrator must complete the Vercel environment settings.');
    const cfg=await r.json();
    if(!window.supabase?.createClient)throw Error('The authentication library could not load.');
    sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
    await update();
    sb.auth.onAuthStateChange(()=>{void update()});
  }catch(e){message(e.message)}
}
el('loginForm').addEventListener('submit',async e=>{
  e.preventDefault();if(!sb)return;
  const data=new FormData(e.target);message('Signing in...');
  const r=await sb.auth.signInWithPassword({email:String(data.get('email')),password:String(data.get('password'))});
  if(r.error)message('Sign-in failed. Check your credentials and account verification.');else await update();
});
el('connect').addEventListener('click',async()=>{
  message('Requesting secure Google authorization...');
  try{const d=await authed('/api/oauth/start',{method:'POST'});if(!d.authorizationUrl.startsWith('https://accounts.google.com/'))throw Error('Unexpected authorization address');location.assign(d.authorizationUrl)}
  catch(e){message(e.message)}
});
el('refresh').addEventListener('click',load);
el('signout').addEventListener('click',async()=>{if(sb)await sb.auth.signOut();await update()});
void setup();
})();