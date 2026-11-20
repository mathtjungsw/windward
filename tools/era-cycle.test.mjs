import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {RELEASE} from '../dist/release-notes.js';
import {initialState,parseSavedGame} from '../dist/engine.js';
import {captainTradeQuote,deliverForGrowth,executeTrade,portMarketItem} from '../dist/commerce.js';
import {ERA_DISCOVERIES} from '../dist/era-discoveries.js';
import {collectionArt} from '../dist/art.js';
import {DISCOVERIES,DISCOVERY_BY_ID,RUMOR_BY_ID} from '../dist/discoveries-catalog.js';
import {hasClues,inspectDiscovery,readRumor} from '../dist/discoveries.js';
import {extraHarborRumor} from '../dist/harbor-officers.js';
import {ITEMS,OFFICER_BY_ID} from '../dist/rumor-catalog.js';
import {recordTrade} from '../dist/rank-progress.js';

const {ERAS,ERA_PERIOD,LEGACY_ERA_PERIOD,configureEra,eraAt,eraAvailable}=await import('../dist/era-cycle.js?v='+RELEASE);
const {GOODS,PORTS,PORT_BY_ID,PORT_GROWTH_GOODS,harborMarket,registerDevelopedPorts}=await import('../dist/data.js?v='+RELEASE);
const {ERA_GOODS,REGIONAL_GOOD_IDS}=await import('../dist/era-goods.js?v='+RELEASE);
const start=Date.UTC(2026,10,14,15);
test('the stationed officer in Jeddah skips unavailable eras and keeps the rumor open after reading it',()=>{
 const target=Object.values(RUMOR_BY_ID).find(r=>r.era===2&&PORT_BY_ID[r.portId]?.region===PORT_BY_ID.jeddah.region);
 assert.ok(target);
 const game={...initialState(),port:'jeddah',harborOfficers:{jeddah:'O017'},
  rumors:Object.keys(RUMOR_BY_ID).filter(id=>id!==target.id)};
 const book={harborOfficer:{owner:'captain',id:'O017',role:'explore'}};
 configureEra(start,{at:start,first:1});
 try{
  assert.equal(extraHarborRumor(game,book,'captain',start),null);
  const second=start+ERA_PERIOD;
  assert.equal(extraHarborRumor(game,book,'captain',second)?.id,target.id);
  assert.equal(readRumor(game,target.id,target.id,start),false);
  assert.equal(readRumor(game,target.id,target.id,second),true);
  assert.equal(extraHarborRumor(game,book,'captain',second,target.id)?.id,target.id);
  assert.equal(extraHarborRumor(game,book,'captain',start,target.id),null);
 }finally{configureEra(null);}
});
test('the legacy era ends at its announced time and the new sequence uses five 24-hour windows',()=>{
 const switchAt=start+4*LEGACY_ERA_PERIOD;
 configureEra(start,{at:switchAt,first:5});
 assert.equal(eraAt(switchAt-1).id,4);
 assert.equal(eraAt(switchAt-1).end,switchAt);
 assert.equal(eraAt(switchAt-1).next.id,5);
 assert.deepEqual([0,1,2,3,4,5].map(i=>eraAt(switchAt+i*ERA_PERIOD).id),[5,1,2,3,4,5]);
 assert.equal(eraAt(switchAt).window,switchAt);
 assert.equal(ERA_PERIOD,86400000);
 configureEra(start,{at:start,first:1});
 try{
  assert.deepEqual([0,1,2,3,4,5].map(i=>eraAt(start+i*ERA_PERIOD).id),[1,2,3,4,5,1]);
  for(const [id,good] of Object.entries(ERA_GOODS))for(const port of good.ports){
   const p=PORT_BY_ID[port];assert.ok(p,port);
   for(let i=0;i<5;i++)assert.equal(harborMarket(p,start+i*ERA_PERIOD).includes(id),!good.era||i+1===good.era,id);
  }
  for(const p of PORTS){
   const windows=ERAS.map((_,i)=>harborMarket(p,start+i*ERA_PERIOD));
   assert.ok(windows.every(list=>p.market.every(id=>list.includes(id))),p.id+' lost basic goods');
   assert.equal(new Set(windows.map(list=>list.slice().sort().join(','))).size,5,p.id);
  }
  assert.ok(!eraAvailable({era:2},start+ERA_PERIOD-1));
  assert.ok(eraAvailable({era:2},start+ERA_PERIOD));
 }finally{configureEra(null);}
});

test('a quote at the boundary expires while cargo remains saleable at its recorded cost',()=>{
 const game={...initialState(),port:'chennai',money:9000},content={};
 configureEra(start,{at:start,first:1});
 try{
  const boundary=start+ERA_PERIOD;
  const quote=captainTradeQuote(game,'chennai','rice',2,'buy',{},boundary-500,0);
  executeTrade(game,content,'test','chennai','rice',2,'buy',quote,boundary-500,0);
  assert.throws(()=>executeTrade(game,content,'test','chennai','rice',2,'buy',quote,boundary+1,0),/구매할 수 없어요/);
  assert.equal(parseSavedGame(JSON.stringify(game)).cargo.rice.cost,quote.total);
  const sale=captainTradeQuote(game,'chennai','rice',2,'sell',{},boundary+1,0);
  assert.equal(executeTrade(game,content,'test','chennai','rice',2,'sell',sale,boundary+1,0).ok,true);
 }finally{configureEra(null);}
});

test('every active harbor has a regional good and stage two honors previous investments',()=>{
 for(const port of PORTS)assert.equal(GOODS[PORT_GROWTH_GOODS[port.id]].unlockStage,2,port.id);
 const good=PORT_GROWTH_GOODS.nagasaki;
 assert.equal(portMarketItem({investors:{a:1200000}},'nagasaki',good,0).specialtyLimit,0);
 assert.equal(portMarketItem({investors:{a:4500000}},'nagasaki',good,0).specialtyLimit,100);
 const neutral=PORT_GROWTH_GOODS.lisbon,book={growthContribution:290},g=initialState();
 g.cargo.wine={qty:10,cost:40};
 deliverForGrowth(g,book,'a','lisbon',start,Math.floor((start+32400000)/86400000));
 assert.equal(portMarketItem(book,'lisbon',neutral,1).specialtyLimit,100);
 assert.throws(()=>deliverForGrowth(g,book,'a','lisbon',start,Math.floor((start+32400000)/86400000)),/조건/);
});

test('historic cards point to distinct, credited WebP evidence and a small local thumbnail',async()=>{
 assert.equal(new Set(ERA_DISCOVERIES.map(d=>d.media.url)).size,ERA_DISCOVERIES.length);
 for(const d of ERA_DISCOVERIES){
  assert.ok(d.media.license&&d.sources.length,d.id);
  for(const [detail,limit] of [[false,12000],[true,60000]]){
   const image=await readFile(new URL('../dist/'+collectionArt(d.id,detail),import.meta.url));
   assert.equal(image.subarray(8,12).toString(),'WEBP');assert.ok(image.length<=limit,d.id);
  }
 }
});

test('ancient works and their tavern rumors remain discoverable across all five eras',()=>{
 const museum=ERA_DISCOVERIES.filter(d=>(!d.era||d.era<5)&&d.media.license==='CC0 1.0'&&d.media.url.startsWith('https://clevelandart.org/art/'));
 assert.equal(DISCOVERIES.length,301);
 assert.equal(museum.length,24);
 assert.equal(museum.filter(d=>d.kind==='book').length,18);
 assert.equal(museum.filter(d=>!d.era).length,21);
 const ids=['era-al-jazari-automata','era-rashid-chronicles','era-sadi-gulistan','era-angkor','era-prambanan',
  'era-ayutthaya','era-trowulan','era-mamallapuram-rathas','era-gangaikonda','era-brhadisvara','era-polonnaruwa','era-song-illustration'];
 configureEra(start,{at:start,first:1});
 try{
  for(let i=0;i<5;i++){
   const now=start+i*ERA_PERIOD;
   for(const id of ids){
    const discovery=DISCOVERY_BY_ID[id],game=initialState();
    const rumor=RUMOR_BY_ID[discovery.rumorIds[0]];
    assert.ok(eraAvailable(rumor,now),id);
    assert.ok(!hasClues(game,discovery,now),id);
    game.rumors=[rumor.id];
    game.position=discovery.point;
    assert.ok(inspectDiscovery(game,{clear:()=>true},id,now).ok,id);
    assert.ok(parseSavedGame(JSON.stringify(game)).discoveries[id],id);
   }
   assert.equal(eraAvailable(DISCOVERY_BY_ID['era-mirror-holiness'],now),i===2);
   for(const id of ['O025','O026','O033'])assert.ok(eraAvailable(OFFICER_BY_ID[id],now),id);
  }
 }finally{configureEra(null);}
 for(const gear of ITEMS.slice(-10))for(const good of gear.sellGoods||[])assert.ok(GOODS[good],gear.id+' '+good);
});

test('eight new natural landforms are represented by source photos and clues in every era',()=>{
 const ids=['geiranger-fjord','nile-delta','halong-karst','wadden-tidal-flats','kilauea-shield',
  'belize-blue-hole','lencois-dune-lagoons','jeju-jusangjeolli'];
 assert.equal(DISCOVERIES.filter(d=>d.kind==='nature').length,21);
 configureEra(start,{at:start,first:1});
 try{
  for(const slug of ids){
   const entry=DISCOVERY_BY_ID['era-'+slug];
   assert.equal(entry.kind,'nature',slug);
   assert.ok(entry.place&&entry.media.file,slug);
   for(let i=0;i<5;i++){
    const now=start+i*ERA_PERIOD;
    assert.ok(eraAvailable(entry,now)&&eraAvailable(RUMOR_BY_ID[entry.rumorIds[0]],now),slug);
   }
  }
 }finally{configureEra(null);}
});

test('all new photos, trade goods, officers and equipment have a fifth-era entry',()=>{
 const discoveries=ERA_DISCOVERIES.filter(d=>d.era===5);
 const goods=Object.values(ERA_GOODS).filter(g=>g.era===5);
 const officers=Object.values(OFFICER_BY_ID).filter(o=>o.era===5);
 const gear=ITEMS.filter(item=>item.era===5);
 assert.equal(discoveries.length,10);
 assert.equal(goods.length,16);
 assert.equal(officers.length,4);
 assert.equal(gear.length,6);
 assert.ok(discoveries.every(d=>d.media&&d.sources.length));
 for(const item of gear)for(const id of item.sellGoods||[])assert.ok(GOODS[id],id);
});

test('all regular goods can be collected and restored across trade eras',()=>{
 const game=initialState(),ids=Object.keys(GOODS).filter(id=>!GOODS[id].legacy&&!GOODS[id].premium);
 assert.equal(ids.length,161);
 assert.equal(REGIONAL_GOOD_IDS.length,15);
 try{
  configureEra(start,{at:start,first:1});
  for(const id of REGIONAL_GOOD_IDS){
   const good=ERA_GOODS[id];
   for(const pid of good.markets)assert.ok(PORT_BY_ID[pid]?.active,pid);
   for(let i=0;i<5;i++){
    const at=start+i*ERA_PERIOD;
    for(const pid of good.ports)assert.equal(harborMarket(PORT_BY_ID[pid],at).includes(id),!good.era||good.era===i+1,id+':'+pid);
   }
   const at=start+((good.era||1)-1)*ERA_PERIOD;
   const buy=captainTradeQuote(game,good.ports[0],id,10,'buy',{},at,0);
   assert.ok(good.markets.some(pid=>captainTradeQuote(game,pid,id,10,'sell',{},at,0).total>buy.total),id);
  }
  for(const id of ids)recordTrade(game,id,'buy',0,start);
  recordTrade(game,REGIONAL_GOOD_IDS[0],'sell',10,start);
  assert.deepEqual(parseSavedGame(JSON.stringify(game)).rankProgress.tradedGoods,ids);
 }finally{configureEra(null);}
});

test('open depots unlock and sell their own regional item through public deliveries',()=>{
 const id='depot-cairns',product=PORT_GROWTH_GOODS[id];
 const game={...initialState(),port:id,money:1000000},book={growthContribution:290};
 game.cargo.grain={qty:10,cost:80};
 registerDevelopedPorts({[id]:{kind:'depot',level:1,opensAt:start}},start);
 assert.equal(portMarketItem(book,id,product,0).specialtyLimit,0);
 assert.throws(()=>captainTradeQuote(game,id,product,1,'buy',portMarketItem(book,id,product,0),start,0),/30상자/);
 deliverForGrowth(game,book,'a',id,start,Math.floor((start+32400000)/86400000));
 const item=portMarketItem(book,id,product,1);
 assert.equal(item.specialtyLimit,100);
 const quote=captainTradeQuote(game,id,product,1,'buy',item,start,0);
 assert.equal(executeTrade(game,book,'a',id,product,1,'buy',quote,start,1).ok,true);
 assert.equal(game.cargo[product].qty,1);
 game.port=null;
 assert.throws(()=>executeTrade(game,book,'a',id,product,1,'buy',quote,start,1),/입항/);
});

test('all announcements use distinct compact WebP hero images',async()=>{
 const assets=await Promise.all(ERAS.map(era=>readFile(new URL(`../dist/assets/era-heroes/${era.art}.webp`,import.meta.url))));
 assert.equal(new Set(assets.map(bytes=>bytes.toString('base64'))).size,6);
 assert.ok(assets.every(bytes=>bytes.subarray(8,12).toString()==='WEBP'&&bytes.length<250000));
});

test('sixth era begins at the scheduled midnight and all survey goods and crews are reachable',()=>{
 const boundary=start+5*ERA_PERIOD;
 configureEra(start,{at:start,first:1,sixAt:boundary});
 try{
  assert.deepEqual([-1,0,1,6].map(i=>eraAt(boundary+i*ERA_PERIOD).id),[5,6,1,6]);
  assert.equal(eraAt(boundary-1).next.id,6);
  const goods=Object.entries(ERA_GOODS).filter(([,g])=>g.era===6);
  assert.equal(goods.length,32);
  for(const [id,g] of goods){
   for(const port of g.ports){assert.ok(PORT_BY_ID[port],port);assert.ok(harborMarket(PORT_BY_ID[port],boundary).includes(id),id);}
   for(const port of g.markets)assert.ok(PORT_BY_ID[port],port);
   const game=initialState(),quote=captainTradeQuote(game,g.ports[0],id,1,'buy',{},boundary,0);
   assert.ok(g.markets.some(p=>captainTradeQuote(game,p,id,1,'sell',{},boundary,0).total>quote.total),id);
  }
  const windows=Array.from({length:6},(_,n)=>boundary+n*ERA_PERIOD);
  for(const port of PORTS.filter(p=>!p.depot||p.promotionLevel>=2))assert.equal(new Set(windows.map(at=>harborMarket(port,at).slice().sort().join(','))).size,6,port.id);
  assert.equal(ERA_DISCOVERIES.filter(d=>d.era===6).length,24);
  for(const rows of [Object.values(OFFICER_BY_ID),ITEMS]){
   const added=rows.filter(o=>o.era===6);assert.equal(added.length,8);
   for(const o of added){assert.ok(PORT_BY_ID[o.tavern]&&PORT_BY_ID[o.port],o.id);assert.ok(eraAvailable(o,boundary));assert.ok(!eraAvailable(o,boundary+ERA_PERIOD));}
  }
 }finally{configureEra(null);}
});
