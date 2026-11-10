import {enrollGame} from '../dist/enrollment.js';
import {defenseFromGame} from '../dist/defense-core.js';
import {seaSector} from '../dist/presence-core.js';
import {fleetShips,shipTier} from '../dist/ship-rules.js';
export function buildEnrollment(before,now){
 const root=structuredClone(before||{}),stats={registered:0,alreadyRegistered:0,docked:0,atSea:0,legacyBattles:0};
 root.fleetStates??={};root.combatVaults??={};root.real??={};root.real.fleetIndex??={};
 for(const [uid,record]of Object.entries(root.privateSaves||{})){
  if(record.schemaVersion>=6&&root.fleetStates[uid]){stats.alreadyRegistered++;continue;}
  if(record.schemaVersion>6)throw Error('A newer save requires review.');
  if(root.fleetStates[uid]?.seq>0)throw Error('Unacknowledged battle ledger requires reconciliation.');
  const {game,enrollment}=enrollGame(record,uid),slot=root.combatSlots?.[uid],name=root.accounts?.[uid]?.name||root.real.rankings?.[uid]?.name;
  if(!name)throw Error('Missing captain profile.');
  const next={...record,schemaVersion:6,defenseSeq:0,revision:record.revision+1,data:JSON.stringify(game),enrollment,updatedAt:now};
  const node=defenseFromGame(game,{}, {name,session:record.session,saveRevision:next.revision},now);
  if(slot){node.protected=true;stats.legacyBattles++;}
  root.privateSaves[uid]=next;root.fleetStates[uid]=node;
  if(game.battleReserve)root.combatVaults[uid]=structuredClone(game.battleReserve);
  const sector=seaSector(game.position);root.real.fleetIndex[sector]??={};
  root.real.fleetIndex[sector][uid]={uid,name,session:record.session,persistent:true,offline:true,lon:game.position[0],lat:game.position[1],angle:0,color:0,status:game.port?'정박':'멈춤',shipTier:shipTier(game),fleetCount:game.fleetShips.length,fleetTiers:fleetShips(game).map(p=>p.tier),positionSeq:0,updatedAt:record.updatedAt||now};
  stats.registered++;stats[game.port?'docked':'atSea']++;
 }
 root.config={...(root.config||{}),minSchema:6,offlineProtocol:1};
 root.migrations??={};root.migrations.offlineFleetV1={completedAt:now,version:1};
 return {root,stats};
}
