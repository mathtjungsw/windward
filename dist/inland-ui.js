import {GOODS,PORT_BY_ID} from './data.js?v=2026.11.15-server-blessings';
import {captainTradeQuote,executeTrade,permitted,portMarketItem,taxRate} from './commerce.js?v=2026.11.15-server-blessings';
import {inlandHarborStorage} from './inland.js?v=2026.11.15-server-blessings';
import {INLAND_CITIES,INLAND_TIERS,WAREHOUSE_MAX,inlandVehicle,inlandAccess,inlandLocation,inlandWarehouse,inlandAvailable,inlandSpace,inlandReserved,inlandHaulQuote,inlandMarketQuote,inlandWalk,inlandUpgrade,inlandTransfer,startInlandHaul,settleInlandHaul,stopInlandHaul,inlandTrade,inlandGuild} from './inland.js?v=2026.11.15-server-blessings';

const $=s=>document.querySelector(s),fmt=n=>Number(n).toLocaleString('ko-KR');
const time=ms=>{const seconds=Math.max(0,Math.ceil(ms/1000));return seconds>=60?`${Math.floor(seconds/60)}분 ${seconds%60}초`:`${seconds}초`;};
const money=n=>fmt(n)+' D';

export function createInlandUI(api){
 let busy=false,timer;
 const back=(city,tab)=>()=>open(city.id,tab);
 const run=(fn,done)=>api.run('personal',api.uid(),fn,done);
 async function reconcile(){
  const job=api.game().inland?.haul;
  if(busy||job?.phase!=='running'||job.due>api.now())return;
  busy=true;
  try{return await run((game,_c,now)=>{
   if(!settleInlandHaul(game,now))return {noWrite:true};
   const job=game.inland.haul;
   return job.phase==='running'?{quiet:true}:{message:job.phase==='done'?'육상 운송을 모두 마쳤어요.':job.phase==='funds'?'보급비가 부족해 육상 운송을 멈췄어요.':'육상 운송을 멈췄어요.'};
  });}finally{busy=false;}
 }
 async function open(id=inlandLocation(api.game()),tab='overview'){
  const city=INLAND_CITIES[id];
  if(!city)return;
  clearTimeout(timer);
  const game=api.game(),visit=game.inland?.visit,job=game.inland?.haul,now=api.now(),v=inlandVehicle(game),atCity=inlandAccess(game,city,city.id,now),atPort=inlandAccess(game,city,city.port,now),connected=game.port===city.port&&!game.voyage;
  if(job?.phase==='running'&&job.due<=now&&!busy&&tab!=='overview'){
   if(await reconcile())return open(id,tab);
  }
  const travel=visit?.city===id&&visit.due>now;
  const port=PORT_BY_ID[city.port];
  api.modal(city.name,'내륙 도시 · '+port.name+' 육로',`
   <nav class="expansion-tabs">${[['overview','육로'],['market','교역소'],['tavern','주점'],['guild','조합'],['storage','창고·운송']].map(([key,label])=>`<button data-inland-tab="${key}" aria-pressed="${key===tab}" ${(key==='market'||key==='tavern')&&!atCity||key==='guild'&&!atPort&&!atCity||key==='storage'&&!connected?'disabled':''}>${label}</button>`).join('')}</nav>
   <div id="inland-content">
   ${tab==='overview'?`<p>${atCity?city.name+'에 도착했어요. 선단은 '+port.name+'에 정박해 있어요.':travel?(visit.returning?port.name:city.name)+'으로 이동 중':connected?port.name+'에서 육로로 출발할 수 있어요.':port.name+'에 정박하면 이 도시를 방문할 수 있어요.'}</p>
   <p>${v.tier}단계 ${v.name} · 1회 ${v.load}상자 · 편도 ${time(inlandHaulQuote(game,city,1).duration)}${travel?' · <span id="inland-time">남은 '+time(visit.due-now)+'</span>':''}</p>
   <div class="dialog-actions">${atPort||atCity?`<button id="inland-visit" class="primary-button">${atCity?'배가 있는 항구로 돌아가기':'도시로 출발'}</button>`:!connected?'<button id="inland-port">연결 항구 보기</button>':''}
   <button id="inland-vehicle">육상 운송 수단</button></div>`:tab==='tavern'?`<h3>${city.name} 주점</h3><p>${port.name}의 배와 이곳의 교역품은 창고에서 이어집니다. 조합에서 화물 운반 의뢰를 받을 수 있어요.</p><button data-inland-panel="guild">도시 조합</button>`:tab==='guild'?guildMarkup(game,city,now):tab==='storage'?storageMarkup(game,city,atPort,atCity,now):'<p>시장 시세를 불러오는 중…</p>'}</div>`,'medium');
  const root=$('#inland-content');
  document.querySelectorAll('[data-inland-tab],[data-inland-panel]').forEach(button=>button.onclick=back(city,button.dataset.inlandTab||button.dataset.inlandPanel));
  $('#inland-visit')?.addEventListener('click',()=>run((g,_c,t)=>inlandWalk(g,city,t,atCity),back(city,'overview')));
  $('#inland-port')?.addEventListener('click',()=>api.port(city.port));
  $('#inland-vehicle')?.addEventListener('click',()=>vehicle(city));
  $('#inland-guild-action')?.addEventListener('click',()=>run((g,_c,t)=>inlandGuild(g,city,t),back(city,'guild')));
  $('#inland-haul-stop')?.addEventListener('click',()=>run((g,_c,t)=>stopInlandHaul(g,t),back(city,'storage')));
  $('#inland-haul-refresh')?.addEventListener('click',back(city,'storage'));
  $('#inland-haul-resume')?.addEventListener('click',()=>haul(city,job.from,job.good,job.qty-job.delivered));
  root.querySelectorAll('[data-warehouse-move]').forEach(button=>button.onclick=()=>transfer(city,button.dataset.good,button.dataset.warehouseMove==='ship'));
  root.querySelectorAll('[data-inland-haul]').forEach(button=>button.onclick=()=>haul(city,button.dataset.inlandHaul,button.dataset.good));
  if(tab==='market'||tab==='harborMarket')void market(city,root,tab==='harborMarket');
  if(tab==='overview'&&travel||tab==='storage'&&job?.phase==='running'&&job.due>now){
   const due=tab==='overview'?visit.due:job.due;
   const update=()=>{
    if(!root.isConnected||!root.closest('dialog')?.open)return;
    const left=due-api.now();
    if(left<=0){void open(id,tab);return;}
    const output=root.querySelector('#inland-time');if(output)output.textContent=(tab==='overview'?'남은 ':'')+time(left);
    timer=setTimeout(update,Math.min(1000,left));
   };
   timer=setTimeout(update,Math.max(250,Math.min(1000,due-now)));
  }
 }
 function vehicle(city){
  const game=api.game(),current=inlandVehicle(game),next=INLAND_TIERS[current.tier],allowed=inlandAccess(game,city,city.port,api.now())||inlandAccess(game,city,city.id,api.now());
  api.modal('육상 운송 수단',city.name,`<p>현재 ${current.tier}단계 ${current.name} · ${current.load}상자</p>
   ${next?`<p>다음 ${next.tier}단계 ${next.name} · ${next.load}상자 · ${money(next.cost-current.cost)}</p><button id="inland-upgrade" ${allowed&&game.money>=next.cost-current.cost?'':'disabled'}>한 단계 업그레이드</button>`:'<p>최대 단계예요.</p>'}
   <details><summary>전체 20단계 보기</summary><ol>${INLAND_TIERS.map(t=>`<li>${t.name} · ${t.load}상자 · 누적 ${money(t.cost)}</li>`).join('')}</ol></details><button id="inland-back">육로로 돌아가기</button>`,'small');
  $('#inland-back').onclick=back(city,'overview');
  $('#inland-upgrade')?.addEventListener('click',()=>run((g,_c,t)=>inlandUpgrade(g,city,t),()=>vehicle(city)));
 }
 function guildMarkup(game,city,now){
  const today=Math.floor((now+32400000)/86400000),current=game.inland?.guild?.[city.id];
  const good=current?.day===today?current.good:Object.keys(city.goods)[0],quantity=current?.qty||15;
  const stamp=new Date(current?.day===today?current.deadline:(today+1)*86400000-32400000).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'});
  return `<h3>항구 창고로 ${GOODS[good].name} 운반</h3><p>${quantity}상자 · 마감 ${stamp} (한국 시간) · 보수 ${money(600+city.seconds*3)}</p>
   <button id="inland-guild-action" ${current?.closed===today?'disabled':''}>${current?.closed===today?'오늘 완료':current?.day===today?'항구 창고 화물 인도':'의뢰 받기'}</button>`;
 }
 function storageMarkup(game,city,atPort,atCity,now){
  const job=game.inland?.haul;
  const progress=job?`<article><h3>육상 운송 · ${INLAND_CITIES[job.city].name}</h3><p>${GOODS[job.good].name} · ${job.delivered}/${job.qty}상자 도착 · 보급비 ${money(job.paid)}</p>
   <p>${job.phase==='running'?`다음 구간까지 <span id="inland-time">${time(job.due-now)}</span>`:job.phase==='funds'?'보급비 부족으로 정지':job.phase==='done'?'운송 완료':'운송 정지'}</p>
   ${job.phase==='running'&&job.due<=now?'<button id="inland-haul-refresh">운송 기록 다시 확인</button>':''}
   ${job.phase==='running'&&!job.stop?'<button id="inland-haul-stop">이번 구간 뒤 정지</button>':['funds','stopped'].includes(job.phase)&&job.city===city.id?'<button id="inland-haul-resume">남은 수량 다시 예약</button>':''}</article>`:'';
  const inventories=[[city.port,PORT_BY_ID[city.port].name+' 창고',atPort],[city.id,city.name+' 창고',atCity]];
  return progress+inventories.map(([id,label,here])=>`<section><h3>${label} · ${inlandSpace(game,id)}/${WAREHOUSE_MAX}상자</h3>${inlandReserved(game,id)?'<p>들어올 화물 '+inlandReserved(game,id)+'상자 예약</p>':''}
    ${here&&id===city.port?'<button data-inland-panel="harborMarket">항구 창고로 구매·판매</button>':''}
    ${Object.entries(inlandWarehouse(game,id)).map(([good,item])=>`<p>${GOODS[good].name} · ${item.qty}상자 · 사용 가능 ${inlandAvailable(game,id,good)}상자
      ${inlandAvailable(game,id,good)>0?`<button data-good="${good}" data-inland-haul="${id}" ${job?.phase==='running'?'disabled':''}>운송 예약</button>
      ${here&&id===city.port?`<button data-good="${good}" data-warehouse-move="ship">배에 싣기</button>`:''}`:''}</p>`).join('')||'<p>보관한 화물이 없어요.</p>'}</section>`).join('')+
   (atPort?`<section><h3>선단 화물</h3>${Object.entries(game.cargo).filter(([,item])=>item.qty>0).map(([good,item])=>`<p>${GOODS[good].name} · ${item.qty}상자 <button data-good="${good}" data-warehouse-move="warehouse">창고에 보관</button></p>`).join('')||'<p>선단에 실은 화물이 없어요.</p>'}</section>`:'');
 }
 function transfer(city,good,toShip){
  const cap=toShip?inlandAvailable(api.game(),city.port,good):api.game().cargo[good]?.qty||0;
  api.modal(toShip?'배에 싣기':'항구 창고에 보관',GOODS[good].name,`<label>수량 <input id="inland-qty" type="number" inputmode="numeric" min="1" max="${cap}" value="${cap}"></label><button id="inland-apply">옮기기</button><button id="inland-back">창고로</button>`,'small');
  $('#inland-back').onclick=back(city,'storage');
  $('#inland-apply').onclick=()=>{const qty=Number($('#inland-qty').value);return run((g,_c,t)=>inlandTransfer(g,city,good,qty,toShip,t),back(city,'storage'));};
 }
 function haul(city,from,good,initial=1){
  const game=api.game(),max=inlandAvailable(game,from,good);
  api.modal('육상 운송 예약',GOODS[good].name,`<label>수량 <input id="inland-qty" type="number" inputmode="numeric" min="1" max="${max}" value="${Math.min(max,initial)}"></label><p id="inland-estimate"></p><button id="inland-apply">예약 확정</button><button id="inland-back">창고로</button>`,'small');
  let shown=null;
  const input=$('#inland-qty'),button=$('#inland-apply'),paint=()=>{
   try{const qty=input.valueAsNumber;if(qty>max)throw Error();const q=inlandHaulQuote(game,city,qty,api.now());shown=q;$('#inland-estimate').textContent=`적재 이동 ${q.loads}회 + 빈 복귀 ${q.loads-1}회 · ${time(q.elapsed)} · 보급비 ${money(q.cost)}`;button.disabled=false;}
   catch{shown=null;$('#inland-estimate').textContent='출발 창고의 사용 가능 수량을 확인해 주세요.';button.disabled=true;}
  };
  input.oninput=paint;paint();
  $('#inland-back').onclick=back(city,'storage');
  button.onclick=async()=>{const qty=input.valueAsNumber,expected=shown;if(!expected)return;await run((g,_c,t)=>startInlandHaul(g,city,from,good,qty,t,expected),back(city,'storage'));if(button.isConnected)paint();};
 }
 async function market(city,root,harbor=false){
  const key=harbor?city.port:'inland-'+city.id,place=harbor?city.port:city.id;
  try{
   const record=await api.read(key);
   if(!root.isConnected)return;
   if(harbor&&!permitted(record.content,api.uid())){root.textContent='현재 항구의 교역이 제한되어 있어요.';return;}
   const owned=inlandWarehouse(api.game(),place);
   const row=(good,mode)=>`<p>${GOODS[good].name}${mode==='sell'?' · '+inlandAvailable(api.game(),place,good)+'상자':''} <button data-inland-trade="${mode}" data-good="${good}">${mode==='buy'?'구매':'판매'}</button></p>`;
   const goods=harbor?PORT_BY_ID[city.port].market.filter(id=>!GOODS[id].premium&&!GOODS[id].legacy):Object.keys(city.goods);
   root.innerHTML=`<p>거래한 화물은 ${harbor?'항구':'도시'} 창고에 들어갑니다.</p><h3>구매</h3>`+goods.map(good=>row(good,'buy')).join('')+
    '<h3>판매</h3>'+(Object.keys(owned).filter(good=>(harbor||!GOODS[good].premium&&!GOODS[good].legacy)&&inlandAvailable(api.game(),place,good)>0).map(good=>row(good,'sell')).join('')||'<p>판매할 화물이 없어요.</p>');
   root.querySelectorAll('[data-inland-trade]').forEach(button=>button.onclick=()=>quote(city,key,button.dataset.good,button.dataset.inlandTrade,record,harbor));
  }catch{if(root.isConnected)root.textContent='도시 시세를 불러오지 못했어요.';}
 }
 function quote(city,key,good,mode,record,harbor){
  const game=api.game(),sale=mode==='sell',place=harbor?city.port:city.id,max=sale?inlandAvailable(game,place,good):Math.min(1000,WAREHOUSE_MAX-inlandSpace(game,place)-inlandReserved(game,place));
  const page=harbor?'harborMarket':'market';
  api.modal(GOODS[good].name+(sale?' 판매':' 구매'),harbor?PORT_BY_ID[city.port].name:city.name,`<label>상자 수 <input id="inland-qty" type="number" inputmode="numeric" min="1" max="${Math.min(max,1000)}" value="1"></label>
  <button id="inland-refresh">견적 다시 보기</button><p id="inland-estimate"></p><button id="inland-apply" class="primary-button">표시 금액으로 거래</button><button id="inland-back">교역소로</button>`,'small');
  const input=$('#inland-qty'),button=$('#inland-apply');
  let current;
  function paint(){
   try{
    const qty=input.valueAsNumber;if(qty>max)throw Error();
    current=harbor?captainTradeQuote(game,city.port,good,qty,mode,portMarketItem(record.content,city.port,good,record.revision),api.now(),taxRate(record.content,api.uid(),city.port,game)):inlandMarketQuote(city,good,qty,mode,record.content,record.revision,api.now());
    $('#inland-estimate').textContent=`${qty}상자 × ${money(current.unit)} · 세금 ${money(current.tax)}${current.noviceTax?' · 초보 선장 면세':''} · 총 ${money(current.total)}. 표시된 단가로 전량 거래해요.`;
    button.disabled=!sale&&current.total>game.money;
   }catch{current=null;button.disabled=true;$('#inland-estimate').textContent='창고 공간과 수량을 확인해 주세요.';}
  }
  input.oninput=paint;paint();
  $('#inland-back').onclick=back(city,page);
  $('#inland-refresh').onclick=async()=>{try{record=await api.read(key);if(input.isConnected)paint();}catch(e){api.toast(e.message,'error');}};
  button.onclick=()=>{
   const q=current;if(!q)return;
   return api.run('ports',key,(g,c,t,rev)=>harbor
    ?executeTrade(g,c,api.uid(),city.port,good,q.qty,mode,q,t,rev,inlandHarborStorage(g,city,good,t))
    :inlandTrade(g,city,good,q.qty,mode,c,rev,t,q),back(city,page));
  };
 }
 return {open,reconcile};
}
