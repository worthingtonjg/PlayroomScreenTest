import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
import {comparisonPixels} from './comparison-scene.js';
import {checkImageBudget,validFrame} from './image-trial.js';
function decode(url){
 const png=Buffer.from(url.split(',')[1],'base64');assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 let width,height;const compressed=[];
 for(let i=8;i<png.length;){const n=png.readUInt32BE(i),type=png.toString('ascii',i+4,i+8),data=png.subarray(i+8,i+8+n);let crc=0xffffffff;
   for(const b of png.subarray(i+4,i+8+n)){crc^=b;for(let j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}assert.equal((crc^0xffffffff)>>>0,png.readUInt32BE(i+8+n));
   if(type==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);assert.equal(data[8],2);assert.equal(data[9],3);}if(type==='IDAT')compressed.push(data);i+=n+12;
 }
 const raw=inflateSync(Buffer.concat(compressed)),stride=Math.ceil(width/4),pixels=new Uint8Array(width*height);assert.equal(raw.length,(stride+1)*height);
 for(let y=0;y<height;y++){assert.equal(raw[y*(stride+1)],0);for(let x=0;x<width;x++)pixels[y*width+x]=(raw[y*(stride+1)+1+(x>>2)]>>(6-2*(x%4)))&3;}
 return {width,height,pixels};
}
for(const size of ['medium','large'])for(const mode of ['full','tiles'])test(`${size}/${mode}: actual PNGs reconstruct identical scene and actual serialized frames fit caps`,()=>{
 const frames=JSON.parse(readFileSync(new URL(`./fixtures/${size}-${mode}.json`,import.meta.url),'utf8')),budget=checkImageBudget(frames);
 assert.equal(frames.length,10);assert.equal(budget.ok,true);assert.ok(Math.max(...budget.sizes)<2048);assert.ok(budget.total<16384);
 const {width,height}=frames[0],canvas=new Uint8Array(width*height);let last=0;
 for(const m of frames){assert.equal(validFrame(m,last,width,height),true);for(const p of m.patches){const img=decode(p.url);assert.equal(img.width,p.w);assert.equal(img.height,p.h);for(let y=0;y<p.h;y++)canvas.set(img.pixels.subarray(y*p.w,(y+1)*p.w),(p.y+y)*width+p.x);}assert.deepEqual(canvas,comparisonPixels(width,height,m.sequence-1));last=m.sequence;}
});
