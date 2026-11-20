import {FieldTerrain,startField,returnField,moveField,fieldNear,fieldDistance} from './overland.js?v=2026.11.20-survey-voyages';
import {INLAND_CITIES,knownTown,settleInlandVisit} from './inland.js?v=2026.11.20-survey-voyages';
import {DISCOVERIES} from './discoveries-catalog.js?v=2026.11.20-survey-voyages';
import {inspectFieldDiscovery} from './discoveries.js?v=2026.11.20-survey-voyages';
import {PORT_BY_ID} from './data.js?v=2026.11.20-survey-voyages';
const colors=['#a7ccd8','#dee0ae','#6ca7c5','#99876b','#81b5c7'];
const directions={ArrowUp:[0,-1],KeyW:[0,-1],ArrowDown:[0,1],KeyS:[0,1],ArrowLeft:[-1,0],KeyA:[-1,0],ArrowRight:[1,0],KeyD:[1,0]};
let terrainPromise;
function terrainData(){
 return terrainPromise??=fetch(new URL('assets/overland-terrain.bin',import.meta.url)).then(async r=>{
  if(!r.ok)throw Error('육상 지도 다운로드에 실패했어요. 다시 열어 주세요.');
  return new FieldTerrain(await r.arrayBuffer());
 }).catch(e=>{terrainPromise=null;throw e;});
}
export function createFieldUI(api){
 let release,opening=false;
 async function open(){
  if(opening||!api.ready())return;
  settleInlandVisit(api.game(),api.now());
  if(api.game().inland?.visit){api.town(api.game().inland.visit.city);return;}
  opening=true;
  try{
   const terrain=await terrainData(),game=api.game();if(!api.ready())return;
   const port=PORT_BY_ID[game.port],point=port?[port.cityLon??port.lon,port.cityLat??port.lat]:game.position;
   const fresh=!game.inland?.field;
   api.stop();startField(game,terrain,point,game.port);if(fresh)api.changed();
   release?.();show(terrain);
  }catch(e){api.toast(e.message,'error');}finally{opening=false;}
 }
 function show(terrain){
  const towns=Object.values(INLAND_CITIES).map(town=>({town,cell:terrain.landing(town.point,6)})).filter(t=>t.cell);
  const finds=DISCOVERIES.filter(d=>d.medium==='land').map(entry=>({entry,cell:terrain.cell(entry.point)}));
  api.modal('육상 탐험','상륙 탐사대',`<div class="field-panel"><canvas id="field-canvas" tabindex="0" aria-label="육상 지도. 방향키 또는 WASD로 걷기"></canvas>
  <div class="field-key">⚑ 상륙지　◆ 도시　✧ 흔적　 파랑 · 물　갈색 · 산등성이</div>
  <p id="field-status" role="status"></p><div class="field-controls"><div class="field-pad" aria-label="도보 조작"><button data-walk="ArrowUp" aria-label="북쪽">↑</button><button data-walk="ArrowLeft" aria-label="서쪽">←</button><button data-walk="ArrowDown" aria-label="남쪽">↓</button><button data-walk="ArrowRight" aria-label="동쪽">→</button></div><div class="field-actions"><button id="field-town" hidden></button><button id="field-inspect" hidden>흔적 조사</button><button id="field-return">배로 돌아가기</button></div></div><small>지도를 누르거나 방향키·WASD로 걸으세요. 물과 산등성이는 돌아가야 해요.</small></div>`,'wide');
  const canvas=document.querySelector('#field-canvas'),panel=canvas.parentElement,modal=canvas.closest('dialog'),ctx=canvas.getContext('2d');
  const status=panel.querySelector('#field-status'),townBtn=panel.querySelector('#field-town'),inspect=panel.querySelector('#field-inspect'),home=panel.querySelector('#field-return');
  let timer,held=null,walkTo=null,dirty=false,lastSave=0,nearTown,nearFind,closed=false;
  const unit=12;
  function persist(){if(dirty){api.save();dirty=false;lastSave=Date.now();}}
  function stop(){clearInterval(timer);timer=null;held=null;walkTo=null;persist();}
  function cleanup(){if(closed)return;closed=true;stop();events.abort();observer.disconnect();if(release===cleanup)release=null;}
  const events=new AbortController(),on=(el,event,fn)=>el.addEventListener(event,fn,{signal:events.signal});
  const observer=new MutationObserver(()=>{if(!canvas.isConnected||!modal.open)cleanup();});
  observer.observe(modal,{attributes:true,childList:true,subtree:true,attributeFilter:['open']});release=cleanup;
  function draw(message=''){
   const game=api.game(),f=game.inland?.field;if(!f||!canvas.isConnected){cleanup();return;}
   const w=Math.round(canvas.clientWidth),h=Math.round(canvas.clientHeight),ratio=Math.min(2,window.devicePixelRatio||1);if(!w||!h)return;
   if(canvas.width!==Math.round(w*ratio)||canvas.height!==Math.round(h*ratio)){canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);}
   ctx.setTransform(ratio,0,0,ratio,0,0);
   const [cx,cy]=f.cell,plot=p=>[w/2+(p[0]-cx)*unit,h/2+(p[1]-cy)*unit];
   const nx=Math.ceil(w/unit/2),ny=Math.ceil(h/unit/2);
   for(let y=cy-ny;y<=cy+ny;y++)for(let x=cx-nx;x<=cx+nx;x++){
    const k=terrain.kind(x,y),[px,py]=plot([x,y]);ctx.fillStyle=colors[k];ctx.fillRect(px-unit/2,py-unit/2,unit+.4,unit+.4);
    if(k===3){ctx.strokeStyle='#665740';ctx.beginPath();ctx.moveTo(px-4,py+2);ctx.lineTo(px,py-3);ctx.lineTo(px+4,py+2);ctx.stroke();}
    if(k===1&&(x*31+y*17)%11===0){ctx.fillStyle='#b4bc8d';ctx.fillRect(px-2,py,3,1);}
   }
   function mark(p,symbol,label,color){
    const [x,y]=plot(p);ctx.fillStyle=color;ctx.textAlign='center';ctx.font='bold 15px system-ui';ctx.fillText(symbol,x,y-4);
    if(label){ctx.font='bold 12px system-ui';ctx.strokeStyle='#fff8df';ctx.lineWidth=3;ctx.strokeText(label,x,y-18);ctx.fillText(label,x,y-18);ctx.lineWidth=1;}
   }
   nearTown=null;nearFind=null;const prevTown=f.town;delete f.town;
   for(const {town,cell} of towns){
    const distance=fieldDistance(f.cell,cell);if(distance>40)continue;
    if(fieldNear(f,terrain,cell,2)){
     nearTown=town;f.town=town.id;
     const first=!knownTown(game,town.id);game.inland.towns??={};
     const record=game.inland.towns[town.id]??={at:api.now(),port:null};
     if(f.port&&!record.routes?.includes(f.port)){record.routes=[...new Set([...(record.routes||[]),record.port,f.port].filter(Boolean))];record.port=f.port;dirty=true;}
     if(first){message=town.name+' 발견! 도시 시설을 이용할 수 있어요.';api.changed();}
    }
    const known=knownTown(game,town.id);
    if(known||distance<=8)mark(cell,'◆',known?town.name:'도시의 윤곽','#684922');
   }
   if(prevTown!==f.town)dirty=true;
   for(const {entry,cell} of finds){
    if(game.discoveries?.[entry.id]||fieldDistance(f.cell,cell)>8)continue;
    mark(cell,'✧','','#814819');if(!nearFind&&fieldNear(f,terrain,cell,1.5))nearFind=entry;
   }
   mark(f.origin,'⚑','상륙지','#18566c');
   const x=w/2,y=h/2;ctx.fillStyle='#58432d';ctx.fillRect(x-4,y+3,3,5);ctx.fillRect(x+1,y+3,3,5);
   ctx.fillStyle='#245d60';ctx.fillRect(x-4,y-4,8,9);ctx.fillStyle='#af7744';ctx.fillRect(x-7,y-3,4,6);
   ctx.fillStyle='#c79061';ctx.fillRect(x-3,y-10,6,6);ctx.fillStyle='#533d2e';ctx.fillRect(x-5,y-11,10,2);ctx.fillRect(x-3,y-13,6,3);
   townBtn.hidden=!nearTown;if(nearTown)townBtn.textContent=nearTown.name+' 입장';
   inspect.hidden=!nearFind;home.disabled=!fieldNear(f,terrain,f.origin,1.5);
   const dx=f.origin[0]-cx,dy=f.origin[1]-cy,compass=(dy<0?'북':dy>0?'남':'')+(dx<0?'서':dx>0?'동':'');
   const info=message||(nearFind?'가까운 곳에 조사할 흔적이 있어요.':home.disabled?'상륙지까지 '+compass+'쪽 · '+Math.ceil(fieldDistance(f.cell,f.origin))+'칸':'상륙지 · 배에 오를 수 있어요.');
   if(status.textContent!==info)status.textContent=info;
  }
  function tick(){
   const f=api.game().inland?.field;if(!f||!api.ready()||!modal.open||!canvas.isConnected){cleanup();return;}
   if(walkTo&&fieldDistance(f.cell,walkTo)===0){stop();return;}
   const step=held||walkTo?.map((v,i)=>Math.sign(v-f.cell[i]));if(!step)return;
   const block=moveField(f,terrain,...step);if(block){stop();draw(block+'에 막혔어요. 길을 돌아가세요.');return;}
   dirty=true;draw();if(Date.now()-lastSave>5000)persist();
  }
  function start(){clearInterval(timer);timer=setInterval(tick,120);tick();}
  for(const b of panel.querySelectorAll('[data-walk]')){
   on(b,'pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);held=directions[b.dataset.walk];walkTo=null;start();});
   on(b,'lostpointercapture',stop);on(b,'pointerup',stop);on(b,'pointercancel',stop);
   on(b,'click',e=>{if(e.detail===0){held=directions[b.dataset.walk];tick();stop();}});
  }
  on(canvas,'pointerdown',e=>{const r=canvas.getBoundingClientRect(),f=api.game().inland.field;canvas.focus();held=null;walkTo=[f.cell[0]+Math.round((e.clientX-r.left-r.width/2)/unit),f.cell[1]+Math.round((e.clientY-r.top-r.height/2)/unit)];start();});
  on(window,'keydown',e=>{if(!directions[e.code]||e.ctrlKey||e.metaKey||e.altKey)return;e.preventDefault();if(e.repeat)return;held=directions[e.code];walkTo=null;start();});
  on(window,'keyup',e=>{if(directions[e.code]===held)stop();});on(window,'resize',()=>draw());on(window,'blur',stop);on(window,'pagehide',persist);on(document,'visibilitychange',()=>{if(document.hidden)stop();});on(modal,'close',()=>{if(!modal.open||!canvas.isConnected)cleanup();});
  on(home,'click',()=>{stop();try{returnField(api.game(),terrain);cleanup();modal.close();api.changed();api.toast('선단에 복귀했어요.');}catch(e){draw(e.message);}});
  on(townBtn,'click',()=>{if(nearTown){cleanup();api.town(nearTown.id);}});
  on(inspect,'click',()=>{stop();const result=nearFind&&inspectFieldDiscovery(api.game(),terrain,nearFind.id,api.now());if(result){api.changed();draw(result.discovery.name+' 수집 · 명성 +'+(result.discovery.fame+result.blessingFame));}});
  draw();canvas.focus();
 }
 return {open};
}
