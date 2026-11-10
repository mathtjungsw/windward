import test from 'node:test';import assert from 'node:assert/strict';
import {layoutChartLabels,placeRegionContains} from '../dist/chart-labels.js';
import {PLACE_NAMES} from '../dist/place-names.js';
import {PLACE_REGIONS} from '../dist/place-regions.js';
import {project,unproject,initialState} from '../dist/engine.js';
import {PORTS} from '../dist/data.js';
import {wrapPosition} from '../dist/world-wrap.js';
function view(point,width,height){const center=project(point),k=12;return {toScreen:p=>{const q=project(p);let dx=q[0]-center[0],dy=q[1]-center[1];dx-=Math.round(dx/1600)*1600;dy-=Math.round(dy/800)*800;return {x:width/2+dx*k,y:height/2+dy*k};},fromScreen:p=>wrapPosition(unproject([center[0]+(p.x-width/2)/k,center[1]+(p.y-height/2)/k]))};}
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
test('Lisbon mobile and PC show nearby names inside the view, without overlapping ships, ports or each other',()=>{
 const state=initialState();for(const width of [320,360,390,600,900])for(const height of [260,320,600]){
  const v=view(state.position,width,height),blocked=[state.position,...PORTS.filter(p=>state.knownPorts.includes(p.id)).map(p=>[p.lon,p.lat])].map(p=>{const q=v.toScreen(p);return {x:q.x-48,y:q.y-32,w:96,h:56};}),before=JSON.stringify(state);
  const labels=layoutChartLabels(PLACE_NAMES,v.toScreen,{width,height,blocked,fromScreen:v.fromScreen});assert.ok(labels.length>0,`${width}x${height} must show geography`);assert.ok(labels.some(l=>['north-atlantic','iberia'].includes(l.id)));if(width===390&&height>=320)assert.ok(labels.some(l=>l.id==='iberia'),'nearby peninsula must precede a distant continent name');assert.ok(labels.length<=(width<=850?8:16));
  for(const [i,l]of labels.entries()){assert.ok(l.box.x>=12&&l.box.y>=12&&l.box.x+l.box.w<=width-12&&l.box.y+l.box.h<=height-12);assert.ok(!blocked.some(b=>overlap(l.box,b)));assert.ok(!labels.slice(0,i).some(b=>overlap(l.box,b.box)));}assert.equal(JSON.stringify(state),before);
 }
});
test('real regional coverage enables ocean names far from their editorial anchors and excludes other continents',()=>{
 assert.ok(placeRegionContains(PLACE_REGIONS['north-atlantic'],[-20,38]));assert.equal(placeRegionContains(PLACE_REGIONS.iberia,[130,35]),false);
 for(const point of [[-20,38],[179,30],[-179,30]]){const width=390,height=400,v=view(point,width,height),labels=layoutChartLabels(PLACE_NAMES,v.toScreen,{width,height,fromScreen:v.fromScreen});assert.ok(labels.length>0);const oceans=labels.filter(l=>l.kind==='ocean');assert.ok(oceans.length>0);for(const l of oceans)assert.ok(placeRegionContains(PLACE_REGIONS[l.id],v.fromScreen(l.screenPoint)));}
});
test('region membership respects holes and reuses an existing visible world anchor while the camera moves',()=>{
 const region=[{bounds:[0,0,10,10],rings:[[[0,0],[10,0],[10,10],[0,10],[0,0]],[[3,3],[6,3],[6,6],[3,6],[3,3]]]}];assert.ok(placeRegionContains(region,[1,1]));assert.equal(placeRegionContains(region,[4,4]),false);assert.equal(placeRegionContains(region,[11,2]),false);
 const width=390,height=400,v=view([-20,38],width,height),one=layoutChartLabels(PLACE_NAMES,v.toScreen,{width,height,fromScreen:v.fromScreen}).find(l=>l.id==='north-atlantic');assert.ok(one);const previous=new Map([[one.id,{x:one.screenPoint.x-2,y:one.screenPoint.y}]]),two=layoutChartLabels(PLACE_NAMES,v.toScreen,{width,height,fromScreen:v.fromScreen,previous}).find(l=>l.id===one.id);assert.deepEqual(two.screenPoint,previous.get(one.id));
});
test('point labels do not teleport from far away or bypass a full-screen obstacle',()=>{
 const names=[{id:'point',name:'희망봉',lon:0,lat:0,kind:'cape',priority:80}],toScreen=()=>({x:-5000,y:40});assert.deepEqual(layoutChartLabels(names,toScreen,{width:390,height:400}),[]);assert.deepEqual(layoutChartLabels(PLACE_NAMES,view([-9.14,38.72],390,400).toScreen,{width:390,height:400,blocked:[{x:0,y:0,w:390,h:400}]}),[]);
});

test('generated coverage keeps exactly the existing polygon-backed names and finite closed rings',()=>{
 const ids=PLACE_NAMES.filter(p=>p.sourceLayer!=='points').map(p=>p.id).sort();assert.deepEqual(Object.keys(PLACE_REGIONS).sort(),ids);for(const polygons of Object.values(PLACE_REGIONS))for(const {bounds:b,rings}of polygons){assert.ok(b.every(Number.isFinite));assert.ok(b[0]<=b[2]&&b[1]<=b[3]);for(const ring of rings){assert.ok(ring.length>=4);assert.deepEqual(ring[0],ring.at(-1));for(const [x,y]of ring)assert.ok(Number.isFinite(x)&&Number.isFinite(y)&&x>=-180&&x<=180&&y>=-90&&y<=90);}}
});
