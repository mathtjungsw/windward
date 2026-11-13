import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {Navigator,distance} from '../dist/engine.js';
import {createChartDetail} from '../dist/chart-waterways.js';
import {ALL_PORTS,PORTS} from '../dist/data.js';
import {dockAlong,dockingRadius} from '../dist/voyage-core.js';

const read=async name=>JSON.parse(await readFile(new URL('../dist/assets/'+name,import.meta.url),'utf8'));
const nav=new Navigator(await read('navigation.json'),await read('rivers.json'),createChartDetail([
 ...(await read('world-land.geojson')).features,...(await read('islands.geojson')).features
]));
const approaches=new Map(ALL_PORTS.map(port=>[port.id,nav.approach(port)]));
const records=[];
for(const port of ALL_PORTS){
 const berth=approaches.get(port.id);
 const water=!!berth&&!nav.isLand(berth);
 const anchor=berth&&nav.anchor(berth,Infinity);
 const river=port.river&&nav.rivers.find(r=>r.id===port.river);
 const origin=river?.path[0]||anchor?.path.at(-1);
 const route=origin&&nav.route(origin,berth);
 const connected=!!route&&route.path.every((point,index)=>!index||nav.clear(route.path[index-1],point));
 const active=PORTS.some(row=>row.id===port.id);
 const manual=!active||dockAlong(nav,berth,berth,approaches)?.id===port.id;
 records.push({id:port.id,name:port.name,active,city:[port.lon,port.lat],berth,water,connected,manual,
  offsetNM:Number(distance([port.lon,port.lat],berth).toFixed(3)),dockingNM:dockingRadius(port,berth)});
}
const failed=records.filter(row=>!row.water||!row.connected||!row.manual);
await mkdir(new URL('../.qa/',import.meta.url),{recursive:true});
await writeFile(new URL('../.qa/harbor-audit-2026-11-13.json',import.meta.url),JSON.stringify({records,failed},null,2));
console.log(JSON.stringify({ports:records.length,active:records.filter(row=>row.active).length,failed}));
if(failed.length)process.exitCode=1;
