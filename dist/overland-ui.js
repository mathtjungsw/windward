import {shortestInlandRoute} from './inland-route.js?v=2026.11.21-inland-discovery-hubs';
import {FieldTerrain,startField,returnField,walkField,fieldNear,fieldDistance} from './overland.js?v=2026.11.21-inland-discovery-hubs';
import {INLAND_CITIES,INLAND_TIERS,inlandVehicle,inlandWarehouse,inlandAvailable,knownTown,settleInlandVisit,fieldPace,fieldCargo,fieldLoad,fieldTransfer,boardFieldCargo,upgradeInlandVehicle} from './inland.js?v=2026.11.21-inland-discovery-hubs';
import {landTileSeen,landExplorationArea} from './land-exploration.js?v=2026.11.21-inland-discovery-hubs';
import {DISCOVERIES} from './discoveries-catalog.js?v=2026.11.21-inland-discovery-hubs';
import {inspectFieldDiscovery} from './discoveries.js?v=2026.11.21-inland-discovery-hubs';
import {GOODS,PORT_BY_ID} from './data.js?v=2026.11.21-inland-discovery-hubs';

let terrainPromise;
function loadTerrain(){
 return terrainPromise??=fetch(new URL('assets/overland-terrain.bin',import.meta.url)).then(async response=>{
  if(!response.ok)throw Error('육상 지도를 불러오지 못했어요.');
  return new FieldTerrain(await response.arrayBuffer());
 }).catch(error=>{terrainPromise=null;throw error;});
}
const litTerrain=['#a7ccd8','#e9ecd0','#5a96ae','#a5845d','#81b5c7'];
const seaScoutedTerrain=['#8aafb9','#c6ccb3','#557d8d','#877358','#7099a3'];
const unchartedFog='#254c58';
const TERRAIN_PIXEL_BUDGET=100000;
const glyphs={
 walk:'<path d="M-5 5v9m10-9v9M-7 0l-5 7m18-7 5 6" stroke="#38473a" stroke-width="3" stroke-linecap="round"/><rect x="-9" y="-6" width="6" height="11" rx="2" fill="#af7744"/><rect x="-6" y="-5" width="12" height="12" rx="4" fill="#276065"/><circle cy="-10" r="5" fill="#c98d55"/><path d="M-8-12H8L5-16h-9Z" fill="#51412e"/>',
 handcart:'<path d="M-17 7h19l5-5m3-1v12" stroke="#67432c" stroke-width="2" fill="none"/><path d="M-19 0h17l-3 9h-10Z" fill="#a87642" stroke="#614a37"/><circle cx="-12" cy="11" r="4" fill="#4b3c2e"/><path d="m6 5 1 8m5-8 1 8" stroke="#38473a" stroke-width="2"/><rect x="6" y="-4" width="8" height="11" rx="3" fill="#276065"/><circle cx="10" cy="-8" r="4" fill="#c98d55"/>',
 horse:'<path d="M-13 6v8m7-7v6m13-7v8m5-9v9" stroke="#533927" stroke-width="3" stroke-linecap="round"/><path d="M-16 4q-3-8 5-8H4l6-9 6 1 4 8-5 3-5-3L7 7h-20Z" fill="#98603a" stroke="#583824"/><path d="M-5-10h7l3 9h-14Z" fill="#245d60"/><circle cx="-2" cy="-13" r="4" fill="#ca925e"/><path d="M-8-15H3L1-18h-6Z" fill="#493b2c"/>',
 wagon:'<path d="m4 8 6-8h6l3 7h-4m-1-2v9m-5-9v9" fill="#915e3d" stroke="#573c29" stroke-width="2"/><path d="M-18 9V0q1-11 10-11T2 0v9Z" fill="#efe3ba" stroke="#776448" stroke-width="1.4"/><path d="M-20 6H6v4h-26Z" fill="#82552e"/><circle cx="-15" cy="11" r="4" fill="#493b2c"/><circle cx="-1" cy="11" r="4" fill="#493b2c"/>'
};
const fmt=n=>Number(n).toLocaleString('ko-KR');
export function createFieldUI(api){
 let terrain,towns=[],finds=[],opening=false,motion=null,nextStep=0,dirty=false,lastSave=0,terrainKey='',terrainChart,seaChart,markerKey='',nearTown,nearFind;
 let raster,canvas,spots,avatar,routeLine,routeEnd;
 let controlMode='auto',route=null,planning=null;
 const svg=api.svg;
 const field=()=>api.game().inland?.field;
 const atOrigin=(f=field())=>!!terrain&&fieldNear(f,terrain,f?.origin,1.5);
 function showRoute(message=''){
  const panel=api.panel(),status=panel.querySelector('#field-route-status');
  status.textContent=message;
  status.hidden=!message;
  panel.querySelector('#field-route-stop').hidden=!route&&!planning;
  if(!routeLine)return;
  routeLine.style.display=route?'':'none';
  routeEnd.style.display=route?'':'none';
  if(!route)return;
  const current=field().cell;
  const coordinates=[current,...route.path.slice(route.index)].map(cell=>api.project(terrain.geo(cell)));
  routeLine.setAttribute('points',coordinates.map(([x,y])=>x+','+y).join(' '));
  const [x,y]=coordinates.at(-1);routeEnd.setAttribute('cx',x);routeEnd.setAttribute('cy',y);
  scaleTarget();
 }
 function scaleTarget(){
  const scale=api.view().scale;
  if(scale&&route)routeEnd.setAttribute('r',6/scale);
 }
 function park(){
  if(planning||route){
   planning?.abort();
   planning=null;route=null;showRoute();
  }
  if(dirty){api.save();dirty=false;}
 }
 function setMode(mode){
  if(controlMode===mode)return;
  if(mode==='manual')park();
  controlMode=mode;
  api.onMode();
 }
 function mount(){
  const terrainLayer=api.terrainLayer(),siteLayer=api.siteLayer();
  if(!raster){
   canvas=document.createElement('canvas');
   raster=svg('image',{preserveAspectRatio:'none',style:'image-rendering:pixelated'});
   terrainLayer.append(raster);
   routeLine=svg('polyline',{id:'field-route-line',class:'field-route','vector-effect':'non-scaling-stroke',style:'display:none'});
   routeEnd=svg('circle',{class:'field-route-end','vector-effect':'non-scaling-stroke',style:'display:none'});
   spots=svg('g');
   avatar=svg('g',{'aria-label':'육상 이동'});
   siteLayer.append(routeLine,routeEnd,spots,avatar);
  }
 }
 async function open(restore=false){
  if(opening||!api.ready())return;
  settleInlandVisit(api.game(),api.now());
  if(api.game().inland?.visit){api.town(api.game().inland.visit.city);return;}
  if(field()&&terrain&&!restore){api.focus();return;}
  if(api.blocked())return;
  opening=true;
  try{
   if(!terrain){
    terrain=await loadTerrain();
    towns=Object.values(INLAND_CITIES).map(town=>({town,cell:terrain.landing(town.point,6)})).filter(t=>t.cell);
    finds=DISCOVERIES.filter(d=>d.medium==='land').map(entry=>({entry,cell:terrain.cell(entry.point)}));
   }
   if(!api.ready())return;
   const game=api.game(),port=PORT_BY_ID[game.port],point=port?[port.cityLon??port.lon,port.cityLat??port.lat]:game.position;
   const chart=game.inland?.chart;
   api.stop();
   startField(game,terrain,point,game.port);
   controlMode='auto';
   mount();
   if(restore){motion=null;terrainKey='';markerKey='';}
   updateSites();
   api.enter();
   if(chart!==game.inland.chart)api.changed();
   api.panel().scrollIntoView?.({block:'nearest'});
  }catch(error){api.toast(error.message,'error');}
  finally{opening=false;}
 }
 function updateSites(){
  const game=api.game(),f=field();
  nearTown=undefined;nearFind=undefined;
  delete f.town;
  for(const {town,cell} of towns){
   if(!fieldNear(f,terrain,cell,2))continue;
   nearTown=town;f.town=town.id;
   const first=!knownTown(game,town.id);game.inland.towns??={};
   const record=game.inland.towns[town.id]??={at:api.now(),port:null};
   if(f.port&&!record.routes?.includes(f.port)){
    record.routes=[...new Set([...(record.routes||[]),record.port,f.port].filter(Boolean))];record.port=f.port;
   }
   if(first){api.toast(town.name+' 발견!');api.changed();}
   break;
  }
  nearFind=finds.find(({entry,cell})=>!game.discoveries?.[entry.id]&&fieldNear(f,terrain,cell,1.5));
  const panel=api.panel();
  const town=panel.querySelector('#field-town'),investigate=panel.querySelector('#field-inspect');
  town.hidden=!nearTown;if(nearTown)town.textContent=nearTown.name+' 입장';
  investigate.hidden=!nearFind;
  const atLanding=atOrigin();
  panel.querySelector('#field-return').hidden=atLanding;
  panel.querySelector('#field-ship').hidden=!atLanding;
  panel.querySelector('#field-transfer').hidden=!atLanding;
  panel.querySelector('#field-vehicle').hidden=!atLanding&&!nearTown;
  const vehicle=inlandVehicle(game);
  panel.querySelector('#field-stat').textContent=vehicle.name+' · 화물 '+fmt(fieldLoad(game))+'/'+fmt(vehicle.load)+'상자';
  const dx=f.origin[0]-f.cell[0],dy=f.origin[1]-f.cell[1],bearing=(dy<0?'북':dy>0?'남':'')+(dx<0?'서':dx>0?'동':'');
  panel.querySelector('#field-bear').textContent=atLanding?'상륙지':bearing+'쪽 상륙지 · '+Math.ceil(fieldDistance(f.cell,f.origin))+'칸';
  const landArea=Math.round(landExplorationArea(game.inland).walked/1000000);
  panel.querySelector('#field-area').textContent='밝힌 육지 '+fmt(landArea)+' km²';
 }
 function setGoal(point){
  if(terrain)return planRoute(terrain.cell(point));
 }
 async function planRoute(destination,returning=false){
  const current=field();
  if(!terrain||!current||!api.ready())return;
  api.stop();
  setMode('auto');
  if(terrain.kind(...destination)!==1){api.toast('이동할 수 있는 육지를 선택하세요.');return;}
  const request=new AbortController();
  planning=request;showRoute(returning?'상륙지로 돌아가는 길 계산 중…':'육상 경로 계산 중…');
  const path=await shortestInlandRoute(terrain,current.cell,destination,request.signal);
  if(planning!==request)return;
  planning=null;
  if(!path?.length){
   showRoute();
   if(!path)api.toast('이 목적지까지 이어지는 육상 경로가 없어요.');
   return;
  }
  route={path,index:0,returning};
  showRemainingRoute();
  api.follow();
 }
 function showRemainingRoute(){
  const label=route.returning?'상륙지로 돌아가는 중':'자동 이동';
  showRoute(label+' · '+fmt(route.path.length-route.index)+'칸 남음');
 }
 function point(now=performance.now()){
  const f=field();if(!terrain||!f)return null;
  if(!motion)return terrain.geo(f.cell);
  const fraction=Math.min(1,Math.max(0,(now-motion.at)/motion.duration));
  const prev=motion.from,next=f.cell;
  const location=terrain.geo([prev[0]+(next[0]-prev[0])*fraction,prev[1]+(next[1]-prev[1])*fraction]);
  if(fraction===1)motion=null;
  return location;
 }
 function tick(now,keys,allowed){
  if(!terrain||!field())return;
  if(allowed&&now>=nextStep){
   const dx=Number(keys.has('ArrowRight'))-Number(keys.has('ArrowLeft')),dy=Number(keys.has('ArrowDown'))-Number(keys.has('ArrowUp'));
   if(dx||dy)setMode('manual');
   const before=field().cell,next=route?.path[route.index];
   const step=dx||dy?[dx,dy]:next&&[next[0]-before[0],next[1]-before[1]];
   if(step?.some(Boolean)){
    const duration=1000*Math.hypot(...step)/fieldPace(inlandVehicle(api.game()));
    nextStep=now+duration;
    const blocked=walkField(api.game(),terrain,...step);
    if(blocked){
     park();
     api.toast(blocked+'에는 들어갈 수 없어요. 길을 돌아가세요.');
    }else{
     dirty=true;motion={from:before,at:now,duration};
     api.follow();updateSites();
     if(route){
      route.index++;
      if(route.index===route.path.length){
       const returning=route.returning;
       park();
       api.toast(returning?'상륙지에 도착했어요. 배에 오를 수 있어요.':'목적지에 도착했어요.');
      }else showRemainingRoute();
     }
     if(dirty&&now-lastSave>=5000){api.save();dirty=false;lastSave=now;}
    }
   }
  }
  if(!motion&&!keys.size&&!route&&dirty)park();
  if(motion)api.repaint();
 }
 function paintTerrain(f,view){
  const {nw,se,scale}=view;
  const [left,top]=terrain.cell(nw),[right,bottom]=terrain.cell(se);
  const x0=left-2,x1=right+2;
  const y0=top-2,y1=bottom+2;
  const sea=api.seaExploration();
  const key=[x0,x1,y0,y1,...f.cell,scale,sea.revision].join('|');
  const chart=api.game().inland.chart;
  if(key===terrainKey&&chart===terrainChart&&sea===seaChart)return;
  terrainKey=key;terrainChart=chart;seaChart=sea;
  const width=x1-x0+1,height=y1-y0+1;
  if(width<=0||height<=0){raster.removeAttribute('href');return;}
  // Keep nearby terrain at ground-cell resolution and bound wide overview redraws.
  const sampleSize=Math.max(1,Math.ceil(Math.sqrt(width*height/TERRAIN_PIXEL_BUDGET)));
  canvas.width=Math.ceil(width/sampleSize);
  canvas.height=Math.ceil(height/sampleSize);
  const context=canvas.getContext('2d');
  const inland=api.game().inland;
  for(let row=0;row<canvas.height;row++)for(let column=0;column<canvas.width;column++){
   const x=x0+Math.floor((column+.5)*width/canvas.width);
   const y=y0+Math.floor((row+.5)*height/canvas.height);
   const wrappedX=((x%terrain.width)+terrain.width)%terrain.width;
   const cell=[wrappedX,y];
   const dx=Math.abs(wrappedX-f.cell[0]);
   const inSight=Math.hypot(Math.min(dx,terrain.width-dx),y-f.cell[1])<=8;
   if(inSight||landTileSeen(inland,cell))context.fillStyle=litTerrain[terrain.kind(...cell)];
   else{
    const position=terrain.geo(cell);
    const onSeaChart=position[1]>-60&&position[1]<=80;
    context.fillStyle=onSeaChart&&sea.seen(position)?seaScoutedTerrain[terrain.kind(...cell)]:unchartedFog;
   }
   context.fillRect(column,row,1,1);
  }
  const [leftEdge,topEdge]=terrain.geo([x0-.5,y0-.5]);
  const [rightEdge,bottomEdge]=terrain.geo([x1+.5,y1+.5]);
  const [x,y]=api.project([leftEdge,topEdge]),[rightX,bottomY]=api.project([rightEdge,bottomEdge]);
  raster.setAttribute('x',x);raster.setAttribute('y',y);
  raster.setAttribute('width',rightX-x);raster.setAttribute('height',bottomY-y);
  raster.setAttribute('href',canvas.toDataURL());
 }
 function draw(){
  const f=field();
  api.terrainLayer().style.display=f?'':'none';
  api.siteLayer().style.display=f?'':'none';
  if(!f||!terrain||!avatar)return;
  const view=api.view(),s=1/view.scale;
  if(!view.scale)return;
  paintTerrain(f,view);
  scaleTarget();
  const game=api.game(),vehicle=inlandVehicle(game),icon=vehicle.tier<=3?'walk':vehicle.tier===4?'handcart':vehicle.tier<=8?'horse':'wagon';
  const position=point(),[x,y]=api.project(position);
  avatar.setAttribute('transform','translate('+x+' '+y+') scale('+s+')');
  if(avatar.dataset.glyph!==icon){avatar.dataset.glyph=icon;avatar.innerHTML=glyphs[icon];}
  const key=[f.cell.join(),view.scale,Object.keys(game.discoveries||{}).length].join('|');
  if(key===markerKey)return;
  markerKey=key;
  spots.replaceChildren();
  function mark(cell,symbol,label){
   const [x,y]=api.project(terrain.geo(cell)),g=svg('g',{class:'field-site',transform:'translate('+x+' '+y+') scale('+s+')'});
   const pin=svg('text',{'text-anchor':'middle',y:6});pin.textContent=symbol;g.append(pin);
   if(label){const title=svg('text',{'text-anchor':'middle',y:-11});title.textContent=label;g.append(title);}
   spots.append(g);
  }
  mark(f.origin,'⚑','상륙지');
  for(const {town,cell} of towns)if(fieldDistance(f.cell,cell)<=8||knownTown(game,town.id)&&landTileSeen(game.inland,cell))mark(cell,'◆',knownTown(game,town.id)?town.name:'');
  for(const {entry,cell} of finds)if(!game.discoveries?.[entry.id]&&fieldDistance(f.cell,cell)<=8)mark(cell,'✧');
 }
 function board(){
  if(!atOrigin()||!api.ready())return;
  try{
   const game=api.game();
   boardFieldCargo(game,terrain);
   returnField(game,terrain);
   motion=null;nextStep=0;terrainKey='';markerKey='';park();
   api.exit();api.changed();api.toast('선단에 복귀했어요.');
  }catch(error){api.toast(error.message,'error');}
 }
 function vehicleMenu(){
  if(!atOrigin()&&!nearTown)return;
  const game=api.game(),v=inlandVehicle(game),next=INLAND_TIERS[v.tier];
  const current='현재 '+v.tier+'단계 · '+v.name+' · '+fmt(v.load)+'상자';
  const upgrade=next?'<p>'+next.name+' · 적재 '+fmt(next.load)+'상자 · 이동 속도 +'+Math.round((fieldPace(next)/fieldPace(v)-1)*100)+'%</p><button id="field-upgrade" '+(game.money<next.cost-v.cost?'disabled':'')+'>개량 · '+fmt(next.cost-v.cost)+' D</button>':'<p>최고 단계에 도달했어요.</p>';
  park();api.modal('육상 운송 수단',current,upgrade,'small');
  document.querySelector('#field-upgrade')?.addEventListener('click',()=>api.run(g=>{
   if(!g.inland?.field?.town&&!atOrigin(g.inland?.field))throw Error('상륙지나 도시에 도착해 주세요.');
   return upgradeInlandVehicle(g);
  },()=>{updateSites();api.repaint();vehicleMenu();}));
 }
 function cargoMenu(city=null){
  if(city?field()?.town!==city:!atOrigin())return;
  const game=api.game(),carried=fieldCargo(game),other=city?inlandWarehouse(game,city):game.cargo;
  const label=city?'도시 창고':'선단 화물창';
  const rows=(cargo,toField)=>Object.entries(cargo).filter(([id,item])=>item.qty&&(!city||!toField||inlandAvailable(game,city,id)>0)).map(([id,item])=>
   '<option value="'+id+'">'+GOODS[id].name+' · '+fmt(city&&toField?inlandAvailable(game,city,id):item.qty)+'상자</option>').join('');
  const form=(options,toField)=>options?'<form data-transfer="'+toField+'"><label>상품 <select required>'+options+'</select></label><label>상자 <input type="number" min="1" max="1000" value="1" required></label><button>'+ (toField?'육상에 싣기':label+'에 내리기')+'</button></form>':'<p>옮길 화물이 없어요.</p>';
  park();api.modal('육상 화물','적재 '+fmt(fieldLoad(game))+'/'+fmt(inlandVehicle(game).load)+'상자','<h3>'+label+'</h3>'+form(rows(other,true),true)+'<h3>육상에 실은 화물</h3>'+form(rows(carried,false),false),'medium');
  document.querySelectorAll('[data-transfer]').forEach(form=>form.onsubmit=event=>{
   event.preventDefault();
   const good=form.querySelector('select').value,qty=form.querySelector('input').valueAsNumber;
   api.run(g=>fieldTransfer(g,terrain,good,qty,form.dataset.transfer==='true',city),()=>{updateSites();cargoMenu(city);});
  });
 }
 const panel=api.panel();
 panel.querySelector('#field-ship').onclick=board;
 panel.querySelector('#field-return').onclick=()=>{
  const landing=field();
  if(landing&&!atOrigin(landing))void planRoute(landing.origin,true);
 };
 panel.querySelector('#field-route-stop').onclick=park;
 panel.querySelector('#field-town').onclick=()=>{if(nearTown){park();api.town(nearTown.id);}};
 panel.querySelector('#field-inspect').onclick=()=>{
  park();
  const result=nearFind&&inspectFieldDiscovery(api.game(),terrain,nearFind.entry.id,api.now());
  if(result){api.toast(result.discovery.name+' 수집 · 명성 +'+(result.discovery.fame+result.blessingFame));updateSites();api.changed();api.repaint();}
 };
 panel.querySelector('#field-vehicle').onclick=vehicleMenu;
 panel.querySelector('#field-transfer').onclick=()=>cargoMenu();
 return {open,point,tick,draw,park,setGoal,setMode,mode:()=>controlMode,cargoMenu,updateSites};
}
