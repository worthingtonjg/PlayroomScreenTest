import {changedTiles} from './diff.js';
export const imageSizes={'small':[160,96],'medium':[320,192],'large':[640,360]};
export function drawSynthetic(ctx,width,height,frame,value=0){
 ctx.save();ctx.setTransform(width/160,0,0,height/96,0,0);
 ctx.fillStyle='#152034';ctx.fillRect(0,0,160,96);ctx.fillStyle='#8ee7bc';ctx.font='10px monospace';
 ctx.fillText('// synthetic',8,16);ctx.fillText('const demo = '+value,8,34);
 ctx.fillStyle='#69baff';ctx.fillRect(8+(frame*9)%120,64,12,12);ctx.restore();
}
export function encodeFrame(canvas,ctx,previous,mode,sequence,extra={}){
 const width=canvas.width,height=canvas.height,pixels=ctx.getImageData(0,0,width,height).data;
 const full=!previous||mode==='full';
 const regions=full?[{x:0,y:0,w:width,h:height}]:changedTiles(pixels,previous,width,height,32);
 const patches=regions.map(r=>{const c=document.createElement('canvas');c.width=r.w;c.height=r.h;c.getContext('2d').drawImage(canvas,r.x,r.y,r.w,r.h,0,0,r.w,r.h);return {...r,url:c.toDataURL('image/png')};});
 return {pixels,message:{type:'frame',sequence,width,height,full,patches,...extra}};
}
export function checkImageBudget(messages,alreadySent=0){
 const sizes=messages.map(m=>new TextEncoder().encode(JSON.stringify(m)).length);
 if(sizes.some(n=>n>8192))return {ok:false,reason:'A frame exceeds the 8 KiB message cap. Choose a smaller size.',sizes};
 const total=sizes.reduce((a,b)=>a+b,0);
 if(total+alreadySent>65536)return {ok:false,reason:'The ten-frame run exceeds the 64 KiB image session cap. Choose a smaller size.',sizes,total};
 return {ok:true,sizes,total};
}
export function validFrame(m,last,width,height){
 if(!Number.isInteger(m.sequence)||m.sequence<1||m.sequence>10)return false;
 if(!Object.values(imageSizes).some(([w,h])=>w===m.width&&h===m.height))return false;
 if(!m.full&&(m.sequence!==last+1||width!==m.width||height!==m.height))return false;
 if(m.sequence<=last||!Array.isArray(m.patches)||m.patches.length>240)return false;
 if(m.full&&(m.patches.length!==1||m.patches[0].x!==0||m.patches[0].y!==0||m.patches[0].w!==m.width||m.patches[0].h!==m.height))return false;
 return m.patches.every(p=>Number.isInteger(p.x)&&Number.isInteger(p.y)&&Number.isInteger(p.w)&&Number.isInteger(p.h)&&p.x>=0&&p.y>=0&&p.w>0&&p.h>0&&p.x+p.w<=m.width&&p.y+p.h<=m.height&&typeof p.url==='string'&&/^data:image\/png;base64,/.test(p.url));
}
