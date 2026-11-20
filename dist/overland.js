// The display and collision checks share one row-indexed physical map.
export const GROUND=['바다','육지','강','산등성이','호수'];
export class FieldTerrain{
 constructor(buffer){
  const header=new DataView(buffer);
  if(header.getUint32(0)!==0x57574c31)throw Error('육상 지형 파일을 읽지 못했어요.');
  this.width=header.getUint16(4,true);this.height=header.getUint16(6,true);
  this.rows=new Uint32Array(buffer,8,this.height+1);
  this.ends=new Uint16Array(buffer,8+this.rows.byteLength);
 }
 cell([lon,lat]){return [Math.floor((lon+180)*this.width/360),Math.floor((90-lat)*this.height/180)];}
 geo([x,y]){return [(x+.5)*360/this.width-180,90-(y+.5)*180/this.height];}
 kind(x,y){
  if(y<0||y>=this.height||x<0||x>=this.width)return 0;
  let a=this.rows[y],b=this.rows[y+1];
  while(a<b){const m=(a+b)>>>1;if((this.ends[m]>>>3)<=x)a=m+1;else b=m;}
  return this.ends[a]&7;
 }
 landing(point,radius){
  const [x,y]=this.cell(point);let best=null,score=Infinity;
  for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
   const d=dx*dx+dy*dy;
   if(d<=radius*radius&&d<score&&this.kind(x+dx,y+dy)===1){best=[x+dx,y+dy];score=d;}
  }
  return best;
 }
 barrier([x,y],dx,dy){
  const next=this.kind(x+dx,y+dy);if(next!==1)return GROUND[next];
  if(dx&&dy)for(const kind of [this.kind(x+dx,y),this.kind(x,y+dy)])if(kind!==1)return GROUND[kind];
  return '';
 }
 clear(a,b){
  const n=Math.max(Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]));let prev=a;
  for(let i=1;i<=n;i++){const p=a.map((v,k)=>Math.round(v+(b[k]-v)*i/n));
   if(this.barrier(prev,p[0]-prev[0],p[1]-prev[1]))return false;prev=p;}
  return true;
 }
}
export const fieldDistance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
export function startField(game,terrain,point,port){
 if(game.inland?.field)return game.inland.field;
 if(game.voyage||game.shoreTrip||game.seaJob||game.inland?.visit)throw Error('진행 중인 이동을 마친 뒤 상륙해 주세요.');
 const origin=terrain.landing(point,port?10:3);if(!origin)throw Error('가까운 해안으로 접근하거나 항구에 정박해 주세요.');
 game.inland??={tier:0,warehouses:{}};return game.inland.field={origin,cell:[...origin],port:port||null};
}
export function moveField(field,terrain,dx,dy){
 if(!field||![dx,dy].every(v=>Number.isInteger(v)&&Math.abs(v)<=1))return '이동 방향을 확인해 주세요.';
 const blocked=terrain.barrier(field.cell,dx,dy);
 if(!blocked)field.cell=[field.cell[0]+dx,field.cell[1]+dy];return blocked;
}
export function fieldNear(field,terrain,point,radius){
 return !!field&&!!point&&fieldDistance(field.cell,point)<=radius&&terrain.clear(field.cell,point);
}
export function returnField(game,terrain){
 const field=game.inland?.field;if(!fieldNear(field,terrain,field?.origin,1.5))throw Error('깃발로 표시된 상륙 지점까지 걸어오세요.');
 delete game.inland.field;
}
export function validFieldRecord(data){
 const cell=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isInteger)&&p[0]>=0&&p[0]<7200&&p[1]>=0&&p[1]<3600;
 const f=data.field;return !f||(cell(f.cell)&&cell(f.origin)&&(f.port===null||typeof f.port==='string')&&!data.visit);
}
