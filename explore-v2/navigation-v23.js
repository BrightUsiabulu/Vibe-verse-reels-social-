(()=>{'use strict';
const $=(s,r=document)=>r.querySelector(s), all=(s,r=document)=>[...r.querySelectorAll(s)];
let queued=false;
const friends='<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="9" cy="8" r="3"/><path d="M2 20v-3a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v3M17 5a3 3 0 0 1 0 6M22 20v-3a5 5 0 0 0-4-5"/></svg><span>Friends</span>';
function nav(){for(const id of ['mobileNav','desktopNav']){const n=$('#'+id);if(!n)continue;if(!$('[data-vv22-friends]',n)){const b=document.createElement('button');b.dataset.vv22Friends='1';b.innerHTML=friends;n.append(b)}}
const following=location.hash===''&&!!$('#view [data-tab="following"].on');document.body.classList.toggle('vv23-friends',following);
for(const b of all('[data-vv22-friends]'))b.classList.toggle('on',following);
}
function addRow(section,label,action,icon){if(!section||$('[data-vv22-menu="'+action+'"]',section))return;const b=document.createElement('button');b.className='vv22-menurow';b.dataset.vv22Menu=action;b.innerHTML='<svg aria-hidden="true"><use href="#i-'+icon+'"/></svg><span></span><small>›</small>';b.querySelector('span').textContent=label;section.append(b)}
function menu(){const d=$('.vv22-menu');if(!d||d.dataset.vv23)return;d.dataset.vv23='1';const sections=all('section',d),personal=sections[1],creation=sections[2];addRow(personal,'Explore','explore','compass');addRow(personal,'Tools','tools','sparkles');addRow(creation,'Video editor','edit-video','video');const w=$('[data-vv22-menu="wallet"] span',d);if(w)w.textContent='Wallet & balance';const e=$('[data-vv22-menu="earn"] span',d);if(e)e.textContent='Earn · Creator earnings & business';const l=$('[data-vv22-menu="metrics"] span',d);if(l)l.textContent='Live Network · Creator metrics';}
function liveExploreNav(){
 const bar=$('.mobileHeader > div:last-child');
 if(bar&&!bar.querySelector('[data-vv-explore-live]')){
  const a=document.createElement('a');a.href='/explore.html';a.dataset.vvExploreLive='1';a.textContent='Explore';a.setAttribute('aria-label','Explore public videos and photos');
  a.style.cssText='display:inline-flex;align-items:center;justify-content:center;color:#70e4cc;text-decoration:none;font-size:12px;font-weight:750;padding:7px 5px;white-space:nowrap';bar.prepend(a);
 }
 const side=$('.sidebarBottom');
 if(side&&!side.querySelector('[data-vv-explore-live]')){
  const a=document.createElement('a');a.href='/explore.html';a.dataset.vvExploreLive='1';a.textContent='✦ Explore public videos & photos';a.style.cssText='display:block;color:#70e4cc;text-decoration:none;font-weight:750;font-size:12px;margin:9px 0';side.prepend(a);
 }
 const settings=$('#view .settingsGrid');
 if(settings&&!settings.querySelector('[data-vv-explore-live]')){
  const a=document.createElement('a');a.href='/explore.html';a.dataset.vvExploreLive='1';a.textContent='Explore real videos & photos →';a.style.cssText='display:block;color:#70e4cc;font-weight:750;margin:10px 0';settings.append(a);
 }
}
function wallet(){location.assign('/wallet.html')}
function sync(){queued=false;if(location.hash==='#wallet'){wallet();return}nav();menu();liveExploreNav()}
function queue(){if(!queued){queued=true;queueMicrotask(sync)}}
document.addEventListener('click',e=>{const b=e.target.closest('button,a');if(!b)return;
if(b.matches('[data-v12-nav],[data-vv22-menu="wallet"]')||b.matches('a[href="/#wallet"],a[href="#wallet"]')){e.preventDefault();e.stopImmediatePropagation();wallet();return}
if(b.matches('[data-vv22-friends]')){e.preventDefault();e.stopImmediatePropagation();const home=$('#mobileNav [data-route=home]')||$('#desktopNav [data-route=home]');home?.click();setTimeout(()=>{$('#view [data-tab="following"]')?.click();queue()},60);return}
const a=b.dataset.vv22Menu, destinations={'explore':'/explore.html','tools':'/#plugins','edit-video':'/workshop.html'};
if(destinations[a]){e.preventDefault();e.stopImmediatePropagation();$('.vv22-menu')?.close();if(a==='edit-video'||a==='explore'){location.assign(destinations[a]);return}const target=a==='explore'?'[data-route="explore"]':'[data-vv4-route="plugins"]';const original=$('#desktopNav '+target)||$('#mobileNav '+target);if(original){original.click()}else{location.assign(destinations[a]);location.reload()}return}
if(b.dataset.route!==undefined||b.dataset.tab!==undefined)setTimeout(queue,0);
},true);
for(const id of ['view','mobileNav','desktopNav']){const n=$('#'+id);if(n)new MutationObserver(queue).observe(n,{childList:true,subtree:id==='view'})}
window.addEventListener('hashchange',queue);queue();
})();