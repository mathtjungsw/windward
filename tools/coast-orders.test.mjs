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
 takeCoast(game,site.id);assert.equal(takeCoast(game,site.id).noWrite,true);
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

test('a captain returning from any inland city can collect the fragment exactly when the return completes',async()=>{
 const {INLAND_CITIES,inlandWalk}=await import('../dist/inland.js');
 for(const city of Object.values(INLAND_CITIES)){
  let game=initialState();game.port=city.port;
  inlandWalk(game,city,time,false);
  let site=nextCoast(game);
  assert.throws(()=>takeCoast(game,site.id,time),/내륙/);
  inlandWalk(game,city,game.inland.visit.due,true);
  const due=game.inland.visit.due;
  game=parseState(JSON.stringify(game),initialState);
  site=nextCoast(game);
  assert.throws(()=>takeCoast(game,site.id,due-1),/돌아오는 중/);
  assert.equal(takeCoast(game,'old-offer',due).noWrite,true);
  takeCoast(game,site.id,due);
  assert.equal(game.inland.visit,undefined);
  assert.equal(parseState(JSON.stringify(game),initialState).coastBook.active,site.id);
 }
});
test('all coast sketches survive manual and automatic passage and save reload',()=>{
 for(const site of COASTS)for(const auto of [false,true]){
  let g=initialState();g.coastBook={found:{},active:site.id};g.port=null;
  const [x,y]=site.point;
  if(auto)g.voyage={path:[[x-.8,y],[x+.8,y]],lengths:[80],total:80,travelled:65,foodRemaining:2,target:null};
  assert.equal(visitCoast(g,[x-.01,y+.5],[x+.01,y+.5],time),null);
  assert.equal(visitCoast(g,[x-.8,y],[x+.8,y],time),site);
  g=parseState(JSON.stringify(g),initialState);
  assert.deepEqual(g.coastBook.found,{[site.id]:time});
 }
});

test('guild freight and ordinary sales settle once at each promoted destination including saved charters',async()=>{
 const {RELEASE}=await import('../dist/release-notes.js');
 const {registerDevelopedPorts,PORT_BY_ID}=await import('../dist/data.js?v='+RELEASE);
 const {availableCharters,charterAction,expireCharters}=await import('../dist/guild-contracts.js');
 const {marketKind,captainTradeQuote,executeTrade,portMarketItem}=await import('../dist/commerce.js');
 for(const name of ['mogadishu','cairns','comodoro','davao','reykjavik','stjohns']){
  const dest='depot-'+name;
  const register=level=>registerDevelopedPorts({[dest]:{id:dest,kind:'depot',level:1,promotionLevel:level,opensAt:time-1000,name}},time);
  register(2);
  const opts={room:200,findRoute:()=>({total:250}),baseFame:100};
  for(const tier of [0,5]){
   let game=initialState();game.knownPorts=['lisbon',dest];
   const offer=availableCharters(game,opts.findRoute,opts.room,time).find(r=>r.tier===tier);
   assert.equal(offer.target,dest);charterAction(game,'accept',offer.id,time,opts);
   game=parseState(JSON.stringify(game),initialState);game.port=dest;
   const content={promotion:{level:2}};
   if(offer.good){
    assert.equal(marketKind(dest,offer.good),'projects');
    game.cargo[offer.good]={qty:8,cost:80};
    const quote=captainTradeQuote(game,dest,offer.good,8,'sell',portMarketItem(content,dest,offer.good,1),time,0);
    opts.trade=row=>executeTrade(game,content,'captain',dest,row.good,row.qty,'sell',quote,time,1);
   }
   const result=charterAction(game,'deliver',offer.id,time,opts);
   if(offer.good){assert.equal(result.receipt.good,offer.good);assert.equal(game.cargo[offer.good],undefined);}
   assert.equal(game.guild.completed,1);assert.equal(game.guild.history[0].state,'complete');
   assert.throws(()=>charterAction(game,'deliver',offer.id,time,opts));
  }
  const game=initialState();game.knownPorts=['lisbon',dest];
  const old=availableCharters(game,opts.findRoute,opts.room,time).find(r=>r.tier===0);
  charterAction(game,'accept',old.id,time,opts);
  register(1);
  assert.ok(!availableCharters(game,opts.findRoute,opts.room,time).some(r=>r.target===dest));
  const expired=structuredClone(game);assert.equal(expireCharters(expired,time+86400000,100).loss,0);
  assert.match(charterAction(game,'cancel',old.id,time,opts).message,/명성 차감 없이/);
  assert.equal(game.guild.active.length,0);assert.equal(game.guild.lost,0);
 }
});
