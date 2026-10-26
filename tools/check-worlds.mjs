// Isolated rules integration checks. Never connects to the production database.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initialState} from '../dist/engine.js';
const base=new URL('http://127.0.0.1:9000/'),namespace='demo-windward-chat';
const timestamp={'.sv':'timestamp'};
function token(uid){const now=Math.floor(Date.now()/1000),enc=o=>Buffer.from(JSON.stringify(o)).toString('base64url');return enc({alg:'none',typ:'JWT'})+'.'+enc({iss:`https://securetoken.google.com/${namespace}`,aud:namespace,iat:now,exp:now+3600,auth_time:now,sub:uid,user_id:uid,firebase:{identities:{},sign_in_provider:'password'}})+'.';}
async function req(path,{uid,admin=false,method='GET',body,query={}}={}){const url=new URL(path+'.json',base);url.searchParams.set('ns',namespace);if(uid)url.searchParams.set('auth',token(uid));for(const [k,v]of Object.entries(query))url.searchParams.set(k,JSON.stringify(v));const r=await fetch(url,{method,headers:{'Content-Type':'application/json',...(admin?{Authorization:'Bearer owner'}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:r.status,value:await r.json()};}
assert.equal((await req('.settings/rules',{admin:true,method:'PUT',body:JSON.parse(await readFile(new URL('../firebase.database.rules.json',import.meta.url)))})).status,200);
const uid='world-test-a',other='world-test-b';
for(const world of ['peace','real']){
 const path=`privateSaves/${uid}/${world}`,data={...initialState(),world,speed:world==='real'?1:4},record={revision:1,session:'session-1',leaseUntil:Date.now()+60000,updatedAt:timestamp,data:JSON.stringify(data)};
 await req(path,{admin:true,method:'DELETE'});
 assert.equal((await req(path,{uid,method:'PUT',body:record})).status,200,'own save');
 assert.equal((await req(path,{uid:other})).status,401,'another captain cannot read private cargo/exploration');
 assert.equal((await req(path,{})).status,401,'unauthenticated cannot read');
 assert.equal((await req(path,{uid:other,method:'PUT',body:{...record,revision:2}})).status,401,'another captain cannot overwrite');
 assert.equal((await req(path,{uid,method:'PUT',body:record})).status,401,'stale revision rejected');
 assert.equal((await req(path,{uid,method:'PUT',body:{...record,revision:2}})).status,200,'next revision');
 const saved=JSON.parse((await req(path,{uid})).value.data);assert.deepEqual(saved.cargo,{});assert.equal(saved.world,world);
 const rank={name:'검증 선장',money:2400,profit:100,visited:3,updatedAt:timestamp};
 assert.equal((await req(`worlds/${world}/rankings/${uid}`,{uid,method:'PUT',body:rank})).status,200);
 assert.equal((await req(`worlds/${world}/rankings/${uid}`,{uid:other,method:'PUT',body:rank})).status,401);
 assert.equal((await req(`worlds/${world}/rankings`,{uid,query:{orderBy:'money',limitToLast:5}})).status,200);
 assert.equal((await req(`worlds/${world}/rankings`,{uid})).status,401,'unbounded ranking denied');
 assert.equal((await req(`worlds/${world}/rankings`,{uid,query:{orderBy:'profit',limitToLast:1000,startAt:100}})).status,200,'on-demand rank query');
 const presence={...rank,lon:-9,lat:38,angle:90,color:1,status:'정박'};
 assert.equal((await req(`worlds/${world}/presence/${uid}`,{uid,method:'PUT',body:presence})).status,200);
 assert.equal((await req(`worlds/${world}/presence/${uid}`,{uid,method:'DELETE'})).status,200);
 const sector=`worlds/${world}/sectors/17_11/${uid}_session-a`;
 assert.equal((await req(sector,{uid,method:'DELETE'})).status,200,'onDisconnect can reserve cleanup before first write');
 assert.equal((await req(sector,{uid,method:'PUT',body:{...presence,uid}})).status,200,'nearby sector position');
 assert.equal((await req(sector,{uid:other,method:'DELETE'})).status,401,'other captain cannot remove sector boat');
 assert.equal((await req(sector,{uid:other,method:'PUT',body:{...presence,uid:other}})).status,401,'other captain cannot replace sector boat');
 assert.equal((await req(`worlds/${world}/sectors/17_11`,{uid,query:{orderBy:'updatedAt',limitToLast:100}})).status,200);
 assert.equal((await req(`worlds/${world}/sectors/17_11`,{uid})).status,401,'unbounded sector read denied');
 assert.equal((await req(sector,{uid,method:'DELETE'})).status,200,'own presence cleanup');
 assert.ok((await req(`worlds/${world}/rankings`,{uid,query:{orderBy:'money',limitToLast:5}})).value[uid],'rank persists without presence');
}
assert.equal((await req(`accounts/${uid}`,{uid,method:'PUT',body:{name:'검증 선장',seenVersion:'test-v1',updatedAt:timestamp}})).status,200);
assert.equal((await req(`accounts/${uid}`,{uid:other})).status,401,'patch acknowledgement private');
assert.equal((await req(`accounts/${uid}`,{uid,method:'PATCH',body:{pin:'123456'}})).status,401,'PIN must not be stored');
assert.equal((await req(`accounts/${uid}`,{uid})).value.seenVersion,'test-v1');
const peaceMessages='worlds/peace/chat';
await req(peaceMessages,{admin:true,method:'DELETE'});await req('worlds/real/chat',{admin:true,method:'DELETE'});
assert.equal((await req(peaceMessages,{uid,method:'PATCH',body:{sequence:1,'messages/1':{seq:1,uid,name:'검증 선장',text:'평화 세계 테스트',at:timestamp},[`lastSent/${uid}`]:timestamp}})).status,200);
assert.equal((await req('worlds/real/chat/messages',{uid,query:{orderBy:'seq',limitToLast:50}})).value,null,'chat isolation');
assert.equal((await req('worlds/peace/chat/messages',{uid,query:{orderBy:'seq',limitToLast:50}})).value[1].text,'평화 세계 테스트');
console.log('World rules passed: owner-only private saves, revision conflicts, persistent rankings, bounded ranking reads, patch acknowledgement, no stored PIN and separate world chat.');
