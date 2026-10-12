import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createMeasurements} from './measurements.js';
test('RTT is sender-local and only matched replies become samples',()=>{
 let time=100;const m=createMeasurements({now:()=>time});
 const a=m.begin('text',{text:'hi'});time=145;m.finish(a,{received:true},true);
 const b=m.begin('text',{text:'bye'});time=500;m.finish(b,{received:false},false);
 assert.equal(m.snapshot().text.attempts,2);assert.equal(m.snapshot().text.acks,1);assert.equal(m.snapshot().text.lastMs,45);
 m.finish(a,{},true);assert.equal(m.snapshot().text.acks,1);
});
test('byte counters use UTF-8 application bodies and include responses',()=>{
 const m=createMeasurements({now:()=>0});const t=m.begin('image','é');m.finish(t,{drawn:1},true);
 m.received('text',{text:'😀'});m.reply({received:true});
 const bytes=v=>new TextEncoder().encode(JSON.stringify(v)).length;
 assert.equal(m.snapshot().sentBytes,2+bytes({received:true}));
 assert.equal(m.snapshot().receivedBytes,bytes({drawn:1})+bytes({text:'😀'}));assert.equal(m.snapshot().text.received,1);
});
test('reset/reconnect clears counts and ignores old in-flight acknowledgements',()=>{
 let time=0;const m=createMeasurements({now:()=>time});const old=m.begin('image','png');
 m.reset();time=100;m.finish(old,{drawn:1},true);assert.equal(m.snapshot().receivedBytes,0);assert.equal(m.snapshot().image.attempts,0);
 const fresh=m.begin('image','new');time=110;m.finish(fresh,{drawn:2},true);assert.equal(m.snapshot().image.lastMs,10);
});
