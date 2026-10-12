export function changedTiles(current, previous, width, height, size=64) {
  const tiles=[];
  for(let y=0;y<height;y+=size) for(let x=0;x<width;x+=size){
    const w=Math.min(size,width-x),h=Math.min(size,height-y);
    let changed=!previous;
    for(let row=y;!changed&&row<y+h;row++) for(let i=(row*width+x)*4;i<(row*width+x+w)*4;i++){
      if(current[i]!==previous[i]){changed=true;break;}
    }
    if(changed)tiles.push({x,y,w,h});
  }
  return tiles;
}
