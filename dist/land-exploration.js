import {LAND_COVERAGE_RUNS,LAND_TILE_COUNT} from './land-exploration-data.js?v=2026.11.21-inland-discovery-hubs';

const WIDTH=1440;
const ROWS=720;
const CELL_SPAN=5;
const CHUNK_BYTES=32;
const CHUNK_BITS=CHUNK_BYTES*8;
const BLOCK=CHUNK_BYTES+2;
const MAX_CHUNKS=Math.ceil(LAND_TILE_COUNT/CHUNK_BITS);
const CHART_LENGTH=4*Math.ceil(MAX_CHUNKS*BLOCK/3);
const stateCache=new WeakMap();
let geometry;

function chartGeometry(){
 if(geometry)return geometry;
 const encoded=atob(LAND_COVERAGE_RUNS);
 const indices=new Uint32Array(WIDTH*ROWS);
 const tiles=new Uint32Array(LAND_TILE_COUNT);
 const weights=new Uint8Array(LAND_TILE_COUNT);
 const rowArea=Array.from({length:ROWS},(_,y)=>{
  const radians=degrees=>degrees*Math.PI/180;
  return Math.round(6371000**2*radians(.25)*(Math.sin(radians(90-y/4))-Math.sin(radians(90-(y+1)/4)))/25);
 });
 let tile=0,ordinal=0;
 for(let i=0;i<encoded.length;){
  const code=encoded.charCodeAt(i++),count=code&31;
  let length=code>>5;
  if(!length)length=encoded.charCodeAt(i++)|encoded.charCodeAt(i++)<<8;
  const end=tile+length;
  if(count){
   for(;tile<end;tile++){
    tiles[ordinal]=tile;
    weights[ordinal]=count;
    indices[tile]=++ordinal;
   }
  }else tile=end;
 }
 return geometry={indices,tiles,weights,rowArea};
}
function chartOrdinal([x,y]){
 if(x<0||x>=WIDTH*CELL_SPAN||y<0||y>=ROWS*CELL_SPAN)return -1;
 return chartGeometry().indices[Math.floor(y/CELL_SPAN)*WIDTH+Math.floor(x/CELL_SPAN)]-1;
}
function readChart(text){
 if(typeof text!=='string'||text.length>CHART_LENGTH)return null;
 let decoded;
 try{decoded=atob(text);}catch{return null;}
 if(decoded.length%BLOCK!==0)return null;
 const chunks=new Map();
 for(let i=0;i<decoded.length;i+=BLOCK){
  const key=decoded.charCodeAt(i)|decoded.charCodeAt(i+1)<<8;
  if(key>=MAX_CHUNKS||chunks.has(key))return null;
  const data=Uint8Array.from(decoded.slice(i+2,i+BLOCK),c=>c.charCodeAt(0));
  if(key===MAX_CHUNKS-1){
   for(let bit=LAND_TILE_COUNT%CHUNK_BITS||CHUNK_BITS;bit<CHUNK_BITS;bit++){
    if(data[bit>>3]&(1<<(bit&7)))return null;
   }
  }
  chunks.set(key,data);
 }
 return chunks;
}
export const validLandChart=text=>text===undefined||readChart(text)!==null;
function chartState(inland){
 let state=stateCache.get(inland);
 if(!state||state.encoded!==inland.chart){
  state={encoded:inland.chart,chunks:readChart(inland.chart||'')||new Map()};
  stateCache.set(inland,state);
 }
 return state;
}
export function landTileSeen(inland,cell){
 if(!inland.chart)return false;
 const ordinal=chartOrdinal(cell);
 if(ordinal<0)return false;
 const chunk=chartState(inland).chunks.get(ordinal>>8),bit=ordinal%CHUNK_BITS;
 return !!(chunk?.[bit>>3]&(1<<(bit&7)));
}
export function revealLandTile(inland,cell){
 const ordinal=chartOrdinal(cell);
 if(ordinal<0)return false;
 const {chunks}=chartState(inland),key=ordinal>>8,bit=ordinal%CHUNK_BITS;
 let data=chunks.get(key);
 if(!data){data=new Uint8Array(CHUNK_BYTES);chunks.set(key,data);}
 const mask=1<<(bit&7),byte=bit>>3;
 if(data[byte]&mask)return false;
 data[byte]|=mask;
 let packed='';
 for(const [index,bytes] of chunks)packed+=String.fromCharCode(index&255,index>>8,...bytes);
 inland.chart=btoa(packed);
 stateCache.set(inland,{encoded:inland.chart,chunks});
 return true;
}

function* walkedTiles(inland){
 if(!inland?.chart)return;
 for(const [index,bytes] of chartState(inland).chunks){
  for(let byte=0;byte<bytes.length;byte++){
   if(!bytes[byte])continue;
   for(let bit=0;bit<8;bit++)if(bytes[byte]&(1<<bit))yield index*CHUNK_BITS+byte*8+bit;
  }
 }
}

let previousChart,previousFog;
export function landFog(inland){
 const chart=inland?.chart||'';
 if(chart===previousChart)return previousFog;
 previousChart=chart;
 previousFog=null;
 if(!chart)return null;
 const {tiles}=chartGeometry();
 const chartPixels=[],mapPixels=new Set(),atlasCoverage=new Map();
 for(const ordinal of walkedTiles(inland)){
  const tile=tiles[ordinal],row=Math.floor(tile/WIDTH),x=tile%WIDTH;
  if(row<40||row>=600)continue;
  chartPixels.push(tile-40*WIDTH);
  mapPixels.add(tile);
  const atlasPixel=(row>>2)*360+(x>>2);
  atlasCoverage.set(atlasPixel,(atlasCoverage.get(atlasPixel)||0)+1);
 }
 if(chartPixels.length)previousFog={
  chartPixels,
  seen(lon,lat){
   const x=Math.floor((lon+180)*4),y=Math.floor((90-lat)*4);
   return y>=40&&y<600&&mapPixels.has(y*WIDTH+((x%WIDTH)+WIDTH)%WIDTH);
  },
  coverage:pixel=>(atlasCoverage.get(pixel)||0)/16,
  globeCoverage(lon,lat){
   if(this.seen(lon,lat))return 1;
   const x=Math.floor(lon+180),y=Math.floor(90-lat);
   return this.coverage(y*360+((x%360)+360)%360);
  }
 };
 return previousFog;
}

export function landExplorationArea(inland,seaHas){
 if(!inland?.chart)return {walked:0,additional:0};
 const {tiles,weights,rowArea}=chartGeometry();
 const uncoveredBySea=(tile,row)=>row<40||row>=600||!seaHas?.(Math.floor((row-40)/2)*720+Math.floor((tile%WIDTH)/2));
 let walked=0,additional=0;
 for(const ordinal of walkedTiles(inland)){
  const tile=tiles[ordinal],row=Math.floor(tile/WIDTH),area=weights[ordinal]*rowArea[row];
  walked+=area;
  if(uncoveredBySea(tile,row))additional+=area;
 }
 return {walked,additional};
}
