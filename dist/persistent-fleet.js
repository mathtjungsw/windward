import {navigationCheckpoint,routeKey} from './defense-core.js?v=2026.11.10-performance';
import {seaSector} from './presence-core.js?v=2026.11.10-performance';
import {refreshDefense} from './defense-account.js?v=2026.11.10-performance';
export async function connectPersistent(f){const a=f.account,s=f.sdk;f.connectionRef=s.ref(f.db,'gameV2/real/fleetConnections/'+f.uid);const online={session:a.session,online:true,at:s.serverTimestamp()};await s.set(f.connectionRef,online);await s.onDisconnect(f.connectionRef).set({...online,online:false});}
export async function publishPersistent(f,ship,signature,force){
 const a=f.account,s=f.sdk;try{
  if(a.busy||a.economicUncertain)return;if(a.dirty&&(ship.status==='정박'||routeKey(a.readGame().voyage)!==routeKey(JSON.parse(a.record.data).voyage)))await a.flush();if(!a.ready)return;
  const sector=seaSector(ship.position),previousSector=f.publishedSector||a.defenseState?.sector||f.sector,key=f.uid,seq=(f.positionSeq||0)+1,game=a.readGame();
  const checkpoint=navigationCheckpoint(game,a.record,seq),node={name:f.name,uid:f.uid,session:a.session,persistent:true,offline:false,updatedAt:s.serverTimestamp(),lon:+ship.position[0].toFixed(5),lat:+ship.position[1].toFixed(5),angle:Math.round(ship.angle)%360,color:f.color,status:ship.status,shipTier:ship.shipTier??0,fleetCount:ship.fleetCount??1,fleetTiers:ship.fleetTiers||[ship.shipTier??0],positionSeq:seq};
  const changes={['real/fleetIndex/'+sector+'/'+key]:node,['privateNavigation/'+key]:{data:JSON.stringify(checkpoint),baseRevision:a.revision,seq,session:a.session,updatedAt:s.serverTimestamp()},['fleetStates/'+key+'/point']:[...ship.position],['fleetStates/'+key+'/sector']:sector,['fleetStates/'+key+'/portId']:game.port||'',['fleetStates/'+key+'/positionSeq']:seq,['fleetStates/'+key+'/at']:s.serverTimestamp()};
  if(previousSector!==sector)changes['real/fleetIndex/'+previousSector+'/'+key]=null;
  await s.update(s.ref(f.db,'gameV2'),changes);f.positionSeq=seq;f.publishedSector=sector;
  if(f.sector!==sector){await s.onDisconnect(f.selfRef).cancel();f.sector=sector;f.selfRef=s.ref(f.db,`${f.root}/fleetIndex/${sector}/${key}`);await s.onDisconnect(f.selfRef).update({offline:true});f.watchSectors();}if(force)await s.onDisconnect(f.selfRef).update({offline:true});
  if(Date.now()-(f.connectionAt||0)>=30000||force){await s.set(f.connectionRef,{session:a.session,online:true,at:s.serverTimestamp()});f.connectionAt=Date.now();}
  await f.publishSummary();await f.roster.publish(ship,force);f.lastSent=Date.now();f.lastSignature=signature;return true;
 }catch{await refreshDefense(a).catch(()=>{});if(f.active)f.onStatus('error');return false;}
}
export async function disconnectPersistent(f){const s=f.sdk;try{if(f.selfRef){await s.update(f.selfRef,{offline:true});await s.onDisconnect(f.selfRef).cancel();}if(f.connectionRef){await s.set(f.connectionRef,{session:f.account.session,online:false,at:s.serverTimestamp()});await s.onDisconnect(f.connectionRef).cancel();}}catch{}}
