const GLOBE_RAD=Math.PI/180;
const globeLongitude=lon=>((lon+540)%360)-180;

// Orthographic projection, including the hidden hemisphere test.
export function globeProject(point,center){
  const lat=point[1]*GLOBE_RAD,lon=(point[0]-center[0])*GLOBE_RAD,c=center[1]*GLOBE_RAD;
  return {x:Math.cos(lat)*Math.sin(lon),y:Math.cos(c)*Math.sin(lat)-Math.sin(c)*Math.cos(lat)*Math.cos(lon),z:Math.sin(c)*Math.sin(lat)+Math.cos(c)*Math.cos(lat)*Math.cos(lon)};
}
export function globeUnproject(x,y,center){
  const squared=x*x+y*y;if(squared>1)return null;
  const z=Math.sqrt(Math.max(0,1-squared)),c=center[1]*GLOBE_RAD;
  return [globeLongitude(center[0]+Math.atan2(x,z*Math.cos(c)-y*Math.sin(c))/GLOBE_RAD),Math.asin(Math.max(-1,Math.min(1,y*Math.cos(c)+z*Math.sin(c))))/GLOBE_RAD];
}

export class GlobeAtlas{
  constructor(canvas,land,rivers,ports,onLook){
    this.canvas=canvas;this.ctx=canvas.getContext('2d');this.canvas.width=240;this.canvas.height=240;
    this.size=240;this.radius=108;this.center=[0,20];this.follow=true;this.ports=ports;this.onLook=onLook;this.lastDraw=0;this.drag=null;
    this.texture=this.makeTexture(land,rivers);this.image=this.ctx.createImageData(240,240);this.pixels=[];
    for(let y=0;y<240;y++)for(let x=0;x<240;x++){const nx=(x-120)/this.radius,ny=(120-y)/this.radius,z2=1-nx*nx-ny*ny;if(z2>=0)this.pixels.push({offset:(y*240+x)*4,x:nx,y:ny,z:Math.sqrt(z2)});}
    canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;this.follow=false;this.drag={x:e.clientX,y:e.clientY,center:[...this.center],moved:false};canvas.setPointerCapture(e.pointerId);});
    canvas.addEventListener('pointermove',e=>{if(!this.drag)return;const d=this.drag,r=canvas.getBoundingClientRect(),dx=e.clientX-d.x,dy=e.clientY-d.y;if(Math.hypot(dx,dy)>4)d.moved=true;
      if(d.moved){this.center=[globeLongitude(d.center[0]-dx*200/r.width),Math.max(-75,Math.min(75,d.center[1]+dy*140/r.height))];this.draw(true);}
    });
    canvas.addEventListener('pointerup',e=>{if(!this.drag)return;const moved=this.drag.moved;this.drag=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
      if(!moved){const r=canvas.getBoundingClientRect(),x=((e.clientX-r.left)/r.width*240-120)/this.radius,y=(120-(e.clientY-r.top)/r.height*240)/this.radius,p=globeUnproject(x,y,this.center);if(p)this.onLook(p);}
    });
    canvas.addEventListener('pointercancel',()=>this.drag=null);
    canvas.addEventListener('keydown',e=>{const deltas={ArrowLeft:[-20,0],ArrowRight:[20,0],ArrowUp:[0,15],ArrowDown:[0,-15]};if(deltas[e.key]){e.preventDefault();e.stopPropagation();this.follow=false;const d=deltas[e.key];this.center=[globeLongitude(this.center[0]+d[0]),Math.max(-75,Math.min(75,this.center[1]+d[1]))];this.draw(true);}else if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();this.home();}});
  }
  makeTexture(land,rivers){
    const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=800;const ctx=canvas.getContext('2d');
    ctx.fillStyle='#b6dbe4';ctx.fillRect(0,0,1600,800);
    const p=([lon,lat])=>[(lon+180)/360*1600,(90-lat)/180*800];
    ctx.fillStyle='#e7dbaf';ctx.strokeStyle='#b6ab7d';ctx.lineWidth=.7;
    for(const feature of land.features){const g=feature.geometry,polygons=g.type==='Polygon'?[g.coordinates]:g.coordinates;for(const rings of polygons){ctx.beginPath();for(const ring of rings){ring.forEach((q,i)=>{const a=p(q);if(i)ctx.lineTo(...a);else ctx.moveTo(...a);});ctx.closePath();}ctx.fill('evenodd');ctx.stroke();}}
    ctx.strokeStyle='#7aafb8';ctx.lineWidth=1.5;for(const r of rivers){ctx.beginPath();r.path.forEach((q,i)=>{const a=p(q);if(i)ctx.lineTo(...a);else ctx.moveTo(...a);});ctx.stroke();}
    ctx.strokeStyle='#4c8b993d';ctx.lineWidth=.7;for(let lon=-180;lon<=180;lon+=30){const x=p([lon,0])[0];ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,800);ctx.stroke();}for(let lat=-60;lat<=60;lat+=30){const y=p([0,lat])[1];ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(1600,y);ctx.stroke();}
    return ctx.getImageData(0,0,1600,800).data;
  }
  home(){this.follow=true;if(this.state){this.center=[this.state.position[0],Math.max(-60,Math.min(60,this.state.position[1]*.6))];this.draw(true);}}
  update(state,viewport,route,force=false){this.state=state;this.viewport=viewport;this.route=route;if(this.follow&&!this.drag)this.center=[state.position[0],Math.max(-60,Math.min(60,state.position[1]*.6))];this.draw(force);}
  draw(force=false){
    if(!this.state)return;const now=performance.now();if(!force&&now-this.lastDraw<90)return;this.lastDraw=now;
    const angle=this.center[1]*GLOBE_RAD,co=Math.cos(angle),si=Math.sin(angle),data=this.image.data,tex=this.texture;
    for(const p of this.pixels){const lat=Math.asin(Math.max(-1,Math.min(1,p.y*co+p.z*si))),lon=globeLongitude(this.center[0]+Math.atan2(p.x,p.z*co-p.y*si)/GLOBE_RAD),x=Math.max(0,Math.min(1599,Math.floor((lon+180)/360*1600))),y=Math.max(0,Math.min(799,Math.floor((90-lat/GLOBE_RAD)/180*800))),i=(y*1600+x)*4,shade=.78+.19*p.z+.05*(p.y-p.x);
      const visibility=this.exploration?.visibility([lon,lat/GLOBE_RAD],this.state.position)??2;
      if(visibility===0){data[p.offset]=43*shade;data[p.offset+1]=69*shade;data[p.offset+2]=83*shade;}
      else if(visibility===1){const gray=(tex[i]+tex[i+1]+tex[i+2])/3;data[p.offset]=(gray*.45+110)*shade;data[p.offset+1]=(gray*.45+117)*shade;data[p.offset+2]=(gray*.45+120)*shade;}
      else{data[p.offset]=Math.min(255,tex[i]*shade);data[p.offset+1]=Math.min(255,tex[i+1]*shade);data[p.offset+2]=Math.min(255,tex[i+2]*shade);}data[p.offset+3]=255;
    }
    const ctx=this.ctx;ctx.clearRect(0,0,240,240);ctx.putImageData(this.image,0,0);
    ctx.save();ctx.beginPath();ctx.arc(120,120,this.radius,0,Math.PI*2);ctx.clip();
    this.line(this.route||[],'#8b5929',1.1);
    this.line(this.viewport||[],'#ae5a31',1.5);
    const visited=new Set(this.state.visited);for(const p of this.ports){if(!this.state.knownPorts?.includes(p.id))continue;const v=globeProject([p.lon,p.lat],this.center);if(v.z<.05)continue;ctx.fillStyle=visited.has(p.id)?'#26704e':'#827038';ctx.beginPath();ctx.arc(120+v.x*this.radius,120-v.y*this.radius,visited.has(p.id)?1.7:1.2,0,Math.PI*2);ctx.fill();}
    for(const peer of this.peers||[]){const v=globeProject([peer.lon,peer.lat],this.center);if(v.z<0)continue;ctx.beginPath();ctx.arc(120+v.x*this.radius,120-v.y*this.radius,3.2,0,Math.PI*2);ctx.fillStyle=peer.fill;ctx.fill();ctx.strokeStyle='#fffcef';ctx.lineWidth=1;ctx.stroke();}
    const ship=globeProject(this.state.position,this.center);if(ship.z>=0){const x=120+ship.x*this.radius,y=120-ship.y*this.radius;ctx.beginPath();ctx.arc(x,y,4.2,0,Math.PI*2);ctx.fillStyle='#1b5a74';ctx.fill();ctx.strokeStyle='#fffef3';ctx.lineWidth=2;ctx.stroke();}
    const glow=ctx.createRadialGradient(78,67,0,92,88,135);glow.addColorStop(0,'#ffffff28');glow.addColorStop(.6,'#ffffff00');glow.addColorStop(1,'#174c6515');ctx.fillStyle=glow;ctx.fillRect(0,0,240,240);ctx.restore();
    ctx.beginPath();ctx.arc(120,120,this.radius+.7,0,Math.PI*2);ctx.strokeStyle='#6a99ab';ctx.lineWidth=1.5;ctx.stroke();
  }
  line(points,color,width){
    if(points.length<2)return;const ctx=this.ctx;ctx.beginPath();let pen=false,prev=null;
    const add=p=>{const v=globeProject(p,this.center);if(v.z<0){pen=false;return;}const x=120+v.x*this.radius,y=120-v.y*this.radius;if(pen)ctx.lineTo(x,y);else ctx.moveTo(x,y);pen=true;};
    for(const point of points){if(prev){let dx=point[0]-prev[0];if(dx>180)dx-=360;if(dx<-180)dx+=360;const n=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(point[1]-prev[1]))/2));for(let i=1;i<=n;i++)add([prev[0]+dx*i/n,prev[1]+(point[1]-prev[1])*i/n]);}else add(point);prev=point;}
    ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
  }
}
