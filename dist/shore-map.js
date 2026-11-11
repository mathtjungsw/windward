export const SHORE_POINTS={
  boat:[.115,.65],
  harbor:[.272,.59],
  market:[.546,.63],
  site:[.78,.29],
  ridge:[.49,.255]
};
const ROUTES=[
  ['boat','harbor',[[.165,.647],[.227,.62]]],
  ['harbor','market',[[.338,.603],[.401,.672],[.471,.678]]],
  ['market','site',[[.624,.602],[.675,.533],[.706,.401],[.736,.338]]],
  ['market','ridge',[[.511,.537],[.495,.443],[.53,.374],[.494,.32]]],
  ['ridge','site',[[.573,.226],[.65,.206],[.721,.251]]],
  ['harbor','site',[[.348,.48],[.425,.367],[.54,.332],[.667,.297]]]
];
function trail(a,b){
  const direct=ROUTES.find(([from,to])=>from===a&&to===b);
  if(direct)return [SHORE_POINTS[a],...direct[2],SHORE_POINTS[b]];
  const reverse=ROUTES.find(([from,to])=>from===b&&to===a);
  return reverse?[SHORE_POINTS[a],...reverse[2].slice().reverse(),SHORE_POINTS[b]]:[SHORE_POINTS[a],SHORE_POINTS[b]];
}
export function shoreMapPosition(a,b,progress){
  if(!b||a===b)return SHORE_POINTS[a];
  const points=trail(a,b), segments=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],(p[1]-points[i][1])*.55));
  let left=segments.reduce((sum,length)=>sum+length,0)*Math.min(1,Math.max(0,progress));
  for(const [i,length] of segments.entries()){
    if(left<=length){const t=left/length;return [points[i][0]+t*(points[i+1][0]-points[i][0]),points[i][1]+t*(points[i+1][1]-points[i][1])];}
    left-=length;
  }
  return points.at(-1);
}

export const shoreDisplayPoint=([x,y],mirror=false)=>[mirror?1-x:x,y];
const THEMES={
  green:{soil:'#b5c69a',bank:'#e5d8aa',forest:'#a5ba8b',slope:'#a1b584',hill:'#9eb180',crest:'#abbc8e',leaf:'#68876e',leaf2:'#77936f'},
  dry:{soil:'#d6c095',bank:'#f1ddb2',forest:'#c4b789',slope:'#c1ac80',hill:'#bda477',crest:'#d6bd91',leaf:'#818569',leaf2:'#93916b'},
  tropical:{soil:'#a7c18c',bank:'#e5d6a4',forest:'#82a77e',slope:'#83a77a',hill:'#8faf7e',crest:'#a2bc8c',leaf:'#497d61',leaf2:'#668e65'}
};
export function drawShoreMap(canvas,edges,site){
  const ctx=canvas.getContext('2d');
  if(!ctx)return;
  const w=canvas.width,h=canvas.height, theme=THEMES[site.theme]||THEMES.green;
  ctx.setTransform(site.mirror?-1:1,0,0,1,site.mirror?w:0,0);
  const X=x=>x*w,Y=y=>y*h;
  function line(points,color,width=1){
    ctx.beginPath();
    for(const [i,[x,y]] of points.entries())ctx[i?'lineTo':'moveTo'](X(x),Y(y));
    ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();
  }
  function area(points,color){
    ctx.beginPath();
    for(const [i,[x,y]] of points.entries())ctx[i?'lineTo':'moveTo'](X(x),Y(y));
    ctx.closePath();ctx.fillStyle=color;ctx.fill();
  }
  function oval(x,y,rx,ry,color){
    ctx.beginPath();ctx.ellipse(X(x),Y(y),X(rx),Y(ry),0,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();
  }
  const coast=[[.17,0],[.13,.12],[.143,.215],[.20,.345],[.176,.437],[.235,.555],[.205,.657],[.245,.758],[.21,.875],[.23,1]];
  ctx.fillStyle='#9fcbd0';ctx.fillRect(0,0,w,h);
  for(let i=0;i<26;i++){
    const x=.018+(i*13%19)/130,y=.025+(i*17%41)/42;
    line([[x,y],[x+.023,y-.005],[x+.046,y]],i%2?'#8abcc4':'#bedde0',2);
  }
  area([...coast,[1,1],[1,0]],theme.bank);
  area([...coast.map(([x,y])=>[x+.019,y]),[1,1],[1,0]],theme.soil);
  area([[.26,.03],[.45,.04],[.67,.15],[.85,.08],[1,.0],[1,.44],[.91,.48],[.73,.40],[.51,.30],[.36,.29]],theme.forest);
  area([[.28,.82],[.42,.76],[.57,.84],[.76,.78],[1,.55],[1,1],[.28,1]],theme.forest);
  for(const [i,[x,y,rx,ry]] of [[.75,.16,.19,.12],[.70,.13,.13,.08],[.84,.36,.18,.10],[.88,.61,.14,.13],[.43,.38,.09,.077]].entries()){
    oval(x,y,rx,ry,i%2?theme.slope:theme.hill);
    oval(x,y-.013,rx*.85,ry*.73,theme.crest);
  }
  area([[.38,.61],[.48,.55],[.53,.57],[.5,.68],[.44,.72],[.36,.68]],'#c8c78c');
  for(let i=0;i<5;i++)line([[.378+i*.023,.666-i*.007],[.418+i*.021,.703-i*.012]],'#adab75',2);
  for(let i=0;i<36;i++){
    const x=.32+(i*29%67)/100,y=.035+(i*17%91)/100;
    if((x>.36&&x<.64&&y>.55&&y<.71)||(x>.66&&x<.82&&y>.22&&y<.55))continue;
    line([[x,y],[x,y+.04]],'#8e8666',2);
    area([[x,y-.027],[x+.012,y+.018],[x-.014,y+.018]],i%2?theme.leaf:theme.leaf2);
  }
  line(trail('boat','harbor'),'#8d6c4d',18);
  line(trail('boat','harbor'),'#c4a780',12);
  for(const {a,b,pass,shortcut} of edges){
    const points=trail(a,b);
    line(points,'#958665',11);
    line(points,pass||shortcut?'#f4df9c':'#e6d2a4',7);
  }
  area([[.46,.238],[.475,.201],[.486,.232]],'#817d66');
  area([[.487,.239],[.503,.187],[.522,.241]],'#92896d');
  function house(x,y,scale,roof='#a27451'){
    const d=.021*scale,h=.04*scale;
    area([[x-d,y],[x+d,y],[x+d,y+h],[x-d,y+h]],'#f0dfb1');
    area([[x-d*1.24,y],[x,y-h*.8],[x+d*1.24,y]],roof);
    area([[x-d*.23,y+h],[x-d*.23,y+h*.35],[x+d*.23,y+h*.35],[x+d*.23,y+h]],'#867250');
  }
  house(.257,.53,.8);
  house(.539,.55,1.1);house(.583,.524,.83,'#b38a61');house(.502,.532,.68);
  house(.777,.221,1.15,'#88826a');
}
