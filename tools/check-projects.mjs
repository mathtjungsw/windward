import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initialState} from '../dist/engine.js';
import {projectAction} from '../dist/projects.js';

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
  const old=personal.value,current=shared.value||{revision:0,content:{}},game=JSON.parse(old.data),content=current.content;
  const result=projectAction(game,content,uid,key,action,amount,Date.now());
  const sequence=old.operationSequence+1,id=uid+':'+sequence,revision=old.revision+1,sharedRevision=current.revision+1;
  const receipt={id,sequence,kind:'projects',key,sharedRevision};
  const record={revision:sharedRevision,content:{...content,_version:1},updatedAt:timestamp,lastOperation:{id,uid,sequence,saveRevision:revision}};
  return {result,patch:{['privateSaves/'+uid]:{...old,revision,operationSequence:sequence,lastOperation:receipt,data:JSON.stringify(game),updatedAt:timestamp},[node]:record,...(result.registry?{['harborRegistry/'+key]:result.registry}:{})}};
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
console.log('PASS: local Firebase projects use individual reads, atomic shared revisions, cargo limits, and one-time split rewards.');
