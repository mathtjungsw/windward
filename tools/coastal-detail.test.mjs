import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CoastalDetail} from '../dist/coastal-detail.js';
import {createChartDetail,COARSE_CONNECTIONS} from '../dist/chart-waterways.js';
import {Navigator,initialState,distance,positionAlong} from '../dist/engine.js';
import {DISCOVERIES} from '../dist/discoveries-catalog.js';
import {COASTAL_ACTIVITY_SITES,DEVELOPMENT_SITES} from '../dist/coastal-sites.js';
import {PIRATE_ZONES} from '../dist/combat-core.js';
import {PORTS,ALL_PORTS,PORT_BY_ID} from '../dist/data.js';
import {dockAlong} from '../dist/voyage-core.js';
import {reconcileNavigation,NAVIGATION_VERSION} from '../dist/navigation-migration.js';

const asset=name=>JSON.parse(readFileSync(new URL('../dist/assets/'+name,import.meta.url),'utf8'));
const features=[...asset('world-land.geojson').features,...asset('islands.geojson').features];
const nav=new Navigator(asset('navigation.json'),asset('rivers.json'),createChartDetail(features));
const berth=id=>nav.approach(PORT_BY_ID[id]);
const safePath=route=>route?.path.every((point,index)=>!index||nav.clear(route.path[index-1],point));
const polygon=(outer,holes=[])=>({geometry:{type:'Polygon',coordinates:[outer,...holes]}});
const box=(l,b,r,t)=>[[l,b],[r,b],[r,t],[l,t],[l,b]];

test('Alexandria and Jeddah can sail through Suez in both directions',async()=>{
  const {CANALS}=await import('../dist/projects.js');
  const alexandria=berth('alexandria'),jeddah=berth('jeddah');
  for(const [from,to] of [[alexandria,jeddah],[jeddah,alexandria]]){
    const route=nav.route(from,to,{canals:CANALS,maxOffshore:80});
    assert.deepEqual(route?.passages?.map(p=>p.id),['canal-suez']);
    assert.ok(route.total<1000);
    const withoutCanal=nav.route(from,to,{canals:[],maxOffshore:Infinity});
    assert.ok(withoutCanal.total>10000);
  }
});

test('Panama connects Caribbean and Pacific ports only when available for routing',async()=>{
  const {CANALS}=await import('../dist/projects.js');
  const panama=CANALS.filter(canal=>canal.id==='canal-panama');
  for(const [east,west] of [['havana','acapulco'],['cartagena','callao']]){
    for(const [from,to] of [[east,west],[west,east]]){
      const open=nav.route(berth(from),berth(to),{canals:panama});
      assert.deepEqual(open?.passages?.map(p=>p.id),['canal-panama']);
      const passage=open.passages[0];
      assert.ok(passage.start>0&&passage.end<open.total);
      const closed=nav.route(berth(from),berth(to),{canals:[]});
      assert.ok(!closed?.passages?.length);
      assert.ok(!closed||open.total<closed.total);
    }
  }
});

test('Acapulco has a navigable coastal berth and an existing voyage continues to it',()=>{
  const point=berth('acapulco'),old=[-100,16.5],from=[-102.5,16.6];
  assert.ok(nav.coastAt(point)<2);
  const route=nav.route(from,point,{maxOffshore:100});
  assert.ok(safePath(route));
  assert.deepEqual(route.path.at(-1),point);
  const approaches=new Map(PORTS.map(port=>[port.id,berth(port.id)]));
  assert.equal(dockAlong(nav,point,point,approaches)?.id,'acapulco');
  const previous=nav.route(from,old,{maxOffshore:100}),travelled=previous.total/2;
  const game={...initialState(),port:null,navigationVersion:NAVIGATION_VERSION,
    position:positionAlong(previous,travelled),voyage:{...previous,target:'acapulco',travelled}};
  reconcileNavigation(game,nav);
  assert.equal(game.voyage.travelled,travelled);
  assert.deepEqual(positionAlong(game.voyage,travelled),game.position);
  assert.deepEqual(game.voyage.path.at(-1),point);
  assert.ok(safePath(game.voyage));
  const adjusted=game.voyage;
  reconcileNavigation(game,nav);
  assert.equal(game.voyage,adjusted);
});

test('detail preserves islands smaller than a world grid cell, holes and the date line',()=>{
  const coast=new CoastalDetail([
    polygon(box(9.92,20.01,9.96,20.095)),
    polygon(box(14,22,16,24),[box(14.3,22.3,15.7,23.7)]),
    polygon(box(-179.98,10,-179.90,11))
  ]);
  assert.equal(coast.isLand([9.94,20.05]),true);
  assert.equal(coast.isLand([15,23]),false);
  assert.equal(coast.clear([9.8,20.05],[10.1,20.05]),false);
  assert.equal(coast.clear([9.8,20.2],[10.1,20.2]),true);
  assert.equal(coast.clear([179.8,10.5],[-179.8,10.5]),false);
  assert.equal(coast.clear([179.8,11.5],[-179.8,11.5]),true);
});

test('all catalog berths are water points, and the starter berth is a valid manual dock',()=>{
  assert.equal(PORTS.length,82);
  for(const port of ALL_PORTS){
    const point=berth(port.id);
    assert.ok(point&&!nav.isLand(point),port.id);
    assert.ok(distance(point,[port.lon,port.lat])<60,port.id);
  }
  for(const site of [...DISCOVERIES,...COASTAL_ACTIVITY_SITES,...DEVELOPMENT_SITES,...PIRATE_ZONES])assert.ok(!nav.isLand(site.point),site.id);
  const approaches=new Map(PORTS.map(p=>[p.id,berth(p.id)]));
  assert.equal(dockAlong(nav,berth('lisbon'),berth('lisbon'),approaches)?.id,'lisbon');
  assert.equal(dockAlong(nav,berth('lisbon'),berth('lisbon'),approaches,'lisbon'),null);
});

test('starter routes and the two straits stay in water and meet the same berths',()=>{
  for(const {path,id} of COARSE_CONNECTIONS)assert.ok(path.every((p,i)=>!i||nav.clearOcean(path[i-1],p)),id);
  for(const [a,b,limit] of [['lisbon','porto',80],['lisbon','seville',80],['busan','nagasaki',Infinity],
    ['athens','istanbul',Infinity],['belgrade','athens',Infinity],['amsterdam','cologne',Infinity]]){
    const route=nav.route(berth(a),berth(b),{maxOffshore:limit});
    assert.ok(safePath(route),a+' → '+b);
    assert.ok(distance(route.path[0],berth(a))<.0001,a);
    assert.ok(distance(route.path.at(-1),berth(b))<.0001,b);
  }
});

test('old docked and underway saves reconcile without awarding visits, money or free food',()=>{
  const game=initialState(),snapshot=structuredClone(game);
  assert.equal(reconcileNavigation(game,nav),null);
  assert.equal(game.navigationVersion,NAVIGATION_VERSION);
  assert.deepEqual(game.position,berth('lisbon'));
  assert.deepEqual(game.visited,snapshot.visited);
  assert.equal(game.money,snapshot.money);
  game.navigationVersion=undefined;game.port=null;game.position=[-10,39];game.food=6;
  game.voyage={target:'porto',origin:'lisbon',path:[[-10,39],[-8.61,41.15]],lengths:[190],total:190,travelled:90,foodRemaining:1};
  assert.match(reconcileNavigation(game,nav),/다시 계산/);
  assert.deepEqual(game.voyage.path.at(-1),berth('porto'));
  assert.ok(safePath(game.voyage));
  assert.equal(game.food,6);
  assert.deepEqual(game.visited,snapshot.visited);
  assert.equal(game.money,snapshot.money);
  const updated=structuredClone(game.voyage);
  assert.equal(reconcileNavigation(game,nav),null);
  assert.deepEqual(game.voyage,updated);
});
