import {historicalGlyph} from './historical-ship-art.js?v=2026.11.12-collections-ranks-historic-ships.2';
import {DISCOVERIES,DISCOVERY_BY_ID} from './discoveries-catalog.js?v=2026.11.12-collections-ranks-historic-ships.2';
// Original vector illustrations for Windward. No external images or runtime requests.
export const SHIP_ART_NAMES=Object.freeze(['통나무 뗏목','돛 달린 뗏목','보강 뗏목','소형 노젓는 배','소형 교역 돛배','단돛 교역선','연안 교역선','개량 연안선','쌍돛 연안선','항해 캐러벨','개량 캐러벨','대형 캐러벨','소형 카락','교역 카락','대형 카락','원양 교역선','교역 갤리온','대형 갤리온','원양 대형 범선','명장의 교역 범선']);
export const DISCOVERY_ART_IDS=Object.freeze(DISCOVERIES.map(d=>d.id));

const P={ink:'#244e57',wood:'#9b7047',woodLight:'#c59c65',woodDark:'#654a36',paper:'#fff5da',gold:'#c39a49',water:'#a8d5d6',sea:'#6daeb7',sky:'#e8f4ef',sand:'#e9d8ae',stone:'#aeaa91',green:'#789976'};
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const tierIndex=t=>Math.min(19,Math.max(0,Math.floor(Number(t)||0)));
const path=(d,fill=P.ink,stroke=P.ink,extra='')=>`<path d="${d}" fill="${fill}" stroke="${stroke}" ${/\bstroke-width\s*=/.test(extra)?'':'stroke-width="3"'} stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
const line=(x1,y1,x2,y2,color=P.ink,w=3,extra='')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${w}" stroke-linecap="round" ${extra}/>`;
const circle=(x,y,r,fill,stroke=P.ink,w=3)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${w}"/>`;
const rect=(x,y,w,h,fill,stroke=P.ink,r=3,extra='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="3" ${extra}/>`;
const wave=(y,width=500,x=70,color=P.sea)=>path(`M${x} ${y}q30-10 60 0t60 0t60 0t60 0t60 0t60 0t60 0t60 0`,'none',color,`opacity=".48" transform="translate(${(500-width)/2} 0) scale(${width/500} 1)"`);
const svg=(id,title,body)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" role="img" aria-labelledby="${id}-title"><title id="${id}-title">${esc(title)}</title>${body}</svg>`;
function setting(id,kind='sea'){
  // Solid washes export consistently in browsers and document/JPG rasterizers.
  let base=rect(0,0,640,480,'#edf5ed','none',18)+path('M0 194Q138 161 276 188T640 176V310H0Z','#f5f5e6','none');
  if(kind==='sea'||kind==='coast')base+=path('M0 315Q135 289 266 314T640 308V480H0Z',P.water,'none')+wave(365)+wave(400,430)+wave(430,520);
  if(kind==='coast')base+=path('M0 302Q120 260 200 320T400 345Q520 320 640 360V480H0Z',P.sand,'none')+path('M0 303Q100 276 205 324T410 344','none','#c3b985');
  return base;
}

function crate(x,y,s=1){return `<g transform="translate(${x} ${y}) scale(${s})">`+rect(-22,-20,44,37,P.woodLight,P.woodDark)+line(-20,-18,20,15,P.woodDark,2)+line(20,-18,-20,15,P.woodDark,2)+line(-5,-18,-5,16,P.woodDark,3)+'</g>';}
function barrel(x,y,s=1){return `<g transform="translate(${x} ${y}) scale(${s})">`+path('M-16-24Q-24 0-16 25Q0 31 16 25Q24 0 16-24Z',P.woodLight,P.woodDark)+path('M-18-14Q0-9 18-14M-19 12Q0 17 19 12','none',P.woodDark)+path('M-15-24Q0-30 15-24M0-25V26','none',P.woodDark)+'</g>';}
function raftBody(t){
  let body='';const n=t===2?8:6;
  for(let i=0;i<n;i++){const x=175+i*34;body+=`<g transform="translate(${x} 300) rotate(13)">`+rect(-13,-26,26,108,i%2?P.wood:P.woodLight,P.woodDark,12)+circle(0,80,11,P.woodDark,P.woodDark,1)+circle(0,80,6,P.woodLight,P.woodLight,1)+line(-6,-18,-6,66,'#d9b476',2)+'</g>';}
  body+=path('M164 318L410 372M171 343L418 395','none','#e6c792','stroke-width="8"')+line(160,316,413,372,P.woodDark,2)+line(169,341,419,396,P.woodDark,2);
  if(t===2)body+=path('M180 285V260L398 309V337M180 275L398 325','none',P.woodDark,'stroke-width="6"');
  body+=crate(269,292,.8)+barrel(322,292,.7)+`<g transform="rotate(30 337 365)">`+line(337,302,337,415,P.woodDark,7)+path('M326 395Q310 423 329 438Q343 443 349 425L345 395Z',P.woodLight,P.woodDark)+'</g>';
  if(t>0){body+=line(320,170,320,321,P.woodDark,7)+line(232,187,408,191,P.woodDark,6)+path(t===1?'M240 192Q315 223 400 194L385 285Q309 259 246 273Z':'M237 185Q321 211 408 190L392 288Q319 262 241 281Z',P.paper,'#aa9870')+line(320,172,208,315,'#a58b62',2)+line(320,172,421,365,'#a58b62',2);}
  return body;
}
function shipBody(t){
  if(t<3)return raftBody(t);
  const size=1+(t-3)*.017,high=t>=12?17:0;
  let hull=path(`M130 309Q304 342 500 300L${461+t} ${359+high}Q312 ${416+high} 172 ${354+high}Z`,t<6?P.wood:P.woodDark,P.woodDark);
  hull+=path(`M145 323Q315 355 486 315M161 340Q310 373 473 335M183 358Q310 386 454 353`,'none',P.woodLight,'stroke-width="4"');
  hull+=path('M126 307Q310 335 502 299','none',P.gold,'stroke-width="8"');
  if(t===3){for(let i=0;i<5;i++)hull+=line(207+i*43,331,177+i*43,389,P.woodLight,6);hull+=crate(360,303,.8)+barrel(275,308,.7);return hull;}
  if(t>=6)hull+=path(`M${446-t} ${306-high}V${270-high}L500 ${266-high}V302Z`,P.wood,P.woodDark)+line(444-t,278-high,499,275-high,P.gold,3);
  if(t>=12)hull+=path('M134 309V278L204 286V322',P.wood,P.woodDark)+line(138,288,201,295,P.gold,3);
  if(t>=9)for(let i=0;i<Math.min(8,t-4);i++)hull+=circle(214+i*29,345+(i%2)*2,5,'#e9c379',P.woodDark,2);
  if(t>=14)hull+=path('M184 341Q320 376 465 326','none',P.gold,'stroke-width="3"');
  const mastCount=t<8?1:t===8?2:t<15?3:4;
  const xs=mastCount===1?[320]:mastCount===2?[260,390]:mastCount===3?[219,331,427]:[203,287,372,445];
  xs.forEach((x,i)=>{
    const middle=i===Math.floor((mastCount-1)/2),top=middle?89-(t%3)*7:113+i*11;
    hull+=line(x,top,x,326,P.woodDark,6)+line(x,top,148,310,'#9d8e6d',1.7)+line(x,top,493,303,'#9d8e6d',1.7);
    if(t<8){hull+=path(`M${x-6} ${top+9}L${x-99} 278L${x-6} 285Z`,P.paper,'#9e8d69')+path(`M${x+8} ${top+48}Q${x+70} 235 ${x+92} 283L${x+8} 283Z`,'#f2e3bd','#9e8d69');if(t>=5)hull+=path(`M${x+3} ${top}q30 8 52 0v24q-26-10-52-2Z`,P.ink,P.ink);}
    else{
      const half=mastCount<4?58:43;
      hull+=line(x-half-6,top+21,x+half+6,top+21,P.woodDark,4)+path(`M${x-half} ${top+27}Q${x} ${top+50} ${x+half} ${top+27}L${x+half-5} ${top+101}Q${x} ${top+83} ${x-half+4} ${top+103}Z`,P.paper,'#aa9870');
      hull+=line(x-half-12,top+111,x+half+12,top+111,P.woodDark,4)+path(`M${x-half-7} ${top+116}Q${x} ${top+138} ${x+half+7} ${top+116}L${x+half} ${top+186}Q${x} ${top+170} ${x-half-3} ${top+190}Z`,i%2?'#f6e8c8':P.paper,'#aa9870');
      if(t>=10&&middle)hull+=path(`M${x-29} ${top-11}Q${x} ${top+1} ${x+29} ${top-11}L${x+25} ${top+17}Q${x} ${top+10} ${x-25} ${top+19}Z`,P.paper,'#aa9870');
      if(middle)hull+=path(`M${x+3} ${top-19}q23-12 52 0l-10 13q-25-10-42-1Z`,t>=16?P.gold:P.ink,P.ink,'stroke-width="2"');
    }
  });
  if(t>=7)hull+=line(493,302,546,265,P.woodDark,5)+path('M480 217L537 266L468 285Z',P.paper,'#aa9870');
  if(t>=17)hull+=path('M490 194L560 264L491 250Z','#f8edcf','#aa9870')+line(490,193,561,267,'#9e8d69',2);
  if(t===19)hull+=`<g transform="translate(330 225)">`+path('M0-18L14-7L11 13L0 22L-11 13L-14-7Z',P.ink,P.gold)+path('M0-10L3-2L11 0L4 5L5 14L0 9L-5 14L-4 5L-11 0L-3-2Z',P.gold,P.gold,'stroke-width="1"')+'</g>';
  return `<g transform="translate(${320-size*320} ${320-size*320}) scale(${size})">${hull}</g>`;
}

export function shipArt(tier){const t=tierIndex(tier);return svg('ship-'+t,SHIP_ART_NAMES[t],setting('ship-'+t)+path('M110 392Q290 366 531 391L519 408Q305 432 128 410Z','#e5f5ed','none')+shipBody(t)+wave(418,520)+wave(446,430));}
export function shipArtPath(tier){return `assets/ships/ship-${String(tierIndex(tier)+1).padStart(2,'0')}.svg`;}
export function discoveryArt(id){return `assets/discoveries/${DISCOVERY_ART_IDS.includes(id)?id:'unknown'}.svg`;}
export function collectionArt(id,detail=false){
 const discovery=DISCOVERY_ART_IDS.includes(id);
 if(!discovery&&!/^I0(0[1-9]|[1-5][0-9]|6[0-4])$/.test(id))return 'assets/discoveries/unknown.svg';
 return `assets/${discovery?'discovery-photos':'collection'}/${id}-${detail?'detail':'thumb'}.webp`;
}
export function shipGlyph(tier,color=P.ink,kind){
  const t=tierIndex(tier),ink=/^#[\da-f]{3,8}$/i.test(color)?color:P.ink;
  if(kind){const historical=historicalGlyph(kind,ink);if(historical)return historical;}
  if(t<3){let g='';for(let i=0;i<5+(t===2?1:0);i++)g+=`<rect x="${-13+i*5}" y="-2" width="5" height="20" rx="2" fill="#b68c56" stroke="#654a36" stroke-width="1"/>`;g+=`<path d="M-14 3H15M-14 12H15" stroke="#ead5a5" stroke-width="2"/><path d="M-14 19L13-5" stroke="#654a36" stroke-width="2"/>`;if(t>0)g+=`<path d="M0-23V5" stroke="#654a36" stroke-width="2"/><path d="M-1-21L-13-2H-1Z" fill="#fff5da" stroke="${ink}" stroke-width=".7"/>`;return `<g>${g}</g>`;}
  const beam=+(14+t*.22).toFixed(2),depth=+(16+t*.14).toFixed(2);
  let g=`<path d="M${-beam} 7L${beam} 7L10 ${depth}H-10Z" fill="${t>=12?'#795839':'#aa8051'}" stroke="#493d28" stroke-width="1.3"/><path d="M${-beam+2} 10H${beam-2}" stroke="#d9bc83" stroke-width="1"/>`;
  if(t===3)return `<g>${g}<path d="M-10 8L-18 18M-3 9L-10 20M5 9L-1 20M12 8L7 19" stroke="#cba76e" stroke-width="2"/></g>`;
  const n=t<8?1:t===8?2:t<15?3:4;
  for(let i=0;i<n;i++){const x=n===1?0:-11+i*22/(n-1),top=-22+(i%2)*4,w=n===1?13:n===2?8:6;g+=`<path d="M${x} ${top}V9" stroke="#654a36" stroke-width="1.5"/><path d="M${x-1} ${top+2}L${x-w} 3H${x-1}Z" fill="#fffdf0" stroke="${ink}" stroke-width=".55"/>`;if(t>=8)g+=`<path d="M${x+1} ${top+7}H${x+w}L${x+w-1} 3H${x+1}Z" fill="#eee1bb" stroke="${ink}" stroke-width=".5"/>`;}
  if(t>=5)g+=`<path d="M0-23L9-21L0-18Z" fill="${ink}"/>`;if(t>=16)g+=`<path d="M-9 13H10" stroke="#e2b95e" stroke-width="2"/>`;return `<g>${g}</g>`;
}

const palm=(x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})">${path('M0 0Q-9-53 6-113','none',P.wood, 'stroke-width="10"')}${path('M6-112Q-40-147-65-101Q-31-120 6-112Q34-145 67-108Q35-119 6-112Q42-109 49-75Q29-96 6-112Q-23-105-35-74Q-35-107 6-112',P.green,'#587b62','stroke-width="2"')}</g>`;
function blockWall(x,y,w,h,fill=P.stone){let s=rect(x,y,w,h,fill,'#7c826e',2);for(let k=1;k<Math.floor(h/25);k++){s+=line(x,y+k*25,x+w,y+k*25,'#848a76',2);for(let j=0;j<Math.floor(w/40);j++)s+=line(x+20+(j*40)+(k%2)*15,y+(k-1)*25,x+20+(j*40)+(k%2)*15,y+k*25,'#848a76',1.5);}return s;}
function arch(x,y,w=60,h=100){return path(`M${x} ${y+h}V${y+w/2}a${w/2} ${w/2} 0 0 1 ${w} 0V${y+h}Z`,'#78968d','#717b6a');}
function ruinScene(id){
  let b=setting(id,'coast');
  if(id==='ruin-azores'){
    b+=path('M40 345L80 268L235 233L350 280L463 330Z',P.green,'#6e8669')+blockWall(100,230,280,105,'#b3a386');
    for(let i=0;i<7;i++)b+=rect(102+i*43,212,24,30,'#b3a386','#7c826e',1);
    b+=blockWall(340,173,75,162,'#b3a386')+rect(340,153,18,30,'#b3a386','#7c826e',1)+rect(397,153,18,30,'#b3a386','#7c826e',1)+arch(194,268,54,68)+path('M82 351Q187 328 330 349','none','#f8ebc8');
  }else if(id==='ruin-carthage'){
    b+=path('M66 354Q230 312 520 347L580 411H38Z',P.sand,'none');
    for(let i=0;i<5;i++){const x=134+i*76,y=169+(i%2)*28;b+=rect(x-12,y,25,166-(i%2)*28,'#dfcbaa','#9a927b',2)+rect(x-23,y-13,47,17,'#e5d4b4','#9a927b',2)+rect(x-22,333,45,15,'#dfcbaa','#9a927b',2)+line(x-4,y+8,x-4,326,'#b9aa8e',2);}
    b+=path('M99 157L462 179L452 194L97 175Z','#d5bea0','#9a927b')+path('M73 361L247 385L223 405L67 382Z','#cfb89a','#9a927b')+circle(493,373,23,'#cfb89a','#9a927b');
  }else if(id==='ruin-kilwa'){
    b+=palm(509,332,.85)+palm(91,350,.65)+blockWall(145,206,328,136,'#dad7bb')+arch(174,246,60,97)+arch(277,231,76,113)+arch(382,253,57,89)+path('M262 207Q310 120 358 207Z','#d5d4b5','#8b927b')+blockWall(166,164,41,60,'#dcdabd')+path('M158 165L187 139L215 165Z','#d5d4b5','#8b927b')+path('M133 345Q304 367 485 343','none','#789976');
  }else if(id==='ruin-mahabalipuram'){
    b+=path('M87 374Q312 330 552 375L562 407H72Z','#d8bd90','none');
    for(let i=0;i<5;i++){const y=169+i*34,w=64+i*33;b+=rect(331-w/2,y,w,31,'#c8ad7d','#8b805f',1)+path(`M${331-w/2-8} ${y+30}H${331+w/2+8}`,'none','#8b805f');}
    b+=path('M310 167L331 137L353 167Z','#c8ad7d','#8b805f')+circle(331,127,7,P.gold,'#8b805f')+rect(286,294,90,76,'#b99a6a','#8b805f',0)+rect(313,320,32,50,'#6a7764','#8b805f',2)+blockWall(155,282,99,85,'#c8ad7d')+path('M146 282L205 226L263 282Z','#c8ad7d','#8b805f')+wave(425,450);
  }else if(id==='ruin-anse'){
    b+=path('M0 310Q180 218 310 274Q485 207 640 302V480H0Z','#91a47b','none')+path('M131 308L243 235L373 253L492 326L480 364L126 349Z','#7a8161','#546955')+path('M123 310L237 229L362 250L255 324Z','#9aa275','#546955')+path('M255 324L362 250L492 326L484 365L255 365Z','#a8ad7c','#546955')+rect(304,315,51,55,P.woodDark,'#536252',1)+path('M311 316L330 295L350 316Z',P.woodDark,'#536252')+line(138,332,236,345,'#73866b',7)+path('M420 371Q452 392 481 375M68 366Q95 373 114 359','none','#dce1c3','stroke-width="5"');
  }else if(id==='ruin-rapanui'){
    b+=path('M0 342Q152 283 341 335Q464 253 640 308V480H0Z','#8ba77a','none');
    for(const [x,y,s]of [[167,323,.69],[328,368,1.1],[476,306,.72]])b+=`<g transform="translate(${x} ${y}) scale(${s})">`+path('M-39 0L-34-67L-29-96L-36-121L-34-191Q-12-209 27-195L38-150L31-69L41-1Z','#918d78','#666f61')+path('M-28-175L16-181L16-135L30-117L11-108L6-75L-19-78M-26-150H-13M11-150H24','none','#626a5f','stroke-width="6"')+path('M-13-58L18-59M-20-41L21-42','none','#626a5f','stroke-width="5"')+path('M-53 0H54L70 20H-63Z','#7a806a','#626a5f')+'</g>';
  }else if(id==='ruin-nanmadol'){
    b=setting(id)+path('M0 287Q130 247 251 288T640 276V321H0Z','#7c9b7d','none');
    for(let row=0;row<5;row++)for(let col=0;col<6;col++){const x=93+col*68+(row%2)*19,y=176+row*33;b+=rect(x,y,86,29,row%2?'#6e8076':'#7e8c7d','#4f6864',6);}
    b+=path('M295 329V256Q324 216 354 255V329Z','#3c6260','#4f6864')+path('M78 343L261 331L274 386L86 403Z','#799184','#4f6864')+path('M390 340L555 326L578 376L402 392Z','#799184','#4f6864')+palm(549,277,.65)+wave(421,480);
  }
  return b;
}

function relicScene(id){
  let b=setting(id,'coast');
  b+=path('M127 377Q323 346 527 376L496 397Q295 420 147 396Z','#cfb98e','none');
  if(id==='relic-compass'){
    b+=`<g transform="translate(320 265) rotate(-15)">`+circle(0,0,111,P.gold,'#8c6c37',5)+circle(0,0,93,P.paper,'#8c6c37',3)+circle(0,0,78,'#f1e5bd','#a08856',1)+path('M0-77L14-12L0 68L-13 12Z',P.ink,P.ink)+path('M0 68L-13 12L0 0Z','#c1714e','#8c6c37')+line(-71,0,72,0,'#a08856',2)+circle(0,0,9,P.gold,'#8c6c37')+circle(0,-125,19,'none','#8c6c37',8)+`<text y="-50" text-anchor="middle" font-family="serif" font-size="22" fill="${P.ink}">N</text>`+'</g>';
  }else if(id==='relic-chart'){
    b+=path('M158 163L229 177L250 153L317 170L362 150L452 174L465 341L411 356L354 339L315 361L260 345L191 363L169 326Z','#f5e5bd','#a88d5b')+path('M195 214Q239 185 273 231T340 243L387 205L423 235M209 282L253 303L283 277L315 301L352 286','none','#799582','stroke-width="5"')+path('M226 238L401 303','none','#a77e53','stroke-dasharray="8 10"')+circle(370,294,11,'none','#a77e53')+line(364,288,377,301,'#a77e53',3)+line(377,288,364,301,'#a77e53',3)+`<g transform="translate(429 188) scale(.6)">`+path('M0-30L8-8L30 0L8 8L0 30L-8 8L-30 0L-8-8Z',P.ink,P.ink)+'</g>';
  }else if(id==='relic-astrolabe'){
    b+=circle(320,260,119,'#ccab62','#866a3b',6)+circle(320,260,98,'#f5e6bd','#866a3b',3)+circle(320,260,81,'#e5cb8d','#a18750',1)+path('M225 260H415M320 165V355','none','#866a3b')+path('M246 304L391 215','none','#866a3b','stroke-width="12"')+circle(320,260,13,P.gold,'#866a3b')+circle(320,121,22,'none','#866a3b',9);
    for(let i=0;i<24;i++){const a=i*Math.PI/12;b+=line(320+Math.sin(a)*105,260+Math.cos(a)*105,320+Math.sin(a)*112,260+Math.cos(a)*112,'#866a3b',2);}
  }else if(id==='relic-amphora'){
    b+=path('M272 160Q261 208 248 226Q210 262 245 335Q271 371 280 384H358Q376 349 389 319Q416 262 382 230Q368 217 365 160Z','#bd865c','#7d5b44')+path('M268 164Q316 176 368 164L369 145Q315 137 269 145Z','#cf9a6b','#7d5b44')+path('M263 194Q204 176 205 223Q207 273 244 276M371 194Q426 175 430 221Q430 269 395 275','none','#7d5b44','stroke-width="13"')+path('M246 278Q320 299 398 278M259 324Q319 342 383 324','none','#704c3a','stroke-width="7"')+path('M285 196Q272 243 273 280','none','#e3b788','stroke-width="6"');
  }else if(id==='relic-seal'){
    b+=path('M240 190L379 176L405 326L266 350Z','#9d8863','#655e49')+path('M256 204L364 193L388 310L278 332Z','#d8bc78','#655e49')+path('M279 233L312 217L345 228L360 261L344 300L311 308L287 286Z','none','#655e49','stroke-width="7"')+path('M306 240L332 239L337 265L319 284L302 268ZM290 214L297 218M355 303L366 300','none','#655e49','stroke-width="5"')+path('M402 354L456 349L466 379L414 390Z','#ae8063','#7d5b44');
  }else if(id==='relic-bell'){
    b+=path('M227 332Q263 291 262 230Q260 185 315 180Q369 179 374 228Q375 290 413 328Z','#a58c55','#6d6848')+path('M219 331Q314 350 419 329L418 351Q316 379 220 352Z','#cab27b','#6d6848')+circle(316,172,19,'none','#6d6848',9)+path('M314 317V366','none','#6d6848','stroke-width="10"')+circle(314,370,14,'#887248','#6d6848')+path('M278 211Q265 260 253 303M348 206Q369 253 379 301','none','#d6c18c','stroke-width="6"')+path('M248 295L273 278M353 238L366 249','none','#6b977e','stroke-width="6"');
  }else if(id==='relic-carving'){
    b+=path('M167 275L204 223L337 194L467 230L451 296L331 332L202 321Z','#a6794d','#684e39')+path('M197 266L319 233L435 254M211 290L327 266L422 282','none','#d2a872','stroke-width="5"')+path('M268 239L290 271L314 234L339 270L363 231L390 264','none','#654a36','stroke-width="7"')+circle(232,271,9,'none','#654a36')+circle(403,268,9,'none','#654a36')+path('M182 264L198 256M443 266L457 252','none','#654a36');
  }else if(id==='relic-pendant'){
    b+=path('M206 149Q165 232 240 304Q263 324 277 333M431 151Q480 245 399 306L367 334','none','#7d6e49','stroke-width="8"')+path('M272 291Q319 269 369 292L389 348L338 399L284 368Z','#789b83','#426e67')+circle(315,310,8,'none','#426e67')+path('M293 337L320 321L349 342L329 369L307 357Z','none','#d4dcb2','stroke-width="6"')+line(330,286,348,300,'#d4dcb2',5)+palm(510,349,.5);
  }
  return b;
}

function animalScene(id){
  let b=setting(id,['animal-whaleshark','animal-hector','animal-otter'].includes(id)?'sea':'coast');
  if(id==='animal-penguin-africa'||id==='animal-penguin-nz'){
    const nz=id.endsWith('-nz');b+=path('M110 383Q264 333 522 382L562 420H89Z','#a4a994','none')+path('M245 361Q222 278 260 213Q252 159 294 141Q343 128 363 167Q379 194 354 222Q402 310 366 365Z','#3e5253','#31474b')+path('M274 219Q310 193 343 224Q375 288 346 353H274Q244 294 274 219Z','#f3f1dd','#31474b')+path('M257 240Q206 263 213 326L258 291M360 244Q412 272 408 322L367 291','#435c5c','#31474b')+path('M285 172L328 162L326 181L294 190Z','#eeeece','#31474b')+path('M350 181L383 193L349 201Z',nz?'#c89b65':'#b29265','#31474b')+circle(335,177,5,nz?'#dbbb4f':'#e6d9bb','#31474b',2)+path('M268 360L247 377L293 377M335 360L320 379L370 379Z','#a59168','#31474b');
    if(nz)b+=path('M278 160Q310 139 344 157','none','#d1bb51','stroke-width="6"');else b+=path('M280 244Q316 271 351 244','none','#3e5253','stroke-width="9"')+circle(292,289,3,'#31474b','#31474b',1)+circle(325,310,3,'#31474b','#31474b',1);
  }else if(id==='animal-seal-med'||id==='animal-seal-hawaii'){
    const h=id.endsWith('hawaii');b+=path('M119 349Q207 296 276 317Q315 257 413 286Q476 299 490 345Q464 387 335 382Q229 394 178 365L123 382L142 357Z',h?'#a4a28e':'#899a94','#5d756f')+path('M279 334Q305 356 316 390L272 373Z','#748b82','#5d756f')+path('M418 302Q427 325 464 326','none','#d6d7bf','stroke-width="9"')+circle(451,302,5,'#304e51','#304e51')+path('M468 327L500 322M467 332L501 339M465 335L490 351','none','#435f60','stroke-width="2"')+path('M390 344Q424 359 471 345','none','#c8cbb4','stroke-width="5"');if(h)b+=palm(91,318,.8)+path('M522 355L536 345L549 357L539 371Z','#d6ac71','#a58d64');
  }else if(id==='animal-otter'){
    b+=path('M142 339Q196 277 292 295Q326 245 400 251Q455 254 454 303Q461 350 358 373Q273 411 182 366L121 374Z','#7e7261','#525e56')+path('M211 314Q268 291 343 313L372 346Q295 386 217 354Z','#c3bba1','#525e56')+circle(405,279,38,'#a99e83','#525e56')+circle(379,250,11,'#7e7261','#525e56')+circle(429,250,10,'#7e7261','#525e56')+circle(393,274,4,P.ink,P.ink)+circle(422,273,4,P.ink,P.ink)+path('M402 288L411 288L407 295Z',P.ink,P.ink)+path('M405 299L385 299M411 299L431 299','none',P.ink,'stroke-width="2"')+circle(300,323,25,'#b49c7a','#6e715e')+path('M264 325L279 310M332 313L344 328','none','#7e7261','stroke-width="16"')+path('M179 374Q146 429 100 413M511 334Q482 390 506 436','none','#779877','stroke-width="7"')+wave(417,520);
  }else if(id==='animal-whaleshark'){
    b+=path('M118 279Q214 199 374 235L464 276L516 230L504 287L534 325L473 308L427 327Q279 370 157 318L110 310Z','#527d81','#365f64')+path('M247 236L308 177L318 235M280 321L312 370L338 322Z','#527d81','#365f64')+path('M124 306Q286 354 431 311','none','#c5ddcf','stroke-width="11"')+circle(145,281,5,'#203e46','#203e46')+path('M126 298L177 302M194 266L190 304M207 261L204 308','none','#365f64');
    for(let row=0;row<4;row++)for(let col=0;col<11;col++)b+=circle(175+col*22,251+row*17+(col%3)*3,2.5,'#f2edd2','#f2edd2',0);
  }else if(id==='animal-iguana'){
    b+=path('M91 373L155 303L284 318L354 294L528 353L568 402H94Z','#89968a','#5c756d')+path('M138 343Q167 313 238 315Q266 280 333 281Q362 244 400 267L423 292L390 315Q371 348 313 342Q274 361 233 345Q184 356 138 343Z','#65796a','#3b5c58')+path('M240 321Q203 283 166 302Q123 318 87 345Q152 298 222 332','none','#3b5c58','stroke-width="13"')+path('M314 324L292 360L317 375L328 369M359 317L384 350L411 349M280 326L268 348L246 351','none','#3b5c58','stroke-width="10"')+path('M212 312L225 294L240 306L254 285L266 296L282 275L297 286L313 266L328 280L342 263L351 278','#b3ad72','#3b5c58','stroke-width="2"')+circle(388,282,5,'#d9be62','#3b5c58',2)+path('M402 303L421 302','none','#3b5c58')+path('M325 294L337 307M299 302L309 319M266 315L277 330','none','#8e9a76','stroke-width="3"');
  }else if(id==='animal-hector'){
    b+=path('M132 316Q195 251 268 257Q289 216 309 235L325 255Q388 251 439 287L486 278L460 301L501 322L454 327Q373 352 319 333L278 355L271 326Q190 335 132 316Z','#adbdb8','#3d6468')+path('M265 258Q280 207 309 235L324 255Z','#465e61','#3d6468')+path('M183 311Q300 347 434 305','none','#ececda','stroke-width="11"')+circle(418,290,4,P.ink,P.ink)+path('M437 302L451 305M273 325L290 348','none','#3d6468','stroke-width="3"')+path('M154 344Q133 358 107 353M487 349Q507 361 534 351','none','#e8f3e9','stroke-width="5"');
  }
  return b;
}

function treasureScene(id){
  let b=setting(id,id==='treasure-azores'||id==='treasure-pacific'?'sea':'coast');
  if(id==='treasure-gulf'){
    b+=path('M208 350Q181 287 231 238L250 211L356 209L378 245Q436 305 398 355Q313 405 208 350Z','#bda47a','#806e4e')+path('M248 228L235 187Q302 210 363 184L350 226Z','#cfb990','#806e4e')+path('M243 231Q300 255 363 226','none','#806e4e','stroke-width="8"');
    for(const[x,y,r]of [[253,329,31],[314,352,31],[372,325,28],[288,300,28],[337,294,25]])b+=circle(x,y,r,'#d6b55b','#907b40')+circle(x,y,r-8,'none','#a58b46',2)+path(`M${x-6} ${y-8}L${x+6} ${y+8}M${x+6} ${y-8}L${x-6} ${y+8}`,'none','#a58b46','stroke-width="2"');
  }else if(id==='treasure-atacama'){
    b+=path('M0 307L167 193L235 248L382 149L640 317V359H0Z','#c7ab7b','none')+path('M148 315L264 273L344 307L468 266L503 364L389 401L294 369L189 405Z','#f2dfad','#9a7e54')+path('M236 333L414 330','none','#ac7652','stroke-dasharray="8 10"')+path('M393 309L431 348M432 309L392 348','none','#a95d44','stroke-width="8"')+circle(260,333,20,'none','#ac7652')+path('M68 386L112 357L146 383L119 402Z','#b49c78','#927a56');
  }else if(id==='treasure-pacific'){
    b+=path('M67 341Q196 291 310 339Q405 296 563 345L603 411H52Z','#8eb8a2','#6e9e8e')+path('M226 289L345 273L409 317L290 339Z','#6c8d86','#3c6968')+path('M227 288V361L290 401L291 339Z','#557b78','#3c6968')+path('M290 339L409 317V382L290 401Z','#6c8d86','#3c6968')+path('M312 318L320 299L331 311L350 300L348 320L367 325L349 334L351 353L332 344L320 358L317 340L298 334Z','#e4c66e','#8d814d')+path('M319 245L329 218L338 244L365 251L338 259L330 287L320 260L292 252Z','#f6dfa0','#b69d58')+circle(199,253,7,'#f6dfa0','#b69d58',1)+circle(410,234,6,'#f6dfa0','#b69d58',1);
  }else{
    const variants={azores:[P.woodDark,P.gold],madagascar:['#c99471','#ddd5b4'],malacca:['#527e79','#c7ac64'],namib:['#827862','#ba9b5f'],andaman:['#596e84','#b6ccd0']};
    const key=id.replace('treasure-',''),[fill,trim]=variants[key]||variants.azores;
    b+=path('M193 259L345 231L438 276L286 307Z',fill,P.woodDark)+path('M193 259V359L286 408V307Z',fill,P.woodDark)+path('M286 307L438 276V375L286 408Z',fill,P.woodDark)+path('M191 259Q189 186 253 180L346 199Q399 215 439 276L287 306Z',fill,P.woodDark)+path('M216 229Q225 192 254 191L339 210Q370 217 395 254','none',trim,'stroke-width="7"')+path('M220 275V369M398 291V385','none',trim,'stroke-width="12"')+rect(308,296,27,43,trim,P.woodDark,3)+circle(321,315,4,P.woodDark,P.woodDark,1);
    if(key==='madagascar'){for(let i=0;i<9;i++)b+=circle(257+i*17,268+Math.sin(i*.55)*15,8,'#fff3da','#c7bca0',1);b+=palm(513,318,.7)+path('M150 386L168 369L183 385L168 401Z','#d5a37a','#a78261');}
    else if(key==='andaman')b+=path('M293 233L319 218L344 237L328 269L306 260Z','#63a3b8','#3e7286')+path('M319 218L321 243L344 237M293 233L321 243L306 260','none','#b3e1df','stroke-width="2"')+palm(504,333,.75);
    else if(key==='malacca')b+=path('M357 337Q388 318 416 333Q389 346 357 337','none',P.gold,'stroke-width="4"')+path('M92 379Q120 347 137 382M497 379Q525 330 548 378','none','#709a7e','stroke-width="6"');
    else if(key==='namib')b+=path('M82 329L140 286L159 366L119 384Z',P.wood,P.woodDark)+path('M94 328L143 352M130 304L145 361','none',P.woodDark)+path('M489 338L545 289L562 381L521 397Z',P.wood,P.woodDark)+line(509,341,548,373,P.woodDark,4);
    else b+=path('M157 358Q144 412 172 430M476 344Q449 392 475 431','none','#729b83','stroke-width="8"')+circle(481,211,7,'none','#e1f1e5',2)+circle(458,183,5,'none','#e1f1e5',2);
  }
  return b;
}

const DISCOVERY_TITLES={'ruin-azores':'아소르스 옛 요새','ruin-carthage':'카르타고 유산','ruin-kilwa':'킬와 유적','ruin-mahabalipuram':'마하발리푸람 해안 사원','ruin-anse':'랑스오메도 정착지','ruin-rapanui':'라파누이의 모아이','ruin-nanmadol':'난마돌 수로 유적','relic-compass':'오래된 나침반','relic-chart':'표류 해도 조각','relic-astrolabe':'황동 항해 도구','relic-amphora':'에게해 도기','relic-seal':'문양 인장','relic-bell':'난파선의 종','relic-carving':'조각된 목편','relic-pendant':'돌 펜던트','animal-penguin-africa':'남아프리카 펭귄','animal-seal-med':'지중해 몽크물범','animal-otter':'알래스카 해달','animal-whaleshark':'고래상어','animal-iguana':'바다이구아나','animal-hector':'헥터돌고래','animal-seal-hawaii':'하와이몽크물범','animal-penguin-nz':'노란눈펭귄','treasure-azores':'잠긴 상자','treasure-gulf':'동전 주머니','treasure-madagascar':'진주함','treasure-malacca':'옛 금고','treasure-namib':'난파선의 상자','treasure-atacama':'숨겨진 보물지도','treasure-andaman':'푸른 보석함','treasure-pacific':'별빛 상자'};
Object.assign(DISCOVERY_TITLES,{'relic-alaska-token':'옛 항해자의 금속 패','relic-pacific-chart':'북태평양 해도 조각','relic-amazon-weight':'강 상인의 저울추','relic-andean-pottery':'표류 도기의 문양','relic-timor-tool':'티모르해 항해 도구','relic-micronesia-marker':'먼바다 항로 표식','ruin-sganggwaay':'스강과이 해안 유산','ruin-fortjesus':'몸바사 포트지저스'});
function expandedDiscoveryScene(id){
  let b=setting(id,'coast');
  if(id==='relic-alaska-token')return b+circle(320,260,110,P.gold,P.woodDark,5)+circle(320,260,91,P.paper,'#ac8b4d',3)+path('M254 282L389 282L370 310H275Z',P.wood,P.woodDark)+line(320,195,320,282,P.woodDark,5)+path('M313 203L270 268H313Z',P.paper,P.ink)+circle(320,127,19,'none',P.gold,9);
  if(id==='relic-pacific-chart')return b+path('M155 150L267 166L304 146L475 164L462 359L365 338L281 362L165 344Z',P.paper,'#a38b5e')+path('M189 206L246 242L272 204L329 235L364 193L433 218M201 292L256 310L299 274L367 301L433 271','none',P.green,'stroke-width="6"')+path('M205 250Q320 172 421 317','none',P.ink,'stroke-dasharray="8 10"')+circle(420,318,12,'none',P.gold,4);
  if(id==='relic-amazon-weight')return b+path('M229 343L248 218Q320 189 393 218L411 343Q321 373 229 343Z',P.gold,P.woodDark)+circle(320,193,42,'none',P.woodDark,13)+line(268,292,375,292,P.woodDark,4)+line(320,243,320,315,P.woodDark,4)+path('M268 292L254 319H285ZM375 292L361 319H390Z',P.paper,P.woodDark);
  if(id==='relic-andean-pottery')return b+path('M225 163L356 153L419 215L385 340L300 369L216 310L239 252L204 220Z','#c09064',P.woodDark)+path('M237 209L267 185L297 209L327 185L358 210L389 191M233 292L270 267L308 295L346 268L389 293','none',P.paper,'stroke-width="9"')+path('M298 161L283 224L310 256L295 363','none',P.woodDark,'stroke-width="4"');
  if(id==='relic-timor-tool')return b+circle(320,245,110,'none',P.gold,18)+circle(320,245,83,'none',P.woodDark,3)+path('M246 316L394 174','none',P.woodDark,'stroke-width="9"')+line(320,134,320,356,P.gold,7)+line(208,245,432,245,P.gold,7)+circle(320,245,12,P.paper,P.woodDark)+circle(320,109,20,'none',P.gold,9);
  if(id==='relic-micronesia-marker')return b+path('M175 337Q235 299 264 191Q304 167 335 205Q364 300 448 340L404 365L329 294L253 366Z',P.woodLight,P.woodDark)+path('M266 203Q328 166 382 222Q414 264 383 306Q347 330 308 301Q276 277 298 247Q320 224 342 247Q352 268 331 277','none','#d4bd8a','stroke-width="12"')+circle(422,340,29,P.paper,P.woodDark)+path('M410 326L432 349M431 326L410 348','none',P.ink,'stroke-width="4"');
  if(id==='ruin-sganggwaay'){
    b+=path('M0 310Q300 231 640 307V480H0Z','#8ca58a','none')+path('M158 281L290 219L430 282V366H158Z',P.wood,P.woodDark)+path('M139 282L290 206L450 282Z','#6f806b',P.woodDark)+rect(267,302,47,64,P.woodDark,P.woodDark);
    for(const [x,h]of [[115,160],[466,200],[514,133]])b+=rect(x,355-h,22,h,'#b49772',P.woodDark,4)+line(x+4,365-h,x+17,365-h,P.woodDark,3);
    return b;
  }
  if(id==='ruin-fortjesus')return b+blockWall(138,223,358,132,'#cfb98d')+blockWall(98,204,88,155,'#c8ac7f')+blockWall(452,195,83,162,'#c8ac7f')+path('M98 204L141 176L186 204M452 195L495 166L535 195',P.sand,P.woodDark)+arch(282,268,65,87)+path('M87 377L185 353L449 354L554 376L521 402H118Z','#b9ab87',P.woodDark);
  return null;
}
function newDiscoveryScene(entry){
  const {id,art,kind}=entry;
  const shore=setting(id,kind==='ruin'?'coast':'sea');
  if(art==='stairs'){
    const house=path('M210 337L226 255Q279 193 324 255L343 337Z','#cbbd9d',P.woodDark)+arch(260,276,36,61);
    const steps=Array.from({length:7},(_,i)=>rect(170+i*25,372-i*7,57,9,'#8c8876',P.woodDark)).join('');
    return shore+path('M54 380L182 312L248 178L438 249L549 380Z','#8b9b88',P.ink)+house+steps+wave(415,413);
  }
  if(art==='arches'){
    return shore+blockWall(120,224,405,136,'#ceb68e')+arch(155,240,75,117)+arch(278,240,75,117)+arch(403,240,75,117)+palm(530,341,.67)+wave(225,407);
  }
  if(art==='walls'){
    return shore+blockWall(124,249,400,106,'#c8a977')+blockWall(109,213,83,146,'#baa07b')+blockWall(449,204,81,153,'#baa07b')+arch(291,269,56,84)+path('M94 369Q296 341 550 374L520 391H103Z',P.sand,P.woodDark)+wave(180,415);
  }
  if(art==='whale'||art==='orca'||art==='manatee'||art==='dugong'){
    const shade={whale:'#617d83',orca:'#273e4b',manatee:'#8c9e91',dugong:'#798f84'}[art];
    const animal=path('M129 289Q149 236 233 241Q350 197 446 256L493 250Q516 211 546 221Q541 259 506 277L544 300Q516 326 481 294L442 291Q361 358 211 335Q144 330 129 289Z',shade,P.ink);
    const fin=path('M283 309Q327 330 286 366Q257 353 259 329Z',shade,P.ink)+circle(174,280,5,P.ink);
    const markings=art==='orca'?path('M284 231Q296 160 332 153Q322 191 347 224Z',shade,P.ink)+path('M191 264Q222 247 245 263L217 275Z',P.paper,'none')+path('M191 320Q319 331 415 285L442 291Q351 350 204 333Z',P.paper,'none'):art==='whale'?path('M165 226Q156 190 141 178M174 225Q179 185 197 177','none','#dbf2ed','stroke-width="6"'):path('M148 307Q177 321 205 308','none',P.ink,'stroke-width="3"');
    return shore+animal+fin+markings+wave(176,391);
  }
  if(art==='turtle'){
    return shore+path('M268 231Q218 157 166 182Q180 243 245 269M369 243Q427 157 480 187Q465 245 403 276M255 303Q204 313 206 350Q261 357 284 320M379 305Q441 313 434 348Q393 359 360 322','#779e83',P.ink)+circle(319,192,30,'#a1af82',P.ink)+path('M240 258Q244 196 320 194Q396 198 404 258Q401 329 320 345Q245 330 240 258Z','#628f79',P.ink)+path('M320 207L365 244L348 297H290L273 244ZM320 207V194M365 244L398 234M348 297L364 326M290 297L273 327M273 244L246 234','none','#bfd3a0','stroke-width="7"');
  }
  if(art==='penguin'){
    return shore+path('M135 376Q270 332 513 372L562 410H100Z','#8a9a89',P.ink)+path('M266 344Q242 314 256 264Q258 214 295 204Q342 195 367 240Q395 283 380 345Q328 383 266 344Z','#2f4d53',P.ink)+path('M288 348Q268 290 306 254Q354 246 363 331L351 352Q317 365 288 348Z',P.paper,P.ink)+path('M270 234L227 249L267 260Z',P.gold,P.woodDark)+circle(282,235,5,P.paper)+path('M284 355L259 370H296M353 353L370 369H335','none',P.gold,'stroke-width="10"');
  }
  if(art==='amber'){
    const tint=id==='treasure-faroe'?'#bf8958':'#668b7d';
    return shore+path('M180 236L328 197L460 239L315 282Z',tint,P.woodDark)+path('M180 236V344L315 395V282Z',tint,P.woodDark)+path('M315 282L460 239V347L315 395Z',tint,P.woodDark)+path('M219 223L350 271V384M418 224L274 267V379','none',P.gold,'stroke-width="10"')+rect(345,292,39,32,P.gold,P.woodDark,4)+circle(365,304,5,P.woodDark);
  }
  if(art==='coins'){
    const tint=kind==='treasure'?'#bdc4bb':'#ad9062';
    return shore+[[258,295,70],[343,241,83],[389,331,63]].map(([x,y,r])=>circle(x,y,r,tint,P.woodDark,4)+circle(x,y,r-15,'none',P.paper,3)+path(`M${x-r/2} ${y}q${r/4} -25 ${r/2} 0t${r/2} 0`,'none',P.ink,'stroke-width="5"')).join('');
  }
  if(art==='compass'){
    return shore+circle(320,266,113,P.paper,P.woodDark,10)+circle(320,266,94,'none',P.gold,3)+path('M320 175L342 251L418 266L341 287L320 356L298 287L222 266L298 248Z',kind==='treasure'?'#5d8a91':'#b78550',P.ink)+path('M320 193L342 251L320 266L298 248Z',P.paper,P.ink)+circle(320,266,10,P.gold,P.woodDark);
  }
  if(art==='scroll'){
    return shore+path('M189 182Q225 147 260 182L460 208Q412 235 441 365L235 337Q212 335 209 312Z',P.paper,P.woodDark)+path('M194 195Q206 179 226 192L244 315Q224 341 207 310Z','#d6bf86',P.woodDark)+path('M268 236L396 251M277 269L386 284M283 302L401 318','none','#aa7953','stroke-width="5"')+path('M309 171L331 361M330 181L352 362','none','#a55349','stroke-width="8"');
  }
  return shore+path('M188 320L231 227L310 202L362 221L450 314L404 373L292 389Z','#78b7bf',P.ink)+path('M229 275L311 231L398 287L360 345L288 356Z','#c6e0cd',P.ink)+path('M260 262L301 298L336 259L382 301M257 331L305 310L348 339','none','#4d8e9c','stroke-width="10"');
}
export function discoverySvg(id){
  if(!DISCOVERY_ART_IDS.includes(id))return svg('discovery-unknown','아직 발견하지 않은 항목',setting('discovery-unknown')+circle(320,244,110,'#e4e7d8','#99ad9e',2)+`<text x="320" y="286" text-anchor="middle" font-family="Georgia,serif" font-size="130" fill="#799389">?</text>`);
  const entry=DISCOVERY_BY_ID[id];
  const body=entry.art?newDiscoveryScene(entry):expandedDiscoveryScene(id)||(id.startsWith('ruin-')?ruinScene(id):id.startsWith('relic-')?relicScene(id):id.startsWith('animal-')?animalScene(id):treasureScene(id));
  return svg(id,(DISCOVERY_TITLES[id]||entry.name)+' · 바람의 항로 수집 그림',body);
}
