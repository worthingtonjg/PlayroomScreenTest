import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BUILD_ID} from './build-info.js';
test('every browser module in Host and Viewer dependency chains has the same build version',()=>{
 const seen=new Set();
 function visit(name){if(seen.has(name))return;seen.add(name);const text=readFileSync(new URL(name,import.meta.url),'utf8');
   for(const match of text.matchAll(/(?:from\s+|src=)["'](\.\/[^"']+\.js(?:\?[^"']*)?)["']/g)){
     const url=new URL(match[1],import.meta.url);assert.equal(url.searchParams.get('v'),BUILD_ID,match[1]);visit(url.pathname.split('/').pop());
   }
   assert.equal(text.includes('A frame exceeds the 8 KiB message cap. Choose a smaller size.'),false,name);
 }
 visit('host.html');visit('viewer.html');assert.ok(seen.has('image-trial.js'));assert.ok(seen.has('diff.js'));assert.ok(seen.has('build-info.js'));
});
