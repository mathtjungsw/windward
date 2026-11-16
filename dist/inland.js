import {GOODS} from './data.js?v=2026.11.16-trade-save';
import {capacity,usedSpace} from './engine.js?v=2026.11.16-trade-save';
import {basePrice,tradeQuote} from './market-rules.js?v=2026.11.16-trade-save';
import {recordTrade} from './rank-progress.js?v=2026.11.16-trade-save';
import {blessingRate} from './blessings.js?v=2026.11.16-trade-save';

export const INLAND_CITIES={
 cordoba:{id:'cordoba',name:'코르도바',port:'seville',point:[-4.7794,37.8847],path:[[-5.6,37.53],[-5.16,37.77]],seconds:60,terrain:0,goods:{leather:.83,oliveoil:.87}},
 avignon:{id:'avignon',name:'아비뇽',port:'marseille',point:[4.8055,43.9493],path:[[5.24,43.51],[4.88,43.71]],seconds:70,terrain:0,goods:{wool:.84,wine:.86}},
 puebla:{id:'puebla',name:'푸에블라',port:'veracruz',point:[-98.2063,19.0414],path:[[-96.94,19.54],[-97.34,19.57],[-97.75,19.25]],seconds:120,terrain:1,goods:{cotton:.86,porcelain:.88}}
};
export const INLAND_PORTS=Object.fromEntries(Object.values(INLAND_CITIES).map(city=>[city.port,city]));
export const WAREHOUSE_MAX=2000;
const names=['봇짐','큰 봇짐','지게','손수레','짐나귀','짐노새','짐말','짐말 무리','소형 우차','대형 우차','2륜 짐마차','4륜 짐마차','덮개 마차','대형 짐마차','2대 마차 행렬','3대 마차 행렬','4대 마차 행렬','5대 마차 행렬','6대 마차 행렬','대형 상단 마차 행렬'];
const loads=[10,15,20,30,40,55,70,90,115,145,180,220,265,320,390,470,560,680,820,1000];
const costs=[0,250,600,1100,2000,3500,6000,9500,14000,20000,30000,44000,61000,86000,120000,165000,225000,300000,390000,500000];
const roads=[1,1,1,.95,.92,.90,.84,.85,.95,.98,.84,.8,.78,.77,.76,.75,.74,.73,.72,.70];
const passes=[1,1,.95,1.10,.88,.82,.82,.85,1.10,1.15,1.06,1.12,1.13,1.15,1.16,1.18,1.20,1.22,1.24,1.26];
export const INLAND_TIERS=names.map((name,i)=>({name,tier:i+1,load:loads[i],cost:costs[i],speed:[roads[i],passes[i]]}));
export const inlandVehicle=game=>INLAND_TIERS[game.inland?.tier||0];
export const inlandWarehouse=(game,id)=>game.inland?.warehouses?.[id]||{};
export const inlandSpace=(game,id)=>Object.values(inlandWarehouse(game,id)).reduce((n,item)=>n+item.qty,0);
const fail=message=>{throw Error(message);};
const quantity=n=>Number.isSafeInteger(n)&&n>0&&n<=WAREHOUSE_MAX;
const normalGood=id=>Object.hasOwn(GOODS,id)&&!GOODS[id].premium&&!GOODS[id].legacy;
const docked=(game,city)=>city&&game.port===city.port&&!game.voyage&&!game.shoreTrip&&!game.seaJob;
const routeDuration=(city,game)=>Math.max(30,Math.ceil(city.seconds*inlandVehicle(game).speed[city.terrain]));
export const inlandLocation=game=>game.inland?.visit?.city||null;
export const inlandBlocksSailing=(game,now)=>!!game.inland?.visit&&(!game.inland.visit.returning||game.inland.visit.due>now);
function data(game){return (game.inland??={tier:0,warehouses:{}});}
function warehouse(game,id){return (data(game).warehouses[id]??={});}
function changeCargo(cargo,id,qty,cost){
 const old=cargo[id]||{qty:0,cost:0},next=old.qty+qty;
 if(!next)delete cargo[id];else cargo[id]={qty:next,cost:Math.max(0,old.cost+cost)};
}
function moveCargo(from,to,id,qty,extraCost=0){
 const cost=from[id].cost*qty/from[id].qty;
 changeCargo(from,id,-qty,-cost);changeCargo(to,id,qty,cost+extraCost);
}
export function inlandReserved(game,place,good){
 const task=game.inland?.haul;
 if(!task||task.phase!=='running')return 0;
 if(place===task.to||place===task.from&&good===task.good)return task.qty-task.delivered;
 return 0;
}
export function inlandFree(game,place){
 return WAREHOUSE_MAX-inlandSpace(game,place)-inlandReserved(game,place);
}
export function inlandAvailable(game,place,good){
 return (inlandWarehouse(game,place)[good]?.qty||0)-inlandReserved(game,place,good);
}
export function inlandHarborStorage(game,city,good,now){
 if(!inlandAccess(game,city,city.port,now))fail('연결 항구로 돌아온 뒤 창고 교역을 이용해 주세요.');
 settleInlandHaul(game,now);
 return {cargo:warehouse(game,city.port),room:inlandFree(game,city.port),available:inlandAvailable(game,city.port,good)};
}
export function inlandAccess(game,city,place,now){
 if(!docked(game,city))return false;
 const visit=game.inland?.visit;
 if(visit&&visit.due>now)return false;
 return place===city.id?visit?.city===city.id&&!visit.returning:(!visit||visit.returning&&visit.due<=now);
}
export function settleInlandVisit(game,now){
 const visit=game.inland?.visit;
 if(visit?.returning&&visit.due<=now)delete game.inland.visit;
}
export function inlandWalk(game,city,now,returning){
 settleInlandVisit(game,now);
 if(!docked(game,city))fail('연결 항구에 배를 정박해 주세요.');
 const old=game.inland?.visit;
 if(returning?old?.city!==city.id||old.due>now||old.returning:old)fail('현재 육상 이동을 먼저 마쳐 주세요.');
 const due=now+routeDuration(city,game)*1000;
 data(game).visit={city:city.id,from:now,due,returning:!!returning};
 return {message:returning?'배가 있는 항구로 돌아갑니다.':city.name+'으로 출발합니다.'};
}
export function inlandUpgrade(game,city,now){
 if(!inlandAccess(game,city,city.id,now)&&!inlandAccess(game,city,city.port,now))fail('항구나 도시에 도착한 뒤 이용해 주세요.');
 const cur=inlandVehicle(game),next=INLAND_TIERS[cur.tier];
 if(!next||game.money<next.cost-cur.cost)fail('다음 단계에 필요한 두카트를 확인해 주세요.');
 game.money-=next.cost-cur.cost;data(game).tier=cur.tier;
 return {message:next.name+'으로 업그레이드했어요.'};
}
export function inlandTransfer(game,city,good,qty,toShip,now){
 if(!inlandAccess(game,city,city.port,now)||!quantity(qty)||!Object.hasOwn(GOODS,good))fail('항구에 도착한 뒤 수량을 확인해 주세요.');
 settleInlandHaul(game,now);
 const storage=warehouse(game,city.port);
 if(toShip){
  if(qty>inlandAvailable(game,city.port,good)||usedSpace(game)+qty>capacity(game))fail('창고의 판매 가능 수량과 선단 적재 공간을 확인해 주세요.');
  moveCargo(storage,game.cargo,good,qty);
 }else{
  if(qty>(game.cargo[good]?.qty||0)||qty>inlandFree(game,city.port))fail('배의 화물과 창고 빈 공간을 확인해 주세요.');
  moveCargo(game.cargo,storage,good,qty);
 }
 return {message:`${GOODS[good].name} ${qty}상자를 옮겼어요.`};
}
export function inlandMarketQuote(city,good,qty,mode,content,revision,now){
 if(!city||!normalGood(good)||mode==='buy'&&!Object.hasOwn(city.goods,good))fail('도시에서 살 수 있는 상품을 선택해 주세요.');
 return tradeQuote(city.port,good,qty,mode,{...content.markets?.[good],revision,ignoreEvent:true},now,0,basePrice(city.port,good,now)*(city.goods[good]||1.12));
}
export function inlandTrade(game,city,good,qty,mode,content,revision,now,quote){
 if(!inlandAccess(game,city,city.id,now))fail('내륙 도시에 도착한 뒤 거래해 주세요.');
 settleInlandHaul(game,now);
 const current=inlandMarketQuote(city,good,qty,mode,content,revision,now);
 if(quote.revision!==revision||now-quote.at>10000||now<quote.at-1000||quote.total!==current.total)fail('시세가 달라졌어요. 새 견적을 확인해 주세요.');
 const inventory=warehouse(game,city.id);
 let profit=0;
 if(mode==='buy'){
  if(game.money<current.total||qty>inlandFree(game,city.id))fail('두카트와 도시 창고 공간을 확인하세요.');
  game.money-=current.total;changeCargo(inventory,good,qty,current.total);
 }else{
  if(qty>inlandAvailable(game,city.id,good))fail('도시 창고의 판매 가능 수량이 부족해요.');
  const cost=inventory[good].cost*qty/inventory[good].qty;
  game.money+=current.total;profit=current.total-cost;game.profit+=profit;
  changeCargo(inventory,good,-qty,-cost);
 }
 content.markets??={};content.markets[good]=current.next;
 game.trades++;recordTrade(game,good,mode,profit,now);
 return {message:`${qty}상자 ${mode==='buy'?'구매':'판매'} · ${current.total.toLocaleString('ko-KR')} D`,...current};
}
export function inlandHaulQuote(game,city,qty,at){
 if(!quantity(qty))fail('운송 수량을 1~2,000상자로 입력해 주세요.');
 const step=inlandVehicle(game),duration=Math.max(30,Math.ceil(routeDuration(city,game)*(1-blessingRate('caravan',at))))*1000;
 const loads=Math.ceil(qty/step.load),legs=loads*2-1,legCost=8+Math.ceil(duration/30000)*2;
 return {load:step.load,loads,legs,duration,legCost,cost:legs*legCost,elapsed:legs*duration};
}
export function startInlandHaul(game,city,from,good,qty,now,expected=null){
 if(!docked(game,city)||!Object.hasOwn(GOODS,good)||![city.id,city.port].includes(from))fail('연결 항구의 창고나 도시에서 예약해 주세요.');
 settleInlandHaul(game,now);
 if(game.inland?.haul?.phase==='running')fail('진행 중인 육상 운송을 먼저 마쳐 주세요.');
 const to=from===city.id?city.port:city.id,quote=inlandHaulQuote(game,city,qty,now);
 if(expected&&(expected.duration!==quote.duration||expected.cost!==quote.cost))fail('운송 시간과 보급비가 바뀌었어요. 새 견적을 확인해 주세요.');
 if(qty>inlandAvailable(game,from,good)||qty>inlandFree(game,to))fail('출발지의 화물과 도착지 창고 공간을 확인하세요.');
 if(game.money<quote.legCost)fail('첫 구간의 보급비가 필요해요.');
 game.money-=quote.legCost;
 data(game).haul={city:city.id,from,to,good,qty,deliveryCost:0,delivered:0,leg:0,paid:quote.legCost,phase:'running',startedAt:now,due:now+quote.duration,...quote};
 return {message:'육상 왕복 운송을 시작했어요.'};
}
export function settleInlandHaul(game,now){
 const job=game.inland?.haul;
 if(job?.phase!=='running'||job.due>now)return false;
 while(job.phase==='running'&&job.due<=now){
  const arriving=job.leg%2===0;
  job.deliveryCost+=job.legCost;
  if(arriving){
   const amount=Math.min(job.load,job.qty-job.delivered),from=warehouse(game,job.from),to=warehouse(game,job.to);
   moveCargo(from,to,job.good,amount,job.deliveryCost);job.deliveryCost=0;job.delivered+=amount;
  }
  job.leg++;
  if(job.leg>=job.legs||job.stop){job.phase=job.delivered===job.qty?'done':'stopped';continue;}
  if(game.money<job.legCost){job.phase='funds';continue;}
  game.money-=job.legCost;job.paid+=job.legCost;job.due+=job.duration;
 }
 return true;
}
export function stopInlandHaul(game,now){
 settleInlandHaul(game,now);
 const haul=game.inland?.haul;
 if(haul?.phase!=='running')return {noWrite:true};
 haul.stop=true;
 return {message:'진행 중인 구간을 마치면 멈춥니다.'};
}
export function inlandGuild(game,city,now){
 if(!inlandAccess(game,city,city.id,now)&&!inlandAccess(game,city,city.port,now))fail('도시에 도착하거나 연결 항구에 정박해 주세요.');
 settleInlandHaul(game,now);
 const state=data(game);state.guild??={};
 const today=Math.floor((now+32400000)/86400000),current=state.guild[city.id];
 if(current?.closed===today)fail('이 도시의 오늘 의뢰는 완료했어요.');
 if(!current||current.day!==today){
  const good=Object.keys(city.goods)[0],qty=15;
  state.guild[city.id]={day:today,good,qty,deadline:(today+1)*86400000-32400000,reward:600+city.seconds*3};
  return {message:'도시 조합에서 운반 의뢰를 받았어요.'};
 }
 if(now>=current.deadline||inlandAvailable(game,city.port,current.good)<current.qty)fail('마감 전에 연결 항구 창고로 화물을 운송해 주세요.');
 changeCargo(warehouse(game,city.port),current.good,-current.qty,-inlandWarehouse(game,city.port)[current.good].cost*current.qty/inlandWarehouse(game,city.port)[current.good].qty);
 game.money+=current.reward;current.closed=today;
 return {message:`운반 의뢰 완료 · +${current.reward.toLocaleString('ko-KR')} D`};
}

export function validInlandSave(data){
 if(!data||!Number.isInteger(data.tier)||!INLAND_TIERS[data.tier]||!data.warehouses||typeof data.warehouses!=='object'||Array.isArray(data.warehouses))return false;
 for(const [id,items] of Object.entries(data.warehouses)){
  if(!Object.hasOwn(INLAND_CITIES,id)&&!Object.hasOwn(INLAND_PORTS,id))return false;
  if(!items||typeof items!=='object'||Array.isArray(items))return false;
  const entries=Object.entries(items);
  if(entries.some(([good,item])=>!Object.hasOwn(GOODS,good)||!quantity(item?.qty)||!Number.isFinite(item.cost)||item.cost<0)
   ||entries.reduce((sum,[,item])=>sum+item.qty,0)>WAREHOUSE_MAX)return false;
 }
 const visit=data.visit,job=data.haul;
 if(visit&&(!Object.hasOwn(INLAND_CITIES,visit.city)||typeof visit.returning!=='boolean'||!Number.isFinite(visit.due)||!Number.isFinite(visit.from)||visit.due<=visit.from))return false;
 if(job){
  const city=INLAND_CITIES[job.city];
  if(!city||![city.id,city.port].includes(job.from)||job.to!==(job.from===city.id?city.port:city.id)||!Object.hasOwn(GOODS,job.good)||!quantity(job.qty)
   ||!INLAND_TIERS.some(t=>t.load===job.load)||!Number.isSafeInteger(job.leg)||job.leg<0||job.leg>job.legs
   ||job.legs!==Math.ceil(job.qty/job.load)*2-1||job.delivered!==Math.min(job.qty,Math.ceil(job.leg/2)*job.load)
   ||!Number.isSafeInteger(job.duration)||job.duration<30000||job.duration>180000||!Number.isSafeInteger(job.legCost)||job.legCost!==8+Math.ceil(job.duration/30000)*2
   ||!['running','funds','done','stopped'].includes(job.phase)||!Number.isFinite(job.due)||!Number.isSafeInteger(job.deliveryCost)||job.deliveryCost<0)return false;
  if(job.phase==='running'&&(!quantity(job.qty-job.delivered)||(data.warehouses[job.from]?.[job.good]?.qty||0)<job.qty-job.delivered))return false;
 }
 return true;
}
