// Static definitions and effect lookup have no dependency on ranking or navigation.
export const TITLES=[
 ['archivist','항해 기록가','foundCount',10,'buyDiscount',.01,'일반 교역품 구매 1% 할인'],
 ['merchant','대상인','profit',500000,'sellBonus',.01,'세후 교역품 판매 +1%'],
 ['treasurer','황금 금고의 주인','money',2000000,'buyDiscount',.005,'일반 교역품 구매 0.5% 할인'],
 ['cosmopolitan','만국의 상인','tradedGoodCount',50,'buyDiscount',.005,'일반 교역품 구매 0.5% 할인'],
 ['broker','큰손 중개인','bestTradeProfit',100000,'sellBonus',.005,'세후 교역품 판매 +0.5%'],
 ['traveler','세계의 손님','visited',50,'seaSpeed',.02,'해상 항해 속도 +2%'],
 ['horizon','수평선의 개척자','explorationPercent',25,'seaSpeed',.02,'해상 항해 속도 +2%'],
 ['renowned','이름난 선장','fame',10000,'guildBonus',.02,'조합 의뢰 두카트 보수 +2%'],
 ['naturalist','바다의 박물학자','foundCount',100,'spotBonus',5,'흔적 관찰 거리 +5해리'],
 ['islander','군도의 길잡이','islandPorts',15,'supplyDiscount',.02,'항구 보급 비용 2% 할인'],
 ['pathfinder','육지의 발자취','shoreCompleted',30,'shoreSpeed',.03,'상륙 이동 시간 3% 단축'],
 ['seeker','잃어버린 흔적의 추적자','rareFinds',10,'spotBonus',5,'흔적 관찰 거리 +5해리'],
 ['admiral','대선단의 선장','fleetGrowth',80,'repairDiscount',.02,'항구 선체 수리 비용 2% 할인'],
 ['harbormaster','항만의 주인','ownedPortCount',3,'supplyDiscount',.02,'항구 보급 비용 2% 할인'],
 ['patron','인재를 모으는 선장','officerCount',10,'guildBonus',.02,'조합 의뢰 두카트 보수 +2%'],
 ['collector','진품 수집가','itemCount',30,'buyDiscount',.005,'일반 교역품 구매 0.5% 할인'],
 ['hunter','해적 사냥꾼','pirateKills',20,'npcDamage',.02,'NPC 해적 포격 피해 +2%'],
 ['victor','바다의 승부사','fleetDefeats',10,'repairDiscount',.02,'항구 선체 수리 비용 2% 할인'],
 ['duelist','결투의 명수','duelWins',10,'repairDiscount',.02,'항구 선체 수리 비용 2% 할인'],
 ['guildmate','조합의 신뢰','guildCompleted',30,'guildBonus',.02,'조합 의뢰 두카트 보수 +2%'],
 ['carrier','수송의 기둥','freightCompleted',20,'sellBonus',.005,'세후 교역품 판매 +0.5%'],
 ['rescuer','바다의 구원자','seaRescues',10,'supplyDiscount',.02,'항구 보급 비용 2% 할인'],
 ['allrounder','팔방의 항해자','overallScore',6000,'seaSpeed',.02,'해상 항해 속도 +2%']
].map(([id,name,metric,target,effect,value,description])=>({id,name,metric,target,effect,value,description}));
export const TITLE_BY_ID=Object.fromEntries(TITLES.map(t=>[t.id,t]));
export function activeTitle(game){const t=TITLE_BY_ID[game?.titles?.active];return t&&Object.hasOwn(game.titles.earned||{},t.id)?t:null;}
export function titleEffect(game,key){
 const title=activeTitle(game);
 if(title)return title.effect===key?title.value:0;
 return !game?.titles&&key==='buyDiscount'&&game?.albumRewards?.title&&game.albumRewards.titleActive===true ? .01 : 0;
}
export function normalizeTitles(game){
 const src=game.titles;
 if(src!==undefined&&(!src||typeof src!=='object'||Array.isArray(src)))throw Error('칭호 기록을 확인하세요.');
 if(src?.earned!==undefined&&(!src.earned||typeof src.earned!=='object'||Array.isArray(src.earned)))throw Error('칭호 획득 기록을 확인하세요.');
 const earned={};
 for(const [id,at]of Object.entries(src?.earned||{})){
  if(!TITLE_BY_ID[id]||!Number.isSafeInteger(at)||at<0)throw Error('칭호 획득 기록을 확인하세요.');
  earned[id]=at;
 }
 if(game.albumRewards?.title)earned.archivist??=0;
 const active=src?src.active||null:game.albumRewards?.titleActive?'archivist':null;
 if(active&&(!TITLE_BY_ID[active]||!Object.hasOwn(earned,active)))throw Error('획득한 칭호를 선택하세요.');
 return {earned,active};
}
