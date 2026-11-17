/* VibeVerse 9.0 Live Network: real server results, never fake counters */
(()=>{'use strict';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)],icon=n=>'<svg aria-hidden="true"><use href="#i-'+n+'"></use></svg>';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uuid=x=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(x||''));
const money=kobo=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN'}).format(Number(kobo||0)/100);
let open=false,page='overview',statusData=null,viewData=null,searchData=null,offersData=null,earningsData=null,searchTerm='',viewId='',loading=false,lastRefresh=0,authClient=null,authKey='',counted=new Set(),playTimers=new WeakMap(),lastBadge=new Map();
const wrapper=document.createElement('main');wrapper.id='vv9Live';wrapper.className='workspace v9-root';wrapper.hidden=true;$('.shell')?.append(wrapper);
function toast(text){const n=$('#toast');if(n){n.textContent=text;n.classList.add('show');setTimeout(()=>n.classList.remove('show'),3500)}}
async function api(path, options={}){const r=await fetch(path,{...options,headers:{...(options.headers||{})},cache:'no-store'});const data=await r.json().catch(()=>({ok:false}));if(!r.ok)throw Object.assign(Error(data.message||data.code||'Service unavailable'),{status:r.status,data});return data}
async function token(){
try{const config=JSON.parse(localStorage.getItem('vv2_config')||'null');if(!config?.url||!config?.key||!window.supabase?.createClient)return null;
const key=config.url+'|'+config.key;if(!authClient||authKey!==key){authKey=key;authClient=window.supabase.createClient(config.url,config.key)}
const res=await authClient.auth.getSession();return res.data?.session?.access_token||null}catch(e){return null}
}
function nav(){for(const id of ['desktopNav','mobileNav']){const n=$('#'+id);if(n&&!n.querySelector('[data-v9-nav]'))n.insertAdjacentHTML('beforeend','<button data-v9-nav="1">'+icon('globe')+'<span>Live Network</span></button>')}$$('[data-v9-nav]').forEach(b=>b.classList.toggle('on',open))}
function inject(){const v=$('#view');if(!v)return;const hero=$('.hero',v),settings=$('.settingsGrid',v);
if(hero&&v.querySelector('.statGrid')&&!hero.querySelector('[data-v9-nav]'))hero.insertAdjacentHTML('beforeend',' <button class="secondary" data-v9-nav="1">Global Network</button>');
if(settings&&!v.querySelector('.v9-link'))settings.insertAdjacentHTML('afterend','<div class="panel v9-link"><h3>Global Network & Payment Status</h3><p class="hint">See whether real worldwide view counts, shared data and verified revenue are connected.</p><button class="secondary" data-v9-nav="1">Open Live Network</button></div>');
const c=$('.profileStats',v);if(c&&!v.querySelector('.v9-profile'))c.insertAdjacentHTML('afterend','<div class="v9-profile" style="margin:12px 0"><button class="secondary" data-v9-nav="1">Live creator metrics</button></div>')}
function show(){open=true;document.body.classList.remove('vv3-open','vv4-open','earn-open','v8-open','w6-open');document.body.classList.add('v9-open');for(const id of ['#vv3Panel','#vv4Panel','#vv5Monetization','#vv8Community']){const x=$(id);if(x)x.hidden=true}wrapper.hidden=false;$$('video.feedVideo').forEach(v=>v.pause());history.replaceState(null,'',location.pathname+'#live-network');nav();render();refresh();window.scrollTo(0,0)}
function close(){if(!open)return;open=false;wrapper.hidden=true;document.body.classList.remove('v9-open');nav()}
function disabledReason(){return statusData?.database==='connected'?'Connected':'Requires your authorized Supabase connection and database migration'}
function statePill(ok){return '<span class="v9-state '+(ok?'good':'')+'">'+icon(ok?'check':'shield')+' '+(ok?'Connected':'Not connected')+'</span>'}
function stat(label,value,description){return '<article class="v9-stat"><span>'+label+'</span><b>'+value+'</b><small>'+description+'</small></article>'}
function hero(){return '<header class="v9-hero"><div class="v9-eyebrow">✦ VIBEVERSE · WORLDWIDE SOCIAL INFRASTRUCTURE</div><h1>The Real <em>Creator Network.</em></h1><p>Verified server records only. Discover videos, check actual playback counts and track legitimate payment activity once services are connected.</p><div class="v9-pills"><span>'+icon('globe')+' Multi-user infrastructure</span><span>'+icon('shield')+' No fabricated statistics</span></div></header>'}
function tabs(){return '<nav class="v9-tabs">'+[['overview','globe','Network status'],['views','eye','Global views'],['discover','compass','Search insights'],['earn','chart','Verified earnings'],['setup','settings','Connect services']].map(([id,i,label])=>'<button data-v9-tab="'+id+'" class="'+(page===id?'active':'')+'">'+icon(i)+label+'</button>').join('')+'</nav>'}
function overview(){const db=statusData?.viewMetricsReady===true,pay=statusData?.payments==='configured-not-tested';
return '<div class="v9-row"><div><h2>Live infrastructure status</h2><p>Results fetched from the deployed VibeVerse server—not manually entered.</p></div><button class="v9-btn" data-v9="refresh">'+icon('refresh')+' Refresh</button></div><div class="v9-stats">'+stat('Shared database',db?'Connected':'Not connected',db?'Supabase metric schema detected':disabledReason())+stat('Global views',db?'Available':'Unavailable',db?'Authenticated, deduplicated records':'No global counts until connected')+stat('Payment gateway',pay?'Configured':'Disabled',pay?'Requires approved production testing':'No charges are possible')+stat('Verified income',pay?'Records available':'Unavailable',pay?'Only confirmed payment ledger entries':'No real earnings source connected')+'</div>'+
'<div class="v9-cols"><section class="v9-panel"><h3>Global services</h3>'+[
['Shared data',db,'Real public videos and account-based metrics'],['Authenticated view counts',db,'Server records a qualified view from a signed-in account'],['Payment processing',pay,'Approved merchant + Paystack + signed verification'],['Creator withdrawals',false,'Requires payouts, KYC, chargebacks and reconciliation'],['Public live streaming',false,'Requires streaming infrastructure and safety moderation']
].map(([name,ok,desc])=>'<div class="v9-service"><span>'+icon(ok?'check':'lock')+'</span><div><b>'+name+'</b><small>'+desc+'</small></div>'+statePill(ok)+'</div>').join('')+'</section><section class="v9-panel"><h3>What happens next?</h3><p class="v9-muted">The server routes and database migration are prepared, but they cannot become live services without the correct accounts and verified credentials.</p><div class="v9-steps">'+[
['1','Connect Supabase','Link your approved database and apply the schema'],['2','Set server configuration','Store credentials in Vercel, never in website forms'],['3','Test real view recording','Use authenticated accounts and genuine video playback'],['4','Approve payment eligibility','Complete Paystack merchant, identity, age and refund checks']
].map(([n,a,b])=>'<div><span>'+n+'</span><section><b>'+a+'</b><small>'+b+'</small></section></div>').join('')+'</div><button class="v9-btn primary" data-v9-tab="setup">Open setup guide</button></section></div>'+
'<div class="v9-note">'+icon('info')+' <span>TikTok\'s private recommendations and hidden systems cannot be copied. VibeVerse uses its own transparent features based on real video activity when the shared network is active.</span></div>'}
function globalViews(){const ready=statusData?.viewMetricsReady===true;
return '<section class="v9-panel"><h2>Authentic global view totals</h2><p class="v9-muted">Choose a published VibeVerse video ID. Counts come from authenticated view events in your connected database, deduplicated per account and day.</p><form id="v9VideoForm" class="v9-form"><input id="v9VideoId" name="video" class="v9-input" placeholder="Public video UUID" maxlength="36" value="'+esc(viewId)+'" required><button class="v9-btn primary" type="submit" '+(!ready?'disabled':'')+'>Look up views</button></form>'+
(viewData?.ok?'<div class="v9-metric">'+icon('eye')+'<div><small>Recorded global view events</small><strong>'+Number(viewData.views).toLocaleString()+'</strong><span>Account-based, deduplicated count — not a guarantee of unique humans</span></div></div>':viewId?'<div class="v9-empty">'+(ready?'No verified count available for that video.':'No connected live database yet.')+'</div>':'<div class="v9-empty">'+(ready?'Enter a real public video ID.':'Connect Supabase before checking worldwide view totals.')+'</div>')+
'<p class="v9-muted">The feed can submit qualified viewing events only from signed-in viewers after playback begins. Sample videos and private drafts do not count as authenticated global views.</p></section>'}
function discover(){const ready=statusData?.viewMetricsReady;
return '<section class="v9-panel"><div class="v9-row"><div><h2>Creator Search Insights</h2><p class="v9-muted">Explore real public-video captions and hashtags, ranked using server-recorded views and recency.</p></div><span class="v9-label">ORIGINAL DISCOVERY RANKING</span></div><form id="v9DiscoverForm" class="v9-form"><input name="query" class="v9-input" value="'+esc(searchTerm)+'" maxlength="50" placeholder="Search video topics and hashtags"><button class="v9-btn primary" type="submit" '+(!ready?'disabled':'')+'>'+icon('search')+' Discover</button></form>'+
(!ready?'<div class="v9-empty">Search Insights activates after the shared video database is connected. No fake trending list is shown.</div>':searchData?.ok?(searchData.results.length?'<div class="v9-results">'+searchData.results.map((x,i)=>'<article class="v9-result"><div class="v9-number">'+(i+1)+'</div><section><b>'+esc(x.caption||'Video')+'</b><small>'+esc(x.hashtags||'')+'</small></section><span>'+Number(x.views).toLocaleString()+' views</span></article>').join('')+'</div>':'<div class="v9-empty">No matching public videos were found.</div>'):'<div class="v9-empty">Search for videos after connecting the database.</div>')+
'<p class="v9-muted">This is not TikTok\'s ranking algorithm. Results are calculated from VibeVerse\'s own published-video records.</p></section>'}
function earn(){const live=statusData?.payments==='configured-not-tested';const connected=statusData?.database==='connected';
return '<div class="v9-stats">'+stat('Verified gross receipts',earningsData?.ok?money(earningsData.confirmed_gross_kobo):'Unavailable','Provider-verified ledger entries only')+stat('Merchant status',earningsData?.ok?earningsData.merchantStatus:'Not connected','Requires approved merchant eligibility')+stat('Payment processing',live?'Setup detected':'Disabled','Live financial operations are currently locked')+'</div><div class="v9-cols"><section class="v9-panel"><h3>Real creator earnings</h3><p class="v9-muted">No estimated or invented revenue. Only actual provider-confirmed payment records can appear here after secure connection.</p><button class="v9-btn" data-v9="load-earn" '+(!connected?'disabled':'')+'>'+icon('refresh')+' Refresh payment records</button><p class="v9-muted">Gross receipts are not a withdrawable balance. Refunds, chargebacks, fees and payouts require dedicated reconciliation.</p></section>'+
'<section class="v9-panel"><h3>Available paid creator offerings</h3>'+
(offersData?.ok&&offersData.offers.length?offersData.offers.map(o=>'<div class="v9-offer"><div><b>'+esc(o.title)+'</b><small>'+esc(o.description||'')+'</small></div><strong>'+money(o.price_kobo)+'</strong><button class="v9-btn primary" data-v9-buy="'+esc(o.id)+'" '+(!live?'disabled':'')+'>Pay through provider</button></div>').join(''):'<div class="v9-empty">No approved paid offerings are available. Checkout is disabled until account and payment requirements are met.</div>')+'</section></div>'+
'<div class="v9-note">'+icon('shield')+' <span>Payments are blocked until a verified merchant account and secure backend are active. Never submit bank information, secret keys or identity numbers through a public app form.</span></div>'}
function setup(){return '<section class="v9-panel"><h2>Activate the real backend</h2><p class="v9-muted">Services are deliberately locked until an authorized account owner connects them.</p>'+
'<div class="v9-guides"><article><span>01</span><div><h3>Connect Supabase</h3><p>Use an authorized Supabase project to enable shared accounts and video metrics. Apply the existing schema, then the new live-data migration.</p><a href="https://vibeverse-bright-studio.vercel.app/LIVE-SOCIAL-MONETIZATION.sql" target="_blank" rel="noopener noreferrer">Open database migration</a></div></article>'+
'<article><span>02</span><div><h3>Configure server environment</h3><p>Set SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY using Vercel’s protected environment settings. Never share secret keys in a chat or browser form.</p><a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer">Vercel dashboard</a></div></article>'+
'<article><span>03</span><div><h3>Complete merchant verification</h3><p>An authorized, eligible account owner must complete Paystack business onboarding and identity checks. Configure its server-only credentials after approval.</p><a href="https://support.paystack.com/en/articles/2125506" target="_blank" rel="noopener noreferrer">Paystack activation requirements</a></div></article>'+
'<article><span>04</span><div><h3>Test before enabling money</h3><p>Verify signed webhooks, idempotent credits, refunds, eligible users, compliance and payout reconciliation. Live checkouts and withdrawals must remain locked until approved.</p><a href="https://vibeverse-bright-studio.vercel.app/LIVE-SETUP.md" target="_blank" rel="noopener noreferrer">Read technical setup notes</a></div></article></div></section>'+
'<div class="v9-note">'+icon('info')+' <span>VibeVerse has no permission to access TikTok\'s proprietary hidden features, private metrics or creator earnings. This project builds original alternatives instead.</span></div>'}
function render(){if(!open)return;const title=$('#headerTitle');if(title)title.textContent='Live Network';
wrapper.innerHTML='<div class="v9-page">'+hero()+tabs()+({overview,views:globalViews,discover,earn,setup}[page]||overview)()+'<footer class="v9-foot">VibeVerse Live Network v9.0 · Global statistics and financial records are shown only when obtained from an authorized shared server. No mocks represented as real activity.</footer></div>';
}
async function refresh(){
try{statusData=await api('/api/status')}catch(e){statusData=null}
lastRefresh=Date.now();if(open)render();
if(statusData?.database==='connected'){if(page==='discover'&&searchTerm)await search();if(page==='views'&&viewId)await lookup();if(page==='earn')await loadFinancials();}else{viewData=null;searchData=null;earningsData=null;offersData=null}
}
async function lookup(){if(!uuid(viewId))return toast('Enter a valid video ID');try{viewData=await api('/api/live?video_id='+encodeURIComponent(viewId))}catch(e){viewData=null;toast('No public metrics available for that ID')}render()}
async function search(){try{searchData=await api('/api/discover?q='+encodeURIComponent(searchTerm))}catch(e){searchData=null;toast('Search is not connected yet')}render()}
async function loadFinancials(){
 if(!statusData?.viewMetricsReady)return;
 try{offersData=await api('/api/offers')}catch(e){offersData=null}
 const bearer=await token();if(bearer){try{earningsData=await api('/api/earnings',{headers:{Authorization:'Bearer '+bearer}})}catch(e){earningsData=null}}else earningsData=null;
 if(open)render()
}
async function checkout(id){
 if(!uuid(id)||statusData?.payments!=='configured-not-tested')return toast('Payments have not been approved or enabled');
 const bearer=await token();if(!bearer)return toast('Sign in through VibeVerse before checkout');
 try{const res=await api('/api/checkout',{method:'POST',headers:{Authorization:'Bearer '+bearer,'Content-Type':'application/json'},body:JSON.stringify({offer_id:id})});
 if(res.ok&&/^https:\/\/checkout\.paystack\.com\//.test(res.checkout_url))location.assign(res.checkout_url);else toast('Checkout unavailable');
 }catch(e){toast(e.data?.message||'The payment provider did not start checkout')}
}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.v9Nav!==undefined){page='overview';show();return}if(b.dataset.route!==undefined||b.dataset.xRoute!==undefined||b.dataset.vv4Route!==undefined||b.dataset.earnNav!==undefined||b.dataset.v8Nav!==undefined)close()},true);
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const d=b.dataset;if(d.v9Tab){page=d.v9Tab;render();if(page==='earn')loadFinancials();if(page==='discover'&&!searchData&&statusData?.viewMetricsReady)search();return}
if(d.v9Buy)checkout(d.v9Buy);
if(d.v9==='refresh'){refresh();toast('Checking server status');}
if(d.v9==='load-earn')loadFinancials();
});
document.addEventListener('submit',e=>{if(e.target.id==='v9VideoForm'){e.preventDefault();viewId=String(new FormData(e.target).get('video')||'').trim();lookup()}
if(e.target.id==='v9DiscoverForm'){e.preventDefault();searchTerm=String(new FormData(e.target).get('query')||'').trim().slice(0,50);search()}
});
/* Genuine view events: play 3 seconds on a public UUID video, require signed-in JWT. */
const timeMap=new WeakMap();
document.addEventListener('play',e=>{const v=e.target;if(!v.matches?.('video.feedVideo'))return;const card=v.closest('.videoCard'),id=card?.dataset.card;if(!uuid(id)||!statusData?.viewMetricsReady)return;timeMap.set(v,{id,at:Date.now(),start:Number(v.currentTime)||0,sent:false})},true);
document.addEventListener('timeupdate',async e=>{const v=e.target;if(!v.matches?.('video.feedVideo'))return;const item=timeMap.get(v);if(!item||item.sent||v.paused||Date.now()-item.at<3000||Number(v.currentTime)-item.start<2.8)return;
item.sent=true;const key=item.id+'|'+new Date().toISOString().slice(0,10);if(counted.has(key))return;const bearer=await token();if(!bearer)return;try{const data=await api('/api/live',{method:'POST',headers:{Authorization:'Bearer '+bearer,'Content-Type':'application/json'},body:JSON.stringify({video_id:item.id,watched_seconds:Math.min(180,Math.max(3,Number(v.currentTime)-item.start))})});if(data.ok){counted.add(key);updateBadge(v.closest('.videoCard'),true)}}catch(e){}},true);
async function updateBadge(card,force=false){if(!card||!statusData?.viewMetricsReady)return;const id=card.dataset.card;if(!uuid(id))return;if(!force&&Date.now()-(lastBadge.get(id)||0)<25000)return;lastBadge.set(id,Date.now());
try{const data=await api('/api/live?video_id='+id);if(!data.ok)return;let badge=$('.v9-global-counter',card);if(!badge){badge=document.createElement('span');badge.className='v9-global-counter';const n=$('.videoBottom',card);if(!n)return;n.append(badge)}badge.textContent='🌐 '+Number(data.views).toLocaleString()+' account-based views';badge.title='Authenticated daily-deduplicated view events from VibeVerse'}catch(e){}
}
setInterval(()=>{if(!open&&statusData?.viewMetricsReady){const first=$$('.videoCard').find(c=>{const v=c.querySelector('video');return v&&!v.paused});if(first)updateBadge(first)}},24000);
setInterval(()=>{if(open)refresh()},32000);
for(const id of ['desktopNav','mobileNav']){const n=$('#'+id);if(n)new MutationObserver(nav).observe(n,{childList:true})}
const view=$('#view');if(view)new MutationObserver(inject).observe(view,{childList:true});
nav();inject();api('/api/status').then(x=>statusData=x).catch(()=>{});
if(location.hash==='#live-network')setTimeout(show,200);
if(new URL(location.href).searchParams.has('payment-return')){
 setTimeout(async()=>{page='earn';show();const u=new URL(location.href);const ref=u.searchParams.get('reference')||u.searchParams.get('trxref');u.searchParams.delete('payment-return');u.searchParams.delete('reference');u.searchParams.delete('trxref');history.replaceState(null,'',u.pathname+u.search+'#live-network');
 if(!ref)return toast('A payment return was detected. Verification requires a reference.');
 const bearer=await token();if(!bearer)return toast('Sign in to verify the payment. No balance was added.');
 try{const x=await api('/api/verify?reference='+encodeURIComponent(ref),{headers:{Authorization:'Bearer '+bearer}});toast(x.verified?'Payment verified by provider. Refresh earnings to view it.':'Payment not verified.')}catch(e){toast('Payment was not verified; no earnings were credited')}} ,500);
}
})();