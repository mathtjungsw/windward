export const RETIRED_CANAL='canal-corinth';
export const CANAL_IDS=['canal-suez','canal-panama'];

export function designateCanalPass(game,id){
  if(!CANAL_IDS.includes(id)||!game.rumorProgress?.items?.I052)throw Error('보유한 운하 통행권을 확인하세요.');
  if(game.voyage||game.battleId||game.raidId||game.npcBattle)throw Error('항해나 전투를 마친 뒤 운하를 지정하세요.');
  game.rumorProgress.canalPass=id;
}

export function canalPassDiscount(game,id,price){
  return game.rumorProgress?.canalPass===id&&game.rumorProgress?.items?.I052
    ?Math.min(100,Math.floor(price*.2)):0;
}

export function reserveCanalTolls(game,route,prices){
  const items=game.rumorProgress?.items;
  let useCoupon=!!items?.I052,total=0;
  const passages=(route.passages||[]).map(p=>{
    const price=prices[p.id];
    if(!Number.isSafeInteger(price)||price<0||price>1500)throw Error('운하 통행료를 다시 조회하세요.');
    const discount=useCoupon?canalPassDiscount(game,p.id,price):0;
    if(discount)useCoupon=false;
    const amount=price-discount;
    total+=amount;
    return {...p,amount,paid:false,...(discount?{coupon:true}:{})};
  });
  if(game.money<total)throw Error('선단의 운하 통행료를 예약할 두카트가 부족해요.');
  game.money-=total;
  if(items?.I052&&!useCoupon)items.I052--;
  return {passages,total};
}
export function pendingCanal(voyage){
  return voyage?.passages?.find(p=>!p.paid)||null;
}
export function currentCanal(voyage){
  return voyage?.canal||voyage?.passages?.find(p=>p.paid&&p.end>voyage.travelled+1e-8&&p.start<=voyage.travelled+1e-8)?.id||null;
}
export function refundCanalTolls(game){
  let total=0;
  for(const p of game.voyage?.passages||[]){
    if(p.paid)continue;
    total+=p.amount||0;
    if(p.coupon&&game.rumorProgress?.items)game.rumorProgress.items.I052=(game.rumorProgress.items.I052||0)+1;
    p.paid=true;
  }
  game.money+=total;
  return total;
}
