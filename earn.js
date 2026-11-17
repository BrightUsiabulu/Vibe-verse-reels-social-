/* VibeVerse v5 — Creator Monetization Workspace: local tools; NO payment processing */
(() => {
'use strict';
const q=(s,r=document)=>r.querySelector(s), qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
const ico=n=>'<svg aria-hidden="true"><use href="#i-'+n+'"></use></svg>';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key=k=>'vv5_'+k;
const get=(k,f)=>{try{const v=localStorage.getItem(key(k));return v===null?f:JSON.parse(v)}catch{return f}};
const put=(k,v)=>{try{localStorage.setItem(key(k),JSON.stringify(v));return true}catch{notice('Local storage is full; the change could not be saved');return false}};
const makeId=()=> 'mon_'+(Date.now().toString(36))+'_'+Math.random().toString(36).slice(2,8);
const numeric=(v,limit=1000000000)=>Math.min(limit,Math.max(0,Math.round(Number(v)||0)));
const money=n=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:0}).format(numeric(n));
const when=d=>{try{return new Date(d).toLocaleDateString('en-NG',{year:'numeric',month:'short',day:'numeric'})}catch{return 'No date'}};
const today=()=>new Date().toISOString().slice(0,10);
const initials=x=>String(x||'VV').slice(0,1).toUpperCase();
const txt=(label,field,value='',required=true,max=140,type='text')=>'<label class="earn-field">'+esc(label)+'<input class="earn-input" type="'+type+'" name="'+field+'" value="'+esc(value)+'" maxlength="'+max+'" '+(required?'required':'')+'></label>';
const textarea=(label,field,value='',max=1000)=>'<label class="earn-field">'+esc(label)+'<textarea class="earn-textarea" name="'+field+'" maxlength="'+max+'">'+esc(value)+'</textarea></label>';
const select=(label,field,options,value)=>'<label class="earn-field">'+esc(label)+'<select class="earn-input" name="'+field+'">'+options.map(o=>'<option '+(o===value?'selected':'')+'>'+esc(o)+'</option>').join('')+'</select></label>';
const button=(caption,action,extra='')=>'<button class="earn-btn '+extra+'" data-earn="'+action+'">'+caption+'</button>';
let visible=false,tab='overview',editDeal=null,editInvoice=null,editPackage=null;
let deals=get('deals',[]),packs=get('packages',[
{id:'pack_ugc',name:'Original UGC video',detail:'One short branded video concept with a revision',price:25000},
{id:'pack_story',name:'Brand mention',detail:'An original, clearly labeled brand mention',price:15000},
{id:'pack_film',name:'Creative production',detail:'Filming and editing services for a short project',price:60000}
]),invoices=get('invoices',[]),tiers=get('tiers',[
{id:'tier_supporter',name:'Supporter',price:1000,benefits:'Behind-the-scenes updates'},
{id:'tier_studio',name:'Studio Club',price:3000,benefits:'Creative project announcements and early previews'}
]),profile=get('business',{studio:'Bright Studio',tagline:'Independent filmmaker and digital creator',contact:'',bio:'Original films, storytelling, acting and creator content.'}),checklist=get('setup',{business:false,identity:false,provider:false,security:false,moderation:false});
const root=document.createElement('main');root.id='vv5Monetization';root.className='workspace earn-root';root.hidden=true;root.setAttribute('aria-label','Creator monetization studio');
q('.shell')?.appendChild(root);
function notice(t){const n=q('#toast');if(!n)return;n.textContent=t;n.classList.add('show');setTimeout(()=>n.classList.remove('show'),3500)}
const sumDeals=()=>deals.reduce((a,x)=>a+numeric(x.quote),0);
const sumInvoice=()=>invoices.reduce((a,x)=>a+numeric(x.qty)*numeric(x.unitPrice),0);
const selfReported=()=>invoices.filter(x=>x.status==='Received (self-reported)').reduce((a,x)=>a+numeric(x.qty)*numeric(x.unitPrice),0);
function menu(){
 const desktop=q('#desktopNav'),mobile=q('#mobileNav');
 if(desktop&&!desktop.querySelector('[data-earn-nav]'))desktop.insertAdjacentHTML('beforeend','<button data-earn-nav="studio">'+ico('chart')+' <span>Monetization</span></button>');
 if(mobile&&!mobile.querySelector('[data-earn-nav]'))mobile.insertAdjacentHTML('beforeend','<button data-earn-nav="studio">'+ico('chart')+'<span>Earn</span></button>');
 qa('[data-earn-nav]').forEach(b=>b.classList.toggle('on',visible));
}
function studioInject(){
const root=q('#view');if(!root)return;
const hero=q('.hero',root);
if(hero&&q('.statGrid',root)&&!hero.querySelector('[data-earn-nav]'))hero.insertAdjacentHTML('beforeend',' <button class="secondary" data-earn-nav="studio">'+ico('chart')+' Monetization Studio</button>');
const stats=q('.profileStats',root);
if(stats&&!root.querySelector('.earn-profile-link'))stats.insertAdjacentHTML('afterend','<div class="earn-profile-link" style="margin:15px 0"><button class="secondary" data-earn-nav="studio">'+ico('chart')+' Creator earnings & business</button></div>');
const settings=q('.settingsGrid',root);
if(settings&&!root.querySelector('.earn-settings-link'))settings.insertAdjacentHTML('afterend','<div class="panel earn-settings-link"><h3>Monetization & creator business</h3><p class="hint">Plan sponsorships, prepare invoices, and learn what is needed for verified payments.</p><button class="secondary" data-earn-nav="studio">Open Monetization Studio</button></div>');
}
function open(){visible=true;document.body.classList.add('earn-open');document.body.classList.remove('vv3-open','vv4-open');q('#vv3Panel')&&(q('#vv3Panel').hidden=true);q('#vv4Panel')&&(q('#vv4Panel').hidden=true);root.hidden=false;qa('video.feedVideo').forEach(v=>v.pause());window.history.replaceState(null,'',location.pathname+'#earn');menu();render();scrollTo(0,0)}
function close(){if(!visible)return;visible=false;root.hidden=true;document.body.classList.remove('earn-open');menu()}
function tip(text,kind='info'){return '<div class="earn-note '+(kind==='warning'?'warning':'')+'">'+ico(kind==='warning'?'shield':'info')+'<span>'+text+'</span></div>'}
const pages=[
['overview','Overview','chart'],
['deals','Brand deals','folder'],
['rates','Rate card','list'],
['invoices','Invoices','draft'],
['memberships','Subscriptions','user'],
['setup','Payment setup','shield']
];
function render(){if(!visible)return;
q('#headerTitle')&&(q('#headerTitle').textContent='Monetization');
root.innerHTML='<div class="earn-page"><header class="earn-hero"><p class="earn-kicker">✦ VIBEVERSE CREATOR BUSINESS</p><div class="earn-hero-split"><div><h1>Build your creator business<span>.</span></h1><p>Organize sponsorships, prepare invoices, and plan paid offerings in one professional workspace.</p></div><span class="earn-mode">PAYMENTS NOT CONNECTED</span></div></header><nav class="earn-tabs" aria-label="Monetization sections">'+pages.map(([id,label,ic])=>'<button data-earn-tab="'+id+'" class="earn-tab '+(tab===id?'active':'')+'">'+ico(ic)+label+'</button>').join('')+'</nav><section id="earnContent">'+({overview:overviewHTML,deals:dealsHTML,rates:rateHTML,invoices:invoiceHTML,memberships:membershipHTML,setup:setupHTML}[tab]||overviewHTML)()+'</section><p class="earn-footnote">Private workspace: data in these tools is stored only on this browser. Quotes, invoices, and self-reported receipts are not payment-provider-verified earnings. This is not a bank or payment gateway.</p></div>';
}
function stat(label,n,foot,verified=false){return '<article class="earn-stat"><div class="earn-stat-label">'+label+'</div><b class="'+(verified?'earn-highlight':'')+'">'+n+'</b><p>'+foot+'</p></article>'}
function overviewHTML(){
const active=deals.filter(x=>['Contacted','Negotiating','In progress'].includes(x.stage)).length;
return '<div class="earn-stats">'+stat('Verified platform earnings',money(0),'No connected payment processor',true)+stat('Self-reported receipts',money(selfReported()),'Manually marked; not bank-verified')+stat('Open sponsorships',String(active),'Creator deal pipeline')+stat('Drafted invoice value',money(sumInvoice()),'Estimates and receivables only')+'</div>'+
'<div class="earn-split"><article class="earn-panel"><h3>Revenue tools</h3><p class="earn-subtitle">Prepare professional creator-business materials without requiring payments to be enabled.</p><div class="earn-action-grid">'+[
['Brand deals','Manage negotiations','deals','folder'],['Rate card','Define service prices','rates','list'],['Invoices','Prepare billing documents','invoices','draft'],['Subscriptions','Design future membership tiers','memberships','user']
].map(x=>'<button class="earn-action" data-earn-tab="'+x[2]+'"><span>'+ico(x[3])+'</span><b>'+x[0]+'</b><small>'+x[1]+'</small></button>').join('')+'</div></article>'+
'<article class="earn-panel"><h3>Go-live checklist</h3><p class="earn-subtitle">Requirements for enabling verified transactions and payouts.</p>'+
Object.entries({business:'Approved business/account ownership',identity:'Provider identity and age requirements',provider:'Approved payment-provider merchant account',security:'Secure server, webhooks and ledger',moderation:'Community and payment abuse controls'}).map(([k,label])=>'<div class="earn-checkline"><span class="'+(checklist[k]?'done':'')+'">'+ico(checklist[k]?'check':'clock')+'</span><span>'+esc(label)+'</span></div>').join('')+
button('View payment setup '+ico('arrow'),'setup','primary earn-wide')+'</article></div>'+
tip('<b>How monetization works today:</b> you can prepare rates, proposals and invoices. No fan payments, subscriptions, tips, gifts or withdrawals are charged or credited by this version. A secure backend and provider approval are required.', 'warning');
}
function dealForm(v=null){return '<form id="earnDealForm" class="earn-form">'+txt('Brand / client','client',v?.client||'')+txt('Campaign title','title',v?.title||'')+textarea('Campaign description','brief',v?.brief||'',1500)+'<div class="earn-two">'+txt('Quoted fee (NGN)','quote',v?.quote||'','required',12,'number')+txt('Expected date','deadline',v?.deadline||today(),true,12,'date')+'</div>'+select('Deal stage','stage',['Lead','Contacted','Negotiating','In progress','Delivered','Closed','Declined'],v?.stage||'Lead')+'<div class="earn-buttons">'+button('Save deal','saveDeal','primary')+(v?button('Cancel editing','cancelDeal'):'')+'</div></form>'}
function dealRow(x){return '<div class="earn-entry"><div class="earn-entry-top"><div><b>'+esc(x.title)+'</b><small>'+esc(x.client)+' · '+when(x.deadline)+'</small></div><span class="earn-pill">'+esc(x.stage)+'</span></div><p>'+esc(x.brief||'No brief yet')+'</p><div class="earn-entry-bottom"><strong>'+money(x.quote)+'</strong><div class="earn-buttons">'+button('Edit','editDeal:'+x.id)+button('Delete','deleteDeal:'+x.id,'danger')+'</div></div></div>'}
function dealsHTML(){return '<div class="earn-split"><article class="earn-panel"><h3>'+(editDeal?'Edit sponsorship':'New sponsorship')+'</h3>'+dealForm(deals.find(x=>x.id===editDeal))+'</article><article class="earn-panel"><div class="earn-row"><h3>Brand deal pipeline</h3><span class="earn-pill">'+deals.length+' deals</span></div><p class="earn-subtitle">Negotiations, proposals and projects managed on this device.</p>'+(deals.length?deals.map(dealRow).join(''):'<div class="earn-empty">No sponsorships yet. Create a lead to start tracking a brand conversation.</div>')+'</article></div>'}
function rateForm(v=null){return '<form id="earnRateForm" class="earn-form">'+txt('Package name','name',v?.name||'')+textarea('Deliverables','detail',v?.detail||'',800)+txt('Starting price (NGN)','price',v?.price||'',true,12,'number')+'<div class="earn-buttons">'+button('Save package','saveRate','primary')+(v?button('Cancel','cancelRate'):'')+'</div></form>'}
function rateHTML(){const item=packs.find(x=>x.id===editPackage);return '<div class="earn-split"><article class="earn-panel"><h3>'+(item?'Edit package':'New service package')+'</h3>'+rateForm(item)+'<div class="earn-buttons">'+button('Export rate card CSV '+ico('download'),'exportRates')+button('Create media kit '+ico('download'),'exportKit','primary')+'</div></article><article class="earn-panel"><h3>Your packages</h3><p class="earn-subtitle">Illustrative starting rates, fully editable. Prices are proposals, not guaranteed revenue.</p>'+
(packs.length?packs.map(p=>'<div class="earn-entry"><div class="earn-entry-top"><b>'+esc(p.name)+'</b><strong>'+money(p.price)+'</strong></div><p>'+esc(p.detail)+'</p><div class="earn-buttons">'+button('Edit','editRate:'+p.id)+button('Delete','deleteRate:'+p.id,'danger')+'</div></div>').join(''):'<div class="earn-empty">Add a service package to your rate card.</div>')+'</article></div>'}
function invoiceForm(v=null){return '<form id="earnInvoiceForm" class="earn-form">'+txt('Client / business name','client',v?.client||'')+txt('Service delivered','service',v?.service||'')+'<div class="earn-two">'+txt('Quantity','qty',v?.qty||1,true,6,'number')+txt('Unit price (NGN)','unitPrice',v?.unitPrice||'',true,12,'number')+'</div><div class="earn-two">'+txt('Issue date','issueDate',v?.issueDate||today(),true,12,'date')+txt('Due date','dueDate',v?.dueDate||today(),true,12,'date')+'</div>'+select('Tracking status','status',['Draft','Sent','Received (self-reported)','Cancelled'],v?.status||'Draft')+textarea('Notes / payment instructions (optional)','notes',v?.notes||'',900)+'<div class="earn-buttons">'+button('Save invoice','saveInvoice','primary')+(v?button('Cancel editing','cancelInvoice'):'')+'</div></form>'}
function invoiceHTML(){return '<div class="earn-split"><article class="earn-panel"><h3>'+(editInvoice?'Edit invoice':'Prepare an invoice')+'</h3>'+invoiceForm(invoices.find(x=>x.id===editInvoice))+'</article><article class="earn-panel"><div class="earn-row"><h3>Invoice register</h3><span class="earn-pill">'+invoices.length+' invoices</span></div><p class="earn-subtitle">Create printable invoices. Statuses are manually entered, not verified payment outcomes.</p>'+
(invoices.length?invoices.map(x=>'<div class="earn-entry"><div class="earn-entry-top"><div><b>'+esc(x.number)+'</b><small>'+esc(x.client)+' · '+esc(x.service)+'</small></div><strong>'+money(numeric(x.unitPrice)*numeric(x.qty))+'</strong></div><div class="earn-entry-bottom"><span class="earn-pill">'+esc(x.status)+'</span><div class="earn-buttons">'+button('Print','printInvoice:'+x.id)+button('Edit','editInvoice:'+x.id)+button('Delete','deleteInvoice:'+x.id,'danger')+'</div></div></div>').join(''):'<div class="earn-empty">No invoices yet. Start with an agreed client project.</div>')+'</article></div>'}
function membershipHTML(){return '<article class="earn-panel"><div class="earn-row"><div><h3>Membership tier designer</h3><p class="earn-subtitle">Preview future subscription options. Billing is not enabled; these are planning templates only.</p></div><span class="earn-pill warn">PREVIEW — NO CHARGES</span></div><div class="earn-tiergrid">'+tiers.map(x=>'<div class="earn-tier"><div class="earn-tier-deco">'+ico('user')+'</div><b>'+esc(x.name)+'</b><h2>'+money(x.price)+' <small>/ month (proposed)</small></h2><p>'+esc(x.benefits)+'</p><button class="earn-btn" data-earn="editTier:'+x.id+'">Edit tier</button><button class="earn-btn muted" disabled>Subscribe (not available)</button></div>').join('')+'</div></article>'+
tip('Automatic renewal, trial billing, refunds, subscriber access and gifts will not activate until an approved merchant account, privacy controls and server-side subscription records are implemented.','warning');
}
function setupHTML(){const requirements=[
['business','Account and business ownership','Use the account details and approvals required by the selected provider.'],
['identity','Age, identity and business checks','Complete legitimate age, identity and merchant-verification requirements; use a parent/guardian or business owner where required.'],
['provider','Verified payment gateway','Configure an eligible merchant account and test checkout in a restricted test environment.'],
['security','Server-side verification','Protect secrets, verify webhook signatures, prevent duplicate crediting, keep an audit trail.'],
['moderation','Safety and refunds','Implement refund handling, abuse reporting, content moderation and account protections.']
];return '<div class="earn-split"><article class="earn-panel"><h3>Creator business identity</h3><form id="earnBusinessForm">'+txt('Studio or business name','studio',profile.studio)+txt('Short tagline','tagline',profile.tagline)+textarea('About your creative work','bio',profile.bio,800)+txt('Public business contact email (optional)','contact',profile.contact,false,150,'email')+button('Save creator business profile','saveBusiness','primary')+'</form><div class="earn-buttons">'+button('Export media kit HTML '+ico('download'),'exportKit')+'</div></article><article class="earn-panel"><div class="earn-row"><h3>Merchant launch checklist</h3><span class="earn-pill">'+requirements.filter(x=>checklist[x[0]]).length+'/5</span></div><p class="earn-subtitle">Check each item only after completing it outside this beta.</p>'+requirements.map(([k,name,desc])=>'<label class="earn-checkitem"><input type="checkbox" data-earn-check="'+k+'" '+(checklist[k]?'checked':'')+'><span><b>'+name+'</b><small>'+desc+'</small></span></label>').join('')+'</article></div>'+
'<article class="earn-panel"><h3>Payment-provider integration status</h3><div class="earn-providergrid"><div class="earn-provider"><b>Paystack</b><span>Not connected</span><p>Server-side checkout initialization, transaction verification and webhook signing required.</p></div><div class="earn-provider"><b>Flutterwave</b><span>Not connected</span><p>Hosted payment flow, verified transaction records and signed webhooks required.</p></div><div class="earn-provider"><b>Bank payouts</b><span>Not connected</span><p>Verified business banking, eligibility and a secure payout ledger required.</p></div></div></article>'+
tip('Never enter a secret API key, bank password, BVN, card number or webhook secret into this website. Secure payment credentials belong on a protected backend, not in browser settings. This version cannot confirm payments or issue withdrawals.','warning');
}
function csvRow(v){return '"'+String(v??'').replace(/"/g,'""')+'"'}
function download(name,content,type){const blob=new Blob([content],{type:type||'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}
function exportRates(){const rows=[['Service','Deliverables','Price NGN'],...packs.map(x=>[x.name,x.detail,x.price])];download('vibeverse-rate-card.csv',rows.map(r=>r.map(csvRow).join(',')).join('\r\n'),'text/csv');notice('Rate card exported')}
function kitHtml(){
const contact=profile.contact?'<p>Email: <a href="mailto:'+esc(profile.contact)+'">'+esc(profile.contact)+'</a></p>':'';
const rows=packs.map(p=>'<div class="item"><div><b>'+esc(p.name)+'</b><p>'+esc(p.detail)+'</p></div><strong>'+money(p.price)+'</strong></div>').join('');
return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(profile.studio)+' · Creator Media Kit</title><style>body{font-family:system-ui;background:#0a1017;color:#f7fafc;padding:5vw;margin:0}main{max-width:800px;margin:auto}.hero{padding:40px;border-radius:24px;background:linear-gradient(120deg,#15464b,#25203d)}.tag{color:#66edd8;font-weight:900;letter-spacing:2px;font-size:12px}h1{font-size:36px}p{color:#c5d0d9;line-height:1.7}.item{display:flex;justify-content:space-between;gap:20px;padding:20px 0;border-bottom:1px solid #3d4d56}.item p{font-size:13px}strong{color:#59e6ce;white-space:nowrap}a{color:#90fff1}small{display:block;color:#9cabb9;margin:24px 0}button{padding:12px;border:0;border-radius:12px;background:#55e8ce;color:#061c1b;font-weight:900}@media print{body{background:white;color:black}.hero{background:#eee}.tag,p,small{color:#555}strong{color:#06594f}}</style></head><body><main><header class="hero"><p class="tag">CREATOR MEDIA KIT · VIBEVERSE</p><h1>'+esc(profile.studio)+'</h1><h3>'+esc(profile.tagline)+'</h3><p>'+esc(profile.bio)+'</p>'+contact+'</header><h2>Services & indicative rates</h2>'+rows+'<small>These are proposed fees, not proof of audience size, past revenue or payment settlement. Discuss scope, rights and terms before agreeing.</small><button onclick="window.print()">Print / Save as PDF</button></main></body></html>';
}
function exportKit(){download('vibeverse-'+String(profile.studio).toLowerCase().replace(/[^a-z0-9]+/g,'-')+'-media-kit.html',kitHtml(),'text/html');notice('Media kit downloaded')}
function printInvoice(invoice){const item=invoice,sub=numeric(item.qty)*numeric(item.unitPrice);const html='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(item.number)+'</title><style>body{font:15px system-ui;color:#17202b;max-width:800px;margin:auto;padding:30px}.hero{display:flex;justify-content:space-between;border-bottom:3px solid #1f968e;padding-bottom:25px}.muted{color:#65727c}h1{font-size:35px;color:#117b73}table{width:100%;border-collapse:collapse;margin:30px 0}td,th{padding:15px;border-bottom:1px solid #d5dee1;text-align:left}strong{font-size:24px}footer{margin-top:60px}.box{padding:15px;background:#e8f5f3;border-radius:10px}.warning{font-size:12px;color:#8a4e20}@media print{button{display:none}}</style></head><body><div class="hero"><div><h2>'+esc(profile.studio)+'</h2><p class="muted">'+esc(profile.tagline)+'</p>'+(profile.contact?'<p>'+esc(profile.contact)+'</p>':'')+'</div><div><h1>INVOICE</h1><b>'+esc(item.number)+'</b></div></div><p><b>Bill to: </b>'+esc(item.client)+'</p><p><b>Issued: </b>'+esc(item.issueDate)+'　 <b>Due: </b>'+esc(item.dueDate)+'</p><table><thead><tr><th>Description</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead><tbody><tr><td>'+esc(item.service)+'</td><td>'+numeric(item.qty)+'</td><td>'+money(item.unitPrice)+'</td><td>'+money(sub)+'</td></tr></tbody></table><div class="box"><b>Total amount</b><p><strong>'+money(sub)+'</strong></p></div><p>'+esc(item.notes||'')+'</p><footer class="warning">Status: '+esc(item.status)+'. This invoice is a creator-generated document and does not prove payment, tax compliance or bank settlement.</footer><button onclick="window.print()">Print / Save PDF</button></body></html>';download(item.number+'.html',html,'text/html');notice('Invoice HTML downloaded. Open it to print or save PDF.')}
function persist(list,name){put(name,list)}
function updateBusiness(form){let d=new FormData(form);profile={studio:String(d.get('studio')||'').trim().slice(0,80),tagline:String(d.get('tagline')||'').trim().slice(0,140),bio:String(d.get('bio')||'').trim().slice(0,800),contact:String(d.get('contact')||'').trim().slice(0,150)};put('business',profile);notice('Business profile saved')}
function saveDeal(form){const d=new FormData(form),v={client:String(d.get('client')||'').trim().slice(0,140),title:String(d.get('title')||'').trim().slice(0,140),brief:String(d.get('brief')||'').trim().slice(0,1500),quote:numeric(d.get('quote')),deadline:String(d.get('deadline')||today()),stage:String(d.get('stage')||'Lead')};if(!v.client||!v.title)return notice('Fill in the client and campaign title');if(editDeal){let x=deals.find(x=>x.id===editDeal);if(x)Object.assign(x,v)}else deals.unshift({id:makeId(),...v});editDeal=null;persist(deals,'deals');notice('Sponsorship saved');render()}
function saveRate(form){const d=new FormData(form),v={name:String(d.get('name')||'').trim().slice(0,140),detail:String(d.get('detail')||'').trim().slice(0,800),price:numeric(d.get('price'))};if(!v.name)return notice('Enter a package name');if(editPackage){let x=packs.find(x=>x.id===editPackage);if(x)Object.assign(x,v)}else packs.push({id:makeId(),...v});editPackage=null;persist(packs,'packages');notice('Rate package saved');render()}
function saveInvoice(form){const d=new FormData(form),v={client:String(d.get('client')||'').trim().slice(0,140),service:String(d.get('service')||'').trim().slice(0,140),qty:Math.max(1,numeric(d.get('qty'),10000)),unitPrice:numeric(d.get('unitPrice')),issueDate:String(d.get('issueDate')||today()),dueDate:String(d.get('dueDate')||today()),status:String(d.get('status')||'Draft'),notes:String(d.get('notes')||'').slice(0,900)};if(!v.client||!v.service)return notice('Fill in the client and service');if(editInvoice){let x=invoices.find(x=>x.id===editInvoice);if(x)Object.assign(x,v)}else invoices.unshift({id:makeId(),number:'VV-'+new Date().getFullYear()+'-'+String(Date.now()).slice(-7),...v});editInvoice=null;persist(invoices,'invoices');notice('Invoice saved locally');render()}
function editTier(tid){let x=tiers.find(x=>x.id===tid);if(!x)return;const name=prompt('Membership tier name',x.name);if(name===null)return;const amount=prompt('Proposed monthly NGN price (not charged)',x.price);if(amount===null)return;const benefits=prompt('Describe benefits',x.benefits);if(benefits===null)return;x.name=String(name).trim().slice(0,70)||x.name;x.price=numeric(amount);x.benefits=String(benefits).slice(0,300);put('tiers',tiers);render();notice('Future tier updated. Subscription billing remains disabled.')}
document.addEventListener('click',e=>{
const b=e.target.closest('button');if(!b)return;
if(b.dataset.earnNav!==undefined){tab='overview';open();return}
if(b.dataset.earnTab){tab=b.dataset.earnTab;editDeal=null;editPackage=null;editInvoice=null;render();return}
const a=b.dataset.earn;if(!a)return;
if(a==='saveDeal')return q('#earnDealForm')?.requestSubmit();
if(a==='saveRate')return q('#earnRateForm')?.requestSubmit();
if(a==='saveInvoice')return q('#earnInvoiceForm')?.requestSubmit();
if(a==='saveBusiness')return q('#earnBusinessForm')?.requestSubmit();
if(a==='cancelDeal'){editDeal=null;render();return}
if(a==='cancelRate'){editPackage=null;render();return}
if(a==='cancelInvoice'){editInvoice=null;render();return}
if(a==='exportRates')return exportRates();
if(a==='exportKit')return exportKit();
if(a==='setup'){tab='setup';render();return}
const [verb,id]=a.split(':');
if(verb==='editDeal'){editDeal=id;render();return}
if(verb==='deleteDeal'){if(!confirm('Delete this sponsor project?'))return;deals=deals.filter(x=>x.id!==id);persist(deals,'deals');render();return}
if(verb==='editRate'){editPackage=id;render();return}
if(verb==='deleteRate'){if(!confirm('Delete this service package?'))return;packs=packs.filter(x=>x.id!==id);persist(packs,'packages');render();return}
if(verb==='editInvoice'){editInvoice=id;render();return}
if(verb==='deleteInvoice'){if(!confirm('Delete this invoice record?'))return;invoices=invoices.filter(x=>x.id!==id);persist(invoices,'invoices');render();return}
if(verb==='printInvoice'){const inv=invoices.find(x=>x.id===id);if(inv)printInvoice(inv);return}
if(verb==='editTier')return editTier(id);
});
document.addEventListener('submit',e=>{
if(!e.target.id?.startsWith('earn'))return;
e.preventDefault();
if(e.target.id==='earnDealForm')saveDeal(e.target);
if(e.target.id==='earnRateForm')saveRate(e.target);
if(e.target.id==='earnInvoiceForm')saveInvoice(e.target);
if(e.target.id==='earnBusinessForm')updateBusiness(e.target);
});
document.addEventListener('change',e=>{if(!e.target.dataset.earnCheck)return;checklist[e.target.dataset.earnCheck]=e.target.checked;put('setup',checklist);render()});
document.addEventListener('click',e=>{if(e.target.closest('button')&&(e.target.closest('[data-route],[data-x-route],[data-vv4-route]'))){close()}},true);
for(const name of ['desktopNav','mobileNav']){const n=q('#'+name);if(n)new MutationObserver(menu).observe(n,{childList:true})}
const view=q('#view');if(view)new MutationObserver(studioInject).observe(view,{childList:true});
menu();studioInject();
if(location.hash==='#earn')setTimeout(open,200);
})();