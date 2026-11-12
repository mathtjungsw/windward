import {discoveryStudy,discoveryCoordinates} from './discovery-study.js?v=2026.11.12-collections-ranks-historic-ships.2';
import {HISTORICAL_SHIPS,turtleShipyard} from './historical-ships.js?v=2026.11.12-collections-ranks-historic-ships.2';
import {historicalArt} from './historical-ship-art.js?v=2026.11.12-collections-ranks-historic-ships.2';
import {vesselGunLimits} from './cannons.js?v=2026.11.12-collections-ranks-historic-ships.2';
import {OFFICERS} from './rumor-catalog.js?v=2026.11.12-collections-ranks-historic-ships.2';
import {gearOnShip,tradeGear} from './rumor-progress.js?v=2026.11.12-collections-ranks-historic-ships.2';
import {RANK_DEFINITIONS,formatRankScore} from './rank-metrics.js?v=2026.11.12-collections-ranks-historic-ships.2';
import {PORTS,PORT_BY_ID} from './data.js?v=2026.11.12-collections-ranks-historic-ships.2';
import {SHIPS,ship,shipTier,fleetCount,fleetShips,fleetDisplayShips,vesselSeaSpeed,syncFleet,fleetLimit,upgradeCost,additionalShipCost,vesselSpec,STORED_SHIP_LIMIT,storedShips} from './ship-rules.js?v=2026.11.12-collections-ranks-historic-ships.2';
import {mapDistance} from './world-wrap.js?v=2026.11.12-collections-ranks-historic-ships.2';
import {capacity,usedSpace,upgradeShip,addShip,quoteShipSale,sellShip,shipResaleValue,historicalQuote,buildHistoricalShip,quoteShipStorage,storeShip,quoteShipRecall,recallShip} from './engine.js?v=2026.11.12-collections-ranks-historic-ships.2';
import {DISCOVERIES,DISCOVERY_BY_ID} from './discoveries-catalog.js?v=2026.11.12-collections-ranks-historic-ships.2';
import {nearbyDiscoveries,discoveryEntry,discoveryStats,explorationAllowed} from './discoveries.js?v=2026.11.12-collections-ranks-historic-ships.2';
import {shipArt,shipArtPath,collectionArt} from './art.js?v=2026.11.12-collections-ranks-historic-ships.2';
import {lastSeenText} from './captain-time.js?v=2026.11.12-collections-ranks-historic-ships.2';
const $=s=>document.querySelector(s),fmt=n=>Number(n||0).toLocaleString('ko-KR');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KINDS={ruin:'유적',relic:'유물',animal:'동물',treasure:'보물'};
export function createExpansion(api){
 const get=api.getState;let tierKey='',nearKey='',lastFound=null,albumKind='all',albumOwned='all',albumScroll=0,rosterTab='online',rosterPage=[],rosterHistory=[null],rosterIndex=0,rosterBusy=false,busy=false,rosterGeneration=0,detailGeneration=0;
 const summary=document.createElement('section');summary.id='ship-overview';summary.className='ship-overview';$('.navigation-mode .fold-body').append(summary);
 const progress=document.createElement('div');progress.id='exploration-overview';$('.captain-stats').after(progress);
 const find=document.createElement('section');find.id='nearby-discovery';find.className='nearby-discovery';find.hidden=true;$('.navigation-mode .fold-body').append(find);
 const collection=document.createElement('button');collection.id='collection-btn';collection.className='nav-item';collection.innerHTML='<span>✦ 수집 도감</span>';collection.onclick=()=>showAlbum();$('.main-nav').append(collection);
 $('#action-home').textContent='내 배 위치';
 const own=document.createElement('button');own.id='ship-view-btn';own.textContent='내 배 보기';own.onclick=()=>showShip();$('#action-home').after(own);
 const cue=document.createElement('button');cue.className='discovery-alert';cue.dataset.usageKey='action-open-discovery';cue.hidden=true;cue.onclick=()=>showInvestigation();document.querySelector('.chart').append(cue);const dismissed=new Map();let popupScheduled=false;
 function showInvestigation(){const s=get(),list=nearbyDiscoveries(s);if(!list.length)return;api.onDiscoveryPause?.();for(const d of list)dismissed.set(d.id,{at:Date.now(),outside:false});api.onModal('탐험의 흔적을 발견했어요','항해를 잠시 멈췄어요',list.map(d=>{const nm=mapDistance(s.position,d.point),ok=nm<=d.inspectRadius&&api.getNav().clear(s.position,d.point);return `<article class="investigation-row"><h3>${KINDS[d.kind]}의 흔적 · 난도 ${d.tier}</h3><p>현재 ${nm.toFixed(1)}해리 · ${ok?'조사 가능':'조사까지 '+Math.max(0,nm-d.inspectRadius).toFixed(1)+'해리 더 접근 / 같은 바닷길 확인'}</p><div class="dialog-actions"><button data-popup-inspect="${d.id}" class="primary-button" ${ok?'':'disabled'}>조사하기</button><button data-popup-approach="${d.id}">조사 지점으로 이동</button></div></article>`;}).join('')+'<button id="investigation-close">닫기 · 현재 위치에서 정지</button>','small');
  $('#modal').dataset.investigation='true';
  document.querySelectorAll('[data-popup-inspect]').forEach(b=>b.onclick=()=>{api.onClose?.();api.onInspect(b.dataset.popupInspect);});document.querySelectorAll('[data-popup-approach]').forEach(b=>b.onclick=()=>api.onApproach(DISCOVERY_BY_ID[b.dataset.popupApproach]));$('#investigation-close').onclick=()=>api.onClose?.();
 }
 function renderHUD(){
  const s=get(),spec=ship(s),stats=api.getStats();
  const key=shipTier(s)+':'+fleetCount(s);
  if(tierKey!==key){tierKey=key;summary.innerHTML=`<img src="${shipArtPath(shipTier(s))}" alt="${esc(spec.name)}" width="160" height="120"><div><strong>${esc(spec.name)}</strong><span>${shipTier(s)+1} / 20단계 · ${fleetCount(s)}척</span><button class="service-button" id="overview-ship">내 배 보기</button></div>`;$('#overview-ship').onclick=()=>showShip();}
  progress.textContent=`지도 ${stats.explorationPercent.toFixed(2)}% · 발견 ${stats.foundCount}/${DISCOVERIES.length} · 명성 ${fmt(stats.fame)}`;
  const list=nearbyDiscoveries(s),key2=list.map(d=>d.id).join(',')+':'+(lastFound?.id||'')+':'+!!s.detourTarget+':'+explorationAllowed(s);
  for(const [id,value]of dismissed){const d=DISCOVERY_BY_ID[id];if(d&&mapDistance(s.position,d.point)>120)value.outside=true;}
  cue.hidden=!list.length;cue.textContent='◇ 주변 흔적 '+list.length+' · 조사 열기';
  if(!popupScheduled&&list.some(d=>!dismissed.has(d.id)||(dismissed.get(d.id).outside&&Date.now()-dismissed.get(d.id).at>300000))&&api.canShowDiscovery?.()){popupScheduled=true;setTimeout(()=>{popupScheduled=false;if(api.canShowDiscovery?.())showInvestigation();},0);}
  find.hidden=!list.length&&!lastFound&&!s.detourTarget;
  if(key2!==nearKey){nearKey=key2;find.replaceChildren();
   if(lastFound){const note=document.createElement('div');note.className='discovery-result';note.innerHTML=`<strong>✦ ${esc(lastFound.name)} 발견</strong><span>명성 +${lastFound.fame}</span><button id="found-album">도감 보기</button><button id="found-dismiss" aria-label="발견 안내 닫기">×</button>`;find.append(note);$('#found-album').onclick=()=>showAlbum(lastFound.id);$('#found-dismiss').onclick=()=>{lastFound=null;nearKey='';renderHUD();};}
   for(const d of list.slice(0,3)){const row=document.createElement('div');row.className='discovery-cue';row.innerHTML=`<span>◇ ${KINDS[d.kind]}의 흔적 · ${d.tier}단계 난도</span><div><button data-inspect="${d.id}">조사하기</button><button data-approach="${d.id}">조사 지점으로 이동</button></div>`;find.append(row);row.querySelector('[data-inspect]').onclick=()=>api.onInspect(d.id);row.querySelector('[data-approach]').onclick=()=>api.onApproach(d);}
   if(s.detourTarget&&!s.voyage){const b=document.createElement('button');b.dataset.usageKey='action-discovery-resume';b.textContent='원래 항로 계속하기';b.onclick=api.onResumeRoute;find.append(b);}
  }
 }
 function showShip(tab='current'){
  if(tab!=='growth')return showFleet();const rows=fleetShips(get());
  api.onModal('선박의 20단계 성장','뗏목에서 명장의 교역 범선까지',`<button id="growth-back">내 선단으로 돌아가기</button><div class="ship-growth-grid">${SHIPS.map((p,i)=>{const n=rows.filter(v=>v.tier===i).length;return `<article class="growth-step ${n?'current':''}"><img src="${shipArtPath(i)}" alt="${esc(p.name)}" width="160" height="120"><strong>${i+1}. ${esc(p.name)}</strong><span>${p.speed}해리/일 · 보급 ${p.supply}일</span><span>한 척 적재 ${p.capacity}칸</span>${n?`<b>${n}척 보유</b>`:''}</article>`;}).join('')}</div>`,'wide');$('#growth-back').onclick=()=>showFleet();
 }
 function showShipyard(){
  const s=get(),turtle=s.shipyard?.turtleOrder;
  const cards=HISTORICAL_SHIPS.filter(p=>p.id!=='turtle'||s.shipyard?.turtleRumor).map(p=>{
   const q=historicalQuote(s,p.id),spec=q.ship,limits=vesselGunLimits({tier:p.stage-1,kind:p.id});
   const extras=[p.stats.coastSpeed&&'연안 속도 +12%',p.stats.supplyUse&&'보급 소모 −'+Math.round((1-p.stats.supplyUse)*100)+'%',p.stats.openSupply&&'대양 보급 소모 −12%',p.stats.hp&&'한 척 내구도 '+spec.hp,p.stats.trace&&'기함으로 지정하면 흔적 확인 거리 +10해리',p.stats.firstHit&&'기함일 때 해적전 첫 피격 피해 −25%'].filter(Boolean);
   const preview=q.future?`<p>편입 시 속도 ${fmt(q.current.speed)} → ${fmt(q.future.speed)}해리/일 · 최대 보급 ${fmt(q.current.supply)} → ${fmt(q.future.supply)}일 · 적재 ${capacity(s)} → ${q.capacity}칸</p>
      <p>${Number.isFinite(q.future.offshore)?'해안에서 '+fmt(q.future.offshore)+'해리 이내 항해':'해안 거리 제한 없이 항해'}</p>`:'';
   return `<article class="growth-step"><img class="historical-photo" src="${historicalArt(p.id)}" alt="${p.name} 실사풍 재현" loading="lazy" width="480" height="320"><h3>${p.name} · ${p.role}</h3><p class="modal-meta">${p.history}</p><p>${p.portName} 조선소 · ${p.stage}단계 · ${fmt(q.cost)} D</p><p>${q.progress.steps.map(([n,w,label])=>label+' '+Math.min(n,w)+'/'+w).join(' · ')}</p><p>한 척: 해상 ${fmt(spec.speed)}해리/일 · 강 ${fmt(spec.riverSpeed)}해리/일 · 적재 ${spec.capacity} · 대포 ${limits[0]}문 / 무게 ${limits[1]}</p>${extras.length?'<p>'+extras.join(' · ')+'</p>':''}${preview}<button data-build-historical="${p.id}" ${q.ready?'':'disabled'}>건조비 확인</button></article>`;
  }).join('');
  api.onModal('역사 선박 조선소','선박 성장과 활동 조건을 갖추고 지정 항구에서 건조',`<div class="dialog-actions"><button id="shipyard-back">내 선단</button><button id="shipyard-storage">항구에 맡긴 배</button>${s.port==='busan'&&s.shipyard?.turtleRumor&&!turtle?.delivered?`<button id="turtle-order">${turtle?'목재 20상자·구리 10상자 납품':'부산 조선 의뢰 수락'}</button>`:''}</div><p>현재 선단 ${fleetCount(s)}/${fleetLimit(s)}척 · 배를 추가하면 보급을 나누어 싣습니다.</p>${fleetCount(s)>=fleetLimit(s)?'<p class="help-tip">선단이 가득 찼어요. 내 선단에서 배를 항구에 맡긴 뒤 새 배를 건조할 수 있어요.</p>':''}${turtle?'<p>조선 의뢰 표적 · 동중국해 해적 정찰선</p>':''}<p class="modal-meta">선박 그림은 실사풍으로 재현한 이미지예요.</p><div class="ship-growth-grid historical-grid">${cards}</div>`,'wide');
  $('#shipyard-back').onclick=()=>showFleet();
  $('#shipyard-storage').onclick=showStoredShips;
  if($('#turtle-order'))$('#turtle-order').onclick=async()=>{if(await api.onShipAction(game=>turtleShipyard(game,turtle?'deliver':'accept')))showShipyard();};
  document.querySelectorAll('[data-build-historical]').forEach(b=>b.onclick=()=>{
   const id=b.dataset.buildHistorical,q=historicalQuote(get(),id);
   api.onModal(q.row.name+'을 건조할까요?',q.row.portName+' 조선소',`<p>${fmt(q.cost)} D를 지불하고 선단에 편입합니다.</p><div class="dialog-actions"><button id="historic-build-confirm">건조 확인</button><button id="historic-build-back">돌아가기</button></div>`,'small');
   $('#historic-build-back').onclick=showShipyard;$('#historic-build-confirm').onclick=async()=>{if(busy)return;busy=true;try{if(await api.onShipAction(g=>buildHistoricalShip(g,id,q.cost)))showFleet();}finally{busy=false;}};
  });
 }
 function showFleet(){
  const s=get(),rows=fleetDisplayShips(s),spec=ship(s),slow=rows.find(p=>vesselSeaSpeed(s,p)===spec.speed),trade=tradeGear(s);
  api.onModal('내 배와 동행 선단','최대 5척 · 가장 느린 배의 속도로 함께 항해',`<p class="help-tip">선단 속도 ${fmt(spec.speed)}해리/일 · 속도 제한: ${esc(vesselSpec(slow).name)} · 보급 한도 ${spec.supply}일 · 적재 ${usedSpace(s)}/${capacity(s)}칸</p><p class="fleet-trade-gear">선단 교역 장비 · ${trade?esc(trade.name+' · '+trade.effect):'장착 없음'}</p><div class="ship-growth-grid">${rows.map((p,i)=>{const gear=gearOnShip(s,p.id);return `<article class="growth-step"><img ${p.kind?'class="historical-photo"':''} src="${p.kind?historicalArt(p.kind):shipArtPath(p.tier)}" alt="${esc(vesselSpec(p).name)}" loading="lazy"><h3>${i?'동행선 '+i:'⚑ 기함'} · ${esc(vesselSpec(p).name)}</h3><p>${p.tier+1}단계 · ${fmt(vesselSeaSpeed(s,p))}해리/일</p><p class="vessel-gear">장착 장비 · ${gear?esc(gear.name+' · '+gear.effect):'없음'}</p><button data-upgrade-vessel="${p.id}" ${!s.port||p.tier===19?'disabled':''}>이 배 개량 · ${fmt(SHIPS[p.tier].upgrade)} D</button><button data-flagship="${p.id}" ${!s.port?'disabled':''}>기함 지정</button><button data-store-vessel="${esc(p.id)}" ${!PORT_BY_ID[s.port]?.active||PORT_BY_ID[s.port]?.depot||s.voyage||rows.length<2||storedShips(s).length>=STORED_SHIP_LIMIT?'disabled':''}>이 항구에 맡기기</button><button data-sell-vessel="${p.id}" ${!s.port||rows.length<2?'disabled':''}>매각 · ${fmt(shipResaleValue(p))} D</button></article>`;}).join('')}</div><div class="dialog-actions"><button id="fleet-shipyard">역사 선박 조선소</button><button id="fleet-stored">항구에 맡긴 배 · ${storedShips(s).length}척</button><button id="fleet-items">아이템 가방</button><button id="detail-add" ${!s.port||additionalShipCost(s)===null?'disabled':''}>배 추가 · ${fmt(additionalShipCost(s))} D</button><button id="fleet-growth">전체 20단계 보기</button><button id="fleet-all-upgrade" ${!s.port||!rows.every(p=>p.tier===rows[0].tier)||rows[0].tier===19?'disabled':''}>같은 단계 선단 일괄 개량 · ${fmt(upgradeCost(s))} D</button></div><p>기함을 조종하면 나머지는 지나온 길을 따라 한 줄로 이동해요. 배를 맡기면 새 배를 편입할 자리가 생겨요. 항해 선단에는 최소 한 척을 남겨야 해요.</p>`,'wide');
  $('#fleet-shipyard').onclick=showShipyard;
  $('#fleet-stored').onclick=showStoredShips;
  document.querySelectorAll('[data-store-vessel]').forEach(b=>b.onclick=()=>confirmStorage(b.dataset.storeVessel,false));
  $('#fleet-items').onclick=()=>api.onItems?.();
  document.querySelectorAll('[data-sell-vessel]').forEach(b=>b.onclick=()=>confirmSale(b.dataset.sellVessel));
  $('#detail-add').onclick=()=>confirmShip('add');$('#fleet-growth').onclick=()=>showShip('growth');$('#fleet-all-upgrade').onclick=()=>confirmShip('upgrade');document.querySelectorAll('[data-flagship]').forEach(b=>b.onclick=()=>{syncFleet(s,rows,b.dataset.flagship);tierKey='';api.onChanged();showFleet();});document.querySelectorAll('[data-upgrade-vessel]').forEach(b=>b.onclick=()=>{const id=b.dataset.upgradeVessel,p=rows.find(p=>p.id===id);api.onModal('이 배를 개량할까요?','선박 개량',`<p>${esc(SHIPS[p.tier].name)} → ${esc(SHIPS[p.tier+1].name)} · ${fmt(SHIPS[p.tier].upgrade)} D</p><button id="upgrade-one">개량 확인</button>`,'small');$('#upgrade-one').onclick=async()=>{if(busy)return;busy=true;try{const r=await api.onShipAction(game=>upgradeShip(game,id));if(r){tierKey='';showFleet();}}finally{busy=false;}};});
 }
 function showStoredShips(){
  const s=get(),stored=storedShips(s),here=PORT_BY_ID[s.port];
  const byPort=new Map();
  for(const vessel of stored){if(!byPort.has(vessel.port))byPort.set(vessel.port,[]);byPort.get(vessel.port).push(vessel);}
  const rows=[...byPort.entries()].sort(([a],[b])=>a===s.port?-1:b===s.port?1:PORT_BY_ID[a].name.localeCompare(PORT_BY_ID[b].name,'ko'));
  const cards=rows.map(([id,vessels])=>{
   const title=esc(PORT_BY_ID[id].name)+(id===s.port?' · 현재 정박':'');
   return `<section class="stored-port"><h3>${title}</h3>${vessels.map(v=>`<article class="stored-vessel">
      <img src="${v.kind?historicalArt(v.kind):shipArtPath(v.tier)}" alt="" width="112" height="76" loading="lazy">
      <div><strong>${esc(vesselSpec(v).name)}</strong><small>${v.tier+1}단계 · 내구도 ${Math.round(v.health*100)}%</small></div>
      <button type="button" data-recall-vessel="${esc(v.id)}" ${id!==s.port||s.voyage?'disabled':''}>${id===s.port?'선단에 복귀':'이 항구에서 회수'}</button></article>`).join('')}</section>`;
  }).join('');
  api.onModal('항구에 맡긴 배',`보관 ${stored.length}/${STORED_SHIP_LIMIT}척 · 항해 ${fleetCount(s)}/${fleetLimit(s)}척`,
    `<div class="dialog-actions"><button id="stored-back">내 선단으로</button><button id="stored-shipyard">역사 선박 조선소</button></div>
    <p>${here&&!s.voyage?'현재 '+esc(here.name)+'에 정박 중이에요. ':'항해 중이에요. '}배를 맡긴 항구에 입항하면 회수할 수 있어요.</p>
    ${cards||'<p>아직 맡겨 둔 배가 없어요. 항구에 정박한 뒤 내 선단에서 ‘이 항구에 맡기기’를 선택하세요.</p>'}`,'medium');
  $('#stored-back').onclick=showFleet;
  $('#stored-shipyard').onclick=showShipyard;
  document.querySelectorAll('[data-recall-vessel]').forEach(b=>b.onclick=()=>confirmStorage(b.dataset.recallVessel,true));
 }
 function confirmStorage(id,recall){
  const current=get(),port=current.port;
  let quote;
  try{quote=(recall?quoteShipRecall:quoteShipStorage)(current,id);}
  catch(error){api.onToast(error.message,'error');return;}
  const after=quote.next;
  api.onModal(recall?'이 배를 다시 선단에 넣을까요?':'이 항구에 배를 맡길까요?',esc(PORT_BY_ID[port].name)+' · 무료',`
    <p><strong>${esc(vesselSpec(quote.vessel).name)}</strong></p>
    <p>변경 후 ${after.fleetCount}/${fleetLimit(after)}척 · 적재 ${usedSpace(after)}/${capacity(after)}칸 · 보급 ${after.food.toFixed(1)}일분</p>
    ${!recall&&current.flagshipId===id?`<p>새 기함 · ${esc(ship(after).name)}</p>`:''}
    ${!recall&&(quote.guns||quote.gear)?'<p>대포와 장비는 보관함으로 옮겨요. 회수 후 다시 장착할 수 있어요.</p>':''}
    ${quote.credit>0?`<p>남는 보급 ${fmt(Math.floor(quote.credit))} D 상당은 보급 크레딧으로 옮겨요.</p>`:''}
    ${recall?'':'<p>이 배는 항해와 전투에서 빠지며, 이 항구에서 다시 찾을 수 있어요.</p>'}
    <div class="dialog-actions"><button class="primary-button" id="storage-confirm">${recall?'복귀 확인':'맡기기 확인'}</button><button id="storage-cancel">돌아가기</button></div><p id="business-result" role="status"></p>`,'small');
  $('#storage-cancel').onclick=recall?showStoredShips:showFleet;
  $('#storage-confirm').onclick=async()=>{
   if(busy)return;
   busy=true;$('#storage-confirm').disabled=true;
   try{
    const action=recall?recallShip:storeShip;
    if(await api.onStorageAction(game=>action(game,id,port))){tierKey='';showFleet();}
   }finally{busy=false;if($('#storage-confirm'))$('#storage-confirm').disabled=false;}
  };
 }
 function confirmSale(id){
  let quote;
  try{quote=quoteShipSale(get(),id);}
  catch(error){api.onToast(error.message,'error');return;}
  const current=get(),after=quote.next;
  api.onModal('이 배를 매각할까요?','선박 매각',`<p><strong>${esc(vesselSpec(quote.vessel).name)} · ${fmt(quote.price)} D 수령</strong></p>
    <p>매각 후 ${after.fleetCount}척 · 적재 ${usedSpace(after)}/${capacity(after)}칸 · 보급 ${after.food.toFixed(1)}일분</p>
    ${current.flagshipId===id?`<p>새 기함 · ${esc(ship(after).name)}</p>`:''}
    ${quote.guns||quote.gear?'<p>이 배의 대포와 장비는 보관함으로 옮겨요.</p>':''}
    ${quote.credit>0?`<p>남는 보급은 ${fmt(Math.floor(quote.credit))} D 상당의 보급 크레딧으로 옮겨요.</p>`:''}
    <div class="dialog-actions"><button class="primary-button" id="ship-sale-confirm">매각 확정</button><button id="ship-sale-back">돌아가기</button></div><p id="business-result" role="status"></p>`,'small');
  $('#ship-sale-back').onclick=()=>showFleet();
  $('#ship-sale-confirm').onclick=async()=>{
   if(busy)return;
   busy=true;
   try{if(await api.onShipAction(game=>sellShip(game,id,quote.price))){tierKey='';showFleet();}}
   finally{busy=false;}
  };
 }
 function confirmShip(kind){const s=get(),cost=kind==='upgrade'?upgradeCost(s):additionalShipCost(s),label=kind==='upgrade'?'선단을 한 단계 개량':'동행 선박 1척 추가';
  api.onModal(label+'할까요?','선박·선단',`<p>비용 ${fmt(cost)} D · 보유 ${fmt(s.money)} D</p><p>${kind==='add'?`현재 식량을 나누어 항해 가능 보급은 ${(s.food*fleetCount(s)/(fleetCount(s)+1)).toFixed(1)}일분이 돼요.`:'현재 화물과 보급은 그대로 유지되고 선단 전체 모양과 성능이 바뀝니다.'}</p><div class="dialog-actions"><button id="ship-confirm" class="primary-button">확인</button><button id="ship-cancel" class="service-button">돌아가기</button></div>`,'small');
  $('#ship-cancel').onclick=()=>showShip();$('#ship-confirm').onclick=async()=>{if(busy)return;busy=true;try{const r=await api.onShipAction(game=>(kind==='upgrade'?upgradeShip:addShip)(game));if(r){tierKey='';showShip();}}finally{busy=false;}};
 }
 function discoveryCardDetail(d,withPoint){
  const study=discoveryStudy(d.id),point=d.point||[d.lon,d.lat];
  const sources=[...(d.sources||[]),...(study?.sources||[])];
  return `<figure class="discovery-photo"><img class="discovery-hero" src="${collectionArt(d.id,true)}" alt="${esc(d.name)} 실사풍 재현">
    <figcaption>학습용으로 재현한 이미지</figcaption></figure>
    <dl class="discovery-location">
      <dt>${d.fiction?'이야기 배경':'실제 위치·서식지'}</dt><dd>${esc(study?.place||d.region)}</dd>
      ${withPoint?`<dt>게임 발견 지점</dt><dd>${esc(discoveryCoordinates(point))} <button type="button" data-discovery-study-map>지도에서 보기</button></dd>`:''}
    </dl>
    <h3>자세히 알아보기</h3><p>${esc(study?.detail||d.description)}</p>
    <p class="modal-meta">${d.fiction?'이 물건과 발견 이야기는 게임 속 창작이에요.':'게임 속 발견 지점은 항해용 위치예요. 실제 유적의 좌표나 동물이 나타나는 위치는 자료를 확인하세요.'}</p>
    ${sources.length?`<p class="discovery-sources">${sources.map(source=>`<a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.label||'자료 보기')}</a>`).join('')}</p>`:''}`;
 }
 function bindStudyMap(root,d){
  const button=root.querySelector('[data-discovery-study-map]');
  if(button)button.onclick=()=>api.onShowDiscoveryPoint?.(d);
 }
 function showAlbum(detailId=null){
  if(detailId){
   const d=DISCOVERY_BY_ID[detailId],record=get().discoveries?.[detailId];
   if(!d||!record)return;
   api.onModal(d.name,`${KINDS[d.kind]} · 난도 ${d.tier}/4 · 명성 ${fmt(d.fame)}`,
    `${discoveryCardDetail(d,true)}<p class="modal-meta">항해 ${Math.floor(record.foundDay)}일째 발견</p>
    <button id="album-back" class="service-button">수집 목록으로</button>`,'medium');
   $('#album-back').onclick=()=>showAlbum();
   bindStudyMap($('#modal-content'),d);
   return;
  }
  const s=get(),stats=discoveryStats(s),items=DISCOVERIES.filter(d=>(albumKind==='all'||d.kind===albumKind)&&(albumOwned==='all'||(albumOwned==='found')===!!s.discoveries?.[d.id]));
  api.onModal('발견 수집 도감',`수집 ${stats.foundCount}/${DISCOVERIES.length} · 명성 ${fmt(stats.fame)}`,`<nav class="expansion-tabs">${[['all','전체'],...Object.entries(KINDS)].map(([id,name])=>`<button data-kind="${id}" aria-pressed="${albumKind===id}">${name}</button>`).join('')}</nav><label class="album-filter">표시 <select id="album-owned"><option value="all">전체</option><option value="found">수집한 기록</option><option value="missing">미발견</option></select></label><div class="collection-grid">${items.map(d=>{const got=!!s.discoveries?.[d.id];return `<button class="collection-card ${got?'collected':'uncollected'}" data-collection="${d.id}" ${got?'':'disabled'}><img src="${got?collectionArt(d.id):'assets/discoveries/unknown.svg'}" alt="${got?esc(d.name):'아직 발견하지 못한 '+KINDS[d.kind]}" loading="lazy" width="240" height="180"><strong>${got?esc(d.name):'미발견 · '+KINDS[d.kind]}</strong><span>난도 ${d.tier} · 명성 ${fmt(d.fame)}</span></button>`;}).join('')}</div><p class="modal-meta">미발견 장소는 항해 중 흔적과 주점에서 들은 소문으로 찾아보세요. 같은 발견은 한 번만 명성을 얻어요.</p>`,'wide');
  $('#album-owned').value=albumOwned;$('#album-owned').onchange=e=>{albumOwned=e.target.value;albumScroll=0;showAlbum();};
  document.querySelectorAll('[data-kind]').forEach(b=>b.onclick=()=>{albumKind=b.dataset.kind;albumScroll=0;showAlbum();});
  document.querySelectorAll('[data-collection]').forEach(b=>b.onclick=()=>{albumScroll=$('#modal-content').scrollTop;showAlbum(b.dataset.collection);});$('#modal-content').scrollTop=albumScroll;
 }
 function summaryRow(p,online){return `<strong>${esc(p.name)}</strong><span>${online?'● 접속 중':'○ 오프라인'}</span><small>방문 ${p.visited??'—'}곳 · ${p.statsVersion===3?'지도 '+Number(p.explorationPercent).toFixed(2)+'% · 명성 '+fmt(p.fame):'새 정보 업데이트 대기'}</small><small>${esc(lastSeenText(p.lastSeenAt,online))}</small>`;}
 async function showCaptains(tab=rosterTab,reset=false){
  const generation=++rosterGeneration;rosterTab=tab;if(reset){rosterHistory=[null];rosterIndex=0;}const online=api.getFleet().onlineCaptains(),onlineIds=new Set(online.map(p=>p.uid));
  api.onModal('선장 목록','현재 접속과 누적 항해 기록',`<nav class="expansion-tabs"><button id="roster-online" aria-pressed="${tab==='online'}">지금 접속</button><button id="roster-all" aria-pressed="${tab==='all'}">모든 선장</button></nav><p class="modal-meta">현실서버에 입장한 모든 선장이 명부에 남아요. 배 위치는 시야 안에서만 보여요.</p><div id="persistent-roster" class="persistent-roster" role="list"></div><div id="roster-pagination" class="dialog-actions"></div><p id="roster-status" role="status"></p>`,'wide');
  $('#roster-online').onclick=()=>showCaptains('online');$('#roster-all').onclick=()=>showCaptains('all',true);
  const paint=list=>{const root=$('#persistent-roster');if(!root)return;root.replaceChildren();for(const p of list){const b=document.createElement('button');b.className='captain-directory-row';b.innerHTML=summaryRow(p,onlineIds.has(p.id||p.uid));b.onclick=()=>showCaptain(p,onlineIds.has(p.id||p.uid));root.append(b);}if(!list.length)root.textContent='아직 등록된 선장이 없어요.';};
  if(tab==='online'){paint(online.map(p=>({...p,id:p.uid,...(p.uid===api.getFleet().uid?api.getStats():{})})));return;}
  $('#roster-status').textContent='명부를 불러오는 중…';rosterBusy=true;
  try{rosterPage=await api.getRankings().page(rosterHistory[rosterIndex]);if(generation!==rosterGeneration||!$('#persistent-roster')||rosterTab!=='all')return;paint(rosterPage);$('#roster-status').textContent=`${rosterIndex+1}페이지 · ${rosterPage.length}명`;
   $('#roster-pagination').innerHTML=`<button id="roster-prev" ${rosterIndex?'':'disabled'}>이전 20명</button><button id="roster-next" ${rosterPage.length===20?'':'disabled'}>다음 20명</button>`;
   $('#roster-prev').onclick=()=>{if(rosterBusy)return;rosterIndex--;showCaptains('all');};$('#roster-next').onclick=()=>{if(rosterBusy)return;rosterHistory[++rosterIndex]=rosterPage.at(-1).id;showCaptains('all');};
  }catch{if($('#roster-status'))$('#roster-status').textContent='명부를 불러오지 못했어요. 연결 후 다시 열어 주세요.';}finally{rosterBusy=false;}
 }
 async function showCaptain(p,online){
  const generation=++detailGeneration;const token=p.id||p.uid;api.onModal(p.name,'선장의 공개 기록','<p id="captain-detail-status">기록을 불러오는 중…</p>','medium');
  try{if(token!==api.getFleet().uid){const full=await api.getRankings().captain(token);if(full)p=full;}else if(token===api.getFleet().uid){const full=await api.getRankings().captain(token);p={...p,...(full||{}),...api.getStats()};}}catch{}
  if(generation!==detailGeneration||!$('#captain-detail-status'))return;
  const modern=p.statsVersion===3;$('#modal-content').innerHTML=`<p>${online?'접속 중':'오프라인'}</p><p>${esc(lastSeenText(p.lastSeenAt,online))}</p>${modern?`<img class="captain-ship" src="${shipArtPath(p.shipTier)}" alt="선박"><p>${p.shipTier+1}/20단계 · ${p.fleetCount}척${p.earnedFlag?' · ◆ 항해 깃발':''}</p>`:''}<dl class="vessel-stats"><dt>방문 도시</dt><dd>${p.visited??'—'}곳</dd><dt>지도 탐험</dt><dd>${modern?Number(p.explorationPercent).toFixed(2)+'% · '+fmt(p.explorationScore)+'점':'업데이트 대기'}</dd><dt>해도상 탐험 면적</dt><dd>${modern?fmt(p.explorationArea)+' km²':'업데이트 대기'}</dd><dt>발견 수</dt><dd>${modern?p.foundCount+'/'+DISCOVERIES.length:'업데이트 대기'}</dd><dt>발견 명성</dt><dd>${modern?fmt(p.fame):'업데이트 대기'}</dd></dl><h3>탐험·교역·성장·전투 기록</h3><dl class="vessel-stats">${RANK_DEFINITIONS.filter(m=>['tradedGoodCount','bestTradeProfit','islandPorts','fleetGrowth','ownedPortCount','pirateKills','fleetDefeats','duelWins'].includes(m.id)).map(m=>`<dt>${m.label}</dt><dd>${p.rankProgressVersion===1||m.id==='ownedPortCount'?formatRankScore(p,m.id):'집계 대기'}</dd>`).join('')}</dl><p class="modal-meta">해적 처치·격파·결투·거래 종류·최고 단일 이익은 이번 업데이트부터 기록합니다. 도감·섬 방문·선단 단계는 기존 저장을 이어 사용해요.</p><div class="dialog-actions"><button id="captain-collections">발견 도감</button><button id="captain-officers">부선장</button><button id="captain-back" class="service-button">선장 목록으로</button></div>`;$('#captain-back').onclick=()=>showCaptains();
  $('#captain-collections').onclick=()=>showPublicCollection(p,online,'discoveries');
  $('#captain-officers').onclick=()=>showPublicCollection(p,online,'officers');
 }
 async function showPublicCollection(captain,online,kind){
  const generation=++detailGeneration,officers=kind==='officers';
  api.onModal(officers?'부선장':'발견 도감',captain.name,
    '<div id="captain-collection">불러오는 중…</div><button id="captain-profile-back" class="service-button">선장 상세로</button>','medium');
  $('#captain-profile-back').onclick=()=>showCaptain(captain,online);
  let record;
  try{record=await api.getRankings().collection(captain.id||captain.uid);}
  catch{
    if(generation===detailGeneration&&$('#captain-collection'))$('#captain-collection').textContent='수집 기록을 불러오지 못했어요.';
    return;
  }
  const root=$('#captain-collection');if(generation!==detailGeneration||!root)return;
  if(!record){root.textContent='기록 준비 중이에요.';return;}
  const entries=(officers?OFFICERS:DISCOVERIES).filter(entry=>record[kind]?.[entry.id]===true);
  if(!entries.length){root.textContent='아직 모은 카드가 없어요.';return;}
  function paint(){
    root.innerHTML='<div class="collection-grid">'+entries.map(entry=>{
      const i=Number(entry.id.slice(1))-1;
      const image=officers?`<div class="officer-portrait" style="background-position:${i%6*20}% ${Math.floor(i/6)*100/3}%" aria-hidden="true"></div>`:
        `<img loading="lazy" src="${collectionArt(entry.id)}" alt="">`;
      return `<button class="collection-card collected" data-public-card="${entry.id}">${image}<strong>${esc(entry.name)}</strong>${officers?`<small>${esc(entry.effect)}</small>`:''}</button>`;
    }).join('')+'</div>';
    for(const button of root.querySelectorAll('[data-public-card]'))button.onclick=()=>{
      const entry=entries.find(value=>value.id===button.dataset.publicCard);
      const portrait=Number(entry.id.slice(1))-1;
      root.innerHTML=`<h3>${esc(entry.name)}</h3>${officers?
        `<div class="officer-portrait public-officer" style="background-position:${portrait%6*20}% ${Math.floor(portrait/6)*100/3}%"></div><p>${esc(entry.effect)}</p>`:
        discoveryCardDetail(entry,!!get().discoveries?.[entry.id])}<button data-usage-key="action-public-card-back" data-public-back>카드 목록</button>`;
      if(!officers)bindStudyMap(root,entry);
      root.querySelector('[data-public-back]').onclick=paint;
    };
  }
  paint();
 }
 return {intercept:(from,to)=>api.canShowDiscovery?.()?discoveryEntry(get(),from,to,d=>!dismissed.has(d.id)||(dismissed.get(d.id).outside&&Date.now()-dismissed.get(d.id).at>300000)):1,investigate:showInvestigation,renderHUD,showShip,showShipyard,showStoredShips,showAlbum,showCaptains,found:d=>{lastFound=d;nearKey='';renderHUD();}};
}
