import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {mkdir,mkdtemp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {DISCOVERIES} from '../dist/discoveries-catalog.js';
import {discoverySvg as discoveryIllustration} from '../dist/art.js';
import {ITEMS} from '../dist/rumor-catalog.js';
const palette={
 sail:'M227 331h201L363 124q-25 139-136 207Z M369 118v245M213 363h183',
 rope:'M215 272q17-68 111-67t113 67q-19 65-113 65t-111-65Zm21-13q12-42 91-42t91 42q-12 38-91 38t-91-38Zm-4 36q61 50 177 12',
 map:'M194 168l81-23 89 23 78-23v174l-78 23-89-23-81 23ZM275 145v174m89-151v174m-132-79 31-24 27 23 36-37 56 41 25-34',
 book:'M192 163q77-26 128 14 51-40 128-14v159q-77-25-128 14-51-39-128-14Zm128 14v159m-103-133q45-15 77 8m-77 28q45-15 77 8m57-36q32-23 74-8m-74 44q32-23 74-8',
 barrel:'M252 159h136q43 79 0 164H252q-43-85 0-164Zm-19 47h174m-174 76h174m-125-120-13 158m55-158v158m41-158 14 158',
 note:'M219 182h202v126H219zM219 184l101 76 101-76m-202 123 74-66m128 66-74-66 M344 253a18 18 0 1 1-36 0 18 18 0 1 1 36 0',
 seal:'M320 163a73 73 0 1 1 0 146 73 73 0 1 1 0-146Zm0 23a50 50 0 1 1 0 100 50 50 0 1 1 0-100Zm0 14 13 32 34 5-24 23 6 34-29-16-29 16 6-34-24-23 34-5Z',
 gear:'M233 330l78-101q-4-39 23-61 29-22 62-5l-34 31 7 22 22 6 32-31q16 35-9 61-22 24-60 16l-78 101Z',
 oar:'M241 347q-38 3-40-29l164-162q25-25 47-5t-4 47L241 347Zm29-30 120-129',
 shelf:'M211 171h218v164H211Zm11 48h196m-196 57h196m-167-93v141m138-141v141 M272 223h91v44h-91Z',
 shoe:'M207 296q32-20 55-22l-2-94 90-11 18 88q27 23 61 36l9 28H207Zm74-89 69-11m-66 31 70-11m-68 31 73-11',
 bag:'M242 214q-3-45 41-49h73q45 4 42 49l26 107q-101 43-208 0Zm20 16h112l-9 59h-94Zm35-65v-19h50v19',
 tent:'M207 326h226L325 151Zm118-175-27 175m27-175 33 175m-40-90 20 90',
 compass:'M320 153a89 89 0 1 1 0 178 89 89 0 1 1 0-178Zm31 43-15 62-47 32 15-62Z M320 155v18m0 137v18m-87-86h17m140 0h17',
 telescope:'M210 272l166-99 53 80-179 78Zm30-18 39 55m83-124 43 73m-112 29 81-50',
 net:'M212 178h215l-35 156H248Zm15 46h185m-172 50h159m-111-96 11 155m52-155-11 155m-126-132 180 99m-12-122-143 113',
 hook:'M315 152h36v28h-36Zm17 28v118q0 35-36 35-40 0-41-49l-29 32q6 56 72 56 72 0 72-70V203',
 float:'M320 154a90 90 0 1 1 0 180 90 90 0 1 1 0-180Zm0 54a36 36 0 1 0 0 72 36 36 0 1 0 0-72Zm-63-30 34 40m93-40-34 40m-95 89 34-38m95 38-34-38',
 caliper:'M318 145a21 21 0 1 1 0 42 21 21 0 1 1 0-42Zm-9 38-63 145 4 14 19-17 53-127m8-15 63 145-4 14-19-17-53-127m-38 69h92',
 flag:'M226 142h13v202h-13Zm13 12q47-19 92 0t93-1l-30 45 30 39q-48 20-93 0t-92 1Z',
 chest:'M213 217q0-56 55-60h101q57 4 57 60v110H213Zm0 0h213m-208 42h203m-110-35h24v46h-24zm-49-60v158m115-158v158',
 coins:'M290 189a60 60 0 1 1 0 120 60 60 0 1 1 0-120Zm62-26a55 55 0 1 1 0 110m-17 19a49 49 0 1 0 29-61m-75-31v90m-19-20 37-36'
};
const motifs='sail sail oar map book map caliper oar barrel barrel chest note gear note rope note seal note note note note rope shelf book book shoe bag tent seal gear book chest telescope net book hook barrel float map map note seal note note seal seal note note note caliper note note note note book map map book book compass note flag coins seal'.split(' ');
const discoveryStyle={
 ruin:['#40595a','#cfaf77'],relic:['#374b4e','#cfaa67'],treasure:['#304a52','#d2a25c'],animal:['#3b6160','#b9bd79']
};
function itemSvg(item){
 const n=Number(item.id.slice(1)), colors=[['#345059','#cfb779'],['#39474c','#ae9c62'],['#2d554c','#c7a86d'],['#5f443d','#e0b879'],['#38475d','#cba176'],['#465544','#bdc393']], [dark,bright]=colors[n%colors.length];
 const p=palette[motifs[n-1]]||palette.seal, offset=(n%11-5)*2, angle=(n%7-3)*4, bands=Array.from({length:n%5+2},(_,i)=>`<path d="M${77+i*14} 406l${11+n%5} -${9+i*2}"/>`).join(''), hatch=Array.from({length:14},(_,i)=>`<path d="M${110+i*30} 361l${(i%3)*8-18} 40"/>`).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><defs><radialGradient id="b"><stop stop-color="${bright}"/><stop offset=".78" stop-color="${dark}"/><stop offset="1" stop-color="#192c2d"/></radialGradient><linearGradient id="m" x2=".8" y2="1" gradientUnits="objectBoundingBox"><stop stop-color="#fff1c7"/><stop offset=".55" stop-color="${bright}"/><stop offset="1" stop-color="#80553b"/></linearGradient><filter id="s"><feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#191a1b" flood-opacity=".75"/></filter></defs><path fill="url(#b)" d="M0 0h640v480H0Z"/><g stroke="#dfc892" fill="none"><rect x="26" y="24" width="588" height="432" rx="14" opacity=".58"/><rect x="36" y="34" width="568" height="412" rx="10" opacity=".23"/><circle cx="320" cy="242" r="151" opacity=".22"/><circle cx="320" cy="242" r="166" opacity=".28" stroke-dasharray="3 8"/><path d="M64 95h72m-36-32v66m404-34h72m-36-32v66M78 392h484M96 412h448" opacity=".32"/><g opacity=".20">${hatch}</g><g opacity=".4">${bands}</g></g><ellipse cx="320" cy="375" rx="136" ry="19" fill="#293837" opacity=".65"/><g transform="translate(${offset} 0) rotate(${angle} 320 242)"><path d="${p}" fill="url(#m)" fill-rule="evenodd" stroke="#49392b" stroke-width="5" stroke-linejoin="round" filter="url(#s)"/><path d="${p}" fill="none" stroke="#fff3cc" stroke-width="1.3" opacity=".6" stroke-linejoin="round"/></g><path d="M284 417h72m-53 6h34" stroke="${bright}" opacity=".7"/></svg>`;
}
function discoverySvg(d){
 const [dark,light]=discoveryStyle[d.kind], source=discoveryIllustration(d.id);
 return source.replace(/(<title[^>]*>.*?<\/title>)/,'$1'+`<defs><radialGradient id="v"><stop offset=".50" stop-color="${light}" stop-opacity="0"/><stop offset="1" stop-color="${dark}" stop-opacity=".61"/></radialGradient><linearGradient id="g" x2="0" y2="1"><stop stop-color="${light}" stop-opacity=".26"/><stop offset=".52" stop-color="${dark}" stop-opacity=".04"/><stop offset="1" stop-color="${dark}" stop-opacity=".27"/></linearGradient><filter id="p"><feTurbulence baseFrequency=".71" numOctaves="3" seed="27"/><feColorMatrix type="saturate" values="0"/></filter></defs><g>`).replace('</svg>',`</g><rect width="640" height="480" fill="url(#g)" style="mix-blend-mode:multiply"/><rect width="640" height="480" fill="url(#v)"/><rect width="640" height="480" filter="url(#p)" opacity=".12" style="mix-blend-mode:soft-light"/><rect x="9" y="9" width="622" height="462" rx="12" stroke="${light}" stroke-opacity=".67" fill="none"/><rect x="16" y="16" width="608" height="448" rx="10" stroke="${dark}" stroke-opacity=".34" fill="none"/></svg>`);
}
const entries=new Map([...DISCOVERIES.map(d=>[d.id,discoverySvg(d)]),...ITEMS.map(i=>[i.id,itemSvg(i)])]);
const folder=resolve('dist/assets/collection');await mkdir(folder,{recursive:true});
const written=new Set();
const handler=`const ids=${JSON.stringify([...entries.keys()])};const queue=[...ids];async function run(){while(queue.length){const id=queue.shift(),image=new Image();image.src='/source/'+id;await image.decode();for(const [size,width,limit,q] of [['thumb',192,12000,.85],['detail',640,60000,.89]]){const c=document.createElement('canvas');c.width=width;c.height=width*.75;c.getContext('2d').drawImage(image,0,0,c.width,c.height);let quality=q,blob;do{blob=await new Promise(r=>c.toBlob(r,'image/webp',quality));quality-=.06;}while(blob.size>limit&&quality>.42);const res=await fetch('/image/'+id+'-'+size,{method:'POST',body:blob});if(!res.ok)throw Error(id);}}}Promise.all(Array.from({length:4},run)).then(()=>document.body.dataset.result='complete').catch(e=>document.body.dataset.result=e.message);`;
const server=createServer(async(req,res)=>{
 try{
  if(req.url==='/'){res.setHeader('Content-Type','text/html');return res.end('<!doctype html><body><script>'+handler+'</script>');}
  if(req.url.startsWith('/source/')){const svg=entries.get(req.url.slice(8));if(!svg)throw Error();res.setHeader('Content-Type','image/svg+xml');return res.end(svg);}
  const [,id,size]=/^\/image\/(.+)-(thumb|detail)$/.exec(req.url)||[];
  if(req.method!=='POST'||!entries.has(id)||!size)throw Error();
  const chunks=[];for await(const chunk of req)chunks.push(chunk);
  const data=Buffer.concat(chunks);if(data.length>(size==='thumb'?12000:60000)||data.subarray(8,12).toString()!=='WEBP')throw Error();
  await writeFile(join(folder,`${id}-${size}.webp`),data);written.add(id+'-'+size);res.end('ok');
 }catch{res.statusCode=400;res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
try{
 const profile=await mkdtemp(join(tmpdir(),'windward-art-'));
 const chrome=spawn(process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-background-networking','--no-first-run','--disable-extensions','--user-data-dir='+profile,'http://127.0.0.1:'+server.address().port],{windowsHide:true,stdio:'ignore'});
 try{const stop=Date.now()+65000;while(written.size<entries.size*2&&Date.now()<stop)await new Promise(r=>setTimeout(r,250));}
 finally{chrome.kill();}
 if(written.size!==entries.size*2)throw Error('Some card art was not produced: '+written.size);
 console.log(`Wrote ${written.size} WebPs for ${entries.size} cards`);
}finally{server.close();}
