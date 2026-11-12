import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialState,parseSavedGame,Navigator,makeRoute,voyageEstimate,advanceVoyage} from '../dist/engine.js';
import {createChartDetail} from '../dist/chart-waterways.js';
import {CANALS,PROJECT_BY_ID,projectAction,projectView} from '../dist/projects.js';
import {ITEMS,OFFICERS} from '../dist/rumor-catalog.js';
import {RELEASE} from '../dist/release-notes.js';
const {PORTS,GOODS,ACTIVE_PORT_BY_ID,registerDevelopedPorts,DEPOT_SITES}=await import('../dist/data.js?v='+RELEASE);
import {DISCOVERIES} from '../dist/discoveries-catalog.js';
import {syncFleet} from '../dist/ship-rules.js';
import {activateDistanceGear,activateTradeVoucher,addOfficerExperience,activeOfficer,appendItemRecord,normalizeRumorProgress,performContractAction,readContractRumor,recordContractArrival} from '../dist/rumor-progress.js';
import {captainTradeQuote,executeTrade} from '../dist/commerce.js';
import {reserveCanalTolls,refundCanalTolls,designateCanalPass} from '../dist/canal-reservations.js';
import {planPortIncome} from './port-income-backfill.mjs';

const start=Date.UTC(2026,10,11);
const asCaptain=(port='porto')=>({...initialState(),money:15000000,port});
const assets=name=>JSON.parse(readFileSync(new URL('../dist/assets/'+name,import.meta.url),'utf8'));
const chart=new Navigator(assets('navigation.json'),assets('rivers.json'),createChartDetail([...assets('world-land.geojson').features,...assets('islands.geojson').features]));

test('cooperative freight caps concurrent demand, preserves remaining cargo and pays each captain once',()=>{
  const port='freight-porto',a=asCaptain(),b=asCaptain(),content={};
  a.cargo.wine={qty:31,cost:401};b.cargo.wine={qty:20,cost:220};
  projectAction(a,content,'a',port,'renew',0,start,chart);
  assert.equal(projectAction(a,content,'a',port,'deliver',31,start+1,chart).qty,31);
  assert.equal(projectAction(b,content,'b',port,'deliver',20,start+2,chart).qty,9);
  assert.deepEqual(b.cargo.wine,{qty:11,cost:121});
  assert.equal(projectAction(a,content,'a',port,'claim',1,start+3,chart).reward,3720);
  projectAction(a,content,'a',port,'renew',0,start+4,chart);
  assert.equal(projectAction(b,content,'b',port,'claim',1,start+5,chart).reward,1080);
  assert.throws(()=>projectAction(b,content,'b',port,'claim',1,start+6,chart),/보수/);
});

test('project refunds use actual stakes, and the last investor opens construction once',()=>{
  const id='canal-suez',content={},a=asCaptain(),b=asCaptain(),project=PROJECT_BY_ID[id];
  projectAction(a,content,'a',id,'invest',2000000,start,chart);
  projectAction(a,content,'a',id,'refund',0,start,chart);
  assert.equal(a.money,15000000);
  projectAction(a,content,'a',id,'invest',4000000,start,chart);
  assert.equal(projectAction(b,content,'b',id,'invest',3000000,start+1,chart).accepted,2000000);
  assert.equal(content.readyAt,start+1+project.duration);
  assert.throws(()=>projectAction(a,content,'a',id,'refund',0,start+2,chart),/공사/);
  assert.equal(projectView(project,content,'a',content.readyAt).owner,'a');
  assert.throws(()=>projectAction(b,content,'b',id,'toll',100,content.readyAt,chart),/운영자/);
});

test('each canal connects reachable water endpoints and passage receipts reconcile to the exact paid toll',()=>{
  for(const project of CANALS){
    for(const path of [project.path,project.path.slice().reverse()]){
      const points=[path[0],path.at(-1)];
      for(const point of points)assert.ok(!chart.isLand(point)&&chart.anchor(point,Infinity),project.id);
      const route=chart.route(...points,{canals:CANALS});
      assert.equal(route.passages[0].id,project.id);
      assert.ok(Math.abs(route.total-makeRoute(path).total)<1e-7);
      assert.ok(route.sections.every(s=>s.river));
    }
  }
  const project=CANALS[2],id=project.id,content={investors:{a:6000000,b:4000000},readyAt:start,toll:101};
  const game=asCaptain(null);
  game.position=project.path[0];
  game.rumorProgress=normalizeRumorProgress(game);
  game.rumorProgress.items.I052=1;
  designateCanalPass(game,id);
  const travel=projectAction(game,content,'visitor',id,'transit',({entrance})=>({entrance,canal:id}),start+1,chart);
  assert.equal(travel.toll,81);
  assert.equal(content.dividends.a+content.dividends.b,80);
  assert.equal(content.dividendRemainders.a+content.dividendRemainders.b,10000000);
  assert.equal(game.rumorProgress.items.I052,0);
  assert.throws(()=>projectAction(game,content,'visitor',id,'transit',()=>{},start+2,chart),/입구/);
});

test('automatic routing can use two canals, with each reservation collected only at its own entrance',()=>{
  const game=asCaptain(null);
  const corinth=CANALS[0],suez=CANALS[1],all=chart.route(corinth.path[0],suez.path.at(-1),{canals:[corinth,suez]});
  assert.deepEqual(all.passages.map(p=>p.id),[corinth.id,suez.id]);
  game.position=corinth.path[0];
  game.food=500;
  game.rumorProgress=normalizeRumorProgress(game);
  game.rumorProgress.items.I052=1;
  designateCanalPass(game,corinth.id);
  const balance=game.money;
  const reservation=reserveCanalTolls(game,all,{[corinth.id]:100,[suez.id]:100});
  game.voyage={...all,passages:reservation.passages,travelled:0,foodRemaining:500};
  assert.equal(advanceVoyage(game,chart,1).entry,corinth.id);
  const ledger={readyAt:start,investors:{a:1200000},toll:150};
  projectAction(game,ledger,'visitor',corinth.id,'passage',0,start+1000,chart);
  assert.equal(ledger.dividends.a,80);
  assert.throws(()=>projectAction(game,ledger,'visitor',corinth.id,'passage',0,start+1001,chart),/입구/);
  assert.equal(advanceVoyage(game,chart,30000).entry,suez.id);
  assert.equal(refundCanalTolls(game),100);
  assert.equal(refundCanalTolls(game),0);
  assert.equal(game.money,balance-80);
  assert.equal(game.rumorProgress.items.I052,0);
});

test('a designated voucher skips other canals, survives reload and is returned when the eligible passage is canceled',()=>{
  const game=asCaptain(),[a,b]=CANALS;
  game.rumorProgress=normalizeRumorProgress(game);
  game.rumorProgress.items.I052=1;
  designateCanalPass(game,b.id);
  const saved=parseSavedGame(JSON.stringify(game));
  assert.equal(saved.rumorProgress.canalPass,b.id);
  const route={passages:[{id:a.id},{id:b.id}]},prices={[a.id]:200,[b.id]:200};
  const reserved=reserveCanalTolls(saved,route,prices);
  assert.deepEqual(reserved.passages.map(p=>p.amount),[200,160]);
  saved.voyage={passages:reserved.passages};
  reserved.passages[0].paid=true;
  assert.equal(refundCanalTolls(saved),160);
  assert.equal(saved.rumorProgress.items.I052,1);
  assert.equal(saved.rumorProgress.canalPass,b.id);
});

test('a completed depot is a separate destination and its stock and basic income use the shared project',()=>{
  const id='depot-stjohns',project=PROJECT_BY_ID[id],content={},game=asCaptain();
  for(const site of DEPOT_SITES){
    assert.ok(!chart.isLand(site.point),site.id);
    assert.ok(chart.route(site.previousPoint,site.point),site.id);
  }
  const {registry}=projectAction(game,content,'a',id,'invest',300000,start,chart);
  assert.deepEqual(registerDevelopedPorts({[id]:registry},registry.opensAt-1),[]);
  assert.equal(registerDevelopedPorts({[id]:registry},registry.opensAt)[0].id,id);
  assert.equal(ACTIVE_PORT_BY_ID[id].ownerUid,'a');
  const restored=asCaptain(null);
  restored.position=project.site.previousPoint;
  restored.depotDock=id;
  const docked=parseSavedGame(JSON.stringify(restored));
  assert.equal(docked.port,id);
  assert.equal(docked.depotDock,undefined);
  assert.ok(docked.visited.includes(id));
  docked.food=0;
  assert.equal(projectAction(docked,content,'a',id,'supply',2,registry.opensAt,chart).cost,8);
  const before=docked.money;
  assert.equal(projectView(project,content,'a',registry.opensAt+5400000).base,750);
  projectAction(docked,content,'a',id,'dividend',0,registry.opensAt+5400000,chart);
  assert.equal(docked.money-before,758);
  assert.equal(projectView(project,content,'a',registry.opensAt+5400000).balance,0);
});

test('the income backfill preserves trade taxes, balances and later ownership and is idempotent',()=>{
  const original={revision:4,content:{investors:{alice:250000},ownerSince:start+1000,treasury:{alice:20},basicIncome:{previous:{bob:5000}}}};
  const next=planPortIncome('seville',original,start,start+2000);
  assert.equal(next.revision,5);
  assert.deepEqual(next.content.treasury,original.content.treasury);
  assert.deepEqual(next.content.basicIncome,{previous:{bob:5000},period:{owner:'alice',at:start+1000,rate:1000,units:0}});
  assert.equal(planPortIncome('seville',next,start,start+2000),null);
  assert.equal(planPortIncome('porto',original,start,start+2000),null);
});

test('depot buys and credits individual ship-days without exceeding cargo or depot stock',()=>{
  const project=PROJECT_BY_ID['depot-davao'],content={investors:{a:300000},readyAt:start,stock:5};
  const game=asCaptain(null);
  game.position=project.site.point;game.food=0;
  game.rumorProgress=normalizeRumorProgress(game);
  game.rumorProgress.items.I053=1;
  const run=(action,n)=>projectAction(game,content,'a',project.id,action,n,start+1,chart);
  run('dock',0);
  run('stock',0);
  const result=run('supply',4);
  assert.equal(result.cost,16);
  assert.equal(game.food,4);
  assert.equal(content.stock,11);
  assert.equal(content.dividends.a,16);
});

test('distance gear expires at the exact mileage used by preview and runtime',()=>{
  const game=asCaptain(null);game.food=100;
  game.rumorProgress=normalizeRumorProgress(game);
  game.rumorProgress.items.I002=1;
  game.rumorProgress.items.I010=1;
  activateDistanceGear(game,'I002');activateDistanceGear(game,'I010');
  const route=makeRoute([[-9.5,38],[-9.5,30]]);
  game.voyage={...route,travelled:0,foodRemaining:100};
  const estimated=voyageEstimate(game,route);
  const result=advanceVoyage(game,{riverAt:()=>null},estimated.seconds+.001);
  assert.ok(result.arrived);
  assert.ok(Math.abs(game.food-(100-estimated.food))<1e-7);
  assert.deepEqual(game.rumorProgress.distanceGear,{});
});

test('64 unique item IDs, partial trade voucher settlement and item record limits survive save normalization',()=>{
  assert.deepEqual(ITEMS.map(x=>x.id).sort(),Array.from({length:64},(_,i)=>'I'+String(i+1).padStart(3,'0')));
  const game=asCaptain('amsterdam');
  game.rumorProgress=normalizeRumorProgress(game);
  game.rumorProgress.items.I018=1;game.rumorProgress.items.I024=1;
  game.rumorProgress.officers=['O002'];game.rumorProgress.active='O002';
  activateTradeVoucher(game,'I018');
  const quote=captainTradeQuote(game,'amsterdam','wool',2,'buy',{revision:1},start,0);
  assert.ok(quote.voucher>=0);
  const level=activeOfficer(game);
  addOfficerExperience(game,1600);
  assert.ok(activeOfficer(game).guildBonus>level.guildBonus);
  for(let i=0;i<5;i++)appendItemRecord(game,'prices',String(i),'기록 '+i,start+i);
  assert.equal(normalizeRumorProgress(game).records.prices.length,3);
});

test('every one of the 64 items and 24 officers requires a tavern clue and survives the regular acquisition and save path',()=>{
  for(const entry of [...ITEMS,...OFFICERS]){
    assert.ok(ACTIVE_PORT_BY_ID[entry.tavern]&&ACTIVE_PORT_BY_ID[entry.port],entry.id);
    assert.ok(GOODS[entry.challenge.cargo],entry.id);
    const game=asCaptain(entry.port);
    syncFleet(game,Array.from({length:5},(_,i)=>({id:'vessel-'+i,tier:19})));
    game.visited=PORTS.map(p=>p.id);
    game.knownPorts=[...game.visited];
    game.cargo={[entry.challenge.cargo]:{qty:entry.challenge.qty,cost:100}};
    game.discoveries=Object.fromEntries(DISCOVERIES.map(d=>[d.id,{foundDay:1,foundAt:1}]));
    game.guild={active:[],history:[],earned:0,lost:0,completed:20,proofs:Object.fromEntries(['freight','multiFleet','survey','pirate','river','europe','indian','mediterranean'].map(k=>[k,20]))};
    game.projectStats={freight:5};game.shoreProgress={count:20};game.investedPorts=game.visited.slice(0,10);
    game.seaLog={counts:{fishing:20,salvage:20,rescue:20,wreck:20},last:{},fame:0};
    game.rankProgress={version:1,since:1,pirateKills:20,fleetDefeats:2,duelWins:2,tradedGoods:[],bestTradeProfit:1};
    game.cannons=[{id:'qa',kind:'swivel',quality:4,readyAt:0,shipId:null}];
    assert.throws(()=>performContractAction(game,entry.id,'start'),/담당자/,entry.id);
    game.port=entry.tavern;
    assert.equal(readContractRumor(game,entry.id),true,entry.id);
    game.port=entry.port;
    performContractAction(game,entry.id,'start');
    for(const port of entry.challenge.ports)recordContractArrival(game,port);
    performContractAction(game,entry.id,'deliver');
    performContractAction(game,entry.id,'claim');
    const copy=parseSavedGame(JSON.stringify(game));
    assert.ok(entry.type?copy.rumorProgress.items[entry.id]===1:copy.rumorProgress.officers.includes(entry.id),entry.id);
  }
});
