import { PORTS, PORT_BY_ID, GOODS, LEGACY_PORTS } from './data.js';
import {ship,shipTier,fleetCount,fleetCapacity,upgradeCost,additionalShipCost,supplySpace,ACTIVE_SECONDS_PER_DAY} from './ship-rules.js';
import {parseState} from './save-game.js';
export {ship,supplySpace,ACTIVE_SECONDS_PER_DAY} from './ship-rules.js';

export const SAVE_KEY='windward-save-v1';
export const START_DATE=Date.UTC(1522,3,6);
export const project = ([lon,lat])=>[(lon+180)*1600/360,(80-lat)*800/140];
export const unproject = ([x,y])=>[x*360/1600-180,80-y*140/800];
export const distance = (a,b)=>{
  const r=Math.PI/180, dl=(b[0]-a[0])*r, dp=(b[1]-a[1])*r;
  const h=Math.sin(dp/2)**2+Math.cos(a[1]*r)*Math.cos(b[1]*r)*Math.sin(dl/2)**2;
  return 3440.065*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));
};
export const INITIAL_PORTS=['lisbon','porto','seville'];
export function initialState(){return {
  version:3,legacyHarbor:false,shipTier:0,fleetCount:1,discoveries:{},rumors:[],supplyCreditValue:0,worldCatalogVersion:'2026.11.06',explorationMaskVersion:1,world:'real',knownPorts:[...INITIAL_PORTS],explored:'',money:2400,food:10,day:0,cargo:{},visited:['lisbon'],port:'lisbon',
  position:[-9.14,38.72],voyage:null,controlMode:'auto',profit:0,trades:0,soldAway:false,level:0,speed:1,
  favorites:[],recentPorts:['lisbon'],recentRoutes:[],missions:[],quiz:[],boughtLisbonWine:false,
  log:[{day:0,text:'리스본에서 뗏목 항해를 시작합니다. 보급과 화물 공간을 함께 확인하세요.',type:'discovery'}]
};}
export const parseSavedGame=raw=>parseState(raw,initialState);
export function loadState(storage){try{return parseSavedGame(storage.getItem(SAVE_KEY));}catch{return initialState();}}
export function settleSupply(s){const extra=Math.max(0,s.food-ship(s).supply);s.food-=extra;s.supplyCreditValue=(s.supplyCreditValue||0)+extra*fleetCount(s)*ship(s).supplyPrice;delete s.transitionPending;}
export const capacity=fleetCapacity;
export const usedCargo=s=>Object.values(s.cargo).reduce((n,c)=>n+c.qty,0);
export const usedSpace=s=>usedCargo(s)+supplySpace(s);
export const dailySpeed=s=>ship(s).speed;
export function price(portId,goodId,day=0){
  const p=PORT_BY_ID[portId],g=GOODS[goodId];if(!p||!g)throw Error('교역품을 확인하세요.');
  if(goodId==='spice'){
    const old=LEGACY_PORTS.find(q=>q.id===portId),source=LEGACY_PORTS.filter(q=>q.specialty==='spice');
    const nearest=Math.min(...source.map(q=>distance([p.lon,p.lat],[q.lon,q.lat])));
    const factor=old?(old.specialty==='spice'?.65:1.08+Math.min(nearest/3800,1.25)):1.12;
    return Math.round(110*factor*(1+.045*Math.sin(Math.floor(day/7)*1.7+Math.max(0,LEGACY_PORTS.indexOf(old))*2+3)));
  }
  const role=p.economy.stock[goodId],factor=role?{producer:.72,local:.9,import:1.12}[role]:p.economy.demand.includes(goodId)?1.35:.9;
  return Math.round(g.base*factor*(1+.045*Math.sin(Math.floor(day/7)*1.7+(p.pricePhase??PORTS.indexOf(p))*2+Object.keys(GOODS).indexOf(goodId))));
}
export function supplyCost(s,amount){return Math.max(0,Math.ceil(amount*fleetCount(s)*ship(s).supplyPrice-(s.supplyCreditValue||0)-1e-9));}
export function resupply(s,requested){
 if(!tradingPort(s))return {ok:false,error:'항구에서 보급할 수 있어요.'};
 const amount=Math.max(0,Math.min(Number(requested)||0,ship(s).supply-s.food,2*(capacity(s)-usedCargo(s))/fleetCount(s)-s.food));
 const cost=supplyCost(s,amount);if(amount<1e-8)return {ok:false,error:'보급 한도 또는 적재 공간을 확인하세요.'};if(cost>s.money)return {ok:false,error:'보급할 두카트가 부족해요.'};
 const credit=Math.min(amount*fleetCount(s)*ship(s).supplyPrice,s.supplyCreditValue||0);s.supplyCreditValue=Math.max(0,(s.supplyCreditValue||0)-credit);s.food+=amount;s.money-=cost;return {ok:true,amount,cost};
}
export function unloadSupply(s,amount){if(!tradingPort(s))return false;amount=Math.min(Math.max(0,Number(amount)||0),s.food);s.food-=amount;s.supplyCreditValue=(s.supplyCreditValue||0)+amount*fleetCount(s)*ship(s).supplyPrice;return amount>0;}
export function maxBuyQuantity(s,id,targetFood=s.food){
 if(!tradingPort(s)?.market.includes(id)||GOODS[id]?.legacy)return 0;
 const food=Math.max(s.food,Math.min(ship(s).supply,targetFood)),room=capacity(s)-usedCargo(s)-supplySpace({...s,food}),cash=s.money-supplyCost(s,Math.max(0,food-s.food));
 return Math.max(0,Math.min(room,Math.floor(cash/price(s.port,id,s.day))));
}
export function upgradeShip(s){const cost=upgradeCost(s);if(!tradingPort(s)||cost===null||s.money<cost)return {ok:false,error:cost===null?'최대 개량 상태예요.':'개량할 항구와 두카트를 확인하세요.'};s.money-=cost;s.shipTier=shipTier(s)+1;return {ok:true,cost};}
export function addShip(s){const cost=additionalShipCost(s);if(!tradingPort(s)||cost===null||s.money<cost)return {ok:false,error:cost===null?'선단 단계가 오르면 배를 더 늘릴 수 있어요.':'선박을 추가할 항구와 두카트를 확인하세요.'};const n=fleetCount(s);s.money-=cost;s.food=s.food*n/(n+1);s.fleetCount=n+1;return {ok:true,cost};}
export function sellPrice(portId,goodId,day){return Math.floor(price(portId,goodId,day)*0.88);}
export const tradingPort=s=>s.voyage?null:PORT_BY_ID[s.port]||null;
export function buy(s,goodId,qty){
  qty=Math.floor(qty);
  if(GOODS[goodId]?.legacy || !tradingPort(s)?.market.includes(goodId) || !Number.isFinite(qty)||qty<=0)return {ok:false,error:'구매할 수량을 확인하세요.'};
  const unit=price(s.port,goodId,s.day),total=unit*qty;
  if(usedSpace(s)+qty>capacity(s))return {ok:false,error:'화물칸이 부족해요.'};
  if(total>s.money)return {ok:false,error:'두카트가 부족해요.'};
  const c=s.cargo[goodId]||{qty:0,cost:0};
  s.cargo[goodId]={qty:c.qty+qty,cost:c.cost+total};s.money-=total;s.trades++;
  if(s.port==='lisbon'&&goodId==='wine')s.boughtLisbonWine=true;
  return {ok:true,total,qty,unit};
}
export function sell(s,goodId,qty){
  qty=Math.floor(qty);const c=s.cargo[goodId];
  if(!tradingPort(s))return {ok:false,error:'항구에 입항하면 화물을 판매할 수 있어요.'};
  if(!c || !Number.isFinite(qty)||qty<=0||qty>c.qty)return {ok:false,error:'판매할 화물이 없어요.'};
  const unit=sellPrice(s.port,goodId,s.day),total=unit*qty,cost=c.cost*qty/c.qty;
  c.qty-=qty;c.cost-=cost;s.money+=total;s.profit+=total-cost;s.trades++;
  if(!c.qty)delete s.cargo[goodId];
  if(s.port!=='lisbon'&&goodId==='wine'&&s.boughtLisbonWine)s.soldAway=true;
  return {ok:true,total,qty,unit,profit:Math.round(total-cost)};
}

class Heap{
  data=[];
  push(id,score){let i=this.data.length;this.data.push([id,score]);while(i){const p=(i-1)>>1;if(this.data[p][1]<=score)break;this.data[i]=this.data[p];i=p;}this.data[i]=[id,score];}
  pop(){const top=this.data[0],last=this.data.pop();if(this.data.length){let i=0;while(i*2+1<this.data.length){let c=i*2+1;if(c+1<this.data.length&&this.data[c+1][1]<this.data[c][1])c++;if(this.data[c][1]>=last[1])break;this.data[i]=this.data[c];i=c;}this.data[i]=last;}return top[0];}
  get size(){return this.data.length;}
}

export class Navigator{
  constructor(grid,rivers=[]){
    this.w=grid.width;this.h=grid.height;this.step=grid.step;this.top=grid.top;this.mask=Uint8Array.from(atob(grid.land),c=>c.charCodeAt(0));const coastBytes=grid.coast16?atob(grid.coast16):null;this.coast=coastBytes?Uint16Array.from({length:coastBytes.length/2},(_,i)=>coastBytes.charCodeAt(i*2)|(coastBytes.charCodeAt(i*2+1)<<8)):grid.coast?Uint8Array.from(atob(grid.coast),c=>c.charCodeAt(0)):null;
    this.rivers=rivers.map(r=>{const route=makeRoute(r.path),xs=r.path.map(p=>p[0]),ys=r.path.map(p=>p[1]);let d=0;return {...r,...route,bounds:[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)],segments:r.path.slice(1).map((b,i)=>{const a=r.path[i],offset=d;d+=route.lengths[i];return {a,b,offset,length:route.lengths[i]};})};});
  }
  coord(i){return [i%this.w*this.step-180,this.top-Math.floor(i/this.w)*this.step];}
  cell([lon,lat]){const x=((Math.round((lon+180)/this.step)%this.w)+this.w)%this.w,y=Math.round((this.top-lat)/this.step);return y<0||y>=this.h?-1:y*this.w+x;}
  isOceanLand(p){const i=this.cell(p);return i<0||!!this.mask[i];}
  isLand(p){return this.isOceanLand(p)&&!this.riverAt(p);}
  projectRiver(p,r){
    const c=Math.max(.1,Math.cos(p[1]*Math.PI/180));let best=null,bestD=Infinity;
    for(const s of r.segments){const dx=(s.b[0]-s.a[0])*c,dy=s.b[1]-s.a[1],den=dx*dx+dy*dy,t=den?Math.max(0,Math.min(1,((p[0]-s.a[0])*c*dx+(p[1]-s.a[1])*dy)/den)):0;
      const q=[s.a[0]+(s.b[0]-s.a[0])*t,s.a[1]+(s.b[1]-s.a[1])*t],d=((p[0]-q[0])*c)**2+(p[1]-q[1])**2;
      if(d<bestD){bestD=d;best={river:r,point:q,offset:s.offset+s.length*t};}
    }
    return {...best,distance:distance(p,best.point)};
  }
  riverAt(p){
    let best=null;
    for(const r of this.rivers){const margin=(r.widthNM||5)/60,dx=margin/Math.max(.1,Math.cos(p[1]*Math.PI/180)),b=r.bounds;
      if(p[0]<b[0]-dx||p[0]>b[2]+dx||p[1]<b[1]-margin||p[1]>b[3]+margin)continue;
      const q=this.projectRiver(p,r);if(q.distance<=(r.widthNM||5)&&(!best||q.distance<best.distance))best=q;
    }
    return best;
  }
  approach(port){const r=this.rivers.find(r=>r.id===port.river),p=[port.lon,port.lat];return r?this.projectRiver(p,r).point:this.isOceanLand(p)?this.coord(this.nearest(p)):p;}
  riverSection(r,from,to){
    const start=Math.min(from,to),end=Math.max(from,to),path=[positionAlong(r,start)];let offset=0;
    r.path.slice(1).forEach((p,i)=>{offset+=r.lengths[i];if(offset>start+.001&&offset<end-.001)path.push(p);});
    path.push(positionAlong(r,end));return from>to?path.reverse():path;
  }
  nearest(p){
    const center=this.cell(p);if(center<0)return -1;
    if(!this.mask[center])return center;
    let best=-1,bestDist=Infinity;
    const cx=center%this.w,cy=Math.floor(center/this.w);
    for(let r=1;r<=8;r++){
      for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
        if(Math.abs(dx)!==r&&Math.abs(dy)!==r)continue;
        const y=cy+dy,x=(cx+dx+this.w)%this.w,i=y*this.w+x;
        if(y<0||y>=this.h||this.mask[i])continue;
        const d=distance(p,this.coord(i));if(d<bestDist){bestDist=d;best=i;}
      }
      if(best>=0)return best;
    }
    return -1;
  }
  route(from,to,options={}){
    const a=this.riverAt(from),b=this.riverAt(to);
    if(a&&b&&a.river.id===b.river.id)return this.annotate({...makeRoute([from,...this.riverSection(a.river,a.offset,b.offset),to]),waterways:[a.river.id]});
    const ocean=this.routeOcean(a?a.river.path[0]:from,b?b.river.path[0]:to,options);if(!ocean)return null;
    const prefix=a?[from,...this.riverSection(a.river,a.offset,0)]:[];
    const suffix=b?[...this.riverSection(b.river,0,b.offset),to]:[];
    return this.annotate({...makeRoute([...prefix,...ocean.path,...suffix]),waterways:[...new Set([a?.river.id,b?.river.id].filter(Boolean))]});
  }
  routeOcean(from,to,{maxOffshore=Infinity}={}){
    if(this.clearOcean(from,to)&&this.withinCoast(from,to,maxOffshore))return makeRoute([from,to]);
    const start=this.nearest(from),goal=this.nearest(to);if(start<0||goal<0||this.coastAt(from)>maxOffshore||this.coastAt(to)>maxOffshore)return null;
    const size=this.w*this.h,g=new Float64Array(size);g.fill(Infinity);
    const prev=new Int32Array(size);prev.fill(-1);const closed=new Uint8Array(size),heap=new Heap();
    g[start]=0;heap.push(start,0);
    const dirs=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];
    while(heap.size){
      const id=heap.pop();if(closed[id])continue;if(id===goal)break;closed[id]=1;
      const x=id%this.w,y=Math.floor(id/this.w),p=this.coord(id);
      for(const [dx,dy]of dirs){
        const ny=y+dy,nx=(x+dx+this.w)%this.w,n=ny*this.w+nx;
        if(ny<0||ny>=this.h||this.mask[n]||closed[n]||(this.coast&&this.coast[n]>maxOffshore))continue;
        if(dx&&dy&&(this.mask[y*this.w+nx]||this.mask[ny*this.w+x]))continue;
        const q=this.coord(n),cost=g[id]+distance(p,q);
        if(cost>=g[n])continue;g[n]=cost;prev[n]=id;heap.push(n,cost+distance(q,this.coord(goal)));
      }
    }
    if(start!==goal&&prev[goal]<0)return null;
    let ids=[goal];while(ids.at(-1)!==start){ids.push(prev[ids.at(-1)]);if(ids.length>size)return null;}ids.reverse();
    let path=ids.map(i=>this.coord(i));
    // Keep safe bends and smooth straight stretches without cutting across land.
    const smooth=[path[0]];let anchor=0;
    while(anchor<path.length-1){let next=anchor+1;for(let j=anchor+2;j<Math.min(path.length,anchor+60);j++){if(!this.clearOcean(path[anchor],path[j])||!this.withinCoast(path[anchor],path[j],maxOffshore))break;next=j;}smooth.push(path[next]);anchor=next;}
    if(distance(from,smooth[0])>0.1)smooth.unshift(from);
    if(distance(to,smooth.at(-1))>0.1)smooth.push(to);
    if(smooth.length===1)smooth.push(to);
    const lengths=smooth.slice(1).map((p,i)=>distance(smooth[i],p));
    return {path:smooth,lengths,total:lengths.reduce((a,b)=>a+b,0)};
  }
  coastAt(p){const i=this.cell(p);return i<0?Infinity:this.coast?this.coast[i]:this.mask[i]?0:Infinity;}
  withinCoast(a,b,limit){return !Number.isFinite(limit)||this.checkSegment(a,b,.025,p=>this.coastAt(p)>limit);}
  annotate(route){route.sections=routeSections(this,route);return route;}
  clearOcean(a,b){return this.checkSegment(a,b,.025,p=>this.isOceanLand(p));}
  clear(a,b){return this.checkSegment(a,b,.025,p=>this.isLand(p));}
  checkSegment(a,b,step,land){let dl=b[0]-a[0];if(dl>180)dl-=360;if(dl<-180)dl+=360;const steps=Math.ceil(Math.max(Math.abs(dl),Math.abs(b[1]-a[1]))/step);for(let i=0;i<=steps;i++){const t=i/Math.max(1,steps);if(land([a[0]+dl*t,a[1]+(b[1]-a[1])*t]))return false;}return true;}
}
export function makeRoute(points){
  const path=points.filter((p,i)=>i===0||distance(p,points[i-1])>.00001).map(p=>[...p]);
  if(path.length===1)path.push([...path[0]]);
  const lengths=path.slice(1).map((p,i)=>distance(path[i],p));return {path,lengths,total:lengths.reduce((a,b)=>a+b,0)};
}
export function positionAlong(v,d){
  let rem=Math.max(0,d);
  for(let i=0;i<v.lengths.length;i++){
    if(rem<=v.lengths[i]||i===v.lengths.length-1){const t=v.lengths[i]?Math.min(rem/v.lengths[i],1):1,a=v.path[i],b=v.path[i+1];let dl=b[0]-a[0];if(dl>180)dl-=360;if(dl<-180)dl+=360;return [((a[0]+dl*t+540)%360)-180,a[1]+(b[1]-a[1])*t];}
    rem-=v.lengths[i];
  }
  return v.path.at(-1);
}
export function routeSections(nav,route){
  const sections=[];let offset=0;
  for(let i=0;i<route.lengths.length;i++){
    const n=Math.max(1,Math.ceil(route.lengths[i]/2));
    for(let j=0;j<n;j++){const end=offset+route.lengths[i]/n,mid=positionAlong(route,(offset+end)/2),river=!!nav.riverAt(mid),last=sections.at(-1);if(last&&last.river===river)last.end=end;else sections.push({start:offset,end,river});offset=end;}
  }return sections;
}
export function voyageEstimate(s,route,travelled=0){
  const v=ship(s),sections=route.sections||[{start:0,end:route.total,river:false}];
  const days=route.legacy?Math.max(0,route.total-travelled)/[360,440,520][route.legacyShipLevel??Math.min(2,s.level||0)]:sections.reduce((sum,r)=>sum+Math.max(0,r.end-Math.max(travelled,r.start))/(r.river?v.riverSpeed:v.speed),0)*(route.kind==='rescue'||route.kind==='transition'?2:1);
  return {days,food:days*(route.legacy?.9:1),seconds:days*ACTIVE_SECONDS_PER_DAY};
}
export function canDepart(s,route){
  if(!route)return {ok:false,error:'이 배로 갈 수 있는 연안 항로를 찾지 못했어요.'};
  if(usedSpace(s)>capacity(s))return {ok:false,error:'보급과 화물의 적재 공간을 먼저 정리하세요.'};
  const estimate=voyageEstimate(s,route),back=route.returnFood??0,needed=estimate.food+back+ship(s).reserve;
  if(!Number.isFinite(needed))return {ok:false,error:'선택한 해역에서 돌아올 수 있는 보급항을 찾지 못했어요.'};
  if(s.food+1e-8<needed)return {ok:false,error:`보급 ${needed.toFixed(1)}일분이 필요해요. 중간 항구를 선택하세요.`};
  return {ok:true,...estimate};
}
export function advanceVoyage(s,nav,seconds){
  const v=s.voyage;if(!v)return {miles:0,days:0};v.sections??=routeSections(nav,v);
  let budget=Math.max(0,seconds)/ACTIVE_SECONDS_PER_DAY,miles=0,days=0;const rescue=['rescue','transition'].includes(v.kind),rate=v.legacy?.9:1;
  while(budget>1e-10&&v.travelled<v.total-1e-8&&(rescue||s.food>1e-10)){
    const section=v.sections.find(r=>r.end>v.travelled+1e-8)||{end:v.total,river:false};
    const speed=(v.legacy?[360,440,520][v.legacyShipLevel??Math.min(2,s.level||0)]:section.river?ship(s).riverSpeed:ship(s).speed)/(rescue?2:1);
    const limit=(section.end-v.travelled)/speed,step=Math.min(budget,limit,rescue?Infinity:s.food/rate);
    if(step<=1e-12)break;const moved=step*speed;v.travelled=Math.min(v.total,v.travelled+moved);s.day+=step;days+=step;miles+=moved;budget-=step;
    if(!rescue){s.food=Math.max(0,s.food-step*rate);v.foodRemaining=Math.max(0,(v.foodRemaining||0)-step*rate);}
  }
  if(!rescue&&miles>0)s.explorationLockedUntilSailing=false;s.position=positionAlong(v,v.travelled);return {miles,days,arrived:v.travelled>=v.total-1e-7,depleted:!rescue&&s.food<=1e-8};
}
export function advanceManualMotion(s,nav,motion,seconds){
  for(const [a,b]of motion.legs){if(!nav.clear(a,b))return {miles:0,days:0,error:'해안에 닿았어요. 바다 쪽으로 조종하세요.'};if(!nav.withinCoast(a,b,ship(s).offshore))return {miles:0,days:0,error:`이 배는 해안에서 ${ship(s).offshore}해리 이내로 항해할 수 있어요.`};}
  let budget=seconds,miles=0,days=0,finished=true;const legs=[];
  for(const [a,b]of motion.legs){
    if(budget<=1e-10){finished=false;break;}
    const route=nav.annotate(makeRoute([a,b]));if(route.total<1e-10)continue;
    const temp={...s,position:[...a],voyage:{...route,travelled:0,foodRemaining:s.food}};
    const result=advanceVoyage(temp,nav,budget);s.food=temp.food;s.day=temp.day;s.position=temp.position;if(result.miles>0)legs.push([[...a],[...temp.position]]);miles+=result.miles;days+=result.days;budget-=result.days*ACTIVE_SECONDS_PER_DAY;
    if(!result.arrived){finished=false;break;}
  }
  if(miles>0)s.explorationLockedUntilSailing=false;if(finished)s.position=[...motion.position];return {miles,days,legs,depleted:s.food<=1e-8,finished};
}
export function nearestHarbor(s,nav,onlyVisited=false){
  let best=null;const candidates=PORTS.filter(p=>!onlyVisited||s.visited.includes(p.id)).map(p=>({p,min:distance(s.position,[p.lon,p.lat])})).sort((a,b)=>a.min-b.min);
  for(const {p,min}of candidates){if(best&&min>best.route.total)break;const route=nav.route(s.position,[p.lon,p.lat]);if(route&&(!best||route.total<best.route.total))best={port:p,route};}return best;
}
export function beginRescue(s,nav,transition=false){
 const previous=s.voyage,replanning=!!s.rescueReplanPending&&['rescue','transition'].includes(previous?.kind);
 if(s.port||previous?.kind&&!replanning)return {ok:false,error:'항구 또는 구조 중이에요.'};
 if(!transition&&!replanning&&s.food>1e-8)return {ok:false,error:'보급 소진 시 자동 구조합니다.'};
 let found=nearestHarbor(s,nav,true),emergency=false;
 if(!found){const p=PORTS.find(p=>s.visited.includes(p.id));if(!p)return {ok:false,error:'방문한 보급항을 확인하고 있어요. 기록은 유지됩니다.'};const d=distance(s.position,[p.lon,p.lat]);found={port:p,route:{path:[[...s.position],[p.lon,p.lat]],lengths:[d],total:d,travelled:d}};emergency=true;}
 const cost=replanning?(previous.paidCost||0):transition?0:Math.min(s.money,Math.min(1000,Math.max(150,Math.ceil(found.route.total*.5))));
 if(!replanning)s.money-=cost;s.port=null;s.controlMode='auto';s.explorationLockedUntilSailing=true;
 s.voyage={...found.route,target:found.port.id,travelled:emergency?found.route.total:0,foodRemaining:0,kind:transition||previous?.kind==='transition'?'transition':'rescue',paidCost:cost,rescueId:previous?.rescueId||globalThis.crypto?.randomUUID?.()||'rescue-'+Date.now(),emergency};
 delete s.transitionPending;delete s.rescueReplanPending;return {ok:true,cost,port:found.port,emergency,arrived:emergency||found.route.total<=1e-8};
}
export function recordArrival(s,id,voyage){
  const p=PORT_BY_ID[id];if(!p)return;
  if(voyage?.origin&&PORT_BY_ID[voyage.origin]&&voyage.origin!==id&&!voyage.kind)s.recentRoutes=[{from:voyage.origin,to:id,nm:voyage.total},...(s.recentRoutes||[])].slice(0,5);
  s.recentPorts=[id,...(s.recentPorts||[]).filter(p=>p!==id)].slice(0,8);settleSupply(s);
  if(['rescue','transition'].includes(voyage?.kind)){s.food=Math.max(2,s.food);s.explorationLockedUntilSailing=true;}
}


// One direct helm step in nautical miles. Diagonals retain the same speed.
export function helmStep(from,east,north,miles){
  if(!Number.isFinite(miles)||miles<=0||(!east&&!north))return [...from];
  const rad=Math.PI/180,bearing=Math.atan2(east,north),angular=miles/3440.065;
  const lat=from[1]*rad,lon=from[0]*rad;
  const nextLat=Math.asin(Math.sin(lat)*Math.cos(angular)+Math.cos(lat)*Math.sin(angular)*Math.cos(bearing));
  const nextLon=lon+Math.atan2(Math.sin(bearing)*Math.sin(angular)*Math.cos(lat),Math.cos(angular)-Math.sin(lat)*Math.sin(nextLat));
  return [((nextLon/rad+540)%360)-180,nextLat/rad];
}
export function helmToward(from,target,miles){
  const remaining=distance(from,target);if(remaining<=miles)return [...target];
  const rad=Math.PI/180,lat=from[1]*rad,toLat=target[1]*rad,delta=(target[0]-from[0])*rad;
  const east=Math.sin(delta)*Math.cos(toLat),north=Math.cos(lat)*Math.sin(toLat)-Math.sin(lat)*Math.cos(toLat)*Math.cos(delta);
  return helmStep(from,east,north,miles);
}
