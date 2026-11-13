import {TURTLE_RUMOR,turtleShipyard} from './historical-ships.js?v=2026.11.13-canal-routes';
import {PORT_BY_ID, GOODS} from './data.js?v=2026.11.13-canal-routes';
import {RUMOR_BY_ID} from './discoveries-catalog.js?v=2026.11.13-canal-routes';
import {OFFICERS, ITEMS, OFFICER_BY_ID, ITEM_BY_ID, OFFICER_REQUIREMENTS, MEDITERRANEAN_PORTS} from './rumor-catalog.js?v=2026.11.13-canal-routes';

export const isConsumable=entry=>['supply','repair','coupon','extension','shore-consumable','distance','trade-voucher','activity','project','facility'].includes(entry?.type);
export const itemLimit=entry=>isConsumable(entry)?20:1;
export const CONTRACTS = [...OFFICERS,...ITEMS];
const byId = Object.fromEntries(CONTRACTS.map(entry=>[entry.id,entry]));
const validId = id=>id===TURTLE_RUMOR.id||Object.hasOwn(byId,id)||Object.hasOwn(RUMOR_BY_ID,id);
const ids = (values, check)=>[...new Set(Array.isArray(values)?values.filter(check):[])];
const object = value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};

const gearIds=(value,items,type)=>ids(Array.isArray(value)?value:[value],id=>typeof id==='string'&&items[id]>0&&ITEM_BY_ID[id]?.type===type).slice(0,3);

export function equippedGear(game,type){
  const p=game.rumorProgress;
  return gearIds(p?.[type==='trade'?'tradeGear':'exploreGear'],p?.items||{},type).map(id=>ITEM_BY_ID[id]);
}

export function normalizeRumorProgress(game){
  const src=object(game.rumorProgress), read=ids(src.read,id=>Object.hasOwn(byId,id)||id===TURTLE_RUMOR.id);
  const hidden=ids(src.hidden,id=>validId(id)&&(read.includes(id)||(game.rumors||[]).includes(id)));
  const officers=ids(src.officers,id=>Object.hasOwn(OFFICER_BY_ID,id));
  const items={};
  for(const entry of ITEMS){
    const n=object(src.items)[entry.id];
    if(Number.isInteger(n)&&n>=0&&n<=itemLimit(entry))items[entry.id]=n;
  }
  const contracts={};
  for(const id of read){
    const old=object(src.contracts)[id], entry=byId[id];
    if(old&&typeof old==='object')contracts[id]={ports:ids(old.ports,p=>entry.challenge.ports.includes(p)),done:old.done===true};
  }
  const shipGear={};
  for(const ship of game.fleetShips||[]){
    const id=object(src.shipGear)[ship.id];
    if(items[id]>0&&ITEM_BY_ID[id]?.type==='ship'&&!Object.values(shipGear).includes(id))shipGear[ship.id]=id;
  }
  const distanceGear=Object.fromEntries(Object.entries(object(src.distanceGear)).filter(([id,n])=>ITEM_BY_ID[id]?.type==='distance'&&Number.isFinite(n)&&n>0&&n<=ITEM_BY_ID[id].miles));
  const vouchers=Object.fromEntries(Object.entries(object(src.vouchers)).filter(([mode,id])=>ITEM_BY_ID[id]?.type==='trade-voucher'&&ITEM_BY_ID[id].tradeMode===mode));
  const records={};
  for(const entry of ITEMS.filter(x=>x.record)){
    const old=src.records?.[entry.record];
    if(items[entry.id]&&Array.isArray(old))records[entry.record]=old.filter(row=>typeof row?.key==='string'&&row.key.length<=96&&typeof row.text==='string'&&row.text.length<=300&&Number.isSafeInteger(row.at)&&row.at>=0).slice(0,entry.limit);
  }
  const acquiredItems=ids([
    ...(Array.isArray(src.acquiredItems)?src.acquiredItems:[]),
    ...Object.keys(items).filter(id=>items[id]>0),...Object.keys(distanceGear),
    ...Object.values(vouchers),...Object.values(object(src.coupons))
  ],id=>Object.hasOwn(ITEM_BY_ID,id));
  return {read,hidden,officers,items,acquiredItems,contracts,shipGear,canalPass:CANAL_IDS.includes(src.canalPass)?src.canalPass:null,
    active:officers.includes(src.active)?src.active:null,
    exploreGear:gearIds(src.exploreGear,items,'explore'),
    tradeGear:gearIds(src.tradeGear,items,'trade'),
    coupons:Object.fromEntries(Object.entries(object(src.coupons)).filter(([kind,id])=>Object.hasOwn(ITEM_BY_ID,id)&&ITEM_BY_ID[id].coupon===kind)),
    distanceGear,vouchers,records,flag:items.I062>0&&src.flag===true,officerMiles:Number.isFinite(src.officerMiles)&&src.officerMiles>=0&&src.officerMiles<20?src.officerMiles:0,
    officerXP:Object.fromEntries(officers.map(id=>[id,Math.max(0,Math.min(10000,Number.isSafeInteger(src.officerXP?.[id])?src.officerXP[id]:0))])),
    usedRepair:src.usedRepair===true};
}
function progress(game){return game.rumorProgress??=normalizeRumorProgress(game);}
function rumorDetails(id){
  if(id===TURTLE_RUMOR.id)return TURTLE_RUMOR;
  const entry=byId[id];
  if(entry)return {id,text:entry.story,port:entry.tavern};
  const old=RUMOR_BY_ID[id];
  return {id,text:old.text,port:old.portId};
}
const sortRumors=entries=>entries.sort((a,b)=>a.text.localeCompare(b.text,'ko'));
export function rumorsAtTavern(game){
  if(!safeDock(game))return [];
  const discoveries=Object.values(RUMOR_BY_ID).filter(r=>r.portId===game.port);
  return sortRumors([...discoveries,...tavernRumors(game),...(game.port==='busan'?[TURTLE_RUMOR]:[])].map(r=>rumorDetails(r.id)));
}
export function rumorNote(game){
  const save=game.rumorProgress;
  const all=[...(game.rumors||[]),...(save?.read||[]),...(game.shipyard?.turtleRumor?[TURTLE_RUMOR.id]:[])];
  return sortRumors(ids(all,validId).map(id=>{
    const discovery=RUMOR_BY_ID[id]?.discoveryId;
    const complete=!!(discovery&&game.discoveries?.[discovery]||save?.officers?.includes(id)||
      save?.acquiredItems?.includes(id)||save?.items?.[id]>0||
      id===TURTLE_RUMOR.id&&game.shipyard?.unlocked?.includes('turtle'));
    return {...rumorDetails(id),hidden:!!save?.hidden?.includes(id),complete};
  }));
}
export function portEncounters(game){
  if(!safeDock(game))return [];
  return CONTRACTS.filter(entry=>entry.port===game.port&&game.rumorProgress?.read.includes(entry.id));
}
export function setRumorHidden(game,id,hidden){
  if(!rumorNote(game).some(x=>x.id===id))return false;
  const p=progress(game);
  p.hidden=hidden?ids([...p.hidden,id],validId):p.hidden.filter(x=>x!==id);
  return true;
}
const safeDock=game=>!!game.port&&!game.voyage&&!game.explorationLockedUntilSailing&&!game.battleId&&!game.npcBattle&&!game.raidId;
export function rumorRequirement(game,entry){
  const rule=entry.type||entry.scenario?{stage:entry.stage,ports:0}:OFFICER_REQUIREMENTS[entry.cost];
  const visitCount=new Set(game.visited.filter(id=>PORT_BY_ID[id]?.active)).size;
  return { ...rule, visitCount, met:game.shipTier+1>=rule.stage&&visitCount>=rule.ports };
}
export function tavernRumors(game){
  return safeDock(game)?CONTRACTS.filter(entry=>!entry.scenario&&entry.tavern===game.port&&rumorRequirement(game,entry).met):[];
}
export function readContractRumor(game,id){
  if(id===TURTLE_RUMOR.id){if(!safeDock(game)||game.port!=='busan')return false;turtleShipyard(game,'rumor');}
  else if(!tavernRumors(game).some(entry=>entry.id===id))return false;
  const p=progress(game);
  if(!p.read.includes(id))p.read.push(id);
  return true;
}

export function contractStatus(game,entry){
  const p=game.rumorProgress, task=p?.contracts[entry.id];
  const remaining=entry.challenge.ports.filter(port=>!task?.ports.includes(port));
  const {pirates,discoveries,gunQuality,ships,investment,shore,guild,seaKind,seaCount}=entry.challenge;
  const requirements=[];
  if(pirates)requirements.push({text:'해적 토벌',current:game.rankProgress?.pirateKills||0,total:pirates});
  if(discoveries)requirements.push({text:'발견물 조사',current:Object.keys(game.discoveries||{}).length,total:discoveries});
  if(gunQuality)requirements.push({text:'개량한 대포',current:Number((game.cannons||[]).some(gun=>gun.quality>=gunQuality)),total:1});
  if(investment)requirements.push({text:'항구 투자 또는 개발',current:new Set([...(game.investedPorts||[]),...(game.developedPorts||[])]).size,total:investment});
  if(shore)requirements.push({text:'상륙 조사 후 귀환',current:game.shoreProgress?.count||0,total:shore});
  if(guild)requirements.push({text:'조합 수송 납품',current:game.guild?.completed||0,total:guild});
  const {cooperative,proof}=entry.challenge;
  if(cooperative)requirements.push({text:'공동 수송 보수 수령',current:game.projectStats?.freight||0,total:cooperative});
  if(proof){
    const labels={freight:'위탁 수송',multiFleet:'3척 이상 위탁 수송',survey:'발견물 조사 보고',pirate:'해적 토벌 보고',river:'강 항구 위탁 수송',europe:'유럽 위탁 수송',indian:'인도양 위탁 수송',mediterranean:'지중해 위탁 수송'};
    for(const [key,total]of Object.entries(proof))requirements.push({text:labels[key],current:game.guild?.proofs?.[key]||0,total});
  }
  if(seaKind)requirements.push({text:({salvage:'표류 화물 회수',fishing:'어장 활동',rescue:'구조 후 선원 인도'})[seaKind]||'해상 활동',current:game.seaLog?.counts[seaKind]||0,total:seaCount});
  if(ships)requirements.push({text:'선단 선박',current:game.fleetCount||1,total:ships});
  return {requirements,ready:requirements.every(x=>x.current>=x.total),known:p?.read.includes(entry.id)||false, started:!!task, done:task?.done===true,
    owned:entry.type?(p?.items[entry.id]||0):Number(p?.officers.includes(entry.id)||false), remaining,
    cargo:game.cargo[entry.challenge.cargo]?.qty||0};
}
export function recordContractArrival(game,port){
  if(game.rumorProgress?.usedRepair)game.rumorProgress.usedRepair=false;
  for(const [id,task] of Object.entries(game.rumorProgress?.contracts||{})){
    if(!task.done&&byId[id]?.challenge.ports.includes(port)&&!task.ports.includes(port))task.ports.push(port);
  }
}
export function performContractAction(game,id,action,replaceId){
  const entry=byId[id];
  if(!entry||!safeDock(game))throw Error('전투나 구조가 끝난 뒤 항구에 입항하세요.');
  const p=progress(game), status=contractStatus(game,entry);
  if(action==='equip'){
    if(!status.owned)throw Error('먼저 획득하세요.');
    if(!entry.type){
      const previous=activeOfficer(game)?.hullBonus||0;
      if(p.active!==id)p.officerMiles=0;
      p.active=p.active===id?null:id;
      preserveHullRatio(game,previous,activeOfficer(game)?.hullBonus||0);
    }
    else if(entry.type==='trade'||entry.type==='explore'){
      const key=entry.type==='trade'?'tradeGear':'exploreGear';
      const selected=equippedGear(game,entry.type).map(item=>item.id);
      if(selected.includes(id))p[key]=selected.filter(item=>item!==id);
      else if(selected.length<3)p[key]=[...selected,id];
      else if(selected.includes(replaceId))p[key]=selected.map(item=>item===replaceId?id:item);
      else throw Error('교체할 장비를 선택하세요.');
    }
    else if(entry.type==='flag')p.flag=!p.flag;
    else if(entry.type==='ship'){
      const flag=game.flagshipId, wasEquipped=p.shipGear[flag]===id;
      for(const key of Object.keys(p.shipGear))if(p.shipGear[key]===id)delete p.shipGear[key];
      if(!wasEquipped)p.shipGear[flag]=id;
    }else throw Error('가방에서 사용하세요.');
    return {message:'설정을 저장했어요.'};
  }
  if(entry.scenario)throw Error('항해자의 이야기 완료 보상으로 획득할 수 있어요.');
  if(game.port!==entry.port||!status.known)throw Error('소문에 나온 항구의 담당자를 만나세요.');
  if(action==='start'){
    if(status.started)throw Error('이미 의뢰를 시작했어요.');
    if(entry.minStage&&game.shipTier+1<entry.minStage)throw Error('이 의뢰에는 '+entry.minStage+'단계 이상의 배가 필요해요.');
    p.contracts[id]={ports:entry.challenge.ports.includes(game.port)?[game.port]:[],done:false};
    return {message:'의뢰를 시작했어요. 담당자에게서 진행을 확인하세요.'};
  }
  if(action==='deliver'){
    if(!status.started||status.done||status.remaining.length||status.cargo<entry.challenge.qty||!status.ready)throw Error('항구 방문, 납품 물량과 추가 조건을 확인하세요.');
    const good=entry.challenge.cargo, c=game.cargo[good], qty=entry.challenge.qty;
    if(c.qty===qty)delete game.cargo[good];
    else game.cargo[good]={qty:c.qty-qty,cost:c.cost*(c.qty-qty)/c.qty};
    p.contracts[id].done=true;
    return {message:'납품 완료 · 고용 또는 구입할 수 있어요.'};
  }
  if(action!=='claim'||!status.done)throw Error('먼저 합류 또는 획득 의뢰를 완료하세요.');
  if(status.owned>=itemLimit(entry))throw Error('이미 보유 한도에 도달했어요.');
  if(game.money<entry.cost)throw Error('두카트가 부족해요.');
  game.money-=entry.cost;
  if(entry.type){
    p.items[id]=status.owned+1;
    p.acquiredItems??=[];
    if(!p.acquiredItems.includes(id))p.acquiredItems.push(id);
  }
  else p.officers.push(id);
  return {message:entry.name+(entry.type?' 획득':' 고용 완료')};
}
export function activeOfficer(game){
  const p=game.rumorProgress;
  const entry=p?.officers.includes(p.active)?OFFICER_BY_ID[p.active]:null;
  if(!entry)return null;
  const level=officerLevel(game,entry.id),factor=1+(level-1)*.1;
  if(level===1)return entry;
  return Object.fromEntries(Object.entries(entry).map(([key,value])=>[key,typeof value==='number'&&!['cost','minStage'].includes(key)?Math.round(value*factor*10000)/10000:value]));
}
const thresholds=[0,150,450,900,1600];
export const officerLevel=(game,id)=>thresholds.filter(min=>min<=(game.rumorProgress?.officerXP?.[id]||0)).length;
function preserveHullRatio(game,previous,next){
  if(Number.isFinite(game.hullHP)&&previous!==next)game.hullHP=Math.max(0,Math.round(game.hullHP*(1+next)/(1+previous)));
}
export function addOfficerExperience(game,amount){
  const p=game.rumorProgress;
  if(!p?.officers?.includes(p.active)||amount<1)return;
  const previous=p.active==='O019'?(activeOfficer(game)?.hullBonus||0):0;
  p.officerXP??={};
  p.officerXP[p.active]=Math.min(10000,(p.officerXP[p.active]||0)+Math.floor(amount));
  if(previous)preserveHullRatio(game,previous,activeOfficer(game).hullBonus);
}
export function activateDistanceGear(game,id){
  const entry=ITEM_BY_ID[id],p=game.rumorProgress;
  if(entry?.type!=='distance'||!p?.items[id]||game.voyage||game.raidId||game.battleId||game.npcBattle||game.shoreTrip||game.seaJob||game.explorationLockedUntilSailing||entry.seaOnly&&game.port)throw Error('진행 중인 이동이나 활동을 끝내고 사용할 보급품을 확인하세요.');
  p.distanceGear??={};
  if(Object.keys(p.distanceGear).some(key=>p.distanceGear[key]>0&&(ITEM_BY_ID[key].speed&&entry.speed||ITEM_BY_ID[key].supply&&entry.supply)))throw Error('같은 효과가 이미 적용 중이에요.');
  p.items[id]--;
  p.distanceGear[id]=entry.miles;
  return {message:entry.name+' 사용 · '+entry.miles+'해리 동안 적용'};
}
export function activateTradeVoucher(game,id){
  const entry=ITEM_BY_ID[id],p=game.rumorProgress;
  if(!safeDock(game)||entry?.type!=='trade-voucher'||!p?.items[id])throw Error('정박한 상태에서 사용할 증서를 확인하세요.');
  p.vouchers??={};
  if(p.vouchers[entry.tradeMode])throw Error('같은 거래의 증서가 이미 대기 중이에요.');
  p.items[id]--;p.vouchers[entry.tradeMode]=id;
  return {message:entry.name+' 적용 대기'};
}
export function tradeVoucher(game,mode,port,good,qty,total){
  const entry=ITEM_BY_ID[game?.rumorProgress?.vouchers?.[mode]];
  if(!entry||entry.tradeGood!==good||entry.tradePort&&entry.tradePort!==port)return 0;
  return Math.min(entry.cap??Infinity,Math.floor(total*entry.rate*Math.min(1,entry.boxes/qty)));
}
export function appendItemRecord(game,kind,key,text,at=Date.now()){
  const entry=ITEMS.find(x=>x.record===kind),p=game.rumorProgress;
  if(!entry||!p?.items[entry.id]||typeof key!=='string'||!key||typeof text!=='string'||!text.trim())return false;
  p.records??={};
  p.records[kind]=[{key:key.slice(0,96),text:text.trim().slice(0,300),at},...(p.records[kind]||[]).filter(row=>row.key!==key)].slice(0,entry.limit);
  return true;
}
export function gearOnShip(game,shipId){
  const p=game.rumorProgress, id=p?.shipGear?.[shipId];
  return p?.items[id]>0?ITEM_BY_ID[id]:null;
}
export function tradeGear(game){return equippedGear(game,'trade')[0]||null;}
export function explorationGear(game){
  const entries=equippedGear(game,'explore');
  if(!entries.length)return null;
  const effects={id:entries.map(item=>item.id).join(','),name:entries.map(item=>item.name).join(' · ')};
  for(const item of entries)for(const [key,value] of Object.entries(item)){
    if(typeof value==='boolean')effects[key]=effects[key]||value;
    if(typeof value==='number')effects[key]=(effects[key]||0)+value;
  }
  return effects;
}
export const extraCapacity=game=>equippedGear(game,'trade').reduce((total,item)=>total+(item.capacity||0),0);
export function supplyDiscount(game){
  const officer=activeOfficer(game);
  return officer?.supplyDiscount||(MEDITERRANEAN_PORTS.has(game.port)?officer?.mediterraneanSupply||0:0);
}
export function activeCoupon(game,kind){
  const id=game.rumorProgress?.coupons?.[kind];
  return ITEM_BY_ID[id]?.coupon===kind?ITEM_BY_ID[id]:null;
}
export function couponAmount(game,kind,total){
  const entry=activeCoupon(game,kind);
  return entry?Math.min(entry.cap??Infinity,Math.floor(total*entry.rate)):0;
}
export function consumeCoupon(game,kind){
  if(activeCoupon(game,kind))delete game.rumorProgress.coupons[kind];
}
export function activateCoupon(game,id){
  const p=game.rumorProgress, entry=ITEM_BY_ID[id];
  if(!safeDock(game)||!entry?.coupon||!p?.items[id])throw Error('항구에 정박하고 사용할 쿠폰을 확인하세요.');
  if(activeCoupon(game,entry.coupon))throw Error('같은 종류의 쿠폰이 이미 적용 대기 중이에요.');
  p.coupons??={};
  p.coupons[entry.coupon]=id;
  p.items[id]--;
  return {message:entry.name+' 적용 대기'};
}
export function saleBonus(game,portId,goodId){
  const region=PORT_BY_ID[portId]?.region;
  const eligible=gear=>gear&&(!gear.sellRegion||region===gear.sellRegion)&&(!gear.sellPorts||gear.sellPorts.includes(portId))&&(!gear.sellGoods||gear.sellGoods.includes(goodId));
  return Math.min(.03,[activeOfficer(game),...equippedGear(game,'trade')].reduce((sum,g)=>sum+(eligible(g)?g.sellBonus||0:0),0));
}
export function contractDescription(entry){
  if(entry.scenario)return '항해자의 이야기 완료 보상입니다. 획득 후 기존 장비 칸 또는 동행 부선장으로 선택하세요.';
  return entry.challenge.ports.map(id=>PORT_BY_ID[id]?.name).join(' · ')+' 방문, '+GOODS[entry.challenge.cargo].name+' '+entry.challenge.qty+'상자 납품';
}
import {CANAL_IDS} from './canal-reservations.js?v=2026.11.13-canal-routes';
