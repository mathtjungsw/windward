import {discoveryStats} from './discoveries.js?v=2026.11.20-coastal-commissions';
export const HERITAGE_IDS=['ruin-azores','ruin-carthage','ruin-kilwa','ruin-anse','ruin-mahabalipuram','ruin-rapanui','ruin-fortjesus','ruin-sganggwaay'];
export const ALBUM_MILESTONES=[
 {id:'title',count:10,name:'항해 기록가',effect:'일반 교역품 구매 1% 할인 · 칭호에서 선택'},
 {id:'quest',count:25,name:'바다의 유산 조사',effect:'기존 발견 기록 3종 보고 · 완료 보수 500 D'},
 {id:'flag',count:40,name:'수집 기념 깃발',effect:'선단 해상 속도 2% 증가'}
];
export const canReportAlbum=s=>!!s.port&&!s.voyage&&!s.shoreTrip&&!s.seaJob&&!s.battleId&&!s.npcBattle&&!s.raidId;
export function reportHeritage(game,ids){
 const profile=game.albumRewards;
 if(!canReportAlbum(game)||!profile?.quest||profile.questDone)throw Error('의뢰를 수락하고 항구에 정박한 뒤 기록을 보고하세요.');
 const reports=profile.reports||{},selected=[...new Set(ids)];
 if(!selected.length||selected.length>3-Object.keys(reports).length||selected.some(id=>!HERITAGE_IDS.includes(id)||!game.discoveries?.[id]||reports[id]))throw Error('아직 보고하지 않은 내 발견 기록을 최대 남은 수량만큼 선택하세요.');
 profile.reports={...reports,...Object.fromEntries(selected.map(id=>[id,true]))};
 if(Object.keys(profile.reports).length===3){profile.questDone=true;game.money+=500;}
 return {message:profile.questDone?'특별 탐사 완료 · 500 D 수령':'발견 기록 보고 완료'};
}
