// Live pages are bounded and confined to nearby sectors. A full first page must
// never make an older offline hull disappear permanently from that sector.
export function watchSectorPages(s,base,onShips,onError){
 let disposed=false;const pages=[];
 function trim(from){for(const p of pages.splice(from))p.stop?.();}
 function start(index,cursor){
  const page={ships:[],cursor,next:null,stop:null};pages[index]=page;
  const constraints=[s.orderByKey(),s.limitToFirst(100)];if(cursor)constraints.push(s.startAfter(cursor));
  page.stop=s.onValue(s.query(base,...constraints),snapshot=>{
   if(disposed||pages[index]!==page)return;const ships=[];snapshot.forEach(child=>ships.push([child.key,child.val()]));page.ships=ships;
   const next=ships.length===100?ships.at(-1)[0]:null;
   if(page.next!==next){page.next=next;trim(index+1);if(next)start(index+1,next);}
   onShips(pages.flatMap(p=>p.ships));
  },onError);
 }
 start(0,null);return ()=>{disposed=true;trim(0);};
}
