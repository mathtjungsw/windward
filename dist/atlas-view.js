import {GlobeAtlas} from './globe.js?v=2026.11.12-cooperative-fleet-discoveries';
import {wrapPosition} from './world-wrap.js?v=2026.11.12-cooperative-fleet-discoveries';
export function viewportRects(points){if(!points?.length)return [];const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),rects=[];for(const dx of [-360,0,360])for(const dy of [-140,0,140]){const left=Math.max(-180,Math.min(...xs)+dx),right=Math.min(180,Math.max(...xs)+dx),south=Math.max(-60,Math.min(...ys)+dy),north=Math.min(80,Math.max(...ys)+dy);if(right>left&&north>south)rects.push({left,right,south,north});}return rects;}
export class AtlasView extends GlobeAtlas{
 constructor(canvas,land,rivers,ports,onLook){
  super(canvas,land,rivers,ports,onLook);this.mode='globe';this.flat=document.createElement('canvas');this.flat.width=360;this.flat.height=180;this.flatCtx=this.flat.getContext('2d');this.flatImage=this.flatCtx.createImageData(360,180);
  try{this.mode=localStorage.getItem('windward-atlas-view')==='flat'?'flat':'globe';}catch{}
  const bar=document.createElement('div');bar.className='atlas-toggle';bar.innerHTML='<button data-view="globe">지구본</button><button data-view="flat">평면지도</button>';canvas.before(bar);this.bar=bar;
  bar.querySelectorAll('button').forEach(b=>b.onclick=()=>this.setMode(b.dataset.view));
  canvas.addEventListener('pointerdown',e=>{if(this.mode==='flat'){this.drag=null;e.stopImmediatePropagation();}},true);
  canvas.addEventListener('pointerup',e=>{if(this.mode!=='flat')return;const r=canvas.getBoundingClientRect(),lon=(e.clientX-r.left)/r.width*360-180,lat=90-(e.clientY-r.top)/r.height*180;if(lat>=-60&&lat<=80)this.onLook(wrapPosition([lon,lat]));e.stopImmediatePropagation();},true);
  this.setMode(this.mode);
  if(typeof IntersectionObserver!=='undefined'){this.visibilityObserver=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting))this.draw(true);});this.visibilityObserver.observe(canvas);}
 }
 setMode(mode){this.lastFlatPaint=null;this.lastGlobePaint=null;mode=mode==='flat'?'flat':'globe';this.mode=mode;try{localStorage.setItem('windward-atlas-view',mode);}catch{}this.bar?.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===mode)));this.canvas.dataset.atlasMode=mode;const card=this.canvas.closest('.minimap-card');if(card)card.dataset.atlasMode=mode;const hint=card?.querySelector('.minimap-caption span:last-child');if(hint)hint.textContent=mode==='flat'?'클릭·터치: 해도 보기':'드래그: 회전 · 클릭: 해도 보기';this.canvas.width=mode==='flat'?360:240;this.canvas.height=mode==='flat'?180:240;this.canvas.style.aspectRatio=mode==='flat'?'2':'1';this.canvas.setAttribute('aria-label',mode==='flat'?'평면 세계지도. 클릭한 곳으로 해도 화면만 이동합니다.':'지구본. 드래그 회전, 클릭한 곳으로 해도 화면만 이동합니다.');this.draw(true);}
 update(state,viewport,route,force=false){this.rects=viewportRects(viewport);super.update(state,viewport,route,force);}
 line(points,color,width){if(points===this.viewport&&this.rects){for(const r of this.rects)super.line([[r.left,r.south],[r.right,r.south],[r.right,r.north],[r.left,r.north],[r.left,r.south]],color,width);}else super.line(points,color,width);}
 draw(force=false){if(this.mode!=='flat')return super.draw(force);if(!this.state||!this.flatCtx||!this.canPaint())return;const now=performance.now();if(!force&&now-this.lastDraw<200)return;const background=this.backgroundKey('flat'),paint=this.paintKey(background);if(!force&&paint===this.lastFlatPaint)return;this.lastFlatPaint=paint;this.lastDraw=now;const a=this.flatImage.data;
  if(background!==this.lastFlatBackground){this.lastFlatBackground=background;this.backgroundBuilds=(this.backgroundBuilds||0)+1;
  for(let y=0;y<180;y++)for(let x=0;x<360;x++){const lat=90-y,lon=x-180,src=(Math.min(799,Math.floor(y*800/180))*1600+Math.min(1599,Math.floor(x*1600/360)))*4,i=(y*360+x)*4,v=this.exploration?.visibility([lon,lat],this.state.position)??2;for(let c=0;c<3;c++)a[i+c]=v===0?[128,159,169][c]:v===1?(this.texture[src+c]+180)/2:this.texture[src+c];a[i+3]=255;}
  this.flatCtx.putImageData(this.flatImage,0,0);}
  const ctx=this.ctx;ctx.drawImage(this.flat,0,0);const p=q=>[(q[0]+180),90-q[1]];
  for(const port of this.ports)if(this.state.knownPorts.includes(port.id)){const [x,y]=p([port.lon,port.lat]);ctx.fillStyle='#5a7349';ctx.fillRect(x-1,y-1,2,2);}
  for(const peer of this.peers||[]){const [x,y]=p([peer.lon,peer.lat]);ctx.fillStyle=peer.fill;ctx.beginPath();ctx.arc(x,y,2,0,7);ctx.fill();}
  ctx.strokeStyle='#ae5a31';ctx.lineWidth=1;for(const r of this.rects||[])ctx.strokeRect(r.left+180,90-r.north,r.right-r.left,r.north-r.south);const [x,y]=p(this.state.position);ctx.beginPath();ctx.arc(x,y,3,0,7);ctx.fillStyle='#174f66';ctx.fill();ctx.strokeStyle='#fff9e8';ctx.stroke();
 }
}
