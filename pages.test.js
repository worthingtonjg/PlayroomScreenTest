import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL(name,import.meta.url),'utf8');
test('fixed Host and Viewer pages share code and have no role selector',()=>{
 for(const [page,role] of [['host.html','source'],['viewer.html','viewer']]){
   const html=read(page);assert.ok(html.includes(`id="role" type="hidden" value="${role}"`));
   assert.doesNotMatch(html,/<select[^>]*id="role"/);assert.match(html,/src="\.\/playroom.js\?v=/);
 }
});
test('Viewer text is initially focusable and frame controls are hidden; Host receives read-only text',()=>{
 const viewer=read('viewer.html'),host=read('host.html');
 assert.match(viewer,/<div id="viewerText">/);assert.match(viewer,/<div id="hostControls" hidden>/);
 const textarea=viewer.match(/<textarea[^>]*>/)[0];assert.doesNotMatch(textarea,/disabled|readonly/);
 assert.match(host,/<div id="viewerText" hidden>/);assert.match(host,/<div id="sourceText">/);assert.match(host,/<pre id="receivedText"/);
});
test('compatibility page links both fixed roles without starting the SDK',()=>{
 const html=read('playroom.html');assert.match(html,/href="\.\/host.html\?v=/);assert.match(html,/href="\.\/viewer.html\?v=/);assert.doesNotMatch(html,/<script/);
});
