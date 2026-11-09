import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialState,parseSavedGame,Navigator,capacity,usedSpace,addShip,upgradeShip,unloadSupply,resupply,beginRescue,advanceVoyage,voyageEstimate,recordArrival,advanceManualMotion,helmStep} from '../dist/engine.js';
import {SHIPS,ship,shipTier,fleetCount,fleetLimit,additionalShipCost,upgradeCost,supplySpace} from '../dist/ship-rules.js';
import {PORTS,PORT_BY_ID,ALL_PORTS} from '../dist/data.js';
import {Exploration,discoverPorts} from '../dist/voyage-core.js';
import {explorationStats,ELIGIBLE_AREA_M2} from '../dist/exploration-score.js';
import {EXPLORATION_MASK} from '../dist/exploration-mask.js';
import {DISCOVERIES,RUMORS} from '../dist/discoveries-catalog.js';
import {inspectDiscovery,discoveryStats,readRumor,nearbyDiscoveries} from '../dist/discoveries.js';
import {wrappedMotion} from '../dist/world-wrap.js';
import {rankFleet} from '../dist/social-core.js';
import {FleetPresence} from '../dist/multiplayer.js';
import {RAFT_START_ID,fleetAppraisal,applyRaftStart} from '../dist/raft-start.js';
const data=n=>JSON.parse(readFileSync(new URL('../dist/assets/'+n+'.json',import.meta.url),'utf8'));
const nav=new Navigator(data('navigation'),data('rivers'));

test('twenty ship stages grow and each fleet count preserves actual food when adding ships',()=>{
 assert.equal(SHIPS.length,20);const s=initialState();assert.equal(ship(s).name,'통나무 뗏목');assert.equal(capacity(s),20);assert.equal(s.food,10);assert.equal(usedSpace(s),5);
 for(let i=1;i<20;i++){assert.ok(SHIPS[i].speed>SHIPS[i-1].speed);assert.ok(SHIPS[i].supply>=SHIPS[i-1].supply);assert.ok(SHIPS[i].capacity>=SHIPS[i-1].capacity);}
 assert.equal(addShip(s).ok,false);s.money=1e9;s.shipTier=19;
 for(let n=1;n<5;n++){s.food=10;const food=s.food*n,money=s.money,cost=additionalShipCost(s);assert.equal(addShip(s).ok,true);assert.equal(fleetCount(s),n+1);assert.equal(s.food*(n+1),food);assert.equal(s.money,money-cost);assert.equal(capacity(s),Math.floor(192*(10+6*n)/10));}
 assert.equal(addShip(s).ok,false);assert.equal(fleetLimit(s),5);
});
test('fleet upgrades charge once at displayed cost and supply credits preserve paid value',()=>{
 const s={...initialState(),shipTier:9,fleetCount:2,money:50000,food:20,cargo:{wine:{qty:5,cost:175}}};
 assert.equal(upgradeCost(s),20250);assert.equal(upgradeShip(s).cost,20250);assert.equal(s.shipTier,10);assert.equal(s.food,20);assert.equal(s.cargo.wine.qty,5);
 const money=s.money;unloadSupply(s,2);assert.equal(s.supplyCreditValue,24);assert.equal(s.food,18);assert.equal(supplySpace(s),18);
 assert.deepEqual(resupply(s,2),{ok:true,amount:2,cost:0});assert.equal(s.money,money);assert.equal(s.supplyCreditValue,0);
 s.port=null;assert.equal(upgradeShip(s).ok,false);assert.equal(addShip(s).ok,false);
});
test('v2 ships and retired harbors migrate without losing cargo, visits or supply and never remigrate',()=>{
 for(const [level,tier]of [[0,4],[1,9],[2,15]]){
  const old={...initialState(),version:2,level,food:6,shipTier:undefined,fleetCount:undefined,port:'setubal',visited:['lisbon','setubal'],knownPorts:['lisbon','setubal'],money:8888,cargo:{wine:{qty:30,cost:1000}},supplyCreditDays:2};
  const migrated=parseSavedGame(JSON.stringify(old));assert.equal(shipTier(migrated),tier);assert.equal(migrated.fleetCount,1);assert.equal(migrated.food,6);assert.equal(migrated.money,8888);assert.equal(migrated.legacyHarbor,true);assert.equal(migrated.cargo.wine.qty,30);assert.ok(migrated.visited.includes('setubal'));
  assert.equal(migrated.supplyCreditValue,2*[3,6,12][level]);assert.deepEqual(parseSavedGame(JSON.stringify(migrated)),migrated);
 }
 assert.throws(()=>parseSavedGame({...initialState(),version:5}),/최신/);
 assert.throws(()=>parseSavedGame({...initialState(),visited:['constructor']}));
 assert.equal(PORTS.length,78);assert.equal(ALL_PORTS.length,112);
});
test('rescue ignores undiscovered and known-but-unvisited ports, freezes exploration through restore and replan',()=>{
 const s={...initialState(),port:null,position:[-8.9,41.2],food:0,money:1500,knownPorts:PORTS.map(p=>p.id)};
 const fog=new Exploration();fog.seed(s);s.explored=fog.encode();const before=explorationStats(fog);
 const rescue=beginRescue(s,nav);assert.equal(rescue.port.id,'lisbon');assert.equal(s.explorationLockedUntilSailing,true);assert.ok(rescue.cost>0);
 const loaded=parseSavedGame(JSON.stringify(s)),savedMoney=loaded.money;assert.equal(beginRescue(loaded,nav).ok,false);
 const restored=new Exploration(loaded.explored);restored.seed(loaded);restored.travel([50,10],[60,10]);assert.equal(restored.encode(),s.explored);assert.deepEqual(explorationStats(restored),before);assert.equal(discoverPorts(loaded,[127,34],[130,34]).length,0);
 const v=loaded.voyage;advanceVoyage(loaded,nav,voyageEstimate(loaded,v).seconds);recordArrival(loaded,v.target,v);loaded.port=v.target;loaded.voyage=null;
 assert.equal(loaded.money,savedMoney);assert.equal(loaded.food,2);assert.deepEqual(loaded.visited,['lisbon']);restored.seed(loaded);assert.equal(restored.encode(),s.explored);
 const oldRescue={...initialState(),port:null,food:0,money:77,voyage:{...nav.route([-10,38],[-8.62,41.15]),target:'porto',travelled:0,foodRemaining:0,kind:'rescue',paidCost:150},position:[-10,38]};
 const replanned=parseSavedGame(oldRescue);assert.equal(replanned.rescueReplanPending,true);assert.equal(beginRescue(replanned,nav).port.id,'lisbon');assert.equal(replanned.money,77);assert.equal(replanned.voyage.paidCost,150);
});
test('normal movement after rescue unlocks exploration, including manual helm, but zero movement does not',()=>{
 const s={...initialState(),port:null,position:[-9.8,38],explorationLockedUntilSailing:true};
 const same=wrappedMotion(s.position,s.position);advanceManualMotion(s,nav,same,0);assert.equal(s.explorationLockedUntilSailing,true);
 advanceManualMotion(s,nav,wrappedMotion(s.position,helmStep(s.position,0,-1,1)),.1);assert.equal(s.explorationLockedUntilSailing,false);
});
test('exploration scoring is area weighted, deduplicated, deterministic and exactly capped at one million',()=>{
 const e=new Exploration();e.reveal([-12,38]);const a=explorationStats(e);assert.ok(a.explorationScore>0);e.reveal([-12,38]);assert.deepEqual(explorationStats(e),a);
 const restored=new Exploration(e.encode());assert.deepEqual(explorationStats(restored),a);
 const bits=Uint8Array.from(atob(EXPLORATION_MASK.bits),c=>c.charCodeAt(0));const all=new Exploration();all.bits.set(bits);assert.equal(explorationStats(all).explorationScore,1000000);assert.equal(explorationStats(all).explorationPercent,100);assert.ok(ELIGIBLE_AREA_M2>0);
 const low=new Exploration(),high=new Exploration();for(const [x,y,obj]of [[360,160,low],[360,20,high]]){const i=y*720+x;obj.bits[i>>3]|=1<<(i&7);}assert.ok(explorationStats(low).explorationArea>explorationStats(high).explorationArea);
 const orderA=new Exploration(),orderB=new Exploration();for(const p of [[179,0],[-179,0],[0,79.9]])orderA.reveal(p);for(const p of [[0,79.9],[-179,0],[179,0]])orderB.reveal(p);assert.deepEqual(explorationStats(orderA),explorationStats(orderB));
});
test('discovery inspection requires approach and clues; each collected ID scores exactly once and rescue never collects',()=>{
 for(const tier of [1,3,4]){
  const d=DISCOVERIES.find(d=>d.tier===tier),s={...initialState(),port:null,position:[...d.point]};
  if(d.rumorIds.length){assert.equal(inspectDiscovery(s,nav,d.id).ok,false);s.rumors=[...d.rumorIds];}
  const r=inspectDiscovery(s,nav,d.id,123);assert.equal(r.ok,true);assert.equal(r.fame,d.fame);assert.equal(inspectDiscovery(s,nav,d.id).ok,false);assert.equal(discoveryStats(parseSavedGame(s)).fame,d.fame);
  const blocked={...s,discoveries:{},explorationLockedUntilSailing:true};assert.equal(nearbyDiscoveries(blocked).length,0);assert.equal(inspectDiscovery(blocked,nav,d.id).ok,false);
 }
 const rumor=RUMORS[0],s=initialState();assert.equal(readRumor(s,rumor.id),s.port===rumor.portId);s.port=rumor.portId;assert.equal(readRumor(s,rumor.id),true);assert.equal(readRumor(s,rumor.id),true);assert.equal(s.rumors.filter(x=>x===rumor.id).length,1);
});
test('new ranking metrics choose five rows with the same key tie-break and retain offline summaries',()=>{
 const rows=Array.from({length:8},(_,i)=>({id:'u'+i,name:'선장'+i,money:1,profit:0,visited:1,explorationScore:12,fame:50}));
 for(const metric of ['explorationScore','fame'])assert.deepEqual(rankFleet(rows,metric).slice(0,5).map(p=>p.id),['u7','u6','u5','u4','u3']);
 assert.equal(rankFleet(rows,'fame')[1].rank,1);
});
test('offshore distances retain values beyond 255 NM and enforce the 300 NM coastal stage',()=>{
 assert.ok(nav.coastAt([-30,0])>300);
 assert.equal(nav.route([-30,0],[-30,1],{maxOffshore:300}),null);
 assert.ok(nav.route([-30,0],[-30,1],{maxOffshore:Infinity}));
});
test('public statistics publish only on actual value changes and never replace a newer saved revision',async()=>{
 let stats={money:100,profit:0,visited:1,saveRevision:3,statsVersion:3},current=null,writes=0;
 const f=new FleetPresence({readShip:()=>({}),readStats:()=>stats,onChange:()=>{},onStatus:()=>{}});Object.assign(f,{connected:true,active:true,uid:'u',root:'test',name:'선장',sdk:{ref:()=>'',serverTimestamp:()=>1,runTransaction:async(_,fn)=>{const next=fn(current);if(next===undefined)return {committed:false};current=next;writes++;return {committed:true};}}});
 await f.publishSummary();stats={...stats,saveRevision:4};await f.publishSummary();assert.equal(writes,1);
 stats={...stats,money:90,saveRevision:5};await f.publishSummary();assert.equal(writes,2);
 stats={...stats,money:999,saveRevision:4};await f.publishSummary();assert.equal(current.money,90);
});
test('a committed change while summary publishing is pending is drained before logout',async()=>{
 let stats={money:2400,profit:0,visited:1,shipTier:0,saveRevision:1,statsVersion:3},current=null,release,started;
 const gate=new Promise(r=>release=r),ready=new Promise(r=>started=r);let calls=0;
 const f=new FleetPresence({readShip:()=>({}),readStats:()=>stats,onChange:()=>{},onStatus:()=>{}});Object.assign(f,{connected:true,active:true,uid:'u',root:'test',name:'선장',sdk:{ref:()=>'',serverTimestamp:()=>1,runTransaction:async(_,fn)=>{if(++calls===1){started();await gate;}current=fn(current);return {committed:true};}}});
 const first=f.publishSummary();await ready;stats={...stats,money:1800,shipTier:1,saveRevision:2};const pending=f.publishSummary();release();await Promise.all([first,pending]);
 assert.equal(current.money,1800);assert.equal(current.shipTier,1);assert.equal(current.saveRevision,2);assert.equal(calls,2);
});

test('all old captains receive a raft once and their catalog value is refunded without erasing progress',()=>{
 const s={...initialState(),shipTier:9,fleetCount:3,money:1234,food:20,cargo:{wine:{qty:80,cost:2800}},visited:['lisbon','porto'],port:'porto',explored:'kept',discoveries:{'relic-compass':{foundDay:1,foundAt:2}}};delete s.raftStart;
 const before=structuredClone(s),expected=fleetAppraisal(s);const r=applyRaftStart(s,123);
 assert.equal(r.refund,expected);assert.equal(s.money,1234+expected);assert.equal(s.shipTier,0);assert.equal(s.fleetCount,1);assert.equal(s.food,10);assert.equal(s.supplyCreditValue,300);assert.deepEqual(s.cargo,before.cargo);assert.deepEqual(s.visited,before.visited);assert.equal(s.explored,'kept');assert.deepEqual(s.discoveries,before.discoveries);assert.equal(s.profit,before.profit);
 const first=structuredClone(s);assert.equal(applyRaftStart(s).applied,false);assert.deepEqual(s,first);assert.equal(applyRaftStart(parseSavedGame(s)).applied,false);
 s.shipTier=1;assert.equal(applyRaftStart(s).applied,false);assert.equal(s.shipTier,1,'new upgrades must survive reconnect');
});
test('legacy saves do not inherit a new captain marker and already-owned rafts are not compensated',()=>{
 const old={...initialState(),version:2,level:0};delete old.raftStart;delete old.shipTier;delete old.fleetCount;
 const migrated=parseSavedGame(old);assert.equal(migrated.raftStart,undefined);assert.equal(applyRaftStart(migrated,123).refund,5200);assert.equal(migrated.money,7600);assert.equal(migrated.raftStart.id,RAFT_START_ID);
 const raft=initialState();delete raft.raftStart;assert.equal(applyRaftStart(raft).refund,0);assert.equal(raft.money,2400);assert.equal(applyRaftStart(initialState()).applied,false);
});
test('a downgraded ship at sea returns only to a visited port without exploration or rescue fees',()=>{
 const s={...initialState(),shipTier:15,port:null,position:[100,0],voyage:{target:'havana',origin:'porto'},visited:['lisbon','porto'],recentPorts:['porto','lisbon'],explored:'unchanged',food:4,money:0};delete s.raftStart;
 const expected=fleetAppraisal(s);applyRaftStart(s,123);assert.equal(s.money,expected);assert.equal(s.port,'porto');assert.equal(s.voyage,null);assert.deepEqual(s.visited,['lisbon','porto']);assert.equal(s.explored,'unchanged');assert.equal(s.explorationLockedUntilSailing,true);assert.equal(s.food,4);
});
