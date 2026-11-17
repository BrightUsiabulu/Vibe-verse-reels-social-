(()=>{'use strict';
const $=s=>document.querySelector(s),DB='https://qngkwjhhykugjfkwoyam.supabase.co',KEY='sb_publishable__rfc1XG15o-nZ44zT2odpg_pvtQMxaM',STORAGE='sb-qngkwjhhykugjfkwoyam-auth-token';
const sb=window.supabase?.createClient(DB,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:STORAGE}});
let epoch=0,loading=false,again=false,owner=null;
const money=x=>typeof x==='number'&&Number.isFinite(x)?new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN'}).format(x/100):'—';
const text=(id,value)=>$(id).textContent=String(value??'');
function notice(t,bad=false){const n=$('#status');n.hidden=!t;n.className='notice'+(bad?' error':'');n.textContent=t||''}
function hide(){owner=null;$('#account').hidden=true;for(const id of ['#available','#gross','#settled'])text(id,'—');for(const id of ['#history','#details','#provider'])$(id).replaceChildren();$('#avatar').replaceChildren();text('#name','Creator');text('#handle','')}
function fallback(title,detail,href,label){hide();$('#fallback').hidden=false;text('#fallbackTitle',title);text('#fallbackText',detail);$('#fallbackLink').href=href;text('#fallbackLink',label);notice('',false)}
function row(label,value){const d=document.createElement('div');d.className='line';const a=document.createElement('span'),b=document.createElement('strong');a.textContent=label;b.textContent=value;d.append(a,b);return d}
const unwrap=async p=>{const r=await p;if(r.error)throw r.error;return r.data};
function active(n,uid){return epoch===n&&owner===uid}
async function history(uid,n){
 const [ledger,settlements,payouts,adjustments]=await Promise.all([
 unwrap(sb.from('vv_payment_ledger').select('id,entry_type,amount_kobo,created_at').eq('merchant_id',uid).order('created_at',{ascending:false}).limit(20)),
 unwrap(sb.from('vv_payment_settlements').select('id,amount_kobo,settled_at').eq('merchant_id',uid).order('settled_at',{ascending:false}).limit(20)),
 unwrap(sb.from('vv_payout_requests').select('id,status,amount_kobo,created_at').eq('merchant_id',uid).order('created_at',{ascending:false}).limit(20)),
 unwrap(sb.from('vv_money_adjustments').select('id,type,amount_kobo,created_at').eq('merchant_id',uid).order('created_at',{ascending:false}).limit(20))]);
 if(!active(n,uid))return;
 const items=[...(ledger||[]).map(x=>({label:'Ledger · '+x.entry_type,amount:x.amount_kobo,date:x.created_at})),...(settlements||[]).map(x=>({label:'Provider settlement',amount:x.amount_kobo,date:x.settled_at})),...(payouts||[]).map(x=>({label:'Payout · '+x.status,amount:x.amount_kobo,date:x.created_at})),...(adjustments||[]).map(x=>({label:'Adjustment · '+x.type,amount:x.amount_kobo,date:x.created_at}))].sort((a,b)=>Date.parse(b.date)-Date.parse(a.date)).slice(0,30);
 const root=$('#history');root.replaceChildren();if(!items.length){const d=document.createElement('div');d.className='empty';d.innerHTML='<strong>No transactions yet</strong>Verified financial activity will appear here when it exists.';root.append(d);return}
 for(const x of items){const d=document.createElement('div');d.className='transaction';const a=document.createElement('div'),b=document.createElement('strong'),s=document.createElement('small');a.textContent=x.label.replaceAll('_',' ');s.textContent=x.date?new Date(x.date).toLocaleString('en-NG'):'';a.append(s);b.textContent=money(x.amount);d.append(a,b);root.append(d)}
}
async function provider(n,uid){try{const r=await fetch('/api/finance-status',{cache:'no-store'});if(!r.ok)throw Error();const x=await r.json();if(!active(n,uid))return;$('#provider').replaceChildren(row('Paystack connection',x.providerApiKeyConfigured?'Configured · not verified':'Not configured'),row('Live checkout',x.checkoutStatus==='disabled'?'Disabled':'Requires verification'),row('Withdrawals','Disabled'),row('Bank payout','Not available'))}catch{if(active(n,uid))text('#provider','Provider status unavailable. Payments remain unavailable.')}} 
async function load(){
 if(loading){again=true;return}loading=true;const n=++epoch;hide();$('#fallback').hidden=true;notice('Checking your existing VibeVerse session…');
 try{
 if(!sb)throw Error('Account SDK unavailable');
 const {data:s,error:se}=await sb.auth.getSession();if(n!==epoch)return;if(se)throw se;
 if(!s.session){fallback('Sign in to your wallet','Use your existing VibeVerse account. If you just registered, verify your email and sign in first. You do not need to create another account.','/account.html','Sign in');return}
 const {data:u,error:ue}=await sb.auth.getUser();if(n!==epoch)return;if(ue||!u.user){fallback('Verify your session','Your session could not be verified. Sign in again using your existing account.','/account.html','Open account');return}
 const uid=u.user.id;owner=uid;const a=await unwrap(sb.auth.mfa.getAuthenticatorAssuranceLevel());if(!active(n,uid))return;
 if(a.nextLevel==='aal2'&&a.currentLevel!=='aal2'){fallback('Two-factor verification required','Complete your authenticator verification to view your private financial records.','/security.html?verify=1','Verify account');return}
 const [p,w]=await Promise.all([unwrap(sb.from('profiles').select('id,display_name,username,avatar_url').eq('id',uid).maybeSingle()),unwrap(sb.rpc('vv_my_wallet'))]);if(!active(n,uid))return;
 if(!w){fallback('Wallet access needs verification','Your account is signed in, but the wallet authorization check did not succeed. Verify your security session and retry.','/security.html','Account security');return}
 text('#name',p?.display_name||'VibeVerse creator');text('#handle',p?.username?'@'+p.username:'Your VibeVerse account');const avatar=$('#avatar');const prefix=DB+'/storage/v1/object/public/avatars/'+uid+'/';if(typeof p?.avatar_url==='string'&&p.avatar_url.startsWith(prefix)&&/^[a-z0-9-]+\.jpg$/.test(p.avatar_url.slice(prefix.length))){const im=document.createElement('img');im.src=p.avatar_url;im.alt='Profile picture';avatar.append(im)}else avatar.textContent=(p?.display_name||'V').slice(0,1).toUpperCase();
 text('#available',money(w.withdrawable_kobo));text('#gross',money(w.verified_gross_kobo));text('#settled',money(w.provider_settled_kobo));
 $('#details').replaceChildren(row('Remaining reconciled funds',money(w.remaining_reconciled_kobo)),row('Recorded deductions',money(w.deductions_kobo)),row('Reserved payout requests',money(w.reserved_payouts_kobo)),row('Completed payouts',money(w.completed_payouts_kobo)),row('Merchant status',String(w.merchant_status||'Not approved').replaceAll('_',' ')));
 $('#account').hidden=false;notice('');text('#history','Loading verified transaction history…');
 await Promise.all([provider(n,uid),history(uid,n).catch(()=>{if(active(n,uid))text('#history','Transaction history could not load. Select Refresh to try again.')})]);
 }catch(e){if(n===epoch){fallback('Wallet temporarily unavailable','Your wallet could not load. Check your internet connection, then try again. If the problem continues, open Account Center.','/account.html','Account Center');notice('No balance has been changed. Retry to load your real records.',true)}}
 finally{loading=false;if(again){again=false;load()}}
}
function changed(){epoch++;hide();$('#fallback').hidden=true;notice('Checking your account…');if(loading)again=true;else load()}
$('#refresh').onclick=load;$('#retry').onclick=load;$('#historyRefresh').onclick=load;
if(sb)sb.auth.onAuthStateChange((event)=>{if(['SIGNED_OUT','SIGNED_IN','MFA_CHALLENGE_VERIFIED','USER_UPDATED'].includes(event))setTimeout(changed,0)});
window.addEventListener('storage',e=>{if(e.key===STORAGE)changed()});document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')load()});load();
})();