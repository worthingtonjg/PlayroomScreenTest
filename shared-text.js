// Text content only: no keys, commands, or interaction with anything outside this form.
export function createTextSharing({editor,output,status,send,session,clock=globalThis}) {
 const limit=1024,encoder=new TextEncoder();
 let enabled=false,role='',revision=0,composing=false,timer=null,inFlight=false,dirty=false,epoch=0,lastSent=-Infinity;
 const seen=new Map();
 const tell=message=>{status.textContent=message;};
 function cancel(){clock.clearTimeout(timer);timer=null;}
 function schedule(){cancel();if(!enabled){tell('Local draft only. Connect as Viewer, then use Send current text to share it.');return;}if(role==='viewer'&&!composing){dirty=true;timer=clock.setTimeout(flush,400);}}
 async function flush(){
   timer=null;if(!enabled||role!=='viewer'||composing||inFlight||!dirty)return;
   const now=clock.now?clock.now():Date.now();
   if(now-lastSent<500){timer=clock.setTimeout(flush,500-(now-lastSent));return;}
   editor.value=editor.value.slice(0,limit);
   const message={type:'text',session,revision:++revision,text:editor.value};
   if(encoder.encode(JSON.stringify(message)).length>8192){tell('Text payload too large.');return;}
   dirty=false;inFlight=true;lastSent=now;const currentEpoch=epoch;
   tell(`Sending text revision ${revision} (${message.text.length}/${limit} characters)...`);
   let timeout;
   try{
     const reply=await Promise.race([send(message),new Promise((_,reject)=>{timeout=clock.setTimeout(()=>reject(new Error('No source receipt within 3 seconds. Use Send current text to retry.')),3000);})]);
     if(currentEpoch===epoch&&enabled)tell(reply?.session===session&&reply.revision===message.revision&&reply.received===true?`Source received text revision ${message.revision} (${message.text.length} characters).`:'No matching source receipt. Check source role and room; Send current text retries.');
   }catch(error){if(currentEpoch===epoch&&enabled)tell(error.message);}
   finally{clock.clearTimeout(timeout);if(currentEpoch===epoch){inFlight=false;if(dirty)schedule();}}
 }
 editor.oninput=event=>{if(composing||event?.isComposing)return;schedule();};
 editor.oncompositionstart=()=>{composing=true;cancel();};
 editor.oncompositionend=()=>{composing=false;schedule();};
 return {
   selectRole(nextRole){if(enabled)return;role=nextRole;editor.disabled=false;editor.readOnly=role!=='viewer';tell(role==='viewer'?'Viewer: you can type a local draft now. Connect to share; Send current text sends an existing draft.':'Source: received text is read-only. Select Viewer if you want to type.');},
   connect(nextRole){cancel();epoch++;enabled=true;role=nextRole;inFlight=false;dirty=false;composing=false;editor.disabled=false;editor.readOnly=role!=='viewer';tell(role==='viewer'?'Connected Viewer: edits are shared now, independently of frames. Use Send current text for an existing draft.':'Waiting for viewer text.');},
   disconnect(){epoch++;enabled=false;dirty=false;inFlight=false;cancel();editor.disabled=false;editor.readOnly=role!=='viewer';tell('Disconnected. Viewer can edit a local draft; nothing is sent. Reconnect to share.');},
   resend(){if(enabled&&role==='viewer'){schedule();}},
   receive(message){
     if(!enabled||role!=='source')return {received:false};
     if(message?.type!=='text'||typeof message.text!=='string'||message.text.length>limit||typeof message.session!=='string'||message.session.length>64||!Number.isSafeInteger(message.revision)||message.revision<1||encoder.encode(JSON.stringify(message)).length>8192)return {received:false};
     if(message.revision>(seen.get(message.session)??0)){
       if(!seen.has(message.session)&&seen.size>=8)seen.delete(seen.keys().next().value);
       seen.set(message.session,message.revision);output.textContent=message.text;
       tell(`Received text revision ${message.revision} (${message.text.length} characters${message.text.length?'':'; cleared'}).`);
     }
     return {received:true,session:message.session,revision:message.revision};
   }
 };
}
