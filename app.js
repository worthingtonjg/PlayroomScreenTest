import {changedTiles} from './diff.js?v=20261012-fixtures-v2';
const $=id=>document.getElementById(id), viewer=new URLSearchParams(location.search).has('viewer');
const canvas=$('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
const channel=new BroadcastChannel('playroom-synthetic-v1');
const tile=document.createElement('canvas'),tctx=tile.getContext('2d');
let previous=null,seq=0,lastSeq=0,frames=0,bytes=0,pngBytes=0,started=performance.now(),paused=false,lastSend=0;
let text='hello synthetic world',point={x:460,y:220},inputAck=null,latency='—',forceFull=true,queue=Promise.resolve();
const pending=new Map();
$('role').textContent=viewer?'Viewer — received images':'Source — generated canvas';
$('sourceControls').hidden=viewer;
$('help').textContent=viewer?'Click the received image to move the target. Focus it and type to edit fake text only.':'Open the viewer, then compare modes at the same frame rate. Only this generated canvas is encoded.';
function stats(){ $('stats').textContent=`${viewer?'Received':'Sent'} frames: ${frames}\nPNG bytes: ${pngBytes.toLocaleString()}\nJSON UTF-8 bytes (includes base64): ${bytes.toLocaleString()}\nAverage JSON KiB/s: ${(bytes/1024/Math.max(1,(performance.now()-started)/1000)).toFixed(2)}\nInput → image drawn: ${latency} ms\n${paused?'Paused — click Resume for another 60 seconds':'Local simulation; these are not network bandwidth or Playroom latency measurements.'}`; }
function draw(now){
 ctx.fillStyle='#101b2d';ctx.fillRect(0,0,640,320);ctx.font='18px monospace';ctx.fillStyle='#74d7b5';
 ['// Fake editor — generated pixels only','const demo = "synthetic";','function greet() {','  return "'+text+'";','}'].forEach((s,i)=>ctx.fillText(s,24,40+i*30));
 ctx.fillStyle='#65b8ff';ctx.fillRect(24+Math.floor(now/100)%200,250,24,24);
 ctx.strokeStyle='#ffce76';ctx.strokeRect(point.x-10,point.y-10,20,20);
}
function sendFrame(){
 const pixels=ctx.getImageData(0,0,640,320).data,full=forceFull||$('mode').value==='full';
 const regions=full?[{x:0,y:0,w:640,h:320}]:changedTiles(pixels,previous,640,320);
 const patches=regions.map(r=>{tile.width=r.w;tile.height=r.h;tctx.drawImage(canvas,r.x,r.y,r.w,r.h,0,0,r.w,r.h);return {...r,url:tile.toDataURL('image/png')};});
 const message={type:'frame',seq:++seq,full,patches,inputAck};
 const wire=JSON.stringify(message);channel.postMessage(wire);count(message,wire);
 previous=pixels;forceFull=false;
}
function count(m,wire){frames++;bytes+=new TextEncoder().encode(wire).length;pngBytes+=m.patches.reduce((sum,p)=>sum+atob(p.url.split(',')[1]).length,0);stats();}
async function receive(m,wire){
 if(!m.full&&m.seq!==lastSeq+1){channel.postMessage(JSON.stringify({type:'hello'}));return;}
 const images=await Promise.all(m.patches.map(async p=>({p,image:await createImageBitmap(await (await fetch(p.url)).blob())})));
 if(m.full)ctx.clearRect(0,0,640,320);
 for(const {p,image} of images){ctx.drawImage(image,p.x,p.y);image.close();}
 lastSeq=m.seq;
 if(pending.has(m.inputAck)){latency=(performance.now()-pending.get(m.inputAck)).toFixed(1);pending.clear();}
 count(m,wire);
}
channel.onmessage=({data})=>{
 const m=JSON.parse(data);
 if(viewer&&m.type==='frame') queue=queue.then(()=>receive(m,data)).catch(e=>{$('stats').textContent=e.message;channel.postMessage(JSON.stringify({type:'hello'}));});
 if(!viewer&&m.type==='hello')forceFull=true;
 if(!viewer&&m.type==='input'){
   if(m.point)point=m.point;
   if(m.key==='Backspace')text=text.slice(0,-1);else if(m.key)text=(text+m.key).slice(-38);
   inputAck=m.id;
 }
};
function input(payload){const id=crypto.randomUUID();pending.clear();pending.set(id,performance.now());channel.postMessage(JSON.stringify({type:'input',id,...payload}));}
if(viewer){
 channel.postMessage(JSON.stringify({type:'hello'}));
 canvas.addEventListener('click',e=>{const r=canvas.getBoundingClientRect();input({point:{x:Math.round((e.clientX-r.left)*640/r.width),y:Math.round((e.clientY-r.top)*320/r.height)}});});
 canvas.addEventListener('keydown',e=>{if(!e.ctrlKey&&!e.metaKey&&!e.altKey&&(e.key.length===1||e.key==='Backspace')){e.preventDefault();input({key:e.key});}});
} else {
 let deadline=performance.now()+60000;
 function loop(now){draw(now);if(!paused&&now>=deadline){paused=true;$('pause').textContent='Resume';stats();}if(!paused&&now-lastSend>=1000/Number($('fps').value)){sendFrame();lastSend=now;}requestAnimationFrame(loop);}
 requestAnimationFrame(loop);
 $('pause').onclick=()=>{paused=!paused;if(!paused){deadline=performance.now()+60000;forceFull=true;}$('pause').textContent=paused?'Resume':'Pause';stats();};
 $('reset').onclick=()=>{frames=bytes=pngBytes=0;started=performance.now();stats();};
 $('mode').onchange=()=>{forceFull=true;$('reset').click();};
}
