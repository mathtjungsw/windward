import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Navigator,distance} from '../dist/engine.js';
import {ALL_PORTS,PORTS} from '../dist/data.js';
import {DEVELOPMENT_SITES} from '../dist/coastal-sites.js';
import {SHIPS} from '../dist/ship-rules.js';
import {PIRATE_ZONES,PIRATE_BY_ID,PIRATE_IDS} from '../dist/pirate-catalog.js';

const read=name=>JSON.parse(readFileSync(new URL('../dist/assets/'+name+'.json',import.meta.url),'utf8'));
const nav=new Navigator(read('navigation'),read('rivers'));
const legacy=[
 {id:'atlantic',name:'대서양 해적 정찰선',point:[-17,34],tier:0},
 {id:'caribbean',name:'카리브 해적 범선',point:[-77,19],tier:1},
 {id:'africa',name:'희망봉 해적선',point:[13,-33],tier:1},
 {id:'indian',name:'인도양 해적 기함',point:[61,8],tier:2},
 {id:'asia',name:'남중국해 해적선',point:[115,15],tier:1},
 {id:'pacific',name:'태평양 해적 기함',point:[-154,18],tier:2}
];
const legacyIds=new Set(legacy.map(z=>z.id));
const berths=[...new Map([...ALL_PORTS,...DEVELOPMENT_SITES].map(p=>[p.id,p])).values()].map(port=>({port,point:nav.approach(port)}));
const activeBerths=PORTS.map(port=>({port,point:nav.approach(port)}));
const sortedBerths=(zone,list=activeBerths)=>[...list].sort((a,b)=>distance(a.point,zone.point)-distance(b.point,zone.point));
const assertWaterRoute=(route,label)=>{
 assert.ok(route&&route.total>0,label+' lacks a route');
 for(let i=1;i<route.path.length;i++)assert.ok(nav.clear(route.path[i-1],route.path[i]),label+' crosses land');
};

test('24 stable pirate IDs share one index and preserve the six legacy encounters',()=>{
 assert.equal(PIRATE_ZONES.length,24);assert.equal(PIRATE_IDS.size,24);
 assert.deepEqual(Object.keys(PIRATE_BY_ID),PIRATE_ZONES.map(z=>z.id));
 for(const zone of PIRATE_ZONES){
  assert.match(zone.id,/^[a-z][a-z0-9-]*$/);assert.ok(zone.name);
  assert.equal(PIRATE_BY_ID[zone.id],zone);assert.ok(PIRATE_IDS.has(zone.id));
  assert.equal(zone.point.length,2);assert.ok(zone.point.every(Number.isFinite));
  assert.ok(zone.point[0]>=-180&&zone.point[0]<180&&zone.point[1]>=-60&&zone.point[1]<=80);
 }
 for(const old of legacy){const {id,name,point,tier}=PIRATE_BY_ID[old.id];assert.deepEqual({id,name,point,tier},old);}
});

test('regional encounters follow the planned 4 per region and 9/10/5 difficulty split',()=>{
 const expected={europe:[3,1,0],caribbean:[2,2,0],africa:[2,2,0],indian:[1,2,1],asia:[1,2,1],pacific:[0,1,3]};
 for(const [region,tiers]of Object.entries(expected))assert.deepEqual([0,1,2].map(tier=>PIRATE_ZONES.filter(z=>z.region===region&&z.tier===tier).length),tiers,region);
 assert.deepEqual([0,1,2].map(t=>PIRATE_ZONES.filter(z=>z.tier===t).length),[9,10,5]);
});

test('every pirate is on ocean water and connected by clear sailing segments',()=>{
 const origin=nav.approach(PORTS.find(p=>p.id==='lisbon'));
 for(const zone of PIRATE_ZONES){
  assert.equal(nav.isOceanLand(zone.point),false,zone.id+' is not ocean water');
  const route=nav.route(origin,zone.point);assertWaterRoute(route,zone.id+' from Lisbon');
  const ship=SHIPS.at(-1),days=route.sections.reduce((n,s)=>n+(s.end-s.start)/(s.river?ship.riverSpeed:ship.speed),0);
  assert.ok(days+ship.reserve<=ship.supply,zone.id+' exceeds final ship supply');
  const berth=sortedBerths(zone,berths)[0];assertWaterRoute(nav.route(berth.point,zone.point),zone.id+' from nearest berth');
  if(!legacyIds.has(zone.id))assert.ok(distance(berth.point,zone.point)>=60,zone.id+' is less than 60 NM from '+berth.port.id);
 }
});

test('pirate encounters are at least 250 NM apart by actual sailing route',()=>{
 for(let i=0;i<PIRATE_ZONES.length;i++)for(let j=i+1;j<PIRATE_ZONES.length;j++){
  const a=PIRATE_ZONES[i],b=PIRATE_ZONES[j];
  // Great-circle distance is a lower bound. Only nearer pairs need route finding.
  if(distance(a.point,b.point)>=250)continue;
  const route=nav.route(a.point,b.point);assertWaterRoute(route,a.id+'/'+b.id);
  assert.ok(route.total>=250,`${a.id}/${b.id}: ${route.total.toFixed(1)} NM`);
 }
});

test('scouts, raiders and flagships have round-trip supply access at matching ship progression',()=>{
 for(const zone of PIRATE_ZONES){
  const ship=SHIPS[[8,14,19][zone.tier]];
  const reachable=sortedBerths(zone).slice(0,6).some(({point})=>{
   if(nav.coastAt(zone.point)>ship.offshore)return false;
   const route=nav.route(point,zone.point,{maxOffshore:ship.offshore});
   if(!route||2*route.total/ship.speed+ship.reserve>ship.supply)return false;
   assertWaterRoute(route,zone.id+' progression access');return true;
  });
  assert.ok(reachable,zone.id+' has no return journey within ship supply/coastal limits');
 }
 for(const id of ['biscay-scout','western-med-scout']){
  const zone=PIRATE_BY_ID[id],ship=SHIPS[5];
  assert.ok(sortedBerths(zone).slice(0,6).some(({point})=>{
   const r=nav.route(point,zone.point,{maxOffshore:ship.offshore});
   return r&&2*r.total/ship.speed+ship.reserve<=ship.supply;
  }),id+' lacks an early European approach');
 }
});
