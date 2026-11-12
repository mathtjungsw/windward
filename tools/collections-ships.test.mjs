import test from 'node:test';
import assert from 'node:assert/strict';
import {access,stat} from 'node:fs/promises';
import {initialState,parseSavedGame,historicalQuote,buildHistoricalShip,quoteShipSale,quoteShipStorage,storeShip,quoteShipRecall,recallShip} from '../dist/engine.js';
import {ship,syncFleet,vesselSpec,fleetLimit,fleetMaxHP} from '../dist/ship-rules.js';
import {HISTORICAL_SHIPS,historicalProgress,shipyardVictory,shipyardReport,turtleShipyard} from '../dist/historical-ships.js';
import {PIRATE_BY_ID} from '../dist/pirate-catalog.js';
import {PORT_BY_ID} from '../dist/data.js';
import {readContractRumor,rumorNote,setRumorHidden} from '../dist/rumor-progress.js';
import {fireAtPirate} from '../dist/combat-core.js';
import {collectionArt} from '../dist/art.js';
import {ITEMS} from '../dist/rumor-catalog.js';
import {DISCOVERIES} from '../dist/discoveries-catalog.js';
import {collectionProfile} from '../dist/collection-profile.js';
import {overallRanking} from '../dist/overall-ranking.js';
import {prepareUsage,usageDay,usageSlot} from '../dist/ui-usage.js';
import {findMenus} from '../dist/menu-finder.js';
import {discoveryStudy,discoveryCoordinates} from '../dist/discovery-study.js';
import {historicalArt} from '../dist/historical-ship-art.js';

test('all historical ship roles require an unlock and preserve the hull and cost on reload',()=>{
 const qualifying={
  felucca:{visited:['lisbon','cairo']},
  galley:{visited:['lisbon','venice','athens','alexandria'],shipyard:{coastal:2}},
  fluyt:{projectStats:{freight:2}},
  fujian:{visited:['lisbon','shanghai','malacca'],shipyard:{porcelain:2}},
  baghlah:{visited:['lisbon','aden','goa'],guild:{proofs:{indian:2}}},
  waka:{visited:['lisbon','honolulu','suva']},
  panok:{shipyard:{reported:2}},
  endeavour:{guild:{proofs:{survey:2}},shoreProgress:{sites:['porto','cadiz','lisbon']}},
  turtle:{shipyard:{turtleRumor:true,turtleOrder:{delivered:true,kills:1}}}
 };
 for(const row of HISTORICAL_SHIPS){
  const game=initialState(),port=PORT_BY_ID[row.port];
  assert.ok(port?.active,row.port);
  Object.assign(game,{port:row.port,money:100000,position:[port.lon,port.lat]});
  syncFleet(game,[{id:'base',tier:row.stage-1}],'base');
  assert.equal(historicalQuote(game,row.id).ready,false,row.id);
  Object.assign(game,qualifying[row.id]);
  game.shipyard={unlocked:[],...game.shipyard};
  const quote=historicalQuote(game,row.id);
  assert.equal(quote.ready,true,row.id);
  assert.equal(buildHistoricalShip(game,row.id,quote.cost+1).ok,false);
  assert.equal(buildHistoricalShip(game,row.id,quote.cost).ok,true);
  const saved=parseSavedGame(game),vessel=saved.fleetShips[1];
  assert.equal(vessel.kind,row.id);
  assert.equal(vesselSpec(vessel).name,row.name);
  assert.equal(quoteShipSale(saved,vessel.id).price,Math.floor(quote.cost*.6));
  assert.equal(saved.money,100000-quote.cost);
  assert.equal(ship(saved).offshore,quote.future.offshore);
  assert.equal(historicalProgress(saved,row.id).earned,true);
 }
});
test('Busan rumor joins the note and materials cannot be delivered twice',()=>{
 const game=initialState();
 assert.equal(readContractRumor(game,'shipyard-busan'),false);
 Object.assign(game,{port:'busan',cargo:{timber:{qty:22,cost:44},copper:{qty:10,cost:60}}});
 assert.equal(readContractRumor(game,'shipyard-busan'),true);
 assert.equal(rumorNote(game).find(n=>n.id==='shipyard-busan').complete,false);
 assert.equal(setRumorHidden(game,'shipyard-busan',true),true);
 turtleShipyard(game,'accept');
 turtleShipyard(game,'deliver');
 assert.deepEqual(game.cargo,{timber:{qty:2,cost:4}});
 assert.throws(()=>turtleShipyard(game,'deliver'));
 shipyardVictory(game,true,PIRATE_BY_ID.asia);
 assert.equal(historicalProgress(game,'turtle').earned,false);
 shipyardVictory(game,true,PIRATE_BY_ID['east-china-scout']);
 assert.equal(historicalProgress(game,'turtle').earned,true);
 shipyardReport(game,'east-china-scout');shipyardReport(game,'east-china-scout');
 assert.equal(game.shipyard.reported,1);
 assert.equal(rumorNote(parseSavedGame(game)).find(n=>n.id==='shipyard-busan').hidden,true);
});
test('turtle flagship reduces the first NPC retaliation once even through a save',()=>{
 const game=initialState(),zone=PIRATE_BY_ID['east-china-scout'];
 Object.assign(game,{port:null,position:[...zone.point],cannons:[{id:'gun',kind:'swivel',shipId:'vessel-0',quality:0,readyAt:0}]});
 syncFleet(game,[{id:'vessel-0',tier:13,kind:'turtle'}]);
 const attack=(s,at)=>fireAtPirate(s,zone.id,'gun',at,[1,0],()=>true,()=>50);
 attack(game,1000);
 assert.equal(attack(game,30000).retaliation.damage,9);
 assert.equal(game.npcBattle.turtleGuard,true);
 assert.equal(attack(parseSavedGame(game),60000).retaliation.damage,12);
});
test('rank tie points, starting gifts, and collection payload stay separate from private saves',()=>{
 const ranks=overallRanking({a:{name:'A',profit:90,money:2400},b:{name:'B',profit:90,money:2500},c:{name:'C',profit:10},new:{name:'New',money:2400,visited:1,fleetGrowth:1}},{});
 assert.equal(ranks.captains.a.points.profit,10000);
 assert.equal(ranks.captains.c.points.profit,3333);
 assert.equal(ranks.captains.a.points.money,undefined);
 assert.equal(ranks.captains.new,undefined);
 const game=initialState(),found=DISCOVERIES[0].id;
 game.discoveries={[found]:{foundDay:2,foundAt:123456},'fake-id':{foundAt:1}};
 game.rumorProgress={officers:['O001','O999'],items:{I002:1}};
 assert.deepEqual(collectionProfile(game),{discoveries:{[found]:true},officers:{O001:true}});
});
test('usage retries the same batch and changes windows at midnight in Korea',()=>{
 const date=Date.parse('2026-11-12T14:59:00Z'),record={days:{[usageDay(date)]:{'m-action-voyage':[1,2,3]}}};
 const batch=prepareUsage(record,date,'0'.repeat(32));
 assert.equal(batch.day,'2026-11-12');
 assert.match(batch.events,/^m-\d{3}:1,2,3$/);
 assert.equal(prepareUsage(record,date+30000,'1'.repeat(32)),null);
 assert.deepEqual(prepareUsage(record,date+60000,'2'.repeat(32)),batch);
 assert.equal(Number(usageSlot(date+60000)),Number(usageSlot(date))+1);
});
test('menu help routes normal phrases and collection art covers every item within budget',async()=>{
 assert.deepEqual(findMenus('특산품  거래').slice(0,2).map(e=>e[0]),['trade','cargo']);
 assert.equal(findMenus('여기에 없는 메뉴').length,0);
 await Promise.all([...DISCOVERIES,...ITEMS].flatMap(({id})=>[false,true].map(async detail=>{
  const file=new URL('../dist/'+collectionArt(id,detail),import.meta.url);await access(file);
  const info=await stat(file);assert.ok(info.size>0&&info.size<=(detail?60000:12000),id);
 })));
});
test('parking a full fleet opens a historical berth and a saved ship retains its type and purchase basis',()=>{
 const game=initialState(),port=PORT_BY_ID.amsterdam;
 Object.assign(game,{port:port.id,position:[port.lon,port.lat],food:15,money:100000,projectStats:{freight:2}});
 syncFleet(game,[{id:'flag',tier:19},{id:'stored',tier:13,kind:'turtle',costBasis:36250},...['b','c','d'].map(id=>({id,tier:11}))],'flag');
 game.cannons=[{id:'test-gun',kind:'swivel',quality:0,readyAt:0,shipId:'stored'}];
 const full=historicalQuote(game,'fluyt');
 assert.equal(full.ready,false);
 assert.equal(full.future,null);
 assert.equal(storeShip(game,'stored','amsterdam').ok,true);
 assert.equal(game.fleetCount,4);
 assert.equal(game.cannons[0].shipId,null);
 const restored=parseSavedGame(game);
 assert.deepEqual(restored.storedShips,[{id:'stored',tier:13,kind:'turtle',costBasis:36250,port:'amsterdam',health:1}]);
 const vacant=historicalQuote(restored,'fluyt');
 assert.equal(vacant.ready,true);
 assert.equal(buildHistoricalShip(restored,'fluyt',vacant.cost).ok,true);
 assert.equal(restored.fleetCount,5);
 assert.throws(()=>quoteShipRecall(restored,'stored'),/빈자리/);
});
test('storage enforces docking, cargo capacity, single active vessel and unique ownership',()=>{
 const game=initialState();
 assert.throws(()=>quoteShipStorage(game,'vessel-0'),/최소 한 척/);
 syncFleet(game,[{id:'flag',tier:19},{id:'other',tier:5}],'flag');
 game.cargo={wine:{qty:100,cost:1000}};
 assert.throws(()=>quoteShipStorage(game,'flag'),/화물/);
 delete game.cargo.wine;
 game.hullHP=317;
 const originalHull=game.hullHP;
 assert.equal(storeShip(game,'flag','lisbon').ok,true);
 assert.equal(game.flagshipId,'other');
 assert.equal(fleetLimit(game),5);
 assert.equal(game.fleetCount,1);
 assert.equal(fleetMaxHP(game),250);
 assert.throws(()=>quoteShipRecall({...game,port:'porto'},'flag'),/리스본/);
 assert.throws(()=>parseSavedGame({...game,storedShips:[...game.storedShips,...game.storedShips]}));
 assert.throws(()=>parseSavedGame({...game,storedShips:[{...game.storedShips[0],id:'other'}]}));
 const reloaded=parseSavedGame(game);
 assert.equal(recallShip(reloaded,'flag','lisbon').ok,true);
 assert.equal(reloaded.hullHP,originalHull,'parking and recall cannot heal existing hull damage');
 assert.equal(reloaded.fleetCount,2);
 assert.equal(reloaded.storedShips.length,0);
 assert.throws(()=>recallShip(reloaded,'flag','lisbon'),/찾을 수 없어요/);
});
test('each discovery has geographic study context and all historical ships have a sized photo',async()=>{
 for(const d of DISCOVERIES){
  const study=discoveryStudy(d.id);
  assert.ok(study?.place&&study.detail.length>25,d.id);
 }
 assert.equal(discoveryCoordinates([-27.2,38.6]),'38.60° N · 27.20° W');
 assert.equal(findMenus('배 맡기기')[0][0],'storedShips');
 for(const ship of HISTORICAL_SHIPS){
  const path=historicalArt(ship.id);
  assert.match(path,/^assets\/ship-photos\/.+\.webp$/);
  assert.ok((await stat(new URL('../dist/'+path,import.meta.url))).size<=60000);
 }
});
