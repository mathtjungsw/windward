// Isolated rules integration checks. Never connects to the production database.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initialState} from '../dist/engine.js';
const base=new URL('http://127.0.0.1:9000/'),namespace='demo-windward-chat';
const timestamp={'.sv':'timestamp'};
function token(uid,provider='google.com'){const now=Math.floor(Date.now()/1000),enc=o=>Buffer.from(JSON.stringify(o)).toString('base64url');return enc({alg:'none',typ:'JWT'})+'.'+enc({iss:`https://securetoken.google.com/${namespace}`,aud:namespace,iat:now,exp:now+3600,auth_time:now,sub:uid,user_id:uid,firebase:{identities:{},sign_in_provider:provider}})+'.';}
async function req(path,{uid,provider,admin=false,method='GET',body,query={}}={}){const url=new URL(path+'.json',base);url.searchParams.set('ns',namespace);if(uid)url.searchParams.set('auth',token(uid,provider));for(const [k,v]of Object.entries(query))url.searchParams.set(k,JSON.stringify(v));const r=await fetch(url,{method,headers:{'Content-Type':'application/json',...(admin?{Authorization:'Bearer owner'}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:r.status,value:await r.json()};}
assert.equal((await req('.settings/rules',{admin:true,method:'PUT',body:JSON.parse(await readFile(new URL('../firebase.database.rules.json',import.meta.url)))})).status,200);
const uid='world-test-a',other='world-test-b';
{
 const world='real';
 const path=`gameV2/privateSaves/${uid}`,data={...initialState(),world,speed:world==='real'?1:4},record={schemaVersion:4,revision:1,session:'session-1',leaseUntil:Date.now()+60000,updatedAt:timestamp,data:JSON.stringify(data)};
 await req(path,{admin:true,method:'DELETE'});
 assert.equal((await req(path,{uid,method:'PUT',body:record})).status,200,'own save');
 assert.equal((await req(path,{uid:other})).status,401,'another captain cannot read private cargo/exploration');
 assert.equal((await req(path,{})).status,401,'unauthenticated cannot read');
 assert.equal((await req(path,{uid:other,method:'PUT',body:{...record,revision:2}})).status,401,'another captain cannot overwrite');
 assert.equal((await req(path,{uid,method:'PUT',body:record})).status,401,'stale revision rejected');
 assert.equal((await req(path,{uid,method:'PUT',body:{...record,revision:2}})).status,200,'next revision');
 const {schemaVersion,...oldRecord}=record;
 assert.equal((await req(path,{uid,method:'PUT',body:{...oldRecord,revision:3}})).status,401,'old save envelope cannot overwrite current record');
 assert.equal((await req(path,{uid,method:'PUT',body:{...record,schemaVersion:3,revision:3}})).status,401,'pre-conversion client cannot overwrite schema four');
 assert.equal((await req(path,{uid,method:'PUT',body:{...record,revision:3}})).status,200,'schema four advances normally');
 assert.equal((await req(path,{uid,method:'PUT',body:{...record,schemaVersion:2,revision:4}})).status,401,'old client cannot downgrade schema four');
 assert.equal((await req('gameV2/privateSaves/old-new-player',{uid:'old-new-player',method:'PUT',body:{...record,schemaVersion:3}})).status,401,'old client cannot create an unconverted new captain');
 const saved=JSON.parse((await req(path,{uid})).value.data);assert.deepEqual(saved.cargo,{});assert.equal(saved.world,world);
 const rank={name:'검증 선장',money:2400,profit:100,visited:3,updatedAt:timestamp};
 assert.equal((await req(`gameV2/real/rankings/${uid}`,{uid,method:'PUT',body:rank})).status,200);
 assert.equal((await req(`gameV2/real/rankings/${uid}`,{uid,method:'PUT',body:{...rank,visited:124}})).status,200,'all expanded ports are rankable');
 assert.equal((await req(`gameV2/real/rankings/${uid}`,{uid,method:'PUT',body:{...rank,visited:125}})).status,401,'impossible atlas count');
 assert.equal((await req(`gameV2/real/rankings/${uid}`,{uid:other,method:'PUT',body:rank})).status,401);
 assert.equal((await req(`gameV2/real/rankings`,{uid,query:{orderBy:'money',limitToLast:5}})).status,200);
 assert.equal((await req(`gameV2/real/rankings`,{uid})).status,401,'unbounded ranking denied');
 assert.equal((await req(`gameV2/real/rankings`,{uid,query:{orderBy:'profit',limitToLast:1000,startAt:100}})).status,200,'on-demand rank query');
 const modern={...rank,statsVersion:3,saveRevision:4,explorationScore:1000,explorationArea:100000,explorationPercent:.1,foundCount:2,fame:100,shipTier:9,fleetCount:2};
 assert.equal((await req(`gameV2/real/rankings/${uid}`,{uid,method:'PUT',body:modern})).status,200,'new saved summary');
 assert.equal((await req(`gameV2/real/rankings/${uid}`,{uid,method:'PUT',body:{...modern,saveRevision:3}})).status,401,'old summary revision denied');
 assert.equal((await req(`gameV2/real/rankings/${uid}`,{uid,method:'PUT',body:rank})).status,401,'legacy client cannot replace migrated summary');
 for(const [key,value] of [['fame',1000000000001],['explorationScore',1000001],['fleetCount',6],['shipTier',20]])assert.equal((await req(`gameV2/real/rankings/${uid}`,{uid,method:'PUT',body:{...modern,[key]:value}})).status,401,'summary bound '+key);
 assert.equal((await req(`gameV2/real/rankings`,{uid:other,query:{orderBy:'explorationScore',limitToLast:5}})).status,200,'exploration top five');
 assert.equal((await req(`gameV2/real/rankings`,{uid:other,query:{orderBy:'fame',limitToLast:5}})).status,200,'fame top five');
 assert.equal((await req(`gameV2/real/rankings`,{uid:other,query:{orderBy:'$key',limitToFirst:20}})).status,200,'persistent directory page');
 assert.equal((await req(`gameV2/real/rankings`,{uid:other,query:{orderBy:'$key',limitToFirst:21}})).status,401,'directory page limit');
 assert.equal((await req(`gameV2/real/rankings/${uid}`,{uid:other})).status,200,'public captain details');
 assert.equal((await req(`gameV2/real/rankings/${uid}`,{uid,method:'DELETE'})).status,401,'disconnect cannot delete permanent profile');
 const presence={...rank,lon:-9,lat:38,angle:90,color:1,status:'정박'};
 const sector=`gameV2/real/sectors/17_11/${uid}_session-a`;
 assert.equal((await req(sector,{uid,method:'DELETE'})).status,200,'onDisconnect can reserve cleanup before first write');
 assert.equal((await req(sector,{uid,method:'PUT',body:{...presence,uid}})).status,200,'nearby sector position');
 assert.equal((await req(sector,{uid:other,method:'DELETE'})).status,401,'other captain cannot remove sector boat');
 assert.equal((await req(sector,{uid:other,method:'PUT',body:{...presence,uid:other}})).status,401,'other captain cannot replace sector boat');
 assert.equal((await req(`gameV2/real/sectors/17_11`,{uid,query:{orderBy:'updatedAt',limitToLast:100}})).status,200);
 assert.equal((await req(`gameV2/real/sectors/17_11`,{uid})).status,401,'unbounded sector read denied');
 assert.equal((await req(sector,{uid,method:'DELETE'})).status,200,'own presence cleanup');
 const directory=`gameV2/real/captains`,session=`${directory}/${uid}_session-a`,member={uid,name:'검증 선장',color:1,status:'항해',updatedAt:timestamp};
 assert.equal((await req(session,{uid,method:'DELETE'})).status,200,'reserve own captain cleanup before first write');
 assert.equal((await req(session,{uid,method:'PUT',body:member})).status,200,'world-wide name registration');
 assert.equal((await req(directory,{uid:other,query:{orderBy:'updatedAt',limitToLast:100}})).value[uid+'_session-a'].name,'검증 선장','faraway captains can read names without location subscription');
 assert.equal((await req(directory,{uid:other})).status,401,'unbounded directory denied');
 assert.equal((await req(directory,{query:{orderBy:'updatedAt',limitToLast:100}})).status,401,'unauthenticated directory denied');
 assert.equal((await req(session,{uid,method:'PUT',body:{...member,lon:140,lat:35}})).status,401,'coordinates must not enter global names');
 assert.equal((await req(session,{uid,method:'PUT',body:{...member,money:2400}})).status,401,'scores must not enter global names');
 assert.equal((await req(session,{uid:other,method:'PUT',body:{...member,uid:other}})).status,401,'cannot replace another captain name');
 assert.equal((await req(session,{uid:other,method:'DELETE'})).status,401,'cannot remove another session');
 assert.equal((await req(session,{uid,method:'DELETE'})).status,200,'leave removes directory record');
 assert.ok((await req(`gameV2/real/rankings`,{uid,query:{orderBy:'money',limitToLast:5}})).value[uid],'rank persists without presence');
}
assert.equal((await req(`gameV2/accounts/${uid}`,{uid,method:'PUT',body:{name:'검증 선장',seenVersion:'test-v1',updatedAt:timestamp}})).status,200);
assert.equal((await req(`gameV2/accounts/${uid}`,{uid:other})).status,401,'patch acknowledgement private');
assert.equal((await req(`gameV2/accounts/${uid}`,{uid,method:'PATCH',body:{pin:'123456'}})).status,401,'PIN must not be stored');
assert.equal((await req(`gameV2/accounts/${uid}`,{uid})).value.seenVersion,'test-v1');
// Simulate the exact admin cutover and verify that the new save survives.
const legacyPaths=['accounts','privateSaves','worlds','fleet/v1','chat/v1'];
for(const path of legacyPaths){
 assert.equal((await req(path,{admin:true,method:'PUT',body:{old:true}})).status,200);
}
const retained=(await req(`gameV2/privateSaves/${uid}`,{uid})).value;
assert.ok(retained);
const remove=Object.fromEntries(legacyPaths.map(path=>[path,null]));
assert.equal((await req('',{admin:true,method:'PATCH',body:remove})).status,200);
for(const path of legacyPaths)assert.equal((await req(path,{admin:true})).value,null);
assert.deepEqual((await req(`gameV2/privateSaves/${uid}`,{uid})).value,retained);

const legacyProfile={name:'검증 선장',updatedAt:timestamp};
const legacyRank={...legacyProfile,money:2400,profit:0,visited:1};
const legacyBoat={...legacyRank,lon:-9.14,lat:38.72,angle:0,color:0,status:'정박'};
const legacyChat={sequence:1,'messages/1':{seq:1,uid,name:'검증 선장',text:'테스트',at:timestamp},[`lastSent/${uid}`]:timestamp};
for(const provider of ['google.com','password','anonymous']){
 for(const [path,method,body] of [
  [`accounts/${uid}`,'PUT',legacyProfile], [`privateSaves/${uid}/real`,'PUT',retained],
  [`privateSaves/${uid}/peace`,'PUT',retained], [`fleet/v1/${uid}`,'PUT',legacyBoat],
  [`worlds/peace/rankings/${uid}`,'PUT',legacyRank], [`worlds/real/rankings/${uid}`,'PUT',legacyRank],
  ['worlds/real/chat','PATCH',legacyChat], ['chat/v1','PATCH',legacyChat]
 ]){
  assert.equal((await req(path,{uid,provider,method,body})).status,401,path+' must stay closed');
 }
}
for(const provider of ['password','anonymous']){
 assert.equal((await req(`gameV2/privateSaves/${uid}`,{uid,provider})).status,401);
 assert.equal((await req(`gameV2/privateSaves/${uid}`,{uid,provider,method:'PUT',body:{...retained,revision:retained.revision+1,updatedAt:timestamp}})).status,401);
 assert.equal((await req('gameV2/real/captains',{uid,provider,query:{orderBy:'updatedAt',limitToLast:100}})).status,401);
}
assert.equal((await req(`gameV2/peace/rankings/${uid}`,{uid,method:'PUT',body:legacyRank})).status,401);
console.log('Google-only world rules passed: new save retained, legacy paths erased and blocked, owner-only saves and bounded social reads.');
