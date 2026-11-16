import {fleetShips,highestOwnedTier,storedShips} from './ship-rules.js?v=2026.11.16-five-eras';

export const NOVICE_MAX_SHIPS=2,NOVICE_MAX_STAGE=10;
export const NOVICE_ATTACK_MESSAGE='초보 선장 보호 중인 선단은 자유 공격을 시작하거나 받을 수 없어요. 합의 결투는 이용할 수 있어요.';
export const ownsOrOwnedPort=rank=>rank?.everOwned===true||rank?.ownedPortCount>0;
export function noviceGraduated(game,...history){
 return game.noviceGraduated===true||history.some(flag=>flag===true)||
  fleetShips(game).length+storedShips(game).length>NOVICE_MAX_SHIPS||highestOwnedTier(game)+1>=NOVICE_MAX_STAGE||
  (game.developedPorts?.length||0)>0;
}
export function markNovice(game,...history){
 game.noviceGraduated=noviceGraduated(game,...history);
 return game.noviceGraduated;
}
export const noviceActive=game=>game?.noviceGraduated===false&&!noviceGraduated(game);
export function nextShipEndsProtection(game,{added=0,stage=0}){
 return noviceActive(game)&&(fleetShips(game).length+storedShips(game).length+added>NOVICE_MAX_SHIPS||stage>=NOVICE_MAX_STAGE);
}

export async function assertFreeCombat(account,target){
 if((account.record?.schemaVersion||0)<12)return;
 const s=account.sdk,read=async path=>(await s.get(s.ref(account.db,'gameV2/'+path))).val();
 const [attackerPorts,targetPorts,graduated]=await Promise.all([
  read('real/portRankings/'+account.uid),read('real/portRankings/'+target),read('privateSaves/'+target+'/noviceGraduated')
 ]);
 if(!account.record.noviceGraduated&&!ownsOrOwnedPort(attackerPorts)||graduated!==true&&!ownsOrOwnedPort(targetPorts))throw Error(NOVICE_ATTACK_MESSAGE);
}
