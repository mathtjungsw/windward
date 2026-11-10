import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {SimulationClock} from '../dist/simulation-clock.js';
import {initialState,Navigator,advanceVoyage,canDepart} from '../dist/engine.js';
const load=n=>JSON.parse(fs.readFileSync(new URL('../dist/assets/'+n+'.json',import.meta.url))),nav=new Navigator(load('navigation'),load('rivers'));
test('5 FPS and 60 FPS consume the same foreground sailing time, food and distance',()=>{
 const results=[];for(const interval of [16,100,200,500,1000]){const g=initialState(),route=nav.route(g.position,[-8.61,41.15],{maxOffshore:80}),estimate=canDepart(g,route);g.voyage={...route,target:'porto',origin:'lisbon',travelled:0,foodRemaining:estimate.food};g.port=null;const clock=new SimulationClock();clock.steps(0,true);const frames=[];for(let t=interval;t<2000;t+=interval)frames.push(t);frames.push(2000);for(const t of frames)for(const dt of clock.steps(t,true))advanceVoyage(g,nav,dt);results.push(g);}
 for(const g of results){assert.ok(Math.abs(g.voyage.travelled-results[0].voyage.travelled)<1e-7);assert.ok(Math.abs(g.food-results[0].food)<1e-7);assert.ok(Math.abs(g.day-results[0].day)<1e-7);}
});
test('long stalls bound work without discarding time; hidden and paused intervals never catch up',()=>{const c=new SimulationClock();c.steps(0,true);let steps=c.steps(5000,true),sum=steps.reduce((a,b)=>a+b,0);assert.equal(steps.length,20);while(c.pending>1e-8){steps=c.steps(5000,true);assert.ok(steps.every(n=>n<=.1));sum+=steps.reduce((a,b)=>a+b,0);}assert.ok(Math.abs(sum-5)<1e-7);c.steps(6000,false);assert.deepEqual(c.steps(600000,true),[]);assert.ok(Math.abs(c.steps(600200,true).reduce((a,b)=>a+b,0)-.2)<1e-7);c.reset(700000);assert.deepEqual(c.steps(900000,true),[]);});
