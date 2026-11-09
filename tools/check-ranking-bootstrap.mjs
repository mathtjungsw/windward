import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile} from 'node:fs/promises';
import {initialState} from '../dist/engine.js';
const ns='demo-windward-ranking-bootstrap',run=promisify(execFile);
async function request(p,method='GET',body){const r=await fetch('http://127.0.0.1:9000/'+p+'.json?ns='+ns,{method,headers:{Authorization:'Bearer owner','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});assert.equal(r.status,200);return r.json();}
await request('.settings/rules','PUT',JSON.parse(await readFile(new URL('../firebase.database.rules.json',import.meta.url))));
const game=initialState();game.visited=['lisbon','london','nagasaki'];
const save={schemaVersion:5,revision:7,session:'kept',data:JSON.stringify(game),leaseUntil:1,updatedAt:1000};
const seed={accounts:{a:{name:'이전 선장'},b:{name:'새 기록'},c:{name:'공개 명부'}},privateSaves:{a:save,b:save},real:{rankings:{a:{name:'이전 선장',saveRevision:7,lastSeenAt:12345},b:{name:'새 기록',saveRevision:8,lastSeenAt:23456}},portRankings:{b:{name:'새 기록',ownedPortCount:4,revision:9,updatedAt:1000}}},shared:{ports:{seville:{content:{ownerUid:'a',investors:{a:1000000}}},'developed-davao':{content:{developedOwner:'a'}},genoa:{content:{ownerUid:'c',investors:{c:1000000}}}}}};
await request('gameV2','PUT',seed);
const invoke=async args=>JSON.parse((await run(process.execPath,['tools/refresh-ranking-summaries.mjs','--emulator',...args],{cwd:new URL('../',import.meta.url),encoding:'utf8'})).stdout.trim());
const dry=await invoke([]);assert.equal(dry.ownerProfilesCreated,2);assert.deepEqual(await request('gameV2'),seed,'dry run does not write any record');
const result=await invoke(['--apply']);assert.equal(result.ownerProfilesCreated,2);assert.equal(result.summariesEnriched,1);assert.equal(result.skippedNewerSummary,1);assert.equal(result.ownedPortsCreated,3);
const after=await request('gameV2');assert.deepEqual(after.privateSaves,seed.privateSaves,'no personal save writes');assert.deepEqual(after.shared,seed.shared,'no port state writes');assert.deepEqual(after.accounts,seed.accounts,'no login/profile writes');assert.equal(after.real.portRankings.a.ownedPortCount,2);assert.equal(after.real.portRankings.c.ownedPortCount,1);assert.deepEqual(after.real.portRankings.b,seed.real.portRankings.b,'existing authoritative counter is preserved');assert.equal(after.real.rankings.a.lastSeenAt,12345,'backfill is not a login');assert.equal(after.real.rankings.a.islandPorts,2);assert.equal(after.real.rankings.a.fleetGrowth,1);assert.equal(after.real.rankings.a.pirateKills,0);assert.deepEqual(after.real.rankings.b,seed.real.rankings.b,'newer action summary survives');
assert.equal((await invoke(['--apply'])).ownerProfilesCreated,0,'safe rerun');
console.log('PASS: public summary bootstrap, historic derived metrics, ETag writes, newer summary protection, and immutable private saves/ports/login time');
