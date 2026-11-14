// Only nearby static images enter the live SVG. Periodic placement matches the
// game's east/west AND north/south wrap, including the shorter final tile row.
export function chartTilePlacements({x,y,w,h,k},manifest,padding=16){
 const {size,width,height,tiles}=manifest,out=[],left=x-w/k/2-padding,right=x+w/k/2+padding,top=y-h/k/2-padding,bottom=y+h/k/2+padding;
 for(const sx of [-width,0,width])for(const sy of [-height,0,height]){
  if(right<sx||left>sx+width||bottom<sy||top>sy+height)continue;
  for(let col=Math.max(0,Math.floor((left-sx)/size));col<=Math.min(Math.ceil(width/size)-1,Math.floor((right-sx)/size));col++)
   for(let row=Math.max(0,Math.floor((top-sy)/size));row<=Math.min(Math.ceil(height/size)-1,Math.floor((bottom-sy)/size));row++){
    const tile=tiles[col+','+row];if(tile)out.push({id:`${sx}:${sy}:${col}:${row}`,x:sx+col*size,y:sy+row*size,w:Math.min(size,width-col*size),h:Math.min(size,height-row*size),...tile});
   }
 }return out;
}
export class ChartTerrain{
 constructor(root,manifest,assetPath='assets/chart-tiles'){this.root=root;this.manifest=manifest;this.assetPath=assetPath;this.nodes=new Map();}
 update(view,detail=true){const live=new Set();for(const p of detail?chartTilePlacements(view,this.manifest):[]){live.add(p.id);if(this.nodes.has(p.id))continue;const image=document.createElementNS('http://www.w3.org/2000/svg','image');for(const [key,value]of Object.entries({x:p.x,y:p.y,width:p.w,height:p.h,href:`${this.assetPath}/${p.file}?v=${p.sha256.slice(0,16)}`,preserveAspectRatio:'none','pointer-events':'none','data-tile':p.id}))image.setAttribute(key,value);this.root.append(image);this.nodes.set(p.id,image);}for(const [id,node]of this.nodes)if(!live.has(id)){node.remove();this.nodes.delete(id);}}
}
