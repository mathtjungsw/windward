import {PORTS,PORT_BY_ID} from './data.js';
import {distance,helmStep} from './engine.js';
import {wrapPosition,mapDistance} from './world-wrap.js';

export const SIGHT_NM=180,DISCOVERY_NM=40,INFO_PRICE=100,INFO_RANGE=600;
export const START_PORTS=['lisbon','porto','sanlucar','seville'];
export const worldId=value=>value==='real'?'real':'peace';
export const worldSpeed=s=>worldId(s.world)==='real'?1:[1,2,4].includes(s.speed)?s.speed:1;
export const knowsPort=(s,id)=>!!id&&s.knownPorts.includes(id);
export function discoverPorts(s,from=s.position,to=s.position){
  const found=[];
  for(const p of PORTS)if(!knowsPort(s,p.id)&&segmentDistance(from,to,[p.lon,p.lat]).distance<=DISCOVERY_NM){s.knownPorts.push(p.id);found.push(p);}
  return found;
}
export function informationCandidate(s){
  const p=PORT_BY_ID[s.port];if(!p||s.voyage)return null;
  return PORTS.filter(q=>!knowsPort(s,q.id)).map(q=>({port:q,d:distance([p.lon,p.lat],[q.lon,q.lat])})).filter(q=>q.d<=INFO_RANGE).sort((a,b)=>a.d-b.d)[0]?.port||null;
}
export function buyInformation(s){
  const p=informationCandidate(s);
  if(!p)return {ok:false,error:'이 근처에서 얻을 새 항구 정보가 없어요.'};
  if(s.money<INFO_PRICE)return {ok:false,error:'정보를 얻으려면 100 D가 필요해요.'};
  s.money-=INFO_PRICE;s.knownPorts.push(p.id);return {ok:true,port:p};
}
export function segmentDistance(a,b,p){
  const short=n=>((n+540)%360)-180,c=Math.max(.1,Math.cos(p[1]*Math.PI/180));
  const ax=short(a[0]-p[0])*c,ay=a[1]-p[1],dx=short(b[0]-a[0])*c,dy=b[1]-a[1];
  const t=Math.max(0,Math.min(1,-(ax*dx+ay*dy)/(dx*dx+dy*dy||1)));
  const point=[p[0]+(ax+dx*t)/c,p[1]+ay+dy*t];
  return {distance:distance(point,p),point,t};
}
export function dockAlong(nav,from,to,approaches,departed){
  return PORTS.filter(p=>p.id!==departed).map(p=>({p,berth:approaches.get(p.id),hit:segmentDistance(from,to,approaches.get(p.id))})).filter(({p,berth,hit})=>hit.distance<=(p.river?3:6)&&(!p.river||nav.riverAt(hit.point)?.river.id===p.river)&&nav.clear(hit.point,berth)).sort((a,b)=>a.hit.t-b.hit.t||a.hit.distance-b.hit.distance)[0]?.p||null;
}

const EXP_W=720,EXP_H=280,EXP_BYTES=Math.ceil(EXP_W*EXP_H/8);
export class Exploration{
  constructor(encoded=''){
    this.bits=new Uint8Array(EXP_BYTES);this.revision=0;
    try{const s=atob(encoded);if(s.length===EXP_BYTES||s.length===EXP_BYTES+90)for(let i=0;i<EXP_BYTES;i++)this.bits[i]=s.charCodeAt(i);}catch{}
  }
  cell(point){const [lon,lat]=wrapPosition(point),x=((Math.floor((lon+180)*2)%EXP_W)+EXP_W)%EXP_W,y=((Math.floor((80-lat)*2)%EXP_H)+EXP_H)%EXP_H;return y*EXP_W+x;}
  seen(p){const i=this.cell(p);return i>=0&&!!(this.bits[i>>3]&(1<<(i&7)));}
  reveal(position,radius=SIGHT_NM){
    const dy=radius/60+.5,c=Math.cos(position[1]*Math.PI/180),nearEdge=position[1]+dy>80||position[1]-dy<-60,dx=Math.min(180,dy/Math.max(.1,nearEdge?Math.min(c,Math.cos(80*Math.PI/180)):c));
    let changed=false;
    for(let lat=Math.floor((position[1]-dy)*2)/2;lat<=position[1]+dy;lat+=.5)for(let lon=Math.floor((position[0]-dx)*2)/2;lon<=position[0]+dx;lon+=.5){
      const p=wrapPosition([lon,lat]);if(mapDistance(position,p)>radius+22)continue;const i=this.cell(p);const mask=1<<(i&7);if(!(this.bits[i>>3]&mask)){this.bits[i>>3]|=mask;changed=true;}
    }
    if(changed)this.revision++;return changed;
  }
  travel(from,to){const n=Math.max(1,Math.ceil(distance(from,to)/60));for(let i=0;i<=n;i++){let dl=((to[0]-from[0]+540)%360)-180;this.reveal([((from[0]+dl*i/n+540)%360)-180,from[1]+(to[1]-from[1])*i/n]);}}
  encode(){let s='';for(const b of this.bits)s+=String.fromCharCode(b);return btoa(s);}
  visibility(p,position){if(p[1]<-60||p[1]>80)return 0;return mapDistance(p,position)<=SIGHT_NM?2:this.seen(p)?1:0;}
  seed(s){for(const id of s.visited){const p=PORT_BY_ID[id];if(p)this.reveal([p.lon,p.lat]);}this.reveal(s.position);}
  boundary(position){return Array.from({length:73},(_,i)=>helmStep(position,Math.sin(i*5*Math.PI/180),Math.cos(i*5*Math.PI/180),SIGHT_NM));}
}
