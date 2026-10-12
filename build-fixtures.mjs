// Offline generation only. Runtime sends these exact small synthetic PNG payloads.
import {deflateSync} from 'node:zlib';
import {mkdir,writeFile} from 'node:fs/promises';
import {comparisonPixels,comparisonRgba,palette} from './comparison-scene.js';
import {changedTiles} from './diff.js';
import {checkImageBudget} from './image-trial.js';
function crc32(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let bit=0;bit<8;bit++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
function chunk(type,data){const name=Buffer.from(type),length=Buffer.alloc(4),crc=Buffer.alloc(4);length.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([name,data])));return Buffer.concat([length,name,data,crc]);}
function png(indices,width,r){
 const stride=Math.ceil(r.w/4),raw=Buffer.alloc((stride+1)*r.h);
 for(let y=0;y<r.h;y++)for(let x=0;x<r.w;x++)raw[y*(stride+1)+1+(x>>2)]|=indices[(r.y+y)*width+r.x+x]<<(6-2*(x%4));
 const header=Buffer.alloc(13);header.writeUInt32BE(r.w,0);header.writeUInt32BE(r.h,4);header[8]=2;header[9]=3;
 return 'data:image/png;base64,'+Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('PLTE',Buffer.from(palette.flat())),chunk('IDAT',deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]).toString('base64');
}
await mkdir(new URL('./fixtures/',import.meta.url),{recursive:true});
for(const [size,width,height] of [['medium',320,192],['large',640,360]])for(const mode of ['full','tiles']){
 let previous=null;const frames=[];
 for(let frame=0;frame<10;frame++){
   const indices=comparisonPixels(width,height,frame),rgba=comparisonRgba(width,height,frame),full=frame===0||mode==='full';
   const regions=full?[{x:0,y:0,w:width,h:height}]:changedTiles(rgba,previous,width,height,32);
   frames.push({type:'frame',sequence:frame+1,width,height,full,patches:regions.map(r=>({...r,url:png(indices,width,r)})),ack:null,sourceActions:0,comparison:true});previous=rgba;
 }
 const budget=checkImageBudget(frames);if(!budget.ok)throw new Error(size+' '+mode+': '+budget.reason);
 await writeFile(new URL(`./fixtures/${size}-${mode}.json`,import.meta.url),JSON.stringify(frames)+'\n');
 console.log(`${width}x${height} ${mode}: max=${Math.max(...budget.sizes)} B; total=${budget.total} B`);
}
