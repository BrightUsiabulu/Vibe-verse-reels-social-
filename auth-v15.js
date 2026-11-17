(()=>{'use strict';
const $=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)],esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const BASE='https://vibeverse-bright-studio.vercel.app',ORIGIN='https://qngkwjhhykugjfkwoyam.supabase.co';
let sb=null,me=null,mode='login',busy=false,recovery=false,booted=false;
const params=new URLSearchParams(location.search),hash=new URLSearchParams(location.hash.slice(1));
const hintMode=params.get('mode');if(['login','signup','forgot','resend','recovery'].includes(hintMode))mode=hintMode;
const hadRecovery=hash.get('type')==='recovery'&&!!hash.get('access_token');
function msg(t,error=false){const m=$('#message');m.hidden=!t;m.textContent=t||'';m.className='notice'+(error?' err':'')}
function field(n,label,type='text',auto='',min=0,max=250){const input='<input name="'+n+'" type="'+type+'" autocomplete="'+auto+'" maxlength="'+max+'" '+(min?'minlength="'+min+'"':'')+' required>';
 return '<label>'+label+(type==='password'?'<span class="password">'+input+'<button type="button" data-show="'+n+'" aria-label="Show password">Show</button></span>':input)+'</label>'}
function go(next){mode=next;msg('');render()}
async function requireSecondFactor(){if(!me||recovery||mode==='recovery')return false;const r=await sb.auth.mfa.getAuthenticatorAssuranceLevel();if(r.error)throw r.error;if(r.data.nextLevel==='aal2'&&r.data.currentLevel!=='aal2'){location.replace('/security.html?verify=1');return true}return false}
function render(){
 const account=!!me&&mode!=='recovery',titles={login:['Welcome back','Sign in using your registered email address.'],signup:['Create your account','Choose a public creator display name and a private password.'],forgot:['Reset your password','Request a secure password-reset email.'],resend:['Verify your email','Request another confirmation email.'],recovery:['Choose a new password','Use the verified recovery session to set a new password.'],change:['Change your password','Confirm your current password to update it.']};
 $('#tabs').hidden=account||mode==='recovery';all('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
 if(account&&mode!=='change'){
  $('#heading').textContent='Your account';$('#subtitle').textContent='Signed in with your verified VibeVerse session.';
  $('#body').innerHTML='<div class="account"><div class="account-line"><small>Private email</small><strong>'+esc(me.email||'Account')+'</strong></div><div class="account-line"><small>Email verification</small><strong>'+(me.email_confirmed_at?'Verified':'Not verified')+'</strong></div><div class="account-line"><small>Creator display name</small><strong>'+esc(me.user_metadata?.display_name||'Creator')+'</strong></div><a class="primary" style="text-align:center;text-decoration:none" href="/#home">Open VibeVerse</a><div class="row"><a class="secondary" href="/security.html">Two-factor security</a><button class="secondary" data-action="change">Change password</button><button class="secondary" data-action="logout">Sign out</button><button class="secondary" data-action="global">Sign out all devices</button></div></div>';
  $('#secondary').innerHTML='<div class="provider-note">Signing out all devices revokes refresh sessions. Existing access tokens may remain valid until expiry.</div>';return;
 }
 const [heading,sub]=titles[mode]||titles.login;$('#heading').textContent=heading;$('#subtitle').textContent=sub;
 if(mode==='recovery'&&!recovery){$('#body').innerHTML='<div class="notice">A valid password-reset email link is needed. Request a new link if this one is expired.</div><button class="primary" data-action="forgot">Request a reset link</button>';$('#secondary').textContent='';return}
 const email=field('email','Email address','email','email');
 const pass=field('password',mode==='change'||mode==='recovery'?'New password':'Password','password',mode==='login'?'current-password':'new-password',mode==='login'?1:12,128);
 const confirm=field('confirm','Confirm new password','password','new-password',12,128);
 let content='',button='';
 if(mode==='login'){content=email+pass;button='Sign in'}
 if(mode==='signup'){content=field('name','Public display name','text','nickname',2,40)+email+pass+confirm+'<p class="hint">Use at least 12 characters. A unique password or passphrase is recommended. Your display name is public; avoid sharing personal information.</p>';button='Create account'}
 if(mode==='forgot'||mode==='resend'){content=email;button=mode==='forgot'?'Send reset email':'Resend confirmation'}
 if(mode==='recovery'){content=pass+confirm;button='Save new password'}
 if(mode==='change'){content=field('current','Current password','password','current-password',1,128)+pass+confirm;button='Update password'}
 $('#body').innerHTML='<form id="accountForm">'+content+'<button class="primary" type="submit">'+button+'</button></form>';
 $('#secondary').innerHTML='<div class="links">'+(mode==='login'?'<button class="link" data-action="forgot">Forgot password?</button><button class="link" data-action="resend">Resend verification email</button>':mode==='change'?'<button class="link" data-action="account">Back to account</button>':'<button class="link" data-action="login">Back to sign in</button>')+'</div><div class="provider-note">Email authentication is enabled. Google, Facebook, Apple and phone sign-in require separate provider configuration and are not currently enabled.</div>';
}
function nice(e){const code=e?.code||'';if(code==='invalid_credentials')return 'Email or password is incorrect. Check your details and try again.';if(code==='email_not_confirmed')return 'Please verify your email before signing in. Use Resend verification email if needed.';if(code==='over_email_send_rate_limit'||code==='over_request_rate_limit'||e?.status===429)return 'Too many attempts. Please wait before trying again.';if(code==='weak_password')return 'Choose a stronger, unique password.';if(code==='same_password')return 'Choose a different password.';return 'The request could not be completed. Check your details, internet connection, and email verification status.'}
async function submit(form){if(busy||!sb)return;const f=new FormData(form),email=String(f.get('email')||'').trim(),pw=String(f.get('password')||''),name=String(f.get('name')||'').trim(),current=String(f.get('current')||'');const action=mode;
 if(['signup','change','recovery'].includes(action)&&(pw.length<12||pw!==String(f.get('confirm')||''))){msg('Use at least 12 characters and make sure both passwords match.',true);return}
 if(action==='signup'&&name.length<2){msg('Enter a display name of at least two characters.',true);return}
 busy=true;const btn=form.querySelector('[type=submit]');btn.disabled=true;msg('Working securely...');
 try{
  let r;
  if(action==='login'){
   r=await sb.auth.signInWithPassword({email,password:pw});if(r.error)throw r.error;
   if(!r.data.session)throw Error('No session');me=(await sb.auth.getUser()).data.user;if(!me)throw Error('User not verified');mode='login';if(await requireSecondFactor())return;render();msg('Signed in successfully.');
  }else if(action==='signup'){
   r=await sb.auth.signUp({email,password:pw,options:{data:{display_name:name},emailRedirectTo:BASE+'/account.html'}});
   if(r.error)throw r.error;
   if(r.data.session){me=(await sb.auth.getUser()).data.user;mode='login';render();msg('Account created and signed in.')}
   else{go('login');msg('Check your inbox for a verification email. If an account can be created for this address, follow the email link before signing in.')}
  }else if(action==='forgot'){
   r=await sb.auth.resetPasswordForEmail(email,{redirectTo:BASE+'/account.html?mode=recovery'});if(r.error)throw r.error;go('login');msg('If an account exists for that email, a password reset link has been requested. Check your inbox and spam folder.');
  }else if(action==='resend'){
   r=await sb.auth.resend({type:'signup',email,options:{emailRedirectTo:BASE+'/account.html'}});if(r.error)throw r.error;go('login');msg('If verification is needed, a confirmation email has been requested.');
  }else if(action==='recovery'||action==='change'){
   const check=await sb.auth.getUser();if(!check.data.user||check.error||(action==='recovery'&&!recovery))throw Error('Verified session required');
   r=await sb.auth.updateUser(action==='change'?{password:pw,current_password:current}:{password:pw});if(r.error)throw r.error;
   recovery=false;mode='login';me=r.data.user;history.replaceState(null,'','/account.html');render();msg('Password updated successfully. You can sign out of all devices from your account controls.');
  }
 }catch(e){msg(nice(e),true)}finally{busy=false;if(btn.isConnected)btn.disabled=false}
}
async function logout(scope){if(!sb||busy)return;if(scope==='global'&&!confirm('Sign out all VibeVerse sessions?'))return;busy=true;try{const {error}=await sb.auth.signOut({scope});if(error)throw error;me=null;recovery=false;mode='login';render();msg('Signed out.')}catch(e){msg(nice(e),true)}finally{busy=false}}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.show){const x=b.parentElement.querySelector('input');const show=x.type==='password';x.type=show?'text':'password';b.textContent=show?'Hide':'Show';b.setAttribute('aria-label',show?'Hide password':'Show password');return}if(busy)return;if(b.dataset.mode){go(b.dataset.mode);return}const a=b.dataset.action;if(a==='logout'||a==='global'){logout(a==='global'?'global':'local');return}if(a==='account'){go('login');return}if(a)go(a)});
document.addEventListener('submit',e=>{if(e.target.id==='accountForm'){e.preventDefault();submit(e.target)}});
async function init(){
 try{const c=JSON.parse(localStorage.getItem('vv2_config')||'null');if(c?.url?.replace(/\/+$/,'')!==ORIGIN||!/^sb_publishable_/.test(c?.key||'')||!window.supabase?.createClient)throw Error('Connection unavailable');sb=window.supabase.createClient(ORIGIN,c.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'implicit'}});
 sb.auth.onAuthStateChange((event,session)=>{if(event==='PASSWORD_RECOVERY'&&session){recovery=true;mode='recovery';if(booted)setTimeout(()=>{render();msg('Recovery session verified. Choose a new password.')},0)}else if(event==='SIGNED_OUT'&&booted){me=null;recovery=false;setTimeout(()=>{mode='login';render()},0)}});
 const {data,error}=await sb.auth.getUser();me=error?null:data.user;
 if(hadRecovery&&me&&recovery)mode='recovery';else if(mode==='recovery'&&!recovery)mode='recovery';else if(me)mode='login';
 booted=true;if(await requireSecondFactor())return;render();if(recovery)msg('Recovery session verified. Choose a new password.');
 else if(hash.get('error')||params.get('error'))msg('The confirmation or recovery link is invalid or expired. Request a new email.',true);
 // Never retain an auth callback fragment in the visible address.
 if(location.hash||params.has('error')||params.has('code'))history.replaceState(null,'',location.pathname+(mode==='recovery'?'?mode=recovery':''));
 }catch(e){$('#body').innerHTML='<div class="notice err">The authentication connection is unavailable. Return to VibeVerse and retry.</div><a href="/">Open VibeVerse</a>';msg('Account service could not connect.',true)}
}
init();
})();