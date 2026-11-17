import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initialState} from '../dist/engine.js';
import {changeDepotPromotion,nextFreightParticipation,projectAction,PROJECT_BY_ID} from '../dist/projects.js';
import {ownershipRankChanges} from '../dist/port-rankings.js';

const namespace='demo-windward-projects',url='http://127.0.0.1:9000/',timestamp={'.sv':'timestamp'};
const project='freight-porto',path='shared/projects/'+project;
const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
function token(uid,provider='google.com'){
  const t=Math.floor(Date.now()/1000);
  return encode({alg:'none',typ:'JWT'})+'.'+encode({aud:namespace,iss:'https://securetoken.google.com/'+namespace,sub:uid,user_id:uid,iat:t,exp:t+3600,auth_time:t,firebase:{sign_in_provider:provider,identities:{}}})+'.';
}
async function request(path,{uid,admin=false,provider,method='GET',body}={}){
  const target=new URL(path+'.json',url);
  target.searchParams.set('ns',namespace);
  if(uid)target.searchParams.set('auth',token(uid,provider));
  const r=await fetch(target,{method,headers:{'Content-Type':'application/json',...(admin?{Authorization:'Bearer owner'}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  return {status:r.status,value:await r.json()};
}
const rules=JSON.parse(await readFile(new URL('../firebase.database.rules.json',import.meta.url),'utf8'));
assert.equal((await request('.settings/rules',{admin:true,method:'PUT',body:rules})).status,200);
assert.equal((await request('gameV2',{admin:true,method:'DELETE'})).status,200);
for(const uid of ['test-alice','test-bob']){
  assert.equal((await request('gameV2/accounts/'+uid,{admin:true,method:'PUT',body:{name:uid}})).status,200);
  assert.equal((await request('gameV2/real/portRankings/'+uid,{admin:true,method:'PUT',body:{name:uid,ownedPortCount:0,revision:1,updatedAt:timestamp}})).status,200);
  const game=initialState();
  game.port='porto';
  game.money=500000;
  game.cargo={wine:{qty:30,cost:390}};
  const save={schemaVersion:5,revision:1,operationSequence:0,session:'session-'+uid,leaseUntil:Date.now()+90000,data:JSON.stringify(game),updatedAt:timestamp};
  assert.equal((await request('gameV2/privateSaves/'+uid,{uid,method:'PUT',body:save})).status,200);
}
async function prepare(uid,action,amount,key=project){
  const node='shared/projects/'+key;
  const [personal,shared]=await Promise.all([request('gameV2/privateSaves/'+uid,{uid}),request('gameV2/'+node,{uid})]);
  const old=personal.value,current=shared.value||{revision:0,content:{}},game=JSON.parse(old.data),content=structuredClone(current.content);
  const vote=action.startsWith('promotion-')?(await request('gameV2/depotPromotionVotes/'+key+'/'+uid,{uid})).value:0;
  const result=action.startsWith('promotion-')?changeDepotPromotion(game,content,uid,PROJECT_BY_ID[key],action,Date.now(),false,vote,amount):projectAction(game,content,uid,key,action,amount,Date.now());
  const sequence=old.operationSequence+1,id=uid+':'+sequence,revision=old.revision+1,sharedRevision=current.revision+1;
  const receipt={id,sequence,kind:'projects',key,sharedRevision,...(old.schemaVersion>=13?{blessingStart:0}:{})};
  const record={revision:sharedRevision,content:{...content,_version:1},updatedAt:timestamp,lastOperation:{id,uid,sequence,saveRevision:revision}};
  const sdk={ref:(_db,path)=>path,get:async path=>({val:()=>(undefined)}),serverTimestamp:()=>timestamp};
  sdk.get=async path=>{const {value}=await request(path,{uid});return {val:()=>value};};
  const rank=key.startsWith('depot-')?await ownershipRankChanges({uid,name:uid,sdk},key,current.content,content,id,'projects'):{};
  return {result,patch:{['privateSaves/'+uid]:{...old,revision,operationSequence:sequence,lastOperation:receipt,data:JSON.stringify(game),updatedAt:timestamp},[node]:record,...rank,...result.extras,...(result.registry?{['harborRegistry/'+key]:result.registry}:{})}};
}
const commit=(uid,body)=>request('gameV2',{uid,method:'PATCH',body});
const alice='test-alice',bob='test-bob';
const opened=await prepare(alice,'renew',0);
assert.ok((await commit(alice,opened.patch)).status===200);
assert.ok((await request('gameV2/'+path,{uid:bob,provider:'password'})).status>=400);
assert.ok((await request('gameV2/shared/projects',{uid:bob})).status>=400);
assert.ok((await request('gameV2/shared/projects/unknown',{uid:bob})).status>=400);
const a=await prepare(alice,'deliver',30),b=await prepare(bob,'deliver',30);
const [aResult,bResult]=await Promise.all([commit(alice,a.patch),commit(bob,b.patch)]);
assert.equal(Number(aResult.status===200)+Number(bResult.status===200),1);
const rejected=aResult.status===200?bob:alice;
const retry=await prepare(rejected,'deliver',30);
assert.equal(retry.result.qty,10);
assert.equal((await commit(rejected,retry.patch)).status,200);
assert.ok((await commit(rejected,retry.patch)).status>=400);
const stored=await request('gameV2/'+path,{uid:alice});
assert.equal(Object.values(stored.value.content.deliveries).reduce((a,b)=>a+b),40);
const left=await prepare(alice,'claim',1);
const right=await prepare(bob,'claim',1);
assert.equal(left.result.reward+right.result.reward,4800);
assert.equal((await commit(alice,left.patch)).status,200);
assert.equal((await commit(bob,(await prepare(bob,'claim',1)).patch)).status,200);
const depot='depot-stjohns';
assert.equal((await commit(alice,(await prepare(alice,'invest',200000,depot)).patch)).status,200);
const funded=await prepare(bob,'invest',100000,depot);
const forged=structuredClone(funded.patch);
forged['harborRegistry/'+depot].ownerUid=bob;
assert.ok((await commit(bob,forged)).status>=400);
const incomplete=structuredClone(funded.patch);
delete incomplete['harborRegistry/'+depot];
assert.ok((await commit(bob,incomplete)).status>=400);
assert.equal((await commit(bob,funded.patch)).status,200);
const entry=(await request('gameV2/harborRegistry/'+depot,{uid:alice})).value;
assert.equal(entry.ownerUid,alice);
assert.ok(entry.opensAt>Date.now());
assert.ok((await commit(bob,funded.patch)).status>=400);
const openedAt=Date.now()-3600000;
assert.equal((await request('gameV2/shared/projects/'+depot+'/content',{admin:true,method:'PATCH',body:{readyAt:openedAt,startedAt:openedAt-21600000}})).status,200);
assert.equal((await request('gameV2/harborRegistry/'+depot,{admin:true,method:'PATCH',body:{opensAt:openedAt}})).status,200);
assert.equal((await commit(alice,(await prepare(alice,'dividend',0,depot)).patch)).status,200);
assert.equal((await request('gameV2/shared/projects/'+depot+'/content/basicIncome',{uid:bob})).value.period.rate,500);
const joint='depot-davao';
assert.equal((await commit(alice,(await prepare(alice,'invest',150000,joint)).patch)).status,200);
assert.equal((await commit(bob,(await prepare(bob,'invest',150000,joint)).patch)).status,200);
assert.equal((await request('gameV2/harborRegistry/'+joint,{uid:alice})).value.ownerUid,'');
for(const [path,body] of [['shared/projects/'+joint+'/content',{readyAt:openedAt,startedAt:openedAt-21600000,dividends:{[alice]:125,[bob]:70}}],['harborRegistry/'+joint,{opensAt:openedAt}]]){
  assert.equal((await request('gameV2/'+path,{admin:true,method:'PATCH',body})).status,200);
}
for(const uid of [alice,bob]){
  const path='gameV2/privateSaves/'+uid, record=(await request(path,{uid})).value,game=JSON.parse(record.data);
  game.port=joint;game.position=PROJECT_BY_ID[joint].site.point;game.money=1000000;
  assert.equal((await request(path,{admin:true,method:'PATCH',body:{data:JSON.stringify(game)}})).status,200);
}
const aliceVote=await prepare(alice,'promotion-vote',0,joint);
const overstated=structuredClone(aliceVote.patch);
overstated['shared/projects/'+joint].content.promotion.support+=1;
assert.equal((await commit(alice,overstated)).status,401);
assert.equal((await request('gameV2/depotPromotionVotes/'+joint+'/'+bob,{uid:alice,method:'PUT',body:1})).status,401);
assert.equal((await commit(alice,aliceVote.patch)).status,200);
await assert.rejects(prepare(alice,'promotion-confirm',0,joint),/과반/);
assert.equal((await commit(bob,(await prepare(bob,'promotion-vote',0,joint)).patch)).status,200);
const attempts=await Promise.all([prepare(alice,'promotion-confirm',0,joint),prepare(bob,'promotion-confirm',0,joint)]);
const invalid=structuredClone(attempts[0].patch);
delete invalid['harborRegistry/'+joint];
assert.equal((await commit(alice,invalid)).status,401);
const wins=await Promise.all(attempts.map(({patch},i)=>commit([alice,bob][i],patch)));
assert.equal(wins.filter(result=>result.status===200).length,1);
const promoted=(await request('gameV2/shared/projects/'+joint+'/content',{uid:bob})).value;
assert.deepEqual(promoted.investors,{[alice]:150000,[bob]:150000});
assert.deepEqual(promoted.dividends,{[alice]:125,[bob]:70});
assert.equal(promoted.stock,400);
assert.equal(promoted.promotion.level,1);
assert.equal((await request('gameV2/harborRegistry/'+joint,{uid:alice})).value.promotionLevel,1);
const balances=await Promise.all([alice,bob].map(async uid=>JSON.parse((await request('gameV2/privateSaves/'+uid,{uid})).value.data).money));
assert.equal(balances[0]+balances[1],1900000);
for(const uid of [alice,bob])assert.equal((await commit(uid,(await prepare(uid,'promotion-vote',1,joint)).patch)).status,200);
const expansion=await prepare(alice,'promotion-confirm',1,joint);
assert.equal((await commit(alice,expansion.patch)).status,200);
assert.equal((await request('gameV2/harborRegistry/'+joint,{uid:alice})).value.promotionLevel,2);
for(const uid of [alice,bob])assert.equal((await commit(uid,(await prepare(uid,'promotion-vote',2,joint)).patch)).status,200);
assert.equal((await commit(alice,(await prepare(alice,'promotion-confirm',2,joint)).patch)).status,200);
assert.equal((await request('gameV2/harborRegistry/'+joint,{uid:alice})).value.promotionLevel,3);
const baseline=(await request('gameV2/privateSaves/'+alice,{uid:alice})).value;
const originalGame=JSON.parse(baseline.data);originalGame.port=depot;
assert.equal((await request('gameV2/privateSaves/'+alice,{admin:true,method:'PATCH',body:{data:JSON.stringify(originalGame)}})).status,200);
assert.equal((await commit(alice,(await prepare(alice,'promotion-vote',0,depot)).patch)).status,200);
const majorityUpgrade=await prepare(alice,'promotion-confirm',0,depot);
assert.equal((await commit(alice,majorityUpgrade.patch)).status,200);
const majorityPort=(await request('gameV2/shared/projects/'+depot+'/content',{uid:alice})).value;
assert.ok(majorityPort.basicIncome.previous[alice]>=0);
assert.equal(majorityPort.taxDividend.rates[alice]+majorityPort.taxDividend.rates[bob],500);
const bobSave=(await request('gameV2/privateSaves/'+bob,{uid:bob})).value;
const bobGame=JSON.parse(bobSave.data);bobGame.port=depot;
await request('gameV2/privateSaves/'+bob,{admin:true,method:'PATCH',body:{data:JSON.stringify(bobGame)}});
const aliceRank='real/portRankings/'+alice,bobRank='real/portRankings/'+bob;
const count=async key=>(await request('gameV2/'+key,{uid:alice})).value.ownedPortCount;
assert.equal(await count(aliceRank),0);
for(const uid of [alice,bob])assert.equal((await commit(uid,(await prepare(uid,'promotion-vote',1,depot)).patch)).status,200);
const rankedUpgrade=(await prepare(bob,'promotion-confirm',1,depot)).patch;
assert.equal(rankedUpgrade[aliceRank].ownedPortCount,1);
const missingRank=structuredClone(rankedUpgrade);delete missingRank[aliceRank];
assert.equal((await commit(bob,missingRank)).status,401);
assert.equal((await commit(bob,rankedUpgrade)).status,200);
assert.equal((await commit(bob,rankedUpgrade)).status,401);
assert.equal(await count(aliceRank),1);
assert.equal(await count(bobRank),0);
console.log('PASS: promotion votes are weighted, require a strict majority, and preserve capital, stock and unsettled dividends. Only one competing confirmation can charge.');
console.log('PASS: local Firebase projects use individual reads, atomic shared revisions, cargo limits, and one-time split rewards.');

const captain='quota-captain',counter='freightParticipation/'+captain,savePath='gameV2/privateSaves/'+captain;
const now=Date.now(),quotaGame=initialState();
const quotaSave={schemaVersion:15,noviceGraduated:true,defenseSeq:0,revision:1,operationSequence:0,session:'quota-session',leaseUntil:now+90000,data:JSON.stringify(quotaGame),updatedAt:timestamp};
assert.equal((await request('gameV2/config/minSchema',{admin:true,method:'PUT',body:15})).status,200);
assert.equal((await request(savePath,{admin:true,method:'PUT',body:quotaSave})).status,200);
async function arrive(key){
  const {port,good,goal}=PROJECT_BY_ID[key];
  const save=(await request(savePath,{uid:captain})).value,game=JSON.parse(save.data);
  game.port=port;game.cargo[good]={qty:goal,cost:1};
  assert.equal((await request(savePath,{admin:true,method:'PATCH',body:{data:JSON.stringify(game)}})).status,200);
  assert.equal((await commit(captain,(await prepare(captain,'renew',0,key)).patch)).status,200);
}
const counterValue=async()=>(await request('gameV2/'+counter,{uid:captain})).value;
const quotaFor=async (key,patch)=>nextFreightParticipation(await counterValue(),key,patch['shared/projects/'+key].content.round,Date.now(),timestamp);
for(const [i,key] of ['freight-porto','freight-goa','freight-havana'].entries()){
  await arrive(key);
  const {patch}=await prepare(captain,'deliver',1,key);
  assert.equal((await commit(captain,patch)).status,401,'cannot first deliver without consuming a slot');
  patch[counter]=await quotaFor(key,patch);
  assert.equal((await commit(captain,patch)).status,200,'atomic freight participation '+key);
  assert.equal((await counterValue()).usedBoxes,[40,100,180][i]);
}
const part='freight-havana';
assert.equal((await commit(captain,(await prepare(captain,'deliver',79,part)).patch)).status,200);
for(let i=0;i<4;i++){
  await arrive(part);
  const {patch}=await prepare(captain,'deliver',i===3?1:80,part);
  patch[counter]=await quotaFor(part,patch);
  assert.equal((await commit(captain,patch)).status,200);
}
assert.equal((await counterValue()).usedBoxes,500);
assert.equal((await commit(captain,(await prepare(captain,'deliver',79,part)).patch)).status,200,'split deliveries already counted still work at the limit');
const round=(await request('gameV2/shared/projects/'+part,{uid:captain})).value.content.round;
assert.equal((await commit(captain,(await prepare(captain,'claim',round,part)).patch)).status,200,'payout remains available at the limit');
assert.equal((await request('gameV2/'+counter,{uid:captain,method:'DELETE'})).status,401,'cannot reset own counter');
assert.equal((await request('gameV2/'+counter,{uid:alice})).status,401,'counter is personal');
const fourth='freight-sydney';
await arrive(fourth);
const {patch:blocked}=await prepare(captain,'deliver',1,fourth);
const current=await counterValue(),fourthRound=blocked['shared/projects/'+fourth].content.round;
blocked[counter]={...current,usedBoxes:580,project:fourth,round:fourthRound,updatedAt:timestamp};
assert.equal((await commit(captain,blocked)).status,401,'cannot overrun the limit by using another port');
blocked[counter].usedBoxes=80;
assert.equal((await commit(captain,blocked)).status,401,'cannot reset the current day');
blocked[counter].day++;
assert.equal((await commit(captain,blocked)).status,401,'cannot write tomorrow’s counter');
assert.equal((await request('gameV2/'+counter,{admin:true,method:'PATCH',body:{day:current.day-1}})).status,200);
assert.equal((await commit(captain,blocked)).status,401,'a client day ahead remains invalid');
blocked[counter]=await quotaFor(fourth,blocked);
assert.equal((await commit(captain,blocked)).status,200,'first participation on a new Korean date');
assert.equal((await counterValue()).usedBoxes,80);
console.log('PASS: shared freight daily cap across ports, atomic counter, split delivery, and unaffected claims.');
