import { PORTS, PORT_BY_ID, GOODS } from './data.js';

export const SAVE_KEY='windward-save-v1';
export const START_DATE=Date.UTC(1522,3,6);
export const project = ([lon,lat])=>[(lon+180)*1600/360,(80-lat)*800/140];
export const unproject = ([x,y])=>[x*360/1600-180,80-y*140/800];
export const distance = (a,b)=>{
  const r=Math.PI/180, dl=(b[0]-a[0])*r, dp=(b[1]-a[1])*r;
  const h=Math.sin(dp/2)**2+Math.cos(a[1]*r)*Math.cos(b[1]*r)*Math.sin(dl/2)**2;
  return 3440.065*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));
};
export function initialState(){return {
  version:1,money:2400,food:100,day:0,cargo:{},visited:['lisbon'],port:'lisbon',
  position:[-9.14,38.72],voyage:null,controlMode:'auto',profit:0,trades:0,soldAway:false,level:0,speed:1,
  missions:[],quiz:[],boughtLisbonWine:false,log:[{day:0,text:'리스본에서 첫 항해를 준비합니다. 바람이 당신 편이기를!',type:'discovery'}],
};}
export function loadState(storage){
  try {
    const s=JSON.parse(storage.getItem(SAVE_KEY));
    if(!s || s.version!==1 || !Number.isFinite(s.money) || s.money<0 || !Number.isFinite(s.day) || s.day<0 || !Number.isFinite(s.food) || s.food<0 || s.food>160 || !Number.isInteger(s.level) || s.level<0 || s.level>2 || !Array.isArray(s.visited) || s.visited.some(id=>!PORT_BY_ID[id]) || !Array.isArray(s.position) || s.position.length!==2 || s.position.some(n=>!Number.isFinite(n)) || !s.cargo || typeof s.cargo!=='object' || Object.entries(s.cargo).some(([id,c])=>!GOODS[id] || !Number.isInteger(c.qty) || c.qty<0 || !Number.isFinite(c.cost) || c.cost<0))return initialState();
    if(s.port!==null && !PORT_BY_ID[s.port])return initialState();
    // A voyage is saved as a complete route so a refresh can resume at sea.
    if(s.voyage && (!Array.isArray(s.voyage.path) || s.voyage.path.length<2 || s.voyage.path.some(p=>!Array.isArray(p)||p.length!==2||p.some(n=>!Number.isFinite(n))) || !Array.isArray(s.voyage.lengths) || s.voyage.lengths.length!==s.voyage.path.length-1 || s.voyage.lengths.some(n=>!Number.isFinite(n)||n<0) || (s.voyage.target!==null&&!PORT_BY_ID[s.voyage.target]) || !Number.isFinite(s.voyage.travelled) || s.voyage.travelled<0 || !Number.isFinite(s.voyage.total) || s.voyage.total<=0 || !Number.isFinite(s.voyage.foodRemaining)))return initialState();
    // Existing docked saves move to the updated berth of the same port.
    const position=s.port&&!s.voyage?[PORT_BY_ID[s.port].lon,PORT_BY_ID[s.port].lat]:s.position;
    return {...initialState(),...s,position,controlMode:s.voyage?'auto':s.controlMode==='manual'?'manual':'auto',speed:[1,2,4].includes(s.speed)?s.speed:1,missions:Array.isArray(s.missions)?s.missions:[],quiz:Array.isArray(s.quiz)?s.quiz:[],log:Array.isArray(s.log)?s.log.slice(0,50):[]};
  } catch{return initialState();}
}
export function capacity(s){return [40,65,100][s.level];}
export function usedCargo(s){return Object.values(s.cargo).reduce((n,c)=>n+c.qty,0);}
export function dailySpeed(s){return [360,440,520][s.level];}
export function price(portId,goodId,day=0){
  const p=PORT_BY_ID[portId],g=GOODS[goodId];
  const source=PORTS.filter(q=>q.specialty===goodId);
  const nearest=Math.min(...source.map(q=>distance([p.lon,p.lat],[q.lon,q.lat])));
  const variation=1+0.045*Math.sin(Math.floor(day/7)*1.7+PORTS.indexOf(p)*2+Object.keys(GOODS).indexOf(goodId));
  return Math.round(g.base*(p.specialty===goodId?0.65:1.08+Math.min(nearest/3800,1.25))*variation);
}
export function sellPrice(portId,goodId,day){return Math.floor(price(portId,goodId,day)*0.88);}
export function buy(s,goodId,qty){
  qty=Math.floor(qty);
  if(!s.port || !PORT_BY_ID[s.port].market.includes(goodId) || !Number.isFinite(qty)||qty<=0)return {ok:false,error:'구매할 수량을 확인하세요.'};
  const unit=price(s.port,goodId,s.day),total=unit*qty;
  if(usedCargo(s)+qty>capacity(s))return {ok:false,error:'화물칸이 부족해요.'};
  if(total>s.money)return {ok:false,error:'두카트가 부족해요.'};
  const c=s.cargo[goodId]||{qty:0,cost:0};
  s.cargo[goodId]={qty:c.qty+qty,cost:c.cost+total};s.money-=total;s.trades++;
  if(s.port==='lisbon'&&goodId==='wine')s.boughtLisbonWine=true;
  return {ok:true,total,qty,unit};
}
export function sell(s,goodId,qty){
  qty=Math.floor(qty);const c=s.cargo[goodId];
  if(!s.port || !c || !Number.isFinite(qty)||qty<=0||qty>c.qty)return {ok:false,error:'판매할 화물이 없어요.'};
  const unit=sellPrice(s.port,goodId,s.day),total=unit*qty,cost=c.cost*qty/c.qty;
  c.qty-=qty;c.cost-=cost;s.money+=total;s.profit+=total-cost;s.trades++;
  if(!c.qty)delete s.cargo[goodId];
  if(s.port!=='lisbon'&&goodId==='wine'&&s.boughtLisbonWine)s.soldAway=true;
  return {ok:true,total,qty,unit,profit:Math.round(total-cost)};
}

class Heap{
  data=[];
  push(id,score){let i=this.data.length;this.data.push([id,score]);while(i){const p=(i-1)>>1;if(this.data[p][1]<=score)break;this.data[i]=this.data[p];i=p;}this.data[i]=[id,score];}
  pop(){const top=this.data[0],last=this.data.pop();if(this.data.length){let i=0;while(i*2+1<this.data.length){let c=i*2+1;if(c+1<this.data.length&&this.data[c+1][1]<this.data[c][1])c++;if(this.data[c][1]>=last[1])break;this.data[i]=this.data[c];i=c;}this.data[i]=last;}return top[0];}
  get size(){return this.data.length;}
}

export class Navigator{
  constructor(grid,rivers=[]){
    this.w=grid.width;this.h=grid.height;this.step=grid.step;this.top=grid.top;this.mask=Uint8Array.from(atob(grid.land),c=>c.charCodeAt(0));
    this.rivers=rivers.map(r=>{const route=makeRoute(r.path),xs=r.path.map(p=>p[0]),ys=r.path.map(p=>p[1]);let d=0;return {...r,...route,bounds:[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)],segments:r.path.slice(1).map((b,i)=>{const a=r.path[i],offset=d;d+=route.lengths[i];return {a,b,offset,length:route.lengths[i]};})};});
  }
  coord(i){return [i%this.w*this.step-180,this.top-Math.floor(i/this.w)*this.step];}
  cell([lon,lat]){const x=((Math.round((lon+180)/this.step)%this.w)+this.w)%this.w,y=Math.round((this.top-lat)/this.step);return y<0||y>=this.h?-1:y*this.w+x;}
  isOceanLand(p){const i=this.cell(p);return i<0||!!this.mask[i];}
  isLand(p){return this.isOceanLand(p)&&!this.riverAt(p);}
  projectRiver(p,r){
    const c=Math.max(.1,Math.cos(p[1]*Math.PI/180));let best=null,bestD=Infinity;
    for(const s of r.segments){const dx=(s.b[0]-s.a[0])*c,dy=s.b[1]-s.a[1],den=dx*dx+dy*dy,t=den?Math.max(0,Math.min(1,((p[0]-s.a[0])*c*dx+(p[1]-s.a[1])*dy)/den)):0;
      const q=[s.a[0]+(s.b[0]-s.a[0])*t,s.a[1]+(s.b[1]-s.a[1])*t],d=((p[0]-q[0])*c)**2+(p[1]-q[1])**2;
      if(d<bestD){bestD=d;best={river:r,point:q,offset:s.offset+s.length*t};}
    }
    return {...best,distance:distance(p,best.point)};
  }
  riverAt(p){
    let best=null;
    for(const r of this.rivers){const margin=(r.widthNM||5)/60,dx=margin/Math.max(.1,Math.cos(p[1]*Math.PI/180)),b=r.bounds;
      if(p[0]<b[0]-dx||p[0]>b[2]+dx||p[1]<b[1]-margin||p[1]>b[3]+margin)continue;
      const q=this.projectRiver(p,r);if(q.distance<=(r.widthNM||5)&&(!best||q.distance<best.distance))best=q;
    }
    return best;
  }
  approach(port){const r=this.rivers.find(r=>r.id===port.river);return r?this.projectRiver([port.lon,port.lat],r).point:this.coord(this.nearest([port.lon,port.lat]));}
  riverSection(r,from,to){
    const start=Math.min(from,to),end=Math.max(from,to),path=[positionAlong(r,start)];let offset=0;
    r.path.slice(1).forEach((p,i)=>{offset+=r.lengths[i];if(offset>start+.001&&offset<end-.001)path.push(p);});
    path.push(positionAlong(r,end));return from>to?path.reverse():path;
  }
  nearest(p){
    const center=this.cell(p);if(center<0)return -1;
    if(!this.mask[center])return center;
    let best=-1,bestDist=Infinity;
    const cx=center%this.w,cy=Math.floor(center/this.w);
    for(let r=1;r<=8;r++){
      for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
        if(Math.abs(dx)!==r&&Math.abs(dy)!==r)continue;
        const y=cy+dy,x=(cx+dx+this.w)%this.w,i=y*this.w+x;
        if(y<0||y>=this.h||this.mask[i])continue;
        const d=distance(p,this.coord(i));if(d<bestDist){bestDist=d;best=i;}
      }
      if(best>=0)return best;
    }
    return -1;
  }
  route(from,to){
    const a=this.riverAt(from),b=this.riverAt(to);
    if(a&&b&&a.river.id===b.river.id)return {...makeRoute([from,...this.riverSection(a.river,a.offset,b.offset),to]),waterways:[a.river.id]};
    const ocean=this.routeOcean(a?a.river.path[0]:from,b?b.river.path[0]:to);if(!ocean)return null;
    const prefix=a?[from,...this.riverSection(a.river,a.offset,0)]:[];
    const suffix=b?[...this.riverSection(b.river,0,b.offset),to]:[];
    return {...makeRoute([...prefix,...ocean.path,...suffix]),waterways:[...new Set([a?.river.id,b?.river.id].filter(Boolean))]};
  }
  routeOcean(from,to){
    const start=this.nearest(from),goal=this.nearest(to);if(start<0||goal<0)return null;
    const size=this.w*this.h,g=new Float64Array(size);g.fill(Infinity);
    const prev=new Int32Array(size);prev.fill(-1);const closed=new Uint8Array(size),heap=new Heap();
    g[start]=0;heap.push(start,0);
    const dirs=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];
    while(heap.size){
      const id=heap.pop();if(closed[id])continue;if(id===goal)break;closed[id]=1;
      const x=id%this.w,y=Math.floor(id/this.w),p=this.coord(id);
      for(const [dx,dy]of dirs){
        const ny=y+dy,nx=(x+dx+this.w)%this.w,n=ny*this.w+nx;
        if(ny<0||ny>=this.h||this.mask[n]||closed[n])continue;
        if(dx&&dy&&(this.mask[y*this.w+nx]||this.mask[ny*this.w+x]))continue;
        const q=this.coord(n),cost=g[id]+distance(p,q);
        if(cost>=g[n])continue;g[n]=cost;prev[n]=id;heap.push(n,cost+distance(q,this.coord(goal)));
      }
    }
    if(start!==goal&&prev[goal]<0)return null;
    let ids=[goal];while(ids.at(-1)!==start){ids.push(prev[ids.at(-1)]);if(ids.length>size)return null;}ids.reverse();
    let path=ids.map(i=>this.coord(i));
    // Keep safe bends and smooth straight stretches without cutting across land.
    const smooth=[path[0]];let anchor=0;
    while(anchor<path.length-1){let next=anchor+1;for(let j=anchor+2;j<Math.min(path.length,anchor+60);j++){if(!this.clearOcean(path[anchor],path[j]))break;next=j;}smooth.push(path[next]);anchor=next;}
    if(distance(from,smooth[0])>0.1)smooth.unshift(from);
    if(distance(to,smooth.at(-1))>0.1)smooth.push(to);
    if(smooth.length===1)smooth.push(to);
    const lengths=smooth.slice(1).map((p,i)=>distance(smooth[i],p));
    return {path:smooth,lengths,total:lengths.reduce((a,b)=>a+b,0)};
  }
  clearOcean(a,b){return this.checkSegment(a,b,.025,p=>this.isOceanLand(p));}
  clear(a,b){return this.checkSegment(a,b,.025,p=>this.isLand(p));}
  checkSegment(a,b,step,land){let dl=b[0]-a[0];if(dl>180)dl-=360;if(dl<-180)dl+=360;const steps=Math.ceil(Math.max(Math.abs(dl),Math.abs(b[1]-a[1]))/step);for(let i=0;i<=steps;i++){const t=i/Math.max(1,steps);if(land([a[0]+dl*t,a[1]+(b[1]-a[1])*t]))return false;}return true;}
}
export function makeRoute(points){
  const path=points.filter((p,i)=>i===0||distance(p,points[i-1])>.00001).map(p=>[...p]);
  if(path.length===1)path.push([...path[0]]);
  const lengths=path.slice(1).map((p,i)=>distance(path[i],p));return {path,lengths,total:lengths.reduce((a,b)=>a+b,0)};
}
export function positionAlong(v,d){
  let rem=Math.max(0,d);
  for(let i=0;i<v.lengths.length;i++){
    if(rem<=v.lengths[i]||i===v.lengths.length-1){const t=v.lengths[i]?Math.min(rem/v.lengths[i],1):1,a=v.path[i],b=v.path[i+1];let dl=b[0]-a[0];if(dl>180)dl-=360;if(dl<-180)dl+=360;return [((a[0]+dl*t+540)%360)-180,a[1]+(b[1]-a[1])*t];}
    rem-=v.lengths[i];
  }
  return v.path.at(-1);
}
export function voyageEstimate(s,route){const days=Math.max(0.25,route.total/dailySpeed(s));return {days,food:Math.max(1,Math.ceil(days*.9))};}

// One direct helm step in nautical miles. Diagonals retain the same speed.
export function helmStep(from,east,north,miles){
  if(!Number.isFinite(miles)||miles<=0||(!east&&!north))return [...from];
  const rad=Math.PI/180,bearing=Math.atan2(east,north),angular=miles/3440.065;
  const lat=from[1]*rad,lon=from[0]*rad;
  const nextLat=Math.asin(Math.sin(lat)*Math.cos(angular)+Math.cos(lat)*Math.sin(angular)*Math.cos(bearing));
  const nextLon=lon+Math.atan2(Math.sin(bearing)*Math.sin(angular)*Math.cos(lat),Math.cos(angular)-Math.sin(lat)*Math.sin(nextLat));
  return [((nextLon/rad+540)%360)-180,nextLat/rad];
}
export function helmToward(from,target,miles){
  const remaining=distance(from,target);if(remaining<=miles)return [...target];
  const rad=Math.PI/180,lat=from[1]*rad,toLat=target[1]*rad,delta=(target[0]-from[0])*rad;
  const east=Math.sin(delta)*Math.cos(toLat),north=Math.cos(lat)*Math.sin(toLat)-Math.sin(lat)*Math.cos(toLat)*Math.cos(delta);
  return helmStep(from,east,north,miles);
}
