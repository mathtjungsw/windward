// Retain foreground elapsed time while bounding work per frame. Pause/hidden
// transitions discard pending time so they never become offline sailing.
export class SimulationClock{
 constructor(){this.reset();}
 reset(now=null){this.last=now;this.pending=0;this.wasActive=false;}
 steps(now,active){const elapsed=this.last===null?0:Math.max(0,(now-this.last)/1000);this.last=now;if(!active){this.pending=0;this.wasActive=false;return [];}if(!this.wasActive){this.wasActive=true;return [];}this.pending+=elapsed;const out=[];while(this.pending>1e-8&&out.length<20){const dt=Math.min(.1,this.pending);out.push(dt);this.pending=Math.max(0,this.pending-dt);}return out;}
}
