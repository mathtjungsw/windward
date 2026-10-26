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
