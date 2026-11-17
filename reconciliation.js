(()=>{'use strict';
const $=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)],escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const naira=v=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN'}).format((Number(v)||0)/100),date=s=>s?new Date(s).toLocaleDateString('en-NG',{day:'numeric',month:'short',year:'numeric'}):'—';
let cfg=null,jwt=null,user=null,status=null,events=[],refunds=[],payouts=[],tab='events',busy=false;
function config(){try{const c=JSON.parse(localStorage.getItem('vv2_config')||'null');if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(c?.url)||!/^(sb_publishable_|eyJ)/.test(c?.key))return null;const url=c.url.replace(/\/+$/,'');return {url,key:c.key,ref:new URL(url).hostname.split('.')[0]}}catch{return null}}
async function query(path){const r=await fetch(cfg.url+'/rest/v1/'+path,{headers:{apikey:cfg.key,Authorization:'Bearer '+jwt,Accept:'application/json'},cache:'no-store'});if(!r.ok)throw Error('Could not retrieve your protected records');return r.json()}
function accountMessage(s){$('#identityText').textContent=s}
function clear(){events=[];refunds=[];payouts=[];for(const id of ['eventsCount','refundCount','reviewCount','paidCount'])$('#'+id).textContent='—'}
function cards(){if(!user){clear();return}$('#eventsCount').textContent=events.length+(events.length===75?'+':'');$('#refundCount').textContent=refunds.length+(refunds.length===75?'+':'');$('#reviewCount').textContent=refunds.filter(x=>x.reconciliation_status==='needs_review').length;$('#paidCount').textContent=payouts.filter(x=>x.status==='paid').length}
function checks(){
const pairs=[['Supabase database',status?.databaseConfigured],['Protected server access',status?.protectedServerAccess],['Live Paystack verification key',status?.providerApiKeyConfigured],['Signed webhook secret',status?.signedWebhooksConfigured],['Verified provider event processing',status?.verifiedEventCaptureStatus==='configured_not_live_tested'],['Withdrawal requests',status?.withdrawalRequestStatus!=='disabled'&&status?.withdrawalRequestStatus]];
$('#checks').innerHTML=pairs.map(([name,on])=>'<li class="'+(on?'ok':'')+'">'+escape(name)+(on?' · configured':' · not enabled')+'</li>').join('');
const on=status?.verifiedEventCaptureStatus==='configured_not_live_tested',pill=$('#service');pill.textContent=on?'Provider event verification configured; end-to-end test outstanding':'Live payment-provider verification not yet enabled';pill.classList.toggle('ok',on)
}
function render(){
all('[data-tab]').forEach(b=>{b.classList.toggle('selected',b.dataset.tab===tab);b.setAttribute('aria-selected',String(b.dataset.tab===tab))});
const titles={events:'Verified provider events',refunds:'Refund reconciliation',payouts:'Transfer and payout history'};
$('#heading').textContent=titles[tab];
if(!user){$('#records').innerHTML='<div class="empty">Sign in on the main VibeVerse website to see your protected financial event history.</div>';cards();return}
const list=tab==='events'?events:tab==='refunds'?refunds:payouts;
if(!list.length){$('#records').innerHTML='<div class="empty">No confirmed '+(tab==='events'?'provider events':tab==='refunds'?'refund cases':'withdrawals')+' are recorded for this account. No sample transactions have been added.</div>';cards();return}
$('#records').innerHTML=list.map(x=>{
let title,desc,st;
if(tab==='events'){title=x.event_type;desc=x.provider_object_ref+' · '+date(x.received_at);st=x.review_state}
else if(tab==='refunds'){title='Refund '+naira(x.amount_kobo);desc='Provider refund #'+x.provider_refund_id+' · '+date(x.last_verified_at);st=x.reconciliation_status}
else{title='Withdrawal '+naira(x.amount_kobo);desc='Requested '+date(x.created_at);st=x.status}
const warn=['needs_review','processing','pending','queued','submitted','approved'].includes(st);
return '<article class="entry"><div><b>'+escape(title)+'</b><small>'+escape(desc)+'</small></div><span class="tag '+(warn?'warn':'')+'">'+escape(st.replaceAll('_',' '))+'</span></article>'
}).join('');cards()
}
async function refresh(){if(busy)return;busy=true;accountMessage('Verifying your signed-in account…');
try{
const ready=await fetch('/api/finance-status',{cache:'no-store'});status=ready.ok?await ready.json():null;checks();cfg=config();if(!cfg)throw Error('Supabase connection not configured on this device');
try{jwt=JSON.parse(localStorage.getItem('sb-'+cfg.ref+'-auth-token')||'null')?.access_token}catch{}
if(!jwt){user=null;clear();accountMessage('Sign in on VibeVerse, then return to this page.');render();return}
const auth=await fetch(cfg.url+'/auth/v1/user',{headers:{apikey:cfg.key,Authorization:'Bearer '+jwt},cache:'no-store'});
if(!auth.ok){user=null;clear();accountMessage('Your login session has expired. Sign in again.');render();return}
user=await auth.json();if(!user?.id||user.is_anonymous===true){user=null;clear();render();return}
const id=encodeURIComponent(user.id);
const [ev,re,pay]=await Promise.all([
query('vv_provider_events?select=id,event_type,provider_object_ref,verified_status,review_state,received_at&merchant_id=eq.'+id+'&order=received_at.desc&limit=75'),
query('vv_refund_cases?select=id,provider_refund_id,amount_kobo,status,reconciliation_status,last_verified_at&merchant_id=eq.'+id+'&order=last_verified_at.desc&limit=75'),
query('vv_payout_requests?select=id,amount_kobo,status,created_at&merchant_id=eq.'+id+'&order=created_at.desc&limit=75')]);
events=ev||[];refunds=re||[];payouts=pay||[];accountMessage('Connected as '+(user.email||'creator')+' · private records');render();
}catch(e){accountMessage(e.message||'Network temporarily unavailable');if(!user)clear();console.warn('VibeVerse audit read:',e.message);render()}
finally{busy=false}
}
function exportCsv(){if(!user)return;const data=[['type','reference','status','amount_kobo','date']];for(const x of tab==='events'?events:tab==='refunds'?refunds:payouts){
if(tab==='events')data.push([x.event_type,x.provider_object_ref,x.verified_status,'',x.received_at]);
else if(tab==='refunds')data.push(['refund',x.provider_refund_id,x.status,x.amount_kobo,x.last_verified_at]);
else data.push(['payout',x.id,x.status,x.amount_kobo,x.created_at]);
}
const csv=data.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n'),url=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));const a=document.createElement('a');a.href=url;a.download='vibeverse-verified-'+tab+'.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
all('[data-tab]').forEach(b=>b.addEventListener('click',()=>{tab=b.dataset.tab;render()}));
$('#refresh').addEventListener('click',refresh);$('#export').addEventListener('click',exportCsv);
refresh();setInterval(()=>{if(document.visibilityState==='visible')refresh()},45000);
})();