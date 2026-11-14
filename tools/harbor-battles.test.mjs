import test from 'node:test';
import assert from 'node:assert/strict';
import {battleWindow,createHarborPractice,harborBattleAction,harborOperator,militiaAction} from '../dist/harbor-battles.js';

const start=Date.parse('2026-11-14T11:00:00.000Z');
const port='jamestown';

test('harbor battle limits the public window and transfers only temporary operating rights',()=>{
 const harbor={investors:{owner:300000},ownerUid:'owner'};
 const captain={port,money:5000};
 assert.equal(battleWindow(start-1).open,false);
 assert.throws(()=>harborBattleAction(captain,harbor,'challenger',port,'start','',start-1,'도전자'),/시간/);
 militiaAction(captain,harbor,'challenger',port,'hire',10,start);
 militiaAction(captain,harbor,'challenger',port,'escort',10,start);
 assert.throws(()=>militiaAction(captain,harbor,'challenger',port,'hire',1,start),/고용비/);
 harborBattleAction(captain,harbor,'challenger',port,'start','',start,'도전자');
 assert.throws(()=>harborBattleAction(captain,harbor,'third',port,'start','',start+1,'제3자'),/시간/);
 for(let turn=0;turn<3;turn++)harborBattleAction(captain,harbor,'challenger',port,'attack','outer',start+turn*5000,'도전자');
 assert.equal(harbor.harborMatch.state,'won');
 harbor.investors.third=400000;
 assert.equal(harborOperator(harbor,harbor.harborOperator.until-1),'challenger');
 assert.equal(harborOperator(harbor,harbor.harborOperator.until),'third');
 assert.equal(captain.militia.escort,10);
});

test('practice uses the tactical controls independently outside the public battle window',()=>{
 const now=start-3600000,practice=createHarborPractice(port,'연습',now);
 assert.equal(practice.open().stance,'channel');
 practice.act('outer',now+100);
 assert.throws(()=>practice.act('outer',now+200),/5초/);
 practice.act('outer',now+5100);
 practice.act('outer',now+10100);
 assert.equal(practice.open().state,'won');
 assert.equal(createHarborPractice(port,'연습',now).open().state,'active');
});
