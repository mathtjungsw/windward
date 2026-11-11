// This suite uses an isolated local RTDB namespace, never the live world.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {initialState,parseSavedGame} from '../dist/engine.js';
import {syncFleet} from '../dist/ship-rules.js';
import {normalizeRumorProgress} from '../dist/rumor-progress.js';
import {reserveLoss} from '../dist/combat-core.js';
import {defenseFromGame,openOfflineRaid,advanceOfflineRaid,mergeDefense,navigationCheckpoint} from '../dist/defense-core.js';
import {seaSector} from '../dist/presence-core.js';
const ns='demo-windward-defense',stamp={'.sv':'timestamp'},enc=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
function token(uid){const t=Math.floor(Date.now()/1000);return enc({alg:'none',typ:'JWT'})+'.'+enc({aud:ns,iss:'https://securetoken.google.com/'+ns,sub:uid,user_id:uid,iat:t,exp:t+3600,firebase:{sign_in_provider:'google.com',identities:{}}})+'.';}
export async function req(path,{uid,admin=false,method='GET',body,query={}}={}){const u=new URL(path+'.json','http://127.0.0.1:9000/');u.searchParams.set('ns',ns);if(uid)u.searchParams.set('auth',token(uid));for(const [k,v]of Object.entries(query))u.searchParams.set(k,JSON.stringify(v));const r=await fetch(u,{method,headers:{'content-type':'application/json',...(admin?{Authorization:'Bearer owner'}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:r.status,value:await r.json()};}
const rules=JSON.parse(fs.readFileSync(new URL('../firebase.database.rules.json',import.meta.url)));
assert.equal((await req('.settings/rules',{admin:true,method:'PUT',body:rules})).status,200,'rules compile');
function sailor(id,kind='precision',quality=0,hp){const g=initialState();Object.assign(g,{port:null,position:[-17,34],money:1000,cargo:{wine:{qty:20,cost:200}},cannons:[{id:id+'-gun',kind,quality,shipId:'ship',readyAt:0}]});syncFleet(g,[{id:'ship',tier:19}],'ship');if(hp!==undefined)g.hullHP=hp;reserveLoss(g,id+'-bank');return g;}
export let fixture;
export async function reset(options={}){const games={a:sailor('a',options.aKind,options.aQuality,options.aHP),b:sailor('b',options.bKind,options.bQuality,options.bHP),c:sailor('c')},saves={},states={};for(const uid of ['a','b','c']){if(options.docked&&uid==='b')games.b.port='lisbon';const officer=options.officers?.[uid];if(officer){const p=games[uid].rumorProgress=normalizeRumorProgress(games[uid]);p.officers=[officer];p.active=officer;p.officerXP[officer]=1600;}saves[uid]={schemaVersion:6,defenseSeq:0,revision:1,session:uid+'-session',leaseUntil:0,operationSequence:0,data:JSON.stringify(games[uid]),updatedAt:Date.now()};states[uid]=defenseFromGame(games[uid],{}, {name:uid.toUpperCase(),session:uid+'-session',saveRevision:1},Date.now());}
 const root={config:{minSchema:6},accounts:{a:{name:'A'},b:{name:'B'},c:{name:'C'}},privateSaves:saves,fleetStates:states,real:{fleetConnections:{a:{session:'a-session',online:true,at:Date.now()},b:{session:'b-session',online:!!options.bOnline,at:Date.now()},c:{session:'c-session',online:true,at:Date.now()}}}};
 assert.equal((await req('gameV2',{admin:true,method:'PUT',body:root})).status,200);fixture={games,saves,states};return fixture;}
export function patchFor(game,room,result,uid,key,beforeSave,beforeRevision=0){const sequence=beforeSave.operationSequence+1,revision=beforeSave.revision+1,id=uid+'-session:'+sequence;room._version=1;const record={...beforeSave,revision,defenseSeq:game.defenseAck?.seq||0,data:JSON.stringify(game),leaseUntil:Date.now()+90000,updatedAt:stamp,operationSequence:sequence,lastOperation:{id,sequence,kind:'raids',key,sharedRevision:beforeRevision+1}},patch={['privateSaves/'+uid]:record,['shared/raids/'+key]:{revision:beforeRevision+1,content:room,updatedAt:stamp,lastOperation:{id,uid,sequence,saveRevision:revision}}};
 for(const [who,n,changed]of [[room.a,result.actorNode,result.changedActor],[room.b,result.node,result.changedTarget]])if(changed){patch['fleetStates/'+who]={...n,at:stamp};patch['combatSlots/'+who]=room.status==='active'?'raid:'+key:null;if(n.rescuePending){patch['real/fleetIndex/'+seaSector(n.point)+'/'+who]=null;patch['combatVaults/'+who]=null;}}return patch;}
export function first(f,key='raid',uid='a',time=Date.now()){const game=structuredClone(f.games[uid]),o=openOfflineRaid(game,f.states.b,{uid,name:uid.toUpperCase()},{uid:'b',session:'b-session'},key,time),r=advanceOfflineRaid(game,o.room,o.node,uid,{kind:'fire',gunId:uid+'-gun',autoDefense:true},time,[0,0],()=>true,f.states[uid]);return {game,room:o.room,r,patch:patchFor(game,o.room,r,uid,key,f.saves[uid])};}
const apply=(patch,uid='a')=>req('gameV2',{uid,method:'PATCH',body:patch});
let f=await reset(),shot=first(f);
assert.equal((await apply(shot.patch)).status,200,'first shot and automatic defense are one paired operation');
assert.equal((await apply(shot.patch)).status,401,'duplicate receipt cannot replay');
const skilled=first(await reset({officers:{a:'O003',b:'O010'}}),'skilled');
assert.ok(skilled.room.events[0].damage>skilled.room.events[0].damagePotential);
assert.ok(skilled.room.events[1].bonusReload>0);
assert.equal((await apply(skilled.patch)).status,200,'trained attack and shortened offline counterfire pass the same atomic rules');
f=await reset();shot=first(f);assert.equal((await apply(shot.patch)).status,200);
assert.equal((await req('gameV2/privateSaves/b',{uid:'a'})).status,401,'attacker cannot read private target');
assert.equal((await req('gameV2/privateSaves/b',{uid:'a',method:'PATCH',body:{data:'forged'}})).status,401,'attacker cannot overwrite target save');
assert.equal((await req('gameV2/fleetStates',{uid:'a'})).status,401,'no whole-world fleet reads');
assert.equal((await req('gameV2/real/fleetIndex/16_11',{uid:'a'})).status,401,'bounded sector queries only');
const stale={...f.saves.b,revision:2,updatedAt:stamp};assert.equal((await req('gameV2/privateSaves/b',{uid:'b',method:'PUT',body:stale})).status,401,'stale autosave cannot erase received damage');
const bgame=parseSavedGame(f.saves.b.data);mergeDefense(bgame,shot.r.node);const bsave={...f.saves.b,revision:2,defenseSeq:1,data:JSON.stringify(bgame),updatedAt:stamp};assert.equal((await req('gameV2/privateSaves/b',{uid:'b',method:'PUT',body:bsave})).status,200,'defender acknowledges exact ledger sequence');
const contest=first({...f,states:{...f.states,b:fixture.states.b}},'other','c');assert.equal((await apply(contest.patch,'c')).status,401,'second simultaneous attacker cannot replace the active lock');
f=await reset();shot=first(f);const forged=structuredClone(shot.patch);forged['fleetStates/b'].hp=0;assert.equal((await apply(forged)).status,401,'HP must agree with the actual shot');
const badBefore=structuredClone(shot.patch);badBefore['shared/raids/raid'].content.players.b.beforeHP=50;assert.equal((await apply(badBefore)).status,401,'before HP must match canonical state');
const badEvent=structuredClone(shot.patch);badEvent['shared/raids/raid'].content.events[0].damagePotential=9999;assert.equal((await apply(badEvent)).status,401,'first event stats are validated');
const stolen=structuredClone(shot.patch);stolen['fleetStates/a'].cashTotal=1000;assert.equal((await apply(stolen)).status,401,'no premature loot payout');
const erased=structuredClone(shot.patch);delete erased['fleetStates/b'].guns;assert.equal((await apply(erased)).status,401,'cannot erase defender equipment');
f=await reset({docked:true});assert.throws(()=>first(f),/보호/);const dockFake=first(await reset()).patch;await reset({docked:true});assert.equal((await apply(dockFake)).status,401,'server rejects a forged attack on a docked ship');
f=await reset({bOnline:true});shot=first(f);assert.equal((await apply(shot.patch)).status,401,'cannot invent automatic shots for an online captain');
f=await reset({aKind:'large',aQuality:4,bHP:100});shot=first(f);assert.equal(shot.room.status,'closed');assert.equal((await apply(shot.patch)).status,200,'lethal shot pays exactly the losing escrow and stores a safe rescue');
assert.equal((await apply(shot.patch)).status,401,'lethal reward is non-replayable');
// Ordinary schema 5 clients cannot write after the public protocol boundary.
assert.equal((await req('gameV2/privateSaves/c',{uid:'c',method:'PUT',body:{...f.saves.c,schemaVersion:5,revision:2,updatedAt:stamp}})).status,401,'old client blocked');
// Sparse movement packet and logout keep a single UID-keyed ship record.
f=await reset();const g=structuredClone(f.games.a);g.position=[-16.9,34];const cp=navigationCheckpoint(g,f.saves.a,1),sector=seaSector(g.position),row={uid:'a',name:'A',session:'a-session',persistent:true,offline:false,lon:-16.9,lat:34,angle:0,color:0,status:'항해',positionSeq:1,updatedAt:stamp};
const movement={['privateNavigation/a']:{data:JSON.stringify(cp),baseRevision:1,seq:1,session:'a-session',updatedAt:stamp},['real/fleetIndex/'+sector+'/a']:row,'fleetStates/a/point':g.position,'fleetStates/a/sector':sector,'fleetStates/a/positionSeq':1,'fleetStates/a/portId':'','fleetStates/a/at':stamp};
assert.equal((await apply(movement)).status,200,'position and checkpoint commit atomically');
assert.equal((await req('gameV2/real/fleetIndex/'+sector+'/a',{uid:'a',method:'PATCH',body:{offline:true}})).status,200,'logout leaves an offline hull');
const found=await req('gameV2/real/fleetIndex/'+sector,{uid:'b',query:{orderBy:'$key',limitToFirst:100}});assert.equal(found.status,200);assert.equal(found.value.a.offline,true);
const badPosition=structuredClone(movement);badPosition['fleetStates/a/hp']=1;assert.equal((await apply(badPosition)).status,401,'position packet cannot change battle assets');
// New accounts publish their first canonical state without an admin seed.
await reset();await req('gameV2/fleetStates/a',{admin:true,method:'DELETE'});
assert.equal((await req('gameV2/fleetStates/a',{uid:'a',method:'PUT',body:{...fixture.states.a,at:stamp}})).status,200,'first owner publication');
// A defender who reconnects takes over manually; both canonical ledgers change.
f=await reset({aHP:10,bKind:'large',bQuality:4});shot=first(f); // automatic counter would kill; use a miss instead
f=await reset({aHP:10,bKind:'large',bQuality:4});
const activeGame=structuredClone(f.games.a),open=openOfflineRaid(activeGame,f.states.b,{uid:'a',name:'A'},{uid:'b',session:'b-session'},'manual',Date.now());
const step=advanceOfflineRaid(activeGame,open.room,open.node,'a',{kind:'fire',gunId:'a-gun',autoDefense:false},Date.now(),[.99,0],()=>true,f.states.a);
assert.equal((await apply(patchFor(activeGame,open.room,step,'a','manual',f.saves.a))).status,200);
const liveB=structuredClone(f.games.b);mergeDefense(liveB,step.node);const defenderShot=advanceOfflineRaid(liveB,structuredClone(open.room),step.node,'b',{kind:'fire',gunId:'b-gun',autoDefense:false},Date.now(),[0,0],()=>true,step.actorNode);
assert.equal(defenderShot.room.winner,'b');assert.equal(defenderShot.actorNode.rescuePending,true);
assert.equal((await apply(patchFor(liveB,defenderShot.room,defenderShot,'b','manual',f.saves.b,1),'b')).status,200,'manual defender victory commits attacker loss too');
const bankAgain=structuredClone(f.games.c);assert.throws(()=>openOfflineRaid(bankAgain,defenderShot.actorNode,{uid:'c',name:'C'},{uid:'a',session:'a-session'},'reuse',Date.now()+200000),/보호/,'defeated escrow cannot be used by a later attacker');
// Consecutive offline wins reserve only the remaining loot capacity, retaining
// the winner's original escrow principal for a later port return.
f=await reset({aHP:10,bKind:'large',bQuality:4});shot=first(f);assert.equal((await apply(shot.patch)).status,200);assert.equal(shot.r.node.pendingLootCount,2);
f.states.b=shot.r.node;f.states.b.guns['b-gun'].readyAt=0;await req('gameV2/fleetStates/b',{admin:true,method:'PUT',body:f.states.b});f.games.c.hullHP=10;f.states.c=defenseFromGame(f.games.c,{}, {name:'C',session:'c-session',saveRevision:1},Date.now());f.saves.c.data=JSON.stringify(f.games.c);await req('gameV2/fleetStates/c',{admin:true,method:'PUT',body:f.states.c});await req('gameV2/privateSaves/c',{admin:true,method:'PUT',body:f.saves.c});
const second=first(f,'second','c');assert.equal(second.room.players.b.lootRoom,48);assert.equal((await apply(second.patch,'c')).status,200,'second offline win respects pending loot');assert.equal(second.r.node.pendingLootCount,4);assert.equal(second.r.node.cashTotal,200);assert.equal(second.r.node.bank.money,100);

// If the original attacker goes offline after the defender reconnects, the
// same equipment/cooldown rules now apply in the opposite direction too.
f=await reset();const handoffGame=structuredClone(f.games.a),handoff=openOfflineRaid(handoffGame,f.states.b,{uid:'a',name:'A'},{uid:'b',session:'b-session'},'handoff',Date.now()),opening=advanceOfflineRaid(handoffGame,handoff.room,handoff.node,'a',{kind:'fire',gunId:'a-gun',autoDefense:false},Date.now(),[.99,0],()=>true,f.states.a);assert.equal((await apply(patchFor(handoffGame,handoff.room,opening,'a','handoff',f.saves.a))).status,200);
opening.actorNode.guns['a-gun'].readyAt=0;handoff.room.players.a.guns[0].readyAt=0;await req('gameV2/fleetStates/a/guns/a-gun/readyAt',{admin:true,method:'PUT',body:0});await req('gameV2/shared/raids/handoff/content/players/a/guns/0/readyAt',{admin:true,method:'PUT',body:0});
const manualGame=structuredClone(f.games.b);mergeDefense(manualGame,opening.node);const both=advanceOfflineRaid(manualGame,handoff.room,opening.node,'b',{kind:'fire',gunId:'b-gun',autoDefense:true},Date.now(),[0,0],()=>true,opening.actorNode),bothPatch=patchFor(manualGame,handoff.room,both,'b','handoff',f.saves.b,1);assert.deepEqual(both.room.events.map(e=>e.actor),['b','a']);assert.equal((await apply(bothPatch,'b')).status,401,'cannot invent auto fire for a still-online original attacker');await req('gameV2/real/fleetConnections/a',{admin:true,method:'PUT',body:{session:'a-session',online:false,at:Date.now()}});assert.equal((await apply(bothPatch,'b')).status,200,'offline original attacker can defend after actual incoming fire');

// Unarmed defender fields are omitted by RTDB; a later shot must still work.
f=await reset();f.games.b.cannons=[];f.states.b=defenseFromGame(f.games.b,{}, {name:'B',session:'b-session',saveRevision:1},Date.now());await req('gameV2/fleetStates/b',{admin:true,method:'PUT',body:f.states.b});shot=first(f);assert.equal((await apply(shot.patch)).status,200,'unarmed offline defender');
const persisted=(await req('gameV2/shared/raids/raid',{uid:'a'})).value;assert.equal(persisted.content.players.b.guns,undefined);assert.equal(persisted.content.events.length,1);
// Only the equipment clock is advanced by the fixture; no real server battle is used.
persisted.content.players.a.guns[0].readyAt=0;await req('gameV2/shared/raids/raid',{admin:true,method:'PUT',body:persisted});await req('gameV2/fleetStates/a/guns/a-gun/readyAt',{admin:true,method:'PUT',body:0});shot.r.actorNode.guns['a-gun'].readyAt=0;
const unarmed=advanceOfflineRaid(shot.game,persisted.content,shot.r.node,'a',{kind:'fire',gunId:'a-gun',autoDefense:true},Date.now(),[0,0],()=>true,shot.r.actorNode);
assert.equal((await apply(patchFor(shot.game,persisted.content,unarmed,'a','raid',shot.patch['privateSaves/a'],1))).status,200,'subsequent shot after empty-array round trip');
+
console.log('PASS: paired offline raid, dock/session/slot/equipment guards, concurrent attack, stale autosave, one-time escrow, private checkpoint, persistent logout, and old-client boundary.');
