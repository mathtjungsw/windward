import assert from 'node:assert/strict';
import {initialState} from '../dist/engine.js';
import {buildEnrollment} from './enrollment-data.mjs';
const base='http://127.0.0.1:9000/',ns='demo-windward-enrollment';
async function req(key,{method='GET',body,etag}={}){const r=await fetch(base+key+'.json?ns='+ns,{method,headers:{Authorization:'Bearer owner','content-type':'application/json',...(method==='GET'?{'X-Firebase-ETag':'true'}:{}),...(etag?{'if-match':etag}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:r.status,value:await r.json(),etag:r.headers.get('etag')};}
const game=initialState();game.port=null;game.position=[-17,34];game.money=1000;
const root={privateSaves:{a:{schemaVersion:5,revision:2,session:'s',operationSequence:0,data:JSON.stringify(game),updatedAt:100}},accounts:{a:{name:'A'}},real:{rankings:{a:{lastSeenAt:100}}},shared:{ports:{seville:{content:{investors:{a:1000000},defaultRate:4}}}}};
await req('gameV2',{method:'PUT',body:root});
const before=await req('gameV2'),candidate=buildEnrollment(before.value,Date.now());
// A concurrent normal save invalidates the entire root precondition.
const newer={...root.privateSaves.a,revision:3,data:JSON.stringify({...game,money:1234})};await req('gameV2/privateSaves/a',{method:'PUT',body:newer});
assert.equal((await req('gameV2',{method:'PUT',body:candidate.root,etag:before.etag})).status,412,'ETag rejects the stale whole-world snapshot');
const fresh=await req('gameV2'),next=buildEnrollment(fresh.value,Date.now());assert.equal((await req('gameV2',{method:'PUT',body:next.root,etag:fresh.etag})).status,200,'single conditional PUT commits all registration paths together');
const verified=(await req('gameV2')).value,saved=JSON.parse(verified.privateSaves.a.data);assert.equal(saved.money+saved.battleReserve.money,1234);assert.equal(verified.privateSaves.a.revision,4);assert.equal(verified.config.minSchema,6);assert.equal(verified.fleetStates.a.bank.id,saved.battleReserve.id);assert.equal(Object.values(verified.real.fleetIndex)[0].a.offline,true);assert.equal(verified.real.rankings.a.lastSeenAt,100);assert.deepEqual(verified.shared,root.shared);assert.equal(buildEnrollment(verified,Date.now()).stats.registered,0);
console.log('PASS: conditional root enrollment rejects concurrent changes, commits save/escrow/fleet/protocol together, preserves history and investments, and is replay-safe.');
