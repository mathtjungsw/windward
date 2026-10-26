export const PRESENCE_TTL=90000;
export const PRESENCE_COLORS=['#267b93','#b36435','#6d65a0','#37816c','#a14868','#8a742c'];
export function captainName(value,fallback='바다의 선장'){
  const clean=String(value||'').normalize('NFKC').replace(/[<>\u0000-\u001f\u007f]/g,'').trim().slice(0,16);
  return clean||fallback;
}
export function validShip(value,now=Date.now()){
  return !!value&&typeof value.name==='string'&&value.name.length>0&&value.name.length<=16&&
    Number.isFinite(value.lon)&&value.lon>=-180&&value.lon<=180&&Number.isFinite(value.lat)&&value.lat>=-80&&value.lat<=80&&
    Number.isFinite(value.angle)&&Math.abs(value.angle)<=360&&Number.isInteger(value.color)&&value.color>=0&&value.color<6&&
    ['정박','항해','멈춤'].includes(value.status)&&Number.isFinite(value.updatedAt)&&value.updatedAt>now-PRESENCE_TTL&&value.updatedAt<now+30000;
}
export function interpolateShip(from,to,fraction){
  const t=Math.max(0,Math.min(1,fraction));
  const short=(n)=>((n+540)%360)-180;
  return {...to,lon:short(from.lon+short(to.lon-from.lon)*t),lat:from.lat+(to.lat-from.lat)*t,angle:from.angle+short(to.angle-from.angle)*t};
}
// Ten-degree sea sectors keep distant movement out of the live subscription.
export function seaSector([lon,lat]){return `${((Math.floor((lon+180)/10)%36)+36)%36}_${Math.max(0,Math.min(15,Math.floor((lat+80)/10)))}`;}
export function nearbySectors([lon,lat],radius=180){
  const latRange=radius/60+.3,lonRange=Math.min(180,latRange/Math.max(.1,Math.cos((Math.abs(lat)+latRange)*Math.PI/180))),result=new Set();
  for(let y=Math.floor((lat-latRange+80)/10);y<=Math.floor((lat+latRange+80)/10);y++)for(let x=Math.floor((lon-lonRange+180)/10);x<=Math.floor((lon+lonRange+180)/10);x++)if(y>=0&&y<16)result.add(`${((x%36)+36)%36}_${y}`);
  return [...result];
}
