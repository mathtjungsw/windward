import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,parseSavedGame} from '../dist/engine.js';
import {syncFleet} from '../dist/ship-rules.js';
import {PORTS,PORT_BY_ID} from '../dist/data.js';
import {tradeQuote,pressureAt} from '../dist/market-rules.js';
import {STORIES} from '../dist/story-catalog.js';
import {storyAction,refreshStories,recordStoryView,recordStoryTrade,recordStorySailing,normalizeStories} from '../dist/story-core.js';
import {buyCollector,collectPortTaxes,collectorVisits,COLLECTOR_INTERVAL} from '../dist/tax-collector.js';
import {initializeBasicIncome} from '../dist/port-income.js';
import {performContractAction,saleBonus} from '../dist/rumor-progress.js';

const now=1794500000000;
test('bulk purchase and resale use one unit each and cannot move the opposite quote',()=>{
 for(const legacy of [-1200000,-400000,0,400000,1200000]){
  const state={pressure:legacy,at:now};
  const saleBefore=tradeQuote('porto','wine',1000,'sell',state,now);
  const buy=tradeQuote('porto','wine',1000,'buy',state,now);
  const resale=tradeQuote('porto','wine',1000,'sell',buy.next,now);
  assert.equal(buy.gross,buy.unit*1000);
  assert.equal(resale.unit,saleBefore.unit);
  assert.ok(resale.total<buy.total);
  assert.equal(tradeQuote('porto','wine',1000,'buy',resale.next,now).unit,tradeQuote('porto','wine',1000,'buy',buy.next,now).unit);
  assert.equal(pressureAt(resale.next,now+1200001,'buy'),0);
  assert.equal(pressureAt(resale.next,now+1200001,'sell'),0);
 }
});

test('collector reconciles tax and capped basic income once, preserving fee fractions and old owner ledgers',()=>{
 const game=initialState();game.money=100000;
 buyCollector(game,['seville'],now);
 const content={ownerUid:'me',investors:{me:200000},ownerSince:now,treasury:{me:10,old:777}};
 initializeBasicIncome(content,'seville','me',now);
 const first=collectorVisits(game.taxCollector,now+COLLECTOR_INTERVAL)[0];
 assert.equal(collectorVisits(game.taxCollector,now+COLLECTOR_INTERVAL-1)[0].pending,false);
 const result=collectPortTaxes(game,content,'me','seville',first.at,now+COLLECTOR_INTERVAL);
 assert.equal(result.gross,510);assert.equal(result.fee,25);assert.equal(result.net,485);
 assert.equal(content.treasury.old,777);assert.equal(game.taxCollector.remainder,50);
 assert.throws(()=>collectPortTaxes(game,content,'me','seville',first.at,now+COLLECTOR_INTERVAL));
 const restored=parseSavedGame(game);
 assert.equal(restored.taxCollector.remainder,50);
 const second=collectorVisits(restored.taxCollector,now+2*COLLECTOR_INTERVAL)[0];
 const again=collectPortTaxes(restored,content,'me','seville',second.at,now+2*COLLECTOR_INTERVAL);
 assert.equal(again.gross,500);assert.equal(again.fee,25);
 const late=collectorVisits(restored.taxCollector,now+100*3600000)[0];
 assert.equal(collectPortTaxes(restored,content,'me','seville',late.at,now+100*3600000).gross,72000);
 const lost=collectorVisits(restored.taxCollector,now+101*3600000)[0];
 content.investors={other:200000};
 assert.equal(collectPortTaxes(restored,content,'me','seville',lost.at,now+101*3600000).gross,0);
});

function captain(){
 const game=initialState();game.money=1e7;
 syncFleet(game,[{id:'vessel-0',tier:19}]);
 game.visited=PORTS.map(port=>port.id);game.knownPorts=[...game.visited];
 normalizeStories(game);
 return game;
}

test('all 102 story steps support save/reload, safe delivery and one-time rewards',()=>{
 assert.deepEqual(STORIES.map(story=>story.steps.length),[30,16,16,20,20]);
 let game=captain();
 for(const story of STORIES){
  game.port=story.origin;game.voyage=null;game.explorationLockedUntilSailing=false;
  storyAction(game,story.id,'start',now);
  const row=()=>game.storyBook.entries[story.id];
  let iterations=0;
  while(row().index<story.steps.length){
   assert.ok(++iterations<150);
   const step=story.steps[row().index];
   if(step.kind==='view')step.menus.forEach(menu=>recordStoryView(game,menu));
   else if(step.kind==='talk')storyAction(game,story.id,'advance',now);
   else if(step.kind==='manual'){game.storyBook.manual=true;refreshStories(game);}
   else if(step.kind==='port'){game.port=step.port;game.voyage=null;refreshStories(game);}
   else if(step.kind==='depart'){game.port=null;game.voyage={target:step.port};refreshStories(game);game.voyage=null;}
   else if(step.kind==='buy'||step.kind==='sell'){
    if(step.good==='wine'){game.boughtLisbonWine=true;if(step.kind==='sell')game.soldAway=true;}
    recordStoryTrade(game,step.port,step.good,step.qty,step.kind);
   }else if(step.kind==='rumor'){game.rumors=['test-clue'];refreshStories(game);}
   else if(step.kind==='discovery'){game.discoveries[step.discovery]={foundDay:1,foundAt:now};refreshStories(game);}
   else if(step.kind==='zone'){
    const [west,east,south,north]=step.bounds;
    game.port=null;recordStorySailing(game,[(west+east)/2,(south+north)/2],[(west+east)/2+.01,(south+north)/2]);
   }else if(step.kind==='deliver'){
    game.port=step.port;game.voyage=null;game.cargo[step.good]={qty:step.qty+2,cost:(step.qty+2)*100};
    storyAction(game,story.id,'advance',now);
    assert.equal(game.cargo[step.good].qty,2);assert.equal(game.cargo[step.good].cost,200);
   }
   // Valid underway payloads are covered by navigation tests; save a stopped position here.
   game.voyage=null;game.rumors=[];
   game=parseSavedGame(game);
  }
  game.port=story.origin;storyAction(game,story.id,'claim',now);
  assert.throws(()=>storyAction(game,story.id,'claim',now));
  if(story.id==='first-route'){
   for(let chapter=0;chapter<6;chapter++)storyAction(game,story.id,'chapter',now,chapter);
   assert.throws(()=>storyAction(game,story.id,'chapter',now,0));
  }
  if(story.reward){
   assert.ok(game.rumorProgress.officers.includes(story.reward)||game.rumorProgress.items[story.reward]===1);
   assert.throws(()=>performContractAction(game,story.reward,'start'),/이야기/);
  }
 }
 game.port='malacca';game.rumorProgress.tradeGear='IS01';
 assert.equal(saleBonus(game,'malacca','wine'),.02);assert.equal(saleBonus(game,'lisbon','wine'),0);
});

test('rescue and north/south wrap cannot award story passage proof',()=>{
 const game=captain();game.port='seville';
 game.storyBook.entries['kilwa-ledger']={index:16,startedAt:now,baseline:{},zones:{},chapterRewards:[],rewarded:true};
 storyAction(game,'victoria-return','start',now);
 game.storyBook.entries['victoria-return'].index=4;
 game.voyage={kind:'rescue'};
 recordStorySailing(game,[-30,0],[-29,0]);
 assert.equal(game.storyBook.entries['victoria-return'].index,4);
 game.voyage=null;recordStorySailing(game,[-30,79],[-30,-59]);
 assert.equal(game.storyBook.entries['victoria-return'].index,4);
});
