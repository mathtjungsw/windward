import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {initialState,Navigator} from '../dist/engine.js';
import {GOODS} from '../dist/data.js';
import {createChartDetail} from '../dist/chart-waterways.js';
import {parseState} from '../dist/save-game.js';
import {COASTS,ORDERS,nextCoast,takeCoast,abandonCoast,visitCoast,takeOrder,cancelOrder,fillOrder} from '../dist/coast-orders.js';
import {createCoastOrders} from '../dist/coast-orders-ui.js';

const time=Date.UTC(2026,10,20,14,58);
const later=time+3*60000;
const read=file=>readFileSync(new URL('../dist/assets/'+file,import.meta.url));
test('every chart fragment exists, is unlabeled cartography and has a water-side target',()=>{
 const json=file=>JSON.parse(read(file));
 const land=json('world-land.geojson').features.concat(json('islands.geojson').features);
 const nav=new Navigator(json('navigation.json'),json('rivers.json'),createChartDetail(land));
 assert.equal(new Set(COASTS.map(s=>s.id)).size,12);
 for(const site of COASTS){
  assert.equal(read('coast-sketches/'+site.id+'.webp').toString('ascii',8,12),'WEBP');
  assert.equal(nav.isLand(site.point),false,site.id);
 }
 for(const order of ORDERS){
  const goods=order.slots.flatMap(s=>s.goods);
  assert.equal(new Set(goods).size,goods.length);
  assert.ok(goods.every(id=>GOODS[id]&&!GOODS[id].legacy));
 }
});
test('starting harbor offers a nearby fragment, real passage awards one sketch, rescue and old saves handled',()=>{
 let game=parseState(initialState(),initialState);
 const site=nextCoast(game);assert.equal(site.id,'roca');
 takeCoast(game,site.id);assert.throws(()=>takeCoast(game,site.id));
 game=parseState(JSON.stringify(game),initialState);
 game.port=null;game.voyage={kind:'rescue'};
 const [x,y]=site.point,from=[x-.65,y],to=[x+.65,y];
 assert.equal(visitCoast(game,from,to,time),null);
 game.voyage=null;assert.equal(visitCoast(game,from,from,time),null);
 assert.equal(visitCoast(game,from,to,time),site);
 assert.equal(visitCoast(game,from,to,time),null);
 assert.deepEqual(parseState(JSON.stringify(game),initialState).coastBook.found,{roca:time});
 game.port='porto';const next=nextCoast(game);
 assert.notEqual(next.id,site.id);takeCoast(game,next.id);abandonCoast(game,next.id);
 assert.equal(game.coastBook.active,null);
});
test('one basket consumes chosen goods, preserves average costs, prevents partial, duplicate and cross-port delivery',()=>{
 let game=initialState();const order=ORDERS[0];
 takeOrder(game,order.id,'lisbon',time);
 game=parseState(JSON.stringify(game),initialState);
 const ticket={...game.customOrders.active},choices=['tea','porcelain','ginger'];
 game.cargo={tea:{qty:6,cost:150},porcelain:{qty:2,cost:234},ginger:{qty:1,cost:40}};
 const before=structuredClone(game);assert.throws(()=>fillOrder(game,ticket,choices,time));assert.deepEqual(game,before);
 game.cargo.ginger={qty:2,cost:80};game.port='porto';assert.throws(()=>fillOrder(game,ticket,choices,time));
 game.port='lisbon';assert.throws(()=>fillOrder(game,ticket,['tea','tea','ginger'],time));
 fillOrder(game,ticket,choices,time);
 assert.deepEqual(game.cargo,{tea:{qty:3,cost:75}});assert.equal(game.money,before.money+order.reward);
 assert.throws(()=>fillOrder(game,ticket,choices,time));assert.throws(()=>takeOrder(game,'shipwright','lisbon',time));
 game=parseState(JSON.stringify(game),initialState);takeOrder(game,'shipwright','lisbon',later);
 assert.throws(()=>cancelOrder(game,ticket));cancelOrder(game,game.customOrders.active);assert.equal(game.customOrders.active,null);
});
test('tavern acceptance and guild selection/settlement work through their displayed controls',async()=>{
 const window=new Window();globalThis.document=window.document;
 const game=initialState();game.cargo={tea:{qty:3,cost:90},glass:{qty:2,cost:140},pepper:{qty:2,cost:100}};
 document.body.innerHTML='<dialog open></dialog>';
 const dialog=document.querySelector('dialog'),click=async sel=>{const el=dialog.querySelector(sel);assert.ok(el);el.click();await new Promise(resolve=>setTimeout(resolve,0));};
 const ui=createCoastOrders({state:()=>game,now:()=>time,run:async fn=>fn(game,time),modal:(_t,_s,html)=>dialog.innerHTML=html});
 ui.coast(true);await click('[data-take]');assert.equal(game.coastBook.active,'roca');assert.ok(dialog.querySelector('[data-return]'));
 ui.orders();await click('[data-order="banquet"]');assert.equal(dialog.querySelector('select').value,'tea');
 assert.equal(dialog.querySelector('[data-fill]').disabled,false);await click('[data-fill]');
 assert.match(dialog.textContent,/오늘 주문을 완료/);assert.deepEqual(game.cargo,{});
 await window.happyDOM.abort();
});
