// Four-color generated code-like rows and a moving square; no font rasterization.
export const palette=[[21,32,52],[142,231,188],[105,186,255],[242,202,112]];
export function comparisonPixels(width,height,frame){
 const pixels=new Uint8Array(width*height);
 const rect=(x,y,w,h,color)=>{for(let row=y;row<Math.min(height,y+h);row++)pixels.fill(color,row*width+x,row*width+Math.min(width,x+w));};
 rect(16,16,width-32,12,2);
 for(let row=0;row<6;row++){
   const y=44+row*16;
   rect(16,y,8,6,3);rect(36+(row%3)*12,y,Math.floor(width*(0.20+(row%3)*0.09)),6,1);
 }
 rect(16+frame*Math.floor((width-64)/10),height-40,16,16,2);
 return pixels;
}
export function comparisonRgba(width,height,frame){
 const indices=comparisonPixels(width,height,frame),rgba=new Uint8ClampedArray(width*height*4);
 for(let i=0;i<indices.length;i++){rgba.set(palette[indices[i]],i*4);rgba[i*4+3]=255;}
 return rgba;
}
export function drawComparison(ctx,width,height,frame){const image=ctx.createImageData(width,height);image.data.set(comparisonRgba(width,height,frame));ctx.putImageData(image,0,0);}
