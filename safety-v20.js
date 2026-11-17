(()=>{'use strict';
const $=s=>document.querySelector(s),esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ORIGIN='https://qngkwjhhykugjfkwoyam.supabase.co',KEY='sb_publishable__rfc1XG15o-nZ44zT2odpg_pvtQMxaM';
const cats={harassment:'Harassment or bullying',unsafe_content:'Unsafe content',privacy:'Privacy concern',spam:'Spam or scams',other:'Other concern'};
const states={pending:'Awaiting review',reviewed:'Reviewed',dismissed:'Dismissed',room_ended:'Room ended by moderator'};
const check=async p=>{const r=await p;if(r.error)throw r.error;return r.data};
function msg(s,bad=false){const e=$('#status');e.hidden=!s;e.className='safe-notice'+(bad?' error':'');e.textContent=s||''}
const empty=s=>'<div class="safe-empty">'+esc(s)+'</div>';
const fmt=s=>new Date(s).toLocaleString();

let sb,me,rooms=[],busy=false,seq=0;
async function load(){
 const n=++seq;
 const [r,h]=await Promise.all([check(sb.from('vv_live_rooms').select('id,title,host_id').eq('status','active').gt('expires_at',new Date().toISOString()).neq('host_id',me.id).order('created_at',{ascending:false}).limit(60)),check(sb.rpc('vv_my_live_reports'))]);
 if(n!==seq)return;rooms=r||[];$('#formHost').innerHTML=rooms.length?'<form id="reportForm"><label>Room<select name="room" required><option value="">Select a room</option>'+rooms.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.title)+'</option>').join('')+'</select></label><label>Reason<select name="category" required>'+Object.entries(cats).map(([k,v])=>'<option value="'+k+'">'+esc(v)+'</option>').join('')+'</select></label><button class="safe-primary">Submit private report</button></form>':empty('No reportable open rooms are available right now.');
 $('#history').innerHTML=h?.length?h.map(x=>'<article class="safe-item"><div class="safe-row"><strong>'+esc(x.title)+'</strong><span class="safe-state">'+esc(states[x.state]||x.state)+'</span></div><p>'+esc(cats[x.category]||x.category)+'</p><small>Submitted '+esc(fmt(x.created_at))+'</small></article>').join(''):empty('You have not submitted a live-room report.');
 $('#refresh').hidden=false;
}
$('#formHost').onsubmit=async e=>{if(e.target.id!=='reportForm')return;e.preventDefault();if(busy)return;const f=new FormData(e.target),id=String(f.get('room')),cat=String(f.get('category'));if(!rooms.some(x=>x.id===id)||!cats[cat])return;busy=true;const b=e.target.querySelector('button');b.disabled=true;try{const r=await check(sb.rpc('vv_report_live_room',{p_room:id,p_category:cat}));await load();msg(r.duplicate?'You have already reported this room. Your original report remains in your history.':'Report submitted privately. You can check its status here.')}catch(err){msg(err?.code==='42501'?'Verify your account in Security Center before submitting.':'The report could not be submitted. It may have expired or you may have reached the report limit.',true)}finally{busy=false;b.disabled=false}};
$('#refresh').onclick=()=>load().then(()=>msg('Report history refreshed.')).catch(()=>msg('Could not refresh history.',true));
(async()=>{try{if(!window.supabase?.createClient)throw Error();sb=window.supabase.createClient(ORIGIN,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});const r=await sb.auth.getUser();me=r.data.user;if(!me){$('#formHost').innerHTML='<a class="safe-primary" href="/account.html">Sign in to report</a>';return}const a=await check(sb.auth.mfa.getAuthenticatorAssuranceLevel());if(a.nextLevel==='aal2'&&a.currentLevel!=='aal2'){location.replace('/security.html?verify=1');return}await load();sb.auth.onAuthStateChange(e=>{if(e==='SIGNED_OUT'){seq++;location.replace('/account.html')}})}catch{msg('Safety Center could not connect. Sign in again and retry.',true);$('#formHost').innerHTML='<a href="/account.html">Account Center</a>'}})();
})();