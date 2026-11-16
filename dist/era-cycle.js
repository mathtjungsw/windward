const HOUR=3600000;
export const ERA_PERIOD=24*HOUR;
export const LEGACY_ERA_PERIOD=48*HOUR;
export const ERAS=[
 {id:1,name:'계절풍의 시대',years:'1400~1479',art:'monsoon',alt:'계절풍 아래의 인도양 항구와 삼각돛 교역선',preview:'인도양의 쌀·날염포와 유향 교역이 활발해져요.'},
 {id:2,name:'대양 개척의 시대',years:'1480~1549',art:'ocean',alt:'희망봉 앞바다를 지나는 돛단배',preview:'향신료와 돛천·삼 로프의 교역 기회가 늘어요.'},
 {id:3,name:'은과 도자기의 시대',years:'1550~1629',art:'silver',alt:'청화백자가 놓인 부두와 정박한 태평양 갤리온',preview:'태평양 양쪽에서 은과 도자기 수요가 높아져요.'},
 {id:4,name:'상단 경쟁의 시대',years:'1630~1700',art:'companies',alt:'해질녘 암스테르담 부두와 상단 창고',preview:'염료와 모피·당밀을 찾는 항구가 늘어요.'},
 {id:5,name:'차와 수출 자기의 시대',years:'1701~1750',art:'tea-porcelain',alt:'차 상자와 채색 자기를 목조 범선에 올리는 중국 항구',preview:'차·수출 자기뿐 아니라 대서양의 설탕과 대양 항구의 보급 교역도 활발해져요.'}
];
let epoch=null,cycle=null,offset=0;
export function configureEra(start,next){
 epoch=Number.isSafeInteger(start)&&start>0?start:null;
 cycle=Number.isSafeInteger(next?.at)&&next.at>0&&Number.isInteger(next?.first)&&next.first>=1&&next.first<=ERAS.length?{at:next.at,first:next.first}:null;
}
export function setEraServerOffset(milliseconds){offset=Number.isFinite(milliseconds)?milliseconds:0;}
export const eraNow=()=>Date.now()+offset;
export function eraAt(now=eraNow(),start=epoch){
 if(cycle&&now>=cycle.at){
  const index=Math.floor((now-cycle.at)/ERA_PERIOD),window=cycle.at+index*ERA_PERIOD;
  const active=(cycle.first-1+index)%ERAS.length;
  return {...ERAS[active],version:2,window,start:window,end:window+ERA_PERIOD,next:ERAS[(active+1)%ERAS.length]};
 }
 if(!Number.isSafeInteger(start)||now<start)return null;
 const window=Math.floor((now-start)/LEGACY_ERA_PERIOD),end=start+(window+1)*LEGACY_ERA_PERIOD;
 return {...ERAS[window%4],version:1,window,start:start+window*LEGACY_ERA_PERIOD,end,
  next:cycle?.at===end?ERAS[cycle.first-1]:ERAS[(window+1)%4]};
}
export function eraAvailable(entry,now=eraNow()){
 const era=eraAt(now);
 return !era||!entry.era||entry.era===era.id;
}
