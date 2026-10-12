export function createMeasurements({now=()=>performance.now(),changed=()=>{}}={}) {
 const encoder=new TextEncoder();let generation=0,state;
 const bytes=value=>encoder.encode(typeof value==='string'?value:JSON.stringify(value??null)).length;
 const row=()=>({attempts:0,received:0,acks:0,lastMs:null,totalMs:0,requestBytes:0});
 const snapshot=()=>structuredClone(state);
 const update=()=>changed(snapshot());
 function reset(){generation++;state={sentBytes:0,receivedBytes:0,text:row(),image:row(),action:row()};update();}
 reset();
 return {
   reset,snapshot,
   begin(kind,payload){const size=bytes(payload);state.sentBytes+=size;state[kind].requestBytes+=size;state[kind].attempts++;const token={kind,generation,at:now(),done:false};update();return token;},
   finish(token,reply,matched){if(token.generation!==generation||token.done)return;token.done=true;state.receivedBytes+=bytes(reply);if(matched){const r=state[token.kind];r.acks++;r.lastMs=Math.max(0,now()-token.at);r.totalMs+=r.lastMs;}update();},
   received(kind,payload){state.receivedBytes+=bytes(payload);state[kind].received++;update();},
   reply(payload){state.sentBytes+=bytes(payload);update();}
 };
}
