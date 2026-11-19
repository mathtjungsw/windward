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
// Each repeat includes the chart's shorter last row.
function tileIndex(position, extent, size) {
 const repeat = Math.floor(position / extent);
 return repeat * Math.ceil(extent / size) + Math.floor((position - repeat * extent) / size);
}

export class ChartTerrain {
 constructor(root, manifest, assetPath = 'assets/chart-tiles') {
  this.root = root;
  this.manifest = manifest;
  this.assetPath = assetPath;
  this.nodes = new Map();
  this.bounds = null;
 }

 update(view, detail = true) {
  if (!detail) {
   if (this.bounds) {
    for (const node of this.nodes.values()) node.remove();
    this.nodes.clear();
    this.bounds = null;
   }
   return;
  }
  const {width, height, size} = this.manifest;
  const halfWidth = view.w / (2 * view.k) + 16;
  const halfHeight = view.h / (2 * view.k) + 16;
  const left = tileIndex(view.x - halfWidth, width, size);
  const right = tileIndex(view.x + halfWidth, width, size);
  const top = tileIndex(view.y - halfHeight, height, size);
  const bottom = tileIndex(view.y + halfHeight, height, size);
  const last = this.bounds;
  if (last && left === last.left && right === last.right && top === last.top && bottom === last.bottom) return;
  this.bounds = {left, right, top, bottom};

  const live = new Set();
  for (const tile of chartTilePlacements(view, this.manifest)) {
   live.add(tile.id);
   if (this.nodes.has(tile.id)) continue;
   const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
   const attributes = {
    x:tile.x, y:tile.y, width:tile.w, height:tile.h,
    href:`${this.assetPath}/${tile.file}?v=${tile.sha256.slice(0,16)}`,
    preserveAspectRatio:'none', 'pointer-events':'none', 'data-tile':tile.id
   };
   for (const [key, value] of Object.entries(attributes)) image.setAttribute(key, value);
   this.root.append(image);
   this.nodes.set(tile.id, image);
  }
  for (const [id, node] of this.nodes) {
   if (live.has(id)) continue;
   node.remove();
   this.nodes.delete(id);
  }
 }
}
