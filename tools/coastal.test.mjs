import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GOODS,PORTS,PORT_BY_ID} from '../dist/data.js';
import {PORT_HISTORY} from '../dist/port-history.js';
import {directionForKey} from '../dist/controls.js';
import {validCard} from '../dist/social-core.js';
import {Navigator,initialState,canDepart,advanceVoyage,advanceManualMotion,beginRescue,parseSavedGame,recordArrival,resupply,unloadSupply,maxBuyQuantity,usedSpace,upgradeShip,voyageEstimate,price,sellPrice,helmStep} from '../dist/engine.js';
import {wrappedMotion} from '../dist/world-wrap.js';

const json=name=>JSON.parse(readFileSync(new URL(`../dist/assets/${name}.json`,import.meta.url),'utf8'));
const nav=new Navigator(json('navigation'),json('rivers'));
const point=id=>[PORT_BY_ID[id].lon,PORT_BY_ID[id].lat];
const route=(a,b,coastal=false)=>nav.route(point(a),point(b),{maxOffshore:coastal?80:Infinity});

test('coastal trade works while the starter cannot depart for Madeira or Havana',()=>{
  const s=initialState();
  const local=route('lisbon','setubal',true);assert.ok(canDepart(s,local).ok);
  const porto=route('lisbon','porto',true);assert.ok(voyageEstimate(s,porto).food*2+.5<6);
  for(const id of ['funchal','havana'])assert.equal(canDepart(s,route('lisbon',id,true)).ok,false);
  assert.equal(upgradeShip(s).ok,false);assert.equal(s.money,2400);
  const goods=Object.entries(GOODS);assert.equal(goods.filter(([,g])=>!g.legacy).length,23);
  for(const p of PORTS){assert.ok(PORT_HISTORY[p.id]?.text,p.id);assert.ok(!p.market.includes('spice'));for(const [id]of goods)assert.ok(sellPrice(p.id,id,0)>0);}
  const net=(sellPrice('setubal','wine',0)-price('lisbon','wine',0)+sellPrice('lisbon','salt',0)-price('setubal','salt',0))*37-6;
  assert.ok(net>100,`starter round trip net ${net}`);
});

test('supply consumes cargo space and credit restores supplies without creating money',()=>{
  const s=initialState();assert.equal(usedSpace(s),3);assert.equal(maxBuyQuantity(s,'wine'),37);
  assert.equal(unloadSupply(s,2),true);assert.equal(s.food,4);assert.equal(s.supplyCreditDays,2);
  assert.equal(maxBuyQuantity(s,'wine'),38);assert.equal(maxBuyQuantity(s,'wine',6),37);
  assert.deepEqual(resupply(s,Infinity),{ok:true,amount:2,cost:0});assert.equal(s.money,2400);assert.equal(s.supplyCreditDays,0);
});

test('auto and direct motion spend identical food and game time, including river travel',()=>{
  for(const [a,b] of [[[-12,40],helmStep([-12,40],1,0,.4)],[[ -6.003,37.398261],nav.rivers.find(r=>r.id==='guadalquivir').path.at(-1)]]){
    const r=nav.route(a,b);assert.ok(r);if(r.total<.00001)continue;
    const auto={...initialState(),port:null,position:a,voyage:{...r,travelled:0,foodRemaining:6}};
    const expected=voyageEstimate(auto,r);const result=advanceVoyage(auto,nav,expected.seconds);
    assert.ok(result.arrived);assert.ok(Math.abs(auto.day-expected.days)<1e-8);assert.ok(Math.abs(auto.food-(6-expected.food))<1e-8);
  }
  const a=[-12,40],b=helmStep(a,1,0,.4),s={...initialState(),port:null,position:a,level:1};
  const moved=advanceManualMotion(s,nav,wrappedMotion(a,b),.4/120*12);
  assert.ok(moved.finished);assert.ok(Math.abs(s.day-.4/120)<1e-8);
});

test('depletion stops a voyage exactly and rescue persists without a second charge',()=>{
  const s={...initialState(),port:null,position:[-10,38],money:42,food:.1};
  const route=nav.route(s.position,[-10,37]);s.voyage={...route,target:null,travelled:0,foodRemaining:.1};
  const step=advanceVoyage(s,nav,120);assert.ok(step.depleted);assert.ok(!step.arrived);assert.ok(Math.abs(step.miles-8)<1e-7);
  const rescue=beginRescue(s,nav);assert.ok(rescue.ok);assert.equal(rescue.cost,42);assert.equal(s.money,0);
  const loaded=parseSavedGame(JSON.stringify(s));assert.equal(loaded.voyage.kind,'rescue');assert.equal(beginRescue(loaded,nav).ok,false);assert.equal(loaded.money,0);
  const v=loaded.voyage;assert.ok(advanceVoyage(loaded,nav,voyageEstimate(loaded,v).seconds).arrived);
  recordArrival(loaded,v.target,v);assert.equal(loaded.food,2);
  const penniless={...initialState(),port:null,position:[-10,38],money:0,food:0};assert.equal(beginRescue(penniless,nav).cost,0);
});

test('version one keeps cash, cargo, levels and active routes, with a single supply conversion',()=>{
  const s={...initialState(),version:1,money:8750,food:100,level:1,cargo:{spice:{qty:7,cost:300}},knownPorts:['lisbon','porto']};
  const docked=parseSavedGame(s);assert.equal(docked.version,2);assert.equal(docked.money,8750);assert.equal(docked.food,20);assert.equal(docked.supplyCreditDays,80);assert.deepEqual(docked.cargo,s.cargo);
  assert.equal(parseSavedGame(docked).supplyCreditDays,80);
  const r=route('lisbon','porto');const sailing=parseSavedGame({...s,port:null,voyage:{...r,target:'porto',travelled:10,foodRemaining:2}});
  assert.equal(sailing.food,100);assert.equal(sailing.voyage.legacy,true);assert.equal(sailing.voyage.travelled,10);
  assert.throws(()=>parseSavedGame({...s,cargo:{spice:{qty:-1,cost:300}}}));
});

test('WASD matches the four arrows and ignores modified or composing input',()=>{
  for(const [key,code,d]of [['w','KeyW','ArrowUp'],['s','KeyS','ArrowDown'],['a','KeyA','ArrowLeft'],['d','KeyD','ArrowRight']]){
    assert.equal(directionForKey({key,code}),d);assert.equal(directionForKey({key:'ㅁ',code}),d);assert.equal(directionForKey({key,code},false),null);
    assert.equal(directionForKey({key:d},false),d);assert.equal(directionForKey({key,code,isComposing:true}),null);assert.equal(directionForKey({key,code,ctrlKey:true}),null);
  }
});

test('share cards accept catalog identifiers and reject additional coordinates',()=>{
  assert.equal(validCard({kind:'port',ref:{portId:'setubal'}}),true);
  assert.equal(validCard({kind:'port',ref:{portId:'constructor'}}),false);
  assert.equal(validCard({kind:'port',ref:{portId:'setubal',lon:-9}}),false);
  assert.equal(validCard({kind:'route',ref:{fromPortId:'lisbon',toPortId:'setubal',observedNm:74}}),true);
});
