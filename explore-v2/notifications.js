(()=>{'use strict';
const SUPABASE_URL='https://qngkwjhhykugjfkwoyam.supabase.co',KEY='sb_publishable__rfc1XG15o-nZ44zT2odpg_pvtQMxaM',PAGE=30;
const el=id=>document.getElementById(id);
const S={sb:null,user:null,items:[],profiles:new Map(),filter:'all',next:0,ended:false,busy:false,channel:null,refreshTimer:null,prefs:{follows:true,likes:true,comments:true,browser_alerts:false,push_enabled:false},prefsLoaded:false};
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
 const result=await S.sb.from('vv_notification_preferences').select('follows,likes,comments,browser_alerts,push_enabled').eq('user_id',S.user.id).maybeSingle();
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
 const row={user_id:S.user.id,follows:el('prefFollows').checked,likes:el('prefLikes').checked,comments:el('prefComments').checked,browser_alerts:allowed,push_enabled:!!S.prefs.push_enabled,updated_at:new Date().toISOString()};
 button.disabled=true;
 try{
  const r=await S.sb.from('vv_notification_preferences').upsert(row,{onConflict:'user_id'});
  if(r.error)throw r.error;
  S.prefs={follows:row.follows,likes:row.likes,comments:row.comments,browser_alerts:row.browser_alerts,push_enabled:row.push_enabled};
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

const PUSH_PUBLIC_KEY_URL='https://qngkwjhhykugjfkwoyam.supabase.co/functions/v1/vv-web-push?action=key';
function decodePushKey(value){
 const b=String(value).replace(/-/g,'+').replace(/_/g,'/');
 return Uint8Array.from(atob(b.padEnd(Math.ceil(b.length/4)*4,'=')),ch=>ch.charCodeAt(0));
}
async function currentDevice(){
 const r=await navigator.serviceWorker.getRegistration('/push/');
 return r?{registration:r,subscription:await r.pushManager.getSubscription()}:null;
}
async function checkPushSupport(){
 const msg=el('pushReadinessStatus'),enable=el('preparePushDevice'),disable=el('disablePushDevice'),repair=el('repairPushDevice'),test=el('testPushDevice');
 disable.hidden=true;repair.hidden=true;test.hidden=true;enable.disabled=true;
 if(!window.isSecureContext||!('PushManager' in window)||!('serviceWorker' in navigator)||!('Notification' in window)){
  msg.textContent='This browser does not support background push. The regular Inbox is still available.';return false;
 }
 if(Notification.permission==='denied'){msg.textContent='Notifications are blocked by your browser. You may change permissions in browser settings.';return false}
 if(!S.user){msg.textContent='Sign in to VibeVerse first to enable device push notifications.';return true}
 try{const found=await currentDevice();if(found?.subscription){
  const existing=await S.sb.from('vv_push_subscriptions').select('id').eq('user_id',S.user.id).eq('endpoint',found.subscription.endpoint).maybeSingle();
  disable.hidden=false;
  if(existing.error){msg.textContent='Could not verify the device on the server. Try again shortly.';return true}
  if(!existing.data){
    repair.hidden=false;
    msg.textContent='The browser has a push subscription but VibeVerse no longer has its record. Select Repair device to restore it.';
  }else{
    test.hidden=false;
    msg.textContent='This device is registered. You can send a test notification to confirm the push gateway accepts it.';
  }
  return true;
 }}catch{}
 enable.disabled=false;msg.textContent='This browser supports push. Select Enable background push to approve and register this device.';return true;
}
async function preparePushDevice(){
 if(!S.user||!window.isSecureContext||!('PushManager' in window)||!('serviceWorker' in navigator)||!('Notification' in window))return;
 const b=el('preparePushDevice');b.disabled=true;
 try{
  if(Notification.permission!=='granted'){
   const permission=await Notification.requestPermission();
   if(permission!=='granted')throw Error('Notification permission was not granted.');
  }
  el('pushReadinessStatus').textContent='Registering this device…';
  const response=await fetch(PUSH_PUBLIC_KEY_URL,{cache:'no-store'});
  if(!response.ok)throw Error('The push service is temporarily unavailable.');
  const body=await response.json();if(!body.ready||!body.publicKey)throw Error('The push service is not configured.');
  const registration=await navigator.serviceWorker.register('/push-worker.js',{scope:'/push/'});
  let subscription=await registration.pushManager.getSubscription();
  if(!subscription)subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodePushKey(body.publicKey)});
  const values=subscription.toJSON();
  if(!subscription.endpoint||!values.keys?.p256dh||!values.keys?.auth)throw Error('Incomplete device subscription returned.');
  const saved=await S.sb.from('vv_push_subscriptions').upsert({user_id:S.user.id,endpoint:subscription.endpoint,p256dh:values.keys.p256dh,auth_secret:values.keys.auth,device_label:'Current browser',updated_at:new Date().toISOString()},{onConflict:'user_id,endpoint'});
  if(saved.error)throw Error('The secure database could not save the device. Retry.');
  const update=await S.sb.from('vv_notification_preferences').upsert({user_id:S.user.id,follows:S.prefs.follows,likes:S.prefs.likes,comments:S.prefs.comments,browser_alerts:S.prefs.browser_alerts,push_enabled:true,updated_at:new Date().toISOString()},{onConflict:'user_id'});
  if(update.error)throw Error('Could not enable push in account preferences.');
  S.prefs.push_enabled=true;
  el('pushReadinessStatus').textContent='Background push enabled for this device. Eligible new activity can trigger a notification.';
 }catch(e){el('pushReadinessStatus').textContent=String(e?.message||'Could not register this device.')}
 finally{await checkPushSupport()}
}
async function repairPushDevice(){
 if(!S.user||!('serviceWorker' in navigator))return;
 const b=el('repairPushDevice');b.disabled=true;
 try{
  const device=await currentDevice();if(!device?.subscription)throw Error('No browser subscription to repair.');
  const values=device.subscription.toJSON();
  if(!values.keys?.p256dh||!values.keys?.auth)throw Error('The browser subscription is incomplete. Disable and re-enable push.');
  const save=await S.sb.from('vv_push_subscriptions').upsert({user_id:S.user.id,endpoint:device.subscription.endpoint,p256dh:values.keys.p256dh,auth_secret:values.keys.auth,device_label:'Current browser',updated_at:new Date().toISOString()},{onConflict:'user_id,endpoint'});
  if(save.error)throw Error('VibeVerse could not restore this device. Try again.');
  el('pushReadinessStatus').textContent='Device record restored. You can send a test notification.';
 }catch(e){el('pushReadinessStatus').textContent=String(e?.message||'Device repair failed.')}
 finally{b.disabled=false;await checkPushSupport()}
}
async function testPushDevice(){
 if(!S.user||!('serviceWorker' in navigator))return;
 const b=el('testPushDevice');b.disabled=true;
 try{
  const device=await currentDevice();if(!device?.subscription)throw Error('This browser is not subscribed.');
  const session=await S.sb.auth.getSession();
  const access=session.data?.session?.access_token;
  if(!access)throw Error('Sign in again to send a test notification.');
  el('pushReadinessStatus').textContent='Sending the test notification to the push gateway…';
  const response=await fetch('https://qngkwjhhykugjfkwoyam.supabase.co/functions/v1/vv-web-push?action=test',{
   method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+access},
   body:JSON.stringify({endpoint:device.subscription.endpoint})
  });
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(result.error||'The push test failed.');
  el('pushReadinessStatus').textContent=result.acceptedByPushService?'The push gateway accepted the test. Check your device notifications; delivery to the screen is not yet verified.':'No test notification was sent.';
 }catch(e){el('pushReadinessStatus').textContent=String(e?.message||'The push test failed.')}
 finally{b.disabled=false}
}
async function disablePushDevice(){
 if(!S.user||!('serviceWorker' in navigator))return;
 const b=el('disablePushDevice');b.disabled=true;
 try{
  const device=await currentDevice();if(!device?.subscription)throw Error('No device subscription found.');
  const endpoint=device.subscription.endpoint;
  if(!await device.subscription.unsubscribe())throw Error('The browser could not unsubscribe this device.');
  const del=await S.sb.from('vv_push_subscriptions').delete().eq('user_id',S.user.id).eq('endpoint',endpoint);
  if(del.error)throw Error('Could not clear the server subscription.');
  const other=await S.sb.from('vv_push_subscriptions').select('id',{count:'exact',head:true}).eq('user_id',S.user.id);
  if(!other.error&&other.count===0){
   const pref=await S.sb.from('vv_notification_preferences').update({push_enabled:false,updated_at:new Date().toISOString()}).eq('user_id',S.user.id);
   if(!pref.error)S.prefs.push_enabled=false;
  }
  el('pushReadinessStatus').textContent='Push disabled for this device. Your Inbox still works.';
 }catch(e){el('pushReadinessStatus').textContent=String(e?.message||'Could not disable push.')}
 finally{b.disabled=false;await checkPushSupport()}
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
 el('disablePushDevice').addEventListener('click',disablePushDevice);
 el('repairPushDevice').addEventListener('click',repairPushDevice);
 el('testPushDevice').addEventListener('click',testPushDevice);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&S.user)refresh()});
 if(!S.user){status('Sign in to VibeVerse to see your private notifications.');el('liveState').textContent='Sign-in required';el('notices').innerHTML='<p class="notice-tip">You can sign in from the Account Center. Only your own account alerts will be displayed.</p>';el('empty').hidden=true;return}
 await Promise.all([loadMore(),loadPreferences()]);await checkPushSupport();subscribe();
}
start().catch(()=>status('Unable to load notifications. Please refresh.'));
})();