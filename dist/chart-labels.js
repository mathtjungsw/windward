// Screen-space decluttering; labels never reveal ports or add exploration.
export function layoutChartLabels(names,toScreen,{width,height,blocked=[],limit=width<=850?8:16}={}){
 const occupied=[...blocked],shown=[];const overlaps=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
 for(const label of [...names].sort((a,b)=>b.priority-a.priority||a.id.localeCompare(b.id))){const p=toScreen([label.lon,label.lat]),font=label.kind==='ocean'?15:12,w=label.name.length*font+14,h=font+12,box={x:p.x-w/2,y:p.y-h/2,w,h};if(box.x<4||box.y<4||box.x+w>width-4||box.y+h>height-4||occupied.some(r=>overlaps(r,box)))continue;occupied.push(box);shown.push({...label,font});if(shown.length>=limit)break;}return shown;
}
