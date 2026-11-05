import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Navigator,distance,price,sellPrice} from '../dist/engine.js';
import {PORT_BY_ID} from '../dist/data.js';
import {GOODS} from '../dist/port-economy.js';
import {ACTIVE_PORT_IDS,RETIRED_PORT_IDS,NEW_PORTS,NEW_PORT_ECONOMY,NEW_PORT_HISTORY,PORT_REGIONS,ISLAND_COAST_POINTS} from '../dist/world-catalog.js';
import {DISCOVERIES,DISCOVERY_BY_ID,RUMORS,RUMOR_BY_ID} from '../dist/discoveries-catalog.js';

const read=name=>JSON.parse(readFileSync(new URL('../'+name,import.meta.url),'utf8'));
const nav=new Navigator(read('dist/assets/navigation.json'),read('dist/assets/rivers.json'));
const start=nav.approach({lon:-9.14,lat:38.72});

test('the world catalog keeps 54 old active ports, retires 34 and adds 16 across six navigation regions',()=>{
 assert.equal(ACTIVE_PORT_IDS.length,70);assert.equal(new Set(ACTIVE_PORT_IDS).size,70);
 assert.equal(RETIRED_PORT_IDS.length,34);assert.equal(NEW_PORTS.length,16);
 const added=new Set(NEW_PORTS.map(p=>p.id));assert.equal(ACTIVE_PORT_IDS.filter(id=>!added.has(id)).length,54);
 assert.equal(new Set([...ACTIVE_PORT_IDS,...RETIRED_PORT_IDS]).size,104);
 assert.ok(RETIRED_PORT_IDS.every(id=>!ACTIVE_PORT_IDS.includes(id)));
 const counts=Object.values(PORT_REGIONS).reduce((m,r)=>(m[r]=(m[r]||0)+1,m),{});
 assert.deepEqual(counts,{'유럽':14,'아프리카':14,'아시아':16,'북아메리카':8,'남아메리카':8,'오세아니아':10});
 assert.ok(['lisbon','porto','seville'].every(id=>ACTIVE_PORT_IDS.includes(id)));
});

test('all 16 new game berths are water points with connected ocean routes and valid economy stories',()=>{
 for(const p of NEW_PORTS){
  assert.ok(!nav.isLand([p.lon,p.lat]),p.id+' berth is land');
  assert.ok(Number.isFinite(p.cityLon)&&Number.isFinite(p.cityLat));
  const route=nav.route(start,[p.lon,p.lat]);assert.ok(route&&route.total>0,p.id+' lacks route');
  for(let i=1;i<route.path.length;i++)assert.ok(nav.clear(route.path[i-1],route.path[i]),p.id+' route crosses land');
  assert.ok(route.total<192*85,p.id+' exceeds the final ship sea range from Lisbon');
  const e=NEW_PORT_ECONOMY[p.id];assert.ok(e&&Object.keys(e.stock).length>=3);
  for(const [good,role]of Object.entries(e.stock)){assert.ok(GOODS[good]&&!GOODS[good].legacy,p.id+'/'+good);assert.ok(['producer','local','import'].includes(role));}
  for(const good of e.demand)assert.ok(GOODS[good]&&!GOODS[good].legacy);
  assert.ok(NEW_PORT_HISTORY[p.id].text&&NEW_PORT_HISTORY[p.id].eraNote);
 }
});

test('32 distinct discovery records have four kinds and balanced difficulty, totaling 12800 fame',()=>{
 assert.equal(DISCOVERIES.length,32);assert.equal(Object.keys(DISCOVERY_BY_ID).length,32);
 assert.equal(new Set(DISCOVERIES.map(d=>d.point.join(','))).size,32);
 for(const kind of ['ruin','relic','animal','treasure'])assert.equal(DISCOVERIES.filter(d=>d.kind===kind).length,8);
 for(let tier=1;tier<=4;tier++)assert.equal(DISCOVERIES.filter(d=>d.tier===tier).length,8);
 assert.equal(DISCOVERIES.reduce((n,d)=>n+d.fame,0),12800);
 for(const d of DISCOVERIES){
  assert.equal(d.lon,d.point[0]);assert.equal(d.lat,d.point[1]);
  assert.ok(d.inspectRadius<d.spotRadius);assert.equal(d.image,'assets/discoveries/'+d.id+'.svg');
  assert.ok(d.description);if(!d.fiction)assert.ok(d.sources.length>0,d.id+' missing a primary source');
  for(const s of d.sources)assert.match(s.url,/^https:\/\//);
 }
});

test('all discovery observation points follow real navigable paths and the river pendant stays on its river',()=>{
 for(const d of DISCOVERIES){
  assert.ok(!nav.isLand(d.point),d.id+' observation point is land');
  const route=nav.route(start,d.point);assert.ok(route,d.id+' lacks route');
  const finalShipDays=route.sections.reduce((sum,s)=>sum+(s.end-s.start)/(s.river?36:192),0);
  assert.ok(finalShipDays+5<=90,d.id+' exceeds final ship supply including reserve');
  for(let i=1;i<route.path.length;i++)assert.ok(nav.clear(route.path[i-1],route.path[i]),d.id+' route crosses land');
  if(d.river)assert.equal(nav.riverAt(d.point)?.river.id,d.river);
 }
});

test('retained nearby major ports have at least 180 NM actual sailing distance',()=>{
 const ports=ACTIVE_PORT_IDS.map(id=>PORT_BY_ID[id]);
 for(let i=0;i<ports.length;i++)for(let j=i+1;j<ports.length;j++){
  const a=ports[i],b=ports[j];if(distance([a.lon,a.lat],[b.lon,b.lat])>=180)continue;
  const route=nav.route([a.lon,a.lat],[b.lon,b.lat]);assert.ok(route,a.id+'/'+b.id);
  assert.ok(route.total>=180,`${a.id}/${b.id} only ${route.total} NM`);
 }
});

test('the starter wine and dried fish cycle remains profitable before the first mission reward',()=>{
 const outward=15*(sellPrice('porto','wine',0)-price('lisbon','wine',0));
 const homeward=15*(sellPrice('lisbon','driedfish',0)-price('porto','driedfish',0));
 const trip=nav.route([PORT_BY_ID.lisbon.lon,PORT_BY_ID.lisbon.lat],[PORT_BY_ID.porto.lon,PORT_BY_ID.porto.lat],{maxOffshore:80});
 const supplyCost=Math.ceil(trip.total/80*2*3);
 assert.ok(outward>0);assert.ok(homeward>0);assert.ok(outward+homeward-supplyCost>0);
});

test('hard discoveries have one rumor, legendary discoveries two distinct active port rumors',()=>{
 assert.equal(RUMORS.length,24);assert.equal(Object.keys(RUMOR_BY_ID).length,24);
 for(const d of DISCOVERIES){
  assert.equal(d.rumorIds.length,d.tier===4?2:d.tier===3?1:0);
  const rumors=d.rumorIds.map(id=>RUMOR_BY_ID[id]);
  for(const r of rumors){assert.ok(ACTIVE_PORT_IDS.includes(r.portId));assert.equal(r.discoveryId,d.id);assert.ok(r.text.length>10);}
  assert.equal(new Set(rumors.map(r=>r.portId)).size,rumors.length);
 }
});

test('small-island geometry retains closed polygon rings and all expected island groups',()=>{
 const geo=read('dist/assets/islands.geojson'),groups=new Set(geo.features.map(f=>f.properties.islandGroup));
 for(const group of ['azores','mauritius','hawaii','fiji-east','tahiti','rapanui','samoa','pohnpei','galapagos','andaman'])assert.ok(groups.has(group),group);
 assert.ok(ISLAND_COAST_POINTS.length>=16);
 for(const f of geo.features)for(const ring of f.geometry.coordinates){assert.ok(ring.length>=4);assert.deepEqual(ring[0],ring.at(-1));for(const p of ring)assert.ok(p.every(Number.isFinite));}
});
