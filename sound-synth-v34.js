(function(g){'use strict';
const catalogue={'soft-pulse':8,'cinema-rise':6,'gentle-chime':5,'transition-sweep':2};
function wave(id){if(!Object.hasOwn(catalogue,id))throw Error('Unknown sound');const sr=24000,d=catalogue[id],n=sr*d,buf=new ArrayBuffer(44+n*2),v=new DataView(buf),word=(p,s)=>{for(let j=0;j<s.length;j++)v.setUint8(p+j,s.charCodeAt(j))};word(0,'RIFF');v.setUint32(4,36+n*2,true);word(8,'WAVE');word(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,sr,true);v.setUint32(28,sr*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);word(36,'data');v.setUint32(40,n*2,true);
const sin=(f,t)=>Math.sin(2*Math.PI*f*t);let seed=21307;const noise=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2147483648-1};
for(let i=0;i<n;i++){const t=i/sr,x=t/d;let y=0;
if(id==='soft-pulse'){const beat=t%0.5,step=Math.floor(t/.5),f=[110,130.81,164.81,146.83][Math.floor(step/4)%4];y=.26*sin(f,t)*Math.exp(-beat*8)+.12*sin(f*2,t)*Math.exp(-beat*10)+.13*Math.sin(2*Math.PI*(58*beat+18*(1-Math.exp(-beat*25))/25))*Math.exp(-beat*14)+.06*noise()*Math.exp(-(t%.25)*45)}
else if(id==='cinema-rise'){y=(.19*sin(110,t)+.12*sin(164.81,t)+.08*sin(220.25,t)+.08*sin(330.1,t))*Math.pow(x,.65)+.08*Math.sin(2*Math.PI*(95*t+19*t*t))*x*x}
else if(id==='gentle-chime'){const notes=[261.63,329.63,392,523.25,440];for(let j=0;j<notes.length;j++){const dt=t-j*.62;if(dt>=0)y+=.14*(sin(notes[j],dt)+.27*sin(notes[j]*2.01,dt))*Math.exp(-dt*3.6)*Math.min(1,dt*90)}}
else{y=.29*Math.sin(2*Math.PI*(180*t+240*t*t))*Math.sin(Math.PI*x)**2+.12*noise()*Math.sin(Math.PI*x)**3}
const envelope=Math.min(1,t/.04,(d-t)/.18);v.setInt16(44+i*2,Math.round(Math.max(-.9,Math.min(.9,y*envelope))*32767),true)}
return new Uint8Array(buf)}
g.VV34OriginalSound=Object.freeze({wave,catalogue:Object.freeze(catalogue)});
})(typeof window==='object'?window:globalThis);