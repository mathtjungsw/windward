// Local-only integration checks: production Firebase is never used.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initialState} from '../dist/engine.js';
import {reserveLoss,combatProfile,openBattle,fireCannon,claimBattle,finishExpired} from '../dist/combat-core.js';
const namespace='demo-windward-economy',base='http://127.0.0.1:9000/',stamp={'.sv':'timestamp'};
function token(uid){const t=Math.floor(Date.now()/1000),enc=o=>Buffer.from(JSON.stringify(o)).toString('base64url');return enc({alg:'none',typ:'JWT'})+'.'+enc({aud:namespace,iss:`https://securetoken.google.com/${namespace}`,sub:uid,user_id:uid,iat:t,exp:t+3600,auth_time:t,firebase:{sign_in_provider:'google.com',identities:{}}})+'.';}
async function req(path,{uid,admin=false,method='GET',body}={}){const u=new URL(path+'.json',base);u.searchParams.set('ns',namespace);if(uid)u.searchParams.set('auth',token(uid));const r=await fetch(u,{method,headers:{'Content-Type':'application/json',...(admin?{Authorization:'Bearer owner'}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:r.status,value:await r.json()};}
const rules=JSON.parse(await readFile(new URL('../firebase.database.rules.json',import.meta.url)));assert.equal((await req('.settings/rules',{admin:true,method:'PUT',body:rules})).status,200);
await req('gameV2',{admin:true,method:'DELETE'});
const games={},records={};
for(const uid of ['a','b','c']){const game=initialState();game.port=null;game.position=[-12,38];game.money=10000;game.cargo={wine:{qty:100,cost:1000}};game.cannons=[{id:'gun',kind:'large',quality:4,shipId:'vessel-0',readyAt:0}];games[uid]=game;records[uid]={schemaVersion:5,revision:1,operationSequence:0,session:'session-'+uid,leaseUntil:Date.now()+90000,data:JSON.stringify(game),updatedAt:stamp};assert.equal((await req('gameV2/privateSaves/'+uid,{uid,method:'PUT',body:records[uid]})).status,200);}
async function prepare(uid,kind,key,content,extras={}){const old=(await req('gameV2/privateSaves/'+uid,{uid})).value,shared=(await req(`gameV2/shared/${kind}/${key}`,{uid})).value||{revision:0};const sequence=old.operationSequence+1,id=uid+':'+sequence,revision=old.revision+1,next={...old,revision,updatedAt:stamp,operationSequence:sequence,data:JSON.stringify(games[uid]),lastOperation:{id,sequence,kind,key,sharedRevision:shared.revision+1}},node={revision:shared.revision+1,content:{...content,_version:1},updatedAt:stamp,lastOperation:{id,uid,sequence,saveRevision:revision}};return {[`privateSaves/${uid}`]:next,[`shared/${kind}/${key}`]:node,...extras};}
const apply=(uid,body)=>req('gameV2',{uid,method:'PATCH',body});
let patch=await prepare('a','ports','porto',{markets:{wine:{pressure:4000,at:Date.now()}}});
assert.equal((await req('gameV2/shared/ports/porto',{uid:'a',method:'PUT',body:patch['shared/ports/porto']})).status,401,'market write requires paired own save');
assert.equal((await req('gameV2/privateSaves/a',{uid:'a',method:'PUT',body:patch['privateSaves/a']})).status,401,'save receipt requires paired market write');
assert.equal((await apply('a',patch)).status,200,'paired trade receipt');assert.equal((await apply('a',patch)).status,401,'operation replay blocked');
const aRace=await prepare('a','ports','porto',{tradeWinner:'a'}),bRace=await prepare('b','ports','porto',{tradeWinner:'b'});const race=await Promise.all([apply('a',aRace),apply('b',bRace)]);assert.deepEqual(race.map(r=>r.status).sort(),[200,401],'one port revision wins a race');
assert.equal((await req('gameV2/privateSaves/b',{uid:'a'})).status,401,'no cross-private reads');
for(const uid of ['a','b']){const reserve=reserveLoss(games[uid],uid+'-reserve');patch=await prepare(uid,'personal',uid,{}, {['combatVaults/'+uid]:reserve});const result=await apply(uid,patch);assert.equal(result.status,200,'deposit with own save: '+JSON.stringify(result.value));const {point,at,...profile}=combatProfile(games[uid],uid,Date.now());assert.equal((await req('gameV2/combatProfiles/'+uid,{uid,method:'PUT',body:{...profile,at:stamp}})).status,200);}
let time=Date.now(),profiles=Object.fromEntries(['a','b'].map(uid=>[uid,combatProfile(games[uid],uid,time)])),reserves=Object.fromEntries(['a','b'].map(uid=>[uid,games[uid].battleReserve]));
let room=openBattle('duel','a','b',profiles,reserves,time);patch=await prepare('a','battles','duel-denied',room,{'combatSlots/a':'duel-denied','combatSlots/b':'duel-denied'});assert.equal((await apply('a',patch)).status,401,'duel requires target invitation');
room=openBattle('free','a','b',profiles,reserves,time);const id='battle-1';patch=await prepare('a','battles',id,room,{'combatSlots/a':id,'combatSlots/b':id});let result=await apply('a',patch);assert.equal(result.status,200,'battle locks both slots and immutable deposits: '+JSON.stringify(result.value));
assert.equal((await req('gameV2/combatSlots/b',{uid:'c',method:'PUT',body:'battle-other'})).status,401,'third party cannot replace participant slot');
assert.equal((await req('gameV2/shared/battles/'+id,{uid:'c'})).status,401,'unrelated captain cannot download battle');
patch=await prepare('b','personal','b',{}, {'combatVaults/b':null});assert.equal((await apply('b',patch)).status,401,'active loser cannot withdraw reserved funds');
for(const uid of ['a','b'])assert.equal((await req(`gameV2/combatPositions/${id}/${uid}`,{uid,method:'PUT',body:{point:[-12,38],at:stamp}})).status,200);
// Altering the immutable deposit would mint a reward; reject it even in a paired request.
const forged=structuredClone(room);forged.reserves.b.money=2000;patch=await prepare('a','battles',id,forged);assert.equal((await apply('a',patch)).status,401);
time=Date.now();fireCannon(room,'a','gun',time,0,{a:{point:[-12,38],at:time},b:{point:[-12,38],at:time}});assert.equal(room.status,'closed');patch=await prepare('a','battles',id,room);result=await apply('a',patch);assert.equal(result.status,200,'shot and defeat: '+JSON.stringify(result.value));
assert.equal((await apply('a',patch)).status,401,'shot cannot replay');
const bad=structuredClone(room);bad.status='active';patch=await prepare('b','battles',id,bad);assert.equal((await apply('b',patch)).status,401,'closed combat cannot reopen');
for(const uid of ['b','a']){claimBattle(games[uid],room,uid,Date.now());patch=await prepare(uid,'battles',id,room,{['combatSlots/'+uid]:null,['combatVaults/'+uid]:null});result=await apply(uid,patch);assert.equal(result.status,200,'claim actual deposit once: '+uid+' '+JSON.stringify(result.value));assert.equal((await apply(uid,patch)).status,401,'claim replay');}
assert.equal(games.a.money+games.b.money,19900);assert.equal((await req('gameV2/combatVaults/a',{uid:'a'})).value,null);assert.equal((await req('gameV2/combatSlots/b',{uid:'b'})).value,null);
// A real invitation allows the receiver to open a boosted duel. Surrender and
// both claims must work even when the ships retained a prior cannon cooldown.
for(const uid of ['a','b']){games[uid].defeatProtectionUntil=0;const reserve=reserveLoss(games[uid],uid+'-duel-reserve');patch=await prepare(uid,'personal',uid,{}, {['combatVaults/'+uid]:reserve});assert.equal((await apply(uid,patch)).status,200);const {point,at,...profile}=combatProfile(games[uid],uid,Date.now());assert.equal((await req('gameV2/combatProfiles/'+uid,{uid,method:'PUT',body:{...profile,at:stamp}})).status,200);}
assert.equal((await req('gameV2/combatInvites/a/b',{uid:'b',method:'PUT',body:{from:'b',name:'b',at:stamp}})).status,200);
time=Date.now();profiles=Object.fromEntries(['a','b'].map(uid=>[uid,combatProfile(games[uid],uid,time)]));reserves=Object.fromEntries(['a','b'].map(uid=>[uid,games[uid].battleReserve]));room=openBattle('duel','a','b',profiles,reserves,time);patch=await prepare('a','battles','duel-accepted',room,{'combatSlots/a':'duel-accepted','combatSlots/b':'duel-accepted'});assert.equal((await apply('a',patch)).status,200,'receiver accepts a fresh invitation');
finishExpired(room,'a',Date.now(),{},true);patch=await prepare('a','battles','duel-accepted',room);assert.equal((await apply('a',patch)).status,200,'surrender closes a duel without firing');
for(const uid of ['a','b']){claimBattle(games[uid],room,uid,Date.now());patch=await prepare(uid,'battles','duel-accepted',room,{['combatSlots/'+uid]:null,['combatVaults/'+uid]:null});assert.equal((await apply(uid,patch)).status,200,'duel settlement '+uid);}
assert.equal(games.a.money+games.b.money,19800,'two actual repair fees, no minted duel rewards');
console.log('PASS: isolated atomic market, concurrency, vaults, two-participant battle, immutable settlement, claims and replay rules');
