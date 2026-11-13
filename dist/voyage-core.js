import {PORTS,PORT_BY_ID} from './data.js?v=2026.11.13-gear-corinth';
import {distance,helmStep} from './engine.js?v=2026.11.13-gear-corinth';
import {wrapPosition,mapDistance} from './world-wrap.js?v=2026.11.13-gear-corinth';

export const SIGHT_NM=180,DISCOVERY_NM=80,INFO_PRICE=100,INFO_RANGE=600;
import {activeOfficer} from './rumor-progress.js?v=2026.11.13-gear-corinth';
export const informationCost=s=>Math.ceil(INFO_PRICE*(1-(activeOfficer(s)?.infoDiscount||0)));
export const START_PORTS=['lisbon','porto','seville'];
export const worldId=value=>value==='real'?'real':'peace';
export const worldSpeed=s=>worldId(s.world)==='real'?1:[1,2,4].includes(s.speed)?s.speed:1;
export const knowsPort=(s,id)=>!!id&&(s.knownPorts.includes(id)||!!(PORT_BY_ID[id]?.depot&&PORT_BY_ID[id].active));
export function discoverPorts(s,from=s.position,to=s.position,point=p=>[p.lon,p.lat]){
  if(s.explorationLockedUntilSailing||['rescue','transition'].includes(s.voyage?.kind))return [];
  const found=[];
  for(const p of PORTS)if(!knowsPort(s,p.id)&&segmentDistance(from,to,point(p)).distance<=DISCOVERY_NM){s.knownPorts.push(p.id);found.push(p);}
  return found;
}
export function informationCandidate(s){
  const p=PORT_BY_ID[s.port];if(!p||s.voyage)return null;
  return PORTS.filter(q=>!knowsPort(s,q.id)).map(q=>({port:q,d:distance([p.lon,p.lat],[q.lon,q.lat])})).filter(q=>q.d<=INFO_RANGE).sort((a,b)=>a.d-b.d)[0]?.port||null;
}
export function buyInformation(s){
  const p=informationCandidate(s);
  if(!p)return {ok:false,error:'이 근처에서 얻을 새 항구 정보가 없어요.'};
  const cost=informationCost(s);
  if(s.money<cost)return {ok:false,error:'정보를 얻으려면 '+cost+' D가 필요해요.'};
  s.money-=cost;s.knownPorts.push(p.id);return {ok:true,port:p,cost};
}
export function segmentDistance(a,b,p){
  const short=n=>((n+540)%360)-180,c=Math.max(.1,Math.cos(p[1]*Math.PI/180));
  const ax=short(a[0]-p[0])*c,ay=a[1]-p[1],dx=short(b[0]-a[0])*c,dy=b[1]-a[1];
  const t=Math.max(0,Math.min(1,-(ax*dx+ay*dy)/(dx*dx+dy*dy||1)));
  const point=[p[0]+(ax+dx*t)/c,p[1]+ay+dy*t];
  return {distance:distance(point,p),point,t};
}
// Coarse ocean navigation cells can place a berth offshore from its visible marker.
export const dockingRadius=(port,berth)=>port.depot?12:port.river?18:Math.min(60,Math.max(45,distance([port.lon,port.lat],berth)+12));
export const leftHarbor=(id,position,approaches)=>!approaches.has(id)||distance(position,approaches.get(id))>dockingRadius(PORT_BY_ID[id],approaches.get(id))+12;
const berthConnections=new WeakMap();
function canReachBerth(nav,point,berth,port){
 if(nav.clear(point,berth))return true;
 const limit=port.river?24:60;
 let cache=berthConnections.get(nav);
 if(!cache){cache=new Map();berthConnections.set(nav,cache);}
 const key=port.id+':'+point.map(n=>n.toFixed(4)).join(',');
 if(cache.has(key))return cache.get(key);
 const route=nav.route?.(point,berth,{maxDistance:limit});
 const valid=!!route&&route.total<=Math.min(limit,distance(point,berth)*1.5+3)&&route.path.every((p,i)=>!i||nav.clear(route.path[i-1],p));
 if(cache.size>=256)cache.clear();
 cache.set(key,valid);
 return valid;
}
export function dockAlong(nav,from,to,approaches,departed){
  const candidates=PORTS.filter(p=>p.id!==departed&&approaches.has(p.id)).map(p=>({p,berth:approaches.get(p.id),hit:segmentDistance(from,to,approaches.get(p.id))}));
  return candidates.filter(({p,berth,hit})=>hit.distance<=dockingRadius(p,berth)&&(!p.river||nav.riverAt(hit.point)?.river.id===p.river)&&nav.clear(from,hit.point)&&canReachBerth(nav,hit.point,berth,p)).sort((a,b)=>a.hit.t-b.hit.t||a.hit.distance-b.hit.distance)[0]?.p||null;
}

const EXP_W=720,EXP_H=280,EXP_BYTES=Math.ceil(EXP_W*EXP_H/8);
export class Exploration{
  constructor(encoded=''){
    this.bits=new Uint8Array(EXP_BYTES);this.revision=0;this.newCells=[];this.frozen=false;
    try{const s=atob(encoded);if(s.length===EXP_BYTES||s.length===EXP_BYTES+90)for(let i=0;i<EXP_BYTES;i++)this.bits[i]=s.charCodeAt(i);}catch{}
  }
  cell(point){const [lon,lat]=wrapPosition(point),x=((Math.floor((lon+180)*2)%EXP_W)+EXP_W)%EXP_W,y=((Math.floor((80-lat)*2)%EXP_H)+EXP_H)%EXP_H;return y*EXP_W+x;}
  seen(p){const i=this.cell(p);return i>=0&&!!(this.bits[i>>3]&(1<<(i&7)));}
  reveal(position,radius=SIGHT_NM){
    if(this.frozen)return false;
    const dy=radius/60+.5,c=Math.cos(position[1]*Math.PI/180),nearEdge=position[1]+dy>80||position[1]-dy<-60,dx=Math.min(180,dy/Math.max(.1,nearEdge?Math.min(c,Math.cos(80*Math.PI/180)):c));
    let changed=false;
    for(let lat=Math.floor((position[1]-dy)*2)/2;lat<=position[1]+dy;lat+=.5)for(let lon=Math.floor((position[0]-dx)*2)/2;lon<=position[0]+dx;lon+=.5){
      const p=wrapPosition([lon,lat]);if(mapDistance(position,p)>radius+22)continue;const i=this.cell(p);const mask=1<<(i&7);if(!(this.bits[i>>3]&mask)){this.bits[i>>3]|=mask;this.newCells.push(i);changed=true;}
    }
    if(changed)this.revision++;return changed;
  }
  travel(from,to){const n=Math.max(1,Math.ceil(distance(from,to)/60));for(let i=0;i<=n;i++){let dl=((to[0]-from[0]+540)%360)-180;this.reveal([((from[0]+dl*i/n+540)%360)-180,from[1]+(to[1]-from[1])*i/n]);}}
  encode(){let s='';for(const b of this.bits)s+=String.fromCharCode(b);return btoa(s);}
  visibility(p,position){if(p[1]<-60||p[1]>80)return 0;return !this.frozen&&mapDistance(p,position)<=SIGHT_NM?2:this.seen(p)?1:0;}
  seed(s){this.frozen=!!s.explorationLockedUntilSailing||['rescue','transition'].includes(s.voyage?.kind);if(this.frozen)return;for(const id of s.visited){const p=PORT_BY_ID[id];if(p)this.reveal([p.lon,p.lat]);}this.reveal(s.position);}
  boundary(position){return Array.from({length:73},(_,i)=>helmStep(position,Math.sin(i*5*Math.PI/180),Math.cos(i*5*Math.PI/180),SIGHT_NM));}
}
