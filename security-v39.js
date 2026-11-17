(()=>{'use strict';
const $=s=>document.querySelector(s),esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const BASE='https://qngkwjhhykugjfkwoyam.supabase.co';
let sb=null,me=null,factors=[],aal=null,enroll=null,busy=false;
function message(t,bad=false){const el=$('#status');el.hidden=!t;el.textContent=t||'';el.className='notice'+(bad?' err':'')}
function handle(e){const s=e?.code||'';message(s==='mfa_verification_failed'?'That code was not accepted. Check your authenticator and try the next code.':s.includes('rate')||e?.status===429?'Too many attempts. Please wait and try again.':'The security operation could not be completed. Check the code, your connection, and the project’s MFA settings.',true)}
const check=async promise=>{const r=await promise;if(r.error)throw r.error;return r.data};
function clearSecret(){enroll=null}
function challengeForm(id){return '<form id="verifyForm"><input type="hidden" name="factor" value="'+esc(id)+'"><label>Six-digit authenticator code<input name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required></label><button class="primary" type="submit">Verify account</button></form>'}
function render(){
const root=$('#body');
if(!me){root.innerHTML='<p class="muted">Sign in to your VibeVerse account to manage authentication.</p><a class="primary" href="/account.html">Sign in</a>';return}
if(!aal){root.innerHTML='<p>Security status is unavailable.</p><button class="secondary" data-action="refresh">Retry</button>';return}
const verified=factors.filter(f=>f.status==='verified'),totp=verified.filter(f=>f.factor_type==='totp'),needs=aal.nextLevel==='aal2'&&aal.currentLevel!=='aal2';
let out='<div class="statusline">'+(needs?'Second-factor verification required':aal.currentLevel==='aal2'?'Verified two-factor session':verified.length?'Second factor enrolled':'Password session · two-factor not enabled')+'</div>';
if(needs){out+='<p class="muted">Complete this step before accessing your account or protected records.</p>';
if(totp.length)out+='<label>Authenticator<select id="factorSelect" style="padding:12px;background:#20333d;color:white;border:1px solid #466168;border-radius:10px">'+totp.map(f=>'<option value="'+esc(f.id)+'">'+esc(f.friendly_name||'Authenticator')+'</option>').join('')+'</select></label><div style="margin-top:14px">'+challengeForm(totp[0].id)+'</div>';
else out+='<div class="notice err">Your account requires a factor that this release does not support. Contact the account administrator; do not remove the factor or bypass verification.</div>';
out+='<div class="security-actions" style="margin-top:15px"><button class="secondary" data-action="logout">Sign out</button></div>';root.innerHTML=out;return}
out+='<p class="muted">Private email: '+esc(me.email||'Signed-in creator')+'</p>';
out+=verified.length?verified.map(f=>'<div class="device"><div><b>'+esc(f.friendly_name||'Authenticator')+'</b><small>'+esc(f.factor_type)+' · Verified</small></div><button class="secondary" data-remove="'+esc(f.id)+'" '+(aal.currentLevel==='aal2'?'':'disabled')+'>Remove</button></div>').join(''):'<p class="hint">No verified authenticator has been enrolled yet.</p>';
const pending=factors.filter(f=>f.status!=='verified');
if(pending.length&&!enroll)out+='<p class="hint">An unfinished setup exists. You may remove it before starting again.</p>'+pending.map(f=>'<div class="device"><div><b>'+esc(f.friendly_name||'Unfinished authenticator')+'</b><small>Not verified</small></div><button class="secondary" data-remove="'+esc(f.id)+'">Discard</button></div>').join('');
if(enroll){out+='<section class="enroll"><h2 style="font-size:17px">Finish authenticator setup</h2><p class="hint">Scan this QR code in your authenticator app or enter the setup key manually. Keep it private.</p><img id="setupQr" alt="Authenticator setup QR code" hidden><div><span class="hint">Manual setup key</span><code id="setupSecret"></code></div><form id="enrollForm"><label>Enter the six-digit code<input name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required></label><button class="primary">Enable two-factor authentication</button></form><button class="secondary" data-action="cancel">Cancel unfinished setup</button></section>'}
else out+='<div class="security-actions" style="margin-top:19px"><button class="primary" data-action="enroll">'+(verified.length?'Add another authenticator':'Set up authenticator')+'</button><a href="/account.html">Back to account</a></div>';
root.innerHTML=out;
if(enroll){$('#setupSecret').textContent=enroll.totp.secret||'';const qr=enroll.totp.qr_code;if(typeof qr==='string'&&qr.startsWith('data:image/svg+xml')){$('#setupQr').src=qr;$('#setupQr').hidden=false}}
}
async function refresh(){
try{const u=await check(sb.auth.getUser());me=u.user||null;if(!me){factors=[];aal=null;render();return}
const [a,f]=await Promise.all([check(sb.auth.mfa.getAuthenticatorAssuranceLevel()),check(sb.auth.mfa.listFactors())]);aal=a;factors=f.all||[];render()}
catch(e){aal=null;render();handle(e)}
}
async function run(fn){if(busy)return;busy=true;message('Working securely...');try{await fn()}catch(e){handle(e)}finally{busy=false}}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||busy)return;const a=b.dataset.action;
if(a==='refresh')run(async()=>{await refresh();message('Security status refreshed.')});
if(a==='logout')run(async()=>{await check(sb.auth.signOut({scope:'local'}));clearSecret();location.replace('/account.html')});
if(a==='enroll')run(async()=>{if(enroll)return;enroll=await check(sb.auth.mfa.enroll({factorType:'totp',friendlyName:'VibeVerse authenticator '+new Date().toISOString().slice(0,10)}));render();message('Scan or enter the private setup key in your authenticator.')});
if(a==='cancel')run(async()=>{if(enroll)await check(sb.auth.mfa.unenroll({factorId:enroll.id}));clearSecret();await refresh();message('Unfinished setup removed.')});
if(b.dataset.remove)run(async()=>{const factor=factors.find(f=>f.id===b.dataset.remove);if(!factor)return;if(factor.status==='verified'&&aal?.currentLevel!=='aal2')throw Error('Verification required');if(!confirm('Remove this authenticator? Make sure you can still access your account.')){message('');return}await check(sb.auth.mfa.unenroll({factorId:factor.id}));await check(sb.auth.refreshSession());clearSecret();await refresh();message('Authenticator removed.')});
});
document.addEventListener('submit',e=>{const form=e.target;if(!['enrollForm','verifyForm'].includes(form.id))return;e.preventDefault();run(async()=>{const f=new FormData(form),code=String(f.get('code')||'');if(!/^\d{6}$/.test(code)){message('Enter exactly six digits.',true);return}const id=form.id==='enrollForm'?enroll?.id:($('#factorSelect')?.value||String(f.get('factor')||''));if(!id)throw Error('No factor');await check(sb.auth.mfa.challengeAndVerify({factorId:id,code}));clearSecret();await refresh();if(aal?.currentLevel!=='aal2')throw Error('Session assurance not verified');message('Two-factor verification complete. Your protected session is now verified.');if(new URLSearchParams(location.search).has('verify')){const dest=new URLSearchParams(location.search).get('returnTo');location.replace(['/account.html','/admin-setup.html','/broadcast-studio.html'].includes(dest)?dest:'/account.html')}})});
(async()=>{try{const c=JSON.parse(localStorage.getItem('vv2_config')||'null');if(c?.url?.replace(/\/+$/,'')!==BASE||!/^sb_publishable_/.test(c?.key||'')||!window.supabase?.createClient)throw Error('Connection unavailable');sb=window.supabase.createClient(BASE,c.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});await refresh()}catch(e){message('Could not connect to the account security service.',true);$('#body').innerHTML='<a href="/account.html">Return to account</a>'}})();
})();