import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,parseSavedGame,capacity,recordArrival,ship,supplyCost,voyageEstimate,useEmergencySupplies} from '../dist/engine.js';
import {syncFleet} from '../dist/ship-rules.js';
import {PORTS,PORT_BY_ID,GOODS} from '../dist/data.js';
import {hasClues,readRumor} from '../dist/discoveries.js';
import {DISCOVERIES,RUMOR_BY_ID} from '../dist/discoveries-catalog.js';
import {ITEMS,OFFICERS} from '../dist/rumor-catalog.js';
import {contractStatus,performContractAction,readContractRumor,rumorNote,setRumorHidden,tavernRumors} from '../dist/rumor-progress.js';

function captain(stage=10){
  const game=initialState();
  syncFleet(game,[{id:game.flagshipId,tier:stage-1}]);
  game.visited=PORTS.slice(0,20).map(p=>p.id);
  game.money=100000;
  return game;
}
function finish(game,entry){
  game.port=entry.tavern;
  assert.ok(readContractRumor(game,entry.id));
  game.port=entry.port;
  performContractAction(game,entry.id,'start');
  for(const id of entry.challenge.ports)recordArrival(game,id,null);
  game.cargo[entry.challenge.cargo]={qty:entry.challenge.qty+2,cost:(entry.challenge.qty+2)*15};
  if(entry.challenge.proof)game.guild={...game.guild,proofs:{...game.guild?.proofs,...entry.challenge.proof}};
  performContractAction(game,entry.id,'deliver');
  assert.deepEqual(game.cargo[entry.challenge.cargo],{qty:2,cost:30});
  performContractAction(game,entry.id,'claim');
}

test('new rumors require normal docking, the right tavern, and growth for every officer',()=>{
  for(const entry of [...ITEMS,...OFFICERS]){
    assert.ok(PORT_BY_ID[entry.port]?.active);
    assert.ok(PORT_BY_ID[entry.tavern]?.active);
    assert.ok(entry.challenge.ports.every(id=>PORT_BY_ID[id]?.active));
    assert.ok(GOODS[entry.challenge.cargo]);
  }
  for(const entry of OFFICERS){
    const fresh=initialState();
    fresh.port=entry.tavern;
    assert.equal(readContractRumor(fresh,entry.id),false);
    const grown=captain();
    grown.port=entry.tavern;
    grown.explorationLockedUntilSailing=true;
    assert.equal(readContractRumor(grown,entry.id),false);
    grown.explorationLockedUntilSailing=false;
    grown.visited=['lisbon'];
    assert.equal(readContractRumor(grown,entry.id),false);
    grown.visited=PORTS.slice(0,20).map(p=>p.id);
    assert.ok(tavernRumors(grown).some(r=>r.id===entry.id));
  }
});

test('legacy clues survive hiding, saving and restoration without losing discovery eligibility',()=>{
  const game=initialState(), d=DISCOVERIES.find(x=>x.rumorIds.length);
  for(const id of d.rumorIds){
    game.port=RUMOR_BY_ID[id].portId;
    assert.ok(readRumor(game,id));
  }
  const id=d.rumorIds[0];
  const old=JSON.stringify(game);
  const restored=parseSavedGame(old);
  assert.ok(rumorNote(restored).some(n=>n.id===id&&!n.hidden));
  assert.ok(setRumorHidden(restored,id,true));
  const reloaded=parseSavedGame(JSON.stringify(restored));
  assert.ok(rumorNote(reloaded).find(n=>n.id===id).hidden);
  assert.ok(hasClues(reloaded,d));
  assert.ok(setRumorHidden(reloaded,id,false));
  assert.equal(rumorNote(reloaded).find(n=>n.id===id).hidden,false);
});

test('contracts only count normal arrivals after acceptance, preserve cargo cost and debit once',()=>{
  const game=captain(), entry=ITEMS.find(x=>x.id==='I001');
  game.port=entry.port;
  assert.throws(()=>performContractAction(game,entry.id,'start'));
  game.port=entry.tavern;
  assert.ok(readContractRumor(game,entry.id));
  game.port=entry.port;
  performContractAction(game,entry.id,'start');
  const remaining=contractStatus(game,entry).remaining[0];
  recordArrival(game,remaining,{kind:'rescue'});
  assert.deepEqual(contractStatus(game,entry).remaining,[remaining]);
  game.explorationLockedUntilSailing=false;
  assert.throws(()=>performContractAction(game,entry.id,'deliver'));
  recordArrival(game,remaining,null);
  game.cargo[entry.challenge.cargo]={qty:10,cost:155};
  performContractAction(game,entry.id,'deliver');
  assert.deepEqual(game.cargo[entry.challenge.cargo],{qty:2,cost:31});
  const money=game.money;
  performContractAction(game,entry.id,'claim');
  assert.throws(()=>performContractAction(game,entry.id,'claim'));
  assert.equal(game.money,money-entry.cost);
  const reloaded=parseSavedGame(JSON.stringify(game));
  assert.equal(contractStatus(reloaded,entry).owned,1);
  assert.equal(contractStatus(reloaded,entry).done,true);
  const before=ship(reloaded).speed;
  performContractAction(reloaded,entry.id,'equip');
  assert.equal(ship(reloaded).speed,before*1.05);
  syncFleet(reloaded,[...reloaded.fleetShips,{id:'second',tier:reloaded.shipTier}]);
  assert.equal(ship(reloaded).speed,before);
});

test('equipment, supply items and active officer change the existing game calculations',()=>{
  const game=captain(), rack=ITEMS.find(x=>x.id==='I023'), food=ITEMS.find(x=>x.id==='I011');
  finish(game,rack);
  const room=capacity(game);
  performContractAction(game,rack.id,'equip');
  assert.equal(capacity(game),room+3);
  finish(game,food);
  game.food=1;
  assert.match(useEmergencySupplies(game,food.id).message,/2\.0/);
  assert.equal(game.food,3);
  assert.throws(()=>useEmergencySupplies(game,food.id));
  const suffren=OFFICERS.find(x=>x.id==='O014');
  finish(game,suffren);
  const route={total:240}, base=voyageEstimate(game,route);
  performContractAction(game,suffren.id,'equip');
  assert.equal(voyageEstimate(game,route).food,base.food*.96);
  const tromp=OFFICERS.find(x=>x.id==='O012');
  finish(game,tromp);
  const fullCost=supplyCost(game,30);
  performContractAction(game,tromp.id,'equip');
  assert.ok(supplyCost(game,30)<fullCost);
});
