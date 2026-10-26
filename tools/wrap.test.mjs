import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {helmStep,distance,Navigator} from '../dist/engine.js';
import {wrapLatitude,wrapPosition,wrapCamera,wrappedMotion,mapDistance,mapToward} from '../dist/world-wrap.js';
import {Exploration,discoverPorts} from '../dist/voyage-core.js';
import {initialState} from '../dist/engine.js';
import {nearbySectors,seaSector,interpolateShip} from '../dist/presence-core.js';
const nav=new Navigator(JSON.parse(readFileSync(new URL('../dist/assets/navigation.json',import.meta.url))),JSON.parse(readFileSync(new URL('../dist/assets/rivers.json',import.meta.url))));

test('north and south chart edges wrap in both directions without clamping camera',()=>{
 assert.ok(Math.abs(wrapLatitude(80.2)+59.8)<1e-9);assert.ok(Math.abs(wrapLatitude(-60.2)-79.8)<1e-9);assert.equal(wrapLatitude(38),38);assert.equal(wrapLatitude(80),80);assert.equal(wrapLatitude(-60),-60);
 assert.deepEqual(wrapCamera([1700,-5]),[100,795]);assert.deepEqual(wrapCamera([-5,805]),[1595,5]);assert.ok(Math.abs(wrapPosition([181,220.2])[1]+59.8)<1e-9);
});
test('a northbound ocean step emerges in southern water and charges only actual miles',()=>{
 const from=[0,79.8],raw=helmStep(from,0,1,60),step=wrappedMotion(from,raw);assert.equal(step.wrapped,true);assert.ok(step.position[1]<-59&&step.position[1]>-60);assert.ok(Math.abs(step.miles-60)<.00001);assert.ok(distance(from,step.position)>8000);
 assert.equal(step.legs[0][1][1],80);assert.equal(step.legs[1][0][1],-60);assert.ok(step.legs.every(([a,b])=>nav.clear(a,b)),'both real water segments are navigable');
 const s=initialState();for(const [a,b]of step.legs)discoverPorts(s,a,b);assert.equal(s.knownPorts.length,4,'no phantom discovery across Europe/Africa');assert.ok(step.miles/360*.9<1,'less than one ration, never a world crossing charge');
});
test('a southbound step and a clicked point across the seam preserve direction and stop at target',()=>{
 const step=wrappedMotion([0,-59.8],helmStep([0,-59.8],0,-1,60));assert.equal(step.wrapped,true);assert.ok(step.position[1]>79&&step.position[1]<80);
 const from=[0,79.9],target=[0,-59.9],raw=mapToward(from,target,30),clicked=wrappedMotion(from,raw);assert.ok(clicked.wrapped);assert.ok(mapDistance(clicked.position,target)<.0001);assert.ok(clicked.miles<15);
});
test('sight, exploration and neighbouring subscriptions span the north/south seam',()=>{
 const north=[0,79.9],south=[0,-59.9],e=new Exploration();assert.ok(mapDistance(north,south)<13);assert.equal(mapDistance(north,south),mapDistance(south,north));assert.equal(e.visibility(south,north),2);e.reveal(north);assert.equal(e.seen(south),true);assert.equal(e.seen([0,0]),false);
 assert.ok(nearbySectors(north).includes(seaSector(south)));assert.ok(nearbySectors(south).includes(seaSector(north)));
 const halfway=interpolateShip({lon:0,lat:79.8,angle:0},{lon:0,lat:-59.8,angle:0},.5);assert.ok(Math.abs(halfway.lat-80)<.001||Math.abs(halfway.lat+60)<.001,'other boats do not animate across the continents');
});
test('previous 281-row exploration saves retain all nonduplicate rows',()=>{
 const old=new Uint8Array(25290),cell=new Exploration().cell([-9,38]);old[cell>>3]|=1<<(cell&7);let encoded='';for(const b of old)encoded+=String.fromCharCode(b);const restored=new Exploration(btoa(encoded));assert.equal(restored.seen([-9,38]),true);assert.equal(restored.bits.length,25200);assert.equal(new Exploration(restored.encode()).seen([-9,38]),true);
});
