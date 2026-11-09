export const RANK_GROUPS=[['trade','교역'],['explore','탐험'],['fleet','선단·경영'],['combat','전투']];
export const RANK_DEFINITIONS=[
 ['profit','무역 이익','trade',' D'],['money','지금 가진 돈','trade',' D'],['tradedGoodCount','교역품 수집왕','trade','종'],['bestTradeProfit','최고의 한 거래','trade',' D'],
 ['visited','방문 도시','explore','곳'],['explorationScore','지도 탐험','explore','%'],['fame','명성','explore',' 명성'],['foundCount','도감 수집왕','explore','종'],['islandPorts','섬 탐험왕','explore','곳'],
 ['fleetGrowth','선단 성장왕','fleet','단계'],['ownedPortCount','항구 경영왕','fleet','곳'],
 ['pirateKills','해적 토벌','combat','척'],['fleetDefeats','선장 선단 격파','combat','회'],['duelWins','결투 승리','combat','승']
].map(([id,label,group,unit])=>({id,label,group,unit}));
export const RANK_METRICS=RANK_DEFINITIONS.map(m=>m.id);
export const RANK_BY_ID=Object.fromEntries(RANK_DEFINITIONS.map(m=>[m.id,m]));
export function formatRankScore(player,metric){if(metric==='explorationScore')return Number(player.explorationPercent??player.explorationScore/10000).toFixed(2)+'%';return Number(player[metric]||0).toLocaleString('ko-KR')+(RANK_BY_ID[metric]?.unit||'');}
