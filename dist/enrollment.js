import {parseSavedGame} from './engine.js?v=2026.11.14-supply-storage';
import {reserveLoss} from './combat-core.js?v=2026.11.14-supply-storage';

// One-time registration conserves total cash and cargo, including existing
// escrow. It does not award/refund anything or move a captain to a new port.
export function enrollGame(record,uid){
 const game=parseSavedGame(record.data),id='offline-v1:'+uid.slice(0,45)+':'+record.revision;
 if(!game.port&&!game.battleReserve&&!game.battleId&&!game.npcBattle)reserveLoss(game,id);
 return {game,enrollment:{id,sourceRevision:record.revision,sourceData:record.data}};
}

// An old tab can have an unsent navigation snapshot at the exact migration
// boundary. Carry it forward once, retaining the newly separated escrow. A
// later normal save/transaction must never be replaced by that old snapshot.
export function recoverEnrollmentCache(record,cached){
 const e=record?.enrollment;if(!cached?.pending||!e||cached.revision!==e.sourceRevision||record.revision!==e.sourceRevision+1)return null;
 const base=parseSavedGame(e.sourceData),cloud=parseSavedGame(record.data),game=parseSavedGame(cached.data);
 if(base.battleReserve){if(JSON.stringify(game.battleReserve)!==JSON.stringify(base.battleReserve))return null;}
 else if(cloud.battleReserve){
  if(game.battleReserve)return null;const bank=cloud.battleReserve,cargo=JSON.parse(bank.cargoJSON);
  if(game.money<bank.money)return null;
  for(const [id,c]of Object.entries(cargo)){const held=game.cargo[id];if(!held||held.qty<c.qty||held.cost+1e-8<c.cost)return null;}
  game.money-=bank.money;
  for(const [id,c]of Object.entries(cargo)){const held=game.cargo[id];held.qty-=c.qty;held.cost=Math.max(0,held.cost-c.cost);if(!held.qty)delete game.cargo[id];}
  game.battleReserve=structuredClone(bank);
 }
 return game;
}
