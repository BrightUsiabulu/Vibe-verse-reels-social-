'use strict';
/* Isolated VibeVerse push worker for explicitly subscribed devices; the offline worker is unchanged. */
self.addEventListener('push',event=>{
 event.waitUntil((async()=>{
  if(!(self.registration&&typeof self.registration.showNotification==='function'))return;
  let payload={};
  try{if(event.data)payload=event.data.json()}catch{payload={}}
  const kind=String(payload.type||'activity').toLowerCase();
  const known=['follow','like','comment'].includes(kind);
  const title=known?'VibeVerse '+(kind==='follow'?'Follower':kind==='like'?'Like':'Comment'):'VibeVerse notification';
  const body='You have new activity in your VibeVerse Inbox.';
  const url='/notifications.html';
  await self.registration.showNotification(title,{body,icon:'/icon-192.png',badge:'/icon-192.png',tag:'vv-push-'+String(payload.id||'activity').slice(0,64),data:{url}});
 })());
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 event.waitUntil((async()=>{
  const target=new URL('/notifications.html',self.location.origin);
  const clientsList=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  for(const client of clientsList){
   try{if(new URL(client.url).origin===target.origin){await client.focus();if(client.navigate)await client.navigate(target.href);return}}catch{}
  }
  await self.clients.openWindow(target.href);
 })());
});
