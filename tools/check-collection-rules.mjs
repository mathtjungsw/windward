import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
import {DISCOVERIES} from '../dist/discoveries-catalog.js';
import {UI_USAGE_IDS} from '../dist/ui-usage-ids.js';
import {initialState} from '../dist/engine.js';
import {usageDay} from '../dist/ui-usage.js';
const ns='demo-windward-collections';
const enc=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
function token(uid,claims={}){
 const now=Math.floor(Date.now()/1000);
 return enc({alg:'none',typ:'JWT'})+'.'+enc({aud:ns,iss:'https://securetoken.google.com/'+ns,sub:uid,user_id:uid,iat:now,exp:now+3600,firebase:{sign_in_provider:'google.com',identities:{}},...claims})+'.';
}
async function req(key,{uid,claims,owner=false,method='GET',body}={}){
 const url=new URL(key+'.json','http://127.0.0.1:9000/');url.searchParams.set('ns',ns);
 if(uid)url.searchParams.set('auth',token(uid,claims));
 const response=await fetch(url,{method,headers:{'content-type':'application/json',...(owner?{authorization:'Bearer owner'}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 return {status:response.status,data:await response.json()};
}
async function expect(key,status,options){
 const result=await req(key,options);
 assert.equal(result.status,status,`${key} ${options?.method||'GET'}: ${JSON.stringify(result.data)}`);
 return result.data;
}
await expect('.settings/rules',200,{owner:true,method:'PUT',body:JSON.parse(await readFile(new URL('../firebase.database.rules.json',import.meta.url)))});
const uid='qa-collections-captain',other='qa-other',captain='gameV2/real/collections/'+uid;
await expect('gameV2/privateSaves/'+uid,200,{owner:true,method:'PUT',body:{revision:14}});
const stamp={'.sv':'timestamp'},body={revision:14,updatedAt:stamp,discoveries:{[DISCOVERIES[0].id]:true},officers:{O001:true}};
await expect(captain,200,{uid,method:'PUT',body});
assert.equal((await expect(captain,200,{uid:other})).officers.O001,true);
await expect(captain,401);
await expect('gameV2/real/collections',401,{uid});
await expect(captain,401,{uid:other,method:'PUT',body});
for(const bad of [{...body,revision:13},{...body,discoveries:{'ruin-not-in-catalog':true}},{...body,officers:{O025:true}},{...body,officers:'private note'},{...body,cargo:'private note'}])
 await expect(captain,401,{uid,method:'PUT',body:bad});
const rank='gameV2/real/overallRanking',mine=rank+'/captains/'+uid;
await expect(rank,200,{owner:true,method:'PUT',body:{public:{top:{[uid]:{name:'검증 선장',rank:1,overallScore:500}},updatedAt:stamp},captains:{[uid]:{rank:1,overallScore:500}}}});
await expect(rank+'/public',200,{uid:other});await expect(mine,200,{uid});
await expect(mine,401,{uid:other});await expect(rank+'/captains',401,{uid});await expect(rank+'/public',401,{uid,method:'DELETE'});
const day=usageDay(Date.now());
const base='gameV2/operations/uiUsage/'+day+'/'+uid+'/', id='100000-'+'1'.repeat(32), key=base+id;
const code=String(UI_USAGE_IDS.indexOf('action-trade-buy')).padStart(3,'0');
const valid={day,events:'m-'+code+':1,2,1'};
await expect(base,200,{owner:true,method:'DELETE'});
await expect(key,200,{uid,method:'PUT',body:valid});
assert.deepEqual(await expect(key,200,{uid}),valid);
await expect(key,401,{uid,method:'PUT',body:valid});
await expect(key,401,{uid:other});await expect(base,401,{uid});
for(const invalid of ['m-999:1,2,1','m-'+code+':1,999999,1','m-email:1,2,1',Array(86).fill(valid.events).join(';')])
 await expect(base+'100000-'+'2'.repeat(32),401,{uid,method:'PUT',body:{...valid,events:invalid}});
const run=promisify(execFile),operator=fileURLToPath(new URL('./update-collection-operations.mjs',import.meta.url));
const operate=(job,...flags)=>run(process.execPath,[operator,job,'--emulator',...flags],{env:{...process.env,WINDWARD_EMULATOR_NS:ns}});
const savePath='gameV2/privateSaves/'+uid,game=initialState();
game.money=3200;game.profit=500;game.discoveries[DISCOVERIES[0].id]={foundDay:1,foundAt:1};
const original={revision:14,schemaVersion:7,data:JSON.stringify(game)};
await expect(savePath,200,{owner:true,method:'PUT',body:original});
await expect('gameV2/accounts/'+uid,200,{owner:true,method:'PUT',body:{name:'검증 선장'}});
await operate('backfill','--apply');
assert.deepEqual(await expect(savePath,200,{owner:true}),original);
assert.equal((await expect(captain,200,{uid})).discoveries[DISCOVERIES[0].id],true);
await operate('ranking','--apply');
assert.ok((await expect(rank+'/public',200,{uid})).top[uid].overallScore>0);
await operate('usage','--apply');
const daily='gameV2/operations/uiUsageDaily/'+day;
assert.deepEqual((await expect(daily,200,{owner:true}))['m-action-trade-buy'],{shown:1,clicked:2,completed:1});
await operate('usage','--apply');
assert.equal((await expect(daily,200,{owner:true}))['m-action-trade-buy'].clicked,2);
await expect(daily,401,{uid});
const scheduled={uid:'windward-scheduled-operations',claims:{windwardOperations:true,firebase:{sign_in_provider:'custom',identities:{}}}};
await expect('gameV2/real/rankings',200,scheduled);
await expect('gameV2/real/portRankings',200,scheduled);
await expect('gameV2/privateSaves',401,scheduled);
await expect('gameV2/real/rankings/'+uid,401,{...scheduled,method:'DELETE'});
await expect('gameV2/real/overallRanking',200,scheduled);
await expect('gameV2/operations',401,scheduled);
const totals=await expect(daily,200,scheduled);
await expect('gameV2/operations',200,{...scheduled,method:'PATCH',body:{['uiUsageDaily/'+day]:totals}});
console.log('PASS: public cards use catalog keys, ranking details are private, and telemetry uses immutable permitted count batches.');
