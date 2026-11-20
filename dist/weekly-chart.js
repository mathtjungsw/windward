import {PORT_BY_ID} from './data.js?v=2026.11.20-land-caravans';

const WEEK=604800000,offset=3*86400000+9*3600000;
export const voyageWeek=at=>Math.floor((at+offset)/WEEK);
const validPort=id=>typeof id==='string'&&Object.hasOwn(PORT_BY_ID,id);
export function weeklyEdge(from,to){
 return validPort(from)&&validPort(to)&&from!==to?[from,to].sort().join('|'):null;
}
export function summarizeWeeklyChart(captains,knownIds){
 const visited=new Set(),edges=new Map(),known=new Set(knownIds);
 let captainsCount=0;
 for(const routes of Object.values(captains||{})){
  let participates=false;
  for(const [edge,value] of Object.entries(routes||{})){
   const [from,to]=edge.split('|');
   if(value!==true||weeklyEdge(from,to)!==edge)continue;
   participates=true;
   visited.add(from);visited.add(to);
   edges.set(edge,(edges.get(edge)||0)+1);
  }
  if(participates)captainsCount++;
 }
 const visible=[...edges].flatMap(([key,count])=>{
  const [from,to]=key.split('|');
  return known.has(from)&&known.has(to)?[{from,to,count}]:[];
 });
 return {ports:visited.size,connections:edges.size,captains:captainsCount,visible,unknown:[...visited].filter(id=>!known.has(id)).length};
}
function renderChart(rows){
 const coords=(id)=>{
  const {lon,lat}=PORT_BY_ID[id];
  return [(lon+180)*2,(80-lat)*2.3];
 };
 const active=new Set();
 const lines=rows.map(({from,to,count})=>{
  active.add(from);active.add(to);
  let [x,y]=coords(from),[endX,endY]=coords(to);
  if(endX-x>360)endX-=720;
  if(x-endX>360)endX+=720;
  return [-720,0,720].map(offset=>'<line x1="'+(x+offset)+'" y1="'+y+'" x2="'+(endX+offset)+'" y2="'+endY+'" stroke-width="'+Math.min(5,1+count*.8)+'"><title>'+PORT_BY_ID[from].name.replace(/[<>&]/g,'')+' → '+PORT_BY_ID[to].name.replace(/[<>&]/g,'')+' · '+count+'명</title></line>').join('');
 }).join('');
 const labels=[...active].map(id=>{
  const [x,y]=coords(id);
  return '<circle cx="'+x+'" cy="'+y+'" r="3"/><text x="'+(x+5)+'" y="'+(y-4)+'">'+PORT_BY_ID[id].name.replace(/[<>&]/g,'')+'</text>';
 }).join('');
 const grid=[...Array.from({length:11},(_,i)=>'<path d="M'+((i+1)*60)+' 0v322"/>'),
  ...Array.from({length:6},(_,i)=>'<path d="M0 '+((i+1)*46)+'h720"/>')].join('');
 return '<svg class="weekly-route-map" viewBox="0 0 720 322" role="img" aria-label="이번 주 공동 항해도"><image width="720" height="322" preserveAspectRatio="none"/><g class="weekly-grid">'+grid+'</g><g class="weekly-lines">'+lines+'</g><g class="weekly-ports">'+labels+'</g></svg>';
}

export function createWeeklyChart({account,game,now,storage,modal,overview}){
 const root='gameV2/real/weeklyVoyages/';
 let sending=false,renderId=0;
 const key=uid=>'windward-weekly-legs:'+uid;
 function read(uid){try{return JSON.parse(storage.getItem(key(uid))||'{}')||{};}catch{return {};}}
 function write(uid,rows){try{storage.setItem(key(uid),JSON.stringify(rows));}catch{}}
 async function flush(){
  const uid=account.uid;
  if(sending||!uid||!account.ready||!account.sdk||!navigator.onLine)return;
  sending=true;
  try{
   const week=voyageWeek(now()),s=account.sdk;
   const rows=read(uid);
   for(const old of Object.keys(rows))if(Number(old)<week-1)delete rows[old];
   write(uid,rows);
   const pending=Object.entries(rows).flatMap(([id,items])=>items.map(edge=>[id,edge]));
   const updates={};
   for(const [id,edge] of pending)updates[id+'/'+uid+'/'+edge]=true;
   if(pending.length)await s.update(s.ref(account.db,root.slice(0,-1)),updates);
   const latest=read(uid);
   for(const [id,edge] of pending)if(latest[id])latest[id]=latest[id].filter(value=>value!==edge);
   write(uid,latest);
  }catch{}finally{sending=false;}
 }
 function record(from,to,at=now()){
  const edge=weeklyEdge(from,to),uid=account.uid;
  if(!uid||!edge)return;
  const week=voyageWeek(at),rows=read(uid);
  const entries=rows[week]||[];
  if(!entries.includes(edge))rows[week]=[...entries,edge];
  write(uid,rows);
  void flush();
 }
 async function open(last=false){
  const id=++renderId,week=voyageWeek(now())-(last?1:0),start=week*WEEK-offset;
  const date=new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',timeZone:'Asia/Seoul'});
  modal('주간 공동 항해도',date.format(start)+'~'+date.format(start+6*86400000),' <div class="dialog-actions"><button id="weekly-this" type="button" aria-pressed="'+(!last)+'">이번 주</button><button id="weekly-last" type="button" aria-pressed="'+last+'">지난주</button></div><div id="weekly-chart" role="status">항해 기록을 읽고 있어요…</div>','wide');
  document.querySelector('#weekly-this').onclick=()=>open(false);
  document.querySelector('#weekly-last').onclick=()=>open(true);
  const target=document.querySelector('#weekly-chart');
  try{
   if(!account.ready||!account.sdk)throw Error('서버에 연결한 뒤 항해도를 볼 수 있어요.');
   const s=account.sdk,snapshot=await s.get(s.ref(account.db,root+week));
   if(!target.isConnected||id!==renderId)return;
   const current=game();
   const chart=summarizeWeeklyChart(snapshot.val(),[...(current.knownPorts||[]),...(current.visited||[])]);
   target.innerHTML='<p>방문 항구 '+chart.ports+'곳 · 연결 항로 '+chart.connections+'개 · 참여 선장 '+chart.captains+'명</p>'+renderChart(chart.visible)+
    (chart.unknown?'<p>아직 발견하지 않은 항구 '+chart.unknown+'곳도 다른 선장이 방문했어요.</p>':'')+
    '<p class="modal-meta">두 항구를 완주한 선장이 많을수록 연결선이 굵어져요. 지도 지형은 Natural Earth 자료를 사용합니다.</p>';
   const background=target.querySelector('.weekly-route-map image');
   const fallback='assets/weekly-chart-land.svg',url=overview?.()||fallback;
   if(url!==fallback)background.addEventListener('error',()=>background.setAttribute('href',fallback),{once:true});
   background.setAttribute('href',url);
  }catch(error){if(target.isConnected&&id===renderId)target.textContent=error.message;}
 }
 window.addEventListener('online',flush);
 return {open,record,flush};
}
