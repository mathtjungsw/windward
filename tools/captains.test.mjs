import test from 'node:test';
import assert from 'node:assert/strict';
import {validCaptain,onlineCaptainList,CaptainRoster} from '../dist/captains.js';
import {shipsInSight} from '../dist/presence-core.js';
import {FleetPresence} from '../dist/multiplayer.js';

const member=(uid,updatedAt=100000)=>({uid,name:'선장'+uid,color:1,status:'항해',updatedAt});
test('online directory retains faraway names past the 29-boat rendering cap and deduplicates sessions',()=>{
 const names=Array.from({length:70},(_,i)=>member(String(i))),records=[...names,{...member('1',100100),name:'새 이름'},member('old',1),{...member('bad'),name:''}];
 const list=onlineCaptainList(records,100200);assert.equal(list.length,70);assert.equal(list.find(p=>p.uid==='1').name,'새 이름');assert.equal(validCaptain(member('a'),100200),true);assert.equal(validCaptain({...member('a'),color:99},100200),false);
 const boats=names.map((p,i)=>({...p,lon:i<2?-9:140,lat:i<2?38:35}));assert.equal(shipsInSight(boats,[-9,38]).length,2);assert.equal(list.length,70,'viewing two boats must not hide other captain names');
 assert.equal(shipsInSight(Array.from({length:40},()=>({lon:-9,lat:38})),[-9,38]).length,29);
});
test('captain heartbeat never publishes positions and remains sparse while the boat keeps moving',async()=>{
 const writes=[],f={uid:'owner',name:'내 선장',color:2,sdk:{serverTimestamp:()=>100000,set:async(ref,data)=>writes.push(data)}};const r=new CaptainRoster(f);r.selfRef='captains/owner_session';
 await r.publish({status:'항해',position:[-9,38],money:100},true);await r.publish({status:'항해',position:[140,35],money:999});assert.equal(writes.length,1);assert.deepEqual(Object.keys(writes[0]).sort(),['uid','name','color','status','updatedAt'].sort());
 await r.publish({status:'정박'});assert.equal(writes.length,2);r.lastSent=Date.now()-31000;await r.publish({status:'정박'});assert.equal(writes.length,3);
 f.active=false;await r.publish({status:'항해'},true);assert.equal(writes.length,3,'a delayed position send must not re-register a captain after leaving');
});
test('directory subscription and disconnect cleanup are independent of location sectors',async()=>{
 const calls=[],f={uid:'a',shipKey:'a_session',root:'worlds/peace',db:{},onChange:()=>{},sdk:{ref:(_,p)=>p,query:(...args)=>args,orderByChild:x=>x,startAt:x=>x,limitToLast:x=>x,onValue:(q,receive)=>{calls.push(q[0]);receive({forEach:fn=>[member('a',Date.now()),member('far',Date.now())].forEach(v=>fn({val:()=>v}))});return ()=>calls.push('unsubscribe');},onDisconnect:ref=>({remove:async()=>calls.push('reserve '+ref),cancel:async()=>calls.push('cancel '+ref)}),remove:async ref=>calls.push('remove '+ref)}};
 const r=new CaptainRoster(f);r.connect();await r.prepareDisconnect();assert.equal(r.ready,true);assert.equal(r.list().length,2);assert.equal(calls[0],'worlds/peace/captains');await r.stop();assert.equal(r.list().length,0);assert.ok(calls.includes('remove worlds/peace/captains/a_session'));
});
test('fleet member count includes self only once even when own roster record has arrived',()=>{
 const fleet=new FleetPresence({storage:{getItem:()=>null},readShip:()=>({status:'정박'}),onChange:()=>{},onStatus:()=>{}});fleet.uid='self';fleet.name='나';fleet.color=0;fleet.root='worlds/peace';fleet.roster={list:()=>[member('self'),member('far')]};assert.equal(fleet.onlineCaptains().length,2);assert.equal(fleet.onlineCaptains()[0].name,'나');
});
