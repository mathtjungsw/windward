import {distance,helmToward} from './engine.js';

// The playable chart spans 80° N to 60° S. Its top and bottom join as a game rule.
export const MAP_NORTH=80,MAP_SOUTH=-60,MAP_LAT_SPAN=140;
export const wrapNumber=(n,size)=>((n%size)+size)%size;
export function wrapLatitude(lat){return lat>=MAP_SOUTH&&lat<=MAP_NORTH?lat:MAP_SOUTH+wrapNumber(lat-MAP_SOUTH,MAP_LAT_SPAN);}
export function wrapPosition([lon,lat]){return [wrapNumber(lon+180,360)-180,wrapLatitude(lat)];}
export function wrapCamera([x,y]){return [wrapNumber(x,1600),wrapNumber(y,800)];}
export function mapDistance(a,b){
  const normal=distance(a,b),dy=Math.abs(a[1]-b[1]);if(dy<=MAP_LAT_SPAN/2)return normal;
  const vertical=Math.abs(MAP_LAT_SPAN-dy)*60,dx=Math.abs(wrapNumber(b[0]-a[0]+180,360)-180)*60*Math.max(.1,Math.cos((Math.abs(a[1])+Math.abs(b[1]))/2*Math.PI/180));
  return Math.min(normal,Math.hypot(vertical,dx));
}
export function mapToward(from,target,miles){
  const virtual=[...target],dy=target[1]-from[1];if(dy>MAP_LAT_SPAN/2)virtual[1]-=MAP_LAT_SPAN;else if(dy<-MAP_LAT_SPAN/2)virtual[1]+=MAP_LAT_SPAN;
  return helmToward(from,virtual,miles);
}
export function wrappedMotion(from,rawNext){
  const position=wrapPosition(rawNext),miles=distance(from,rawNext);
  if(rawNext[1]>=MAP_SOUTH&&rawNext[1]<=MAP_NORTH)return {position,miles,legs:[[from,position]],wrapped:false};
  const north=rawNext[1]>MAP_NORTH,boundary=north?MAP_NORTH:MAP_SOUTH,t=(boundary-from[1])/(rawNext[1]-from[1]),dl=wrapNumber(rawNext[0]-from[0]+180,360)-180,lon=wrapPosition([from[0]+dl*t,0])[0];
  return {position,miles,legs:[[from,[lon,boundary]],[[lon,north?MAP_SOUTH:MAP_NORTH],position]],wrapped:true};
}
