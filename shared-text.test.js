import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createTextSharing} from './shared-text.js';

function setup(){
 let time=0,id=0;const jobs=new Map();
 const clock={now:()=>time,setTimeout(fn,delay){jobs.set(++id,{fn,at:time+delay});return id;},clearTimeout(key){jobs.delete(key);}};
 async function advance(ms){time+=ms;for(const [key,job] of [...jobs])if(job.at<=time){jobs.delete(key);job.fn();}for(let i=0;i<8;i++)await Promise.resolve();}
 const sourceOutput={textContent:''},sourceStatus={},viewerStatus={},editor={value:''},sent=[];
 const source=createTextSharing({editor:{},output:sourceOutput,status:sourceStatus,send:()=>{},session:'source',clock});
 const viewer=createTextSharing({editor,output:{},status:viewerStatus,send:async message=>{sent.push(message);return source.receive(message);},session:'viewer',clock});
 source.connect('source');viewer.connect('viewer');
 return {source,viewer,editor,sourceOutput,sourceStatus,viewerStatus,sent,advance};
}
test('snapshots work independently before/during/after image run, including edits and clear',async()=>{
 const h=setup();
 for(const value of ['before frames','during frames','after frames','after','']){
   h.editor.value=value;h.editor.oninput({});await h.advance(500);
   assert.equal(h.sourceOutput.textContent,value);assert.match(h.viewerStatus.textContent,/Source received/);
 }
 assert.match(h.sourceStatus.textContent,/cleared/);
});
test('rapid edits debounce to latest snapshot and IME composition waits for completion',async()=>{
 const h=setup();h.editor.value='a';h.editor.oninput({});await h.advance(100);h.editor.value='abc';h.editor.oninput({});await h.advance(400);
 assert.equal(h.sent.length,1);assert.equal(h.sent[0].text,'abc');
 h.editor.oncompositionstart();h.editor.value='intermediate';h.editor.oninput({isComposing:true});await h.advance(1000);assert.equal(h.sent.length,1);
 h.editor.value='日本語';h.editor.oncompositionend();await h.advance(500);assert.equal(h.sourceOutput.textContent,'日本語');
});
test('disconnect cancels pending edits; reconnect and explicit resend deliver current content',async()=>{
 const h=setup();h.editor.value='pending';h.editor.oninput({});h.viewer.disconnect();await h.advance(500);
 assert.equal(h.sent.length,0);assert.equal(h.editor.disabled,false);assert.equal(h.editor.readOnly,false);
 h.viewer.connect('viewer');h.viewer.resend();await h.advance(500);assert.equal(h.sourceOutput.textContent,'pending');
 h.source.disconnect();h.editor.value='not delivered';h.editor.oninput({});await h.advance(500);assert.equal(h.sourceOutput.textContent,'pending');assert.match(h.viewerStatus.textContent,/No matching source receipt/);
 h.source.connect('source');h.viewer.resend();await h.advance(500);assert.equal(h.sourceOutput.textContent,'not delivered');
});
test('Viewer draft is editable without connection; Source stays read-only',async()=>{
 const h=setup();h.viewer.disconnect();h.viewer.selectRole('source');assert.equal(h.editor.readOnly,true);
 h.viewer.selectRole('viewer');assert.equal(h.editor.disabled,false);assert.equal(h.editor.readOnly,false);
 h.editor.value='offline draft';h.editor.oninput({});await h.advance(1000);
 assert.equal(h.sent.length,0);assert.match(h.viewerStatus.textContent,/Local draft only/);
 h.viewer.connect('viewer');assert.equal(h.editor.readOnly,false);h.viewer.resend();await h.advance(500);
 assert.equal(h.sourceOutput.textContent,'offline draft');
});
test('length limits, literal text rendering, and stale revisions',async()=>{
 const h=setup();h.editor.value='x'.repeat(2000);h.editor.oninput({});await h.advance(500);assert.equal(h.sourceOutput.textContent.length,1024);
 h.source.receive({type:'text',session:'other',revision:2,text:'<script>literal</script>'});
 h.source.receive({type:'text',session:'other',revision:1,text:'stale'});assert.equal(h.sourceOutput.textContent,'<script>literal</script>');
 assert.equal(h.source.receive({type:'text',session:'other',revision:3,text:'x'.repeat(1025)}).received,false);
});
test('missing receipt times out without automatic retries',async()=>{
 let timeout,flush;const editor={value:'demo'},status={};
 const clock={now:()=>1000,clearTimeout(){},setTimeout(fn,ms){if(ms===3000)timeout=fn;else flush=fn;return ms;}};
 let attempts=0;const share=createTextSharing({editor,output:{},status,session:'test',clock,send:()=>{attempts++;return new Promise(()=>{});}});
 share.connect('viewer');editor.oninput({});flush();timeout();for(let i=0;i<8;i++)await Promise.resolve();assert.match(status.textContent,/No source receipt/);assert.equal(attempts,1);
});
