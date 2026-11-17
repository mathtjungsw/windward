import {OFFICERS} from './rumor-catalog.js?v=2026.11.17-harbor-development';
import {RUMOR_BY_ID} from './discoveries-catalog.js?v=2026.11.17-harbor-development';
import {PORT_BY_ID} from './data.js?v=2026.11.17-harbor-development';
import {eraAvailable} from './era-cycle.js?v=2026.11.17-harbor-development';
import {canHearTavernRumor} from './rumor-progress.js?v=2026.11.17-harbor-development';

export function harborOfficerRole(id){
 const entry=OFFICERS.find(row=>row.id===id);
 if(entry?.spotBonus||entry?.shoreBag||entry?.shoreFood||entry?.infoDiscount||entry?.challenge?.proof?.survey)return 'explore';
 if(entry?.sellBonus||entry?.guildBonus||entry?.incomeBonus||entry?.developmentDiscount||entry?.challenge?.proof?.freight)return 'trade';
 if(entry&&Object.keys(entry).some(key=>key.startsWith('npc')||key==='gunUpgradeDiscount'))return 'combat';
 return 'trade';
}
export const HARBOR_ROLE_LABEL={trade:'교역형 · 기본 세수 +5%',explore:'탐험형 · 정박지 주점에 탐험 소문 후보 1건',combat:'전투형 · 방어 포탑 조준 대기 5% 단축'};
export function availableHarborOfficer(content,uid,now){
 const entry=content.harborOfficer,grant=content.harborOperator;
 return uid&&entry?.owner===uid&&!(grant?.until>now&&grant.uid!==uid)?entry:null;
}
export function extraHarborRumor(game,content,uid,now,keepId){
 const station=availableHarborOfficer(content,uid,now),port=PORT_BY_ID[game.port];
 if(!port||station?.role!=='explore'||!canHearTavernRumor(game)||game.harborOfficers?.[port.id]!==station.id)return null;
 const region=port.region;
 const localCandidate=row=>row&&row.portId!==port.id&&PORT_BY_ID[row.portId]?.region===region&&eraAvailable(row,now);
 const kept=RUMOR_BY_ID[keepId];
 if(localCandidate(kept)&&game.rumors?.includes(keepId))return kept;
 return Object.values(RUMOR_BY_ID).find(row=>localCandidate(row)&&!game.rumors?.includes(row.id)&&!game.discoveries?.[row.discoveryId])||null;
}
export function freeRecalledOfficer(game,port){
 if(!game.harborOfficers?.[port])return false;
 delete game.harborOfficers[port];
 if(game.delegateTrade?.origin===port)delete game.delegateTrade;
 return true;
}
