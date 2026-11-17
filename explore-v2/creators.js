(()=>{'use strict';
const BASE='https://qngkwjhhykugjfkwoyam.supabase.co', KEY='sb_publishable__rfc1XG15o-nZ44zT2odpg_pvtQMxaM', PAGE=18;
const el=id=>document.getElementById(id);
const data={sb:null,sessionUser:null,profiles:[],next:0,ended:false,busy:false,followIds:new Set(),followerCounts:new Map(),selected:null,profilePostFilter:'all',creatorPosts:[],socialRequest:0};
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function imageUrl(src){try{const u=new URL(String(src));return u.protocol==='https:'?u.href:null}catch{return null}}
function setStatus(s){el('creatorStatus').textContent=s}
function initials(p){const s=(p.display_name||p.username||'V').trim();return Array.from(s)[0]?.toUpperCase()||'V'}
function avatar(p){const u=imageUrl(p.avatar_url);return '<div class="creator-avatar">'+(u?'<img loading="lazy" decoding="async" alt="" src="'+safe(u)+'">':safe(initials(p)))+'</div>'}
function name(p){return p.display_name||p.username||'Creator'}
function handle(p){return p.username?'@'+p.username:'VibeVerse creator'}
function uuid(v){return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v||''))}
async function login(){const r=await data.sb.auth.getUser();data.sessionUser=r.data?.user||null;el('accountLink').textContent=data.sessionUser?'Account':'Sign in';el('showNotifications').hidden=!data.sessionUser;return data.sessionUser}
async function counts(profiles){
 const ids=profiles.map(x=>x.id);if(!ids.length)return;
 const result=await data.sb.from('follows').select('following_id').in('following_id',ids);
 if(result.error)return;
 for(const id of ids)data.followerCounts.set(id,0);
 for(const row of result.data||[])data.followerCounts.set(row.following_id,(data.followerCounts.get(row.following_id)||0)+1);
}
async function myFollows(){
 if(!data.sessionUser){data.followIds=new Set();return}
 const r=await data.sb.from('follows').select('following_id').eq('follower_id',data.sessionUser.id).limit(1000);
 if(!r.error)data.followIds=new Set((r.data||[]).map(x=>x.following_id));
}
function renderCard(p){
 const card=document.createElement('article');card.className='creator-card';
 const own=data.sessionUser?.id===p.id,following=data.followIds.has(p.id);
 card.innerHTML='<div class="creator-head">'+avatar(p)+'<div><div class="creator-name">'+safe(name(p))+'</div><div class="creator-handle">'+safe(handle(p))+'</div></div></div>'+
  '<p class="creator-bio">'+safe(p.bio?.trim()||'Creating on VibeVerse')+'</p>'+
  '<div class="creator-stats"><button type="button" class="count-link" data-list="followers"><strong>'+Number(data.followerCounts.get(p.id)||0)+'</strong> followers</button><button type="button" class="count-link" data-list="following">Following</button></div>'+
  '<div class="creator-actions"><a href="/creators.html?id='+encodeURIComponent(p.id)+'" aria-label="View profile of '+safe(name(p))+'">View profile</a>'+
  (own?'':data.sessionUser?'<button type="button" class="follow" data-follow="'+safe(p.id)+'">'+(following?'Following':'Follow')+'</button>':'<a href="/account.html" aria-label="Sign in to follow creators">Sign in to follow</a>')+'</div>';
 const b=card.querySelector('[data-follow]');if(b)b.addEventListener('click',()=>toggleFollow(p,b));for(const link of card.querySelectorAll('[data-list]'))link.addEventListener('click',()=>showConnections(p,link.dataset.list));return card;
}
function render(){
 const term=el('creatorSearch').value.trim().toLocaleLowerCase();
 const visible=data.profiles.filter(p=>[p.username,p.display_name,p.bio].join(' ').toLocaleLowerCase().includes(term));
 const out=document.createDocumentFragment();for(const p of visible)out.append(renderCard(p));el('creatorList').replaceChildren(out);
 el('creatorEmpty').hidden=visible.length>0||data.busy;
 el('moreCreators').hidden=data.ended;
 el('moreCreators').disabled=data.busy;
 el('profileCount').textContent=data.profiles.length+' public creator profiles loaded';
}
async function loadMore(){
 if(data.busy||data.ended)return;
 data.busy=true;el('moreCreators').disabled=true;setStatus('Loading public creators…');
 try{
  const r=await data.sb.from('profiles').select('id,username,display_name,avatar_url,bio,updated_at').order('created_at',{ascending:false}).range(data.next,data.next+PAGE-1);
  if(r.error)throw r.error;
  const incoming=r.data||[],ids=new Set(data.profiles.map(x=>x.id));
  for(const p of incoming)if(!ids.has(p.id))data.profiles.push(p);
  data.next+=incoming.length;data.ended=incoming.length<PAGE;
  await Promise.all([counts(incoming),myFollows()]);
  setStatus(data.profiles.length?'Select a creator to view public posts.':'No public creator profiles found.');
 }catch(e){setStatus('Could not load profiles: '+(e.message||'Connection unavailable'))}
 finally{data.busy=false;render()}
}
async function toggleFollow(p,button){
 if(!data.sessionUser){location.assign('/account.html');return}
 if(data.sessionUser.id===p.id)return;
 button.disabled=true;
 const following=data.followIds.has(p.id);
 const r=following
  ?await data.sb.from('follows').delete().eq('follower_id',data.sessionUser.id).eq('following_id',p.id)
  :await data.sb.from('follows').insert({follower_id:data.sessionUser.id,following_id:p.id});
 if(r.error){setStatus('Could not update follow. Please sign in again or check account verification.');button.disabled=false;return}
 if(following)data.followIds.delete(p.id);else data.followIds.add(p.id);
 data.followerCounts.set(p.id,Math.max(0,(data.followerCounts.get(p.id)||0)+(following?-1:1)));
 render();if(data.selected?.id===p.id)showSelected(p);
}
async function publicPosts(p){
 const [v,f]=await Promise.all([
  data.sb.from('videos').select('id,caption,video_url,created_at').eq('user_id',p.id).eq('visibility','public').order('created_at',{ascending:false}).limit(12),
  data.sb.from('vv_photo_posts').select('id,caption,image_path,created_at').eq('user_id',p.id).eq('moderation_state','visible').order('created_at',{ascending:false}).limit(12)
 ]);
 const results=[...(v.data||[]).map(x=>({...x,type:'video'})),...(f.data||[]).map(x=>({...x,type:'photo'}))].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
 return results;
}
async function showSelected(p){
 data.selected=p;const container=el('featured');container.hidden=false;
 const own=data.sessionUser?.id===p.id;
 container.innerHTML='<div class="eyebrow">CREATOR PROFILE</div><div class="creator-head">'+avatar(p)+'<div><h2>'+safe(name(p))+'</h2><div class="creator-handle">'+safe(handle(p))+'</div></div></div>'+
  '<p class="creator-bio">'+safe(p.bio||'No biography provided')+'</p>'+
  '<div class="creator-stats"><button type="button" class="count-link" data-list="followers">'+Number(data.followerCounts.get(p.id)||0)+' followers</button><button type="button" class="count-link" data-list="following">Following</button></div>'+
  '<div class="creator-actions"><a href="/creators.html">All creators</a>'+
  (own?'':data.sessionUser?'<button type="button" class="follow" id="profileFollow">'+(data.followIds.has(p.id)?'Following':'Follow')+'</button>':'<a href="/account.html">Sign in to follow</a>')+'</div>'+
  '<h2 style="margin-top:24px">Public posts</h2><div class="profile-tabs" role="group" aria-label="Creator post type"><button type="button" class="active" data-post-filter="all">All posts</button><button type="button" data-post-filter="video">Videos</button><button type="button" data-post-filter="photo">Photos</button></div><p id="creatorMediaStatus" class="status">Loading public posts…</p><div class="profile-posts" id="profilePosts"></div>';
 const b=el('profileFollow');if(b)b.addEventListener('click',()=>toggleFollow(p,b));for(const link of container.querySelectorAll('[data-list]'))link.addEventListener('click',()=>showConnections(p,link.dataset.list));data.profilePostFilter='all';for(const button of container.querySelectorAll('[data-post-filter]'))button.addEventListener('click',()=>{data.profilePostFilter=button.dataset.postFilter;for(const item of container.querySelectorAll('[data-post-filter]'))item.classList.toggle('active',item===button);renderProfilePosts()});
 try{
  const posts=await publicPosts(p);
  if(data.selected?.id!==p.id)return;
  data.creatorPosts=posts;
  renderProfilePosts();
 }catch{el('creatorMediaStatus').textContent='Could not load this creator’s public posts.'}
}
function renderProfilePosts(){
 const root=el('profilePosts');if(!root)return;
 const posts=data.creatorPosts.filter(p=>data.profilePostFilter==='all'||p.type===data.profilePostFilter);
 const out=document.createDocumentFragment();
 for(const post of posts){
  const card=document.createElement('article');card.className='profile-post';
  const src=post.type==='video'?imageUrl(post.video_url):BASE+'/storage/v1/object/public/post-images/'+String(post.image_path||'').split('/').map(encodeURIComponent).join('/');
  card.innerHTML='<span class="media-tag">'+(post.type==='video'?'VIDEO':'PHOTO')+'</span>'+(src?(post.type==='video'?'<video src="'+safe(src)+'" controls preload="none" playsinline></video>':'<img src="'+safe(src)+'" alt="Creator photo" loading="lazy" decoding="async">'):'<p>Media unavailable</p>')+'<p>'+safe(post.caption||'Untitled post')+'</p>';
  out.append(card);
 }
 root.replaceChildren(out);
 el('creatorMediaStatus').textContent=posts.length?posts.length+' visible '+(data.profilePostFilter==='all'?'public posts':data.profilePostFilter==='video'?'videos':'photos'):'No '+(data.profilePostFilter==='all'?'public posts':data.profilePostFilter==='video'?'public videos':'public photos')+' to show.';
}
async function showConnections(p,kind){
 const token=++data.socialRequest, panel=el('socialPanel');panel.hidden=false;
 el('socialHeading').textContent=(kind==='followers'?'Followers of ':'Following · ')+name(p);
 el('socialStatus').textContent='Loading real connections…';el('socialList').replaceChildren();
 try{
  const col=kind==='followers'?'following_id':'follower_id',other=kind==='followers'?'follower_id':'following_id';
  const r=await data.sb.from('follows').select(other).eq(col,p.id).order('created_at',{ascending:false}).limit(60);
  if(r.error)throw r.error;
  if(token!==data.socialRequest)return;
  const ids=[...new Set((r.data||[]).map(x=>x[other]))];
  let rows=[];
  if(ids.length){const result=await data.sb.from('profiles').select('id,username,display_name,avatar_url,bio').in('id',ids);if(result.error)throw result.error;const byId=new Map((result.data||[]).map(x=>[x.id,x]));rows=ids.map(id=>byId.get(id)).filter(Boolean)}
  if(token!==data.socialRequest)return;
  const frag=document.createDocumentFragment();
  for(const creator of rows){const a=document.createElement('a');a.className='connection';a.href='/creators.html?id='+encodeURIComponent(creator.id);a.innerHTML=avatar(creator)+'<div><b>'+safe(name(creator))+'</b><small>'+safe(handle(creator))+'</small></div>';frag.append(a)}
  el('socialList').replaceChildren(frag);el('socialStatus').textContent=rows.length?rows.length+' public profiles shown'+(rows.length===60?' (latest 60)':''):'No connections to show yet.';
  panel.scrollIntoView({behavior:'smooth',block:'start'});
 }catch(e){if(token===data.socialRequest)el('socialStatus').textContent='Unable to load connections. Try again.'}
}
function notificationLabel(event){switch(event){case 'follow':return 'started following you';case 'like':return 'liked your video';case 'comment':return 'commented on your video';default:return 'interacted with your content'}}
async function loadNotifications(){
 if(!data.sessionUser){el('notificationsPanel').hidden=true;return}
 el('notificationsPanel').hidden=false;el('notificationStatus').textContent='Loading your private account notifications…';
 const r=await data.sb.from('vv_notifications').select('id,actor_id,event_type,created_at,read_at').eq('recipient_id',data.sessionUser.id).order('created_at',{ascending:false}).limit(40);
 if(r.error){el('notificationStatus').textContent='Notifications unavailable. You may need to finish account verification.';return}
 const items=r.data||[],ids=[...new Set(items.map(x=>x.actor_id))],names=new Map();
 if(ids.length){const users=await data.sb.from('profiles').select('id,display_name,username').in('id',ids);if(!users.error)for(const p of users.data||[])names.set(p.id,p)}
 const frag=document.createDocumentFragment();
 for(const item of items){const article=document.createElement('div');article.className='notification-entry';
  if(!item.read_at)article.classList.add('unread');
  const actor=names.get(item.actor_id),a=document.createElement('a');a.href='/creators.html?id='+encodeURIComponent(item.actor_id);a.textContent=actor?name(actor):'A creator';
  const info=document.createElement('div');info.append(a,document.createTextNode(' '+notificationLabel(item.event_type)));
  const small=document.createElement('small');small.textContent=new Date(item.created_at).toLocaleString();info.append(small);article.append(info);
  if(!item.read_at){const b=document.createElement('button');b.type='button';b.textContent='Mark read';b.className='small';b.addEventListener('click',async()=>{b.disabled=true;const x=await data.sb.from('vv_notifications').update({read_at:new Date().toISOString()}).eq('id',item.id).eq('recipient_id',data.sessionUser.id);if(x.error){b.disabled=false;el('notificationStatus').textContent='Unable to mark notification read.';return}article.classList.remove('unread');b.remove()});article.append(b)}
  frag.append(article)
 }
 el('notificationList').replaceChildren(frag);const unread=items.filter(x=>!x.read_at).length;el('notificationStatus').textContent=items.length?items.length+' recent notifications · '+unread+' unread':'No notifications yet.';
}

async function init(){
 if(!window.supabase?.createClient){setStatus('Unable to load the account service. Refresh the page.');return}
 data.sb=window.supabase.createClient(BASE,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
 await login();
 el('creatorSearch').addEventListener('input',render);
 el('refreshCreators').addEventListener('click',()=>{data.profiles=[];data.next=0;data.ended=false;render();loadMore()});
 el('moreCreators').addEventListener('click',loadMore);
 el('closeConnections').addEventListener('click',()=>{data.socialRequest++;el('socialPanel').hidden=true});
 el('showNotifications').addEventListener('click',()=>{loadNotifications();el('notificationsPanel').scrollIntoView({behavior:'smooth',block:'start'})});
 el('refreshNotifications').addEventListener('click',loadNotifications);
 await loadMore();
 if(data.sessionUser)await loadNotifications();
 const id=new URLSearchParams(location.search).get('id');
 if(id&&uuid(id)){
   let p=data.profiles.find(x=>x.id===id);
   if(!p){const r=await data.sb.from('profiles').select('id,username,display_name,avatar_url,bio').eq('id',id).maybeSingle();if(!r.error)p=r.data}
   if(p){await counts([p]);await showSelected(p)}
   else setStatus('That creator profile was not found.');
 }
}
init().catch(()=>setStatus('Could not load creators. Please refresh.'));
})();