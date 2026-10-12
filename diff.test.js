import {test} from 'node:test';
import assert from 'node:assert/strict';
import {changedTiles} from './diff.js';
test('initial frame, unchanged frame, and edge pixel changes',()=>{
 const before=new Uint8ClampedArray(70*65*4),after=before.slice();
 assert.equal(changedTiles(before,null,70,65).length,4);
 assert.deepEqual(changedTiles(after,before,70,65),[]);
 after[(64*70+69)*4]=255;
 assert.deepEqual(changedTiles(after,before,70,65),[{x:64,y:64,w:6,h:1}]);
});
test('moving pixels include both old and new tiles',()=>{
 const before=new Uint8ClampedArray(128*64*4),after=before.slice();
 before[0]=255;after[64*4]=255;
 assert.equal(changedTiles(after,before,128,64).length,2);
});
