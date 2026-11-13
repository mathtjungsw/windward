import {HISTORICAL_BY_ID,historicalProgress,shipyardRecord,shipyardTrade} from './historical-ships.js?v=2026.11.13-stories-harbors-tax';
import {COARSE_CONNECTIONS} from './chart-waterways.js?v=2026.11.13-stories-harbors-tax';
import {regionalFactor} from './regional-economy.js?v=2026.11.13-stories-harbors-tax';
import {recordTrade} from './rank-progress.js?v=2026.11.13-stories-harbors-tax';
import { PORTS, PORT_BY_ID, GOODS, LEGACY_PORTS } from './data.js?v=2026.11.13-stories-harbors-tax';
import {ship,shipTier,fleetCount,fleetShips,syncFleet,fleetCapacity,upgradeCost,additionalShipCost,supplySpace,supplyUnits,fleetMaxHP,shipCostBasis,fleetLimit,vesselSpec,vesselSeaSpeed,ACTIVE_SECONDS_PER_DAY,SHIPS,STORED_SHIP_LIMIT,storedShips,highestOwnedTier} from './ship-rules.js?v=2026.11.13-stories-harbors-tax';
import {parseState} from './save-game.js?v=2026.11.13-stories-harbors-tax';
import {gunWeight} from './cannons.js?v=2026.11.13-stories-harbors-tax';
import {activeOfficer,gearOnShip,recordContractArrival,supplyDiscount,couponAmount,consumeCoupon,addOfficerExperience,appendItemRecord} from './rumor-progress.js?v=2026.11.13-stories-harbors-tax';
import {ITEM_BY_ID} from './rumor-catalog.js?v=2026.11.13-stories-harbors-tax';
import {pendingCanal,refundCanalTolls} from './canal-reservations.js?v=2026.11.13-stories-harbors-tax';
import {charterCargo} from './guild-contracts.js?v=2026.11.13-stories-harbors-tax';
export {ship,supplySpace,ACTIVE_SECONDS_PER_DAY} from './ship-rules.js?v=2026.11.13-stories-harbors-tax';

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
  raftStart:{id:'raft-start-2026-11-06',fromTier:0,fromFleetCount:1,refund:0},
  version:4,legacyHarbor:false,shipTier:0,fleetCount:1,fleetShips:[{id:"vessel-0",tier:0}],flagshipId:"vessel-0",discoveries:{},rumors:[],supplyCreditValue:0,worldCatalogVersion:'2026.11.09-world-78',explorationMaskVersion:1,world:'real',knownPorts:[...INITIAL_PORTS],explored:'',money:2400,food:10,day:0,cargo:{},visited:['lisbon'],port:'lisbon',
  position:[-9.14,38.72],voyage:null,controlMode:'auto',profit:0,trades:0,soldAway:false,level:0,speed:1,
  favorites:[],recentPorts:['lisbon'],recentRoutes:[],missions:[],quiz:[],boughtLisbonWine:false,useCanals:true,
  storyBook:{version:1,entries:{},views:{},trades:{},manual:false,tracked:'first-route'},
  log:[{day:0,text:'리스본에서 뗏목 항해를 시작합니다. 보급과 화물 공간을 함께 확인하세요.',type:'discovery'}]
};}
export const parseSavedGame=raw=>parseState(raw,initialState);
export function loadState(storage){try{return parseSavedGame(storage.getItem(SAVE_KEY));}catch{return initialState();}}
export function settleSupply(s){const extra=Math.max(0,s.food-ship(s).supply);s.food-=extra;s.supplyCreditValue=(s.supplyCreditValue||0)+extra*fleetCount(s)*ship(s).supplyPrice;delete s.transitionPending;}
export const capacity=fleetCapacity;
export const usedCargo=s=>Object.values(s.cargo).reduce((n,c)=>n+c.qty,0);
export const usedSpace=s=>usedCargo(s)+supplySpace(s)+gunWeight(s)+charterCargo(s)+Object.values(s.battleReserve?JSON.parse(s.battleReserve.cargoJSON||'{}'):{}).reduce((n,c)=>n+c.qty,0);
export const dailySpeed=s=>ship(s).speed;
export function price(portId,goodId,day=0){
  const p=PORT_BY_ID[portId],g=GOODS[goodId];if(!p||!g)throw Error('교역품을 확인하세요.');
  if(goodId==='spice'){
    const old=LEGACY_PORTS.find(q=>q.id===portId),source=LEGACY_PORTS.filter(q=>q.specialty==='spice');
    const nearest=Math.min(...source.map(q=>distance([p.lon,p.lat],[q.lon,q.lat])));
    const factor=old?(old.specialty==='spice'?.65:1.08+Math.min(nearest/3800,1.25)):1.12;
    return Math.round(110*factor*(1+.045*Math.sin(Math.floor(day/7)*1.7+Math.max(0,LEGACY_PORTS.indexOf(old))*2+3)));
  }
  const factor=regionalFactor(p,goodId,g);
  return Math.round(g.base*factor*(1+.045*Math.sin(Math.floor(day/7)*1.7+(p.pricePhase??PORTS.indexOf(p))*2+Object.keys(GOODS).indexOf(goodId))));
}
function supplyValue(s,amount){return amount*fleetCount(s)*ship(s).supplyPrice*(1-supplyDiscount(s));}
const supplyNetCost=(s,amount)=>Math.max(0,Math.ceil(supplyValue(s,amount)-(s.supplyCreditValue||0)-1e-9));
export function supplyCost(s,amount){
 const price=supplyNetCost(s,amount);
 return price-couponAmount(s,'supply',price);
}
export const supplyRoom=s=>2*(capacity(s)-usedSpace(s)+supplySpace(s))/supplyUnits(s)-s.food;
export function resupply(s,requested){
 if(!tradingPort(s))return {ok:false,error:'항구에서 보급할 수 있어요.'};
 const amount=Math.max(0,Math.min(Number(requested)||0,ship(s).supply-s.food,supplyRoom(s)));
 const base=supplyNetCost(s,amount),cost=supplyCost(s,amount);if(amount<1e-8)return {ok:false,error:'보급 한도 또는 적재 공간을 확인하세요.'};if(cost>s.money)return {ok:false,error:'보급할 두카트가 부족해요.'};
 const credit=Math.min(supplyValue(s,amount),s.supplyCreditValue||0);s.supplyCreditValue=Math.max(0,(s.supplyCreditValue||0)-credit);s.food+=amount;s.money-=cost;if(cost<base)consumeCoupon(s,'supply');return {ok:true,amount,cost};
}
export function autoResupply(s){
 if(!s.autoSupply||!tradingPort(s)||s.battleId||s.npcBattle||s.raidId)return null;
 const limit=Math.max(0,Math.min(ship(s).supply-s.food,supplyRoom(s)));
 let amount=limit;
 if(supplyCost(s,limit)>s.money){
   let low=0,high=limit;
   for(let i=0;i<40;i++){
     const middle=(low+high)/2;
     if(supplyCost(s,middle)<=s.money)low=middle;
     else high=middle;
   }
   amount=Math.floor(low*10+1e-9)/10;
 }
 return amount>=.05?resupply(s,amount):null;
}
export function unloadSupply(s,amount){if(!tradingPort(s))return false;amount=Math.min(Math.max(0,Number(amount)||0),s.food);s.food-=amount;s.supplyCreditValue=(s.supplyCreditValue||0)+supplyValue(s,amount);return amount>0;}
export function maxBuyQuantity(s,id,targetFood=s.food){
 if(!tradingPort(s)?.market.includes(id)||GOODS[id]?.legacy)return 0;
 const food=Math.max(s.food,Math.min(ship(s).supply,targetFood)),room=capacity(s)-usedCargo(s)-supplySpace({...s,food}),cash=s.money-supplyCost(s,Math.max(0,food-s.food));
 return Math.max(0,Math.min(room,Math.floor(cash/price(s.port,id,s.day))));
}
export function upgradeShip(s,id=null){
 const rows=fleetShips(s).map(p=>({...p})),target=id?rows.find(p=>p.id===id):rows.find(p=>p.id===s.flagshipId)||rows[0],all=!id&&rows.every(p=>p.tier===target.tier),cost=all?upgradeCost(s):SHIPS[target?.tier]?.upgrade;
 if(!tradingPort(s)||cost==null||s.money<cost)return {ok:false,error:cost==null?'최대 개량 상태예요.':'개량할 항구와 두카트를 확인하세요.'};
 const upgrading=all?rows:[target];
 s.money-=cost;
 upgrading.forEach((v,i)=>{
   v.costBasis=shipCostBasis(v)+Math.floor(cost*(i+1)/upgrading.length)-Math.floor(cost*i/upgrading.length);
   v.tier++;
 });
 syncFleet(s,rows);
 return {ok:true,cost};
}
export function addShip(s){const cost=additionalShipCost(s);if(!tradingPort(s)||cost===null||s.money<cost)return {ok:false,error:cost===null?'선단에 빈자리가 필요해요. 항구에 배를 맡기거나 선단 한도를 늘리세요.':'선박을 추가할 항구와 두카트를 확인하세요.'};const rows=fleetShips(s).map(p=>({...p})),n=rows.length;s.money-=cost;s.food=s.food*n/(n+1);rows.push({id:'vessel-'+crypto.randomUUID(),tier:shipTier(s),costBasis:cost});syncFleet(s,rows);return {ok:true,cost};}
export function historicalQuote(s,id){
 const row=HISTORICAL_BY_ID[id];if(!row)throw Error('선종을 확인하세요.');
 const fleet=fleetShips(s),tier=row.stage-1,progress=historicalProgress(s,id);
 const cost=Math.ceil(SHIPS[tier].cost*row.price),stage=highestOwnedTier(s)+1,slots=fleetLimit(s)-fleet.length;
 const candidate={id:'preview-ship',tier,kind:id,costBasis:cost},next=slots>0?{...s}:null;
 if(next){syncFleet(next,[...fleet,candidate]);next.food=Math.min(ship(next).supply,s.food*fleet.length/(fleet.length+1));}
 const ready=!!next&&s.port===row.port&&!s.voyage&&!s.depotDock&&!s.shoreTrip&&!s.seaJob&&!s.raidId&&!s.npcBattle&&!s.battleId&&!s.explorationLockedUntilSailing&&stage>=row.stage&&progress.earned&&s.money>=cost&&usedSpace(next)<=capacity(next);
 return {row,stage,cost,ready,progress,ship:vesselSpec(candidate),current:ship(s),future:next?ship(next):null,capacity:next?capacity(next):null,slots};
}
export function buildHistoricalShip(s,id,expectedCost){
 const q=historicalQuote(s,id);
 if(!q.ready||q.cost!==expectedCost)return {ok:false,error:'건조 항구, 해금 조건, 빈 선단 자리와 두카트를 확인하세요.'};
 const rows=fleetShips(s),oldMax=fleetMaxHP(s),candidate={id:'vessel-'+crypto.randomUUID(),tier:q.row.stage-1,kind:id,costBasis:q.cost};
 s.money-=q.cost;s.food=Math.min(q.future.supply,s.food*rows.length/(rows.length+1));syncFleet(s,[...rows,candidate]);
 if(Number.isFinite(s.hullHP))s.hullHP=Math.min(fleetMaxHP(s),s.hullHP+fleetMaxHP(s)-oldMax);
 const y=shipyardRecord(s);if(!y.unlocked.includes(id))y.unlocked.push(id);
 return {ok:true,cost:q.cost};
}
export const shipResaleValue=vessel=>Math.floor(shipCostBasis(vessel)*.6);
function quoteDetachedShip(s,id){
 const fleet=fleetShips(s),vessel=fleet.find(v=>v.id===id);
 if(!tradingPort(s)||s.shoreTrip||s.seaJob||s.raidId||s.npcBattle||s.battleId)throw Error('활동을 마치고 조선 시설이 있는 항구에 정박하세요.');
 if(!vessel)throw Error('현재 선단에 있는 배를 선택하세요.');
 if(fleet.length<2)throw Error('마지막 배는 항해 선단에 남겨야 해요. 최소 한 척이 필요해요.');
 const rows=fleet.filter(v=>v.id!==id),next={...s,cannons:s.cannons?.map(g=>g.shipId===id?{...g,shipId:null}:g)};
 if(s.rumorProgress){
   next.rumorProgress={...s.rumorProgress,shipGear:{...s.rumorProgress.shipGear}};
   delete next.rumorProgress.shipGear[id];
 }
 const flagship=s.flagshipId===id?rows.reduce((best,v)=>v.tier>best.tier?v:best).id:s.flagshipId;
 syncFleet(next,rows,flagship);
 next.food=0;
 const room=capacity(next)-usedSpace(next);
 if(room<0)throw Error('남는 배에 화물이 모두 실리지 않아요. 화물을 먼저 정리하세요.');
 const totalFood=s.food*fleet.length;
 next.food=Math.min(totalFood/rows.length,ship(next).supply,2*room/supplyUnits(next));
 const credit=Math.max(0,totalFood-next.food*rows.length)*ship(next).supplyPrice;
 next.supplyCreditValue=(s.supplyCreditValue||0)+credit;
 const previousMax=fleetMaxHP(s),remainingMax=fleetMaxHP(next);
 const hp=Math.max(0,Math.min(previousMax,Math.round(s.hullHP??previousMax)));
 next.hullHP=Math.round(hp*remainingMax/previousMax);
 const health=(hp-next.hullHP)/(previousMax-remainingMax);
 return {vessel,next,health,credit,gear:!!gearOnShip(s,id),guns:(s.cannons||[]).filter(g=>g.shipId===id).length};
}
export function quoteShipSale(s,id){
 const quote=quoteDetachedShip(s,id);
 return {...quote,price:shipResaleValue(quote.vessel)};
}
export function sellShip(s,id,expectedPrice){
 const quote=quoteShipSale(s,id);
 if(expectedPrice!==quote.price)throw Error('배의 상태가 바뀌었어요. 매각 견적을 다시 확인하세요.');
 Object.assign(s,quote.next,{money:s.money+quote.price});
 return {ok:true,price:quote.price,message:vesselSpec(quote.vessel).name+' 매각 · '+quote.price.toLocaleString('ko-KR')+' D'};
}
export function quoteShipStorage(s,id){
 const port=tradingPort(s);
 if(!port?.active||s.explorationLockedUntilSailing)throw Error('정상 입항한 항구에서 배를 맡길 수 있어요.');
 const saved=storedShips(s);
 if(saved.length>=STORED_SHIP_LIMIT)throw Error('맡겨 둔 배는 최대 '+STORED_SHIP_LIMIT+'척이에요.');
 const quote=quoteDetachedShip(s,id);
 quote.next.storedShips=[...saved,{...quote.vessel,port:port.id,health:quote.health}];
 return quote;
}
export function storeShip(s,id,expectedPort){
 if(s.port!==expectedPort)throw Error('정박한 항구가 바뀌었어요. 선단을 다시 확인하세요.');
 const quote=quoteShipStorage(s,id);
 Object.assign(s,quote.next);
 return {ok:true,message:vesselSpec(quote.vessel).name+'을(를) '+tradingPort(s).name+'에 맡겼어요.'};
}
export function quoteShipRecall(s,id){
 const stored=storedShips(s),entry=stored.find(v=>v.id===id),port=tradingPort(s);
 if(!entry)throw Error('맡겨 둔 배를 찾을 수 없어요.');
 if(port?.id!==entry.port||s.shoreTrip||s.seaJob||s.raidId||s.npcBattle||s.battleId||s.explorationLockedUntilSailing)
   throw Error((PORT_BY_ID[entry.port]?.name||'맡긴 항구')+'에 정상 입항한 뒤 배를 찾을 수 있어요.');
 const fleet=fleetShips(s);
 if(fleet.length>=fleetLimit(s))throw Error('항해 선단에 빈자리가 필요해요. 배 한 척을 먼저 맡겨 주세요.');
 const {port:_port,health,...vessel}=entry;
 const next={...s,storedShips:stored.filter(v=>v.id!==id)};
 syncFleet(next,[...fleet,vessel]);
 const totalFood=s.food*fleet.length;
 next.food=Math.min(totalFood/next.fleetCount,ship(next).supply);
 if(usedSpace(next)>capacity(next))throw Error('보급과 화물 공간을 확인한 뒤 다시 시도하세요.');
 const oldMax=fleetMaxHP(s),newMax=fleetMaxHP(next);
 next.hullHP=Math.max(0,Math.min(oldMax,Math.round(s.hullHP??oldMax)))+Math.round(health*(newMax-oldMax));
 const credit=Math.max(0,totalFood-next.food*next.fleetCount)*ship(next).supplyPrice;
 next.supplyCreditValue=(s.supplyCreditValue||0)+credit;
 return {vessel,next,credit};
}
export function recallShip(s,id,expectedPort){
 if(s.port!==expectedPort)throw Error('정박한 항구가 바뀌었어요. 보관 선박을 다시 확인하세요.');
 const quote=quoteShipRecall(s,id);
 Object.assign(s,quote.next);
 return {ok:true,message:vesselSpec(quote.vessel).name+'이(가) 항해 선단에 합류했어요.'};
}
export function sellPrice(portId,goodId,day){return Math.floor(price(portId,goodId,day)*0.88);}
export const tradingPort=s=>s.voyage||PORT_BY_ID[s.port]?.depot?null:PORT_BY_ID[s.port]||null;
export function buy(s,goodId,qty){
  qty=Math.floor(qty);
  if(GOODS[goodId]?.legacy || !tradingPort(s)?.market.includes(goodId) || !Number.isFinite(qty)||qty<=0)return {ok:false,error:'구매할 수량을 확인하세요.'};
  const unit=price(s.port,goodId,s.day),total=unit*qty;
  if(usedSpace(s)+qty>capacity(s))return {ok:false,error:'화물칸이 부족해요.'};
  if(total>s.money)return {ok:false,error:'두카트가 부족해요.'};
  const c=s.cargo[goodId]||{qty:0,cost:0};
  s.cargo[goodId]={qty:c.qty+qty,cost:c.cost+total};s.money-=total;s.trades++;
  if(s.port==='lisbon'&&goodId==='wine')s.boughtLisbonWine=true;
  if(!s.explorationLockedUntilSailing)shipyardTrade(s,goodId);recordTrade(s,goodId,'buy');return {ok:true,total,qty,unit};
}
export function sell(s,goodId,qty){
  qty=Math.floor(qty);const c=s.cargo[goodId];
  if(!tradingPort(s))return {ok:false,error:'항구에 입항하면 화물을 판매할 수 있어요.'};
  if(!c || !Number.isFinite(qty)||qty<=0||qty>c.qty)return {ok:false,error:'판매할 화물이 없어요.'};
  const unit=sellPrice(s.port,goodId,s.day),total=unit*qty,cost=c.cost*qty/c.qty;
  c.qty-=qty;c.cost-=cost;s.money+=total;s.profit+=total-cost;s.trades++;
  if(!c.qty)delete s.cargo[goodId];
  if(s.port!=='lisbon'&&goodId==='wine'&&s.boughtLisbonWine)s.soldAway=true;
  if(!s.explorationLockedUntilSailing)shipyardTrade(s,goodId);recordTrade(s,goodId,'sell',total-cost);return {ok:true,total,qty,unit,profit:Math.round(total-cost)};
}

class Heap{
  data=[];
  push(id,score){let i=this.data.length;this.data.push([id,score]);while(i){const p=(i-1)>>1;if(this.data[p][1]<=score)break;this.data[i]=this.data[p];i=p;}this.data[i]=[id,score];}
  pop(){const top=this.data[0],last=this.data.pop();if(this.data.length){let i=0;while(i*2+1<this.data.length){let c=i*2+1;if(c+1<this.data.length&&this.data[c+1][1]<this.data[c][1])c++;if(this.data[c][1]>=last[1])break;this.data[i]=this.data[c];i=c;}this.data[i]=last;}return top[0];}
  get size(){return this.data.length;}
}

export class Navigator{
  constructor(grid,rivers=[],detail=null){
    this.detail=detail;this.berths=new Map();this.checkedEdges=new Map();this.connections=new Map();this.canalAnchors=new Map();
    this.w=grid.width;this.h=grid.height;this.step=grid.step;this.top=grid.top;this.mask=Uint8Array.from(atob(grid.land),c=>c.charCodeAt(0));const coastBytes=grid.coast16?atob(grid.coast16):null;this.coast=coastBytes?Uint16Array.from({length:coastBytes.length/2},(_,i)=>coastBytes.charCodeAt(i*2)|(coastBytes.charCodeAt(i*2+1)<<8)):grid.coast?Uint8Array.from(atob(grid.coast),c=>c.charCodeAt(0)):null;
    this.rivers=rivers.map(r=>{const route=makeRoute(r.path),xs=r.path.map(p=>p[0]),ys=r.path.map(p=>p[1]);let d=0;return {...r,...route,bounds:[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)],segments:r.path.slice(1).map((b,i)=>{const a=r.path[i],offset=d;d+=route.lengths[i];return {a,b,offset,length:route.lengths[i]};})};});
    if(detail){
      this.checkedWater=new Uint8Array(this.mask.length);
      for(const {path} of COARSE_CONNECTIONS){
        const start=this.cell(path[0]),end=this.cell(path.at(-1));
        if(!this.gridWater(start)||!this.gridWater(end)||path.some((p,i)=>i&&!detail.clear(path[i-1],p)))continue;
        const total=makeRoute(path).total;
        for(const [a,b,course] of [[start,end,path],[end,start,path.slice().reverse()]]){
          if(!this.connections.has(a))this.connections.set(a,[]);
          this.connections.get(a).push({end:b,path:course,total});
        }
      }
    }
  }
  coord(i){return [i%this.w*this.step-180,this.top-Math.floor(i/this.w)*this.step];}
  cell([lon,lat]){const x=((Math.round((lon+180)/this.step)%this.w)+this.w)%this.w,y=Math.round((this.top-lat)/this.step);return y<0||y>=this.h?-1:y*this.w+x;}
  isOceanLand(p){if(this.detail)return this.detail.isLand(p);const i=this.cell(p);return i<0||!!this.mask[i];}
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
  approach(port){
    const r=this.rivers.find(r=>r.id===port.river),p=[port.lon,port.lat];
    if(!this.detail)return r?this.projectRiver(p,r).point:this.isOceanLand(p)?this.coord(this.nearest(p)):p;
    if(this.berths.has(port.id))return this.berths.get(port.id);
    const berth=r?this.projectRiver(p,r).point:this.berthNear(p);
    if(berth)this.berths.set(port.id,berth);
    return berth;
  }
  berthNear(p){
    const first=this.waterNear(p);
    if(!first||this.anchor(first,Infinity))return first;
    const width=Math.max(.2,Math.cos(p[1]*Math.PI/180));
    const candidates=this.anchorCandidates(p,Infinity);
    for(let radius=.025;radius<=1.25;radius+=.025){
      for(let k=0;k<24;k++){
        const angle=k*Math.PI/12,lon=p[0]+Math.cos(angle)*radius/width;
        const q=[((lon+540)%360)-180,p[1]+Math.sin(angle)*radius];
        if(this.isOceanLand(q))continue;
        if(candidates.some(c=>distance(c.point,q)<85&&this.clearOcean(q,c.point)))return q;
      }
    }
    return first;
  }
  waterNear(p){
    if(!this.isOceanLand(p))return [...p];
    const width=Math.max(.2,Math.cos(p[1]*Math.PI/180));
    for(let radius=.005;radius<=1.5;radius+=.005){
      for(let k=0;k<24;k++){
        const angle=k*Math.PI/12,lon=p[0]+Math.cos(angle)*radius/width;
        const q=[((lon+540)%360)-180,p[1]+Math.sin(angle)*radius];
        if(!this.isOceanLand(q))return q;
      }
    }
    const nearest=this.nearest(p);
    return nearest>=0?this.coord(nearest):null;
  }
  gridWater(i){
    if(i<0||i>=this.mask.length||this.mask[i])return false;
    if(!this.detail)return true;
    return (this.checkedWater[i]|| (this.checkedWater[i]=this.detail.isLand(this.coord(i))?2:1))===1;
  }
  gridEdge(a,b){
    if(!this.detail)return true;
    const lo=Math.min(a,b),hi=Math.max(a,b),key=lo*this.mask.length+hi;
    if(this.checkedEdges.has(key))return this.checkedEdges.get(key);
    const clear=this.detail.clear(this.coord(a),this.coord(b));
    if(this.checkedEdges.size>=100000)this.checkedEdges.clear();
    this.checkedEdges.set(key,clear);
    return clear;
  }
  anchorCandidates(p,maxOffshore){
    const center=this.cell(p);
    if(center<0)return [];
    const x=center%this.w,y=Math.floor(center/this.w),candidates=[];
    for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){
      const yy=y+dy,id=yy*this.w+(x+dx+this.w)%this.w;
      if(yy<0||yy>=this.h||!this.gridWater(id)||(this.coast&&this.coast[id]>maxOffshore+25))continue;
      const point=this.coord(id);
      candidates.push({id,point,d:distance(p,point)});
    }
    return candidates.sort((a,b)=>a.d-b.d);
  }
  anchor(p,maxOffshore){
    if(!this.detail)return {id:this.nearest(p),path:[p]};
    if(this.isOceanLand(p))return null;
    const candidates=this.anchorCandidates(p,maxOffshore);
    if(!candidates.length)return null;
    const direct=candidates.find(c=>this.clearOcean(p,c.point)&&this.withinCoast(p,c.point,maxOffshore));
    if(direct)return {id:direct.id,path:[p,direct.point]};
    // Narrow harbors can need several small turns to reach the world grid.
    const step=.05,range=30,cols=range*2+1,count=cols*cols,root=range*cols+range;
    const points=Array.from({length:count},(_,i)=>[p[0]+(i%cols-range)*step,p[1]+(Math.floor(i/cols)-range)*step]);
    const checked=new Uint8Array(count),prev=new Int32Array(count),queue=[root];
    prev.fill(-1);checked[root]=1;
    for(let head=0;head<queue.length;head++){
      const i=queue[head],point=points[i],cx=i%cols,cy=Math.floor(i/cols);
      const dock=candidates.find(c=>Math.abs(((c.point[0]-point[0]+540)%360)-180)<=.06&&Math.abs(c.point[1]-point[1])<=.06&&
        this.clearOcean(point,c.point)&&this.withinCoast(point,c.point,maxOffshore));
      if(dock){
        const path=[dock.point];
        for(let at=i;at>=0;at=prev[at])path.push([((points[at][0]+540)%360)-180,points[at][1]]);
        return {id:dock.id,path:path.reverse()};
      }
      for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]]){
        const xx=cx+dx,yy=cy+dy,n=yy*cols+xx;
        if(xx<0||xx>=cols||yy<0||yy>=cols||checked[n])continue;
        if(this.isOceanLand(points[n])){checked[n]=1;continue;}
        if(!this.clearOcean(point,points[n])||!this.withinCoast(point,points[n],maxOffshore))continue;
        checked[n]=1;prev[n]=i;queue.push(n);
      }
    }
    return null;
  }
  riverSection(r,from,to){
    const start=Math.min(from,to),end=Math.max(from,to),path=[positionAlong(r,start)];let offset=0;
    r.path.slice(1).forEach((p,i)=>{offset+=r.lengths[i];if(offset>start+.001&&offset<end-.001)path.push(p);});
    path.push(positionAlong(r,end));return from>to?path.reverse():path;
  }
  nearest(p){
    const center=this.cell(p);if(center<0)return -1;
    if(this.gridWater(center))return center;
    let best=-1,bestDist=Infinity;
    const cx=center%this.w,cy=Math.floor(center/this.w);
    for(let r=1;r<=8;r++){
      for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
        if(Math.abs(dx)!==r&&Math.abs(dy)!==r)continue;
        const y=cy+dy,x=(cx+dx+this.w)%this.w,i=y*this.w+x;
        if(y<0||y>=this.h||!this.gridWater(i))continue;
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
    const offset=prefix.length?makeRoute(prefix).total:0;
    const passages=ocean.passages?.map(p=>({...p,start:p.start+offset,end:p.end+offset}));
    return this.annotate({...makeRoute([...prefix,...ocean.path,...suffix]),...(passages?.length?{passages}:{}),waterways:[...new Set([a?.river.id,b?.river.id].filter(Boolean))]});
  }
  routeOcean(from,to,{maxOffshore=Infinity,maxDistance=Infinity,canals=[]}={}){
    if(distance(from,to)>maxDistance)return null;
    if(this.clearOcean(from,to)&&this.withinCoast(from,to,maxOffshore))return makeRoute([from,to]);
    const enter=this.anchor(from,maxOffshore),exit=this.anchor(to,maxOffshore);
    const start=enter?.id??-1,goal=exit?.id??-1;
    if(start<0||goal<0||!this.withinCoast(from,from,maxOffshore)||!this.withinCoast(to,to,maxOffshore))return null;
    const size=this.w*this.h,g=new Float64Array(size);g.fill(Infinity);
    const prev=new Int32Array(size);prev.fill(-1);const closed=new Uint8Array(size),heap=new Heap(),selectedBridges=new Map(),canalEdges=new Map();
    for(const canal of canals){
      const first=canal.path[0],last=canal.path.at(-1),key=canal.id+':'+maxOffshore;
      if(!this.canalAnchors.has(key))this.canalAnchors.set(key,[this.anchor(first,maxOffshore),this.anchor(last,maxOffshore)]);
      const [a,b]=this.canalAnchors.get(key);
      if(!a||!b||a.id===b.id)continue;
      for(const [start,end,channel] of [[a,b,canal.path],[b,a,canal.path.slice().reverse()]]){
        const path=[...start.path.slice().reverse(),...channel.slice(1),...end.path.slice(1)];
        const edges=canalEdges.get(start.id)||[];
        const entry=start.id===enter.id&&distance(from,channel[0])<.00001?0:makeRoute(start.path).total;
        const leave=end.id===exit.id&&distance(to,channel.at(-1))<.00001?0:makeRoute(end.path).total;
        edges.push({end:end.id,path,channel,canal:canal.id,total:entry+makeRoute(channel).total+leave});
        canalEdges.set(start.id,edges);
      }
    }
    g[start]=0;heap.push(start,0);
    const goalPoint=this.coord(goal),heuristics=new Float64Array(size),edgeCosts=new Map();
    const relax=(from,to,cost,bridge=null)=>{
      if(cost>=g[to])return;
      const estimate=cost+(heuristics[to]|| (heuristics[to]=distance(this.coord(to),goalPoint)));
      if(estimate>maxDistance+1)return;
      g[to]=cost;prev[to]=from;heap.push(to,estimate);
      if(bridge)selectedBridges.set(to,bridge);else selectedBridges.delete(to);
    };
    const dirs=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];
    while(heap.size){
      const id=heap.pop();if(closed[id])continue;if(id===goal)break;closed[id]=1;
      const x=id%this.w,y=Math.floor(id/this.w),p=this.coord(id);
      for(const [dx,dy]of dirs){
        const ny=y+dy,nx=(x+dx+this.w)%this.w,n=ny*this.w+nx;
        if(ny<0||ny>=this.h||closed[n]||(this.coast&&this.coast[n]>maxOffshore+(this.detail?25:0))||!this.gridWater(n))continue;
        if(this.detail&&(!this.gridEdge(id,n)||Number.isFinite(maxOffshore)&&!this.withinCoast(this.coord(n),this.coord(n),maxOffshore)))continue;
        if(!this.detail&&dx&&dy&&(this.mask[y*this.w+nx]||this.mask[ny*this.w+x]))continue;
        const costKey=y*9+(dy+1)*3+Math.abs(dx);
        let stepCost=edgeCosts.get(costKey);
        if(stepCost===undefined){stepCost=distance(p,this.coord(n));edgeCosts.set(costKey,stepCost);}
        relax(id,n,g[id]+stepCost);
      }
      for(const edge of this.connections.get(id)||[]){
        if(closed[edge.end]||edge.path.some((p,i)=>i&&!this.withinCoast(edge.path[i-1],p,maxOffshore)))continue;
        relax(id,edge.end,g[id]+edge.total,edge);
      }
      for(const edge of canalEdges.get(id)||[])if(!closed[edge.end])relax(id,edge.end,g[id]+edge.total,edge);
    }
    if(start!==goal&&prev[goal]<0)return null;
    let ids=[goal];while(ids.at(-1)!==start){ids.push(prev[ids.at(-1)]);if(ids.length>size)return null;}ids.reverse();
    const path=this.detail?enter.path.slice():[this.coord(ids[0])],channels=new Map();
    for(const [index,id] of ids.entries()){
      if(!index)continue;
      const bridge=selectedBridges.get(id);
      if(!bridge){path.push(this.coord(id));continue;}
      let course=bridge.path.slice(1);
      if(bridge.canal){
        const first=bridge.channel[0],last=bridge.channel.at(-1);
        let start=course.findIndex(p=>distance(p,first)<.00001);
        let end=course.findIndex(p=>distance(p,last)<.00001);
        if(index===1&&distance(from,first)<.00001){
          path.splice(0,path.length,from);
          course=course.slice(start+1);
          end-=start+1;start=-1;
        }
        if(index===ids.length-1&&distance(to,last)<.00001)course=course.slice(0,end+1);
        if(start<0&&distance(path.at(-1),first)>.00001)return null;
        if(end<=start)return null;
        channels.set(path.length+start,{end:path.length+end,id:bridge.canal});
      }
      path.push(...course);
    }
    if(this.detail&&distance(path.at(-1),to)>.00001)path.push(...exit.path.slice().reverse().slice(1));
    // Keep safe bends and smooth straight stretches without cutting across land.
    const smooth=[path[0]],passages=[];let anchor=0;
    while(anchor<path.length-1){
      const channel=channels.get(anchor);
      if(channel){
        passages.push({id:channel.id,first:path[anchor],last:path[channel.end],span:path.slice(anchor,channel.end+1)});
        smooth.push(...path.slice(anchor+1,channel.end+1));anchor=channel.end;continue;
      }
      let next=anchor+1;
      for(let j=anchor+2;j<Math.min(path.length,anchor+60);j++){
        if(channels.has(j-1)||!this.clearOcean(path[anchor],path[j])||!this.withinCoast(path[anchor],path[j],maxOffshore))break;
        next=j;
      }
      smooth.push(path[next]);anchor=next;
    }
    if(this.detail){
      const points=smooth;
      const inside=(a,b)=>passages.some(c=>c.span.some((p,i)=>i&&p===b&&c.span[i-1]===a));
      if(points.some((p,i)=>i&&!inside(points[i-1],p)&&(!this.clearOcean(points[i-1],p)||!this.withinCoast(points[i-1],p,maxOffshore))))return null;
      const route=makeRoute(points);
      if(passages.length){
        let offset=0;
        const passageOffsets=new Map();
        route.path.forEach((p,i)=>{
          if(i)offset+=route.lengths[i-1];
          for(const c of passages){
            if(!passageOffsets.has(c)&&distance(p,c.first)<.00001)passageOffsets.set(c,{id:c.id,start:offset});
            if(passageOffsets.has(c)&&distance(p,c.last)<.00001)passageOffsets.get(c).end=offset;
          }
        });
        route.passages=[...passageOffsets.values()].filter(p=>p.end>p.start);
        if(route.passages.length!==passages.length)return null;
      }
      return route.total<=maxDistance?route:null;
    }
    if(distance(from,smooth[0])>0.1)smooth.unshift(from);
    if(distance(to,smooth.at(-1))>0.1)smooth.push(to);
    if(smooth.length===1)smooth.push(to);
    const lengths=smooth.slice(1).map((p,i)=>distance(smooth[i],p));
    return {path:smooth,lengths,total:lengths.reduce((a,b)=>a+b,0)};
  }
  coarseCoast(p){const i=this.cell(p);return i<0?Infinity:this.coast?this.coast[i]:this.mask[i]?0:Infinity;}
  coastAt(p){
    const coarse=this.coarseCoast(p);
    if(!this.detail)return coarse;
    const near=this.detail.coastWithin(p,85);
    return Number.isFinite(near)?near:Math.max(85.001,coarse);
  }
  withinCoast(a,b,limit){
    if(!Number.isFinite(limit))return true;
    if(!this.detail)return this.checkSegment(a,b,.025,p=>this.coastAt(p)>limit);
    return this.checkSegment(a,b,.10,p=>{
      if(this.riverAt(p))return false;
      const coarse=this.coarseCoast(p);
      if(coarse<limit-25)return false;
      if(coarse>limit+25)return true;
      return this.detail.coastWithin(p,limit+1e-6)>limit;
    });
  }
  annotate(route){route.sections=routeSections(this,route);return route;}
  clearOcean(a,b){return this.detail?this.detail.clear(a,b):this.checkSegment(a,b,.025,p=>this.isOceanLand(p));}
  clear(a,b){
    if(!this.detail)return this.checkSegment(a,b,.025,p=>this.isLand(p));
    if(this.detail.clear(a,b))return true;
    const x0=Math.min(a[0],b[0]),x1=Math.max(a[0],b[0]),y0=Math.min(a[1],b[1]),y1=Math.max(a[1],b[1]);
    if(x1-x0>=180||!this.rivers.some(r=>x0<=r.bounds[2]+.6&&x1>=r.bounds[0]-.6&&y0<=r.bounds[3]+.2&&y1>=r.bounds[1]-.2))return false;
    return this.checkSegment(a,b,.0125,p=>this.isLand(p));
  }
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
    const southbound=route.path[i+1][1]<route.path[i][1];
    for(let j=0;j<n;j++){
      const end=offset+route.lengths[i]/n,at=(offset+end)/2,mid=positionAlong(route,at),river=!!route.passages?.some(p=>at>=p.start&&at<p.end)||!!nav.riverAt(mid),last=sections.at(-1);
      const current=!river&&southbound&&mid[0]>=8&&mid[0]<=19&&mid[1]>=-36&&mid[1]<=-21;
      const mediterranean=!river&&mid[0]>=-5.5&&mid[0]<=37&&mid[1]>=30&&mid[1]<=46;
      const coastal=!river&&(nav.coarseCoast?.(mid)??Infinity)<=80;
      if(last&&last.river===river&&!!last.current===current&&!!last.mediterranean===mediterranean&&!!last.coastal===coastal)last.end=end;
      else sections.push({start:offset,end,river,...(current?{current:true}:{}),...(mediterranean?{mediterranean:true}:{}),...(coastal?{coastal:true}:{})});
      offset=end;
    }
  }return sections;
}
function sectionMotion(s,route,section,gear){
  const rescue=['rescue','transition'].includes(route.kind),stats=ship(s);
  if(route.legacy)return {speed:[360,440,520][route.legacyShipLevel??Math.min(2,s.level||0)]/(rescue?2:1),rate:.9,limit:Infinity};
  let speed=section.river?stats.riverSpeed:section.coastal?Math.min(...fleetShips(s).map(p=>vesselSeaSpeed(s,p,true))):stats.speed;
  const officer=activeOfficer(s);
  if(!section.river)speed*=1+(section.mediterranean?officer?.mediterraneanSpeed||0:0)+(charterCargo(s)>0?officer?.charterSpeed||0:0)+(!route.direct&&section.coastal?officer?.manualSpeed||0:0);
  if(!section.river&&section.current)speed*=1+Math.min(...fleetShips(s).map(v=>gearOnShip(s,v.id)?.currentSpeed||0));
  if(route.direct&&!section.river)speed*=route.manualMultiplier||1;
  let rate=voyageSupplyRate(s,section.river,section.coastal),limit=Infinity;
  if(!rescue)for(const [id,miles] of Object.entries(gear||{})){
    if(miles<=1e-8)continue;
    const item=ITEM_BY_ID[id];
    if(!section.river&&item?.speed)speed*=1+item.speed;
    if(item?.supply)rate*=1-item.supply;
    limit=Math.min(limit,miles);
  }
  return {speed:speed/(rescue?2:1),rate,limit};
}
function spendGear(gear,miles){
  for(const [id,left] of Object.entries(gear||{})){
    if(left-miles<=1e-8)delete gear[id];
    else gear[id]=left-miles;
  }
}
export function voyageEstimate(s,route,travelled=0){
  const sections=route.sections||[{start:0,end:route.total,river:false}],gear={...s.rumorProgress?.distanceGear};
  let days=0,food=0;
  for(const section of sections){
    let remaining=Math.max(0,section.end-Math.max(travelled,section.start));
    while(remaining>1e-8){
      const {speed,rate,limit}=sectionMotion(s,route,section,gear);
      const miles=Math.min(remaining,limit),time=miles/speed;
      days+=time;food+=time*rate;remaining-=miles;spendGear(gear,miles);
    }
  }
  return {days,food,seconds:days*ACTIVE_SECONDS_PER_DAY};
}
export function canDepart(s,route){
  if(!route)return {ok:false,error:'이 배로 갈 수 있는 연안 항로를 찾지 못했어요.'};
  if(usedSpace(s)>capacity(s))return {ok:false,error:'보급과 화물의 적재 공간을 먼저 정리하세요.'};
  const estimate=voyageEstimate(s,route),back=route.returnFood??0,needed=estimate.food+back+ship(s).reserve;
  if(!Number.isFinite(needed))return {ok:false,error:'선택한 해역에서 돌아올 수 있는 보급항을 찾지 못했어요.'};
  if(s.food+1e-8<needed)return {ok:false,error:`보급 ${needed.toFixed(1)}일분이 필요해요. 중간 항구를 선택하세요.`};
  return {ok:true,...estimate};
}
function voyageSupplyRate(s,river,coastal){
  const officer=activeOfficer(s);
  const members=fleetShips(s);
  const consumption=members.reduce((sum,v)=>{const p=vesselSpec(v);return sum+p.supplyUse*(!river&&!coastal?p.openSupply:1);},0)/members.length;
  return (1-(river?0:officer?.seaSupply||0)-(s.fleetCount>=2?officer?.fleetSupply||0:0)-(!river&&!coastal?officer?.openSeaSupply||0:0))*consumption;
}
export function manualHelmSpeed(s,nav,point){
  if(nav.riverAt(point))return ship(s).riverSpeed;
  const manualBonus=nav.coastAt(point)<=80?Math.min(...fleetShips(s).map(p=>gearOnShip(s,p.id)?.manualSpeed||0))+(activeOfficer(s)?.manualSpeed||0):0;
  const effects=Object.entries(s.rumorProgress?.distanceGear||{}).reduce((factor,[id,miles])=>miles>0?factor*(1+(ITEM_BY_ID[id]?.speed||0)):factor,1);
  return Math.min(...fleetShips(s).map(v=>vesselSeaSpeed(s,v,nav.coastAt(point)<=80)))*(1+manualBonus)*effects;
}
export function useEmergencySupplies(s,id){
  const p=s.rumorProgress;
  if(id!=='I011'||!p?.items[id]||!tradingPort(s)||s.battleId||s.npcBattle||s.raidId||s.explorationLockedUntilSailing)throw Error('꾸러미와 정상 정박 상태를 확인하세요.');
  const amount=Math.min(2,ship(s).supply-s.food,supplyRoom(s));
  if(amount<=1e-8)throw Error('보급 한도와 적재 공간을 확인하세요.');
  s.food+=amount;
  p.items[id]--;
  return {message:'비상 식량 사용 · '+amount.toFixed(1)+'일분 보급'};
}
export function advanceVoyage(s,nav,seconds,intercept=null){
  const v=s.voyage;if(!v)return {miles:0,days:0};v.sections??=routeSections(nav,v);
  let budget=Math.max(0,seconds)/ACTIVE_SECONDS_PER_DAY,miles=0,days=0,interrupted=false,entry=null;const rescue=['rescue','transition'].includes(v.kind),passage=pendingCanal(v);
  while(budget>1e-10&&v.travelled<v.total-1e-8&&(rescue||s.food>1e-10)){
    if(passage&&v.travelled+1e-7>=passage.start){entry=passage.id;break;}
    const section=v.sections.find(r=>r.end>v.travelled+1e-8)||{end:v.total,river:false};
    const gear=s.rumorProgress?.distanceGear,{speed,rate,limit}=sectionMotion(s,v,section,gear);
    let step=Math.min(budget,(section.end-v.travelled)/speed,limit/speed,passage?(passage.start-v.travelled)/speed:Infinity,rescue?Infinity:s.food/rate);
    if(step<=1e-12)break;if(!rescue&&intercept){const t=Math.max(0,Math.min(1,intercept(positionAlong(v,v.travelled),positionAlong(v,Math.min(v.total,v.travelled+step*speed)))));if(t<1){step*=t;interrupted=true;}}const moved=step*speed;v.travelled=Math.min(v.total,v.travelled+moved);s.day+=step;days+=step;miles+=moved;budget-=step;
    if(!rescue){s.food=Math.max(0,s.food-step*rate);v.foodRemaining=Math.max(0,(v.foodRemaining||0)-step*rate);spendGear(gear,moved);}
    if(interrupted)break;
  }
  if(!rescue&&miles>0){
    s.explorationLockedUntilSailing=false;
    const p=s.rumorProgress;
    if(p?.active){
      const total=(p.officerMiles||0)+miles,experience=Math.floor(total/20);
      p.officerMiles=total-experience*20;
      addOfficerExperience(s,experience);
    }
  }
  s.position=positionAlong(v,v.travelled);return {miles,days,interrupted,...(entry?{entry}:{}),arrived:v.travelled>=v.total-1e-7,depleted:!rescue&&s.food<=1e-8};
}
export function advanceManualMotion(s,nav,motion,seconds,intercept=null){
  for(const [a,b]of motion.legs){if(!nav.clear(a,b))return {miles:0,days:0,error:'해안에 닿았어요. 바다 쪽으로 조종하세요.'};if(!nav.withinCoast(a,b,ship(s).offshore))return {miles:0,days:0,error:`이 배는 해안에서 ${ship(s).offshore}해리 이내로 항해할 수 있어요.`};}
  let budget=seconds,miles=0,days=0,finished=true,interrupted=false;const legs=[];
  for(const [a,b]of motion.legs){
    if(budget<=1e-10){finished=false;break;}
    const route=nav.annotate(makeRoute([a,b]));if(route.total<1e-10)continue;
    const bonus=nav.coastAt(a)<=80?Math.min(...fleetShips(s).map(p=>gearOnShip(s,p.id)?.manualSpeed||0))+(activeOfficer(s)?.manualSpeed||0):0;
    const temp={...s,position:[...a],voyage:{...route,travelled:0,foodRemaining:s.food,direct:true,manualMultiplier:1+bonus}};
    const result=advanceVoyage(temp,nav,budget,intercept);interrupted=result.interrupted;s.food=temp.food;s.day=temp.day;s.position=temp.position;if(result.miles>0)legs.push([[...a],[...temp.position]]);miles+=result.miles;days+=result.days;budget-=result.days*ACTIVE_SECONDS_PER_DAY;
    if(!result.arrived){finished=false;break;}
  }
  if(miles>0)s.explorationLockedUntilSailing=false;if(finished)s.position=[...motion.position];return {miles,days,legs,interrupted,depleted:s.food<=1e-8,finished};
}
export function nearestHarbor(s,nav,onlyVisited=false){
  let best=null;const candidates=PORTS.filter(p=>!onlyVisited||s.visited.includes(p.id)).map(p=>({p,point:nav.detail?nav.approach(p):[p.lon,p.lat]})).filter(x=>x.point).map(x=>({...x,min:distance(s.position,x.point)})).sort((a,b)=>a.min-b.min);
  for(const {p,min,point}of candidates){if(best&&min>best.route.total)break;const route=nav.route(s.position,point);if(route&&(!best||route.total<best.route.total))best={port:p,route};}return best;
}
export function beginRescue(s,nav,transition=false,damaged=false){
 const previous=s.voyage,replanning=!!s.rescueReplanPending&&['rescue','transition'].includes(previous?.kind);
 if(s.port||previous?.kind&&!replanning)return {ok:false,error:'항구 또는 구조 중이에요.'};
 if(!transition&&!replanning&&!damaged&&s.food>1e-8)return {ok:false,error:'보급 소진 시 자동 구조합니다.'};
 let found=nearestHarbor(s,nav,true),emergency=false;
 if(!found){const p=PORTS.find(p=>s.visited.includes(p.id));if(!p)return {ok:false,error:'방문한 보급항을 확인하고 있어요. 기록은 유지됩니다.'};const berth=nav.detail?nav.approach(p):[p.lon,p.lat];const d=distance(s.position,berth);found={port:p,route:{path:[[...s.position],berth],lengths:[d],total:d,travelled:d}};emergency=true;}
 refundCanalTolls(s);
 const rescueBase=Math.min(1000,Math.max(150,Math.ceil(found.route.total*.5)));
 const discounted=Math.ceil(rescueBase*(1-(activeOfficer(s)?.rescueDiscount||0)));
 const cost=replanning?(previous.paidCost||0):transition?0:Math.min(s.money,discounted-couponAmount(s,'rescue',discounted));
 if(!replanning&&!transition&&cost>0&&couponAmount(s,'rescue',discounted)>0)consumeCoupon(s,'rescue');
 if(!replanning)s.money-=cost;if(s.shoreTrip?.beach)delete s.shoreTrip;s.port=null;s.controlMode='auto';s.explorationLockedUntilSailing=true;
 s.voyage={...found.route,target:found.port.id,travelled:emergency?found.route.total:0,foodRemaining:0,kind:transition||previous?.kind==='transition'?'transition':'rescue',paidCost:cost,rescueId:previous?.rescueId||globalThis.crypto?.randomUUID?.()||'rescue-'+Date.now(),emergency};
 delete s.transitionPending;delete s.rescueReplanPending;return {ok:true,cost,port:found.port,emergency,arrived:emergency||found.route.total<=1e-8};
}
export function recordArrival(s,id,voyage){
  const p=PORT_BY_ID[id];if(!p)return;
  if(voyage?.origin&&PORT_BY_ID[voyage.origin]&&voyage.origin!==id&&!voyage.kind){
    s.recentRoutes=[{from:voyage.origin,to:id,nm:voyage.total},...(s.recentRoutes||[])].slice(0,5);
    appendItemRecord(s,'routes',id,PORT_BY_ID[voyage.origin].name+' → '+p.name+' · '+Math.round(voyage.total)+'해리');
  }
  s.recentPorts=[id,...(s.recentPorts||[]).filter(p=>p!==id)].slice(0,8);settleSupply(s);
  if(!voyage?.kind)recordContractArrival(s,id);
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
