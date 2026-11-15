import {mergeDefense,defenseFromGame} from './defense-core.js?v=2026.11.15-inland-album';
export async function readDefense(account,uid=account.uid){return (await account.sdk.get(account.sdk.ref(account.db,'gameV2/fleetStates/'+uid))).val();}
export async function refreshDefense(account){if(!account.defenseEnabled||!account.uid||!account.readGame?.())return;const node=await readDefense(account);account.defenseState=node;const game=structuredClone(account.readGame());if(mergeDefense(game,node,Date.now()+(account.serverOffset||0))){account.applyGame?.(game);account.dirty=true;account.cache(game,true);account.onDefense?.(node);}}
export async function publishDefense(account,suppliedGame,observed=account.defenseState){if(!account.defenseEnabled||!account.ready)return;try{const s=account.sdk,game=structuredClone(suppliedGame||account.readGame()),meta={name:account.name,session:account.session,saveRevision:account.revision,nav:account.getNavigation?.()};
 let firstAttempt=true;
 const result=await s.runTransaction(s.ref(account.db,'gameV2/fleetStates/'+account.uid),current=>{
  // The first SDK callback may see an empty local cache despite the completed read.
  const node=firstAttempt?(current??observed):current;
  firstAttempt=false;
  if((node?.seq||0)!==(game.defenseAck?.seq||0))return;
  return {...defenseFromGame(game,node||{},meta,Date.now()+(account.serverOffset||0)),at:s.serverTimestamp()};
 },{applyLocally:false});
 if(result.committed)account.defenseState=result.snapshot.val();else if(!suppliedGame)await refreshDefense(account);return result.committed;}catch{account.onStatus?.('전투 상태 동기화 대기 · 기록은 저장됐어요.');return false;}
}
