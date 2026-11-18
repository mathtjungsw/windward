import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,parseSavedGame} from '../dist/engine.js';
import {RELEASE} from '../dist/release-notes.js';
import {TITLES,titleEffect,activeTitle,normalizeTitles} from '../dist/title-effects.js';
import {reconcileTitles,chooseTitle} from '../dist/titles.js';
import {HERITAGE_IDS,reportHeritage} from '../dist/album-rewards.js';
import {saleBonusDetails,normalizeRumorProgress} from '../dist/rumor-progress.js';
import {captainTradeQuote,invest,withdrawInvestment,ownership} from '../dist/commerce.js';
import {initializePortEquity} from '../dist/equity-migration.js';
import {equityExpansionPlan,withdrawableCapital,currentPortOwner} from '../dist/port-equity.js';
import {claimBasicIncome,advanceBasicIncome,claimTradeTax} from '../dist/port-income.js';
import {DISCOVERIES,RUMOR_BY_ID} from '../dist/discoveries-catalog.js';
import {vesselSeaSpeed,fleetShips} from '../dist/ship-rules.js';
const {configurePortDividends}=await import('../dist/port-income.js?v='+RELEASE);
const now=Date.UTC(2026,10,18,1),id='developed-bergen';
const captain=()=>({...initialState(),port:id,money:5000000,noviceGraduated:true});
const harbor=(known=true)=>({developedOwner:'a',developerName:'창립자',development:{name:'베르겐',level:2},...(known?{foundingPaid:380000}:{}),facilityInvested:580000,_version:1,treasury:{a:73},stock:49});
test('23 title definitions include the legacy title and all 22 ranking achievements',()=>{
 assert.equal(TITLES.length,23);assert.equal(new Set(TITLES.map(t=>t.id)).size,23);
 assert.equal(TITLES.find(t=>t.id==='allrounder').target,6000);
 assert.ok(TITLES.every(t=>t.target>0&&t.value>0));
});
test('title acquisition is permanent, selection is single and docking is required',()=>{
 const game=captain();game.profit=499999;game.money=0;
 reconcileTitles(game,now);assert.ok(!game.titles.earned.merchant);
 game.profit=500000;reconcileTitles(game,now);assert.equal(game.titles.earned.merchant,now);
 chooseTitle(game,'merchant',now);assert.equal(titleEffect(game,'sellBonus'),.01);
 game.profit=0;reconcileTitles(game,now+1);assert.equal(activeTitle(game).id,'merchant');
 assert.throws(()=>chooseTitle(game,'hunter',now),/획득/);
 game.port=null;assert.throws(()=>chooseTitle(game,null,now),/정박/);
 game.port=id;chooseTitle(game,null,now);assert.equal(titleEffect(game,'sellBonus'),0);
});
test('legacy collector title migrates once and the independent flag remains intact',()=>{
 const game=captain();game.albumRewards={title:true,titleActive:true,flag:true,flagActive:true};
 assert.equal(titleEffect(game,'buyDiscount'),.01);
 reconcileTitles(game,now);assert.equal(game.titles.active,'archivist');assert.equal(game.albumRewards.titleActive,false);
 const restored=parseSavedGame(game);assert.equal(activeTitle(restored).id,'archivist');assert.equal(restored.albumRewards.flagActive,true);
 assert.throws(()=>normalizeTitles({...game,titles:{earned:{invented:1},active:null}}),/칭호/);
 assert.throws(()=>normalizeTitles({...game,titles:{earned:{},active:'hunter'}}),/획득/);
});
test('server-derived port ownership and overall score use explicit verified context',()=>{
 const game=captain();reconcileTitles(game,now);assert.ok(!game.titles.earned.harbormaster);
 reconcileTitles(game,now,{ownedPortCount:2,overallScore:5999});assert.ok(!game.titles.earned.allrounder);
 reconcileTitles(game,now,{ownedPortCount:3,overallScore:6000});assert.ok(game.titles.earned.harbormaster);assert.ok(game.titles.earned.allrounder);
});
test('spice box contribution exposes both the item restriction and the shared 3 percent cap',()=>{
 const game=captain();game.rumorProgress={items:{I017:1,I020:1,I066:1},tradeGear:['I017','I020','I066'],officers:['O002'],active:'O002'};
 const d=saleBonusDetails(game,'london','cloves');assert.equal(d.applied,.03);assert.ok(d.raw>.03);assert.equal(d.source.find(g=>g.id==='I066').contribution,0);
 const different=saleBonusDetails(game,'malacca','cinnamon');assert.equal(different.source.find(g=>g.id==='I066').eligible,false);
 game.titles={earned:{merchant:now},active:'merchant'};assert.equal(saleBonusDetails(game,'london','cloves').applied,.03);
});
test('title discounts use the same quote totals and speed preserves the slowest-ship calculation',()=>{
 const game=captain(),base=captainTradeQuote(game,'london','wine',100,'buy',{},now,0);
 game.titles={earned:{archivist:now,traveler:now},active:'archivist'};
 const q=captainTradeQuote(game,'london','wine',100,'buy',{},now,0);assert.equal(base.total-q.total,Math.floor(base.gross*.01));
 const vessel=fleetShips(game)[0],before=vesselSeaSpeed(game,vessel);chooseTitle(game,'traveler',now);
 assert.equal(vesselSeaSpeed(game,vessel),before*1.02);
});
test('newly recorded extra-rumor origins survive normalization without exposing unread rumors',()=>{
 const game=captain(),ids=Object.keys(RUMOR_BY_ID);game.rumors=[ids[0]];
 game.rumorProgress={items:{},officers:[],tavernHistory:{jeddah:[ids[0],ids[0],ids[1],'invalid'],unknown:[ids[0]]}};
 const p=normalizeRumorProgress(game);assert.deepEqual(p.tavernHistory,{jeddah:[ids[0]]});
 game.rumorProgress=p;assert.deepEqual(parseSavedGame(game).rumorProgress.tavernHistory,p.tavernHistory);
});
test('old discoveries can be reported together exactly once for 500 ducats',()=>{
 const game=captain();game.albumRewards={quest:true};for(const id of HERITAGE_IDS)game.discoveries[id]={foundDay:1,foundAt:1};
 const money=game.money;reportHeritage(game,[HERITAGE_IDS[0]]);assert.equal(game.money,money);
 reportHeritage(game,HERITAGE_IDS.slice(1,3));assert.equal(game.money,money+500);assert.equal(game.albumRewards.questDone,true);
 assert.throws(()=>reportHeritage(game,[HERITAGE_IDS[3]]),/수락/);
 assert.equal(parseSavedGame(game).albumRewards.questDone,true);
});
test('heritage reporting rejects invented, duplicate, unowned and undocked records',()=>{
 const game=captain();game.albumRewards={quest:true};game.discoveries[HERITAGE_IDS[0]]={foundDay:1,foundAt:1};
 assert.throws(()=>reportHeritage(game,[HERITAGE_IDS[1]]),/내 발견/);
 game.port=null;assert.throws(()=>reportHeritage(game,[HERITAGE_IDS[0]]),/정박/);
 game.port=id;reportHeritage(game,[HERITAGE_IDS[0]]);assert.throws(()=>reportHeritage(game,[HERITAGE_IDS[0]]),/내 발견/);
});
test('known founding payment migrates once while old taxes, physical facilities and principal are preserved',()=>{
 const c=harbor();assert.equal(initializePortEquity(c,id,now),true);
 assert.equal(c.investors.a,380000);assert.equal(withdrawableCapital(c,'a'),380000);
 assert.equal(c.treasury.a,73);assert.equal(c.facilityInvested,580000);assert.equal(c.development.level,2);
 const snapshot=structuredClone(c);assert.equal(initializePortEquity(c,id,now+10),false);assert.deepEqual(c,snapshot);
});
test('unproven old founding capital grants preserved equity but cannot be withdrawn as free cash',()=>{
 const c=harbor(false),game=captain();initializePortEquity(c,id,now);
 assert.equal(c.investors.a,400000);assert.equal(withdrawableCapital(c,'a'),0);assert.equal(currentPortOwner(c),'a');
 assert.throws(()=>withdrawInvestment(game,c,'a',id,400000,now,1,1),/현금 원금/);
 invest(game,c,'a',id,10000,now);assert.equal(withdrawableCapital(c,'a'),10000);
 const m=game.money;withdrawInvestment(game,c,'a',id,10000,now,1,1);assert.equal(game.money,m+8000);assert.equal(c.investors.a,400000);
});
test('strict majority changes and full cash withdrawal preserve the harbor and old entitlements',()=>{
 const c=harbor(),game=captain();initializePortEquity(c,id,now);c.defaultRate=30;c.blacklist=['x'];
 invest(game,c,'b',id,380000,now);assert.equal(ownership(c).ownerUid,null);assert.equal(c.defaultRate,0);
 invest(game,c,'b',id,10000,now);assert.equal(ownership(c).ownerUid,'b');
 const before=game.money,result=withdrawInvestment(game,c,'b',id,390000,now,1,1);
 assert.equal(result.loss,78000);assert.equal(game.money,before+312000);assert.equal(ownership(c).ownerUid,'a');assert.equal(c.development.level,2);
 withdrawInvestment(game,c,'a',id,380000,now,1,1);assert.equal(ownership(c).ownerUid,null);assert.equal(c.development.level,2);assert.equal(claimTradeTax(c,'a'),73);
});
test('capital changes settle earlier basic income before crediting the new shareholder',()=>{
 const c=harbor(),game=captain();initializePortEquity(c,id,now);
 const hour=3600000;advanceBasicIncome(c,id,'a',now+hour);
 const before=c.taxDividend.basic.a;invest(game,c,'b',id,400000,now+hour);
 assert.equal(c.taxDividend.basic.a,before);assert.ok(!c.taxDividend.basic.b);
 advanceBasicIncome(c,id,ownership(c).ownerUid,now+2*hour);
 assert.ok(c.taxDividend.basic.a>before);assert.ok(c.taxDividend.basic.b>0);
});
test('deposit equity preserves original founding owner and converts old fractional income before changing its denominator',()=>{
 const c={registeredCapital:300000,registeredOwner:'a',investors:{a:180000,b:120000},readyAt:now-1000,promotion:{level:2,support:180000,startedAt:now-1000},dividends:{a:31,b:29},dividendRemainders:{a:120000,b:180000},stock:399};
 initializePortEquity(c,'depot-davao',now);assert.equal(c.supplyRemainders.a,.4);assert.equal(c.supplyRemainders.b,.6);assert.equal(c.dividendRemainders,undefined);
 assert.equal(c.registeredOwner,'a');assert.equal(c.registeredCapital,300000);assert.equal(c.dividends.a,31);assert.equal(c.stock,399);
});
test('equity expansion approval is weighted and stale votes are invalidated by investment',()=>{
 const c=harbor(),game=captain();initializePortEquity(c,id,now);invest(game,c,'b',id,380000,now);
 const rev=c.equityRevision;c.equityExpansionVotes={a:rev};assert.equal(equityExpansionPlan(c,'a').canConfirm,false);
 c.equityExpansionVotes.b=rev;assert.equal(equityExpansionPlan(c,'a').canConfirm,true);
 invest(game,c,'c',id,10000,now);assert.equal(equityExpansionPlan(c,'a').support,0);assert.equal(equityExpansionPlan(c,'a').canConfirm,false);
});
