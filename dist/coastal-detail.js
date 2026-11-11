const WORLD={west:-180,east:180,north:80,south:-60,step:.025};
const wrapLon=lon=>((lon+180)%360+360)%360-180;
const within=([lon,lat],bounds)=>lon>=bounds.west&&lon<=bounds.east&&lat>=bounds.south&&lat<=bounds.north;
function upperBound(values,x){
  let low=0,high=values.length;
  while(low<high){const mid=(low+high)>>1;if(values[mid]<=x)low=mid+1;else high=mid;}
  return low;
}
const landAt=(row,lon)=>(upperBound(row,lon)&1)!==0;

// Index the same polygons as the visible chart, including the additional islands.
// Each row keeps only water/land boundaries and requires no new network asset.
export class CoastalDetail{
  constructor(features,bounds=WORLD){
    const {north:NORTH,south:SOUTH,step:STEP}=bounds,ROWS=Math.round((NORTH-SOUTH)/STEP);
    this.bounds=bounds;this.refinements=[];
    this.rowFor=lat=>Math.max(0,Math.min(ROWS,Math.round((NORTH-lat)/STEP)));
    const rows=Array.from({length:ROWS+1},()=>[]);
    for(const {geometry} of features){
      if(!geometry)continue;
      const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.type==='MultiPolygon'?geometry.coordinates:[];
      for(const rings of polygons){
        const polygonRows=new Map();
        for(const ring of rings){
          for(let i=1;i<ring.length;i++){
            const [ax,ay]=ring[i-1],[bx,by]=ring[i];
            if(ay===by||Math.max(ay,by)<=SOUTH||Math.min(ay,by)>NORTH)continue;
            const start=Math.max(0,Math.floor((NORTH-Math.max(ay,by))/STEP)+1);
            const end=Math.min(ROWS,Math.floor((NORTH-Math.min(ay,by))/STEP));
            for(let j=start;j<=end;j++){
              const y=NORTH-j*STEP;
              const cross=ax+(bx-ax)*(y-ay)/(by-ay);
              const xs=polygonRows.get(j);
              if(xs)xs.push(cross);
              else polygonRows.set(j,[cross]);
            }
          }
        }
        for(const [i,xs] of polygonRows){
          xs.sort((a,b)=>a-b);
          for(let j=1;j<xs.length;j+=2)if(xs[j]>xs[j-1])rows[i].push([xs[j-1],xs[j]]);
        }
      }
    }
    this.rows=rows.map(ranges=>{
      ranges.sort((a,b)=>a[0]-b[0]);
      const merged=[];
      for(const [a,b] of ranges){
        if(merged.length&&a<=merged.at(-1))merged[merged.length-1]=Math.max(b,merged.at(-1));
        else merged.push(a,b);
      }
      return Float64Array.from(merged);
    });
  }

  refine(features,bounds){
    this.refinements.push(new CoastalDetail(features,bounds));
    return this;
  }

  isLand([lon,lat]){
    const p=[wrapLon(lon),lat], local=this.refinements.find(detail=>within(p,detail.bounds));
    if(local)return local.isLand(p);
    const {north:NORTH,south:SOUTH}=this.bounds;
    return lat<NORTH+.000001&&lat>SOUTH-.000001?landAt(this.rows[this.rowFor(lat)],p[0]):true;
  }

  clear(a,b){
    const local=this.refinements.find(detail=>within(a,detail.bounds)&&within(b,detail.bounds));
    if(local)return local.clear(a,b);
    const {north:NORTH,south:SOUTH,step:STEP}=this.bounds;
    if(Math.max(a[1],b[1])>NORTH+.000001||Math.min(a[1],b[1])<SOUTH-.000001)return false;
    const x=wrapLon(a[0]),dx=wrapLon(b[0]-a[0]),dy=b[1]-a[1];
    const first=this.rowFor(a[1]),last=this.rowFor(b[1]);
    for(let i=Math.min(first,last);i<=Math.max(first,last);i++){
      let t0=0,t1=1;
      if(dy){
        const y=NORTH-i*STEP;
        const u=(y-STEP/2-a[1])/dy,v=(y+STEP/2-a[1])/dy;
        t0=Math.max(0,Math.min(u,v));
        t1=Math.min(1,Math.max(u,v));
        if(t0>t1)continue;
      }
      const x0=x+dx*t0,x1=x+dx*t1,lo=Math.min(x0,x1),hi=Math.max(x0,x1),row=this.rows[i];
      const blocked=(left,right)=>{
        const at=upperBound(row,left);
        return (at&1)!==0||(at<row.length&&row[at]<=right);
      };
      if(lo<-180){
        if(blocked(lo+360,Math.min(180,hi+360))||(hi>=-180&&blocked(-180,hi)))return false;
      }else if(hi>=180){
        if((lo<180&&blocked(lo,180))||blocked(Math.max(-180,lo-360),hi-360))return false;
      }else if(blocked(lo,hi))return false;
    }
    return true;
  }

  coastWithin([lon,lat],radius){
    if(this.isLand([lon,lat]))return 0;
    const {north:NORTH,step:STEP}=this.bounds, ROWS=this.rows.length-1;
    const i=this.rowFor(lat),x=wrapLon(lon),ratio=60*Math.max(.1,Math.cos(lat*Math.PI/180));
    let best=radius;
    for(let j=Math.max(0,i-Math.ceil(radius/(60*STEP)));j<=Math.min(ROWS,i+Math.ceil(radius/(60*STEP)));j++){
      const vertical=Math.abs(NORTH-j*STEP-lat)*60;
      if(vertical>=best)continue;
      const row=this.rows[j];
      if(!row.length)continue;
      const k=upperBound(row,x);
      if(k&1){best=vertical;continue;}
      const horizontal=Math.min(Math.abs(wrapLon(x-row[k%row.length])),Math.abs(wrapLon(x-row[(k+row.length-1)%row.length])))*ratio;
      best=Math.min(best,Math.hypot(horizontal,vertical));
    }
    return best<radius?best:Infinity;
  }
}
