(()=>{'use strict';
const $=s=>document.querySelector(s),esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ORIGIN='https://qngkwjhhykugjfkwoyam.supabase.co',AV=ORIGIN+'/storage/v1/object/public/avatars/',CL=ORIGIN+'/storage/v1/object/public/clips/';
const fields='id,username,display_name,bio,avatar_url',pageSize=24,videoSize=12;
let sb,me=null,seq=0,busy=false,view='all',offset=0,query='',current=null,following=false,videoOffset=0;
const root=$('#content'),notice=$('#notice');
function msg(s,bad=false){notice.hidden=!s;notice.className='notice'+(bad?' err':'');notice.textContent=s||''}
const check=async promise=>{const r=await promise;if(r.error)throw r.error;return r};
function avatar(p){return typeof p.avatar_url==='string'&&p.avatar_url.startsWith(AV+p.id+'/')&&/^[a-z0-9-]+\.jpg$/.test(p.avatar_url.slice((AV+p.id+'/').length))?'<img class="avatar" src="'+esc(p.avatar_url)+'" alt="" loading="lazy">':'<span class="avatar" aria-hidden="true">'+esc((p.display_name||'V').slice(0,1).toUpperCase())+'</span>'}
function url(p){return '/creators.html?u='+encodeURIComponent(p.username)}
function card(p){return '<article class="creator-card">'+avatar(p)+'<div class="creator-body"><a href="'+url(p)+'">'+esc(p.display_name)+'</a><div class="handle">@'+esc(p.username)+'</div><p class="bio">'+esc((p.bio||'VibeVerse creator').slice(0,160))+'</p></div></article>'}
function empty(s){return '<div class="empty">'+esc(s)+'</div>'}
function change(v){view=v;offset=0;current=null;history.replaceState(null,'','/creators.html');directory(false)}
async function directory(append){
 const request=++seq;msg('');if(!append){root.innerHTML=empty('Loading real creator profiles…');offset=0}
 try{
  let rows=[],hasMore=false;
  if(view==='following'){
   if(!me){root.innerHTML=empty('Sign in to view the creators you follow.')+'<p><a href="/account.html">Sign in to VibeVerse</a></p>';return}
   const rel=await check(sb.from('follows').select('following_id').eq('follower_id',me.id).order('created_at',{ascending:false}).range(offset,offset+pageSize));
   if(request!==seq)return;hasMore=rel.data.length>pageSize;const ids=rel.data.slice(0,pageSize).map(r=>r.following_id);
   if(ids.length){const res=await check(sb.from('profiles').select(fields).in('id',ids));const byId=new Map(res.data.map(p=>[p.id,p]));rows=ids.map(id=>byId.get(id)).filter(Boolean)}
  }else if(query){
   const term=query.replace(/[%_\\]/g,'\\$&');
   // Separate filters avoid composing user input into PostgREST's OR grammar.
   const [a,b]=await Promise.all([check(sb.from('profiles').select(fields).ilike('username','%'+term+'%').order('username').limit(80)),check(sb.from('profiles').select(fields).ilike('display_name','%'+term+'%').order('username').limit(80))]);
   const map=new Map([...a.data,...b.data].map(p=>[p.id,p]));rows=[...map.values()].sort((x,y)=>x.username.localeCompare(y.username)).slice(0,80);
  }else{
   const r=await check(sb.from('profiles').select(fields).order('created_at',{ascending:false}).order('id').range(offset,offset+pageSize));hasMore=r.data.length>pageSize;rows=r.data.slice(0,pageSize);
  }
  if(request!==seq)return;
  if(!append){root.innerHTML='<h2>'+esc(view==='following'?'Creators you follow':query?'Search results for “'+query+'”':'Discover creators')+'</h2><div class="directory-grid" id="grid"></div>';if(!rows.length)root.insertAdjacentHTML('beforeend',empty(view==='following'?'You are not following any creators yet.':query?'No creators match your search. Try another name.':'No creator profiles are available yet.'))}
  $('#grid')?.insertAdjacentHTML('beforeend',rows.map(card).join(''));$('#more')?.remove();offset+=pageSize;
  if(hasMore){const b=document.createElement('button');b.id='more';b.className='secondary more';b.textContent='Load more creators';b.onclick=()=>{b.disabled=true;directory(true)};root.append(b)}
 }catch(e){if(request!==seq)return;msg('Creator search could not load. Please try again.',true);if(!append)root.innerHTML=empty('Creator directory unavailable.');if($('#more'))$('#more').disabled=false}
}
async function count(table,column,id,extra){let q=sb.from(table).select(column,{head:true,count:'exact'}).eq(column,id);if(extra)q=q.eq('visibility','public');const r=await check(q);return r.count}
async function stats(p){const [a,b,c]=await Promise.all([count('follows','following_id',p.id),count('follows','follower_id',p.id),count('videos','user_id',p.id,true)]);if(current?.id!==p.id)return;$('#followers').textContent=a??'—';$('#following').textContent=b??'—';$('#posts').textContent=c??'—'}
async function relation(p){if(!me||me.id===p.id)return;const r=await check(sb.from('follows').select('following_id').eq('follower_id',me.id).eq('following_id',p.id).maybeSingle());if(current?.id!==p.id)return;following=!!r.data;followButton()}
function followButton(){const b=$('#follow');if(b){b.textContent=following?'Following · Unfollow':'Follow';b.disabled=busy}}
async function toggleFollow(){if(busy||!current||!me||current.id===me.id)return;const p=current;busy=true;followButton();msg('');try{
 const a=await check(sb.auth.mfa.getAuthenticatorAssuranceLevel());if(a.data.nextLevel==='aal2'&&a.data.currentLevel!=='aal2'){location.assign('/security.html?verify=1');return}
 if(following)await check(sb.from('follows').delete().eq('follower_id',me.id).eq('following_id',p.id));
 else await check(sb.from('follows').insert({follower_id:me.id,following_id:p.id}));
 await relation(p);await stats(p);msg(following?'You are now following this creator.':'Creator unfollowed.');
 }catch(e){msg('Could not update your follow. Sign in and verify your account, then try again.',true)}finally{busy=false;followButton()}}
function clip(v){const ok=typeof v.video_url==='string'&&v.video_url.startsWith(CL)&&!/[?#]/.test(v.video_url.slice(CL.length));return '<article class="video-card">'+(ok?'<video controls playsinline preload="none" src="'+esc(v.video_url)+'" aria-label="Creator video"></video>':'<div class="empty">Video unavailable in this player.</div>')+'<p>'+esc(v.caption||'VibeVerse video')+'</p></article>'}
async function videos(p,append=false){const request=seq;try{const r=await check(sb.from('videos').select('id,video_url,caption,created_at').eq('user_id',p.id).eq('visibility','public').order('created_at',{ascending:false}).order('id').range(videoOffset,videoOffset+videoSize));if(request!==seq||current?.id!==p.id)return;const rows=r.data.slice(0,videoSize);if(!append){$('#videoGrid').innerHTML='';if(!rows.length)$('#videoGrid').innerHTML=empty('This creator has not published a public video yet.')}$('#videoGrid').insertAdjacentHTML('beforeend',rows.map(clip).join(''));$('#moreVideos')?.remove();videoOffset+=videoSize;if(r.data.length>videoSize){const b=document.createElement('button');b.id='moreVideos';b.className='secondary more';b.textContent='Load more videos';b.onclick=()=>{b.disabled=true;videos(p,true)};$('#videoGrid').after(b)}}catch{if(request===seq&&current?.id===p.id){msg('Public videos could not load. Please retry.',true);if($('#moreVideos'))$('#moreVideos').disabled=false}}}
async function profile(name){const request=++seq;root.innerHTML=empty('Loading creator profile…');try{
 if(!/^[a-z0-9_]{3,24}$/.test(name))throw Error('Invalid creator name');
 const r=await check(sb.from('profiles').select(fields).eq('username',name).maybeSingle());if(request!==seq)return;const p=r.data;if(!p){root.innerHTML=empty('Creator not found. Their username may have changed.');return}
 current=p;videoOffset=0;following=false;const own=me?.id===p.id;
 root.innerHTML='<a class="back" href="/creators.html">← All creators</a><div class="profile-head">'+avatar(p)+'<div class="creator-body"><h2>'+esc(p.display_name)+'</h2><div class="handle">@'+esc(p.username)+'</div><p class="bio">'+esc(p.bio||'VibeVerse creator')+'</p></div><div class="profile-actions">'+(own?'<a class="primary identity-button" href="/creator.html">Edit profile</a>':me?'<button id="follow" class="primary" disabled>Checking…</button>':'<a class="primary identity-button" href="/account.html">Sign in to follow</a>')+'<button id="share" class="secondary">Copy profile link</button></div></div><div class="stats"><div class="stat"><b id="followers">—</b>Followers</div><div class="stat"><b id="following">—</b>Following</div><div class="stat"><b id="posts">—</b>Public videos</div></div><h2>Published videos</h2><div id="videoGrid" class="videos"></div>';
 if($('#follow'))$('#follow').onclick=toggleFollow;
 $('#share').onclick=async()=>{try{await navigator.clipboard.writeText(location.origin+url(p));msg('Creator profile link copied.')}catch{msg('Copy the address from your browser to share this profile.')}};
 await Promise.allSettled([stats(p).catch(()=>msg('Some creator counts could not be loaded.',true)),relation(p).catch(()=>msg('Follow status could not be loaded.',true)),videos(p)]);
 }catch(e){if(request===seq)root.innerHTML=empty('Creator profile unavailable. Check the link and try again.')}}
$('#searchForm').onsubmit=e=>{e.preventDefault();query=$('#search').value.trim().replace(/^@/,'').slice(0,60);change('all')};$('#allTab').onclick=()=>{query='';$('#search').value='';change('all')};$('#followingTab').onclick=()=>{query='';$('#search').value='';change('following')};
(async()=>{try{const c=JSON.parse(localStorage.getItem('vv2_config')||'null');if(c?.url?.replace(/\/+$/,'')!==ORIGIN||!/^sb_publishable_/.test(c?.key||'')||!window.supabase?.createClient)throw Error('Connection unavailable');sb=window.supabase.createClient(ORIGIN,c.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});const u=await sb.auth.getUser();me=u.data.user||null;const name=new URLSearchParams(location.search).get('u');if(name!==null)await profile(name);else await directory(false)}catch{root.innerHTML=empty('VibeVerse discovery is unavailable. Please check your connection.')}})();
})();