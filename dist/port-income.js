import {equityEnabled} from './port-equity.js?v=2026.11.20-inland-map-visibility';
const HOUR=3600000;
const CAP_HOURS=72;
const NEUTRAL=new Set(['lisbon','porto']);
const MAJOR=new Set(['london','amsterdam','venice','alexandria','istanbul','macau','shanghai','nagasaki','havana','buenos','sydney']);
let dividendStart=0;
export function configurePortDividends(at){
  dividendStart=Number.isSafeInteger(at)&&at>0?at:0;
}
export function dividendsEnabled(portId,now,content){
  if(equityEnabled(content))return now>=content.equitySince;
  if(portId.startsWith('depot-'))return (content?.promotion?.level||0)>0;
  return dividendStart>0&&now>=dividendStart&&!NEUTRAL.has(portId)&&!portId.startsWith('depot-')&&!portId.startsWith('developed-');
}
const cleanAmount=value=>Math.round(value*1e6)/1e6;
const assets=(content)=>Object.entries(content.investors||{}).filter(([,amount])=>Number.isSafeInteger(amount)&&amount>0);
export function dividendRate(content,portId){
  const total=assets(content).reduce((sum,[,amount])=>sum+amount,0);
  if(equityEnabled(content)){
    const base=portId.startsWith('depot-')?(content.promotion?.level>=2?1000:500):(content.development?.level>=2?1000:500)+(content.advancedSupply?500:0);
    const boost=Math.min(.5,total/200000*.05);return {total,boost,rate:total?base*(1+boost):0};
  }
  if(portId.startsWith('depot-'))return {total,boost:0,rate:total?(content.promotion?.level>=2?1000:500):0};
  const base=MAJOR.has(portId)?3000:1000;
  const boost=Math.min(.5,total/(MAJOR.has(portId)?600000:200000)*.05);
  return {total,boost,rate:total?base*(1+boost):0};
}
function dividendRates(content,id,owner,now){
  const {total,rate}=dividendRate(content,id);
  if(!total)return {};
  const rates=Object.fromEntries(assets(content).map(([uid,amount])=>[uid,rate*(amount/total)]));
  const base=equityEnabled(content)?(id.startsWith('depot-')?(content.promotion?.level>=2?1000:500):(content.development?.level>=2?1000:500)+(content.advancedSupply?500:0)):MAJOR.has(id)?3000:1000;
  if(owner)rates[owner]=(rates[owner]||0)+Math.max(0,basicIncomeRate(content,id,owner,now)-base);
  return rates;
}
function accountAt(content,uid,rate,at,now){
  const pending=content.taxDividend?.basic?.[uid]||0;
  return cleanAmount(pending+Math.max(0,Math.min(rate*CAP_HOURS-Math.max(0,pending),rate*Math.max(0,now-at)/HOUR)));
}
function advanceDividends(content,id,owner,now){
  const start=content.equitySince??content.promotion?.startedAt??dividendStart;
  const ledger=content.taxDividend??={at:start};
  if(!ledger.rates){
    const legacy=content.basicIncome?.period;
    if(validPeriod(legacy)){
      const old=content.basicIncome.previous??={};
      old[legacy.owner]=previousUnits(content,legacy.owner)+currentUnits(content,id,legacy,Math.max(start,legacy.at));
      delete content.basicIncome.period;
    }
  }
  const rates=ledger.rates||dividendRates(content,id,owner,now);
  const at=ledger.at;
  ledger.basic??={};
  for(const [uid,rate] of Object.entries(rates)){
    const value=accountAt(content,uid,rate,at,now);
    if(value)ledger.basic[uid]=value;
  }
  ledger.at=Math.max(at,now);
  ledger.rates=dividendRates(content,id,owner,now);
}
function addTradeDividend(content,uid,amount){
  if(!amount)return;
  const ledger=content.taxDividend;
  ledger.trade??={};
  ledger.trade[uid]=cleanAmount((ledger.trade[uid]||0)+amount);
}
export function creditTradeDividends(content,id,owner,amount,now){
  advanceDividends(content,id,owner,now);
  const {total}=dividendRate(content,id);
  if(!total)return;
  const operator=content.harborOperator?.until>now?content.harborOperator.uid:null;
  const service=operator&&operator!==owner?Math.floor(amount*.25):0;
  if(service)addTradeDividend(content,operator,service);
  for(const [uid,capital] of assets(content))addTradeDividend(content,uid,(amount-service)*(capital/total));
}
export const pendingTradeTax=(content,uid)=>Math.max(0,Math.round((content.treasury?.[uid]||0)+(content.taxDividend?.trade?.[uid]||0)));
export function claimTradeTax(content,uid){
  const amount=pendingTradeTax(content,uid);
  if(!amount)return 0;
  const legacy=content.treasury?.[uid]||0;
  if(legacy)content.treasury[uid]=0;
  if(content.taxDividend){
    const trade=content.taxDividend.trade??={};
    const remainder=cleanAmount(legacy+(trade[uid]||0)-amount);
    if(remainder)trade[uid]=remainder;
    else delete trade[uid];
  }
  return amount;
}

export function basicIncomeRate(content,portId,owner=content.developedOwner||content.ownerUid,now=Date.now()){
  if(NEUTRAL.has(portId))return 0;
  const base=portId.startsWith('depot-')?(equityEnabled(content)&&content.promotion?.level>=2?1000:500):content.developedOwner?((content.development?.level||0)>=2?1000:500)+(content.advancedSupply?500:0):MAJOR.has(portId)?3000:1000;
  const bonus=owner&&content.officerIncome?.uid===owner?Math.max(0,Math.min(420,content.officerIncome.basis||0)):0;
  const capital=Object.values(content.investors||{}).reduce((sum,n)=>sum+(Number.isSafeInteger(n)&&n>0?n:0),0);
  const threshold=MAJOR.has(portId)?3000000:1000000;
  const developed=capital+Math.min(content.growthContribution||0,threshold*.2)>=threshold;
  const tourism=owner&&developed&&content.domestic?.kind==='tourism'?Math.min(200,Math.floor(base/10)):0;
  const grant=content.harborOperator,officer=content.harborOfficer;
  const station=owner&&officer?.owner===owner&&(!officer.role||officer.role==='trade')&&!(grant?.until>now&&grant.uid!==owner)?Math.floor(base*.05):0;
  return Math.floor(base*(10000+bonus)/10000)+tourism+station;
}
function accruedUnits(period,now){
  return Math.min(period.rate*CAP_HOURS*HOUR,period.units+Math.max(0,now-period.at)*period.rate);
}
function currentUnits(content,id,period,now){
 const until=content.harborOperator?.until;
 if(until>period.at&&until<now&&basicIncomeRate(content,id,period.owner,until)!==period.rate){
  const rate=basicIncomeRate(content,id,period.owner,until);
  return Math.min(rate*CAP_HOURS*HOUR,accruedUnits(period,until)+(now-until)*rate);
 }
 return accruedUnits(period,now);
}
function validPeriod(period){
  return period&&typeof period.owner==='string'&&Number.isSafeInteger(period.at)&&period.at>=0&&
    Number.isSafeInteger(period.rate)&&period.rate>=500&&period.rate<=3480&&Number.isSafeInteger(period.units)&&period.units>=0;
}
function previousUnits(content,uid){
  const value=content.basicIncome?.previous?.[uid];
  return Number.isSafeInteger(value)&&value>0?value:0;
}
export function initializeBasicIncome(content,portId,owner,at){
  if(!owner||validPeriod(content.basicIncome?.period)||!Number.isSafeInteger(at)||at<0)return false;
  const rate=basicIncomeRate(content,portId,owner,at);
  if(!rate)return false;
  content.basicIncome={...content.basicIncome,period:{owner,at,rate,units:0}};
  return true;
}
export function estimateBasicIncome(content,portId,uid,owner,now){
  if(dividendsEnabled(portId,now,content)){
    const ledger=content.taxDividend;
    const legacy=content.basicIncome?.period;
    const start=content.equitySince??content.promotion?.startedAt??dividendStart;
    const oldUnits=previousUnits(content,uid)+(validPeriod(legacy)&&legacy.owner===uid?currentUnits(content,portId,legacy,Math.max(start,legacy.at)):0);
    const rate=dividendRates(content,portId,owner,now)[uid]||0;
    const amount=accountAt(content,uid,ledger?.rates?.[uid]??(ledger?0:rate),ledger?.at??start,now);
    return {active:rate>0,canStart:false,rate,accrued:Math.max(0,Math.round(amount+oldUnits/HOUR))};
  }
  const period=content.basicIncome?.period, own=owner===uid&&basicIncomeRate(content,portId,owner,now)>0;
  const active=own&&validPeriod(period)&&period.owner===uid;
  return {active,canStart:own&&!active,rate:own?basicIncomeRate(content,portId,owner,now):0,
    accrued:Math.floor(((active?currentUnits(content,portId,period,now):0)+previousUnits(content,uid))/HOUR)};
}
export function advanceBasicIncome(content,portId,owner,now){
  if(dividendsEnabled(portId,now,content))return advanceDividends(content,portId,owner,now);
  const current=content.basicIncome?.period, rate=owner?basicIncomeRate(content,portId,owner,now):0;
  if(!rate&&!validPeriod(current))return;
  const ledger=content.basicIncome??={};
  ledger.previous??={};
  if(validPeriod(current)&&current.owner!==owner){
    ledger.previous[current.owner]=Math.min(Number.MAX_SAFE_INTEGER,
      previousUnits(content,current.owner)+currentUnits(content,portId,current,now));
  }
  if(rate){
    ledger.period={owner,at:now,rate,units:validPeriod(current)&&current.owner===owner?currentUnits(content,portId,current,now):0};
  }else delete ledger.period;
}
export function claimBasicIncome(content,portId,uid,owner,now){
  if(dividendsEnabled(portId,now,content)){
    advanceDividends(content,portId,owner,now);
    const ledger=content.taxDividend,old=previousUnits(content,uid)/HOUR;
    const due=cleanAmount((ledger.basic?.[uid]||0)+old);
    const amount=Math.max(0,Math.round(due));
    if(!amount)throw Error('수령할 기본 세수가 없어요.');
    if(content.basicIncome?.previous)delete content.basicIncome.previous[uid];
    ledger.basic[uid]=cleanAmount(due-amount);
    return amount;
  }
  const status=estimateBasicIncome(content,portId,uid,owner,now);
  if(!status.canStart&&!status.accrued)throw Error('수령할 기본 세수가 없어요.');
  advanceBasicIncome(content,portId,owner,now);
  const ledger=content.basicIncome, period=ledger.period;
  let due=status.accrued*HOUR;
  const old=previousUnits(content,uid), fromOld=Math.min(old,due);
  if(old>fromOld)ledger.previous[uid]=old-fromOld;
  else delete ledger.previous[uid];
  due-=fromOld;
  if(due>0&&period?.owner===uid)period.units-=due;
  return status.accrued;
}
export function setIncomeOfficer(game,content,portId,uid,owner,now,basis){
  if(basis&&(owner!==uid||game.port!==portId||game.incomeOfficerPort&&game.incomeOfficerPort!==portId))throw Error('본인 소유 항구에 정박하고 기존 배정을 해제하세요.');
  advanceBasicIncome(content,portId,owner,now);
  if(basis){
    game.incomeOfficerPort=portId;
    content.officerIncome={uid,basis};
  }else{
    if(content.officerIncome?.uid===uid)delete content.officerIncome;
    delete game.incomeOfficerPort;
  }
  advanceBasicIncome(content,portId,owner,now);
  return {message:basis?'부선장을 이 항구의 기본 세수에 배정했어요.':'부선장의 항구 배정을 해제했어요.'};
}
