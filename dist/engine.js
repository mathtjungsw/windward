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
  position:[-9.14,38.72],voyage:null,profit:0,trades:0,soldAway:false,level:0,speed:1,
  missions:[],quiz:[],boughtLisbonWine:false,log:[{day:0,text:'리스본에서 첫 항해를 준비합니다. 바람이 당신 편이기를!',type:'discovery'}],
};}
export function loadState(storage){
  try {
    const s=JSON.parse(storage.getItem(SAVE_KEY));
    if(!s || s.version!==1 || !Number.isFinite(s.money) || s.money<0 || !Number.isFinite(s.day) || s.day<0 || !Number.isFinite(s.food) || s.food<0 || s.food>160 || !Number.isInteger(s.level) || s.level<0 || s.level>2 || !Array.isArray(s.visited) || s.visited.some(id=>!PORT_BY_ID[id]) || !Array.isArray(s.position) || s.position.length!==2 || s.position.some(n=>!Number.isFinite(n)) || !s.cargo || typeof s.cargo!=='object' || Object.entries(s.cargo).some(([id,c])=>!GOODS[id] || !Number.isInteger(c.qty) || c.qty<0 || !Number.isFinite(c.cost) || c.cost<0))return initialState();
    if(s.port!==null && !PORT_BY_ID[s.port])return initialState();
    // A voyage is saved as a complete route so a refresh can resume at sea.
    if(s.voyage && (!Array.isArray(s.voyage.path) || s.voyage.path.length<2 || s.voyage.path.some(p=>!Array.isArray(p)||p.length!==2||p.some(n=>!Number.isFinite(n))) || !Array.isArray(s.voyage.lengths) || s.voyage.lengths.length!==s.voyage.path.length-1 || s.voyage.lengths.some(n=>!Number.isFinite(n)||n<0) || (s.voyage.target!==null&&!PORT_BY_ID[s.voyage.target]) || !Number.isFinite(s.voyage.travelled) || s.voyage.travelled<0 || !Number.isFinite(s.voyage.total) || s.voyage.total<=0 || !Number.isFinite(s.voyage.foodRemaining)))return initialState();
    return {...initialState(),...s, speed:[1,2,4].includes(s.speed)?s.speed:1,missions:Array.isArray(s.missions)?s.missions:[],quiz:Array.isArray(s.quiz)?s.quiz:[],log:Array.isArray(s.log)?s.log.slice(0,50):[]};
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
  constructor(grid){this.w=grid.width;this.h=grid.height;this.step=grid.step;this.top=grid.top;this.mask=Uint8Array.from(atob(grid.land),c=>c.charCodeAt(0));}
  coord(i){return [i%this.w*this.step-180,this.top-Math.floor(i/this.w)*this.step];}
  cell([lon,lat]){const x=((Math.round((lon+180)/this.step)%this.w)+this.w)%this.w,y=Math.round((this.top-lat)/this.step);return y<0||y>=this.h?-1:y*this.w+x;}
  isLand(p){const i=this.cell(p);return i<0||!!this.mask[i];}
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
    while(anchor<path.length-1){let next=anchor+1;for(let j=anchor+2;j<Math.min(path.length,anchor+60);j++){if(!this.clear(path[anchor],path[j]))break;next=j;}smooth.push(path[next]);anchor=next;}
    if(distance(from,smooth[0])>0.1)smooth.unshift(from);
    if(distance(to,smooth.at(-1))>0.1)smooth.push(to);
    if(smooth.length===1)smooth.push(to);
    const lengths=smooth.slice(1).map((p,i)=>distance(smooth[i],p));
    return {path:smooth,lengths,total:lengths.reduce((a,b)=>a+b,0)};
  }
  clear(a,b){let dl=b[0]-a[0];if(dl>180)dl-=360;if(dl<-180)dl+=360;const steps=Math.ceil(Math.max(Math.abs(dl),Math.abs(b[1]-a[1]))/(this.step*.4));for(let i=0;i<=steps;i++){const t=i/Math.max(1,steps);if(this.isLand([a[0]+dl*t,a[1]+(b[1]-a[1])*t]))return false;}return true;}
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
