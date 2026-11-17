/* VibeVerse 7.0 | Creator Workshop export and uploader integration */
(()=>{'use strict';
const $=s=>document.querySelector(s),v=$('#video'),exp=$('#export'),outGroup=$('#readyActions'),msg=$('#status');
if(!v||!exp||!outGroup)return;
let rendered=null,selectedFile=null,busy=false,ac=null,audioNode=null,audioDest=null,volumeNode=null;
const controls=document.createElement('section');controls.className='w7-options';controls.innerHTML='<b>NEW · VIBEVERSE EXPORT STUDIO 7</b><div class="w7-grid"><label>Export quality<select id="w7Quality"><option value="360">Data Saver · 360p</option><option value="540" selected>Standard · 540p</option><option value="720">High · 720p</option></select></label><label>Audio<label class="w7-inline"><input id="w7Audio" type="checkbox" checked> Include original audio if supported</label></label></div><label class="w7-inline">Volume <span id="w7VolLabel">100%</span><input id="w7Vol" type="range" min="0" max="150" step="10" value="100"></label><p>WebM output. Audio support depends on browser; please preview exported clips before uploading.</p>';
exp.parentNode.insertBefore(controls,exp);
$('#w7Vol').oninput=e=>{$('#w7VolLabel').textContent=e.target.value+'%'};
const send=document.createElement('button');send.type='button';send.className='btn primary';send.textContent='Send edited clip to VibeVerse';outGroup.append(send);
const original=document.createElement('button');original.type='button';original.className='btn';original.textContent='Send original clip to VibeVerse';$('#cover')?.parentElement?.append(original);
$('#file')?.addEventListener('change',e=>{if(e.target.files?.[0]){selectedFile=e.target.files[0];rendered=null}},true);
const styles={normal:'none',cinema:'contrast(1.15) saturate(.86)',warm:'sepia(.25) saturate(1.16)',mono:'grayscale(1)',pop:'saturate(1.55) contrast(1.07)'};
function draw(canvas,params){const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;c.fillStyle='#10222e';c.fillRect(0,0,w,h);if(v.readyState>=2&&v.videoWidth){const k=params.fit==='contain'?Math.min(w/v.videoWidth,h/v.videoHeight):Math.max(w/v.videoWidth,h/v.videoHeight);c.save();c.filter=styles[params.look]||'none';try{c.drawImage(v,(w-v.videoWidth*k)/2,(h-v.videoHeight*k)/2,v.videoWidth*k,v.videoHeight*k)}catch(e){}c.restore()}
if(!params.text)return;c.save();const font=w/480*42,max=w*.86;c.font='900 '+font+'px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillStyle=params.color;c.strokeStyle='#000b';c.lineJoin='round';c.lineWidth=w/480*8;let lines=[],line='';for(const word of params.text.replace(/\n/g,' ').trim().split(/\s+/)){if(!word)continue;const next=line?line+' '+word:word;if(c.measureText(next).width>max&&line){lines.push(line);line=word}else line=next}if(line)lines.push(line);lines=lines.slice(0,5);const size=lines.length*font*1.25,y=params.position==='Top'?h*.17:params.position==='Middle'?h/2-size/2:h*.85-size;lines.forEach((t,i)=>{const ty=y+i*font*1.25;c.strokeText(t,w/2,ty,max);c.fillText(t,w/2,ty,max)});c.restore()}
async function sound(){try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;if(!ac){ac=new AC();audioNode=ac.createMediaElementSource(v);audioDest=ac.createMediaStreamDestination();volumeNode=ac.createGain();audioNode.connect(volumeNode);volumeNode.connect(audioDest);volumeNode.connect(ac.destination)}volumeNode.gain.value=Number($('#w7Vol').value)/100;await ac.resume();return audioDest.stream.getAudioTracks()[0]?.clone()||null}catch(e){console.warn('Audio not captured',e);return null}}
const mime=audio=>{if(!window.MediaRecorder?.isTypeSupported)return null;return (audio?['video/webm;codecs=vp8,opus','video/webm','video/webm;codecs=vp8']:['video/webm;codecs=vp8','video/webm']).find(x=>MediaRecorder.isTypeSupported(x))||null};
async function seek(t){if(Math.abs(v.currentTime-t)<.08)return;await new Promise((ok,fail)=>{const timer=setTimeout(()=>fail(Error('Seek timed out')),6000);v.addEventListener('seeked',()=>{clearTimeout(timer);ok()},{once:true});v.currentTime=t})}
async function render(){
if(busy)return;const begin=Number($('#start')?.value),end=Number($('#end')?.value),quality=Number($('#w7Quality').value),include=$('#w7Audio').checked;
if(!Number.isFinite(v.duration)||v.duration<=0){msg.textContent='Choose a valid video first';return}
if(!Number.isFinite(begin)||!Number.isFinite(end)||end-begin<.5||end-begin>60){msg.textContent='Select a clip between 0.5 and 60 seconds';return}
if(![360,540,720].includes(quality)||!mime(include)){msg.textContent='WebM export is unavailable in your browser';return}
const canvas=document.createElement('canvas');canvas.width=quality;canvas.height=Math.round(quality*16/9);
if(typeof canvas.captureStream!=='function'){msg.textContent='Your browser does not support canvas video export';return}
busy=true;rendered=null;exp.disabled=true;outGroup.hidden=true;v.pause();msg.textContent='Rendering '+quality+'p locally… Keep the page open.';
let stream=null,recorder=null,timer=null,raf=null,watch=null,ended=false,painting=true,audioCaptured=false;
try{
await seek(begin);
const params={fit:$('#fit').value,look:document.querySelector('[data-look].on')?.dataset.look||'normal',text:$('#text').value,color:$('#color').value,position:$('#position').value};
draw(canvas,params);stream=canvas.captureStream(24);
if(include){const track=await sound();if(track){stream.addTrack(track);audioCaptured=true}}
const result=new Promise((ok,fail)=>{let chunks=[];recorder=new MediaRecorder(stream,{mimeType:mime(audioCaptured)||mime(false),videoBitsPerSecond:quality===360?850000:quality===540?1800000:3200000});recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};recorder.onerror=e=>fail(e.error||Error('Record error'));recorder.onstop=()=>chunks.length?ok(new Blob(chunks,{type:recorder.mimeType||'video/webm'})):fail(Error('No recorded frames'));recorder.start(250)});
const drawFrame=()=>{if(!painting)return;draw(canvas,params);raf=requestAnimationFrame(drawFrame)};raf=requestAnimationFrame(drawFrame);
const finish=()=>{if(ended)return;ended=true;painting=false;if(raf)cancelAnimationFrame(raf);v.pause();if(recorder?.state==='recording')recorder.stop()};
watch=()=>{if(v.currentTime>=end-.08)finish()};v.addEventListener('timeupdate',watch,true);timer=setTimeout(finish,Math.ceil((end-begin)*1000)+7500);
try{await v.play()}catch(e){finish();throw e}
const blob=await result;rendered=new File([blob],'vibeverse-'+quality+'p-'+Date.now()+'.webm',{type:blob.type});
outGroup.hidden=false;msg.textContent='Ready: '+Math.ceil(blob.size/1024)+' KB. '+(audioCaptured?'Audio capture attempted; verify by playing the file.':'Export contains no original audio.');
}catch(e){console.warn(e);msg.textContent='Export failed: '+(e.message||'Try a smaller clip')}
finally{if(timer)clearTimeout(timer);if(raf)cancelAnimationFrame(raf);if(watch)v.removeEventListener('timeupdate',watch,true);if(recorder?.state==='recording')try{recorder.stop()}catch(e){}if(stream)stream.getTracks().forEach(t=>t.stop());v.pause();exp.disabled=false;busy=false}
}
function download(f){const u=URL.createObjectURL(f),a=document.createElement('a');a.href=u;a.download=f.name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500)}
exp.onclick=null;exp.addEventListener('click',render);
$('#download').onclick=null;$('#download').addEventListener('click',()=>{if(rendered)download(rendered)});
function db(){return new Promise((ok,fail)=>{const r=indexedDB.open('VibeVerseVideoHandoff',1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('handoff'))r.result.createObjectStore('handoff',{keyPath:'id'})};r.onsuccess=()=>ok(r.result);r.onerror=()=>fail(r.error)})}
async function transfer(f){if(!f){msg.textContent='Select or render a clip first';return}if(f.size>150*1048576){msg.textContent='Video exceeds 150 MB upload limit';return}try{const d=await db();await new Promise((ok,fail)=>{const tr=d.transaction('handoff','readwrite'),rq=tr.objectStore('handoff').put({id:'pending',file:f,savedAt:Date.now()});rq.onsuccess=ok;rq.onerror=()=>fail(rq.error);tr.oncomplete=()=>d.close()});location.assign('/?workshop-import=1#upload')}catch(e){msg.textContent='Automatic transfer unavailable. Download and upload the clip manually.'}}
send.onclick=()=>transfer(rendered);
original.onclick=async()=>{if(selectedFile)return transfer(selectedFile);let src=v.currentSrc||v.src;if(!src.startsWith('blob:'))return msg.textContent='Select a source video first';try{const r=await fetch(src),blob=await r.blob();transfer(new File([blob],'vibeverse-original-'+Date.now()+'.webm',{type:blob.type||'video/webm'}))}catch(e){msg.textContent='Source video unavailable'}};
})();