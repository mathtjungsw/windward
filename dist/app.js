import {GOODS,PORTS,PORT_BY_ID,MISSIONS} from './data.js';
import {SAVE_KEY,START_DATE,initialState,loadState,capacity,usedCargo,dailySpeed,price,sellPrice,buy,sell,Navigator,project,unproject,positionAlong,voyageEstimate} from './engine.js';

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const fmt=n=>Math.round(n).toLocaleString('ko-KR');
const toward=name=>{const final=(name.charCodeAt(name.length-1)-0xac00)%28;return name+(final>0&&final!==8?'으로':'로');};
const icon=(name,cls='')=>`<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
let storage;try{storage=localStorage;}catch{storage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};}
let state=loadState(storage),selected=state.port||state.voyage?.target||'lisbon',planned=null,nav=null,paused=false,sound=false,audio=null,activeTab='trade',mapReady=false,followShip=!!state.voyage;
let camera={x:project([innerWidth<=850?-28:5,17])[0],y:project([5,17])[1],zoom:innerWidth<=850?3.3:1.17},screen={w:0,h:0,k:1},drag=null,dragged=false,frame=0;
const modal=$('#modal');

function save(){
  try{storage.setItem(SAVE_KEY,JSON.stringify(state));}catch{$('#save-status').innerHTML='<i></i>저장 공간 부족';}
}
function log(text,type='info'){state.log.unshift({day:state.day,text,type});state.log=state.log.slice(0,50);$('#latest-log').textContent=text;}
function toast(text,type=''){const div=document.createElement('div');div.className='toast '+type;div.textContent=text;$('#toast-container').append(div);setTimeout(()=>div.remove(),4300);}
function bell(){if(!sound)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume();const now=audio.currentTime;[523.25,659.25,783.99].forEach((freq,i)=>{const osc=audio.createOscillator(),gain=audio.createGain();osc.type='sine';osc.frequency.value=freq;gain.gain.setValueAtTime(0,now+i*.13);gain.gain.linearRampToValueAtTime(.08,now+i*.13+.015);gain.gain.exponentialRampToValueAtTime(.001,now+i*.13+.9);osc.connect(gain).connect(audio.destination);osc.start(now+i*.13);osc.stop(now+i*.13+1);});}catch{}}
function showModal(title,eyebrow,content){$('#modal-title').textContent=title;$('#modal-eyebrow').textContent=eyebrow;$('#modal-content').innerHTML=content;if(!modal.open)modal.showModal();}
function dateText(day,short=false){const date=new Date(START_DATE+Math.floor(day)*86400000);return short?`${date.getUTCFullYear()} · ${date.getUTCMonth()+1}.${String(date.getUTCDate()).padStart(2,'0')}`:`${date.getUTCFullYear()}년 ${date.getUTCMonth()+1}월 ${date.getUTCDate()}일`;}
function coordinates(p){return `${Math.abs(p.lat).toFixed(1)}° ${p.lat>=0?'N':'S'}  /  ${Math.abs(p.lon).toFixed(1)}° ${p.lon>=0?'E':'W'}`;}

function renderHUD(){
  $('#money').innerHTML=`${fmt(state.money)} <em>D</em>`;
  $('#cargo-stat').innerHTML=`${usedCargo(state)} <em>/ ${capacity(state)}</em>`;
  $('#food-stat').innerHTML=`${Math.floor(state.food)} <em>일분</em>`;
  $('#food-bar').style.width=`${state.food/160*100}%`;
  $('#cargo-bar').style.width=`${usedCargo(state)/capacity(state)*100}%`;
  $('#game-date').textContent=dateText(state.day);
  $('#visited-stat').textContent=state.visited.length;
  $('#atlas-count').textContent=state.visited.length;
  $('#profit-stat').textContent=fmt(state.profit);
  $('#cargo-count').textContent=`${usedCargo(state)} / ${capacity(state)}`;
  $('#mobile-port-btn span').textContent=selected?`${PORT_BY_ID[selected].name} · 항구 정보 열기`:'항해 정보 열기';
  $('#mobile-port-btn').classList.toggle('hidden',!!state.voyage);
  $('#current-location').textContent=state.voyage?`${toward(state.voyage.target?PORT_BY_ID[state.voyage.target].name:'선택한 해역')} 항해 중`:state.port?`${PORT_BY_ID[state.port].name}에 정박 중`:'바다 위 · 다음 항로를 정하세요';
  $('#sailing-banner').classList.toggle('hidden',!state.voyage);
  if(state.voyage){const v=state.voyage,percent=Math.min(100,v.travelled/v.total*100),days=(v.total-v.travelled)/dailySpeed(state),name=v.target?PORT_BY_ID[v.target].name:'새로운 해역';$('#sail-title').textContent=paused?`${name} · 일시 정지`:`${toward(name)} 항해 중`;$('#sail-percent').textContent=Math.floor(percent)+'%';$('#voyage-bar').style.width=percent+'%';$('#sail-remaining').textContent=`${fmt(v.total-v.travelled)} 해리 · 약 ${days.toFixed(1)}일 남음`;$('#pause-btn').textContent=paused?'▶':'Ⅱ';$('#pause-btn').setAttribute('aria-label',paused?'항해 재개':'항해 일시 정지');}
  $$('[data-speed]').forEach(b=>b.classList.toggle('active',Number(b.dataset.speed)===state.speed));
}

function renderMission(){
  const current=MISSIONS.find(m=>!state.missions.includes(m.id));
  if(!current){$('#mission-index').textContent='04 / 04';$('#mission-title').textContent='전설이 된 항해사';$('#mission-desc').textContent='모든 의뢰를 달성했어요. 나머지 항구를 찾아 당신만의 항로를 완성하세요.';$('#mission-steps').innerHTML=`<div class="mission-step done"><i>✓</i>모든 의뢰 달성</div>`;$('#mission-reward').textContent='COMPLETE';return;}
  const index=MISSIONS.indexOf(current);$('#mission-index').textContent=`0${index+1} / 04`;$('#mission-title').textContent=current.name;$('#mission-desc').textContent=current.desc;$('#mission-reward').textContent=`+${fmt(current.reward)} D`;
  const continents=new Set(state.visited.map(id=>PORT_BY_ID[id].region));
  const steps=index===0?[[state.boughtLisbonWine,'리스본에서 와인 구매'],[state.soldAway,'다른 항구에서 와인 판매']]:index===1?[[state.visited.length>=5,`방문한 항구 ${state.visited.length} / 5`]]:index===2?[['유럽','아프리카','아시아'].map(r=>[continents.has(r),r])].flat():[[state.profit>=3000,`무역 이익 ${fmt(state.profit)} / 3,000 D`]];
  $('#mission-steps').innerHTML=steps.map(([done,text])=>`<div class="mission-step ${done?'done':''}"><i>${done?'✓':''}</i>${text}</div>`).join('');
}
function checkMissions(){
  const continents=new Set(state.visited.map(id=>PORT_BY_ID[id].region));
  const complete=[state.soldAway,state.visited.length>=5,['유럽','아프리카','아시아'].every(c=>continents.has(c)),state.profit>=3000];
  MISSIONS.forEach((m,i)=>{if(complete[i]&&!state.missions.includes(m.id)){state.missions.push(m.id);state.money+=m.reward;log(`의뢰 달성: ${m.name}. 보상 ${fmt(m.reward)} D!`,'reward');toast(`✦ ${m.name} 달성! +${fmt(m.reward)} D`,'discovery');bell();}});
  renderMission();
}

function renderPanel(){
  const p=PORT_BY_ID[selected],atPort=p&&state.port===p.id&&!state.voyage;
  const visited=p&&state.visited.includes(p.id);
  $('#port-name').innerHTML=p?`${p.name} <em>${p.en}</em>`:'바다 위 <em>Open Sea</em>';
  $('#port-region').textContent=p?`${p.region} · ${p.country}`:'세상의 바다 · 새로운 항로';
  $('#port-description').textContent=p?p.fact:'바다는 이어져 있어요. 가까운 항구를 선택해 다음 여행을 준비하세요.';
  $('#port-coordinates').innerHTML=(p?coordinates(p):coordinates({lon:state.position[0],lat:state.position[1]}))+(visited&&!state.quiz.includes(p.id)?' <button class="quiz-link" id="port-quiz">지리 퀴즈 +100 D ↗</button>':'');
  $('#port-quiz')?.addEventListener('click',()=>quiz(p));
  $('#port-badge').textContent=atPort?'정박 중':visited?'방문한 항구':p?'미발견 항구':'항해 가능';
  $('#port-badge').classList.toggle('unknown',!atPort&&!visited);
  $('#scene-label').textContent=p?'PORT OF '+p.en.toUpperCase():'THE OPEN SEA';
  $('#trade-heading').textContent=atPort?'이 항구의 교역품':'현지 시세 · 도착 후 거래 가능';
  $('#market').innerHTML=p?p.market.map(id=>{
    const g=GOODS[id],unit=price(p.id,id,state.day);
    return `<div class="market-row"><span class="good-icon" style="color:${g.color}">${g.icon}</span><div class="good-name"><strong>${g.name}</strong><small class="${p.specialty===id?'specialty':''}">${p.specialty===id?'✦ 이 항구의 특산물':'교역품'}</small></div><div class="good-price">${unit}<small>D / 상자</small></div><button class="trade-btn" data-buy="${id}" ${atPort?'':'disabled'}>구매</button></div>`;
  }).join(''):'<div class="empty-cargo">가까운 항구에 들어가면<br>교역소를 이용할 수 있어요.</div>';
  $('#cargo-list').innerHTML=Object.entries(state.cargo).filter(([,c])=>c.qty>0).map(([id,c])=>{
    const g=GOODS[id],unit=p?sellPrice(p.id,id,state.day):0,margin=unit-c.cost/c.qty;
    return `<div class="cargo-row"><span class="good-icon" style="color:${g.color}">${g.icon}</span><div class="good-name"><strong>${g.name} · ${c.qty}상자</strong><small>매입 평균 ${fmt(c.cost/c.qty)} D${p?` · ${margin>=0?'+':''}${fmt(margin)} D / 상자`:''}</small></div><div class="good-price">${p?unit:'—'}<small>판매가</small></div><button class="trade-btn" data-sell="${id}" ${atPort?'':'disabled'}>판매</button></div>`;
  }).join('')||'<div class="empty-cargo">화물창이 비어 있어요.<small>특산물을 싣고 새로운 바다로 떠나세요.</small></div>';
  $$('[data-buy]').forEach(b=>b.onclick=()=>tradeDialog('buy',b.dataset.buy));
  $$('[data-sell]').forEach(b=>b.onclick=()=>tradeDialog('sell',b.dataset.sell));
  const nextCost=[1800,4200][state.level],shipNames=['작은 캐러벨','무역 캐러벨','원양 범선'];
  $('#ship-content').innerHTML=`<div class="ship-card"><div class="eyebrow">YOUR SHIP · LEVEL ${state.level+1}</div><h3>${shipNames[state.level]} ‘새벽바람’</h3><p>든든한 배 한 척과 수평선 너머의 꿈.<br>선박을 개량하면 더 멀리, 더 많이 운반할 수 있어요.</p><div class="ship-details"><span>적재량 ${capacity(state)}상자</span><span>하루 ${dailySpeed(state)}해리</span></div><button class="service-button" id="supply-btn" ${state.port&&!state.voyage&&state.food<160?'':'disabled'}><div>식량 보급 · +30일분<small>최대 160일분 · 항구에서 보급 가능</small></div><span>${fmt(Math.min(30,160-state.food)*2)} D</span></button><button class="service-button" id="upgrade-btn" ${state.port&&!state.voyage&&state.level<2?'':'disabled'}><div>${state.level<2?'선박 업그레이드':'최대 개량 완료'}<small>${state.level<2?`화물칸 ${[65,100][state.level]}상자 · 하루 ${[440,520][state.level]}해리`:'이제 어느 바다든 향할 수 있어요.'}</small></div><span>${state.level<2?fmt(nextCost)+' D':'✓'}</span></button><button class="service-button" id="rescue-btn" ${!state.port&&!state.voyage?'':'disabled'}><div>구조선 호출<small>리스본으로 귀환 · 화물 유지 · 식량 30 보급</small></div><span>최대 150 D</span></button></div>`;
  $('#supply-btn').onclick=()=>{if(!state.port||state.voyage)return;const amount=Math.min(30,160-state.food),cost=Math.ceil(amount*2);if(state.money<cost){toast('보급할 두카트가 부족해요. 화물을 판매해보세요.','error');return;}state.food+=amount;state.money-=cost;log(`식량 ${Math.round(amount)}일분을 보급했습니다. −${cost} D`);toast(`식량 +${Math.round(amount)}일분`);changed();};
  $('#upgrade-btn').onclick=()=>{if(!state.port||state.voyage||state.level>=2)return;if(state.money<nextCost){toast(`개량에 ${fmt(nextCost)} D가 필요해요.`,'error');return;}state.money-=nextCost;state.level++;log(`선박을 ${toward(shipNames[state.level])} 개량했습니다.`,'reward');toast('✦ 더 넓은 바다를 향해! 선박 개량 완료.','discovery');bell();changed();if(planned)planDestination(planned.target,planned.point,false);};
  $('#rescue-btn').onclick=()=>{if(state.port||state.voyage)return;showModal('구조선을 부를까요?','RETURN TO HARBOR',`<p>현재 위치에서 리스본으로 돌아갑니다. 구조비는 최대 150 D이며, 화물은 그대로 유지돼요. 식량 30일분과 함께 다시 출항할 수 있어요.</p><button class="primary-button" id="confirm-rescue">구조선 호출 · ${fmt(Math.min(150,state.money))} D</button>`);$('#confirm-rescue').onclick=()=>{state.money=Math.max(0,state.money-150);state.port='lisbon';state.position=[-9.14,38.72];state.food=Math.max(30,state.food);state.day+=3;selected='lisbon';planned=null;log('구조선의 도움으로 리스본에 귀환했습니다.');modal.close();changed();centerShip();};};
  renderSailButton();renderHUD();
}
function renderSailButton(){
  const btn=$('#sail-btn'),p=PORT_BY_ID[selected],atPort=p&&state.port===p.id;
  const box=$('#route-box');box.classList.toggle('hidden',!planned||!!state.voyage);
  if(planned&&!state.voyage){const estimate=voyageEstimate(state,planned.route);box.innerHTML=`<div>예상 항해 거리<strong>${fmt(planned.route.total)} <em>해리</em></strong></div><div>예상 소요 시간<strong>${estimate.days.toFixed(1)} <em>일</em></strong></div><p>식량 약 ${estimate.food}일분 필요 · 실제 바다를 따라 계산한 항로</p>`;}
  if(state.voyage){btn.disabled=true;btn.innerHTML=`${icon('wind')}<span>항해 중 · 도착을 기다려주세요</span>`;$('#sail-hint').textContent='지도 아래에서 배속을 조절할 수 있어요.';}
  else if(atPort&&!planned){btn.disabled=true;btn.innerHTML=`${icon('anchor')}<span>${p.name}에 정박 중</span>`;$('#sail-hint').textContent='지도에서 다음 항구를 골라보세요.';}
  else if(planned){const e=voyageEstimate(state,planned.route),enough=state.food>=e.food;btn.disabled=!enough;btn.innerHTML=`${icon('ship')}<span>${enough?`${toward(p?p.name:'선택한 해역')} 출항`:'식량을 먼저 보급하세요'}</span><b>→</b>`;$('#sail-hint').textContent=enough?'좋은 바람과 함께, 새로운 항로를 시작하세요.':'선박 · 보급 탭에서 식량을 채울 수 있어요.';}
  else{btn.disabled=true;btn.innerHTML=`${icon('compass')}<span>지도에서 목적지를 선택하세요</span>`;$('#sail-hint').textContent='항구나 바다를 눌러 항로를 정하세요.';}
}
function changed(){checkMissions();renderHUD();renderPanel();renderPorts();renderShip();save();}

function tradeDialog(mode,id){
  if(state.port!==selected||state.voyage)return;
  const g=GOODS[id],unit=mode==='buy'?price(selected,id,state.day):sellPrice(selected,id,state.day);
  const max=mode==='buy'?Math.min(capacity(state)-usedCargo(state),Math.floor(state.money/unit)):state.cargo[id]?.qty||0;
  if(max<=0){toast(mode==='buy'?(usedCargo(state)>=capacity(state)?'화물칸이 가득 찼어요. 먼저 화물을 판매하세요.':'두카트가 부족해요.'):'판매할 화물이 없어요.','error');return;}
  showModal(`${g.name} ${mode==='buy'?'구매':'판매'}`,'MERCHANT’S EXCHANGE',`<p>${PORT_BY_ID[selected].name} 교역소 · 상자당 ${unit} D<br>${mode==='buy'?`구매 가능 ${max}상자 · 남은 화물칸 ${capacity(state)-usedCargo(state)}`:`보유 ${max}상자 · 매입 평균 ${fmt(state.cargo[id].cost/state.cargo[id].qty)} D`}</p><div class="qty-picker"><button id="qty-minus" aria-label="수량 줄이기">−</button><input id="trade-qty" aria-label="거래 수량" type="number" min="1" max="${max}" value="${Math.min(10,max)}"><button id="qty-plus" aria-label="수량 늘리기">+</button><button id="qty-max" style="font:11px var(--sans);width:48px">최대</button></div><div class="trade-total"><span>총 ${mode==='buy'?'구매':'판매'} 금액</span><strong id="trade-total"></strong></div><p class="trade-note">${mode==='buy'?'지역 특산물은 저렴하게 구입할 수 있어요. 다른 지역의 항구에서는 더 높은 값에 팔 수 있습니다.':'다른 항구에서 온 교역품은 여행한 거리만큼 새로운 가치를 얻어요.'}</p><button class="primary-button" id="confirm-trade">${mode==='buy'?'구매 확정':'판매 확정'}</button>`);
  const input=$('#trade-qty');const update=()=>{let qty=Number(input.value);if(!Number.isFinite(qty))qty=1;qty=Math.max(1,Math.min(max,Math.floor(qty)));input.value=qty;$('#trade-total').textContent=fmt(qty*unit)+' D';};
  input.oninput=()=>{$('#trade-total').textContent=fmt(Math.max(0,Math.min(max,Number(input.value)||0))*unit)+' D';};input.onchange=update;
  $('#qty-minus').onclick=()=>{input.value=Number(input.value)-1;update();};$('#qty-plus').onclick=()=>{input.value=Number(input.value)+1;update();};$('#qty-max').onclick=()=>{input.value=max;update();};update();
  $('#confirm-trade').onclick=()=>{update();const result=(mode==='buy'?buy:sell)(state,id,Number(input.value));if(!result.ok){toast(result.error,'error');return;}const text=mode==='buy'?`${g.name} ${result.qty}상자 구매. −${fmt(result.total)} D`:`${g.name} ${result.qty}상자 판매. +${fmt(result.total)} D (이익 ${result.profit>=0?'+':''}${fmt(result.profit)} D)`;log(text,'trade');toast(text);modal.close();changed();};
}

function setTab(tab){activeTab=tab;$('#trade-tab').classList.toggle('active',tab==='trade');$('#ship-tab').classList.toggle('active',tab==='ship');$('#trade-content').classList.toggle('hidden',tab!=='trade');$('#ship-content').classList.toggle('hidden',tab!=='ship');}

function geoPath(geometry){
  const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;
  return polygons.map(rings=>rings.map(ring=>ring.map((p,i)=>{const [x,y]=project(p);return `${i?'L':'M'}${x.toFixed(2)},${y.toFixed(2)}`;}).join('')+'Z').join('')).join('');
}
function svgEl(name,attrs={}){const el=document.createElementNS('http://www.w3.org/2000/svg',name);for(const [key,value]of Object.entries(attrs))el.setAttribute(key,value);return el;}
function setupMap(land,countries){
  for(const f of land.features){const d=geoPath(f.geometry);$('#coast-shadow').append(svgEl('path',{d}));$('#land').append(svgEl('path',{d}));}
  for(const f of countries.features)$('#borders').append(svgEl('path',{d:geoPath(f.geometry)}));
  let grid='';for(let lon=-180;lon<=180;lon+=30){const x=project([lon,0])[0];grid+=`M${x} 0V800`;const t=svgEl('text',{x:x+5,y:790});t.textContent=Math.abs(lon)+'°';$('#graticule').append(t);}for(let lat=-60;lat<=80;lat+=20){const y=project([0,lat])[1];grid+=`M0 ${y}H1600`;const t=svgEl('text',{x:12,y:y-6});t.textContent=Math.abs(lat)+'°';$('#graticule').append(t);}$('#graticule').append(svgEl('path',{d:grid}));
  const labels=[[-39,28,'ATLANTIC',false],[-31,18,'OCEAN',false],[73,-19,'INDIAN OCEAN',false],[-128,4,'PACIFIC',false],[164,8,'PACIFIC',false],[-105,47,'북아메리카',true],[-57,-13,'남아메리카',true],[22,13,'아프리카',true],[65,50,'아시아',true],[132,-26,'오세아니아',true]];
  for(const [lon,lat,label,continent]of labels){const [x,y]=project([lon,lat]);const t=svgEl('text',{x,y,class:continent?'continent-label':''});t.textContent=label;$('#map-labels').append(t);}
  mapReady=true;$('#map-loading').remove();resizeMap();renderRoutes();renderShip();
}
function resizeMap(){const box=$('.chart').getBoundingClientRect();screen.w=box.width;screen.h=box.height;$('#world-map').setAttribute('viewBox',`0 0 ${screen.w} ${screen.h}`);applyCamera();}
function applyCamera(){
  const oldScale=screen.k;
  screen.k=Math.min(screen.w/1600,screen.h/800)*camera.zoom;
  $('#map-camera').setAttribute('transform',`translate(${screen.w/2},${screen.h/2}) scale(${screen.k}) translate(${-camera.x},${-camera.y})`);
  $('#zoom-label').textContent=Math.round(camera.zoom*100)+'%';if(Math.abs(oldScale-screen.k)>.00001||!$('#port-markers').children.length)renderPorts();renderShip();
}
const labelOffsets={lisbon:[-13,-12,'end'],seville:[10,23,'start'],london:[-12,-15,'end'],amsterdam:[12,-6,'start'],venice:[10,19,'start'],alexandria:[12,5,'start'],accra:[-11,3,'end'],cape:[-11,3,'end'],zanzibar:[12,3,'start'],muscat:[10,-9,'start'],goa:[10,1,'start'],malacca:[-12,2,'end'],batavia:[12,18,'start'],macau:[-12,-8,'end'],nagasaki:[13,13,'start'],busan:[-12,-11,'end'],havana:[-11,-10,'end'],cartagena:[-12,4,'end'],recife:[12,4,'start'],buenos:[-12,4,'end'],sydney:[12,4,'start']};
function renderPorts(){
  if(!mapReady)return;
  const root=$('#port-markers');root.replaceChildren();
  for(const p of PORTS){
    const [x,y]=project([p.lon,p.lat]),visited=state.visited.includes(p.id),chosen=selected===p.id;
    const g=svgEl('g',{class:`port-marker ${visited?'visited':''} ${chosen?'selected':''}`,transform:`translate(${x},${y}) scale(${1/screen.k})`,role:'button',tabindex:'0','aria-label':`${p.name}, ${p.country}${visited?', 방문함':''}`,'data-port':p.id});
    g.append(svgEl('circle',{r:17,class:'marker-hit'}));
    if(chosen)g.append(svgEl('circle',{r:13,class:'selection-ring'}));
    g.append(svgEl('circle',{r:5,class:'marker-outer'}),svgEl('circle',{r:1.8,class:'marker-inner'}));
    const crowded=['amsterdam','venice','nagasaki'];
    const showLabel=chosen||camera.zoom>1.7||!crowded.includes(p.id);
    if(showLabel){const [dx,dy,anchor]=labelOffsets[p.id];const text=svgEl('text',{x:dx,y:dy,'text-anchor':anchor,class:'port-text'});text.textContent=p.name;g.append(text);if(chosen){const en=svgEl('text',{x:dx,y:dy+13,'text-anchor':anchor,class:'port-text port-subtitle'});en.textContent=p.en.toUpperCase();g.append(en);}}
    const title=svgEl('title');title.textContent=`${p.name} · ${p.country} · 특산물 ${GOODS[p.specialty].name}`;g.append(title);
    g.onclick=e=>{e.stopPropagation();if(dragged)return;selectPort(p.id);};g.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectPort(p.id);}};root.append(g);
  }
}
function routePath(path){let d='';let prev=null;for(const p of path){const [x,y]=project(p);d+=`${!prev||Math.abs(x-prev[0])>800?'M':'L'}${x},${y}`;prev=[x,y];}return d;}
function renderRoutes(){
  const root=$('#routes');root.replaceChildren();
  if(state.voyage)root.append(svgEl('path',{d:routePath(state.voyage.path),class:'voyage-line','vector-effect':'non-scaling-stroke'}));
  else if(planned)root.append(svgEl('path',{d:routePath(planned.route.path),class:'route-line','vector-effect':'non-scaling-stroke'}));
}
function renderShip(){
  if(!mapReady)return;let [x,y]=project(state.position);let angle=0;
  if(state.voyage){const next=positionAlong(state.voyage,Math.min(state.voyage.total,state.voyage.travelled+12)),p=project(next);if(Math.abs(p[0]-x)<800)angle=Math.atan2(p[1]-y,p[0]-x)*180/Math.PI+90;}
  if(state.port){x-=15/screen.k;y+=9/screen.k;}
  // The map uses screen-sized icons, so the ship stays readable while zooming.
  $('#ship-marker').setAttribute('transform',`translate(${x},${y}) scale(${.78/screen.k}) rotate(${angle})`);
}
function selectPort(id){
  selected=id;setTab('trade');
  if(!state.voyage&&state.port!==id)planDestination(id,[PORT_BY_ID[id].lon,PORT_BY_ID[id].lat],false);
  else {planned=null;renderRoutes();renderPanel();renderPorts();}
  if(innerWidth<=850)$('#port-panel').scrollIntoView({behavior:'smooth',block:'start'});
}
function planDestination(target,point,scroll=true){
  if(!nav||state.voyage)return;
  if(target)selected=target;else selected=null;
  const route=nav.route(state.position,point);
  if(!route||route.total<.5){planned=null;toast('이곳까지의 항로를 찾지 못했어요. 가까운 바다나 다른 항구를 선택하세요.','error');renderPanel();renderRoutes();return;}
  planned={target,point,route};renderRoutes();renderPanel();renderPorts();
  if(scroll&&innerWidth<=850)$('#port-panel').scrollIntoView({behavior:'smooth',block:'start'});
}
function startVoyage(){
  if(!planned||state.voyage)return;const estimate=voyageEstimate(state,planned.route);if(state.food<estimate.food){toast('식량을 먼저 보급하세요.','error');return;}
  state.voyage={...planned.route,target:planned.target,travelled:0,foodRemaining:estimate.food};state.port=null;paused=false;planned=null;log(`${toward(state.voyage.target?PORT_BY_ID[state.voyage.target].name:'새로운 해역')} 출항. 총 ${fmt(state.voyage.total)}해리.`, 'sailing');toast('⚓ 출항! 새로운 바다가 기다립니다.');modal.close();renderRoutes();renderPanel();renderHUD();centerShip();save();
  if(innerWidth<=850)$('.chart').scrollIntoView({behavior:'smooth',block:'start'});
}
function arrive(){
  const v=state.voyage;state.position=v.path.at(-1);state.port=v.target;state.voyage=null;planned=null;selected=v.target;paused=false;followShip=false;
  let discovery=false;
  if(v.target){const p=PORT_BY_ID[v.target];discovery=!state.visited.includes(p.id);if(discovery){state.visited.push(p.id);state.money+=120;log(`${p.name} 발견! ${p.country} · ${p.sea}. 발견 보상 +120 D`,'discovery');toast(`✦ 새로운 항구, ${p.name}! +120 D`,'discovery');}else{log(`${p.name}에 입항했습니다.`);toast(`⚓ ${p.name}에 도착했습니다.`);}bell();}else{log('목표 해역에 도착했습니다. 다음 항로를 선택하세요.');toast('목표 해역에 도착했어요. 가까운 항구로 향해보세요.');}
  changed();renderRoutes();
  if(discovery){const p=PORT_BY_ID[v.target];showModal(`${p.name}, 새로운 발견`,'A NEW PAGE IN YOUR ATLAS',`<p style="color:var(--gold);font-size:11px">${p.country} · ${p.region} · ${coordinates(p)}</p><p>${p.fact}</p><p class="help-tip">지리 수첩에 새로운 항구가 기록됐어요.<br>발견 보상 <strong>+120 D</strong></p><button class="primary-button" id="discovery-quiz">지리 퀴즈에 도전 · +100 D</button><button class="service-button" id="discovery-close">항구 둘러보기 <span>→</span></button>`);$('#discovery-close').onclick=()=>modal.close();$('#discovery-quiz').onclick=()=>quiz(p);}
}

function quiz(p){
  if(!state.visited.includes(p.id)||state.quiz.includes(p.id))return;
  const alternatives=PORTS.map(q=>q.sea).filter((v,i,a)=>v!==p.sea&&a.indexOf(v)===i).slice(0,3),options=[p.sea,...alternatives].sort((a,b)=>a.localeCompare(b,'ko'));
  showModal(`${p.name}의 바다를 기억하나요?`,'GEOGRAPHY NOTEBOOK',`<p>${p.name} 항구는 ${p.country}에 있어요.<br>이 항구가 마주한 바다 또는 해역은 어디일까요?</p><div class="quiz-options">${options.map((o,i)=>`<button data-answer="${i}">${o}</button>`).join('')}</div><p class="modal-meta">정답 보상 100 D · 항구마다 한 번만 도전할 수 있어요.</p>`);
  $$('[data-answer]').forEach(b=>b.onclick=()=>{const correct=options[Number(b.dataset.answer)]===p.sea;state.quiz.push(p.id);if(correct){state.money+=100;log(`지리 퀴즈 정답: ${p.name} · ${p.sea}. +100 D`,'reward');bell();}else log(`지리 수첩: ${p.name}이 마주한 해역은 ${p.sea}입니다.`);showModal(correct?'정답! 항로를 하나 더 배웠어요.':'새로운 지식을 항해 수첩에.','GEOGRAPHY NOTEBOOK',`<p><strong style="color:var(--gold)">${p.name} → ${p.sea}</strong></p><p>${p.fact}</p><p>${correct?'보상 +100 D가 지급됐어요.':'다음 항구에서는 정답을 맞혀보세요.'}</p><button class="primary-button" id="quiz-close">다음 항해 준비하기</button>`);$('#quiz-close').onclick=()=>modal.close();changed();});
}
function showAtlas(){
  const regions=new Set(state.visited.map(id=>PORT_BY_ID[id].region));showModal('내가 발견한 세상','THE EXPLORER’S ATLAS',`<div class="atlas-summary"><span><b>${state.visited.length}<small>/ ${PORTS.length} 항구</small></b></span><span><b>${regions.size}<small>/ 5 대륙</small></b></span><span><b>${state.quiz.length}<small>지리 기록</small></b></span></div><div class="atlas-grid">${PORTS.map(p=>`<button class="atlas-port ${state.visited.includes(p.id)?'':'unvisited'}" data-atlas="${p.id}"><strong>${state.visited.includes(p.id)?'⚑':'◇'} ${p.name}</strong><span>${p.country} · ${p.region}</span></button>`).join('')}</div><p class="modal-meta">국가명은 현재의 지리 학습을 위한 표기입니다. 상품과 시세, 연도는 게임 설정이며 역사적 무역을 재현한 수치는 아닙니다.</p>`);$$('[data-atlas]').forEach(b=>b.onclick=()=>{modal.close();selectPort(b.dataset.atlas);const p=project([PORT_BY_ID[b.dataset.atlas].lon,PORT_BY_ID[b.dataset.atlas].lat]);camera.x=p[0];camera.y=p[1];camera.zoom=Math.max(camera.zoom,1.8);applyCamera();});
}
function showJournal(){showModal('파도 위에 남긴 기록','THE CAPTAIN’S JOURNAL',`<div class="atlas-summary"><span><b>${Math.floor(state.day)}<small>항해 일수</small></b></span><span><b>${state.trades}<small>거래 횟수</small></b></span><span><b>${fmt(state.profit)}<small>무역 이익 D</small></b></span></div>${state.log.map(l=>`<div class="log-entry"><time>${dateText(l.day,true)}</time><p>${l.text}</p></div>`).join('')}<p class="modal-meta">최근 50개의 기록이 보관됩니다. 게임은 이 브라우저에 자동 저장됩니다.</p>`);}
function showHelp(){showModal('당신만의 항로를 그려보세요','WELCOME ABOARD, CAPTAIN',`<p>바람을 따라 항구를 발견하고, 특산물을 거래하며<br>세계의 지리를 익히는 작은 항해 게임입니다.</p><div class="help-step"><b>01</b><div><h3>리스본의 와인을 화물창에 싣기</h3><p>교역소에서 와인을 구매하세요. 특산물은 다른 항구보다 저렴해요.</p></div></div><div class="help-step"><b>02</b><div><h3>지도에서 다음 항구 선택 → 출항</h3><p>첫 목적지는 가까운 세비야를 추천해요. 경로와 필요한 식량을 확인하고 출항하세요. 바다를 눌러 자유 항해도 할 수 있어요.</p></div></div><div class="help-step"><b>03</b><div><h3>판매하고, 발견하고, 더 멀리 나아가기</h3><p>도착한 항구에서 화물을 판매하세요. 새 항구 발견과 지리 퀴즈로 보상을 얻고 선박을 개량할 수 있어요.</p></div></div><p class="help-tip">지도 드래그: 이동 · 휠 또는 +/−: 확대/축소<br>스페이스: 항해 일시 정지 · 1/2/4: 항해 배속<br>항구에 정박하면 식량이 소모되지 않아요.</p><button class="primary-button" id="start-game">좋아, 항해를 시작하자 ${icon('ship')}</button><p class="modal-meta">지도: <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener">Natural Earth</a> (퍼블릭 도메인) · 국가명은 현재 기준. 항로와 해안선은 게임용으로 단순화했어요. 진행 상황은 브라우저에 자동 저장됩니다.</p><button class="reset-button" id="reset-btn">새 항해 시작 · 저장된 진행 초기화</button>`);$('#start-game').onclick=()=>{modal.close();storage.setItem('windward-intro-seen','1');};$('#reset-btn').onclick=()=>{showModal('새로운 항해를 시작할까요?','A FRESH START','<p>현재 화물, 두카트, 발견한 항구 기록이 초기화됩니다.</p><button class="primary-button" id="confirm-reset">초기화하고 리스본에서 시작</button><button class="service-button" id="cancel-reset">현재 항해 계속하기 <span>→</span></button>');$('#cancel-reset').onclick=()=>modal.close();$('#confirm-reset').onclick=()=>{state=initialState();selected='lisbon';planned=null;paused=false;modal.close();setTab('trade');changed();renderRoutes();centerShip();toast('리스본에서 새로운 항해를 시작합니다.');};};}

function centerShip(){const [x,y]=project(state.position);camera.x=x;camera.y=y;camera.zoom=Math.max(camera.zoom,innerWidth<=850?3:2);followShip=!!state.voyage;applyCamera();}
function zoom(factor,point=null){
  followShip=false;
  const old=screen.k;camera.zoom=Math.max(.85,Math.min(7,camera.zoom*factor));const k=Math.min(screen.w/1600,screen.h/800)*camera.zoom;
  if(point){camera.x+=(point[0]-screen.w/2)*(1/old-1/k);camera.y+=(point[1]-screen.h/2)*(1/old-1/k);}applyCamera();
}
const world=$('#world-map');
world.addEventListener('pointerdown',e=>{if(e.button!==0)return;dragged=false;drag={x:e.clientX,y:e.clientY,cx:camera.x,cy:camera.y,id:e.pointerId};if(!e.target.closest('.port-marker'))world.setPointerCapture(e.pointerId);});
world.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>5)dragged=true;if(dragged){followShip=false;camera.x=Math.max(0,Math.min(1600,drag.cx-dx/screen.k));camera.y=Math.max(0,Math.min(800,drag.cy-dy/screen.k));applyCamera();}});
function endDrag(e){if(!drag)return;const didDrag=dragged;drag=null;if(world.hasPointerCapture(e.pointerId))world.releasePointerCapture(e.pointerId);if(didDrag){setTimeout(()=>dragged=false,0);return;}if(e.target.closest('.port-marker'))return;const rect=world.getBoundingClientRect(),point=unproject([(e.clientX-rect.left-screen.w/2)/screen.k+camera.x,(e.clientY-rect.top-screen.h/2)/screen.k+camera.y]);if(!nav)return;if(state.voyage){toast('현재 항해가 끝나면 다음 항로를 선택할 수 있어요.');return;}if(nav.isLand(point)){toast('육지에는 배가 갈 수 없어요. 항구나 바다를 선택하세요.');return;}planDestination(null,point);}
world.addEventListener('pointerup',endDrag);world.addEventListener('pointercancel',()=>{drag=null;dragged=false;});
world.addEventListener('wheel',e=>{e.preventDefault();const rect=world.getBoundingClientRect();zoom(e.deltaY<0?1.15:1/1.15,[e.clientX-rect.left,e.clientY-rect.top]);},{passive:false});
$('#zoom-in').onclick=()=>zoom(1.3);$('#zoom-out').onclick=()=>zoom(1/1.3);$('#home-map').onclick=centerShip;
$('#world-view').onclick=()=>{followShip=false;camera={x:800,y:400,zoom:1};applyCamera();};
$('#sail-btn').onclick=startVoyage;$('#trade-tab').onclick=()=>setTab('trade');$('#ship-tab').onclick=()=>setTab('ship');
$('#mobile-port-btn').onclick=()=>$('#port-panel').scrollIntoView({behavior:'smooth',block:'start'});
$('#help-btn').onclick=showHelp;$('#journal-btn').onclick=showJournal;$('#atlas-btn').onclick=showAtlas;
$('#map-tab').onclick=()=>{modal.close();$('.chart').scrollIntoView({behavior:'smooth'});};
$('#close-modal').onclick=()=>modal.close();modal.addEventListener('click',e=>{if(e.target===modal){const rect=modal.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)modal.close();}});
$('#pause-btn').onclick=()=>{paused=!paused;renderHUD();};
$$('[data-speed]').forEach(b=>b.onclick=()=>{state.speed=Number(b.dataset.speed);renderHUD();save();});
$('#sound-btn').onclick=()=>{sound=!sound;$('#sound-btn').innerHTML=`♬ <span>소리 ${sound?'켬':'끔'}</span>`;$('#sound-btn').setAttribute('aria-label',`항구 종소리 ${sound?'끄기':'켜기'}`);if(sound)bell();};
document.addEventListener('keydown',e=>{if(modal.open||['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return;if(e.code==='Space'&&state.voyage){e.preventDefault();paused=!paused;renderHUD();}if(['1','2','4'].includes(e.key)){state.speed=Number(e.key);renderHUD();save();}});
window.addEventListener('beforeunload',save);document.addEventListener('visibilitychange',()=>{if(document.hidden)save();});
new ResizeObserver(()=>{if(mapReady)resizeMap();}).observe($('.chart'));

let last=performance.now(),lastHud=0,lastSave=0;
function tick(now){
  const delta=Math.min((now-last)/1000,.1);last=now;
  if(state.voyage&&!paused&&!modal.open&&!document.hidden){
    const v=state.voyage,remaining=v.total-v.travelled,move=Math.min(remaining,dailySpeed(state)*delta*1.3*state.speed),days=move/dailySpeed(state);
    v.travelled+=move;state.day+=days;state.food=Math.max(0,state.food-days*.9);v.foodRemaining=Math.max(0,v.foodRemaining-days*.9);state.position=positionAlong(v,v.travelled);if(followShip){const [x,y]=project(state.position);camera.x=x;camera.y=y;applyCamera();}else renderShip();
    if(v.travelled>=v.total-.01)arrive();
    if(now-lastHud>150){renderHUD();lastHud=now;}if(now-lastSave>1800){save();lastSave=now;}
  }
  frame=requestAnimationFrame(tick);
}

renderHUD();renderMission();renderPanel();$('#latest-log').textContent=state.log[0]?.text||'당신의 항로를 시작하세요.';
try{
  const responses=await Promise.all(['assets/world-land.geojson','assets/world-countries.geojson','assets/navigation.json'].map(url=>fetch(url).then(r=>{if(!r.ok)throw Error('지도 데이터 오류');return r.json();})));
  nav=new Navigator(responses[2]);setupMap(responses[0],responses[1]);if(state.voyage)centerShip();requestAnimationFrame(tick);
  // Keep the first view playable; help is available through the ? button.
  if(!storage.getItem('windward-intro-seen')){toast('⚓ 환영합니다! 와인을 싣고 지도에서 다음 항구를 골라보세요.');storage.setItem('windward-intro-seen','1');}
}catch(error){$('#map-loading').innerHTML='<p>지도를 불러오지 못했어요.</p><button class="primary-button" style="width:180px" onclick="location.reload()">다시 불러오기</button>';console.error(error);}
