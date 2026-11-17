(()=>{
'use strict';
const SUPABASE_URL='https://qngkwjhhykugjfkwoyam.supabase.co', KEY='sb_publishable__rfc1XG15o-nZ44zT2odpg_pvtQMxaM';
const $=id=>document.getElementById(id), safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const PAGE=12;let mediaObserver=null;
const state={sb:null,posts:[],filter:'all',term:'',sort:'latest',selected:null,user:null,loading:false,queue:[],offset:{video:0,photo:0},ended:{video:false,photo:false}};
const message=t=>{$('status').textContent=t};
const status=t=>{$('modStatus').textContent=t};
function date(v){try{return new Date(v).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'})}catch{return ''}}
const num=n=>Number.isFinite(Number(n))?Number(n):0;
const thumb=(row)=>String(row.thumbnail_url||'');
const safeUrl=value=>{
  try{const u=new URL(String(value));return u.protocol==='https:'?u.href:''}catch{return ''}
};
function videoMedia(row){
 const src=safeUrl(row.video_url),poster=safeUrl(thumb(row));
 if(!src)return '<div class="media-error">Video unavailable</div>';
 return '<video controls preload="none" playsinline disablepictureinpicture controlslist="nodownload"'+(poster?' poster="'+safe(poster)+'"':'')+' src="'+safe(src)+'"></video>';
}
function photoMedia(row){
 const img=SUPABASE_URL+'/storage/v1/object/public/post-images/'+String(row.image_path||'').split('/').map(encodeURIComponent).join('/');
 return '<img src="'+safe(img)+'" alt="Photo posted to VibeVerse" loading="lazy" decoding="async" referrerpolicy="no-referrer">';
}
function render(){
 const filter=state.filter,term=state.term.toLocaleLowerCase();
 let data=state.posts.filter(p=>(filter==='all'||p.type===filter)&&(!term||[p.caption,p.hashtags,p.creator?.display_name,p.creator?.username].join(' ').toLocaleLowerCase().includes(term)));
 if(state.sort==='popular')data.sort((a,b)=>(num(b.type==='photo'?b.likes_count:0)-num(a.type==='photo'?a.likes_count:0))||(new Date(b.created_at)-new Date(a.created_at)));
 else data.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
 const frag=document.createDocumentFragment();
 data.forEach(post=>{
  const article=document.createElement('article');article.className='post';if(post.type==='video')article.dataset.videoId=post.id;
  const creator=post.creator?.display_name||post.creator?.username||'VibeVerse creator';
  const handle=post.creator?.username?'@'+post.creator.username:'';
  article.innerHTML='<div class="media">'+(post.type==='video'?videoMedia(post):photoMedia(post))+'<span class="type">'+(post.type==='video'?'VIDEO':'PHOTO')+'</span></div>'+
    '<div class="body"><div class="creator">'+safe(creator)+(handle?' · '+safe(handle):'')+'</div><div class="caption">'+safe(post.caption||'Untitled post')+'</div>'+
    '<div class="tags">'+safe(post.hashtags||'')+'</div><div class="bottom"><time datetime="'+safe(post.created_at)+'">'+safe(date(post.created_at))+'</time><button class="report" type="button" aria-label="Report this '+post.type+'">Report</button></div></div>';
  const button=article.querySelector('button.report');button.addEventListener('click',()=>chooseReport(post));
  frag.append(article);
 });
 if(mediaObserver){mediaObserver.disconnect();mediaObserver=null}
 for(const v of $('posts').querySelectorAll('video'))try{v.pause()}catch{}
 $('posts').replaceChildren(frag);
 if('IntersectionObserver' in window){
   mediaObserver=new IntersectionObserver(entries=>{for(const e of entries)if(!e.isIntersecting&&e.target instanceof HTMLVideoElement&&!e.target.paused)e.target.pause()},{rootMargin:'30px',threshold:0.01});
   for(const vid of $('posts').querySelectorAll('video'))mediaObserver.observe(vid);
 }
 $('empty').hidden=data.length!==0||state.loading;
 $('loadMore').hidden=state.ended.video&&state.ended.photo;
 $('loadMore').disabled=state.loading;
 $('counts').textContent=state.posts.filter(p=>p.type==='video').length+' public videos · '+state.posts.filter(p=>p.type==='photo').length+' public photos';
}
async function fetchTable(name,columns,filters,offset){
 let q=state.sb.from(name).select(columns).order('created_at',{ascending:false}).range(offset,offset+PAGE-1);
 for(const [key,val] of Object.entries(filters))q=q.eq(key,val);
 const res=await q;if(res.error)throw res.error;return res.data||[];
}
async function loadPage(){
 if(state.loading)return;
 state.loading=true;$('reload').disabled=true;$('loadMore').disabled=true;
 message(state.posts.length?'Loading more real posts…':'Loading real public posts from VibeVerse…');
 try{
  const pending=[];
  if(!state.ended.video)pending.push({type:'video',promise:fetchTable('videos','id,user_id,video_url,thumbnail_url,caption,hashtags,visibility,created_at',{visibility:'public'},state.offset.video)});
  if(!state.ended.photo)pending.push({type:'photo',promise:fetchTable('vv_photo_posts','id,user_id,image_path,caption,hashtags,created_at,likes_count,moderation_state',{moderation_state:'visible'},state.offset.photo)});
  const results=await Promise.allSettled(pending.map(x=>x.promise));
  const errors=[],incoming=[];
  for(let i=0;i<results.length;i++){
    const type=pending[i].type,r=results[i];
    if(r.status==='rejected'){errors.push(type==='video'?'Videos temporarily unavailable':'Photos temporarily unavailable');continue}
    const batch=r.value;incoming.push(...batch.map(row=>({...row,type})));
    state.offset[type]+=batch.length;
    if(batch.length<PAGE)state.ended[type]=true;
  }
  if(results.length&&errors.length===results.length)throw Error('Could not load public posts. Check your connection and retry.');
  const ids=[...new Set(incoming.map(x=>x.user_id).filter(Boolean))],map=new Map();
  if(ids.length){const r=await state.sb.from('profiles').select('id,username,display_name').in('id',ids);if(!r.error)for(const p of r.data||[])map.set(p.id,p)}
  const seen=new Set(state.posts.map(x=>x.type+':'+x.id));
  for(const p of incoming){const key=p.type+':'+p.id;if(!seen.has(key)){seen.add(key);state.posts.push({...p,creator:map.get(p.user_id)||null})}}
  message(errors.length?errors.join(' · ')+'. Showing available content.':state.posts.length?'Showing '+state.posts.length+' loaded public posts from VibeVerse.':'No public posts are available yet.');
 }catch(e){message(e.message||'Could not load VibeVerse media.');}
 finally{state.loading=false;$('reload').disabled=false;$('loadMore').disabled=false;render()}
}
async function load(){
 if(state.loading)return;
 state.posts=[];state.offset={video:0,photo:0};state.ended={video:false,photo:false};
 await loadPage();
}
async function loggedIn(){
 if(!state.sb)return null;
 try{const {data}=await state.sb.auth.getUser();state.user=data?.user||null}catch{state.user=null}
 $('accountLink').textContent=state.user?'Signed in':'Sign in';
 return state.user;
}
function chooseReport(post){
 state.selected=post;
 $('reportReason').value='spam';$('reportStatus').textContent='';
 $('sendReport').disabled=false;
 if(typeof $('reportDialog').showModal==='function')$('reportDialog').showModal();
}
async function report(e){
 e.preventDefault();
 if(!state.selected)return;
 const user=await loggedIn();
 if(!user){$('reportStatus').textContent='Sign in from the VibeVerse Account Center first, then return here to submit a report.';return}
 if(state.selected.user_id===user.id){$('reportStatus').textContent='You cannot report your own post.';return}
 const reason=$('reportReason').value;
 if(!['spam','harassment','unsafe_content','privacy','other'].includes(reason))return;
 $('sendReport').disabled=true;$('reportStatus').textContent='Submitting your report…';
 try{
  const post=state.selected;
  let row,table;
  if(post.type==='video'){table='reports';row={video_id:post.id,reporter_id:user.id,reason}}
  else{table='vv_photo_reports';row={photo_id:post.id,reporter_id:user.id,category:reason,review_state:'pending'}}
  const r=await state.sb.from(table).insert(row);
  if(r.error)throw r.error;
  $('reportStatus').textContent='Report submitted successfully. Thank you for helping protect the community.';
  $('sendReport').hidden=true;
 }catch(e){
  $('sendReport').disabled=false;
  const msg=String(e?.message||'');
  $('reportStatus').textContent=/duplicate|unique/i.test(msg)?'You have already reported this post.':/permission|policy|jwt|mfa|row-level|rls/i.test(msg)?'Your account does not currently meet the verification requirements for reporting. Sign in again or complete account verification.':'Could not submit the report. Please retry.';
 }
}
async function checkAdmin(){
 try{
  const user=await loggedIn();
  if(!user)return false;
  const {data,error}=await state.sb.rpc('vv_explore_admin_access');
  if(error||data!==true)return false;
  $('moderation').hidden=false;
  return true;
 }catch{return false}
}
async function moderate(){
 if(!$('moderation')||$('moderation').hidden)return;
 status('Loading restricted reports…');
 try{
  const [vr,pr,review]=await Promise.all([
   state.sb.from('reports').select('id,video_id,reason,created_at,reporter_id').order('created_at',{ascending:false}).limit(70),
   state.sb.from('vv_photo_reports').select('id,photo_id,category,created_at,review_state').order('created_at',{ascending:false}).limit(70),
   state.sb.from('vv_explore_video_report_reviews').select('report_id,review_state,resolved_at').limit(100)
  ]);
  if(vr.error||pr.error||review.error)throw Error('Protected moderation queue unavailable.');
  const reviewed=new Map((review.data||[]).map(x=>[x.report_id,x]));
  state.queue=[...(vr.data||[]).map(x=>({id:x.id,type:'video',postId:x.video_id,reason:x.reason,created_at:x.created_at,review_state:reviewed.get(x.id)?.review_state||'pending'})),
   ...(pr.data||[]).map(x=>({id:x.id,type:'photo',postId:x.photo_id,reason:x.category,created_at:x.created_at,review_state:x.review_state}))].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  const frag=document.createDocumentFragment();
  for(const record of state.queue){
   const card=document.createElement('div');card.className='queue-item';
   const main=document.createElement('div');main.className='q-main';
   const bold=document.createElement('b');bold.textContent=record.type.toUpperCase()+' · '+record.reason;
   const smaller=document.createElement('small');smaller.textContent='Post '+record.postId.slice(0,8)+'… · '+date(record.created_at)+' · Status: '+record.review_state;
   main.append(bold,smaller);card.append(main);
   if(record.review_state==='pending'){
    const actions=document.createElement('div');actions.className='queue-actions';
    for(const verdict of ['reviewed','dismissed']){
     const button=document.createElement('button');button.type='button';button.textContent=verdict==='reviewed'?'Mark reviewed':'Dismiss';
     button.addEventListener('click',()=>reviewReport(record,verdict,button));actions.append(button);
    }card.append(actions);
   }else{const s=document.createElement('span');s.className='state';s.textContent=record.review_state;card.append(s)}
   frag.append(card);
  }
  $('reportQueue').replaceChildren(frag);status(state.queue.length?'Showing '+state.queue.length+' recent reports.':'There are no reports to review.');
 }catch(e){status(e.message||'Could not access moderation queue.')}
}
async function reviewReport(item,verdict,button){
 button.disabled=true;status('Saving '+verdict+' decision…');
 try{
  const u=await loggedIn();if(!u)throw Error('Admin session expired');
  let q;
  if(item.type==='photo')q=state.sb.from('vv_photo_reports').update({review_state:verdict,resolved_at:new Date().toISOString()}).eq('id',item.id);
  else q=state.sb.from('vv_explore_video_report_reviews').upsert({report_id:item.id,review_state:verdict,reviewed_by:u.id,resolved_at:new Date().toISOString()},{onConflict:'report_id'});
  const {error}=await q;if(error)throw error;
  await moderate();
 }catch{status('Could not save review. Please confirm administrator MFA and retry.');button.disabled=false}
}
async function start(){
 if(!window.supabase?.createClient){message('Authentication service unavailable. Please reload.');return}
 state.sb=window.supabase.createClient(SUPABASE_URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
 await loggedIn();
 document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{
   document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x===b));state.filter=b.dataset.filter;render();
 }));
 $('search').addEventListener('input',e=>{state.term=e.target.value.trim();render()});
 $('sort').addEventListener('change',e=>{state.sort=e.target.value;render()});
 $('reload').addEventListener('click',load);
 $('loadMore').addEventListener('click',loadPage);
 $('closeReport').addEventListener('click',()=>$('reportDialog').close());
 $('cancelReport').addEventListener('click',()=>$('reportDialog').close());
 $('reportDialog').addEventListener('close',()=>{$('sendReport').hidden=false});
 $('reportForm').addEventListener('submit',report);
 $('refreshReports').addEventListener('click',moderate);
 await load();
 const requested=new URLSearchParams(location.search).get('video');
 if(requested&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requested)){
  try{
   const r=await state.sb.from('videos').select('id,user_id,video_url,thumbnail_url,caption,hashtags,visibility,created_at').eq('id',requested).eq('visibility','public').maybeSingle();
   if(r.error)throw r.error;
   if(!r.data){message('This video is not available publicly. Explore other public videos.')}
   else{
    const exists=state.posts.some(p=>p.id===requested&&p.type==='video');
    if(!exists){
     const p={...r.data,type:'video'};
     const user=await state.sb.from('profiles').select('id,username,display_name').eq('id',p.user_id).maybeSingle();
     if(!user.error)p.creator=user.data;
     state.posts.unshift(p);
    }
    state.term='';state.filter='all';$('search').value='';
    document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('active',b.dataset.filter==='all'));
    render();
    const card=[...$('posts').querySelectorAll('[data-video-id]')].find(n=>n.dataset.videoId===requested);
    if(card){card.scrollIntoView({behavior:'smooth',block:'center'});card.style.outline='2px solid #7d6cdb'}
    message('Showing the selected public video from your notification.');
   }
  }catch{message('Could not find that video. You can still explore public posts.')}
 }
 if(await checkAdmin())await moderate();
}
start().catch(()=>message('Explore could not start. Please reload the page.'));
})();