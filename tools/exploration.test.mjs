import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialState,loadState,Navigator,distance,helmStep} from '../dist/engine.js';
import {PORT_BY_ID,PORTS} from '../dist/data.js';
import {Exploration,SIGHT_NM,discoverPorts,buyInformation,informationCandidate,dockAlong,knowsPort,worldSpeed} from '../dist/voyage-core.js';
import {accountName,validPin,captainAddress,localSaveKey,parseGame} from '../dist/account.js';
import {seaSector,nearbySectors} from '../dist/presence-core.js';
const nav=new Navigator(JSON.parse(readFileSync(new URL('../dist/assets/navigation.json',import.meta.url))),JSON.parse(readFileSync(new URL('../dist/assets/rivers.json',import.meta.url))));
const approaches=new Map(PORTS.map(p=>[p.id,nav.approach(p)]));

test('initial four ports, discovery is separate from visits and tavern grants exactly one new destination',()=>{
 const s=initialState();assert.equal(s.knownPorts.length,4);assert.ok(s.knownPorts.every(id=>PORT_BY_ID[id]));assert.deepEqual(s.visited,['lisbon']);
 const candidate=informationCandidate(s),before=s.money;assert.ok(candidate);assert.equal(knowsPort(s,candidate.id),false);
 const r=buyInformation(s);assert.equal(r.ok,true);assert.equal(s.money,before-100);assert.equal(s.knownPorts.length,5);assert.equal(knowsPort(s,candidate.id),true);assert.deepEqual(s.visited,['lisbon']);
 s.money=0;const n=s.knownPorts.length;assert.equal(buyInformation(s).ok,false);assert.equal(s.knownPorts.length,n);assert.equal(s.money,0);
 s.money=1000;s.knownPorts=PORTS.map(p=>p.id);assert.equal(buyInformation(s).ok,false);assert.equal(s.money,1000);
});
test('approaching an unknown port unlocks it only once, even across a movement step',()=>{
 const s=initialState(),p=PORT_BY_ID.london,point=[p.lon,p.lat],a=helmStep(point,0,-1,60),b=helmStep(point,0,1,60);
 assert.ok(discoverPorts(s,a,b).some(p=>p.id==='london'));assert.equal(s.knownPorts.filter(id=>id==='london').length,1);assert.equal(s.visited.includes('london'),false);assert.equal(discoverPorts(s,a,b).length,0);
});
test('fog remembers explored regions, restores compactly and takes the short path at date line',()=>{
 const e=new Exploration(),p=[179,0];assert.equal(e.visibility(p,p),2);assert.equal(e.seen([-170,0]),false);e.travel(p,[-179,0]);
 assert.equal(e.seen([180,0]),true);assert.equal(e.seen([0,0]),false);const restored=new Exploration(e.encode());assert.equal(restored.seen([-179,0]),true);assert.equal(restored.visibility([-179,0],[0,0]),1);assert.equal(restored.visibility([-170,0],[0,0]),0);assert.ok(e.encode().length<35000);
 const boundary=e.boundary([-9,38]);assert.equal(boundary.length,73);for(const p of boundary)assert.ok(Math.abs(distance([-9,38],p)-SIGHT_NM)<.001);
});
test('river and ocean docking catches a crossed berth and skips the port just departed',()=>{
 for(const id of ['seville','london','lisbon']){const p=PORT_BY_ID[id],berth=approaches.get(id),river=p.river&&nav.rivers.find(r=>r.id===p.river);
  let a,b;if(river){const offset=nav.projectRiver(berth,river).offset;a=river.path[0];const route=nav.route(a,berth);a=route.path.at(-2);b=berth;}else {a=helmStep(berth,-1,0,12);b=berth;}
  assert.equal(dockAlong(nav,a,b,approaches,null)?.id,id,id);assert.notEqual(dockAlong(nav,a,b,approaches,id)?.id,id);
 }
});
test('real-world speed normalizes buttons, motion and reloaded saves while legacy voyage and progress remain',()=>{
 const s=initialState();s.speed=4;s.world='real';assert.equal(worldSpeed(s),1);const old={...s,money:6789,visited:['lisbon','london'],knownPorts:undefined};const loaded=loadState({getItem:()=>JSON.stringify(old)});assert.equal(loaded.speed,1);assert.equal(loaded.money,6789);assert.equal(knowsPort(loaded,'london'),true);assert.equal(localSaveKey('uid','peace')===localSaveKey('uid','real'),false);
});
test('test account names normalize, numeric six digits retain zeroes and serialized cloud saves keep empty cargo',async()=>{
 assert.equal(accountName('  바람선장 '),'바람선장');assert.equal(validPin('012345'),true);for(const pin of ['12345','1234567','abcdef','12 456'])assert.equal(validPin(pin),false);assert.throws(()=>accountName('<script>'));
 assert.equal(await captainAddress('ＣＡＰＴＡＩＮ'),await captainAddress('captain'));assert.notEqual(await captainAddress('선장1'),await captainAddress('선장2'));
 const s=initialState();assert.deepEqual(parseGame(JSON.stringify(s)),s);assert.throws(()=>parseGame('{bad'));assert.throws(()=>parseGame({...s,money:-1}));
});
test('nearby sea subscriptions cover the sight circle, date line and high latitudes without fetching the world',()=>{
 for(const position of [[-9,38],[179,0],[-179,70],[10,-55]]){const keys=nearbySectors(position);assert.ok(keys.length<36);assert.ok(keys.includes(seaSector(position)));for(let angle=0;angle<360;angle+=15){const p=helmStep(position,Math.sin(angle*Math.PI/180),Math.cos(angle*Math.PI/180),SIGHT_NM);assert.ok(keys.includes(seaSector(p)),`${position} misses ${p}`);}}
 assert.ok(nearbySectors([179,0]).some(key=>key.startsWith('0_')));
});
