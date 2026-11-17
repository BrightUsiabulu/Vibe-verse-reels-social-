/* VibeVerse 11.0 — authenticated social discussion and genuine realtime counters */
(()=>{'use strict';
const $=(q,r=document)=>r.querySelector(q),$$=(q,r=document)=>Array.from(r.querySelectorAll(q));
const isId=v=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v||''));
const esc=v=>String(v??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const compact=v=>new Intl.NumberFormat('en-NG',{notation:'compact',maximumFractionDigits:1}).format(Math.max(0,Number(v)||0));
const when=x=>{const t=Date.parse(x),diff=Math.max(0,Date.now()-t);return diff<60000?'Just now':diff<3600000?Math.floor(diff/60000)+'m':diff<86400000?Math.floor(diff/3600000)+'h':new Date(x).toLocaleDateString('en-NG',{day:'numeric',month:'short'})};
const ico=n=>'<svg aria-hidden="true"><use href="#i-'+n+'"></use></svg>';
let client=null,channel=null,drawerChannel=null,lastLoaded=0,loading=false,viewer=null,activeVideo=null,comments=[],replies=[],reactions=[],profiles={},replyTo=null,focusRestore=null,modalLoading=false,modalLive=false;
const metricCache=new Map(),viewCache=new Map(),tracked=new Set();
let scheduled=0,initialized=false,refreshTask=null;
const shade=document.createElement('div');shade.id='v11Sheet';shade.hidden=true;shade.setAttribute('role','presentation');document.body.appendChild(shade);
function cfg(){try{const x=JSON.parse(localStorage.getItem('vv2_config')||'null');if(/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(x?.url||'')&&/^(sb_publishable_|eyJ)/.test(x?.key||''))return x}catch{}return null}
function toast(t){const el=$('#toast');if(el){el.textContent=t;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),3400)}}
function authNeeded(){toast('Sign in to VibeVerse to join the discussion.');closeDrawer();const nav=$('[data-route="settings"]');nav?.click();setTimeout(()=>$('#view [data-action="auth"]')?.click(),250)}
async function getViewer(){try{const {data,error}=await client.auth.getUser();if(error)return null;return isId(data?.user?.id)&&data.user.is_anonymous!==true?data.user:null}catch{return null}}
function rowsForActive(){return $$('.videoCard').filter(x=>isId(x.dataset.card))}
function patchCard(card){
 if(!card||!card.isConnected)return;const id=card.dataset.card;if(!isId(id))return;
 const m=metricCache.get(id);if(m){
 const like=$('[data-like] > span:last-child',card),comment=$('[data-comments] > span:last-child',card);
 if(like){like.textContent=compact(m.likes_count);like.title=Number(m.likes_count).toLocaleString('en-NG')+' real likes recorded';}
 if(comment){comment.textContent=compact(m.comments_count);comment.title=Number(m.comments_count).toLocaleString('en-NG')+' real comments recorded';}
 }
 const v=viewCache.get(id);if(v!==undefined){
 let info=$('.v11-view-count',card);
 if(!info){info=document.createElement('span');info.className='v11-view-count';const place=$('.videoBottom',card);if(place)place.appendChild(info)}
 if(info){info.textContent=compact(v)+' recorded views';info.title='Account-based view events; not unique humans'}
 }
 const place=$('.videoBottom',card);
 if(place&&!place.querySelector('[data-v11-open]')){
 const btn=document.createElement('button');btn.type='button';btn.dataset.v11Open=id;btn.className='v11-discussion-launch';btn.innerHTML=ico('chat')+' <span>Live discussion</span>';
 place.appendChild(btn)
 }
}
function patchAll(){for(const card of rowsForActive())patchCard(card)}
function schedule(){clearTimeout(scheduled);scheduled=setTimeout(()=>{patchAll();refreshMetrics(false)},280)}
async function refreshMetrics(force=false){
 if(!client||loading)return;const now=Date.now();if(!force&&now-lastLoaded<12000){patchAll();return}
 const ids=[...new Set(rowsForActive().map(x=>x.dataset.card))];if(!ids.length)return;
 loading=true;
 try{
 const [likes,views]=await Promise.all([
 client.from('vv_engagement_metrics').select('video_id,likes_count,comments_count').in('video_id',ids),
 client.from('vv_video_metrics').select('video_id,verified_views').in('video_id',ids)
 ]);
 if(likes.error||views.error)throw Error('Live video counts could not be retrieved');
 for(const id of ids){metricCache.set(id,{likes_count:0,comments_count:0});viewCache.set(id,0)}
 for(const m of likes.data||[])metricCache.set(m.video_id,{likes_count:Number(m.likes_count)||0,comments_count:Number(m.comments_count)||0});
 for(const v of views.data||[])viewCache.set(v.video_id,Number(v.verified_views)||0);
 lastLoaded=Date.now();patchAll();
 }catch(e){console.warn('VibeVerse metric refresh unavailable',e)}
 finally{loading=false}
}
function subscribeMetrics(){
 try{
 channel=client.channel('v11-real-social-counts').on('postgres_changes',{event:'*',schema:'public',table:'vv_engagement_metrics'},e=>{
 const m=e.new;if(!m||!isId(m.video_id))return;
 metricCache.set(m.video_id,{likes_count:Number(m.likes_count)||0,comments_count:Number(m.comments_count)||0});patchAll();
 if(activeVideo===m.video_id&&m.comments_count!==undefined){const n=$('#v11HeaderCount');if(n)n.textContent=compact(m.comments_count)+' comments'}
 }).on('postgres_changes',{event:'*',schema:'public',table:'vv_video_metrics'},e=>{
 const m=e.new;if(!m||!isId(m.video_id))return;viewCache.set(m.video_id,Number(m.verified_views)||0);patchAll()
 }).subscribe(state=>{if(state==='SUBSCRIBED')$$('#v11LiveStatus').forEach(n=>n.textContent='Live sync active');else if(state==='CHANNEL_ERROR')$$('#v11LiveStatus').forEach(n=>n.textContent='Auto refresh active')});
 }catch(e){console.warn('Realtime stream unavailable; polling remains enabled',e)}
}
function displayName(id){const x=profiles[id]||{};return x.display_name||x.username||'Creator'}
function renderReply(item){
 const u=viewer&&viewer.id===item.user_id;
 return '<div class="v11-reply"><div class="v11-avatar">'+esc(displayName(item.user_id).charAt(0).toUpperCase())+'</div><div class="v11-comment-body"><b>'+esc(displayName(item.user_id))+'</b><small> · '+when(item.created_at)+'</small><p>'+esc(item.body)+'</p>'+(u?'<button class="v11-tiny danger" data-v11-delete-reply="'+esc(item.id)+'">Delete</button>':'')+'</div></div>';
}
function renderComment(item){
 const person=displayName(item.user_id),n=reactions.filter(x=>x.comment_id===item.id).length,liked=viewer?reactions.some(x=>x.comment_id===item.id&&x.user_id===viewer.id):false;
 const own=viewer&&viewer.id===item.user_id;
 const sub=replies.filter(x=>x.comment_id===item.id).slice(0,30);
 return '<article class="v11-comment"><div class="v11-avatar">'+esc(person.charAt(0).toUpperCase())+'</div><div class="v11-comment-body"><div><b>'+esc(person)+'</b><small> · '+when(item.created_at)+'</small></div><p>'+esc(item.body)+'</p><div class="v11-comment-actions"><button data-v11-reply="'+esc(item.id)+'">Reply</button><button class="'+(liked?'on':'')+'" data-v11-heart="'+esc(item.id)+'">'+ico('heart')+' '+n+'</button>'+(own?'<button data-v11-delete-comment="'+esc(item.id)+'">Delete</button>':'')+'</div>'+(sub.length?'<div class="v11-replies">'+sub.map(renderReply).join('')+'</div>':'')+'</div></article>';
}
function renderDrawer(){
 if(!activeVideo)return;const title='Video discussion';
 const count=metricCache.get(activeVideo)?.comments_count;
 shade.hidden=false;
 shade.innerHTML='<div class="v11-shade" data-v11-close="1"></div><section class="v11-panel" role="dialog" aria-modal="true" aria-label="'+title+'" tabindex="-1"><header class="v11-head"><div><h2>Live discussion</h2><p><span id="v11HeaderCount">'+(count!==undefined?compact(count)+' comments':'Real community comments')+'</span> · <span id="v11LiveStatus">'+(modalLive?'Live updates active':'Auto refresh enabled')+'</span></p></div><button data-v11-close="1" aria-label="Close discussion" class="v11-close">'+ico('x')+'</button></header>'+
 '<div class="v11-scroll" id="v11Thread">'+(comments.length?comments.map(renderComment).join(''):'<div class="v11-no-comments">'+ico('chat')+'<h3>No comments yet</h3><p>Be the first to start a conversation about this video.</p></div>')+'</div>'+
 '<form id="v11Form" class="v11-compose"><div id="v11ReplyHint">'+(replyTo?'<span>Replying to '+esc(displayName(comments.find(x=>x.id===replyTo)?.user_id))+'</span><button type="button" data-v11-cancel-reply="1">Cancel</button>':'<span>Keep the conversation respectful and on-topic.</span>')+'</div><div class="v11-compose-row"><input type="text" name="text" aria-label="Write comment or reply" maxlength="'+(replyTo?240:300)+'" placeholder="'+(replyTo?'Write a reply...':'Write a comment...')+'" required><button type="submit" class="v11-send">'+ico('send')+' Post</button></div></form></section>';
}
async function loadDiscussion({quiet=false}={}){
 if(!client||!isId(activeVideo)||modalLoading)return;const selected=activeVideo;modalLoading=true;
 try{
 const data=await client.from('comments').select('id,video_id,user_id,body,created_at').eq('video_id',selected).order('created_at',{ascending:false}).limit(50);
 if(data.error)throw data.error;if(selected!==activeVideo)return;
 comments=data.data||[];const ids=comments.filter(x=>isId(x.id)).map(x=>x.id);
 const results=ids.length?await Promise.all([
 client.from('vv_comment_replies').select('id,comment_id,user_id,body,created_at').in('comment_id',ids).order('created_at',{ascending:true}).limit(150),
 client.from('vv_comment_likes').select('comment_id,user_id').in('comment_id',ids).limit(500)
 ]):[{data:[],error:null},{data:[],error:null}];
 if(results[0].error||results[1].error)throw Error('Replies are unavailable');
 if(selected!==activeVideo)return;
 replies=results[0].data||[];reactions=results[1].data||[];
 const authors=[...new Set([...comments.map(x=>x.user_id),...replies.map(x=>x.user_id)])].filter(isId);
 profiles={};if(authors.length){const prof=await client.from('profiles').select('id,username,display_name').in('id',authors);if(!prof.error)for(const a of prof.data||[])profiles[a.id]=a}
 viewer=await getViewer();
 if(selected!==activeVideo)return;
 const scroller=$('#v11Thread'),offset=scroller?.scrollTop||0,focused=$('#v11Form input')===document.activeElement;
 if(!focused){renderDrawer();const next=$('#v11Thread');if(next)next.scrollTop=offset}
 }catch(e){if(!quiet)toast('Comments could not load from the server');console.warn('VibeVerse comment thread:',e)}
 finally{modalLoading=false}
}
function startDrawerChannel(){
 if(drawerChannel){try{client.removeChannel(drawerChannel)}catch{}drawerChannel=null}
 if(!activeVideo||!client)return;
 try{drawerChannel=client.channel('v11-discussion-'+activeVideo).on('postgres_changes',{event:'INSERT',schema:'public',table:'comments',filter:'video_id=eq.'+activeVideo},()=>loadDiscussion({quiet:true})).subscribe(s=>{
 modalLive=s==='SUBSCRIBED';const e=$('#v11LiveStatus');if(e)e.textContent=modalLive?'Live updates active':'Auto refresh enabled'
 })}catch(e){modalLive=false}
}
function openDrawer(id){if(!client)return toast('The real-time network is still connecting');if(!isId(id))return;
 focusRestore=document.activeElement;activeVideo=id;viewer=null;comments=[];replies=[];reactions=[];profiles={};replyTo=null;modalLive=false;
 document.body.classList.add('v11-drawer-open');renderDrawer();$('#v11Sheet .v11-panel')?.focus();startDrawerChannel();loadDiscussion()
}
function closeDrawer(){if(!activeVideo)return;activeVideo=null;replyTo=null;viewer=null;comments=[];replies=[];reactions=[];profiles={};shade.hidden=true;shade.innerHTML='';document.body.classList.remove('v11-drawer-open');if(drawerChannel&&client)try{client.removeChannel(drawerChannel)}catch{}drawerChannel=null;if(focusRestore?.isConnected)focusRestore.focus()}
async function submit(body){
 const author=await getViewer();if(!author)return authNeeded();
 if(!body||body.trim().length<1)return;
 if(activeVideo===null)return;
 const btn=$('#v11Form button[type="submit"]');if(btn)btn.disabled=true;
 try{
 const clean=body.trim(),pending=replyTo;
 if(pending){if(clean.length>240)return toast('Replies must be 240 characters or fewer');
 const r=await client.from('vv_comment_replies').insert({user_id:author.id,comment_id:pending,body:clean});if(r.error)throw r.error
 }else{if(clean.length>300)return toast('Comments must be 300 characters or fewer');
 const r=await client.from('comments').insert({user_id:author.id,video_id:activeVideo,body:clean});if(r.error)throw r.error}
 replyTo=null;toast(pending?'Reply posted':'Comment posted');await loadDiscussion();await refreshMetrics(true);
 }catch(e){toast(e.message||'Could not post. Check your connection.')}
 finally{const b=$('#v11Form button[type="submit"]');if(b)b.disabled=false}
}
async function toggleHeart(id){
 if(!isId(id))return;const author=await getViewer();if(!author)return authNeeded();
 const existing=reactions.some(x=>x.comment_id===id&&x.user_id===author.id);
 try{const q=existing?await client.from('vv_comment_likes').delete().eq('comment_id',id).eq('user_id',author.id):await client.from('vv_comment_likes').insert({comment_id:id,user_id:author.id});if(q.error)throw q.error;await loadDiscussion({quiet:true})}
 catch(e){toast('Comment reaction could not be updated')}
}
async function delComment(id,isReply){const author=await getViewer();if(!author)return authNeeded();if(!confirm(isReply?'Delete your reply?':'Delete your comment and its replies?'))return;
 const table=isReply?'vv_comment_replies':'comments';
 try{const q=await client.from(table).delete().eq('id',id).eq('user_id',author.id);if(q.error)throw q.error;await loadDiscussion({quiet:true});await refreshMetrics(true);toast('Removed')}
 catch(e){toast('Could not remove this message')}
}
document.addEventListener('click',e=>{
 if(e.target.closest('.v11-shade')){closeDrawer();return}
 const b=e.target.closest('button');if(!b)return;
 const d=b.dataset;
 if(d.v11Open){e.preventDefault();openDrawer(d.v11Open);return}
 if(d.v11Close){e.preventDefault();closeDrawer();return}
 if(d.v11Reply){e.preventDefault();replyTo=d.v11Reply;renderDrawer();$('#v11Form input')?.focus();return}
 if(d.v11CancelReply){e.preventDefault();replyTo=null;renderDrawer();$('#v11Form input')?.focus();return}
 if(d.v11Heart){e.preventDefault();toggleHeart(d.v11Heart);return}
 if(d.v11DeleteReply){e.preventDefault();delComment(d.v11DeleteReply,true);return}
 if(d.v11DeleteComment){e.preventDefault();delComment(d.v11DeleteComment,false);return}
 if(d.like&&isId(d.like))setTimeout(()=>refreshMetrics(true),350);
 if(d.comments&&isId(d.comments))setTimeout(()=>refreshMetrics(true),350);
},true);
document.addEventListener('submit',e=>{if(e.target.id!=='v11Form')return;e.preventDefault();submit(String(new FormData(e.target).get('text')||''))},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&activeVideo){closeDrawer();e.preventDefault()}});
const feed=$('#view');if(feed){new MutationObserver(schedule).observe(feed,{childList:true,subtree:false})}
function setup(){
 if(initialized)return;const c=cfg();if(!c||!window.supabase?.createClient)return;
 initialized=true;client=window.supabase.createClient(c.url,c.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
 subscribeMetrics();schedule();refreshMetrics(true);
}
const boot=setInterval(()=>{setup();if(initialized)clearInterval(boot)},1300);
setTimeout(setup,300);
setInterval(()=>{if(!initialized||document.visibilityState==='hidden')return;refreshMetrics(true);if(activeVideo)loadDiscussion({quiet:true})},14000);
window.addEventListener('storage',e=>{if(e.key==='vv2_config'&&cfg()?.url!==client?.supabaseUrl){if(client&&channel)client.removeChannel(channel);initialized=false;client=null;setup()}});
})();