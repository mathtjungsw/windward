// Real rules, isolated emulator: enter -> save -> roster registration -> rankings.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {CaptainAccount} from '../dist/account.js';
import {CaptainRoster} from '../dist/captains.js';
import {initialState} from '../dist/engine.js';
import {defenseFromGame} from '../dist/defense-core.js';
import {gameStats} from '../dist/public-stats.js';
import {normalizeRumorProgress} from '../dist/rumor-progress.js';
import {combatProfile} from '../dist/combat-core.js';
const ns='demo-windward-session',uid='session-captain',stamp={'.sv':'timestamp'},enc=o=>Buffer.from(JSON.stringify(o)).toString('base64url'),t=Math.floor(Date.now()/1000),token=enc({alg:'none',typ:'JWT'})+'.'+enc({aud:ns,iss:'https://securetoken.google.com/'+ns,sub:uid,user_id:uid,iat:t,exp:t+3600,firebase:{sign_in_provider:'google.com',identities:{}}})+'.';
async function req(path,{admin=false,method='GET',body,query={}}={}){const u=new URL(path+'.json','http://127.0.0.1:9000/');u.searchParams.set('ns',ns);if(!admin)u.searchParams.set('auth',token);for(const[k,v]of Object.entries(query))u.searchParams.set(k,JSON.stringify(v));const r=await fetch(u,{method,headers:{'content-type':'application/json',...(admin?{Authorization:'Bearer owner'}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:r.status,value:await r.json()};}
assert.equal((await req('.settings/rules',{admin:true,method:'PUT',body:JSON.parse(fs.readFileSync(new URL('../firebase.database.rules.json',import.meta.url)))})).status,200);
const original=initialState(),record={schemaVersion:6,defenseSeq:0,revision:10,session:'old',operationSequence:3,lastOperation:{id:'old:3',sequence:3,kind:'ports',key:'lisbon',sharedRevision:5},data:JSON.stringify(original),leaseUntil:0,updatedAt:Date.now()},node=defenseFromGame(original,{}, {name:'검증',session:'old',saveRevision:10});
await req('gameV2',{admin:true,method:'PUT',body:{config:{minSchema:10},accounts:{[uid]:{name:'검증',updatedAt:Date.now()}},privateSaves:{[uid]:record},fleetStates:{[uid]:node}}});
assert.equal((await req('gameV2/corinthRefunds/'+uid,{admin:true,method:'PUT',body:{amount:840000}})).status,200);
assert.equal((await req('gameV2/corinthRefunds/'+uid,{method:'PUT',body:{amount:1}})).status,401);
const staleSave=await req('gameV2/privateSaves/'+uid,{method:'PUT',body:{...record,schemaVersion:9,revision:11,updatedAt:stamp}});
assert.equal(staleSave.status,401,'the previous client cannot overwrite a save during rollout');
const snap=value=>({val:()=>value,forEach:fn=>Object.entries(value||{}).forEach(([key,v])=>fn({key,val:()=>v}))}),sdk={ref:(_,p)=>p,serverTimestamp:()=>stamp,get:async p=>{const r=await req(p);assert.equal(r.status,200,p);return snap(r.value);},onValue:()=>()=>{},runTransaction:async(p,fn)=>{const r=await req(p);assert.equal(r.status,200);const value=fn(r.value);if(value===undefined)return {committed:false,snapshot:snap(r.value)};const result=await req(p,{method:'PUT',body:value});assert.equal(result.status,200,p+' transaction');return {committed:true,snapshot:snap(result.value)};},set:async(p,v)=>{const r=await req(p,{method:'PUT',body:v});assert.equal(r.status,200,p);},query:(p,...filters)=>({path:p,filters}),orderByChild:x=>x,startAt:x=>x,limitToLast:x=>x,onDisconnect:p=>({remove:async()=>{assert.equal((await req(p,{method:'DELETE'})).status,200,'disconnect registration path must be authorized');}})};
Object.defineProperty(navigator,'onLine',{value:true,configurable:true});const cache=new Map(),a=new CaptainAccount({getItem:k=>cache.get(k)||null,setItem:(k,v)=>cache.set(k,v)},'new-session');a.sdk=sdk;a.defenseEnabled=true;let game;const messages=[];a.readGame=()=>game;a.applyGame=g=>game=g;a.onStatus=m=>messages.push(m);game=await a.enter({uid},{name:'검증'});clearInterval(a.timer);game.money+=7;a.save(game);await a.flush();assert.equal(a.dirty,false);assert.equal(a.lost,false);assert.ok(messages.includes('클라우드 저장 완료'));assert.ok(!messages.some(m=>m.includes('연결 확인')));assert.equal(JSON.parse((await req('gameV2/privateSaves/'+uid)).value.data).money,original.money+840007);
game=await a.enter({uid},{name:'검증'});clearInterval(a.timer);assert.equal(game.money,original.money+840007,'refund credited once');
// Permanent map key is UID. Membership key must still include the session.
const f={account:a,uid,shipKey:uid,root:'gameV2/real',sdk,active:true,connected:true,color:0,name:a.name,onChange:()=>{}},roster=new CaptainRoster(f);roster.connect();assert.equal(roster.selfRef,'gameV2/real/captains/'+uid+'_new-session');await roster.prepareDisconnect();await roster.publish({status:'정박'},true);const members=await req('gameV2/real/captains',{query:{orderBy:'updatedAt',limitToLast:100}});assert.equal(members.status,200);assert.ok(members.value[uid+'_new-session']);
await sdk.set('gameV2/real/rankings/'+uid,{...gameStats(game),name:a.name,saveRevision:a.revision,updatedAt:stamp,lastSeenAt:stamp});const ranks=await req('gameV2/real/rankings',{query:{orderBy:'profit',startAt:-1e12,limitToLast:5}});assert.equal(ranks.status,200);assert.ok(ranks.value[uid]);
assert.equal((await req('gameV2/privateSaves/'+uid)).value.schemaVersion,10);
console.log('PASS: previous saves migrate to schema 10, outdated writes are rejected, and cloud save, online roster and rankings work.');

// Story reward officers must be accepted by both canonical and public combat state.
// This exercises actual enter() and save() instead of just matching a rule string.
for(const officer of ['OS01','OS02']){
 const prior=initialState(),progress=prior.rumorProgress=normalizeRumorProgress(prior);
 progress.officers=[officer];progress.active=officer;progress.officerXP[officer]=1600;
 const oldSave={...record,schemaVersion:8,data:JSON.stringify(prior)};
 const oldFleet=defenseFromGame(prior,{}, {name:'이야기 검증',session:'old',saveRevision:oldSave.revision});
 await req('gameV2',{admin:true,method:'PUT',body:{config:{minSchema:10},accounts:{[uid]:{name:'이야기 검증'}},privateSaves:{[uid]:oldSave},fleetStates:{[uid]:oldFleet}}});
 const memory=new Map(),account=new CaptainAccount({getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)},'story-'+officer);
 account.sdk=sdk;account.defenseEnabled=true;let current;
 account.readGame=()=>current;account.applyGame=value=>current=value;
 try{
  current=await account.enter({uid},{name:'이야기 검증'});
  assert.equal(account.ready,true,officer+' can log in');
  assert.equal(current.rumorProgress.active,officer);
  assert.ok((await req('gameV2/fleetStates/'+uid)).value.skill.startsWith(officer+':'));
  current.money+=3;account.save(current);await account.flush();
  assert.equal(account.dirty,false,officer+' can save');
  assert.equal(JSON.parse((await req('gameV2/privateSaves/'+uid)).value.data).money,current.money);
  const {point,at,...info}=combatProfile(current,'이야기 검증',Date.now());
  const profile={...info,at:stamp};
  assert.equal((await req('gameV2/combatProfiles/'+uid,{method:'PUT',body:profile})).status,200,officer+' public combat profile');
  assert.equal((await req('gameV2/combatProfiles/'+uid,{method:'PUT',body:{...profile,skill:profile.skill.replace(officer,'OS03')}})).status,401,'unknown story officer is rejected');
  const fleet=(await req('gameV2/fleetStates/'+uid)).value;
  assert.equal((await req('gameV2/fleetStates/'+uid,{method:'PUT',body:{...fleet,revision:fleet.revision+1,at:stamp,skill:fleet.skill.replace(officer,'OS03')}})).status,401,'unknown canonical officer is rejected');
 }finally{clearInterval(account.timer);}
}
console.log('PASS: both story officers can migrate, log in, save and publish combat state; unknown officer IDs remain rejected.');
