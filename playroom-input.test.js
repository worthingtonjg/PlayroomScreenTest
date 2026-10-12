import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createMeasurements} from './measurements.js';
import {drawSynthetic,encodeFrame,imageSizes,checkImageBudget,validFrame} from './image-trial.js';
import {drawComparison} from './comparison-scene.js';
import {BUILD_ID} from './build-info.js';

function harness(fixtureFrames){
 const elements=new Map(),calls=[],fixtureRequests=[];
 const context={fillRect(){},fillText(){},save(){},restore(){},setTransform(){},drawImage(){},createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}};
 const get=id=>{if(!elements.has(id))elements.set(id,{width:160,height:96,textContent:'',getContext:()=>context,focus(){this.onfocus?.();}});return elements.get(id);};
 const source=readFileSync(new URL('./playroom.js',import.meta.url),'utf8').replace(/^import .*\n/gm,'');
 const sandbox={BUILD_ID,drawComparison,drawSynthetic,encodeFrame,imageSizes,checkImageBudget,validFrame,fetch:async(url,options)=>{if(url.startsWith('./fixtures/')){fixtureRequests.push({url,options});return {ok:true,json:async()=>fixtureFrames};}return {blob:async()=>({})};},createImageBitmap:async()=>({close(){}}),createMeasurements,createTextSharing:()=>({resend(){},disconnect(){},selectRole(){}}),document:{getElementById:get},TextEncoder,performance:{now:()=>1000},crypto:{randomUUID:()=> 'dummy-id'},clearInterval(){},setTimeout(){},setInterval(){},calls};
 vm.runInNewContext(source+`\n globalThis.testApi={input:demoAction,receive,rpcHandler,frame,setPeer(peer){sdk.RPC.call=async(...args)=>{calls.push(args);return peer(args[1],{id:'viewer-test'});};},set(options){({connected,role,received,until,active}={connected:true,role:'viewer',received:1,until:2000,active:false,...options});sdk={RPC:{Mode:{OTHERS:'others'},call:async(...args)=>calls.push(args)}};}};`,sandbox);
 return {api:sandbox.testApi,get,calls,fixtureRequests};
}
test('viewer explains before-run and after-run input instead of silently dropping it',()=>{
 const h=harness();h.api.set({received:0});h.api.input();assert.match(h.get('inputStatus').textContent,/No frame received/);
 h.api.set({received:10});h.api.input();assert.match(h.get('inputStatus').textContent,/Run ended/);assert.equal(h.calls.length,0);
});
test('click focuses canvas, sends only a fixed action, and reports throttling',()=>{
 const h=harness();h.api.set({});h.get('canvas').onclick();assert.match(h.get('focusStatus').textContent,/Canvas focused/);
 assert.equal(h.calls.length,1);assert.deepEqual(JSON.parse(h.calls[0][1]),{type:'action',id:'dummy-id'});
 h.api.input();assert.match(h.get('inputStatus').textContent,/throttled/);assert.equal(h.calls.length,1);
});
test('source shows receipt during run and explains late actions',async()=>{
 const h=harness();h.api.set({role:'source',active:true});await h.api.receive(JSON.stringify({type:'action',id:'demo'}));
 assert.match(h.get('inputStatus').textContent,/source actions applied: 1/);assert.match(h.get('inputStatus').textContent,/source value is 1/);
 h.api.set({role:'source',active:false});await h.api.receive(JSON.stringify({type:'action',id:'late'}));assert.match(h.get('inputStatus').textContent,/outside the run/);
});
test('mocked OTHERS RPC reaches source callback and returns applied acknowledgement',async()=>{
 const source=harness(),viewer=harness();source.api.set({role:'source',active:true});viewer.api.set({});
 viewer.api.setPeer(source.api.rpcHandler);viewer.api.input();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(viewer.calls[0][2],'others');
 assert.match(source.get('inputStatus').textContent,/RPC callbacks: 1; source action callbacks: 1; source actions applied: 1/);
 assert.match(viewer.get('inputStatus').textContent,/confirmed source replies: 1/);
 assert.match(viewer.get('inputStatus').textContent,/Source replied: applied/);
});
test('late action counts callback receipt separately from applied state',async()=>{
 const h=harness();h.api.set({role:'source',active:false});
 const response=await h.api.rpcHandler(JSON.stringify({type:'action',id:'late'}),{id:'viewer-test'});
 assert.equal(response.result,'rejected: run inactive');
 assert.match(h.get('inputStatus').textContent,/RPC callbacks: 1; source action callbacks: 1; source actions applied: 0/);
});
test('viewer returns sequence-specific draw ack only for accepted frame sequence',async()=>{
 const h=harness();h.api.set({received:0});
 const reply=await h.api.rpcHandler(JSON.stringify({type:'frame',sequence:1,width:160,height:96,full:true,patches:[{x:0,y:0,w:160,h:96,url:'data:image/png;base64,AA=='}]}),{id:'host'});
 assert.equal(reply.role,'viewer');assert.equal(reply.drawn,1);
 const missing=await h.api.rpcHandler(JSON.stringify({type:'frame',sequence:3,full:false,patches:[]}),{id:'host'});
 assert.equal(missing.drawn,undefined);
});
test('reported selection 640x360 Full uses versioned fixtures and sends the measured fixture, never old canvas encoder',async()=>{
 const fixtures=JSON.parse(readFileSync(new URL('./fixtures/large-full.json',import.meta.url),'utf8'));
 const h=harness(fixtures);h.api.set({role:'source'});h.get('size').value='large';h.get('mode').value='full';
 await h.get('start').onclick();
 assert.equal(h.fixtureRequests[0].url,`./fixtures/large-full.json?v=${BUILD_ID}`);assert.equal(h.fixtureRequests[0].options.cache,'no-store');
 assert.match(h.get('imagePlan').textContent,/verified PNG fixture/);assert.match(h.get('imagePlan').textContent,/5301 bytes; maximum frame 535 bytes/);
 assert.equal(h.calls.length,0);await h.api.frame();assert.deepEqual(JSON.parse(h.calls[0][1]),fixtures[0]);
});
