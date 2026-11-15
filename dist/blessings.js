export const BLESSING_HOURS=12;
export const BLESSING_MS=BLESSING_HOURS*3600000;
const DAY=86400000,KST=9*3600000;
export const BLESSINGS={
 peace:{name:'전투 금지령',text:'자유 공격·합의 결투·해적 토벌·공개 공방 신규 시작 금지. 진행 중인 전투와 모의전은 계속할 수 있어요.'},
 trade:{name:'자본주의의 축복',text:'항구 교역품 판매 실수령액 +2%.',rate:.02},
 wind:{name:'바람의 축복',text:'바다 자동·직접 항해 속도 +10%.',rate:.10},
 river:{name:'강물의 은혜',text:'강 자동·직접 항해 속도 +15%.',rate:.15},
 harvest:{name:'풍년의 축복',text:'항구의 수동·자동 보급비 −10%.',rate:.10},
 crew:{name:'선원의 축복',text:'정상 항해 중 식량 소모 −10%.',rate:.10},
 lantern:{name:'탐험가의 등불',text:'탐험 흔적 포착 거리 +15해리.',rate:15},
 fame:{name:'기록가의 축복',text:'새 도감 발견 명성 +10%.',rate:.10},
 guild:{name:'조합의 후원',text:'일반 조합 의뢰 완료 보수 +10%.',rate:.10},
 repair:{name:'조선공의 축복',text:'항구 선박 수리비 −15%.',rate:.15},
 caravan:{name:'상단의 축복',text:'새로 예약한 육상 운송의 편도 시간 −15%. 최소 30초.',rate:.15},
 rescue:{name:'구조대의 후원',text:'새로 시작하는 자동 구조의 구조비 −20%.',rate:.20}
};
export const blessingDay=at=>Math.floor((at+KST)/DAY);
export const blessingNextDay=at=>(blessingDay(at)+1)*DAY-KST;
export const withBlessingEnd=record=>record?{...record,end:record.start+BLESSING_MS}:null;
let current=null,previous=null,clock=Date.now;
export const blessingNow=()=>clock();
export const setBlessingClock=source=>{clock=source;};
export function setBlessing(record){
 if(!record){current=previous=null;return;}
 if(current?.start!==record.start)previous=current;
 current=record;
}
export function blessingAt(at=blessingNow()){
 const valid=record=>Object.hasOwn(BLESSINGS,record?.effect)&&record.start<=at&&at<record.end;
 return valid(current)?current:valid(previous)?previous:null;
}
export const blessingRate=(effect,at)=>blessingAt(at)?.effect===effect?BLESSINGS[effect].rate||0:0;
export const blessingBonus=(amount,effect,at)=>Math.floor(amount*blessingRate(effect,at)+1e-9);
export function blessingBoundary(at){
 let next=Infinity;
 for(const record of [previous,current])if(record&&['wind','river','crew'].includes(record.effect)){
  if(record.start>at)next=Math.min(next,record.start);
  if(record.end>at)next=Math.min(next,record.end);
 }
 return next;
}
export function requireCombatAllowed(at){
 if(blessingAt(at)?.effect==='peace')throw Error('전투 금지령이 끝난 뒤 새 전투를 시작할 수 있어요.');
}
export function blessingAvailability(record,at){
 return Math.max(at,record?.end||0,record?.day===blessingDay(at)?blessingNextDay(at):0);
}
