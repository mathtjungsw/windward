import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../dist/engine.js';
import {parseState} from '../dist/save-game.js';
import {PORT_BY_ID} from '../dist/data.js';
import {readSalePort,rankSaleQuotes,saleProfit} from '../dist/sale-finder.js';
import {playTavernGame,TAVERN_GAMES} from '../dist/tavern-games.js';
import {voyageWeek,weeklyEdge,summarizeWeeklyChart} from '../dist/weekly-chart.js';
import {refreshStories,startStory} from '../dist/story-core.js';
import {STORY_BY_ID} from '../dist/story-catalog.js';
import {delegateGoods,openTradeFacility} from '../dist/commerce.js';

const now=Date.UTC(2026,10,18,8);
test('a transferred developed port uses its current owner, including a vacant 50–50 result',async()=>{
 const port=PORT_BY_ID['developed-bergen'];
 const ledger={ownerUid:'new',developedOwner:'old',equityVersion:1,defaultRate:12,'rates/old':7};
 const read=async(_port,key)=>ledger[key];
 const game={...initialState(),noviceGraduated:true};
 const search=async uid=>rankSaleQuotes([await readSalePort({uid},port,'wine',read)],{uid,game,at:now,goodId:'wine',qty:10})[0];
 assert.equal((await search('old')).rate,7);
 assert.equal((await search('new')).rate,0);
 assert.equal((await search('visitor')).rate,12);
 delete ledger.ownerUid;
 assert.equal((await search('visitor')).rate,0);
 assert.deepEqual(saleProfit({total:75000},40000,{days:5,toll:500,supplyCost:1500,canSail:true}),{profit:33000,perDay:6600});
 assert.equal(saleProfit({total:75000},40000,{days:5,toll:500,supplyCost:1500,canSail:false}),null);
});

test('tavern rounds persist, settle a stake once and accept all six approved ports',()=>{
 assert.equal(Object.keys(TAVERN_GAMES).length,6);
 const roll=()=>.4;
 const create=port=>({...initialState(),port,money:30000});
 const macau=create('macau');
 assert.equal(playTavernGame(macau,'macau','odd',10000,now,null,roll).net,9000);
 assert.throws(()=>playTavernGame(macau,'macau','even',10000,now+4999,null,roll),/5초/);
 assert.throws(()=>playTavernGame(macau,'macau','even',10010,now+5000,null,roll),/10,000/);
 const malacca=create('malacca');
 playTavernGame(malacca,'malacca','draw',10000,now,null,roll);
 const loaded=parseState(malacca,initialState);
 assert.equal(loaded.money,20000);
 const round=structuredClone(loaded.tavernRound);
 assert.equal(playTavernGame(loaded,'malacca','take',0,now+100,round,roll).payout,11800);
 assert.throws(()=>playTavernGame(loaded,'malacca','take',0,now+100,round,roll),/진행 상태/);
 assert.equal(loaded.money,31800);
 playTavernGame(create('alexandria'),'alexandria','under',100,now,null,roll);
 playTavernGame(create('havana'),'havana','0',100,now,null,roll);
 for(const port of ['venice','goa']){
  const game=create(port);
  playTavernGame(game,port,'deal',100,now,null,roll);
  const input=game.tavernRound;
  assert.ok(playTavernGame(game,port,port==='venice'?'stand':'inside',0,now+10,input,roll).payout>=0);
 }
});

test('Monday at KST midnight advances the shared map and one captain only counts once per edge',()=>{
 const midnight=Date.UTC(2026,10,15,15);
 assert.equal(voyageWeek(midnight)-voyageWeek(midnight-1),1);
 const edge=weeklyEdge('porto','lisbon'),unknown=weeklyEdge('porto','london');
 assert.equal(edge,weeklyEdge('lisbon','porto'));
 assert.deepEqual(summarizeWeeklyChart({a:{[edge]:true,[unknown]:true},b:{[edge]:true}},['lisbon','porto']),
  {ports:3,connections:2,captains:2,visible:[{from:'lisbon',to:'porto',count:2}],unknown:1});
});

test('the first voyage starts with wine, and legacy completed actions and rewards survive the reorder',()=>{
 const steps=STORY_BY_ID['first-route'].steps;
 assert.equal(steps.length,30);
 assert.deepEqual(steps.slice(0,6).map(s=>s.kind),['talk','buy','view','depart','port','sell']);
 const game=initialState();startStory(game,'first-route',now);
 game.boughtLisbonWine=true;game.storyBook.version=1;
 Object.assign(game.storyBook.entries['first-route'],{index:5,chapterRewards:[0]});
 const loaded=parseState(game,initialState);
 refreshStories(loaded);
 assert.equal(loaded.storyBook.entries['first-route'].index,2);
 assert.deepEqual(loaded.storyBook.entries['first-route'].chapterRewards,[0]);
 assert.ok(steps.some(s=>s.menus?.includes('note-reread')));
});

test('developed trade goods respect the actual commerce facility on both types of port',()=>{
 const harbor={...PORT_BY_ID['developed-bergen'],active:true,developmentLevel:1,market:['driedfish']};
 assert.deepEqual(delegateGoods(harbor,now),[]);
 assert.ok(delegateGoods({...harbor,developmentLevel:2},now).includes('driedfish'));
 const depot={...PORT_BY_ID['depot-cairns'],active:true,promotionLevel:2,market:['grain']};
 assert.equal(openTradeFacility(depot),true);
 assert.ok(delegateGoods(depot,now).includes('grain'));
});
