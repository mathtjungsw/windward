// Isolated emulator checks. Refuses external hosts and never touches the live Firebase project.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const base=new URL(process.env.WINDWARD_TEST_DATABASE||'http://127.0.0.1:9000/');
if(!['localhost','127.0.0.1'].includes(base.hostname))throw Error('Rules tests require a local emulator.');
const namespace='demo-windward-chat';
function token(uid){const now=Math.floor(Date.now()/1000),enc=o=>Buffer.from(JSON.stringify(o)).toString('base64url');return enc({alg:'none',typ:'JWT'})+'.'+enc({iss:`https://securetoken.google.com/${namespace}`,aud:namespace,iat:now,exp:now+3600,auth_time:now,sub:uid,user_id:uid,firebase:{identities:{},sign_in_provider:'google.com'}})+'.';}
async function request(path,{uid,admin=false,method='GET',body,query={}}={}){
  const url=new URL(path+'.json',base);url.searchParams.set('ns',namespace);if(uid)url.searchParams.set('auth',token(uid));for(const [k,v]of Object.entries(query))url.searchParams.set(k,JSON.stringify(v));
  const response=await fetch(url,{method,headers:{'Content-Type':'application/json',...(admin?{Authorization:'Bearer owner'}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  return {status:response.status,value:await response.json()};
}
const rules=JSON.parse(await readFile(new URL('../firebase.database.rules.json',import.meta.url),'utf8'));
assert.equal((await request('.settings/rules',{admin:true,method:'PUT',body:rules})).status,200,'rules compile');
assert.equal((await request('',{admin:true,method:'DELETE'})).status,200);
const timestamp={'.sv':'timestamp'},query={orderBy:'seq',limitToLast:50};
async function changes(uid,text='항해 테스트'){
  const seq=(await request('gameV2/real/chat/sequence',{uid})).value||0;
  return {sequence:seq+1,[`messages/${(seq+1)%50}`]:{seq:seq+1,uid,name:'시험 선장',text,at:timestamp},[`lastSent/${uid}`]:timestamp};
}
async function post(uid,body){return request('gameV2/real/chat',{uid,method:'PATCH',body:body||await changes(uid)});}
assert.equal((await request('gameV2/real/chat/messages',{query})).status,401,'anonymous database access denied');
assert.equal((await request('gameV2/real/chat/messages',{uid:'a',query:{orderBy:'seq',limitToLast:51}})).status,401,'history over 50 denied');
assert.equal((await request('gameV2/real/chat/messages',{uid:'a'})).status,401,'unbounded history denied');
assert.equal((await post('a',await changes('a','안녕하세요'))).status,200,'first message');
assert.equal((await request('gameV2/real/chat/messages',{uid:'b',query})).value[1].text,'안녕하세요','second captain sees text');
assert.equal((await post('a')).status,401,'server enforces 3-second interval');
assert.equal((await post('long',await changes('long','가'.repeat(201)))).status,401,'server rejects over 200 characters');
const spoof=await changes('b');spoof[`messages/${spoof.sequence%50}`].uid='a';assert.equal((await post('b',spoof)).status,401,'cannot impersonate sender uid');
assert.equal((await request('gameV2/real/chat/messages/1',{uid:'b',method:'DELETE'})).status,401,'cannot delete another message');
assert.equal((await request('gameV2/real/chat/lastSent/a',{uid:'a',method:'DELETE'})).status,401,'cannot erase cooldown');
assert.equal((await request('gameV2/real/chat/sequence',{uid:'b',method:'PUT',body:2})).status,401,'cannot advance sequence without a message');
const badSlot=await changes('b');badSlot['messages/51']=badSlot[`messages/${badSlot.sequence%50}`];delete badSlot[`messages/${badSlot.sequence%50}`];assert.equal((await post('b',badSlot)).status,401,'cannot create a 51st slot');
await new Promise(resolve=>setTimeout(resolve,3100));assert.equal((await post('a')).status,200,'sender can post after interval');
for(let i=0;i<55;i++)assert.equal((await post('fill-'+i)).status,200,'fill message '+i);
const history=(await request('gameV2/real/chat/messages',{uid:'b',query})).value,values=Object.values(history);
assert.equal(values.length,50,'database contains exactly 50 slots');assert.equal(Math.min(...values.map(m=>m.seq)),8,'old text overwritten');assert.equal(Math.max(...values.map(m=>m.seq)),57);
const first=await changes('race-a'),second=await changes('race-b');
const races=await Promise.all([post('race-a',first),post('race-b',second)]);assert.deepEqual(races.map(r=>r.status).sort(),[200,401],'simultaneous send cannot overwrite one another silently');
const loser=races[0].status===401?'race-a':'race-b';assert.equal((await post(loser)).status,200,'loser retries against latest sequence');
await request('gameV2/real/chat/lastSent/expired',{admin:true,method:'PUT',body:Date.now()-172800000});
const prune=await changes('prune');prune['lastSent/expired']=null;assert.equal((await post('prune',prune)).status,200,'expired throttle metadata can be pruned during a valid post');
const wrongPrune=await changes('bad-prune');wrongPrune['lastSent/prune']=null;assert.equal((await post('bad-prune',wrongPrune)).status,401,'recent cooldown cannot be pruned');
console.log('Social rules passed: 50 stored messages, 200-character limit, server cooldown, sender identity, bounded reads, collision/retry, expired metadata cleanup.');
