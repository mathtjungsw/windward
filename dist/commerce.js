import {shipyardTrade} from './historical-ships.js?v=2026.11.14-harbor-chart';
import {recordTrade} from './rank-progress.js?v=2026.11.14-harbor-chart';
import {PORT_BY_ID,GOODS} from './data.js?v=2026.11.14-harbor-chart';
import {usedSpace,capacity,tradingPort} from './engine.js?v=2026.11.14-harbor-chart';
import {tradeQuote,specialtyStage,specialtyStock} from './market-rules.js?v=2026.11.14-harbor-chart';
import {advanceBasicIncome,claimBasicIncome} from './port-income.js?v=2026.11.14-harbor-chart';
import {activeOfficer,saleBonus,tradeVoucher} from './rumor-progress.js?v=2026.11.14-harbor-chart';
import {recordStoryTrade} from './story-core.js?v=2026.11.14-harbor-chart';
export function captainTradeQuote(game,portId,goodId,qty,mode,item,now,rate){
 const quote=tradeQuote(portId,goodId,qty,mode,item,now,rate);
 const bonus=mode==='sell'&&game?Math.floor(quote.total*saleBonus(game,portId,goodId)+1e-9):0;
 const albumDiscount=mode==='buy'&&game?.albumRewards?.titleActive&&game.albumRewards.title&&!GOODS[goodId]?.premium?Math.floor(quote.gross*.01):0;
 const voucher=tradeVoucher(game,mode,portId,goodId,qty,quote.total-albumDiscount);
 return {...quote,voucher,albumDiscount,bonus:bonus+(mode==='sell'?voucher:0),total:quote.total-albumDiscount+bonus+(mode==='sell'?voucher:-voucher)};
}
export const NEUTRAL_PORTS=['lisbon','porto'];
export const LARGE_PORTS=['london','amsterdam','venice','alexandria','istanbul','macau','shanghai','nagasaki','havana','buenos','sydney'];
export const investmentBase=id=>LARGE_PORTS.includes(id)?600000:200000;
export function ownership(content={}){const entries=Object.entries(content.investors||{}).filter(([,n])=>Number.isSafeInteger(n)&&n>0),total=entries.reduce((a,[,n])=>a+n,0),owner=entries.find(([,n])=>n*2>total);return {total,ownerUid:content.developedOwner||owner?.[0]||null};}
export function taxRate(content,uid,portId){const owner=ownership(content).ownerUid;return NEUTRAL_PORTS.includes(portId)||!owner||owner===uid?0:Math.max(0,Math.min(30,content.rates?.[uid]??content.defaultRate??0));}
export function permitted(content,uid){return !ownership(content).ownerUid||!(content.blacklist||[]).includes(uid);}
export function portGrowth(content,portId){
 const total=ownership(content).total,base=investmentBase(portId);
 const supported=!NEUTRAL_PORTS.includes(portId)&&!PORT_BY_ID[portId]?.depot&&!PORT_BY_ID[portId]?.developable;
 const contribution=content.growthContribution||0;
 const effective=stage=>total+Math.min(contribution,base*stage*.2);
 const factor=effective(5)>=base*5?5:effective(2)>=base*2?2:0;
 return {stage:supported?specialtyStage(factor):0,total,contribution,next:factor===5?0:Math.max(0,base*(factor===2?5:2)-effective(factor===2?5:2))};
}
export function portMarketItem(content,portId,goodId,revision){
 const item={...content.markets?.[goodId],revision},good=GOODS[goodId];
 if(good?.premium&&good.source===portId){item.specialtyLimit=[0,50,100][portGrowth(content,portId).stage];if(portDevelopment(content,portId)==='production')item.specialtyPeriod=6000000;}
 return item;
}
function syncSpecialtyStock(content,portId,before,now,previousPeriod){
 const prior=[0,50,100][before],limit=[0,50,100][portGrowth(content,portId).stage];
 if(prior===limit&&previousPeriod===undefined)return;
 for(const [id,good] of Object.entries(GOODS)){
  if(!good.premium||good.source!==portId)continue;
  const item=content.markets?.[id];
  if(!item?.stockVersion&&item?.stock===undefined&&before===0&&limit===0)continue;
  if(!item&&prior!==0&&limit===0){
   (content.markets??={})[id]={stock:prior,stockAt:now,stockVersion:2,specialtyLimit:0};
   continue;
  }
  const stock=item?.stock===undefined?{stock:limit,stockAt:now}:specialtyStock(item,now,prior||(!Object.hasOwn(item,'specialtyLimit')?30:0),previousPeriod);
  (content.markets??={})[id]={...item,...stock,stockVersion:2,specialtyLimit:limit};
 }
}
const DOMESTIC_DAY=86400000;
export function portDevelopment(content,id){
 const kind=content.domestic?.kind;
 if(!ownership(content).ownerUid||portGrowth(content,id).stage!==2||!['tourism','production','trade'].includes(kind))return null;
 return kind;
}
export function setPortDevelopment(game,content,uid,id,kind,now){
 if(game.port!==id||game.voyage||ownership(content).ownerUid!==uid||portGrowth(content,id).stage!==2)throw Error('성장 2단계인 내 항구에서 내정을 설정하세요.');
 if(!['tourism','production','trade'].includes(kind))throw Error('내정 방향을 선택하세요.');
 const prior=content.domestic;
 if(prior?.kind===kind)return {noWrite:true,quiet:true};
 if(prior?.at&&now-prior.at<DOMESTIC_DAY)throw Error('마지막 변경부터 24시간이 지나야 해요.');
 advanceBasicIncome(content,id,uid,now);
 syncSpecialtyStock(content,id,2,now,prior?.kind==='production'?6000000:7200000);
 content.domestic={kind,at:now};
 advanceBasicIncome(content,id,uid,now);
 return {message:'항구 내정 방향을 설정했어요.'};
}
export function growthDeliveryInfo(content,portId,now,uid){
 const port=PORT_BY_ID[portId];
 if(!port||NEUTRAL_PORTS.includes(portId)||port.developable||port.depot||!Object.values(GOODS).some(g=>g.premium&&g.source===portId))return null;
 const day=Math.floor((now+32400000)/86400000), entries=content.growthDelivery;
 return {day,good:port.specialty,quantity:10,reward:Math.max(100,GOODS[port.specialty].base*12),points:Math.round(investmentBase(portId)*.025),done:entries?.day===day&&entries.captains?.[uid]};
}
export function deliverForGrowth(game,content,uid,portId,now,expectedDay){
 const order=growthDeliveryInfo(content,portId,now,uid);
 if(!order||order.day!==expectedDay||order.done||game.port!==portId||game.voyage||!permitted(content,uid))throw Error('정박 위치와 오늘의 성장 납품 조건을 확인하세요.');
 const cargo=game.cargo[order.good];
 if(!cargo||cargo.qty<order.quantity)throw Error('납품할 화물이 부족해요.');
 const prior=portGrowth(content,portId).stage;
 if(cargo.qty===order.quantity)delete game.cargo[order.good];
 else game.cargo[order.good]={qty:cargo.qty-order.quantity,cost:cargo.cost*(cargo.qty-order.quantity)/cargo.qty};
 game.money+=order.reward;
 if(content.growthDelivery?.day!==order.day)content.growthDelivery={day:order.day,captains:{}};
 content.growthDelivery.captains[uid]=true;
 content.growthContribution=Math.min(investmentBase(portId), (content.growthContribution||0)+order.points);
 (game.portGrowthDeliveries??={})[portId]=(game.portGrowthDeliveries[portId]||0)+1;
 syncSpecialtyStock(content,portId,prior,now);
 return {message:'성장 납품 완료 · '+order.reward+' D 수령'};
}
export function invest(game,content,uid,portId,amount,now=Date.now()){if(game.port!==portId||game.voyage||NEUTRAL_PORTS.includes(portId)||portId.startsWith('developed-'))throw Error('이 항구에는 지분 투자할 수 없어요.');if(!Number.isSafeInteger(amount)||amount<=0||amount%10000)throw Error('투자는 10,000 D 단위로 입력하세요.');const old=ownership(content),before=portGrowth(content,portId).stage;if(!old.total&&amount<investmentBase(portId))throw Error('최초 투자는 '+investmentBase(portId).toLocaleString('ko-KR')+' D 이상이에요.');if(amount>game.money)throw Error('투자할 두카트가 부족해요.');
 advanceBasicIncome(content,portId,old.ownerUid,now);game.money-=amount;content.investors??={};content.investors[uid]=(content.investors[uid]||0)+amount;if(content.investors[uid]>1e12)throw Error('투자 한도를 확인하세요.');const next=ownership(content);content.ownerUid=next.ownerUid;if(old.ownerUid!==next.ownerUid){delete content.officerIncome;delete content.harborOfficer;delete content.harborMessage;if(next.ownerUid)content.ownerSince=now;else delete content.ownerSince;}advanceBasicIncome(content,portId,next.ownerUid,now);if(old.ownerUid!==next.ownerUid){content.defaultRate=0;content.rates={};content.blacklist=[];}syncSpecialtyStock(content,portId,before,now);game.investedPorts=[...new Set([...(game.investedPorts||[]),portId])];return {ok:true,...next,share:content.investors[uid]/next.total*100};}
export function investmentWithdrawal(content,uid,amount){
 const principal=content.investors?.[uid]||0;
 if(!Number.isSafeInteger(amount)||amount<1||amount>principal||(amount!==principal&&amount%10000))throw Error('투자 잔액 안에서 10,000 D 단위 또는 전액을 선택하세요.');
 const received=Math.floor(amount*4/5),investors={...content.investors};
 if(principal===amount)delete investors[uid];else investors[uid]=principal-amount;
 const next=ownership({investors});
 return {...next,investors,received,loss:amount-received,share:next.total?(investors[uid]||0)/next.total*100:0};
}
export function withdrawInvestment(game,content,uid,portId,amount,now,revision,quotedRevision){
 if(game.port!==portId||game.voyage||NEUTRAL_PORTS.includes(portId)||PORT_BY_ID[portId]?.developable||PORT_BY_ID[portId]?.depot)throw Error('투자한 일반 항구에 정박하세요.');
 if(revision!==quotedRevision)throw Error('항구 장부가 바뀌었어요. 다시 확인해 주세요.');
 const result=investmentWithdrawal(content,uid,amount),prior=ownership(content),before=portGrowth(content,portId).stage;
 if(game.money+result.received>1e12)throw Error('두카트 보유 한도를 확인하세요.');
 advanceBasicIncome(content,portId,prior.ownerUid,now);
 content.investors=result.investors;content.ownerUid=result.ownerUid;
 if(prior.ownerUid!==result.ownerUid){
  delete content.officerIncome;delete content.harborOfficer;delete content.harborMessage;
  if(result.ownerUid)content.ownerSince=now;else delete content.ownerSince;
  content.defaultRate=0;content.rates={};content.blacklist=[];
 }
 advanceBasicIncome(content,portId,result.ownerUid,now);
 syncSpecialtyStock(content,portId,before,now);
 game.money+=result.received;
 if(!result.investors[uid])game.investedPorts=(game.investedPorts||[]).filter(id=>id!==portId);
 return {...result,message:'투자금 '+result.received.toLocaleString('ko-KR')+' D 수령'};
}
export function executeTrade(game,content,uid,portId,goodId,qty,mode,quote,now,revision){const p=tradingPort(game),g=GOODS[goodId];if(p?.id!==portId||!g||!permitted(content,uid))throw Error('현재 입항한 항구의 교역 권한을 확인하세요.');if(p.developable&&(content.development?.level||0)<2)throw Error('교역소 2단계 확장 뒤 거래할 수 있어요.');if(mode==='buy'&&(g.legacy||!(p.market.includes(goodId)||g.premium&&g.source===portId)))throw Error('이 항구에서 구매할 수 없어요.');if(!quote||now-quote.at>5000||now<quote.at-1000||quote.revision!==revision)throw Error('시세가 바뀌었어요. 새 금액을 확인해 주세요.');
 const item=portMarketItem(content,portId,goodId,revision),actual=captainTradeQuote(game,portId,goodId,qty,mode,item,quote.at,taxRate(content,uid,portId));const live=tradeQuote(portId,goodId,qty,mode,item,now,taxRate(content,uid,portId));actual.next=live.next;if(actual.total!==quote.total||live.eventEnd!==actual.eventEnd)throw Error('시세가 바뀌었어요. 새 금액을 확인해 주세요.');const old=game.cargo[goodId]||{qty:0,cost:0};
 if(mode==='buy'){if(usedSpace(game)+qty>capacity(game)||game.money<actual.total)throw Error('화물 공간과 두카트를 확인하세요.');game.money-=actual.total;game.cargo[goodId]={qty:old.qty+qty,cost:old.cost+actual.total};if(portId==='lisbon'&&goodId==='wine')game.boughtLisbonWine=true;}
 else{if(old.qty<qty)throw Error('판매할 화물이 부족해요.');const cost=old.cost*qty/old.qty;game.money+=actual.total;game.profit+=actual.total-cost;if(old.qty===qty)delete game.cargo[goodId];else game.cargo[goodId]={qty:old.qty-qty,cost:old.cost-cost};if(portId!=='lisbon'&&goodId==='wine'&&game.boughtLisbonWine)game.soldAway=true;}
 const owner=ownership(content).ownerUid;if(owner&&!content.basicIncome?.period)advanceBasicIncome(content,portId,owner,now);if(owner&&actual.tax){content.treasury??={};const operator=content.harborOperator?.until>now?content.harborOperator.uid:null;const share=operator&&operator!==owner?Math.floor(actual.tax*.25):0;content.treasury[owner]=(content.treasury[owner]||0)+actual.tax-share;if(share)content.treasury[operator]=(content.treasury[operator]||0)+share;}
 if(actual.voucher)delete game.rumorProgress.vouchers[mode];
 content.markets??={};content.markets[goodId]=actual.next;game.trades++;if(!game.explorationLockedUntilSailing)shipyardTrade(game,goodId);recordTrade(game,goodId,mode,mode==='sell'?actual.total-old.cost*qty/old.qty:0,now);recordStoryTrade(game,portId,goodId,qty,mode);return {ok:true,...actual};
}
export function changePortPolicy(content,uid,defaultRate,rates,blacklist){if(ownership(content).ownerUid!==uid)throw Error('현재 소유자만 변경할 수 있어요.');if(!Number.isFinite(defaultRate)||defaultRate<0||defaultRate>30||Object.keys(rates).length>100||Object.values(rates).some(n=>!Number.isFinite(n)||n<0||n>30)||blacklist.length>20)throw Error('세율 0~30%, 제한 선장 최대 20명을 확인하세요.');content.defaultRate=defaultRate;content.rates=rates;content.blacklist=blacklist;return {ok:true};}
export function assignHarborOfficer(game,content,uid,id,officer,now){
 if(game.port!==id||game.voyage||ownership(content).ownerUid!==uid)throw Error('소유 항구에 정박하세요.');
 const stations=game.harborOfficers??={};
 if(officer&&(!game.rumorProgress?.officers?.includes(officer)||Object.entries(stations).some(([port,x])=>port!==id&&x===officer)))throw Error('고용 중인 부선장의 배치 상태를 확인하세요.');
 advanceBasicIncome(content,id,uid,now);
 if(officer){
  stations[id]=officer;
  content.harborOfficer={owner:uid,id:officer};
  if(game.rumorProgress.active===officer){
   const previous=activeOfficer(game)?.hullBonus||0;
   game.rumorProgress.active=null;
   if(previous&&Number.isFinite(game.hullHP))game.hullHP=Math.floor(game.hullHP/(1+previous));
  }
 }else{
  delete stations[id];delete content.harborOfficer;
 }
 if(game.delegateTrade?.origin===id&&game.delegateTrade.officer!==officer)delete game.delegateTrade;
 advanceBasicIncome(content,id,uid,now);
 return {message:officer?'부선장을 항구에 배치했어요.':'부선장을 회수했어요.'};
}
export function delegateTradePreview(game,uid,origin,dest,originContent,destContent,route,now){
 if(!route||origin.id===dest.id||!dest.active||dest.depot||!game.visited?.includes(dest.id)||!permitted(originContent,uid)||!permitted(destContent,uid))throw Error('항로와 양쪽 항구의 교역 가능 여부를 확인하세요.');
 const id=route.good,qty=route.qty,budget=route.budget;
 if(!Number.isSafeInteger(qty)||qty<1||qty>100||!Number.isSafeInteger(budget)||budget<1||budget>1e12||!origin.market.includes(id)||GOODS[id]?.premium)throw Error('교역품과 수량·예산을 확인하세요.');
 const buy=tradeQuote(origin.id,id,qty,'buy',{...originContent.markets?.[id],ignoreEvent:true},now,taxRate(originContent,uid,origin.id)).total;
 const sell=tradeQuote(dest.id,id,qty,'sell',{...destContent.markets?.[id],ignoreEvent:true},now,taxRate(destContent,uid,dest.id)).total;
 const gross=Math.max(0,sell-buy),fee=Math.floor(gross/10);
 return {buy,sell,fee,net:gross-fee,affordable:buy<=Math.min(budget,game.money)};
}
export function withdrawBasicIncome(game,content,uid,portId,now){
 if(game.port!==portId||game.voyage)throw Error('해당 항구에서 기본 세수를 수령하세요.');
 const amount=claimBasicIncome(content,portId,uid,ownership(content).ownerUid,now);
 game.money+=amount;
 return {ok:true,message:amount?'기본 세수 '+amount.toLocaleString('ko-KR')+' D 수령':'이 항구의 기본 세수 적립을 시작했어요.'};
}
export function withdrawTax(game,content,uid){const n=content.treasury?.[uid]||0;if(!n)throw Error('인출할 세금이 없어요.');game.money+=n;content.treasury[uid]=0;return {ok:true,total:n};}
