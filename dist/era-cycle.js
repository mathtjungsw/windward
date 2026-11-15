const HOUR=3600000;
export const ERA_PERIOD=48*HOUR;
export const ERAS=[
 {id:1,name:'계절풍의 시대',years:'1400~1479',art:'monsoon',alt:'계절풍 아래의 인도양 항구와 삼각돛 교역선',preview:'인도양의 쌀·날염포와 유향 교역이 활발해져요.'},
 {id:2,name:'대양 개척의 시대',years:'1480~1549',art:'ocean',alt:'희망봉 앞바다를 지나는 돛단배',preview:'향신료와 돛천·삼 로프의 교역 기회가 늘어요.'},
 {id:3,name:'은과 도자기의 시대',years:'1550~1629',art:'silver',alt:'청화백자가 놓인 부두와 정박한 태평양 갤리온',preview:'태평양 양쪽에서 은과 도자기 수요가 높아져요.'},
 {id:4,name:'상단 경쟁의 시대',years:'1630~1700',art:'companies',alt:'해질녘 암스테르담 부두와 상단 창고',preview:'염료와 모피·당밀을 찾는 항구가 늘어요.'}
];
let epoch=null,offset=0;
export function configureEra(start){epoch=Number.isSafeInteger(start)&&start>0?start:null;}
export function setEraServerOffset(milliseconds){offset=Number.isFinite(milliseconds)?milliseconds:0;}
export const eraNow=()=>Date.now()+offset;
export function eraAt(now=eraNow(),start=epoch){
 if(!Number.isSafeInteger(start)||now<start)return null;
 const window=Math.floor((now-start)/ERA_PERIOD);
 return {...ERAS[window%ERAS.length],window,start:start+window*ERA_PERIOD,end:start+(window+1)*ERA_PERIOD,next:ERAS[(window+1)%ERAS.length]};
}
export function eraAvailable(entry,now=eraNow()){
 const era=eraAt(now);
 return !era||!entry.era||entry.era===era.id;
}
