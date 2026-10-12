import {test} from 'node:test';
import assert from 'node:assert/strict';
import {drawSynthetic,checkImageBudget,validFrame,imageSizes} from './image-trial.js';
test('both modes can replay identical deterministic drawing commands at each supported size',()=>{
 function commands(width,height){const calls=[];const ctx=new Proxy({}, {get:(_,name)=>(...args)=>calls.push([name,...args]),set:(_,name,value)=>{calls.push([name,value]);return true;}});for(let i=0;i<10;i++)drawSynthetic(ctx,width,height,i,0);return calls;}
 for(const [width,height] of Object.values(imageSizes)){assert.deepEqual(commands(width,height),commands(width,height));const square=commands(width,height).filter(c=>c[0]==='fillRect'&&c[3]===12);assert.equal(square.length,10);assert.equal(square[0][1],8);assert.equal(square[9][1],89);}
});
test('preflight enforces existing per-message and session limits without raising them',()=>{
 assert.equal(checkImageBudget(Array.from({length:10},()=>({payload:'x'.repeat(1000)}))).ok,true);
 assert.match(checkImageBudget([{payload:'x'.repeat(8192)}]).reason,/8 KiB/);
 assert.match(checkImageBudget(Array.from({length:10},()=>({payload:'x'.repeat(7000)}))).reason,/64 KiB/);
 assert.equal(checkImageBudget([{payload:'x'}],65536).ok,false);
});
test('larger delta requires matching dimensions and baseline; full frame permits recovery',()=>{
 const full={sequence:1,width:640,height:360,full:true,patches:[{x:0,y:0,w:640,h:360,url:'data:image/png;base64,AA=='}]};
 assert.equal(validFrame(full,0,160,96),true);
 const delta={...full,sequence:2,full:false,patches:[{x:32,y:64,w:32,h:32,url:'data:image/png;base64,AA=='}]};
 assert.equal(validFrame(delta,1,640,360),true);assert.equal(validFrame(delta,0,640,360),false);assert.equal(validFrame(delta,1,160,96),false);
 assert.equal(validFrame({...full,sequence:4},1,640,360),true);
 assert.equal(validFrame({...delta,patches:[{...delta.patches[0],x:639}]},1,640,360),false);
 assert.equal(validFrame({...full,width:1920},0,160,96),false);
});
