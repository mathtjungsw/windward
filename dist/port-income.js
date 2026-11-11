const HOUR=3600000;
const CAP_HOURS=72;
const NEUTRAL=new Set(['lisbon','porto']);
const MAJOR=new Set(['london','amsterdam','venice','alexandria','istanbul','macau','shanghai','nagasaki','havana','buenos','sydney']);

export function basicIncomeRate(content,portId,owner=content.developedOwner||content.ownerUid){
  if(NEUTRAL.has(portId))return 0;
  const base=portId.startsWith('depot-')?500:content.developedOwner?((content.development?.level||0)>=2?1000:500)+(content.advancedSupply?500:0):MAJOR.has(portId)?3000:1000;
  const bonus=owner&&content.officerIncome?.uid===owner?Math.max(0,Math.min(420,content.officerIncome.basis||0)):0;
  return Math.floor(base*(10000+bonus)/10000);
}
function accruedUnits(period,now){
  return Math.min(period.rate*CAP_HOURS*HOUR,period.units+Math.max(0,now-period.at)*period.rate);
}
function validPeriod(period){
  return period&&typeof period.owner==='string'&&Number.isSafeInteger(period.at)&&period.at>=0&&
    Number.isSafeInteger(period.rate)&&period.rate>=500&&period.rate<=3130&&Number.isSafeInteger(period.units)&&period.units>=0;
}
function previousUnits(content,uid){
  const value=content.basicIncome?.previous?.[uid];
  return Number.isSafeInteger(value)&&value>0?value:0;
}
export function initializeBasicIncome(content,portId,owner,at){
  if(!owner||validPeriod(content.basicIncome?.period)||!Number.isSafeInteger(at)||at<0)return false;
  const rate=basicIncomeRate(content,portId,owner);
  if(!rate)return false;
  content.basicIncome={...content.basicIncome,period:{owner,at,rate,units:0}};
  return true;
}
export function estimateBasicIncome(content,portId,uid,owner,now){
  const period=content.basicIncome?.period, own=owner===uid&&basicIncomeRate(content,portId,owner)>0;
  const active=own&&validPeriod(period)&&period.owner===uid;
  return {active,canStart:own&&!active,rate:own?basicIncomeRate(content,portId,owner):0,
    accrued:Math.floor(((active?accruedUnits(period,now):0)+previousUnits(content,uid))/HOUR)};
}
export function advanceBasicIncome(content,portId,owner,now){
  const current=content.basicIncome?.period, rate=owner?basicIncomeRate(content,portId,owner):0;
  if(!rate&&!validPeriod(current))return;
  const ledger=content.basicIncome??={};
  ledger.previous??={};
  if(validPeriod(current)&&current.owner!==owner){
    ledger.previous[current.owner]=Math.min(Number.MAX_SAFE_INTEGER,
      previousUnits(content,current.owner)+accruedUnits(current,now));
  }
  if(rate){
    ledger.period={owner,at:now,rate,units:validPeriod(current)&&current.owner===owner?accruedUnits(current,now):0};
  }else delete ledger.period;
}
export function claimBasicIncome(content,portId,uid,owner,now){
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
