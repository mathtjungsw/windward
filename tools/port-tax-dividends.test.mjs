import test from 'node:test';
import assert from 'node:assert/strict';
import {RELEASE} from '../dist/release-notes.js';
const {configurePortDividends,advanceBasicIncome,estimateBasicIncome,claimBasicIncome,creditTradeDividends,pendingTradeTax,claimTradeTax,dividendRate}=await import('../dist/port-income.js?v='+RELEASE);
const {collectPortTaxes}=await import('../dist/tax-collector.js');
const hour=3600000,start=1700000000000,id='bordeaux';

test('all ten investors receive proportional tax and a minority can collect both balances',()=>{
 configurePortDividends(start);
 try{
  const investors=Object.fromEntries(Array.from({length:10},(_,i)=>['s'+i,30000]));
  const book={investors,treasury:{s9:12}};
  assert.equal(dividendRate(book,id).rate,1075);
  creditTradeDividends(book,id,null,105,start);
  assert.equal(pendingTradeTax(book,'s9'),23);
  const game={money:0,taxCollector:{boughtAt:start,routeAt:start,order:[id],visits:{},remainder:0,receipts:[],gross:0,fees:0}};
  const result=collectPortTaxes(game,book,'s9',id,start+hour,start+hour);
  assert.equal(result.gross,131);
  assert.equal(result.net,125);
  assert.equal(pendingTradeTax(book,'s9'),0);
  assert.equal(pendingTradeTax(book,'s0'),11);
  assert.throws(()=>collectPortTaxes(game,book,'s9',id,start+hour,start+hour),/이미/);
 }finally{configurePortDividends(null);}
});

test('shares change prospectively, legacy units stay with their current owner, and fractions carry',()=>{
 configurePortDividends(start);
 try{
  const book={investors:{a:200000},basicIncome:{period:{owner:'a',at:start-hour,rate:1000,units:0}}};
  advanceBasicIncome(book,id,'a',start+hour);
  book.investors.b=100000;
  advanceBasicIncome(book,id,'a',start+hour);
  assert.equal(claimBasicIncome(book,id,'a','a',start+hour),2050);
  assert.equal(estimateBasicIncome(book,id,'b','a',start+2*hour).accrued,358);
  creditTradeDividends(book,id,'a',2,start+2*hour);
  assert.equal(claimTradeTax(book,'b'),1);
  creditTradeDividends(book,id,'a',2,start+2*hour);
  assert.equal(claimTradeTax(book,'b'),0);
  assert.equal(dividendRate({investors:{a:5000000}},id).rate,1500);
 }finally{configurePortDividends(null);}
});
