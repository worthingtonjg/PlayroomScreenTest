import {drawSynthetic,encodeFrame,imageSizes,checkImageBudget,validFrame} from './image-trial.js';
import {createTextSharing} from './shared-text.js';
import {createMeasurements} from './measurements.js';
import {drawComparison} from './comparison-scene.js';
const $=id=>document.getElementById(id),canvas=$('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
let sdk,role,connected=false,active=false,used=false,timer,previous=null,sequence=0,received=0,total=0,actions=0,value=0,ack=null,last=0;
let pending=new Map(),lastInput=-Infinity,until=0,localInputs=0,shownActions=0;
let rpcCallbacks=0,actionReceipts=0,sendAttempts=0,sourceReplies=0;
let preparedFrames=[],comparison=false,preparing=false;
const encoder=new TextEncoder(),name='syntheticCanvasTrialV1';
const report=s=>$('status').textContent=s;
const measurements=createMeasurements({changed:m=>{
 const timing=(title,r)=>`${title}: ${r.acks}/${r.attempts} matched acks; requests received here: ${r.received}; last/mean RTT: ${r.acks?r.lastMs.toFixed(1)+' / '+(r.totalMs/r.acks).toFixed(1)+' ms':'--'}`;
 $('measurements').textContent=`Application payload bytes attempted out / received in: ${m.sentBytes} / ${m.receivedBytes}\nImage request bytes only: ${m.image.requestBytes}; not yet matched image acks: ${m.image.attempts-m.image.acks}\n${timing('Text request -> source ack',m.text)}\n${timing('Image send -> viewer draw ack',m.image)}\n${timing('Canvas action -> source reply',m.action)}`;
}});
$('resetMeasurements').onclick=()=>measurements.reset();
async function measuredCall(kind,rpc,payload,match){const token=measurements.begin(kind,payload);const reply=await sdk.RPC.call(rpc,payload,sdk.RPC.Mode.OTHERS);measurements.finish(token,reply,match(reply));return reply;}
const textSharing=createTextSharing({editor:$('sharedText'),output:$('receivedText'),status:$('textStatus'),session:crypto.randomUUID(),send:message=>measuredCall('text','syntheticTextV1',message,r=>r?.received===true&&r.session===message.session&&r.revision===message.revision)});
function selectTextRole(){if(connected)return;const selected=$('role').value;textSharing.selectRole(selected);$('viewerText').hidden=selected!=='viewer';$('sourceText').hidden=selected!=='source';}
$('role').onchange=selectTextRole;
selectTextRole();
$('sendText').onclick=()=>textSharing.resend();
function disconnected(){connected=false;active=false;clearInterval(timer);textSharing.disconnect();measurements.reset();$('start').disabled=true;$('sendText').disabled=true;report('Disconnected. Reload this page to reconnect.');}
$('disconnect').onclick=()=>{disconnected();location.replace(location.pathname+location.search);};
const feedback=s=>$('inputStatus').textContent=`Local inputs: ${localInputs}; action send attempts: ${sendAttempts}; confirmed source replies: ${sourceReplies}; RPC callbacks: ${rpcCallbacks}; source action callbacks: ${actionReceipts}; source actions applied: ${role==='source'?actions:shownActions}. ${s}`;
function stop(reason){active=false;clearInterval(timer);$('start').disabled=true;report(reason+' Run ended. Reload BOTH tabs and reconnect to start another bounded run.');}
function draw(){if(comparison)drawComparison(ctx,canvas.width,canvas.height,sequence);else drawSynthetic(ctx,canvas.width,canvas.height,sequence,value);}
draw();
async function send(message){
 const wire=JSON.stringify(message),size=encoder.encode(wire).length;
 if(size>8192||total+size>65536){stop('Application payload cap reached (8 KiB/message, 64 KiB/tab).');return false;}
 total+=size;
 try{
   if(message.type==='action')sendAttempts++;
   const response=await measuredCall(message.type==='frame'?'image':'action',name,wire,r=>message.type==='frame'?r?.role==='viewer'&&r.drawn===message.sequence:r?.role==='source'&&r.id===message.id);
   if(message.type==='frame'&&response?.rejected)stop('Viewer rejected frame: '+response.rejected+'. No automatic retry.');
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
 draw();
 const encoded=comparison?{message:preparedFrames[sequence]}:encodeFrame(canvas,ctx,previous,$('mode').value,sequence+1,{ack,sourceActions:actions,comparison:false});
 previous=encoded.pixels;sequence++;
 // Do not await responses in the timer: the fixed run deadline always stops scheduling.
 void send(encoded.message);
 if(!active)return;
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
   if(comparison){feedback('Canvas actions are disabled for the deterministic image comparison. Shared text still works.');return reply('rejected: deterministic comparison');}
   if(!active){feedback('Action arrived outside the run; reload both tabs and start again.');return reply('rejected: run inactive');}
   if(actions>=20){feedback('Action limit reached.');return reply('rejected: action limit');}
   actions++;value=(value+1)%10;ack=m.id;draw();
   feedback(`Received demo action; source value is ${value}. Viewer sees it in the next frame.`);return reply('applied');
 }
 if(role!=='viewer'||m.type!=='frame'||received>=10)return;
 if(!validFrame(m,last,canvas.width,canvas.height)){report('Invalid frame or missing delta baseline. Reload both pages for a fresh run.');return {role:'viewer',rejected:'invalid frame or missing baseline'};}
 if(canvas.width!==m.width||canvas.height!==m.height){canvas.width=m.width;canvas.height=m.height;}
 comparison=m.comparison===true;
 for(const p of m.patches){
   const img=await createImageBitmap(await (await fetch(p.url)).blob());ctx.drawImage(img,p.x,p.y);img.close();
 }
 last=m.sequence;received++;until=performance.now()+2000;shownActions=m.sourceActions??0;
 const delay=pending.has(m.ack)?(performance.now()-pending.get(m.ack)).toFixed(1)+' ms':'no new input acknowledgement';
 if(pending.has(m.ack))pending.clear();
 feedback(received>=10?'Run ended. Reload BOTH tabs and reconnect before trying input again.':`Frame ${received}/10: click the canvas, then type now. Each action cycles a number; letters do not appear. ${delay}.`);
 report(`Received Playroom frames: ${received}/10; latest JSON bytes: ${encoder.encode(wire).length}; input to image drawn: ${delay}. Excludes physical display timing.`);
 return {role:'viewer',drawn:m.sequence};
}
async function rpcHandler(wire,sender){
 rpcCallbacks++;
 $('rpcStatus').textContent=`RPC callback ${rpcCallbacks}; sender: ${sender?.id??'unknown'}; payload type: ${typeof wire}`;
 if(typeof wire==='string'){try{const kind=JSON.parse(wire).type; if(kind==='frame'||kind==='action')measurements.received(kind==='frame'?'image':'action',wire);}catch{}}
 const operation=receiveQueue.then(()=>receive(wire));
 receiveQueue=operation.catch(e=>stop('Receive failed: '+e.message));
 const reply=(await operation)??{role,result:'handled without applying an action'};measurements.reply(reply);return reply;
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
   sdk.RPC.register('syntheticTextV1',async message=>{measurements.received('text',message);const reply=textSharing.receive(message);measurements.reply(reply);return reply;});
   sdk.onDisconnect(disconnected);
   connected=true;
   measurements.reset();
   textSharing.connect(role);$('viewerText').hidden=role!=='viewer';$('sourceText').hidden=role!=='source';$('sendText').disabled=role!=='viewer';$('disconnect').disabled=false;
   for(const id of ['role','gameId','room'])$(id).disabled=true;
   $('start').disabled=role!=='source';report(`Connected as ${role}. Room: ${sdk.getRoomCode()}. No images sent yet.`);
   $('connectionStatus').textContent=`Role: ${role}; room: ${sdk.getRoomCode()}; player: ${sdk.myPlayer().id}; elected host: ${sdk.isHost()}. Both tabs must have the same room and different player IDs. RPC targets OTHERS, not HOST.`;
   feedback(role==='viewer'?'Waiting for source to start. Click canvas to focus it; input works while frames 1-9 arrive.':'Viewer must connect before you start. Watch source action count here.');
 }catch(e){report('Connection failed: '+e.message+'. Reload to retry.');}
};
$('start').onclick=async()=>{
 if(!connected||role!=='source'||used||preparing)return;
 preparing=true;$('start').disabled=true;$('mode').disabled=true;$('size').disabled=true;
 const preparationFailed=message=>{preparing=false;report(message+' No image frames sent.');$('start').disabled=!connected;$('mode').disabled=false;$('size').disabled=false;};
 const dimensions=imageSizes[$('size').value]??imageSizes.small;
 [canvas.width,canvas.height]=dimensions;comparison=$('size').value!=='small';
 value=0;sequence=0;previous=null;ack=null;actions=0;preparedFrames=[];
 try{
   if(comparison){const response=await fetch(`./fixtures/${$('size').value}-${$('mode').value}.json`);if(!response.ok)throw new Error('Comparison fixtures unavailable. Reload the latest Host page.');preparedFrames=await response.json();}
   else {let baseline=null;for(let i=0;i<10;i++){drawSynthetic(ctx,canvas.width,canvas.height,i,0);const encoded=encodeFrame(canvas,ctx,baseline,$('mode').value,i+1,{ack:null,sourceActions:0,comparison});baseline=encoded.pixels;preparedFrames.push(encoded.message);}}
 }catch(error){preparationFailed(error.message);return;}
 if(!connected){preparationFailed('Disconnected during preparation.');return;}
 const budget=checkImageBudget(preparedFrames,total);draw();
 if(!budget.ok){preparationFailed(budget.reason);return;}
 preparing=false;
 $('imagePlan').textContent=`${canvas.width} x ${canvas.height}; ${$('mode').value}; 10 frames / 1 fps; preflight JSON ${budget.total} bytes; maximum frame ${Math.max(...budget.sizes)} bytes. ${comparison?'Fixed scene: canvas actions disabled.':'Small interactive test: later actions can change actual bytes.'}`;
 measurements.reset();used=true;active=true;$('start').disabled=true;$('mode').disabled=true;$('size').disabled=true;
 feedback(comparison?'Deterministic comparison started. Shared text remains independent.':'Run started. Click/type in the VIEWER canvas now.');
 timer=setInterval(frame,1000);setTimeout(()=>{if(active)stop('10-second run deadline reached.');},10500);
};
function demoAction(){
 const now=performance.now();localInputs++;
 if(!connected){feedback('Not connected. Select Viewer and connect first.');return;}
 if(role!=='viewer'){feedback('This is the SOURCE. Click/type on the VIEWER canvas.');return;}
 if(comparison){feedback('Deterministic comparison: canvas actions disabled. Use the Shared text box normally.');return;}
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
