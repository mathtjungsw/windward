import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chartTilePlacements,ChartTerrain} from '../dist/chart-terrain.js';
import {Window} from 'happy-dom';
const manifest=JSON.parse(readFileSync(new URL('../dist/assets/chart-tiles/manifest.json',import.meta.url)));
test('terrain requests only nearby detailed tiles and reuses nodes while moving inside the same tile set',()=>{
 const window=new Window();globalThis.document=window.document;const root=document.createElementNS('http://www.w3.org/2000/svg','g'),terrain=new ChartTerrain(root,manifest),view={x:760,y:236,w:390,h:600,k:12};terrain.update(view);assert.ok(root.children.length>0&&root.children.length<=9);const nodes=[...root.children];for(let i=0;i<60;i++)terrain.update(view);assert.deepEqual([...root.children],nodes);terrain.update({...view,x:1200});assert.ok([...root.children].every(n=>!nodes.includes(n)));assert.ok(root.children.length<=9);
});
test('terrain wraps at both seams and retains exact final-row height without gaps or duplicate placement IDs',()=>{
 const dense={...manifest,tiles:Object.fromEntries(Array.from({length:25*13},(_,i)=>[`${i%25},${Math.floor(i/25)}`,{file:'fixture.webp',sha256:'abc'}]))};
 for(const view of [{x:0,y:0},{x:1599,y:799},{x:0,y:400},{x:800,y:0}]){
  const v={...view,w:900,h:600,k:12},tiles=chartTilePlacements(v,dense);assert.equal(new Set(tiles.map(t=>t.id)).size,tiles.length);assert.ok(tiles.length<=16);
  for(let x=v.x-35;x<=v.x+35;x+=7)for(let y=v.y-23;y<=v.y+23;y+=7)assert.ok(tiles.some(t=>x>=t.x&&x<t.x+t.w&&y>=t.y&&y<t.y+t.h),`missing terrain at ${x},${y}`);
  for(const t of tiles)assert.equal(t.h,t.id.endsWith(':12')?32:64);
 }
});
