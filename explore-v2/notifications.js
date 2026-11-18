(()=>{'use strict';
const SUPABASE_URL='https://qngkwjhhykugjfkwoyam.supabase.co',KEY='sb_publishable__rfc1XG15o-nZ44zT2odpg_pvtQMxaM',PAGE=30;
const el=id=>document.getElementById(id);
const S={sb:null,user:null,items:[],profiles:new Map(),filter:'all',next:0,ended:false,busy:false,channel:null,refreshTimer:null,prefs:{follows:true,likes:true,comments:true,browser_alerts:false},prefsLoaded:false};
function safe(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function uuid(v){return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v||''))}
function userLink(id){return uuid(id)?'/creators.html?id='+encodeURIComponent(id):'/creators.html'}
function videoLink(id){return uuid(id)?'/explore.html?video='+encodeURIComponent(id):'/explore.html'}
function imageUrl(value){try{const url=new URL(String(value));return url.protocol==='https:'?url.href:null}catch{return null}}
function avatar(p){const src=imageUrl(p?.avatar_url);return '<span class="notice-avatar">'+(src?'<img loading="lazy" decoding="async" alt="" src="'+safe(src)+'">':safe((p?.display_name||p?.username||'V').trim().slice(0,1).toUpperCase()))+'</span>'}
function label(item){if(item.event_type==='follow')return 'started following you';if(item.event_type==='like')return 'liked your video';if(item.event_type==='comment')return 'commented on your video';return 'interacted with your content'}
function status(text){el('noticesStatus').textContent=text}
function updateUnread(){el('markAllRead').disabled=!S.user}
async function updateExactUnread(){
 if(!S.user)return;
 try{
  const r=await S.sb.from('vv_notifications').select('id',{count:'exact',head:true}).eq('recipient_id',S.user.id).is('read_at',null);
  if(r.error)throw r.error;
  const n=r.count??0;el('unreadCount').textContent=n?n+' unread notifications':'All caught up — 0 unread notifications';
  if(navigator.setAppBadge){if(n)navigator.setAppBadge(n).catch(()=>{});else navigator.clearAppBadge?.().catch(()=>{})}
 }catch{el('unreadCount').textContent='Unread count temporarily unavailable'}
}
function render(){
 const rows=S.items.filter(x=>S.filter==='all'||S.filter==='unread'&&!x.read_at||S.filter===x.event_type);
 const frag=document.createDocumentFragment();
 for(const item of rows){
  const p=S.profiles.get(item.actor_id)||null,name=p?.display_name||p?.username||'A creator';
  const article=document.createElement('article');article.className='notice'+(!item.read_at?' unread':'');
  const content=document.createElement('div');content.className='notice-content';
  const text=document.createElement('p');const actor=document.createElement('a');actor.href=userLink(item.actor_id);actor.textContent=name;
  text.append(actor,document.createTextNode(' '+label(item)));
  const time=document.createElement('small');time.textContent=new Date(item.created_at).toLocaleString();const actions=document.createElement('div');actions.className='notice-actions';
  const open=document.createElement('a');open.href=item.event_type==='follow'?userLink(item.actor_id):videoLink(item.video_id);open.textContent=item.event_type==='follow'?'View creator':'Find video';actions.append(open);
  if(!item.read_at){const b=document.createElement('button');b.type='button';b.textContent='Mark read';b.addEventListener('click',()=>markRead([item.id],b));actions.append(b)}
  content.append(text,time,actions);article.innerHTML=avatar(p);article.append(content);frag.append(article);
 }
 el('notices').replaceChildren(frag);
 el('empty').hidden=rows.length>0||S.busy;
 el('moreNotices').hidden=S.ended||!S.user;
 el('moreNotices').disabled=S.busy;
 updateUnread();updateExactUnread();
}
async function resolveProfiles(rows){
 const ids=[...new Set(rows.map(x=>x.actor_id).filter(uuid))].filter(id=>!S.profiles.has(id));if(!ids.length)return;
 const r=await S.sb.from('profiles').select('id,display_name,username,avatar_url').in('id',ids);
 if(!r.error)for(const p of r.data||[])S.profiles.set(p.id,p);
}
async function refresh(){
 if(S.busy||!S.user)return;
 S.items=[];S.next=0;S.ended=false;await loadMore();
}
async function loadMore(){
 if(!S.user||S.busy||S.ended)return;
 S.busy=true;el('moreNotices').disabled=true;status('Loading your private notifications…');
 try{
  const r=await S.sb.from('vv_notifications').select('id,actor_id,event_type,video_id,comment_id,created_at,read_at').eq('recipient_id',S.user.id).order('created_at',{ascending:false}).range(S.next,S.next+PAGE-1);
  if(r.error)throw r.error;
  const rows=r.data||[];S.next+=rows.length;S.ended=rows.length<PAGE;
  const byId=new Map(S.items.map(x=>[x.id,x]));for(const v of rows)byId.set(v.id,v);
  S.items=[...byId.values()].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  await resolveProfiles(rows);
  status(S.items.length?'Showing '+S.items.length+' real notifications.':'No account notifications yet.');
 }catch(e){status('Could not load notifications. Sign in again or check account verification.')}
 finally{S.busy=false;render()}
}
async function markAllUnread(button){
 if(!S.user)return;
 button.disabled=true;status('Marking unread notifications as read…');
 let changed=0,attempts=0;
 try{
  while(attempts++<25){
   const read=await S.sb.from('vv_notifications').select('id').eq('recipient_id',S.user.id).is('read_at',null).limit(80);
   if(read.error)throw read.error;
   const ids=(read.data||[]).map(n=>n.id);
   if(!ids.length)break;
   const stamp=new Date().toISOString();
   const updated=await S.sb.from('vv_notifications').update({read_at:stamp}).eq('recipient_id',S.user.id).in('id',ids).is('read_at',null);
   if(updated.error)throw updated.error;
   changed+=ids.length;
  }
  await refresh();
  const result=await S.sb.from('vv_notifications').select('id',{count:'exact',head:true}).eq('recipient_id',S.user.id).is('read_at',null);
  if(result.error)throw result.error;
  status(result.count?'Marked '+changed+' notifications read; '+result.count+' remain.':'All notifications marked read.');
 }catch{
  status('Could not finish marking all unread notifications. Refresh and retry.');
 }finally{button.disabled=false;updateExactUnread()}
}
async function markRead(ids,button){
 if(!S.user||!ids.length)return;
 button.disabled=true;
 const r=await S.sb.from('vv_notifications').update({read_at:new Date().toISOString()}).eq('recipient_id',S.user.id).in('id',ids);
 if(r.error){button.disabled=false;status('Could not mark notifications read. Please retry.');return}
 const set=new Set(ids);
 for(const n of S.items)if(set.has(n.id))n.read_at=new Date().toISOString();
 render();status(ids.length+' notification'+(ids.length===1?'':'s')+' marked read.');
}
async function loadPreferences(){
 if(!S.user)return;
 const result=await S.sb.from('vv_notification_preferences').select('follows,likes,comments,browser_alerts').eq('user_id',S.user.id).maybeSingle();
 el('notificationPreferences').hidden=false;
 if(result.error){el('prefsStatus').textContent='Could not load notification preferences. Retry from the Inbox.';return}
 if(result.data)S.prefs={follows:result.data.follows,likes:result.data.likes,comments:result.data.comments,browser_alerts:result.data.browser_alerts};
 S.prefsLoaded=true;
 el('prefFollows').checked=S.prefs.follows;
 el('prefLikes').checked=S.prefs.likes;
 el('prefComments').checked=S.prefs.comments;
 el('prefBrowser').checked=S.prefs.browser_alerts;
}
async function savePreferences(){
 if(!S.user)return;
 const button=el('savePrefs');
 const browserChoice=el('prefBrowser').checked;
 let allowed=browserChoice;
 if(browserChoice){
  if(!('Notification' in window)){allowed=false;el('prefsStatus').textContent='Browser notifications are not supported here. You can still save the other preferences.'}
  else if(Notification.permission!=='granted'){
   try{allowed=(await Notification.requestPermission())==='granted'}catch{allowed=false}
   if(!allowed)el('prefsStatus').textContent='Browser notifications were not permitted. Other preferences can still be saved.';
  }
 }
 el('prefBrowser').checked=allowed;
 const row={user_id:S.user.id,follows:el('prefFollows').checked,likes:el('prefLikes').checked,comments:el('prefComments').checked,browser_alerts:allowed,updated_at:new Date().toISOString()};
 button.disabled=true;
 try{
  const r=await S.sb.from('vv_notification_preferences').upsert(row,{onConflict:'user_id'});
  if(r.error)throw r.error;
  S.prefs={follows:row.follows,likes:row.likes,comments:row.comments,browser_alerts:row.browser_alerts};
  S.prefsLoaded=true;
  el('prefsStatus').textContent='Preferences saved for your VibeVerse account.';
 }catch{el('prefsStatus').textContent='Could not save preferences. Please retry.'}
 finally{button.disabled=false}
}
function alertIfAllowed(item){
 if(!item||!S.user||!S.prefsLoaded||!S.prefs.browser_alerts||document.visibilityState!=='hidden')return;
 const accepted={follow:S.prefs.follows,like:S.prefs.likes,comment:S.prefs.comments};
 if(accepted[item.event_type]!==true||!('Notification' in window)||Notification.permission!=='granted')return;
 try{
  const title='New VibeVerse '+(item.event_type==='follow'?'follower':item.event_type==='like'?'like':'comment');
  const message=item.event_type==='follow'?'Someone followed your profile':'You received a new interaction';
  const n=new Notification(title,{body:message,tag:'vv-alert-'+item.id});
  n.onclick=()=>{window.focus();location.href=item.event_type==='follow'?'/creators.html':'/notifications.html';n.close()};
 }catch{ /* Some mobile browsers do not support in-page Notification construction. */ }
}

async function checkPushSupport(){
 const label=el('pushReadinessStatus'),button=el('preparePushDevice');
 const secure=window.isSecureContext,worker=('serviceWorker' in navigator),push=('PushManager' in window),notice=('Notification' in window);
 if(!secure||!worker||!push||!notice){
  button.disabled=true;label.textContent='Background push is not supported in this browser or security context. The regular VibeVerse Inbox remains available.';return false;
 }
 if(Notification.permission==='denied'){
  button.disabled=true;label.textContent='Browser notifications are blocked. You can still use the Inbox; notification permission must be changed in browser settings.';return false;
 }
 button.disabled=!S.user;
 label.textContent=S.user?'This device supports push registration. You can prepare its worker, but background delivery is not configured yet.':'This device supports push, but you need to sign in before preparing it.';
 return true;
}
async function preparePushDevice(){
 if(!S.user)return;
 const supported=await checkPushSupport();if(!supported)return;
 const button=el('preparePushDevice');button.disabled=true;
 try{
  const registration=await navigator.serviceWorker.register('/push-worker.js',{scope:'/push/'});
  if(registration.active||registration.installing||registration.waiting){
   el('pushReadinessStatus').textContent='Device worker prepared successfully. Push subscriptions are not active yet; your VibeVerse Inbox still works.';
  }else{
   el('pushReadinessStatus').textContent='Device worker registered. It may finish installing shortly; push delivery is not active.';
  }
 }catch(e){
  el('pushReadinessStatus').textContent='Device preparation failed. Your browser may restrict service worker registration.';
 }finally{button.disabled=false}
}

function subscribe(){
 if(!S.user)return;
 if(S.channel){S.sb.removeChannel(S.channel);S.channel=null}
 S.channel=S.sb.channel('vv_inbox_'+S.user.id).on('postgres_changes',{event:'INSERT',schema:'public',table:'vv_notifications',filter:'recipient_id=eq.'+S.user.id},payload=>{
  alertIfAllowed(payload.new);
  if(S.refreshTimer!==null)clearTimeout(S.refreshTimer);
  S.refreshTimer=setTimeout(()=>{S.refreshTimer=null;refresh()},350);
 }).subscribe(state=>{el('liveState').textContent=state==='SUBSCRIBED'?'Live updates on':state==='CHANNEL_ERROR'||state==='TIMED_OUT'?'Manual refresh available':'Connecting';});
}
async function start(){
 if(!window.supabase?.createClient){status('Could not load VibeVerse sign-in services. Refresh and retry.');return}
 S.sb=window.supabase.createClient(SUPABASE_URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
 const {data,error}=await S.sb.auth.getUser();
 S.user=error?null:data?.user||null;el('accountLink').textContent=S.user?'Account':'Sign in';
 for(const b of document.querySelectorAll('[data-filter]'))b.addEventListener('click',()=>{S.filter=b.dataset.filter;for(const v of document.querySelectorAll('[data-filter]'))v.classList.toggle('active',v===b);render()});
 el('refreshNotices').addEventListener('click',refresh);
 el('moreNotices').addEventListener('click',loadMore);
 el('markAllRead').addEventListener('click',e=>markAllUnread(e.currentTarget));
 el('togglePrefs').addEventListener('click',()=>{const panel=el('prefsContent');panel.hidden=!panel.hidden;el('togglePrefs').setAttribute('aria-expanded',String(!panel.hidden))});
 el('savePrefs').addEventListener('click',savePreferences);
 el('checkPushSupport').addEventListener('click',checkPushSupport);
 el('preparePushDevice').addEventListener('click',preparePushDevice);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&S.user)refresh()});
 if(!S.user){status('Sign in to VibeVerse to see your private notifications.');el('liveState').textContent='Sign-in required';el('notices').innerHTML='<p class="notice-tip">You can sign in from the Account Center. Only your own account alerts will be displayed.</p>';el('empty').hidden=true;return}
 await Promise.all([loadMore(),loadPreferences()]);await checkPushSupport();subscribe();
}
start().catch(()=>status('Unable to load notifications. Please refresh.'));
})();