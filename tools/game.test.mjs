import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PORTS,PORT_BY_ID} from '../dist/data.js';
import {initialState,buy,sell,usedCargo,capacity,loadState,SAVE_KEY,Navigator,distance,positionAlong,voyageEstimate} from '../dist/engine.js';
const grid=JSON.parse(readFileSync(new URL('../dist/assets/navigation.json',import.meta.url),'utf8'));
const nav=new Navigator(grid);
const point=id=>[PORT_BY_ID[id].lon,PORT_BY_ID[id].lat];

test('first voyage: buy wine in Lisbon, sail to Seville, sell for profit',()=>{
  const s=initialState(),before=s.money;
  assert.equal(buy(s,'wine',10).ok,true);assert.equal(s.cargo.wine.qty,10);assert.equal(s.boughtLisbonWine,true);
  const route=nav.route(point('lisbon'),point('seville'));assert.ok(route);assert.ok(route.total>150&&route.total<600);
  const estimate=voyageEstimate(s,route);assert.ok(estimate.food<=s.food);
  assert.ok(distance(positionAlong({...route},route.total),point('seville'))<0.00001);
  s.port='seville';const r=sell(s,'wine',10);assert.equal(r.ok,true);assert.ok(r.profit>0);assert.ok(s.money>before);assert.equal(s.soldAway,true);assert.equal(usedCargo(s),0);
});
test('economy rejects overbuying, negative quantities, selling unowned cargo and trading at sea',()=>{
  const s=initialState();assert.equal(buy(s,'wine',capacity(s)+1).ok,false);assert.equal(buy(s,'wine',-1).ok,false);assert.equal(buy(s,'wine',NaN).ok,false);assert.equal(buy(s,'silk',1).ok,false);assert.equal(sell(s,'wine',1).ok,false);s.port=null;assert.equal(buy(s,'wine',1).ok,false);assert.equal(sell(s,'wine',1).ok,false);assert.equal(s.money,2400);
});
test('same-port buy/sell cannot create money, partial sales keep correct cost basis',()=>{
  const s=initialState();buy(s,'wine',10);const cost=s.cargo.wine.cost;const sale=sell(s,'wine',4);assert.equal(sale.ok,true);assert.equal(s.cargo.wine.qty,6);assert.equal(s.cargo.wine.cost,cost*.6);assert.ok(sale.profit<0);sell(s,'wine',6);assert.ok(s.money<2400);
});
test('save/load preserves voyages and cargo; corrupt saves recover safely',()=>{
  const s=initialState();buy(s,'wine',3);const route=nav.route(point('lisbon'),point('havana'));s.port=null;s.voyage={...route,target:'havana',travelled:100,foodRemaining:12};s.position=positionAlong(s.voyage,100);
  const storage={getItem:key=>key===SAVE_KEY?JSON.stringify(s):null};assert.deepEqual(loadState(storage),s);
  for(const invalid of ['{broken','null',JSON.stringify({...s,money:-100}),JSON.stringify({...s,level:99}),JSON.stringify({...s,cargo:{wine:{qty:-5,cost:100}}})])assert.deepEqual(loadState({getItem:()=>invalid}),initialState());
});
test('every port connects to the world ocean',()=>{
  for(const p of PORTS){const route=nav.route(point('lisbon'),[p.lon,p.lat]);assert.ok(route,`No sea route to ${p.id}`);assert.ok(Number.isFinite(route.total));assert.ok(route.path.length>=2);}
});
test('Europe to India goes around Africa, never through the continent',()=>{
  const route=nav.route(point('lisbon'),point('goa'));assert.ok(route);assert.ok(Math.min(...route.path.map(p=>p[1]))<-34,'Must round the southern tip of Africa');assert.ok(route.total>8500&&route.total<16000);
  for(let i=1;i<route.path.length-2;i++)assert.ok(nav.clear(route.path[i],route.path[i+1]),`Smoothed route crossed land at ${i}`);
});
test('Pacific routes cross the date line without crossing the whole map',()=>{
  const route=nav.route([175,0],[-175,0]);assert.ok(route);assert.ok(route.total<700);const half=positionAlong(route,route.total/2);assert.ok(Math.abs(half[0])>178);assert.ok(distance([175,0],[-175,0])<610);
});
