import {PLACE_REGIONS} from './place-regions.js?v=2026.11.13-canal-routes';
// Geographic coverage is simplified display data, never navigation or discovery.
export function placeRegionContains(regions,[lon,lat]){
 const inside=ring=>{let hit=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>lat)!==(b[1]>lat)&&lon<(b[0]-a[0])*(lat-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;};
 return (regions||[]).some(({bounds:b,rings})=>lon>=b[0]&&lon<=b[2]&&lat>=b[1]&&lat<=b[3]&&inside(rings[0])&&!rings.slice(1).some(inside));
}
// Reuse visible world anchors; fit nearby names inside the view and select
// another point in the same real region when its editorial label is far away.
export function layoutChartLabels(names,toScreen,{width,height,blocked=[],limit=width<=850?8:16,fromScreen,previous=new Map(),regions=PLACE_REGIONS}={}){
 const occupied=[...blocked],shown=[],pad=12,overlaps=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
 const ordered=names.map(label=>{const anchor=toScreen([label.lon,label.lat]),outside=anchor.x<0||anchor.x>width||anchor.y<0||anchor.y>height;return {label,anchor,rank:label.priority-(label.kind==='continent'&&outside?60:0)};}).sort((a,b)=>b.rank-a.rank||a.label.id.localeCompare(b.label.id));
 for(const {label,anchor}of ordered){
  const font=label.kind==='ocean'?16:14,w=label.name.length*font*1.08+20,h=font+14;if(w>width-2*pad||h>height-2*pad)continue;
  const coverage=regions[label.id],candidates=[anchor],old=previous.get(label.id),maxShift=['cape','strait'].includes(label.kind)?80:160;
  const belongs=p=>!!fromScreen&&placeRegionContains(coverage,fromScreen(p));
  if(old&&(belongs(old)||Math.hypot(old.x-anchor.x,old.y-anchor.y)<=maxShift))candidates.push(old);
  if(coverage&&fromScreen)for(const fy of [.22,.5,.78])for(const fx of [.25,.5,.75]){const p={x:width*fx,y:height*fy};if(belongs(p))candidates.push(p);}
  const fit={x:Math.max(pad+w/2,Math.min(width-pad-w/2,anchor.x)),y:Math.max(pad+h/2,Math.min(height-pad-h/2,anchor.y))};if(Math.hypot(fit.x-anchor.x,fit.y-anchor.y)<=maxShift)candidates.push(fit);
  for(const p of candidates){const box={x:p.x-w/2,y:p.y-h/2,w,h};if(box.x<pad||box.y<pad||box.x+w>width-pad||box.y+h>height-pad||occupied.some(r=>overlaps(r,box)))continue;occupied.push(box);shown.push({...label,font,screenPoint:p,box});break;}
  if(shown.length>=limit)break;
 }return shown;
}
