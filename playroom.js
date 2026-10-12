import {changedTiles} from './diff.js';
import {createTextSharing} from './shared-text.js';
const $=id=>document.getElementById(id),canvas=$('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
let sdk,role,connected=false,active=false,used=false,timer,previous=null,sequence=0,received=0,total=0,actions=0,value=0,ack=null,last=0;
let pending=new Map(),lastInput=-Infinity,until=0,localInputs=0,shownActions=0;
let rpcCallbacks=0,actionReceipts=0,sendAttempts=0,sourceReplies=0;
const encoder=new TextEncoder(),name='syntheticCanvasTrialV1';
const report=s=>$('status').textContent=s;
const textSharing=createTextSharing({editor:$('sharedText'),output:$('receivedText'),status:$('textStatus'),session:crypto.randomUUID(),send:message=>sdk.RPC.call('syntheticTextV1',message,sdk.RPC.Mode.OTHERS)});
function selectTextRole(){if(connected)return;const selected=$('role').value;textSharing.selectRole(selected);$('viewerText').hidden=selected!=='viewer';$('sourceText').hidden=selected!=='source';}
$('role').onchange=selectTextRole;
selectTextRole();
$('sendText').onclick=()=>textSharing.resend();
function disconnected(){connected=false;active=false;clearInterval(timer);textSharing.disconnect();$('start').disabled=true;$('sendText').disabled=true;report('Disconnected. Reload this page to reconnect.');}
$('disconnect').onclick=()=>{disconnected();location.replace(location.pathname+location.search);};
const feedback=s=>$('inputStatus').textContent=`Local inputs: ${localInputs}; action send attempts: ${sendAttempts}; confirmed source replies: ${sourceReplies}; RPC callbacks: ${rpcCallbacks}; source action callbacks: ${actionReceipts}; source actions applied: ${role==='source'?actions:shownActions}. ${s}`;
function stop(reason){active=false;clearInterval(timer);$('start').disabled=true;report(reason+' Run ended. Reload BOTH tabs and reconnect to start another bounded run.');}
function draw(){ctx.fillStyle='#152034';ctx.fillRect(0,0,160,96);ctx.fillStyle='#8ee7bc';ctx.font='10px monospace';ctx.fillText('// synthetic',8,16);ctx.fillText('const demo = '+value,8,34);ctx.fillStyle='#69baff';ctx.fillRect(8+(sequence*9)%120,64,12,12);}
draw();
async function send(message){
 const wire=JSON.stringify(message),size=encoder.encode(wire).length;
 if(size>8192||total+size>65536){stop('Application payload cap reached (8 KiB/message, 64 KiB/tab).');return false;}
 total+=size;
 try{
   if(message.type==='action')sendAttempts++;
   const response=await sdk.RPC.call(name,wire,sdk.RPC.Mode.OTHERS);
   if(message.type==='action'){
     if(response?.role==='source'&&response.id===message.id){sourceReplies++;feedback(`Source replied: ${response.result}; applied total: ${response.applied}. Image acknowledgement is separate.`);}
     else feedback('RPC resolved without a matching SOURCE response. Check both role/room/player displays.');
   }
   return true;
 }
 catch(e){stop('RPC failed: '+e.message);return false;}
}
async function frame(){
 if(!active)return;
 draw();const pixels=ctx.getImageData(0,0,160,96).data;
 const full=!previous||$('mode').value==='full';
 const regions=full?[{x:0,y:0,w:160,h:96}]:changedTiles(pixels,previous,160,96,32);
 const patches=regions.map(r=>{const c=document.createElement('canvas');c.width=r.w;c.height=r.h;c.getContext('2d').drawImage(canvas,r.x,r.y,r.w,r.h,0,0,r.w,r.h);return {...r,url:c.toDataURL('image/png')};});
 previous=pixels;sequence++;
 // Do not await responses in the timer: the fixed run deadline always stops scheduling.
 void send({type:'frame',sequence,full,patches,ack,sourceActions:actions});
 report(`Playroom RPC attempted frames: ${sequence}/10; outgoing JSON bytes: ${total}. Viewer must confirm receipt.`);
 if(sequence>=10)stop(`Run finished: ${sequence} frame attempts; ${total} outgoing JSON bytes.`);
}
let receiveQueue=Promise.resolve();
async function receive(wire){
 if(typeof wire!=='string'||encoder.encode(wire).length>8192)return;
 const m=JSON.parse(wire);
 if(role==='source'&&m.type==='action'){
   actionReceipts++;
   const reply=result=>({role,id:m.id,result,applied:actions});
   if(!active){feedback('Action arrived outside the run; reload both tabs and start again.');return reply('rejected: run inactive');}
   if(actions>=20){feedback('Action limit reached.');return reply('rejected: action limit');}
   actions++;value=(value+1)%10;ack=m.id;draw();
   feedback(`Received demo action; source value is ${value}. Viewer sees it in the next frame.`);return reply('applied');
 }
 if(role!=='viewer'||m.type!=='frame'||received>=10)return;
 if(!m.full&&m.sequence!==last+1){report('Missing tile baseline; reload both tabs for a fresh run.');return;}
 if(!Array.isArray(m.patches)||m.patches.length>15)return;
 for(const p of m.patches){
   if(!Number.isInteger(p.x)||!Number.isInteger(p.y)||p.x<0||p.y<0||p.x+p.w>160||p.y+p.h>96||!/^data:image\/png;base64,/.test(p.url))return;
   const img=await createImageBitmap(await (await fetch(p.url)).blob());ctx.drawImage(img,p.x,p.y);img.close();
 }
 last=m.sequence;received++;until=performance.now()+2000;shownActions=m.sourceActions??0;
 const delay=pending.has(m.ack)?(performance.now()-pending.get(m.ack)).toFixed(1)+' ms':'no new input acknowledgement';
 if(pending.has(m.ack))pending.clear();
 feedback(received>=10?'Run ended. Reload BOTH tabs and reconnect before trying input again.':`Frame ${received}/10: click the canvas, then type now. Each action cycles a number; letters do not appear. ${delay}.`);
 report(`Received Playroom frames: ${received}/10; latest JSON bytes: ${encoder.encode(wire).length}; input to image drawn: ${delay}. Excludes physical display timing.`);
}
async function rpcHandler(wire,sender){
 rpcCallbacks++;
 $('rpcStatus').textContent=`RPC callback ${rpcCallbacks}; sender: ${sender?.id??'unknown'}; payload type: ${typeof wire}`;
 const operation=receiveQueue.then(()=>receive(wire));
 receiveQueue=operation.catch(e=>stop('Receive failed: '+e.message));
 return (await operation)??{role,result:'handled without applying an action'};
}
$('connect').onclick=async()=>{
 const gameId=$('gameId').value.trim(),roomCode=$('room').value.trim();role=$('role').value;
 if(!gameId||(role==='viewer'&&!roomCode)){report('Enter gameId and, for viewer, the source room code.');return;}
 $('connect').disabled=true;report('Loading SDK and connecting...');
 try{
   await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://unpkg.com/playroomkit/multiplayer.full.umd.js';script.crossOrigin='anonymous';script.onload=resolve;script.onerror=()=>reject(new Error('SDK CDN load failed'));document.head.append(script);});
   sdk=window.Playroom;
   if(!sdk?.insertCoin||!sdk?.RPC)throw new Error('Documented Playroom global/API unavailable');
   // An old #r= fragment overrides roomCode in the SDK. Explicit form selection wins here.
   history.replaceState(null,'',location.pathname+location.search);
   await sdk.insertCoin({gameId,skipLobby:true,maxPlayersPerRoom:2,...(roomCode?{roomCode}:{})});
   sdk.RPC.register(name,rpcHandler);
   sdk.RPC.register('syntheticTextV1',async message=>textSharing.receive(message));
   sdk.onDisconnect(disconnected);
   connected=true;
   textSharing.connect(role);$('viewerText').hidden=role!=='viewer';$('sourceText').hidden=role!=='source';$('sendText').disabled=role!=='viewer';$('disconnect').disabled=false;
   for(const id of ['role','gameId','room'])$(id).disabled=true;
   $('start').disabled=role!=='source';report(`Connected as ${role}. Room: ${sdk.getRoomCode()}. No images sent yet.`);
   $('connectionStatus').textContent=`Role: ${role}; room: ${sdk.getRoomCode()}; player: ${sdk.myPlayer().id}; elected host: ${sdk.isHost()}. Both tabs must have the same room and different player IDs. RPC targets OTHERS, not HOST.`;
   feedback(role==='viewer'?'Waiting for source to start. Click canvas to focus it; input works while frames 1-9 arrive.':'Viewer must connect before you start. Watch source action count here.');
 }catch(e){report('Connection failed: '+e.message+'. Reload to retry.');}
};
$('start').onclick=()=>{
 if(!connected||role!=='source'||used)return;
 used=true;active=true;$('start').disabled=true;$('mode').disabled=true;
 feedback('Run started. Click/type in the VIEWER now; source receipt count updates here.');
 timer=setInterval(frame,1000);setTimeout(()=>{if(active)stop('10-second run deadline reached.');},10500);
};
function demoAction(){
 const now=performance.now();localInputs++;
 if(!connected){feedback('Not connected. Select Viewer and connect first.');return;}
 if(role!=='viewer'){feedback('This is the SOURCE. Click/type on the VIEWER canvas.');return;}
 if(received>=10){feedback('Run ended. Reload BOTH tabs, reconnect, then start a fresh run.');return;}
 if(!received){feedback('No frame received yet. Start the source after both tabs connect.');return;}
 if(now>until){feedback('Frames have stopped. If the source run ended, reload BOTH tabs and reconnect.');return;}
 if(actions>=20){feedback('20-action limit reached; reload both tabs for a fresh run.');return;}
 if(now-lastInput<500){feedback('Input seen but throttled. Wait half a second between demo actions.');return;}
 lastInput=now;actions++;const id=crypto.randomUUID();pending.clear();pending.set(id,now);void send({type:'action',id});
 feedback('Action send attempted; waiting for a SOURCE response and then image acknowledgement. No typed character is sent.');
}
canvas.onclick=()=>{canvas.focus();demoAction();};
canvas.onfocus=()=>{$('focusStatus').textContent='Canvas focused: typing triggers a fixed demo action, not text entry.';};
canvas.onblur=()=>{$('focusStatus').textContent='Canvas not focused: click it before typing.';};
canvas.onkeydown=e=>{if(!e.ctrlKey&&!e.metaKey&&!e.altKey&&e.key.length===1){e.preventDefault();demoAction();}};
