import {COASTS} from './coast-sketches.js?v=2026.11.20-harbor-repairs';
import {PORT_BY_ID} from './data.js?v=2026.11.20-harbor-repairs';
import {mapDistance} from './world-wrap.js?v=2026.11.20-harbor-repairs';
import {segmentDistance} from './voyage-core.js?v=2026.11.20-harbor-repairs';

import {inlandBlocksSailing,settleInlandVisit} from './inland.js?v=2026.11.20-harbor-repairs';

export {COASTS};
const coastById=new Map(COASTS.map(site=>[site.id,site]));
export const ORDERS=[
 {id:'banquet',name:'상인들의 연회',reward:1250,slots:[
  {name:'음료',qty:3,goods:['wine','tea','coffee']},
  {name:'식기',qty:2,goods:['glass','porcelain','brassware']},
  {name:'향신료',qty:2,goods:['pepper','ginger','cinnamon','cloves']}]},
 {id:'shipwright',name:'조선소의 수리 자재',reward:1050,slots:[
  {name:'선체용 목재',qty:4,goods:['timber','oak','pine','cedar']},
  {name:'돛감',qty:3,goods:['linen','cotton','hemp-cloth']},
  {name:'보강재',qty:2,goods:['leather','cattle-hide','sheepskin']}]},
 {id:'galley',name:'선단 취사장의 부탁',reward:780,slots:[
  {name:'주식',qty:4,goods:['grain','wheat','barley','rye']},
  {name:'저장 식량',qty:2,goods:['driedfish','salt-beef','salted-sardines','beans']},
  {name:'곁들일 과일',qty:2,goods:['dates','raisins','dried-fig']}]}
];
const orderById=new Map(ORDERS.map(order=>[order.id,order]));
export const orderDay=now=>Math.floor((now+9*3600000)/86400000);
export function coastHarborReason(game,now=Date.now()){
 if(inlandBlocksSailing(game,now))return game.inland.visit.returning?'항구로 돌아오는 중이에요. 도착하면 다시 확인하세요.':'내륙에서 연결 항구로 돌아온 뒤 받을 수 있어요.';
 if(game.shoreTrip)return '상륙 탐사를 마치고 배로 돌아오세요.';
 if(game.battleId||game.npcBattle||game.raidId)return '전투를 마친 뒤 주점을 이용하세요.';
 if(!PORT_BY_ID[game.port]||game.voyage)return '항구에 입항한 뒤 주점에서 해도 조각을 받으세요.';
 return '';
}
const inHarbor=(game,now)=>!coastHarborReason(game,now);
export function normalizeCoastOrders(game){
 const book=game.coastBook;
 if(book){
  const found={};
  for(const site of COASTS){
   const time=book.found?.[site.id];
   if(Number.isSafeInteger(time)&&time>0)found[site.id]=time;
  }
  const active=coastById.has(book.active)&&!found[book.active]?book.active:null;
  game.coastBook={found,active};
 }
 const old=game.customOrders;
 if(old){
  const active=old.active;
  game.customOrders={
   lastDay:Number.isSafeInteger(old.lastDay)?old.lastDay:-1,
   active:active&&orderById.has(active.type)&&Object.hasOwn(PORT_BY_ID,active.port)&&Number.isSafeInteger(active.at)&&active.at>0
    ?{type:active.type,port:active.port,at:active.at}:null
  };
 }
}
export function nextCoast(game){
 if(game.coastBook?.active)return coastById.get(game.coastBook.active);
 return COASTS.filter(site=>!game.coastBook?.found?.[site.id])
  .sort((a,b)=>mapDistance(game.position,a.point)-mapDistance(game.position,b.point))[0];
}
export function takeCoast(game,id,now=Date.now()){
 const reason=coastHarborReason(game,now);
 if(reason)throw Error(reason);
 if(game.coastBook?.active===id)return {noWrite:true,message:'이미 이 해도 조각을 추적하고 있어요.'};
 if(game.coastBook?.active||nextCoast(game)?.id!==id)return {noWrite:true,message:'현재 해도 조각을 다시 표시했어요.'};
 settleInlandVisit(game,now);
 game.coastBook??={found:{},active:null};
 game.coastBook.active=id;
 return {message:'해도 조각을 항해일지에 넣었어요.'};
}
export function abandonCoast(game,id,now=Date.now()){
 if(!inHarbor(game,now)||game.coastBook?.active!==id)throw Error('주점에서 진행 중인 조각을 확인하세요.');
 game.coastBook.active=null;
 return {message:'해도 조각을 돌려주었어요.'};
}
export function visitCoast(game,from,to,now){
 const site=coastById.get(game.coastBook?.active);
 if(!site||game.voyage?.kind||game.explorationLockedUntilSailing||game.transitionPending||
    Math.abs(from[1]-to[1])>70||
    from[0]===to[0]&&from[1]===to[1]||segmentDistance(from,to,site.point).distance>22)return null;
 game.coastBook.found[site.id]=now;
 game.coastBook.active=null;
 return site;
}
export function takeOrder(game,type,port,now){
 if(!inHarbor(game)||game.port!==port||!orderById.has(type)||game.customOrders?.active)throw Error('항구 조합에서 진행 중인 주문을 확인하세요.');
 if(game.customOrders?.lastDay===orderDay(now))throw Error('오늘 주문을 마쳤어요. 한국 시간 자정에 새 주문을 받을 수 있어요.');
 game.customOrders??={lastDay:-1,active:null};
 game.customOrders.active={type,port,at:now};
 return {message:'맞춤 주문을 받았어요. 이 항구 조합에 화물을 가져오세요.'};
}
function checkActiveOrder(game,ticket){
 const row=game.customOrders?.active;
 if(!inHarbor(game)||game.port!==row?.port||row.type!==ticket?.type||row.at!==ticket?.at||row.port!==ticket?.port)
  throw Error('주문을 받은 항구와 현재 주문을 확인하세요.');
 return orderById.get(row.type);
}
export function cancelOrder(game,ticket){
 checkActiveOrder(game,ticket);
 game.customOrders.active=null;
 return {message:'주문을 돌려주었어요.'};
}
export function fillOrder(game,ticket,choices,now){
 const order=checkActiveOrder(game,ticket);
 if(game.customOrders.lastDay===orderDay(now)||game.money+order.reward>1e12)throw Error('오늘의 정산 또는 보유금 한도를 확인하세요.');
 if(!Array.isArray(choices)||choices.length!==order.slots.length)throw Error('각 용도에 납품할 상품을 하나씩 선택하세요.');
 // Validate the entire basket before touching stock or granting the reward.
 for(const [i,slot] of order.slots.entries()){
  if(!slot.goods.includes(choices[i])||(game.cargo[choices[i]]?.qty||0)<slot.qty)throw Error(slot.name+' 화물이 부족하거나 품목이 달라졌어요.');
 }
 for(const [i,slot] of order.slots.entries()){
  const id=choices[i],row=game.cargo[id];
  const remaining=row.qty-slot.qty;
  if(remaining)game.cargo[id]={qty:remaining,cost:row.cost*remaining/row.qty};
  else delete game.cargo[id];
 }
 game.money+=order.reward;
 game.customOrders={active:null,lastDay:orderDay(now)};
 return {message:order.name+' 납품 완료 · '+order.reward.toLocaleString('ko-KR')+' D 수령'};
}
