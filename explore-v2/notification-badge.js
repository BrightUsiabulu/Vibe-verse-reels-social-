(()=>{'use strict';
if(window.__vvUnreadBadgeStarted)return;window.__vvUnreadBadgeStarted=true;
const BASE='https://qngkwjhhykugjfkwoyam.supabase.co',KEY='sb_publishable__rfc1XG15o-nZ44zT2odpg_pvtQMxaM';
let client=null,userId=null,channel=null,timer=null,count=0,booting=false;
const target='.topRight [data-route="activity"],.mobileHeader [data-route="activity"]';
function attach(){
 for(const button of document.querySelectorAll(target)){
  let dot=button.querySelector('.vv-unread-dot');
  if(!dot){dot=document.createElement('span');dot.className='vv-unread-dot';dot.setAttribute('aria-hidden','true');button.style.position='relative';button.append(dot)}
  dot.textContent=count>99?'99+':count>0?String(count):'';
  dot.style.cssText='position:absolute;top:-4px;right:-5px;min-width:16px;height:16px;padding:0 3px;border-radius:10px;background:#f04c72;color:white;font:700 10px/16px system-ui;text-align:center;pointer-events:none;box-sizing:border-box;display:'+(count?'block':'none');
  button.setAttribute('aria-label',count?('Notifications: '+count+' unread'):'Notifications');
 }
 const nav=document.querySelector('#mobileNav');
 if(nav){
  let link=nav.querySelector('[data-vv-inbox-link]');
  if(!link){
   link=document.createElement('a');link.href='/notifications.html';link.dataset.vvInboxLink='1';link.textContent='Inbox';link.style.cssText='display:flex;align-items:center;justify-content:center;gap:4px;font-size:11px;color:inherit;text-decoration:none;padding:5px 7px;min-height:36px';nav.append(link);
  }
  const label=count?('Inbox '+(count>99?'99+':count)):'Inbox';link.textContent=label;link.setAttribute('aria-label',count?'Inbox with '+count+' unread notifications':'Notification Inbox');
 }
}
function paint(n){count=Math.max(0,Number(n)||0);attach()}
async function queryUnread(){
 if(!client||!userId){paint(0);return}
 try{const r=await client.from('vv_notifications').select('id',{count:'exact',head:true}).eq('recipient_id',userId).is('read_at',null);if(!r.error)paint(r.count??0)}
 catch{}
}
function schedule(){if(timer!==null)clearTimeout(timer);timer=setTimeout(()=>{timer=null;queryUnread()},300)}
function subscribe(){
 if(channel){client.removeChannel(channel);channel=null}
 if(!userId){paint(0);return}
 channel=client.channel('vv_nav_unread_'+userId).on('postgres_changes',{event:'*',schema:'public',table:'vv_notifications',filter:'recipient_id=eq.'+userId},schedule).subscribe();
 queryUnread();
}
async function setUser(){
 if(!client)return;
 try{const r=await client.auth.getUser(),uid=r.data?.user?.id||null;if(uid!==userId){userId=uid;subscribe()}else queryUnread()}catch{userId=null;subscribe()}
}
function installClient(){
 if(!window.supabase?.createClient)return false;
 client=window.supabase.createClient(BASE,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
 client.auth.onAuthStateChange(()=>{queueMicrotask(setUser)});
 setUser();return true;
}
function sdk(){
 if(installClient())return;
 if(document.querySelector('script[data-vv-badge-sdk]')){
  document.querySelector('script[data-vv-badge-sdk]').addEventListener('load',installClient,{once:true});return;
 }
 const el=document.createElement('script');el.dataset.vvBadgeSdk='1';
 el.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/dist/umd/supabase.min.js';
 el.integrity='sha384-gnyZit14c5lnGcarmA166QQjjJXpucw25ogZXuwH3HxxY904zHkBqmxVpelsPorb';el.crossOrigin='anonymous';
 el.onload=installClient;el.onerror=()=>paint(0);document.head.append(el);
}
const nav=document.querySelector('#mobileNav');
if(nav)new MutationObserver(attach).observe(nav,{childList:true});
const bar=document.querySelector('.mobileHeader');
if(bar)new MutationObserver(attach).observe(bar,{childList:true});
const top=document.querySelector('.topRight');
if(top)new MutationObserver(attach).observe(top,{childList:true});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setUser()});
window.addEventListener('pageshow',setUser);
attach();sdk();
})();