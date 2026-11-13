import {ship,fleetMaxHP,fleetAppraisal} from './ship-rules.js?v=2026.11.14-supply-storage';
import {usedSpace,capacity,usedCargo,supplyCost} from './engine.js?v=2026.11.14-supply-storage';
import {currentHP} from './cannons.js?v=2026.11.14-supply-storage';
import {activeOfficer,couponAmount,consumeCoupon} from './rumor-progress.js?v=2026.11.14-supply-storage';
import {PORT_BY_ID} from './data.js?v=2026.11.14-supply-storage';
import {mapDistance} from './world-wrap.js?v=2026.11.14-supply-storage';
export function repairHull(s){if(!s.port||s.voyage)throw Error('항구에서 수리하세요.');const max=fleetMaxHP(s),missing=max-currentHP(s);if(!missing)throw Error('이미 수리가 끝났어요.');const officer=activeOfficer(s), indian=['인도양','아라비아해','벵골만','라카디브해'].includes(PORT_BY_ID[s.port]?.sea);
 const discount=officer?.repairDiscount||(indian?officer?.indianRepairDiscount||0:0);
 const price=Math.max(1,Math.ceil(Math.min(3000,Math.max(100,fleetAppraisal(s)*.02))*missing/max*(1-discount)));
 const cost=price-couponAmount(s,'repair',price);if(s.money<cost)throw Error('수리할 두카트가 부족해요.');s.money-=cost;s.hullHP=max;consumeCoupon(s,'repair');return {ok:true,cost};}
export function useRepairKit(s,id){
 const p=s.rumorProgress, max=fleetMaxHP(s), hp=currentHP(s);
 if(id!=='I013'||!p?.items[id]||s.battleId||s.npcBattle||s.raidId||s.voyage?.kind||hp<=0)throw Error('전투와 구조가 끝난 뒤 수리 도구를 사용할 수 있어요.');
 if(p.usedRepair)throw Error('정상 입항 전에는 수리 도구를 한 번만 사용할 수 있어요.');
 const repaired=Math.min(max-hp,Math.floor(max*.1));
 if(repaired<=0)throw Error('수리할 선박 손상이 없어요.');
 s.hullHP=hp+repaired;p.items[id]--;p.usedRepair=true;
 return {message:'휴대 수리 완료 · 내구도 +'+repaired};
}
export function coastalAction(s,site,action,now,random){if(s.voyage||s.port||s.npcBattle||s.battleId||mapDistance(s.position,site.point)>10)throw Error('해안 지점 앞 10해리 이내에서 정지하세요.');s.coastalVisits??={};const past=s.coastalVisits[site.id]||{};
 if(action==='supply'){if(past.supplyAt!==undefined&&now-past.supplyAt<86400000)throw Error('이 지점은 24시간마다 보급할 수 있어요.');const amount=Math.max(0,Math.min(2,ship(s).supply-s.food,2*(capacity(s)-usedSpace(s))/s.fleetCount));if(amount<=0)throw Error('보급 한도와 화물 공간을 확인하세요.');const cost=Math.ceil(amount*s.fleetCount*ship(s).supplyPrice*1.5);if(s.money<cost)throw Error('보급할 두카트가 부족해요.');s.money-=cost;s.food+=amount;s.coastalVisits[site.id]={...past,supplyAt:now};return {ok:true,message:`보급 ${amount.toFixed(1)}일 · ${cost} D`};}
 if(action!=='raid'||s.food<.2)throw Error('약탈에 쓸 보급 0.2일분을 확인하세요.');const day=Math.floor((now+32400000)/86400000);s.raidDaily=s.raidDaily?.day===day?s.raidDaily:{day,count:0};if(s.raidDaily.count>=3)throw Error('오늘 약탈 활동 3회를 모두 사용했어요.');s.raidDaily.count++;s.food-=.2;const success=random<.7;
 if(success){s.money+=200;return {ok:true,message:'해적의 방치 보급품 발견 · 200 D'};}
 const damage=Math.ceil(fleetMaxHP(s)*.15),cash=Math.min(500,Math.floor(s.money*.05));s.money-=cash;s.hullHP=Math.max(0,currentHP(s)-damage);let left=Math.min(3,Math.floor(usedCargo(s)*.05)),lost=left;for(const id of Object.keys(s.cargo).sort()){if(!left)break;const c=s.cargo[id],qty=Math.min(left,c.qty),cost=c.cost*qty/c.qty;c.qty-=qty;c.cost-=cost;left-=qty;if(!c.qty)delete s.cargo[id];}
 return {ok:true,broken:s.hullHP===0,message:`약탈 실패 · 내구도 −${damage}, ${cash} D·화물 ${lost}상자 손실`};
}
export function playDice(s,choice,bet,now,roll){if(!['macau','venice'].includes(s.port)||s.voyage)throw Error('마카오·베네치아에 입항하세요.');if(!['odd','even'].includes(choice)||!Number.isInteger(bet)||bet<10||bet>500||bet%10||s.money<bet)throw Error('10~500 D, 10 D 단위 베팅을 확인하세요.');if(now-(s.diceAt||0)<5000)throw Error('5초 뒤 다시 이용할 수 있어요.');if(!Number.isInteger(roll)||roll<1||roll>6)throw Error('주사위 결과를 확인하세요.');const won=roll%2===(choice==='odd'?1:0),payout=won?Math.floor(bet*1.9):0;s.money+=payout-bet;s.diceAt=now;s.lastDice={roll,bet,choice,payout,at:now};return {ok:true,...s.lastDice,message:`주사위 ${roll} · ${won?payout+' D 지급':'베팅금 손실'}`};}
