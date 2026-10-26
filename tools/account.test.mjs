import test from 'node:test';
import assert from 'node:assert/strict';
import {CaptainAccount,localSaveKey} from '../dist/account.js';
import {initialState} from '../dist/engine.js';
Object.defineProperty(globalThis.navigator,'onLine',{value:true,configurable:true});

function fixture(record=null){
 const records=new Map(record?[['privateSaves/owner/peace',record]]:[]),values=new Map(),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
 const snap=v=>({val:()=>v});let cold=false,online=true;
 const sdk={ref:(_,path)=>path,serverTimestamp:()=>12345,get:async ref=>{if(!online)throw Error('network');return snap(records.get(ref)||null);},update:async(ref,changes)=>{records.set(ref,{...records.get(ref),...changes});},onValue:()=>()=>{},runTransaction:async(ref,fn)=>{const actual=records.get(ref)||null;let next=fn(cold?null:actual);cold=false;if(next===undefined)return {committed:false,snapshot:snap(actual)};if(actual&&next.revision===1)next=fn(actual);if(next===undefined)return {committed:false,snapshot:snap(actual)};records.set(ref,next);return {committed:true,snapshot:snap(next)};}};
 const a=new CaptainAccount(storage);a.setup=async()=>{};a.sdk=sdk;a.auth={};a.authSdk={createUserWithEmailAndPassword:async()=>({user:{uid:'owner'}}),signInWithEmailAndPassword:async()=>({user:{uid:'owner'}}),signOut:async()=>{}};
 return {a,records,values,storage,cold:()=>cold=true,offline:()=>online=false};
}
const input={name:'테스트 선장',pin:'012345',mode:'resume',world:'peace'};
test('a cold Firebase transaction does not falsely freeze a save; edits persist with a newer revision',async()=>{
 const f=fixture(),s=await f.a.login(input);clearInterval(f.a.timer);f.a.readGame=()=>s;s.money=2700;f.a.save(s);await new Promise(r=>setTimeout(r,0));
 // Force the SDK callback to report its initial empty cache on the next flush.
 f.cold();await f.a.flush();assert.equal(f.a.lost,false);assert.equal(JSON.parse(f.records.get('privateSaves/owner/peace').data).money,2700);assert.ok(f.a.revision>=2);
});
test('another live session blocks login, explicit takeover keeps cargo and replaces the lease',async()=>{
 const game=initialState();game.money=8123;game.cargo={wine:{qty:3,cost:90}};
 const record={revision:4,data:JSON.stringify(game),session:'other-device',leaseUntil:Date.now()+60000};const f=fixture(record);
 await assert.rejects(f.a.login(input),e=>e.code==='session');assert.equal(f.records.get('privateSaves/owner/peace').session,'other-device');
 const loaded=await f.a.login({...input,takeover:true});clearInterval(f.a.timer);assert.equal(loaded.money,8123);assert.deepEqual(loaded.cargo,game.cargo);assert.equal(f.records.get('privateSaves/owner/peace').session,f.a.session);
});
test('unsent local save with a stale revision is preserved for explicit conflict resolution',async()=>{
 const server=initialState(),f=fixture({revision:8,data:JSON.stringify(server),session:'expired',leaseUntil:0});const local={revision:2,pending:true,data:{...server,money:9999}};
 f.storage.setItem(localSaveKey('owner','peace'),JSON.stringify(local));await assert.rejects(f.a.login(input),e=>e.code==='conflict');assert.equal(JSON.parse(f.storage.getItem(localSaveKey('owner','peace'))).data.money,9999);assert.equal(f.records.get('privateSaves/owner/peace').revision,8);
});
test('network save failure leaves the local record pending and never clears progress',async()=>{
 const f=fixture(),s=await f.a.login(input);clearInterval(f.a.timer);f.a.readGame=()=>s;s.money=7654;f.offline();f.a.save(s);await new Promise(r=>setTimeout(r,0));const cache=JSON.parse(f.storage.getItem(localSaveKey('owner','peace')));assert.equal(cache.pending,true);assert.equal(cache.data.money,7654);assert.equal(f.a.lost,false);
});
