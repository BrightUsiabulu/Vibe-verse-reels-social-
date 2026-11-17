(()=>{'use strict';
const href='/account.html';
const launch=mode=>location.assign(href+'?mode='+mode);
document.addEventListener('click',e=>{const b=e.target.closest('button[data-action="auth"]');if(b){e.preventDefault();e.stopImmediatePropagation();launch('login')}},true);
// Route the legacy login modal's registration and login actions through the new center.
function upgrade(){const form=document.getElementById('authForm');if(form&&!form.dataset.v15){form.dataset.v15='1';const m=form.dataset.mode==='signup'?'signup':'login';form.replaceChildren();const p=document.createElement('p');p.className='hint';p.textContent='Use the new secure VibeVerse Account Center to sign in, register or recover your password.';const a=document.createElement('a');a.href=href+'?mode='+m;a.textContent=m==='signup'?'Create account securely':'Sign in securely';a.className='primary wideButton';a.style.cssText='display:block;text-align:center;padding:13px;text-decoration:none';form.append(p,a)}}
const root=document.getElementById('modalRoot');if(root)new MutationObserver(upgrade).observe(root,{childList:true,subtree:true});upgrade();
const nav=document.querySelector('#desktopNav');if(nav&&!nav.querySelector('[data-v15-account]')){const b=document.createElement('a');b.href=href;b.dataset.v15Account='1';b.textContent='Account Center';b.style.cssText='display:block;margin:8px;padding:12px;border-radius:9px;background:#1d443c;color:#b8ffe6;text-decoration:none;font-weight:800;font-size:12px';nav.append(b)}
})();