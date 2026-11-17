/* VibeVerse Social 10.0 — live inbox, cloud bookmarks, creator insights */
(()=>{'use strict';
const $=(q,r=document)=>r.querySelector(q),all=(q,r=document)=>[...r.querySelectorAll(q)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const svg=n=>'<svg aria-hidden="true"><use href="#i-'+n+'"></use></svg>';
const valid=x=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(x||''));
const fmt=n=>Number(n||0).toLocaleString('en-NG'),ago=x=>{const d=Math.max(0,Date.now()-Date.parse(x));return d<60000?'Just now':d<3600000?Math.floor(d/60000)+'m ago':d<86400000?Math.floor(d/3600000)+'h ago':new Date(x).toLocaleDateString('en-NG',{day:'numeric',month:'short'})};
const p=document.createElement('main');p.id='vv10Hub';p.className='workspace vv10-hub';p.hidden=true;$('.shell')?.appendChild(p);
let showing=false,tab='inbox',config=null,user=null,notifications=[],saved=[],clips=[],people={},viewMap={},followers=null,following=null,unread=0,loading=false,lastLoaded=0,channel=null,channelClient=null,liveState='Polling';
function toast(t){const e=$('#toast');if(e){e.textContent=t;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),3400)}}
function getConfig(){try{const c=JSON.parse(localStorage.getItem('vv2_config')||'null');return /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(c?.url)&&/^(sb_publishable_|eyJ)/.test(c?.key)?{url:c.url.replace(/\/+$/,''),key:c.key,ref:new URL(c.url).hostname.split('.')[0]}:null}catch{return null}}
const token=()=>{try{return JSON.parse(localStorage.getItem('sb-'+config.ref+'-auth-token')||'null')?.access_token||null}catch{return null}};
async function rest(path,{method='GET',body,headers={}}={}){
 const h={apikey:config.key,Accept:'application/json',...headers},tok=token();if(tok)h.Authorization='Bearer '+tok;if(body!==undefined)h['Content-Type']='application/json';
 const r=await fetch(config.url+'/rest/v1/'+path,{method,headers:h,body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
 let data=null;if(method!=='HEAD'){const str=await r.text();if(str)try{data=JSON.parse(str)}catch{}}
 if(!r.ok)throw Error(data?.message||'Database request failed ('+r.status+')');return {data,headers:r.headers};
}
async function checkAuth(){
 config=getConfig();if(!config){user=null;return false}
 const k=token();if(!k){user=null;return false}
 try{const r=await fetch(config.url+'/auth/v1/user',{headers:{apikey:config.key,Authorization:'Bearer '+k},cache:'no-store'});if(!r.ok){user=null;return false}const u=await r.json();if(!valid(u.id)||u.is_anonymous===true){user=null;return false}user=u;return true}catch{user=null;return false}
}
function stopLive(){if(channel&&channelClient)try{channelClient.removeChannel(channel)}catch{}channel=null;channelClient=null;liveState='Polling'}
function nav(){for(const id of ['desktopNav','mobileNav']){const root=$('#'+id);if(!root)continue;let b=$('[data-vv10-nav]',root);if(!b){b=document.createElement('button');b.dataset.vv10Nav='1';b.innerHTML=svg('bell')+'<span>Inbox</span><span class="vv10-badge" hidden></span>';root.appendChild(b)}b.classList.toggle('on',showing);const badge=$('.vv10-badge',b);badge.hidden=unread===0;badge.textContent=unread>99?'99+':String(unread)}}
function open(){showing=true;document.body.classList.remove('vv3-open','vv4-open','earn-open','v8-open','v9-open','w6-open');document.body.classList.add('vv10-open');for(const id of ['#vv3Panel','#vv4Panel','#vv5Monetization','#vv8Community','#vv9Live']){const x=$(id);if(x)x.hidden=true}all('video.feedVideo').forEach(v=>v.pause());p.hidden=false;history.replaceState(null,'',location.pathname+'#inbox');nav();render();load();scrollTo(0,0)}
function close(){if(!showing)return;showing=false;p.hidden=true;document.body.classList.remove('vv10-open');nav()}
function signin(){close();const link=$('[data-route="settings"]');if(link){link.click();setTimeout(()=>$('#view [data-action="auth"]')?.click(),280)}else location.assign('/#settings')}
function metric(title,num,note){return '<div class="vv10-metric"><small>'+title+'</small><strong>'+num+'</strong><span>'+note+'</span></div>'}
function notice(n){const a=people[n.actor_id]||{},name=a.display_name||a.username||'A creator',message=n.event_type==='follow'?'started following you':n.event_type==='like'?'liked your video':'commented on your video';
return '<article class="vv10-notification '+(!n.read_at?'is-new':'')+'"><div class="vv10-avatar">'+esc(name.charAt(0).toUpperCase())+'</div><div class="vv10-noticebody"><p><b>'+esc(name)+'</b> '+message+'</p><small>@'+esc(a.username||'creator')+' · '+ago(n.created_at)+'</small><div class="vv10-actions">'+(n.video_id?'<a href="/?v='+encodeURIComponent(n.video_id)+'#home">View video</a>':'')+(!n.read_at?'<button data-vv10-read="'+esc(n.id)+'">Mark read</button>':'')+'</div></div>'+(!n.read_at?'<span class="vv10-dot"></span>':'')+'</article>'}
function inbox(){return '<div class="vv10-bar"><div><h2>Creator notifications</h2><p>Real followers, likes and comments on your public videos.</p></div><button class="vv10-button" data-vv10-action="markall" '+(!unread?'disabled':'')+'>Mark all read</button></div><div class="vv10-signal">'+svg('bell')+' '+fmt(unread)+' unread · '+(liveState==='Connected'?'Live updates connected':'Automatically refreshed')+'</div>'+
(notifications.length?notifications.map(notice).join(''):'<div class="vv10-empty">'+svg('bell')+'<h3>Your inbox is empty</h3><p>Notifications will arrive when other signed-in creators interact with your account.</p></div>')}
function saves(){const map=new Map(clips.map(v=>[v.id,v]));return '<div class="vv10-bar"><div><h2>Saved in the cloud</h2><p>Your own private bookmarks, available on other devices after sign-in.</p></div><button data-vv10-action="refresh" class="vv10-button">Refresh</button></div>'+
(saved.length?saved.map(b=>{const v=map.get(b.video_id);return '<article class="vv10-saved"><div class="vv10-cover">'+svg('video')+'</div><div><b>'+esc(v?.caption||'Saved video')+'</b><small>Saved '+ago(b.created_at)+'</small><div class="vv10-actions"><a href="/?v='+encodeURIComponent(b.video_id)+'#home">Play video</a> <button data-vv10-remove="'+esc(b.video_id)+'">Remove bookmark</button></div></div></article>'}).join(''):'<div class="vv10-empty">'+svg('bookmark')+'<h3>No saved videos yet</h3><p>Bookmark a real public video in the VibeVerse feed to save it to your account.</p></div>')+
'<div class="vv10-note">Cloud bookmarks are private. Example videos and device-only drafts are not transferred automatically.</div>'}
function creator(){const owned=clips.filter(v=>v.user_id===user.id&&v.visibility==='public'),views=owned.reduce((s,v)=>s+(Number(viewMap[v.id])||0),0);return '<div class="vv10-bar"><div><h2>My real creator statistics</h2><p>Records from your Supabase account, not estimates or sample earnings.</p></div><button data-vv10-action="refresh" class="vv10-button">Refresh</button></div>'+
'<div class="vv10-metrics">'+metric('Followers',followers===null?'Unavailable':fmt(followers),'Real accounts')+metric('Following',following===null?'Unavailable':fmt(following),'Creators followed')+metric('Public videos',fmt(owned.length)+(owned.length===60?'+':''),'Latest 60 uploaded clips')+metric('View events',fmt(views),'Across these public clips')+'</div>'+
'<section class="vv10-panel"><h3>My public videos</h3>'+(owned.length?owned.slice(0,22).map(v=>'<div class="vv10-video"><div><b>'+esc(v.caption||'Untitled video')+'</b><small>'+new Date(v.created_at).toLocaleDateString('en-NG',{month:'short',day:'numeric'})+'</small></div><span>'+fmt(viewMap[v.id])+' views</span><a href="/?v='+encodeURIComponent(v.id)+'#home">Open</a></div>').join(''):'<div class="vv10-empty">No public videos have been uploaded on this account yet.</div>')+'</section>'+
'<div class="vv10-note">These views are daily-deduplicated account events, not certified unique human viewers. Stronger bot and abuse protection is required before a large public launch.</div>'}
function safety(){return '<div class="vv10-bar"><div><h2>Privacy & safety</h2><p>Review how your social activity and account data are handled.</p></div></div><div class="vv10-columns">'+[
['Private notifications','Only you can read your account notifications or mark them as read.'],
['Cloud bookmarks','Only the signed-in user can view and manage their saved-video list.'],
['Reporting','Use Report on videos to flag inappropriate material. A trained moderation team is required before opening the platform widely.'],
['Payments','Gift purchases, withdrawals and verified earnings remain off until approved payment onboarding and refund protections are complete.']
].map(([a,b])=>'<section class="vv10-panel"><h3>'+svg('shield')+' '+a+'</h3><p>'+b+'</p></section>').join('')+'</div>'}
function render(){if(!showing)return;
p.innerHTML='<div class="vv10-wrap"><header class="vv10-hero"><div class="vv10-eyebrow">VIBEVERSE · SOCIAL NETWORK 10.0</div><h1>Your creator <em>community.</em></h1><p>Discover authentic account activity, manage saved videos and understand your audience.</p><div class="vv10-user">'+svg(user?'check':'lock')+' '+(user?'Signed in · '+esc(user.email||'Creator'):'Sign in to unlock your personal inbox')+'</div></header>'+
'<nav class="vv10-tabs">'+[['inbox','bell','Notifications'],['saved','bookmark','Cloud saves'],['creator','chart','Creator stats'],['safety','shield','Safety']].map(([id,ic,lab])=>'<button class="'+(tab===id?'selected':'')+'" data-vv10-tab="'+id+'">'+svg(ic)+lab+(id==='inbox'&&unread?'<span class="vv10-tabcount">'+fmt(unread)+'</span>':'')+'</button>').join('')+'</nav>'+
(user?(tab==='inbox'?inbox():tab==='saved'?saves():tab==='creator'?creator():safety()):'<section class="vv10-signin">'+svg('user')+'<h2>Sign in to your VibeVerse account</h2><p>To view real notifications, bookmarks and statistics, create an account or sign in through Settings.</p><button class="vv10-button primary" data-vv10-action="signin">Open sign in</button></section>')+
'<footer class="vv10-footer">VibeVerse 10.0 · Notifications and bookmarks are stored securely in Supabase. Real financial transactions are not enabled.</footer></div>';
}
async function count(col,field,uid){try{const r=await rest(col+'?select='+field+'&'+field+'=eq.'+uid+'&limit=1',{method:'HEAD',headers:{Prefer:'count=exact'}});const n=r.headers.get('content-range')?.split('/').at(-1);return /^\d+$/.test(n||'')?Number(n):null}catch{return null}}
async function load(){
 if(loading)return;loading=true;
 try{
  const old=user?.id||null;
  if(!await checkAuth()){notifications=[];saved=[];clips=[];people={};viewMap={};followers=following=null;unread=0;if(old)stopLive();render();nav();return}
  if(old!==user.id)stopLive();
  const uid=user.id;
  const [ni,bi,vi,fc,fg]=await Promise.all([
   rest('vv_notifications?select=id,actor_id,recipient_id,event_type,video_id,created_at,read_at&recipient_id=eq.'+uid+'&order=created_at.desc&limit=80'),
   rest('vv_bookmarks?select=video_id,created_at&user_id=eq.'+uid+'&order=created_at.desc&limit=80'),
   rest('videos?select=id,user_id,caption,visibility,created_at&user_id=eq.'+uid+'&visibility=eq.public&order=created_at.desc&limit=60'),
   count('follows','following_id',uid),count('follows','follower_id',uid)
  ]);
  notifications=ni.data||[];saved=bi.data||[];clips=vi.data||[];followers=fc;following=fg;
  const authors=[...new Set(notifications.map(n=>n.actor_id).filter(valid))];
  if(authors.length){const rs=await rest('profiles?select=id,username,display_name&id=in.('+authors.join(',')+')');people=Object.fromEntries((rs.data||[]).map(a=>[a.id,a]))}else people={};
  const bookmarkIds=saved.map(s=>s.video_id).filter(valid);
  if(bookmarkIds.length){const rs=await rest('videos?select=id,user_id,caption,visibility,created_at&id=in.('+bookmarkIds.join(',')+')');const existing=new Set(clips.map(v=>v.id));for(const c of rs.data||[])if(!existing.has(c.id))clips.push(c)}
  const owned=clips.filter(v=>v.user_id===uid&&v.visibility==='public').map(v=>v.id).filter(valid);
  viewMap={};if(owned.length){const rs=await rest('vv_video_metrics?select=video_id,verified_views&video_id=in.('+owned.join(',')+')');for(const n of rs.data||[])viewMap[n.video_id]=Number(n.verified_views)||0}
  unread=notifications.filter(n=>!n.read_at).length;lastLoaded=Date.now();nav();render();if(!channel)subscribe();
 }catch(e){console.warn('Creator Inbox load failed',e);if(showing)toast('The social network could not load. Try refreshing.')}
 finally{loading=false}
}
function subscribe(){if(!user||!window.supabase?.createClient||!config)return;try{
 channelClient=window.supabase.createClient(config.url,config.key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 channelClient.realtime.setAuth(token());
 channel=channelClient.channel('vv-social-'+user.id).on('postgres_changes',{event:'INSERT',schema:'public',table:'vv_notifications',filter:'recipient_id=eq.'+user.id},()=>load()).subscribe(s=>{liveState=s==='SUBSCRIBED'?'Connected':'Polling';if(showing)render()});
 }catch(e){console.warn('Realtime channel failed; polling remains available',e);liveState='Polling'}
}
async function mark(id,all){if(!user)return;try{
 const url=all?'vv_notifications?recipient_id=eq.'+user.id+'&read_at=is.null':'vv_notifications?recipient_id=eq.'+user.id+'&id=eq.'+id;
 await rest(url,{method:'PATCH',body:{read_at:new Date().toISOString()},headers:{Prefer:'return=minimal'}});await load();toast('Notifications updated')
 }catch(e){toast('Could not mark notification as read')}}
async function remove(id){if(!user||!valid(id))return;try{
 await rest('vv_bookmarks?user_id=eq.'+user.id+'&video_id=eq.'+id,{method:'DELETE',headers:{Prefer:'return=minimal'}});
 saved=saved.filter(x=>x.video_id!==id);
 const old=JSON.parse(localStorage.getItem('vv2_bookmarks')||'[]');localStorage.setItem('vv2_bookmarks',JSON.stringify(old.filter(x=>x!==id)));
 render();toast('Bookmark removed from your cloud account')
 }catch(e){toast('Could not remove the cloud bookmark')}}
async function syncBookmark(id){if(!valid(id)||!user||!config)return;let state=false;try{state=JSON.parse(localStorage.getItem('vv2_bookmarks')||'[]').includes(id)}catch{}
 try{if(state)await rest('vv_bookmarks?on_conflict=user_id,video_id',{method:'POST',body:{user_id:user.id,video_id:id},headers:{Prefer:'resolution=ignore-duplicates,return=minimal'}});
 else await rest('vv_bookmarks?user_id=eq.'+user.id+'&video_id=eq.'+id,{method:'DELETE',headers:{Prefer:'return=minimal'}});
 if(showing&&tab==='saved')load();
 }catch(e){toast('Could not sync this save to the cloud')}
}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
 if(b.dataset.vv10Nav!==undefined){open();return}
 if(b.dataset.route!==undefined||b.dataset.xRoute!==undefined||b.dataset.vv4Route!==undefined||b.dataset.earnNav!==undefined||b.dataset.v8Nav!==undefined||b.dataset.v9Nav!==undefined)close();
},true);
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const d=b.dataset;
 if(d.vv10Tab){tab=d.vv10Tab;render();if(Date.now()-lastLoaded>14000)load();return}
 if(d.vv10Read){mark(d.vv10Read,false);return}
 if(d.vv10Remove){remove(d.vv10Remove);return}
 if(d.vv10Action==='markall')mark(null,true);
 if(d.vv10Action==='refresh')load();
 if(d.vv10Action==='signin')signin();
 if(d.bookmark&&valid(d.bookmark))setTimeout(()=>syncBookmark(d.bookmark),130);
});
for(const id of ['desktopNav','mobileNav']){const el=$('#'+id);if(el)new MutationObserver(nav).observe(el,{childList:true})}
if(location.hash==='#inbox')setTimeout(open,180);
setTimeout(load,1100);
setInterval(()=>{if(document.visibilityState==='visible'&&Date.now()-lastLoaded>28000)load()},30000);
window.addEventListener('storage',e=>{if(e.key?.includes('-auth-token')||e.key==='vv2_config')load()});
})();
