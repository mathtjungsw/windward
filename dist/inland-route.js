import {Heap} from './navigation-heap.js?v=2026.11.21-inland-discovery-hubs';

const CARDINAL=1000,DIAGONAL=1414;
const steps=[
 [1,0,CARDINAL],[-1,0,CARDINAL],[0,1,CARDINAL],[0,-1,CARDINAL],
 [1,1,DIAGONAL],[1,-1,DIAGONAL],[-1,1,DIAGONAL],[-1,-1,DIAGONAL]
];
const componentsByTerrain=new WeakMap();

// The same barrier rules apply to manual travel and planned routes.
// Cardinal connectivity is enough because diagonals cannot cut a corner.
function groundComponents(terrain){
 let groups=componentsByTerrain.get(terrain);
 if(groups)return groups;
 const {rows,ends,height}=terrain;
 const parents=Int32Array.from(ends,(_,i)=>i);
 const root=id=>{
  while(parents[id]!==id){parents[id]=parents[parents[id]];id=parents[id];}
  return id;
 };
 for(let y=1;y<height;y++){
  let upper=rows[y-1],lower=rows[y],upperStart=0,lowerStart=0;
  while(upper<rows[y]&&lower<rows[y+1]){
   const top=ends[upper],bottom=ends[lower],upperEnd=top>>>3,lowerEnd=bottom>>>3;
   if((top&7)===1&&(bottom&7)===1&&Math.max(upperStart,lowerStart)<Math.min(upperEnd,lowerEnd)){
    parents[root(upper)]=root(lower);
   }
   if(upperEnd<=lowerEnd){upperStart=upperEnd;upper++;}
   if(lowerEnd<=upperEnd){lowerStart=lowerEnd;lower++;}
  }
 }
 groups=([x,y])=>{
  let left=rows[y],right=rows[y+1];
  while(left<right){
   const mid=(left+right)>>>1;
   if((ends[mid]>>>3)<=x)left=mid+1;else right=mid;
  }
  return root(left);
 };
 componentsByTerrain.set(terrain,groups);
 return groups;
}

function straightRoute(terrain,start,destination){
 const dx=destination[0]-start[0],dy=destination[1]-start[1];
 const count=Math.max(Math.abs(dx),Math.abs(dy)),path=[];
 let previous=start;
 for(let n=1;n<=count;n++){
  const next=[start[0]+Math.round(dx*n/count),start[1]+Math.round(dy*n/count)];
  if(terrain.barrier(previous,next[0]-previous[0],next[1]-previous[1]))return null;
  path.push(next);
  previous=next;
 }
 return path;
}

export async function shortestInlandRoute(terrain,start,destination,signal){
 if(signal?.aborted||terrain.kind(...start)!==1||terrain.kind(...destination)!==1)return null;
 const direct=straightRoute(terrain,start,destination);
 if(direct)return direct;
 const component=groundComponents(terrain);
 if(component(start)!==component(destination))return null;

 const width=terrain.width,queue=new Heap(),visited=new Map();
 const cellKey=([x,y])=>y*width+x;
 const unpack=id=>[id%width,Math.floor(id/width)];
 const distanceToGoal=(x,y)=>{
  const dx=Math.abs(x-destination[0]),dy=Math.abs(y-destination[1]),diagonals=Math.min(dx,dy);
  return diagonals*DIAGONAL+Math.abs(dx-dy)*CARDINAL;
 };
 const first=cellKey(start),last=cellKey(destination);
 visited.set(first,{cost:0,parent:first,done:false});
 queue.push(first,distanceToGoal(...start));
 let sinceYield=performance.now(),iterations=0;
 while(queue.size){
  if((iterations++&255)===0&&performance.now()-sinceYield>=8){
   await new Promise(resolve=>setTimeout(resolve,0));
   if(signal?.aborted)return null;
   sinceYield=performance.now();
  }
  const id=queue.pop(),current=visited.get(id);
  if(current.done)continue;
  if(id===last){
   const route=[];
   for(let next=last;next!==first;next=visited.get(next).parent)route.push(unpack(next));
   return route.reverse();
  }
  current.done=true;
  const cell=unpack(id);
  for(const [dx,dy,stepCost] of steps){
   if(terrain.barrier(cell,dx,dy))continue;
   const x=cell[0]+dx,y=cell[1]+dy,next=y*width+x;
   const cost=current.cost+stepCost,previous=visited.get(next);
   if(previous&&previous.cost<=cost)continue;
   visited.set(next,{cost,parent:id,done:false});
   queue.push(next,cost+distanceToGoal(x,y));
  }
 }
 return null;
}
