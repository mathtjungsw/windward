import {SHIPS,shipTier,fleetCount,fleetLimit,upgradeCost} from './ship-rules.js?v=2026.11.12-collections-ranks-historic-ships.2';
import {shipArtPath} from './art.js?v=2026.11.12-collections-ranks-historic-ships.2';
import {NEW_PORT_HISTORY} from './world-catalog.js?v=2026.11.12-collections-ranks-historic-ships.2';
import {PORTS,PORT_BY_ID,GOODS} from './data.js?v=2026.11.12-collections-ranks-historic-ships.2';
import {PORT_HISTORY} from './port-history.js?v=2026.11.12-collections-ranks-historic-ships.2';
import {RELEASE,RELEASES} from './release-notes.js?v=2026.11.12-collections-ranks-historic-ships.2';
import {ship,capacity,usedCargo,usedSpace,supplySpace,supplyCost,maxBuyQuantity,price,sellPrice,tradingPort,buy,sell,resupply,unloadSupply,upgradeShip,voyageEstimate,canDepart,distance,nearestHarbor,settleSupply} from './engine.js?v=2026.11.12-collections-ranks-historic-ships.2';
import {isTypingTarget} from './controls.js?v=2026.11.12-collections-ranks-historic-ships.2';
import {validCard} from './social-core.js?v=2026.11.12-collections-ranks-historic-ships.2';

const $=selector=>document.querySelector(selector);
const fmt=n=>Math.round(n).toLocaleString('ko-KR');
const escape=value=>String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const read=(storage,key,fallback)=>{try{return JSON.parse(storage.getItem(key))??fallback;}catch{return fallback;}};
const write=(storage,key,value)=>{try{storage.setItem(key,JSON.stringify(value));}catch{/* Device storage may be unavailable. */}};
const defaultPreferences=()=>({folds:{},hand:'right',width:315,letters:true,placeNames:true});
const SIGNAL_LABELS={hello:'안녕하세요',thanks:'고마워요',fairwind:'순항하세요'};

export function createUX(api){
  const {getState,getAccount,getNav,getSelection,getPlan,getVisibleShips,getChat,storage}=api;
  const mobile=matchMedia('(max-width:850px)');
  const panel=$('#port-panel'),market=$('#market'),cargo=$('#cargo-list'),modal=$('#modal');
  const panelHome=document.createComment('항구 정보 원래 위치');panel.before(panelHome);
  const sheet=document.createElement('dialog');sheet.id='quick-sheet';sheet.setAttribute('aria-labelledby','quick-title');
  sheet.innerHTML='<header><strong id="quick-title">항구·보급</strong><button id="quick-expand" type="button" aria-label="창 확장 또는 축소">↕</button><button id="quick-close" type="button">닫기</button></header><div id="quick-content"></div>';
  document.body.append(sheet);
  const bar=document.createElement('nav');bar.id='quick-bar';bar.setAttribute('aria-label','모바일 바로가기');
  bar.innerHTML='<button id="quick-nav" type="button">항해</button><button id="quick-port" type="button">항구·보급</button><button id="quick-cargo" type="button">화물</button><button id="quick-more" type="button">더보기</button>';
  $('.game-layout').append(bar);
  const action=document.createElement('section');action.id='action-strip';action.setAttribute('aria-label','현재 항해 상태');
  action.innerHTML='<span id="action-status"></span><button id="action-home" type="button">내 배</button><button id="action-context" type="button">항구</button>';
  $('.chart').before(action);
  const settings=document.createElement('button');settings.id='ux-settings';settings.className='service-button';settings.textContent='조작·화면 설정';$('.navigation-mode .fold-body').append(settings);
  const notes=document.createElement('button');notes.type='button';notes.id='update-notes';notes.className='world-badge';notes.innerHTML='업데이트 <small id="update-new" hidden>NEW</small>';$('.header-end').insertBefore(notes,$('#help-btn'));
  const story=document.createElement('details');story.id='port-story';story.innerHTML='<summary>항구와 상품 이야기</summary><div id="port-story-content"></div>';$('#port-description').after(story);
  const draft=document.createElement('section');draft.id='trade-draft';draft.hidden=true;draft.setAttribute('aria-label','거래 수량과 금액');$('#trade-content').append(draft);
  const navHome=document.createComment('조종 영역 원래 위치');$('#manual-pad').before(navHome);
  let prefs=defaultPreferences(),tradeDraft=null,sheetFocus=null,patchBusy=false,lastStoryId=null;
  const prefKey=()=>`windward-ui-v1:${getAccount().uid||'guest'}`;
  const pendingKey=()=>`windward-note-pending:${getAccount().uid||'guest'}`;
  const storePrefs=()=>write(storage,prefKey(),prefs);
  const tools=()=>getState();

  function restorePanel(){
    if(panel.parentNode!==$('#quick-content'))return;
    const home=mobile.matches?$('#mobile-panels'):$('#desktop-panels');
    if(home){const before=mobile.matches?$('#chat-panel'):home.firstChild;home.insertBefore(panel,before?.parentNode===home?before:null);}else panelHome.after(panel);
    panel.classList.remove('quick-cargo-only');
  }
  function closeSheet(){if(sheet.open)sheet.close();restorePanel();}
  sheet.addEventListener('close',()=>{if(!sheet.open){restorePanel();if(sheetFocus?.isConnected&&!modal.open)sheetFocus.focus({preventScroll:true});}});
  $('#quick-close').onclick=closeSheet;
  $('#quick-expand').onclick=()=>sheet.classList.toggle('expanded');
  $('#quick-nav').onclick=()=>{closeSheet();api.onHome();$('.chart').scrollIntoView({block:'nearest'});};
  $('#action-home').onclick=api.onHome;
  $('#quick-port').onclick=()=>openPort('port');
  $('#quick-cargo').onclick=()=>openPort('cargo');
  $('#quick-more').onclick=()=>openMore();
  $('#action-context').onclick=()=>tools().port?openPort('port'):api.onAtlas();
  notes.onclick=()=>patchNotes(true);
  settings.onclick=showSettings;

  function openSheet(title,mode){
    api.onStop();if(!sheet.open)sheetFocus=document.activeElement;
    $('#quick-title').textContent=title;
    if(!sheet.open)sheet.showModal();
  }
  function openPort(mode='port',selectDock=true){
    const s=tools();if(selectDock&&s.port&&mode!=='target')api.onSelect(s.port,false);
    api.onTab(mode==='supply'?'ship':'trade');
    if(!mobile.matches){panel.scrollIntoView({block:'nearest'});if(mode==='cargo')cargo.scrollIntoView({block:'nearest'});return;}
    if(panel.parentNode!==$('#quick-content'))$('#quick-content').replaceChildren(panel);
    panel.classList.toggle('quick-cargo-only',mode==='cargo');
    openSheet(mode==='cargo'?'내 화물':mode==='supply'?'선박·보급':mode==='target'?'선택한 항구':'항구·보급',mode);
  }
  function openMore(){
    restorePanel();$('#quick-content').innerHTML='<div class="quick-links"><button data-menu="menuFinder">메뉴 찾기</button><button data-menu="suggestions">개선 제안 게시판</button><button data-menu="ownedPorts">소유 항구 현황</button><button data-menu="guild">항구 조합</button><button data-menu="projects">공동 사업</button><button data-menu="sea">해상 활동</button><button data-menu="shore">상륙 탐사</button><button data-menu="officers">부선장 명부</button><button data-menu="items">아이템 가방</button><button data-menu="saleSearch">내 물품 최고가 판매처</button><button data-menu="business">항구 투자·활동</button><button data-menu="guns">대포·수리</button><button data-menu="combat">선장 전투</button><button data-menu="collection">수집 도감</button><button data-menu="ship">내 배 보기</button><button data-menu="captains">전체 선장</button><button data-menu="atlas">항구 찾기</button><button data-menu="globe">세계 지구본</button><button data-menu="rank">랭킹</button><button data-menu="mission">의뢰</button><button data-menu="chat">채팅</button><button data-menu="journal">항해일지</button><button data-menu="settings">조작·화면 설정</button><button data-menu="help">도움말</button></div>';
    openSheet('더보기','more');
    $('#quick-content').querySelectorAll('[data-menu]').forEach(b=>b.onclick=()=>{
      closeSheet();const key=b.dataset.menu;
      if(key==='menuFinder')api.onMenuFinder?.();else if(key==='sea')api.onSea?.();else if(key==='guild')api.onGuild?.();else if(key==='projects')api.onProjects?.();else if(key==='shore')api.onShore?.();else if(key==='officers')api.onOfficers?.();else if(key==='items')api.onItems?.();else if(key==='saleSearch')api.onSaleSearch?.();else if(key==='suggestions')api.onSuggestions?.();else if(key==='ownedPorts')api.onOwnedPorts?.();else if(key==='business')api.onBusiness?.();else if(key==='guns')api.onGuns?.();else if(key==='combat')api.onCombat?.();else if(key==='collection')api.onCollection?.();else if(key==='ship')api.onShip?.();else if(key==='captains')api.onCaptains?.();else if(key==='atlas')api.onAtlas();else if(key==='journal')api.onJournal();else if(key==='settings')showSettings();else if(key==='help')api.onHelp();else {
        if(key==='chat')api.onChat(true);
        $({globe:'.minimap-card',rank:'.rank-card',mission:'.mission-card',chat:'#chat-panel'}[key])?.scrollIntoView({block:'nearest'});
      }
    });
  }
  function layout(){
    closeSheet();if(mobile.matches)$('main').insertBefore($('#manual-pad'),$('#mobile-panels'));else navHome.after($('#manual-pad'));
    $('.chart').tabIndex=0;$('.chart').setAttribute('aria-label','항해 지도 · 방향키 또는 W 위 S 아래 A 왼쪽 D 오른쪽');
  }
  mobile.addEventListener('change',layout);layout();

  function applyPreferences(){
    document.documentElement.dataset.helmHand=prefs.hand==='left'?'left':'right';
    document.documentElement.style.setProperty('--user-port-width',`${Math.min(420,Math.max(280,Number(prefs.width)||315))}px`);
    document.querySelectorAll('.fold-heading button[aria-controls]').forEach(b=>{
      const id=b.getAttribute('aria-controls'),body=document.getElementById(id),folded=!!prefs.folds[id];if(!body)return;
      body.hidden=folded;b.closest('.fold-heading').parentElement.classList.toggle('is-collapsed',folded);b.textContent=folded?'+ 펼치기':'− 접기';b.setAttribute('aria-expanded',String(!folded));
    });
    if(prefs.folds.chat)api.onChat(false);api.onMapLabels?.();
    api.onRankVisibility?.(!$('#body-rank-card')?.hidden);
  }
  function loadPreferences(){
    const saved=read(storage,prefKey(),{});prefs={...defaultPreferences(),...saved,folds:{...(saved?.folds||{})}};applyPreferences();renderHUD();retryAck();
  }
  document.addEventListener('click',e=>{
    const b=e.target.closest?.('.fold-heading button[aria-controls],#chat-close');if(!b||!getAccount().uid)return;
    prefs.folds[b.id==='chat-close'?'chat':b.getAttribute('aria-controls')]=b.getAttribute('aria-expanded')==='false';storePrefs();
  });
  function showSettings(){
    api.onModal('조작·화면 설정','항해 환경','<p>PC는 방향키 또는 W 위 · S 아래 · A 왼쪽 · D 오른쪽으로 조종해요. Space는 정지·일시 정지예요.</p><p>지도에 초점이 있을 때 H 내 배 · T 교역 · B 보급 · U 업데이트를 사용할 수 있어요.</p><div class="settings-row"><strong>모바일 조작 위치</strong><button data-hand="left">왼손</button><button data-hand="right">오른손</button></div><div class="settings-row"><strong>PC 정보 영역</strong><button data-width="280">좁게</button><button data-width="315">기본</button><button data-width="420">넓게</button></div><label class="settings-row"><input id="letter-keys" type="checkbox"> WASD와 글자 단축키 사용</label><label class="settings-row"><input id="place-names" type="checkbox"> 지도 지명 표시</label><label class="settings-row"><input id="auto-supply" type="checkbox"> 항구 도착 시 자동 보급</label><button class="service-button" id="reset-ux">화면 설정 초기화</button>');
    const paint=()=>{modal.querySelectorAll('[data-hand]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.hand===prefs.hand)));modal.querySelectorAll('[data-width]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.width)===prefs.width)));$('#letter-keys').checked=prefs.letters;$('#place-names').checked=prefs.placeNames;$('#auto-supply').checked=api.getState().autoSupply===true;};
    const update=()=>{storePrefs();applyPreferences();paint();};
    modal.querySelectorAll('[data-hand]').forEach(b=>b.onclick=()=>{prefs.hand=b.dataset.hand;update();});
    modal.querySelectorAll('[data-width]').forEach(b=>b.onclick=()=>{prefs.width=Number(b.dataset.width);update();});
    $('#letter-keys').onchange=e=>{prefs.letters=e.target.checked;update();};
    $('#place-names').onchange=e=>{prefs.placeNames=e.target.checked;update();};
    $('#auto-supply').onchange=e=>{api.getState().autoSupply=e.target.checked;api.onSave();};
    $('#reset-ux').onclick=()=>{prefs=defaultPreferences();api.onChat(true);update();};paint();
  }
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&!e.isComposing&&!modal.open&&!sheet.open&&!isTypingTarget(e.target)){api.onStop();return;}
    if(e.defaultPrevented||e.repeat||e.isComposing||e.ctrlKey||e.altKey||e.metaKey||modal.open||sheet.open||isTypingTarget(e.target)||!prefs.letters||document.activeElement!==$('.chart'))return;
    const key=String(e.key).toLowerCase(),act={h:api.onHome,t:()=>openPort(),b:()=>openPort('supply'),u:()=>patchNotes(true)}[key];if(act){e.preventDefault();act();}
  });

  function renderHUD(){
    const s=tools(),v=s.voyage,p=PORT_BY_ID[s.port],name=PORT_BY_ID[v?.target]?.name||'선택한 해역';
    const remaining=v?voyageEstimate(s,v,v.travelled):null;
    $('#action-status').textContent=p?`${p.name} 정박 · 교역 가능 · 보급 ${s.food.toFixed(1)}일분`:v?`${name} ${v.kind?'구조 이동':'항해'} · ${remaining.days.toFixed(1)}일 / 약 ${Math.ceil(remaining.seconds)}초 · 보급 ${s.food.toFixed(1)}일분`:`해상 · 보급 ${s.food.toFixed(1)}일분${s.food<=ship(s).reserve?' · 보급항을 확인하세요':''}`;
    $('#action-context').textContent=p?'교역·보급':'항구 찾기';
    $('#update-new').hidden=!getAccount().uid||getAccount().seenVersion===RELEASE||read(storage,pendingKey(),null)===RELEASE;
  }
  function renderShip(){
    const s=tools(),spec=ship(s),docked=!!tradingPort(s),next=SHIPS[shipTier(s)+1];
    const freeFood=Math.max(0,Math.min(spec.supply-s.food,(capacity(s)-usedCargo(s))*2/fleetCount(s)-s.food));
    $('#ship-content').innerHTML=`<div class="ship-card"><img class="port-ship-image" src="${shipArtPath(shipTier(s))}" alt="${escape(spec.name)}"><h3>${spec.name} · ${shipTier(s)+1}/20단계 · ${fleetCount(s)}척</h3><p>해상 하루 ${spec.speed}해리 · 강 하루 ${spec.riverSpeed}해리<br>${Number.isFinite(spec.offshore)?'해안에서 '+spec.offshore+'해리 이내 · ':''}보급 ${s.food.toFixed(1)} / ${spec.supply}일분 · 적재 ${usedSpace(s)} / ${capacity(s)}칸</p><p>비현금 보급 크레딧 ${fmt(s.supplyCreditValue||0)} D 상당</p><button class="service-button" id="supply-one" ${docked&&freeFood>1e-8?'':'disabled'}>보급 +1일분 <span>${supplyCost(s,Math.min(1,freeFood))} D</span></button><button class="service-button" id="supply-btn" ${docked&&freeFood>1e-8?'':'disabled'}>가득 채우기 · +${freeFood.toFixed(1)}일분 <span>${supplyCost(s,freeFood)} D</span></button><button class="service-button" id="supply-unload" ${docked&&s.food>0?'':'disabled'}>보급 1일분 내려 보관</button><button class="service-button" id="upgrade-btn">내 배 보기 · 개량/선단 <span>${next?fmt(upgradeCost(s))+' D':'최대 개량'}</span></button>${PORT_BY_ID[s.port]?.depot?'<button class="service-button" id="depot-supply-open">공동 창고에서 보급</button>':'<button class="service-button" id="guild-open">항구 조합</button>'}<button class="service-button" id="shore-open">상륙 탐사</button><p>최대 ${fleetLimit(s)}척 보유 가능 · 구조는 방문한 항구로 귀환해요.</p></div>`;
    $('#guild-open')?.addEventListener('click',()=>api.onGuild?.());
    $('#depot-supply-open')?.addEventListener('click',()=>api.onDepot?.(s.port));
    $('#shore-open').onclick=()=>api.onShore?.();
    const supply=amount=>{const result=resupply(s,amount);if(!result.ok){api.onToast(result.error,'error');return;}api.onToast(`보급 ${result.amount.toFixed(1)}일분 · ${result.cost} D`);api.onSave();};
    $('#supply-one').onclick=()=>supply(1);$('#supply-btn').onclick=()=>supply(Infinity);
    $('#supply-unload').onclick=()=>{if(unloadSupply(s,1)){api.onToast('보급을 항구에 보관했어요.');api.onSave();}};
    $('#upgrade-btn').onclick=()=>api.onShip?.();
  }

  function renderPortStory(p){
    const key=p?`${p.id}:${tools().visited.includes(p.id)}`:'';
    if(lastStoryId===key)return;lastStoryId=key;story.hidden=!p;if(!p)return;
    const h=NEW_PORT_HISTORY[p.id]||PORT_HISTORY[p.id];$('#port-story-content').innerHTML=`<p>${escape(h?.text||p.fact)}</p>${h?.eraNote?`<p>${escape(h.eraNote)}</p>`:''}${h?.sources?.length?`<ul>${h.sources.map(s=>`<li><a href="${escape(s.url)}" target="_blank" rel="noopener">${escape(s.label)}</a></li>`).join('')}</ul>`:''}<button type="button" id="port-favorite">즐겨찾기</button>${tools().visited.includes(p.id)?'<button type="button" id="port-share">항구 정보 공유</button>':''}`;
    const star=$('#port-favorite');const paint=()=>star.textContent=tools().favorites.includes(p.id)?'★ 즐겨찾기 해제':'☆ 즐겨찾기';paint();
    star.onclick=()=>{const list=tools().favorites;if(list.includes(p.id))tools().favorites=list.filter(id=>id!==p.id);else if(list.length<20)list.push(p.id);else{api.onToast('즐겨찾기는 20곳까지예요.');return;}paint();api.onSave();};
    $('#port-share')?.addEventListener('click',()=>share(`항구 정보 · ${p.name} · ${p.sea}`,{kind:'port',ref:{portId:p.id}}));
  }

  function trade(mode,id){
    if(api.onTrade)return api.onTrade(mode,id);
    const port=tradingPort(tools());if(!port||mode==='buy'&&port.id!==getSelection())return;
    tradeDraft={mode,id,port:port.id,qty:1,done:false};renderDraft();draft.scrollIntoView({block:'nearest'});
  }
  function renderDraft(){
    if(!tradeDraft){draft.hidden=true;return;}
    const s=tools(),t=tradeDraft,p=tradingPort(s);if(!p||t.port!==p.id){tradeDraft=null;draft.hidden=true;return;}
    const g=GOODS[t.id],owned=s.cargo[t.id],unit=t.mode==='buy'?price(p.id,t.id,s.day):sellPrice(p.id,t.id,s.day),max=t.mode==='buy'?maxBuyQuantity(s,t.id):(owned?.qty||0);
    const target=getPlan()?Math.min(ship(s).supply,voyageEstimate(s,getPlan().route).food+ship(s).reserve):ship(s).supply;
    t.qty=Math.min(max,Math.max(1,Math.floor(t.qty)||1));const total=t.qty*unit,profit=owned?t.qty*(unit-owned.cost/owned.qty):0;
    const heldFood=Math.max(0,target-s.food),reserve=supplyCost(s,heldFood),space=Math.max(0,Math.ceil(target*fleetCount(s)/2)-supplySpace(s));
    const fieldFocused=document.activeElement?.id==='inline-qty';draft.hidden=false;
    draft.innerHTML=`<div class="trade-draft-head"><strong>${g.name} ${t.mode==='buy'?'구매':'판매'} · ${p.name}</strong><button id="inline-close">닫기</button></div><p>상자당 ${unit} D · 보유 ${owned?.qty||0}상자 · ${t.mode==='buy'?'구매':'판매'} 가능 ${max}상자</p><div class="quick-qty"><button data-step="-1">−</button><input id="inline-qty" aria-label="거래 수량" inputmode="numeric" pattern="[0-9]*" value="${t.qty}"><button data-step="1">+</button><button data-qty="1">1</button><button data-qty="5">5</button><button data-qty="10">10</button><button data-qty="${max}">최대</button></div>${t.mode==='buy'?`<button class="service-button" id="reserve-max">보급 여유를 남기고 최대 <small>보급비 ${reserve} D · 공간 ${space}칸 남김</small></button>`:''}<p id="inline-total">${fmt(total)} D · 거래 후 ${fmt(s.money+(t.mode==='buy'?-total:total))} D${t.mode==='sell'?` · ${profit<0?'예상 손실':'예상 이익'} ${fmt(Math.abs(profit))} D`:''}</p><p>거래 후 적재 ${usedSpace(s)+(t.mode==='buy'?t.qty:-t.qty)} / ${capacity(s)}칸</p><button class="primary-button" id="inline-confirm" ${!max||t.done?'disabled':''}>${t.mode==='buy'?'구매':'판매'} 확정</button><p id="inline-result" role="status">${escape(t.message||'')}</p>`;
    const input=$('#inline-qty');if(fieldFocused)input.focus({preventScroll:true});
    input.oninput=()=>{t.qty=Number(input.value);t.done=false;$('#inline-confirm').disabled=!Number.isInteger(t.qty)||t.qty<1||t.qty>max;const quantity=Math.min(max,Math.max(0,Math.floor(t.qty)||0));$('#inline-total').textContent=`${fmt(quantity*unit)} D · ${quantity}상자`;};
    const choose=q=>{t.qty=q;t.done=false;renderDraft();};
    draft.querySelectorAll('[data-qty]').forEach(b=>b.onclick=()=>choose(Number(b.dataset.qty)));
    draft.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>choose(t.qty+Number(b.dataset.step)));
    $('#reserve-max')?.addEventListener('click',()=>{const q=maxBuyQuantity(s,t.id,target);if(q>0)choose(q);else api.onToast('보급 여유를 남기면 더 살 수 없어요.');});
    $('#inline-close').onclick=()=>{tradeDraft=null;draft.hidden=true;};
    $('#inline-confirm').onclick=()=>{
      if(t.done||tradingPort(s)?.id!==t.port||t.mode==='buy'&&getSelection()!==t.port)return;
      const quantity=Number(input.value);if(!Number.isInteger(quantity)||quantity<1){api.onToast('수량은 1 이상의 정수로 입력하세요.');return;}
      t.done=true;const r=(t.mode==='buy'?buy:sell)(s,t.id,quantity);
      if(!r.ok){t.done=false;api.onToast(r.error,'error');return;}
      t.message=`${g.name} ${r.qty}상자 ${t.mode==='buy'?'구매':'판매'} · ${fmt(r.total)} D`;s.log.unshift({day:s.day,text:t.message,type:'trade'});s.log=s.log.slice(0,50);api.onToast(t.message);api.onSave();renderDraft();
    };
  }

  function patchNotes(all){
    const account=getAccount(),pending=read(storage,pendingKey(),null);
    if(!all&&(account.seenVersion===RELEASE||pending===RELEASE))return;
    const newest=RELEASES[0],list=all?RELEASES:[newest];
    const body=list.map((r,i)=>`<details class="release-card" ${i===0?'open':''}><summary><small>${escape(r.date)} · ${escape(r.id)}</small><strong>${escape(r.title)}</strong></summary>${(all?Object.entries(r.changes):[['이번 변경',r.summary]]).map(([k,entries])=>`<h3>${escape(k)}</h3><ul>${entries.map(t=>`<li>${escape(t)}</li>`).join('')}</ul>`).join('')}${i?'<p>당시 공개된 내용이에요.</p>':''}</details>`).join('');
    api.onModal('업데이트','바람의 항로',`${body}${!all?'<button class="service-button" id="release-all">지난 업데이트까지 보기</button>':''}${account.uid&&account.seenVersion!==RELEASE?'<button class="primary-button" id="release-confirm">확인하고 항해하기</button>':''}`);
    $('#release-all')?.addEventListener('click',()=>patchNotes(true));
    $('#release-confirm')?.addEventListener('click',()=>{write(storage,pendingKey(),RELEASE);renderHUD();api.onClose();retryAck();});
  }
  async function retryAck(){
    const a=getAccount();if(!a.uid||!a.ready||patchBusy||a.seenVersion===RELEASE||read(storage,pendingKey(),null)!==RELEASE||!navigator.onLine)return;
    patchBusy=true;try{await a.acknowledge(RELEASE);write(storage,pendingKey(),null);renderHUD();}catch{/* Keep pending acknowledgement for reconnection. */}finally{patchBusy=false;}
  }
  window.addEventListener('online',retryAck);

  function confirmSea(point){
    const s=tools();if(s.controlMode==='auto'){api.onPlan(null,point,false);openPort('target',false);return;}
    api.onModal('바다로 이동','직접 조종',`<p>선택한 지점까지 ${fmt(distance(s.position,point))}해리예요. 바다에서 보급이 부족하면 가까운 항구로 구조돼요.</p><button class="primary-button" id="sea-confirm">여기로 이동</button>`);
    $('#sea-confirm').onclick=()=>{api.onClose();api.onManual(point);};
  }
  function migration(){
    const s=tools(),nav=getNav();if(!s.transitionPending||!nav)return;
    const safe=nearestHarbor(s,nav),route=safe&&nav.route(s.position,[safe.port.lon,safe.port.lat],{maxOffshore:ship(s).offshore});
    const candidate={...s,food:Math.min(s.food,ship(s).supply)};
    if(route&&canDepart(candidate,route).ok){settleSupply(s);api.onSave();return;}
    if(modal.open){modal.addEventListener('close',migration,{once:true});return;}
    api.onModal('기존 항해 기록을 이어갑니다','항해 규칙 전환','<p>새 보급·연안 규칙으로 안전하게 돌아가기 어려운 위치예요. 가장 가까운 항구까지 한 번 무료로 이동할 수 있어요.</p><button class="primary-button" id="migration-return">안전하게 항구로 돌아가기</button>');
    $('#migration-return').onclick=()=>{if(api.onRescue(true))api.onClose();};
  }

  function share(text,card){
    api.onModal('전체 채팅에 공유','선장 간 정보 공유',`<p>${escape(text)}</p><button class="primary-button" id="share-send">보내기</button>`);
    const button=$('#share-send');button.onclick=async()=>{button.disabled=true;const r=await getChat().send(text,card);if(r.ok){api.onToast('전체 채팅에 보냈어요.');if(button.isConnected)api.onClose();}else{button.disabled=false;api.onToast(r.error,'error');}};
  }
  function signal(peer){
    if(!getVisibleShips().some(s=>s.uid===peer.uid))return;
    api.onModal(peer.name,'시야 안 선장 · '+(peer.offline?'오프라인':'접속 중'),'<button class="service-button" id="visible-captain-attack">이 선장 공격하기</button><p>항구에 정박한 배는 공격할 수 없어요.</p><p>인사는 전체 채팅에 표시돼요.</p>'+Object.entries(SIGNAL_LABELS).map(([code,label])=>`<button class="service-button" data-signal="${code}">${label}</button>`).join(''));
    $('#visible-captain-attack').onclick=()=>{api.onClose();api.onCombatTarget?.(peer.uid);};
    modal.querySelectorAll('[data-signal]').forEach(b=>b.onclick=()=>{if(!getVisibleShips().some(s=>s.uid===peer.uid)){api.onToast('선장이 시야에서 벗어났어요.');return;}const code=b.dataset.signal;share(`${peer.name} 선장님, ${SIGNAL_LABELS[code]}!`,{kind:'signal',ref:{code,targetUid:peer.uid,targetName:peer.name}});});
  }
  function card(message){
    if(!['port','route'].includes(message.kind)||!validCard(message))return null;
    const b=document.createElement('button');b.className='chat-card-link';b.dataset.usageKey='action-chat-card';b.type='button';b.textContent='공유 정보 보기';b.onclick=()=>{
      const p=PORT_BY_ID[message.ref.portId||message.ref.toPortId],from=PORT_BY_ID[message.ref.fromPortId];if(!p)return;
      api.onShareRecord?.(message,from,p);const known=p.active&&tools().knownPorts.includes(p.id)&&(!from||tools().knownPorts.includes(from.id));
      api.onModal(p.name,from?`${from.name} → ${p.name}`:'항구 정보',`<p>${escape((NEW_PORT_HISTORY[p.id]||PORT_HISTORY[p.id])?.text||p.fact)}</p>${from?`<p>공유 선장의 관측 거리 ${fmt(message.ref.observedNm)}해리</p>`:''}${!p.active?'<p>이전 항구의 기록이에요. 현재 주요 항구 목록에서는 제외됐어요.</p>':''}${known?'<button class="primary-button" id="shared-target">내 항해 미리보기</button>':'<p>항구를 발견하면 목적지로 선택할 수 있어요.</p>'}`);
      $('#shared-target')?.addEventListener('click',()=>{api.onClose();api.onSelect(p.id);});
    };return b;
  }

  return {get placeNames(){return prefs.placeNames;},get letterKeys(){return prefs.letters;},isBlocking:()=>sheet.open,beforeDialog:api.onStop,loadPreferences,renderHUD,renderShip,renderPortStory,renderDraft,trade,openPort,closeSheet,patchNotes,confirmSea,migration,signal,card,share,settings:showSettings};
}
