import test from 'node:test';
import assert from 'node:assert/strict';
import {CaptainAccount,clearLegacyStorage,localSaveKey} from '../dist/account.js';
import {initialState,upgradeShip} from '../dist/engine.js';
Object.defineProperty(globalThis.navigator,'onLine',{value:true,configurable:true});

function fixture(record=null){
 const records=new Map(record?[['gameV2/privateSaves/owner',record]]:[]),values=new Map(),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
 const snap=v=>({val:()=>v});let cold=false,online=true,failWrite=false;
 const sdk={ref:(_,path)=>path,serverTimestamp:()=>12345,get:async ref=>{if(!online)throw Error('network');return snap(records.get(ref)||null);},update:async(ref,changes)=>{records.set(ref,{...records.get(ref),...changes});},onValue:()=>()=>{},runTransaction:async(ref,fn)=>{if(failWrite)throw Error('network');const actual=records.get(ref)||null;let next=fn(cold?null:actual);cold=false;if(next===undefined)return {committed:false,snapshot:snap(actual)};if(actual&&next.revision===1)next=fn(actual);if(next===undefined)return {committed:false,snapshot:snap(actual)};records.set(ref,next);return {committed:true,snapshot:snap(next)};}};
 const a=new CaptainAccount(storage);a.setup=async()=>{};a.sdk=sdk;a.auth={};a.authSdk={signOut:async()=>{}};
 return {a,records,values,storage,cold:()=>cold=true,offline:()=>{online=false;failWrite=true;}};
}
const user={uid:'owner'},input={name:'테스트 선장'};
test('old cloud ship conversion pays once, upgrades remain after schema four reconnect',async()=>{
 const game={...initialState(),version:3,shipTier:4,money:2400};delete game.raftStart;delete game.fleetShips;delete game.flagshipId;
 const f=fixture({schemaVersion:3,revision:4,data:JSON.stringify(game),session:'expired',leaseUntil:0});
 const s=await f.a.enter(user,null,input);clearInterval(f.a.timer);assert.equal(s.shipTier,0);assert.equal(s.money,7600);assert.equal(f.records.get('gameV2/privateSaves/owner').schemaVersion,5);assert.ok(f.values.has('windward-before-raft-start-v4:owner'));
 f.a.readGame=()=>s;assert.equal(upgradeShip(s).ok,true);f.a.save(s);await f.a.flushPromise;if(f.a.dirty)await f.a.flush();
 const again=await f.a.enter(user,{name:input.name},input);clearInterval(f.a.timer);assert.equal(again.shipTier,1);assert.equal(again.money,7000);assert.equal(again.raftStart.refund,5200);
});
test('a cold Firebase transaction does not falsely freeze a save; edits persist with a newer revision',async()=>{
 const f=fixture(),s=await f.a.enter(user,null,input);clearInterval(f.a.timer);f.a.readGame=()=>s;s.money=2700;f.a.save(s);await new Promise(r=>setTimeout(r,0));
 // Force the SDK callback to report its initial empty cache on the next flush.
 f.cold();await f.a.flush();assert.equal(f.a.lost,false);assert.equal(JSON.parse(f.records.get('gameV2/privateSaves/owner').data).money,2700);assert.ok(f.a.revision>=2);
});
test('another live session blocks login, explicit takeover keeps cargo and replaces the lease',async()=>{
 const game=initialState();game.money=8123;game.cargo={wine:{qty:3,cost:90}};
 const record={revision:4,data:JSON.stringify(game),session:'other-device',leaseUntil:Date.now()+60000};const f=fixture(record);
 await assert.rejects(f.a.enter(user,null,input),e=>e.code==='session');assert.equal(f.records.get('gameV2/privateSaves/owner').session,'other-device');
 const loaded=await f.a.enter(user,null,{...input,takeover:true});clearInterval(f.a.timer);assert.equal(loaded.money,8123);assert.deepEqual(loaded.cargo,game.cargo);assert.equal(f.records.get('gameV2/privateSaves/owner').session,f.a.session);
});
test('unsent local save with a stale revision is preserved for explicit conflict resolution',async()=>{
 const server=initialState(),f=fixture({revision:8,data:JSON.stringify(server),session:'expired',leaseUntil:0});const local={revision:2,pending:true,data:{...server,money:9999}};
 f.storage.setItem(localSaveKey('owner'),JSON.stringify(local));await assert.rejects(f.a.enter(user,null,input),e=>e.code==='conflict');assert.equal(JSON.parse(f.storage.getItem(localSaveKey('owner'))).data.money,9999);assert.equal(f.records.get('gameV2/privateSaves/owner').revision,8);
});
test('network save failure leaves the local record pending and never clears progress',async()=>{
 const f=fixture(),s=await f.a.enter(user,null,input);clearInterval(f.a.timer);f.a.readGame=()=>s;s.money=7654;f.offline();f.a.save(s);await new Promise(r=>setTimeout(r,0));const cache=JSON.parse(f.storage.getItem(localSaveKey('owner')));assert.equal(cache.pending,true);assert.equal(cache.data.money,7654);assert.equal(f.a.lost,false);
});


test('the reset ignores old cloud and device saves and starts with a new real-world record',async()=>{
 const f=fixture();
 const old={...initialState(),money:987654,speed:4,world:'peace'};
 f.records.set('privateSaves/owner/peace',{data:JSON.stringify(old)});
 f.values.set('windward-save-v1',JSON.stringify(old));
 f.values.set('windward-account-v2:owner:real',JSON.stringify({revision:100,pending:true,data:old}));
 const fresh=await f.a.enter(user,null,input);
 clearInterval(f.a.timer);
 assert.deepEqual(fresh,initialState());
 assert.equal(f.records.get('gameV2/privateSaves/owner').revision,1);
 assert.equal(f.records.get('gameV2/accounts/owner').name,input.name);
 assert.equal(JSON.parse(f.records.get('privateSaves/owner/peace').data).money,old.money);
 assert.equal((await f.a.loadProfile(user)).name,input.name);
});

test('a failed cloud read cannot create a new profile or save',async()=>{
 const f=fixture();f.offline();
 await assert.rejects(f.a.enter(user,null,input),/network/);
 assert.equal(f.records.size,0);
});

test('a reload with the same tab session resumes, while a different session must take over',async()=>{
 const f=fixture();
 const fresh=await f.a.enter(user,null,input);
 clearInterval(f.a.timer);
 fresh.money=2875;
 f.a.readGame=()=>fresh;
 f.a.save(fresh);
 await f.a.flush();
 const reopened=new CaptainAccount(f.storage,f.a.session);
 reopened.sdk=f.a.sdk;
 const same=await reopened.enter(user,await f.a.loadProfile(user));
 clearInterval(reopened.timer);
 assert.equal(same.money,2875);
 const different=new CaptainAccount(f.storage);
 different.sdk=f.a.sdk;
 await assert.rejects(different.enter(user,await f.a.loadProfile(user)),e=>e.code==='session');
});

test('legacy cleanup leaves current Windward records and other GitHub Pages storage alone',()=>{
 const f=fixture();
 const storage={get length(){return f.values.size;},key:i=>[...f.values.keys()][i],removeItem:k=>f.values.delete(k)};
 for(const key of ['windward-save-v1','windward-account-v2:owner:real:conflict:123','windward-before-reset:1','windward-account-v3:owner','samguk-save'])f.values.set(key,'sample');
 clearLegacyStorage(storage);
 assert.deepEqual([...f.values.keys()],['windward-account-v3:owner','samguk-save']);
});
