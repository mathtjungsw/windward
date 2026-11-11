import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const base='http://127.0.0.1:9000/';
async function request(key,body){
  const url=new URL('gameV2/'+key+'.json',base);
  url.searchParams.set('ns','demo-windward-port-income');
  const response=await fetch(url,{method:body?'PUT':'GET',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},
    ...(body?{body:JSON.stringify(body)}:{})});
  assert.equal(response.status,200);
  return response.json();
}
const start=Date.now()-7200000;
const original={
  config:{minSchema:6},privateSaves:{a:{data:'unchanged'}},
  shared:{ports:{
    seville:{revision:7,updatedAt:start,content:{ownerUid:'a',investors:{a:500000},ownerSince:start+1000,treasury:{a:140},basicIncome:{previous:{b:10000}},markets:{wine:{pressure:1200}}}},
    porto:{revision:2,content:{ownerUid:'a',investors:{a:500000},treasury:{a:2}}},
    london:{revision:3,content:{ownerUid:'b',investors:{b:600000},basicIncome:{period:{owner:'b',at:start-1000,units:20000,rate:3000}}}}
  }}
};
await request('',original);
const run=(...args)=>JSON.parse(execFileSync(process.execPath,[fileURLToPath(new URL('./port-income-backfill.mjs',import.meta.url)),'--emulator','--activation='+new Date(start).toISOString(),...args],{encoding:'utf8'}));
assert.equal(run().eligible,1);
assert.deepEqual(await request('shared/ports'),original.shared.ports);
assert.equal(run('--apply').changed,1);
const ports=await request('shared/ports');
assert.equal(ports.seville.revision,8);
assert.deepEqual(ports.seville.content.basicIncome,{previous:{b:10000},period:{owner:'a',at:start+1000,units:0,rate:1000}});
assert.deepEqual(ports.seville.content.treasury,{a:140});
assert.deepEqual(ports.seville.content.markets,{wine:{pressure:1200}});
assert.deepEqual(ports.porto,original.shared.ports.porto);
assert.deepEqual(ports.london,original.shared.ports.london);
assert.deepEqual(await request('privateSaves'),original.privateSaves);
assert.equal(run('--apply').changed,0);
console.log('PASS: port income dry run, per-port conditional apply, intact accounts and balances, and safe rerun.');
