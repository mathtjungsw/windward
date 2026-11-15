import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const ns='demo-windward-blessings',stamp={'.sv':'timestamp'},day=ms=>Math.floor((ms+32400000)/86400000);
async function req(path,{uid,method='GET',body,filters}={}){
 const url=new URL(path+'.json','http://127.0.0.1:9000/');url.searchParams.set('ns',ns);
 if(uid){
  const now=Math.floor(Date.now()/1000),enc=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
  url.searchParams.set('auth',enc({alg:'none',typ:'JWT'})+'.'+enc({sub:uid,user_id:uid,aud:ns,iss:'https://securetoken.google.com/'+ns,iat:now,exp:now+3600,firebase:{sign_in_provider:'google.com',identities:{}}})+'.');
 }
 for(const [key,value] of Object.entries(filters||{}))url.searchParams.set(key,JSON.stringify(value));
 const response=await fetch(url,{method,headers:{'Content-Type':'application/json',...(!uid?{Authorization:'Bearer owner'}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 return {status:response.status,value:await response.json()};
}
const rules=JSON.parse(await readFile(new URL('../firebase.database.rules.json',import.meta.url),'utf8'));
assert.equal((await req('.settings/rules',{method:'PUT',body:rules})).status,200);
const rankAt=Date.now()-5000;
const ranking={updatedAt:rankAt,top:{first:{rank:1,name:'일등'},second:{rank:2,name:'이등'}}};
assert.equal((await req('gameV2',{method:'PUT',body:{real:{overallRanking:{public:ranking}},config:{minSchema:13}}})).status,200);
const base='gameV2/serverBlessings',today=day(Date.now());
const attempt=(uid='first',updates={})=>{
 const record={effect:'wind',uid,name:ranking.top[uid].name,rankAt,day:today,start:stamp,...updates};
 return req(base,{uid,method:'PATCH',body:{current:record,['history/'+record.day]:record}});
};
assert.equal((await attempt('second')).status,401);
assert.equal((await attempt('first',{effect:'invented'})).status,401);
assert.equal((await attempt('first',{day:today-1})).status,401);
assert.equal((await attempt('first',{rankAt:rankAt-1})).status,401);
const attempts=await Promise.all([attempt(),attempt('first',{effect:'fame'})]);
assert.deepEqual(attempts.map(x=>x.status).sort(),[200,401]);
const active=(await req(base+'/current',{uid:'second'})).value;
assert.equal(active.uid,'first');assert.ok(Number.isFinite(active.start));
assert.equal((await req(base+'/history',{uid:'second'})).status,401);
const results=await req(base+'/history',{uid:'second',filters:{orderBy:'$key',limitToLast:30}});
assert.equal(results.status,200);assert.deepEqual(results.value[String(today)],active);
await req(base+'/current/start',{method:'PUT',body:Date.now()-43200001});
assert.equal((await attempt()).status,401,'one daily use beyond expiry');
await req(base,{method:'DELETE'});
await req(base+'/current',{method:'PUT',body:{...active,day:today-1,start:Date.now()-3600000}});
assert.equal((await attempt()).status,401,'previous-day blessing still active');
await req(base+'/current/start',{method:'PUT',body:Date.now()-43200001});
assert.equal((await attempt('first',{effect:'peace'})).status,200,'new date after prior expiry');
const decree=(await req(base+'/current',{uid:'first'})).value;
const session='captain-first',record={schemaVersion:13,defenseSeq:0,noviceGraduated:true,revision:1,operationSequence:0,data:JSON.stringify({money:100,verified:'sample'}),updatedAt:Date.now(),leaseUntil:Date.now()+90000,session};
await req('gameV2/privateSaves/first',{method:'PUT',body:record});
function useEffect(blessingStart,npcStart=false){
 const key='first',uid='first',id=session+':1',sequence=1;
 const lastOperation={id,kind:'personal',key,sequence,sharedRevision:1,blessingStart,...(npcStart?{npcStart:true}:{})};
 return req('gameV2',{uid,method:'PATCH',body:{
  'privateSaves/first':{...record,revision:2,operationSequence:1,lastOperation,updatedAt:stamp},
  'shared/personal/first':{revision:1,content:{_version:1},updatedAt:stamp,lastOperation:{id,uid,sequence,saveRevision:2}}
 }});
}
assert.equal((await useEffect(0)).status,401,'stale state cannot settle a new operation');
assert.equal((await useEffect(decree.start,true)).status,401,'peace rejects new pirate combat');
assert.equal((await useEffect(decree.start)).status,200,'peace permits unrelated operations');
console.log('PASS: top-rank status, Korean daily activation, atomic history, and 12-hour non-overlap');
