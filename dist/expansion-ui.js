import {PORTS,PORT_BY_ID} from './data.js';
import {SHIPS,ship,shipTier,fleetCount,fleetLimit,upgradeCost,additionalShipCost} from './ship-rules.js';
import {capacity,usedSpace,upgradeShip,addShip} from './engine.js';
import {DISCOVERIES,DISCOVERY_BY_ID,RUMORS} from './discoveries-catalog.js';
import {nearbyDiscoveries,readRumor,discoveryStats,explorationAllowed} from './discoveries.js';
import {shipArt,shipArtPath,discoveryArt} from './art.js';
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
 function renderHUD(){
  const s=get(),spec=ship(s),stats=api.getStats();
  const key=shipTier(s)+':'+fleetCount(s);
  if(tierKey!==key){tierKey=key;summary.innerHTML=`<img src="${shipArtPath(shipTier(s))}" alt="${esc(spec.name)}" width="160" height="120"><div><strong>${esc(spec.name)}</strong><span>${shipTier(s)+1} / 20단계 · ${fleetCount(s)}척</span><button class="service-button" id="overview-ship">내 배 보기</button></div>`;$('#overview-ship').onclick=()=>showShip();}
  progress.textContent=`지도 ${stats.explorationPercent.toFixed(2)}% · 발견 ${stats.foundCount}/32 · 명성 ${fmt(stats.fame)}`;
  const list=nearbyDiscoveries(s),key2=list.map(d=>d.id).join(',')+':'+(lastFound?.id||'')+':'+!!s.detourTarget+':'+explorationAllowed(s);
  find.hidden=!list.length&&!lastFound&&!s.detourTarget;
  if(key2!==nearKey){nearKey=key2;find.replaceChildren();
   if(lastFound){const note=document.createElement('div');note.className='discovery-result';note.innerHTML=`<strong>✦ ${esc(lastFound.name)} 발견</strong><span>명성 +${lastFound.fame}</span><button id="found-album">도감 보기</button><button id="found-dismiss" aria-label="발견 안내 닫기">×</button>`;find.append(note);$('#found-album').onclick=()=>showAlbum(lastFound.id);$('#found-dismiss').onclick=()=>{lastFound=null;nearKey='';renderHUD();};}
   for(const d of list.slice(0,3)){const row=document.createElement('div');row.className='discovery-cue';row.innerHTML=`<span>◇ ${KINDS[d.kind]}의 흔적 · ${d.tier}단계 난도</span><div><button data-inspect="${d.id}">조사하기</button><button data-approach="${d.id}">조사 지점으로 이동</button></div>`;find.append(row);row.querySelector('[data-inspect]').onclick=()=>api.onInspect(d.id);row.querySelector('[data-approach]').onclick=()=>api.onApproach(d);}
   if(s.detourTarget&&!s.voyage){const b=document.createElement('button');b.textContent='원래 항로 계속하기';b.onclick=api.onResumeRoute;find.append(b);}
  }
 }
 function showShip(tab='current'){
  const s=get(),spec=ship(s),tier=shipTier(s),next=SHIPS[tier+1],n=fleetCount(s),cost=upgradeCost(s),addCost=additionalShipCost(s);
  let body='';
  if(tab==='growth')body=`<div class="ship-growth-grid">${SHIPS.map((p,i)=>`<article class="growth-step ${i===tier?'current':''}"><img src="${shipArtPath(i)}" alt="${esc(p.name)}" loading="lazy" width="160" height="120"><strong>${i+1}. ${esc(p.name)}</strong><span>${p.speed}해리/일 · 보급 ${p.supply}일</span><span>한 척 적재 ${p.capacity}칸</span>${i===tier?'<b>현재 단계</b>':''}</article>`).join('')}</div>`;
  else {const view=tab==='next'&&next?next:spec;body=`<div class="vessel-detail">${shipArt(view.tier)}<div><h3>${esc(view.name)}</h3><p>${view.tier+1}/20단계 · ${tab==='next'?'다음 선단':n+'척의 선단'}</p><dl class="vessel-stats"><dt>해상 속도</dt><dd>하루 ${view.speed}해리</dd><dt>강 속도</dt><dd>하루 ${view.riverSpeed}해리</dd><dt>최대 보급</dt><dd>${view.supply}일분</dd><dt>선단 적재</dt><dd>${tab==='next'?capacity({...s,shipTier:view.tier}):capacity(s)}칸</dd><dt>항해 성능</dt><dd>${Number.isFinite(view.offshore)?'해안에서 '+view.offshore+'해리 이내':'외해 항해 가능'}</dd></dl></div></div><p class="help-tip">기함 한 척을 조종하면 나머지 배도 함께 이동해요. 발견 시야는 기함 중심이에요.</p><div class="fleet-miniatures">${Array.from({length:n},(_,i)=>`<figure><img src="${shipArtPath(tier)}" alt="${i?'동행 선박':'기함'}" width="100" height="75"><figcaption>${i?'동행 '+i:'기함'}</figcaption></figure>`).join('')}</div><p>현재 보급 ${s.food.toFixed(1)}일 · 적재 ${usedSpace(s)}/${capacity(s)}칸 · 보유 ${fmt(s.money)} D</p><div class="dialog-actions"><button class="primary-button" id="detail-upgrade" ${!s.port||!next?'disabled':''}>${next?'다음 단계로 개량 · '+fmt(cost)+' D':'최대 개량 완료'}</button><button class="service-button" id="detail-add" ${!s.port||addCost===null?'disabled':''}>배 추가 · ${addCost===null?n+'/'+fleetLimit(s)+'척':fmt(addCost)+' D'}</button></div><p class="modal-meta">개량은 선단 전체에 적용돼요. 보급 한도만 늘어나며 추가 식량은 항구에서 채워요.${addCost!==null?` 배 추가 시 기존 식량을 나누면 ${ (s.food*n/(n+1)).toFixed(1)}일분이 남아요.`:''}</p>`;}
  api.onModal('내 배 보기','뗏목에서 시작하는 20단계 성장',`${s.raftStart?.refund?`<p class="help-tip">뗏목 시작 전환 보상: ${fmt(s.raftStart.refund)} D를 지급했어요. 이후 개량은 유지돼요.</p>`:''}<nav class="expansion-tabs">${[['current','현재'],['next','다음 단계'],['growth','전체 성장']].map(([id,label])=>`<button data-ship-tab="${id}" aria-pressed="${tab===id}">${label}</button>`).join('')}</nav>${body}`,tab==='growth'?'wide':'medium');
  document.querySelectorAll('[data-ship-tab]').forEach(b=>b.onclick=()=>showShip(b.dataset.shipTab));
  $('#detail-upgrade')?.addEventListener('click',()=>confirmShip('upgrade'));
  $('#detail-add')?.addEventListener('click',()=>confirmShip('add'));
 }
 function confirmShip(kind){const s=get(),cost=kind==='upgrade'?upgradeCost(s):additionalShipCost(s),label=kind==='upgrade'?'선단을 한 단계 개량':'동행 선박 1척 추가';
  api.onModal(label+'할까요?','선박·선단',`<p>비용 ${fmt(cost)} D · 보유 ${fmt(s.money)} D</p><p>${kind==='add'?`현재 식량을 나누어 항해 가능 보급은 ${(s.food*fleetCount(s)/(fleetCount(s)+1)).toFixed(1)}일분이 돼요.`:'현재 화물과 보급은 그대로 유지되고 선단 전체 모양과 성능이 바뀝니다.'}</p><div class="dialog-actions"><button id="ship-confirm" class="primary-button">확인</button><button id="ship-cancel" class="service-button">돌아가기</button></div>`,'small');
  $('#ship-cancel').onclick=()=>showShip();$('#ship-confirm').onclick=()=>{if(busy)return;busy=true;try{const r=(kind==='upgrade'?upgradeShip:addShip)(get());if(!r.ok){api.onToast(r.error,'error');return;}tierKey='';api.onChanged();api.onToast(label+' 완료 · '+fmt(r.cost)+' D');showShip();}finally{busy=false;}};
 }
 function showAlbum(detailId=null){
  if(detailId){const d=DISCOVERY_BY_ID[detailId],record=get().discoveries?.[detailId];if(!d||!record)return;api.onModal(d.name,`${KINDS[d.kind]} · 명성 ${fmt(d.fame)}`,`<img class="discovery-hero" src="${discoveryArt(d.id)}" alt="${esc(d.name)}"><p>${esc(d.description)}</p><p>난도 ${d.tier}/4 · 항해 ${Math.floor(record.foundDay)}일째 발견</p><p>${d.fiction?'이 발견물과 발견 위치는 게임 속 창작 설정이에요.':'실제 유산·동물의 관찰 기록을 그림으로 모아요. 조사 지점은 항해용으로 단순화했어요.'}</p>${(d.sources||[]).map(x=>`<p class="modal-meta"><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.label||'출처 보기')}</a></p>`).join('')}<button id="album-back" class="service-button">수집 목록으로</button>`,'medium');$('#album-back').onclick=()=>showAlbum();return;}
  const s=get(),stats=discoveryStats(s),items=DISCOVERIES.filter(d=>(albumKind==='all'||d.kind===albumKind)&&(albumOwned==='all'||(albumOwned==='found')===!!s.discoveries?.[d.id]));
  api.onModal('발견 수집 도감',`수집 ${stats.foundCount}/32 · 명성 ${fmt(stats.fame)}`,`<nav class="expansion-tabs">${[['all','전체'],...Object.entries(KINDS)].map(([id,name])=>`<button data-kind="${id}" aria-pressed="${albumKind===id}">${name}</button>`).join('')}</nav><label class="album-filter">표시 <select id="album-owned"><option value="all">전체</option><option value="found">수집한 기록</option><option value="missing">미발견</option></select></label><div class="collection-grid">${items.map(d=>{const got=!!s.discoveries?.[d.id];return `<button class="collection-card ${got?'collected':'uncollected'}" data-collection="${d.id}" ${got?'':'disabled'}><img src="${got?discoveryArt(d.id):'assets/discoveries/unknown.svg'}" alt="${got?esc(d.name):'아직 발견하지 못한 '+KINDS[d.kind]}" loading="lazy" width="240" height="180"><strong>${got?esc(d.name):'미발견 · '+KINDS[d.kind]}</strong><span>난도 ${d.tier} · 명성 ${fmt(d.fame)}</span></button>`;}).join('')}</div><p class="modal-meta">미발견 장소는 항해 중 흔적과 주점의 탐험 소문으로 찾아보세요. 같은 발견은 한 번만 명성을 얻어요.</p>`,'wide');
  $('#album-owned').value=albumOwned;$('#album-owned').onchange=e=>{albumOwned=e.target.value;albumScroll=0;showAlbum();};
  document.querySelectorAll('[data-kind]').forEach(b=>b.onclick=()=>{albumKind=b.dataset.kind;albumScroll=0;showAlbum();});
  document.querySelectorAll('[data-collection]').forEach(b=>b.onclick=()=>{albumScroll=$('#modal-content').scrollTop;showAlbum(b.dataset.collection);});$('#modal-content').scrollTop=albumScroll;
 }
 function renderRumors(root){
  const s=get(),available=RUMORS.filter(r=>r.portId===s.port),section=document.createElement('section');section.className='rumor-panel';
  section.innerHTML='<h3>탐험 소문 · 무료</h3>'+(available.length?available.map(r=>`<button data-rumor="${r.id}" class="service-button">${s.rumors.includes(r.id)?'✓ 읽은 소문 다시 보기':'탐험 소문 읽기'}</button>`).join(''):'<p>이 항구에서 새로 들을 탐험 소문은 없어요.</p>');root.append(section);
  section.querySelectorAll('[data-rumor]').forEach(b=>b.onclick=()=>{const r=RUMORS.find(r=>r.id===b.dataset.rumor);if(!readRumor(get(),r.id)){api.onToast('정상 항해 뒤 이 항구에 정박하면 들을 수 있어요.','error');return;}api.onChanged();api.onModal('탐험 소문','항해 수첩',`<p>${esc(r.text)}</p><p class="modal-meta">무료 소문을 수첩에 기록했어요. 명성과 항구 방문 기록은 실제 발견으로 얻어요.</p>`,'small');});
 }
 function summaryRow(p,online){return `<strong>${esc(p.name)}</strong><span>${online?'● 접속 중':'○ 오프라인'}</span><small>방문 ${p.visited??'—'}곳 · ${p.statsVersion===3?'지도 '+Number(p.explorationPercent).toFixed(2)+'% · 명성 '+fmt(p.fame):'새 정보 업데이트 대기'}</small>`;}
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
  try{if(p.statsVersion!==3&&token!==api.getFleet().uid){const full=await api.getRankings().captain(token);if(full)p=full;}else if(token===api.getFleet().uid)p={...p,...api.getStats()};}catch{}
  if(generation!==detailGeneration||!$('#captain-detail-status'))return;
  const modern=p.statsVersion===3;$('#modal-content').innerHTML=`<p>${online?'접속 중':'오프라인'}</p>${modern?`<img class="captain-ship" src="${shipArtPath(p.shipTier)}" alt="선박"><p>${p.shipTier+1}/20단계 · ${p.fleetCount}척</p>`:''}<dl class="vessel-stats"><dt>방문 도시</dt><dd>${p.visited??'—'}곳</dd><dt>지도 탐험</dt><dd>${modern?Number(p.explorationPercent).toFixed(2)+'% · '+fmt(p.explorationScore)+'점':'업데이트 대기'}</dd><dt>해도상 탐험 면적</dt><dd>${modern?fmt(p.explorationArea)+' km²':'업데이트 대기'}</dd><dt>발견 수</dt><dd>${modern?p.foundCount+'/32':'업데이트 대기'}</dd><dt>발견 명성</dt><dd>${modern?fmt(p.fame):'업데이트 대기'}</dd></dl><button id="captain-back" class="service-button">선장 목록으로</button>`;$('#captain-back').onclick=()=>showCaptains();
 }
 return {renderHUD,showShip,showAlbum,showCaptains,renderRumors,found:d=>{lastFound=d;nearKey='';renderHUD();}};
}
