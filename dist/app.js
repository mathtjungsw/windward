import {createUiUsage} from './ui-usage.js?v=2026.11.12-collections-ranks-historic-ships.3';
import {DISCOVERIES} from './discoveries-catalog.js?v=2026.11.12-collections-ranks-historic-ships.3';
import {createChartDetail} from './chart-waterways.js?v=2026.11.12-collections-ranks-historic-ships.3';
import {reconcileNavigation} from './navigation-migration.js?v=2026.11.12-collections-ranks-historic-ships.3';
import {ChartTerrain} from './chart-terrain.js?v=2026.11.12-collections-ranks-historic-ships.3';
import {SimulationClock} from './simulation-clock.js?v=2026.11.12-collections-ranks-historic-ships.3';
import {createRoutePlanner} from './route-planner.js?v=2026.11.12-collections-ranks-historic-ships.3';
import {createSaleFinder} from './sale-finder.js?v=2026.11.12-collections-ranks-historic-ships.3';
import {PLACE_NAMES} from './place-names.js?v=2026.11.12-collections-ranks-historic-ships.3';
import {layoutChartLabels} from './chart-labels.js?v=2026.11.12-collections-ranks-historic-ships.3';
import {RANK_GROUPS,RANK_DEFINITIONS,RANK_BY_ID,formatRankScore} from './rank-metrics.js?v=2026.11.12-collections-ranks-historic-ships.3';
import {createCommunity} from './community.js?v=2026.11.12-collections-ranks-historic-ships.3';
import {PIRATE_ZONES} from './combat-core.js?v=2026.11.12-collections-ranks-historic-ships.3';
import {wakeFollowers,orderedFleet} from './fleet-wake.js?v=2026.11.12-collections-ranks-historic-ships.3';
import {createCombat} from './combat-ui.js?v=2026.11.12-collections-ranks-historic-ships.3';
import {createBusiness} from './business-ui.js?v=2026.11.12-collections-ranks-historic-ships.3';
import {createExpansion} from './expansion-ui.js?v=2026.11.12-collections-ranks-historic-ships.3';
import {gameStats} from './public-stats.js?v=2026.11.12-collections-ranks-historic-ships.3';
import {shipTier,fleetCount,fleetShips,fleetMaxHP} from './ship-rules.js?v=2026.11.12-collections-ranks-historic-ships.3';
import {shipGlyph} from './art.js?v=2026.11.12-collections-ranks-historic-ships.3';
import {inspectDiscovery,explorationAllowed,discoveryStats} from './discoveries.js?v=2026.11.12-collections-ranks-historic-ships.3';
import {RELEASE} from './release-notes.js?v=2026.11.12-collections-ranks-historic-ships.3';
import {createUX} from './ux.js?v=2026.11.12-collections-ranks-historic-ships.3';
import {directionForKey,isTypingTarget} from './controls.js?v=2026.11.12-collections-ranks-historic-ships.3';
import {GOODS,PORTS,ALL_PORTS,ACTIVE_PORT_BY_ID,PORT_BY_ID,MISSIONS} from './data.js?v=2026.11.12-collections-ranks-historic-ships.3';
import {ship,supplySpace,usedSpace,resupply,unloadSupply,upgradeShip,maxBuyQuantity,canDepart,advanceVoyage,advanceManualMotion,beginRescue,recordArrival,settleSupply,ACTIVE_SECONDS_PER_DAY,START_DATE,initialState,capacity,usedCargo,dailySpeed,price,sellPrice,buy,sell,Navigator,project,unproject,positionAlong,voyageEstimate,distance,helmStep,helmToward,tradingPort} from './engine.js?v=2026.11.12-collections-ranks-historic-ships.3';
import {AtlasView} from './atlas-view.js?v=2026.11.12-collections-ranks-historic-ships.3';
import {FleetPresence} from './multiplayer.js?v=2026.11.12-collections-ranks-historic-ships.3';
import {PRESENCE_COLORS,shipsInSight} from './presence-core.js?v=2026.11.12-collections-ranks-historic-ships.3';
import {CaptainChat} from './chat.js?v=2026.11.12-collections-ranks-historic-ships.3';
import {rankFleet,chatText,CHAT_MAX_LENGTH} from './social-core.js?v=2026.11.12-collections-ranks-historic-ships.3';
import {Exploration,SIGHT_NM,DISCOVERY_NM,informationCost,informationCandidate,buyInformation,knowsPort,discoverPorts,dockAlong,leftHarbor} from './voyage-core.js?v=2026.11.12-collections-ranks-historic-ships.3';
import {CaptainAccount,authMessage,clearLegacyStorage,localSaveKey} from './account.js?v=2026.11.12-collections-ranks-historic-ships.3';
import {FIREBASE_CONFIG} from './firebase-config.js?v=2026.11.12-collections-ranks-historic-ships.3';
import {collectionProfile,createCollectionPublisher} from './collection-profile.js?v=2026.11.12-collections-ranks-historic-ships.3';
import {showMenuFinder} from './menu-finder.js?v=2026.11.12-collections-ranks-historic-ships.3';
import {CaptainRankings} from './rankings.js?v=2026.11.12-collections-ranks-historic-ships.3';
import {wrapCamera,wrapPosition,wrappedMotion,mapToward,mapDistance} from './world-wrap.js?v=2026.11.12-collections-ranks-historic-ships.3';

import {createSeaActivityUI} from './sea-activity-ui.js?v=2026.11.12-collections-ranks-historic-ships.3';
import {seaActivityAction,finishSeaRescue} from './sea-activities.js?v=2026.11.12-collections-ranks-historic-ships.3';
import {captainTradeQuote,executeTrade,taxRate,permitted} from './commerce.js?v=2026.11.12-collections-ranks-historic-ships.3';
import {createGuildUI} from './guild-ui.js?v=2026.11.12-collections-ranks-historic-ships.3';
import {setIncomeOfficer} from './port-income.js?v=2026.11.12-collections-ranks-historic-ships.3';
import {ownership} from './commerce.js?v=2026.11.12-collections-ranks-historic-ships.3';
import {createProjectsUI} from './projects-ui.js?v=2026.11.12-collections-ranks-historic-ships.3';
import {CANALS,PROJECT_BY_ID,projectAction,projectView,normalizeDepotDock} from './projects.js?v=2026.11.12-collections-ranks-historic-ships.3';
import {currentCanal,designateCanalPass,refundCanalTolls,reserveCanalTolls} from './canal-reservations.js?v=2026.11.12-collections-ranks-historic-ships.3';
import {availableCharters,charterAction,expireCharters} from './guild-contracts.js?v=2026.11.12-collections-ranks-historic-ships.3';
import {createShoreUI} from './shore-ui.js?v=2026.11.12-collections-ranks-historic-ships.3';
import {shoreAction} from './shore-expeditions.js?v=2026.11.12-collections-ranks-historic-ships.3';
import {createRumorUI} from './rumor-ui.js?v=2026.11.12-collections-ranks-historic-ships.3';
import {activeOfficer,performContractAction,activateCoupon,activateDistanceGear,activateTradeVoucher,explorationGear,appendItemRecord} from './rumor-progress.js?v=2026.11.12-collections-ranks-historic-ships.3';
import {useRepairKit} from './activities.js?v=2026.11.12-collections-ranks-historic-ships.3';
import {ITEM_BY_ID} from './rumor-catalog.js?v=2026.11.12-collections-ranks-historic-ships.3';
import {manualHelmSpeed,useEmergencySupplies,autoResupply,makeRoute} from './engine.js?v=2026.11.12-collections-ranks-historic-ships.3';

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const fmt=n=>Math.round(n).toLocaleString('ko-KR');
const toward=name=>{const final=(name.charCodeAt(name.length-1)-0xac00)%28;return name+(final>0&&final!==8?'으로':'로');};
const icon=(name,cls='')=>`<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
let storage;try{storage=localStorage;}catch{storage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};}
let ux,expansion,business,combat,community,saleFinder,rumorUI,shoreUI,guildUI,seaUI,projectsUI,committedStats=null;
const surveyedCanals=new Map();
let settlingCanal=false;
let longRoutePlanner=null;
let modalFocus=null,manualTrail=[];
const sailingClock=new SimulationClock();
let state=initialState(),selected='lisbon',planned=null,nav=null,paused=false,sound=false,audio=null,activeTab='trade',mapReady=false,followShip=false;
let exploration=new Exploration(state.explored),playing=false,sessionBlocked=false,lastFogAt=0;
exploration.seed(state);
let tabSession;
try {
  if (performance.getEntriesByType('navigation')[0]?.type==='reload') {
    tabSession=sessionStorage.getItem('windward-v3-tab')||undefined;
  }
} catch {}
const account=new CaptainAccount(storage,tabSession);
try{sessionStorage.setItem('windward-v3-tab',account.session);}catch{}
account.getNavigation=()=>nav;
account.applyGame=game=>{for(const k of Object.keys(state))delete state[k];Object.assign(state,game);};
account.readGame=()=>{state.explored=exploration.encode();return state;};
account.onDefense=()=>{stopForUI();paused=!!state.voyage;combat?.renderMap();};
account.onBusy=value=>{sailingClock.reset(performance.now());document.querySelectorAll('.topbar,.statusbar,.game-layout,.bottom-bar,#modal,#quick-sheet').forEach(el=>el.inert=value||(account.economicUncertain&&!el.matches('#modal')));document.body.classList.toggle('economic-busy',value);};
account.onStatus=text=>{$('#save-status').textContent=text;};
account.onUncertain=()=>{sessionBlocked=true;paused=true;stopForUI();fleet.stop();showModal('거래 결과를 확인해야 해요','항해 기록 보호','<p>서버 응답을 확인하지 못해 항해와 저장을 멈췄어요. 요청 기록을 보관했습니다. 새로고침하면 서버에 확정된 기록으로 이어집니다.</p><button id="reload-economic" class="primary-button">새로고침해 결과 확인</button>','small');$('#reload-economic').onclick=()=>location.reload();};
account.onConflict=()=>{sessionBlocked=true;paused=true;heldKeys.clear();manualActive=false;fleet.stop();showModal('항해 기록이 갱신됐어요','항해 기록 보호','<p>다른 화면이나 서버에서 기록이 변경되어 이 화면의 항해와 저장을 멈췄어요. 이 기기 기록은 보존했습니다. 새로고침하면 최신 기록과 전환 보상을 확인할 수 있어요.</p>');};
const FIXED_MAP_SCALE=12;
const CHART_TILES=[-1600,0,1600].flatMap(x=>[-800,0,800].map(y=>[x,y]));
let camera={x:project(state.position)[0],y:project(state.position)[1]},screen={w:0,h:0,k:FIXED_MAP_SCALE},drag=null,dragged=false,frame=0,globe=null,chartTerrain=null;
const heldKeys=new Set(),portApproaches=new Map();
const portPoint=port=>portApproaches.get(port.id)||[port.lon,port.lat];
const atlasPorts=()=>PORTS.map(port=>{const [lon,lat]=portPoint(port);return {...port,lon,lat};});
const heldKeyboard=new Map(),heldPointers=new Map();let navigationIntent=0;
let manualTarget=null,manualActive=false,departedPort=null,manualAngle=0,manualChannel=null,lastPanelPort=null;
const modal=$('#modal');
let fleetStatus='offline',peerDrawTime=0,ownShipAngle=0,rankMetric='profit',chatOpen=true,chatUnread=0,chatSeen=0,chatLoading=true;
const ownRank=()=>({id:fleet.uid||'self',name:fleet.name,...(committedStats||gameStats(state,exploration))});
const publishCollection=createCollectionPublisher(account);
account.onCommitted=(game,revision)=>{
  committedStats={...gameStats(game),saveRevision:revision};
  fleet.publishSummary();
  publishCollection(collectionProfile(game),revision);
};
const fleet=new FleetPresence({storage,readStats:()=>committedStats,readShip:()=>({position:[...state.position],angle:ownShipAngle,money:state.money,profit:state.profit,visited:state.visited.length,shipTier:shipTier(state),fleetCount:fleetCount(state),fleetTiers:orderedFleet(state).map(p=>p.tier),fleetKinds:Object.fromEntries(orderedFleet(state).flatMap((v,i)=>v.kind?[[i,v.kind]]:[])),status:state.port?'정박':paused||modal.open||document.hidden||(!state.voyage&&!manualActive)?'멈춤':'항해'}),onChange:()=>{renderFleetStatus();renderRanks();renderPeers();renderMinimap();},onStatus:status=>{fleetStatus=status;if(status==='online'){chat.connect();rankings.visible=!$('#body-rank-card')?.hidden;rankings.connect();}else if(status==='offline'){chat.disconnect();rankings.disconnect();}renderFleetStatus();renderRanks();renderChatConnection();}});
const chat=new CaptainChat({fleet,onChange:messages=>renderChat(messages),onStatus:text=>{$('#chat-status').textContent=text;renderChatConnection();}});
const rankings=new CaptainRankings(fleet,()=>renderRanks());
const visibleShips=()=>shipsInSight(fleet.captains(),state.position,SIGHT_NM);


function setupInterface(){
  const worldBadge=document.createElement('button');worldBadge.id='world-badge';worldBadge.className='world-badge';worldBadge.onclick=showAccount;$('.header-end').prepend(worldBadge);
  const noteTab=document.createElement('button');noteTab.id='rumor-note-tab';noteTab.textContent='소문노트';noteTab.onclick=()=>rumorUI?.showNote();
  const tavernTab=document.createElement('button');tavernTab.id='tavern-tab';tavernTab.textContent='주점';tavernTab.onclick=()=>setTab('tavern');$('.panel-tabs').append(tavernTab,noteTab);
  const tavern=document.createElement('section');tavern.id='tavern-content';tavern.className='hidden';$('.panel-content').append(tavern);
  const arrow=svgEl('path',{id:'heading-arrow',d:'M0-27V-42m-5 7 5-7 5 7',stroke:'#1d667a','stroke-width':3,fill:'none'});$('#ship-marker').append(arrow);
  const fog=svgEl('image',{id:'exploration-fog',x:0,y:0,width:1600,height:800,'pointer-events':'none',preserveAspectRatio:'none'});$('#routes').before(fog);
  const sight=svgEl('path',{id:'sight-boundary',fill:'none',stroke:'#fffdf0','stroke-width':1.4,'stroke-dasharray':'6 5','vector-effect':'non-scaling-stroke','pointer-events':'none'});fog.after(sight);
  setupRankControls();
  const rankButton=document.createElement('button');rankButton.id='my-rank-query';rankButton.className='service-button';rankButton.textContent='내 순위 조회';rankButton.onclick=async()=>{if(!fleet.connected||!rankings.path){toast('계정으로 함께 항해에 연결하면 조회할 수 있어요.');return;}rankButton.disabled=true;try{const metric=rankMetric;
    await rankings.myRank(metric,ownRank()[metric]);renderRanks();
    if(metric==='overallScore'&&rankMetric===metric){
      const detail=rankings.overallDetail;
      const points=n=>((n||0)/100).toFixed(2)+'점';
      showModal('내 종합 순위',detail?detail.rank+'위 · '+points(detail.overallScore):'집계 기록 없음',
        detail?RANK_GROUPS.filter(([id])=>id!=='overall').map(([id,label])=>'<details><summary>'+label+' · '+points(detail.groups?.[id])+'</summary>'+
        RANK_DEFINITIONS.filter(m=>m.group===id).map(m=>'<p>'+m.label+' · '+points(detail.points?.[m.id])+'</p>').join('')+'</details>').join(''):'<p>종합 집계에 반영된 기록이 없어요.</p>','medium');
    }}catch{toast('순위를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.');}finally{rankButton.disabled=false;}};$('.rank-card').append(rankButton);
  for(const [selector,title] of [['.navigation-mode','항해 조작'],['.captain-card','내 항해 정보'],['.rank-card','선장 랭킹'],['.mission-card','항해사의 의뢰'],['.port-panel','항구 정보'],['.minimap-card','세계지도']]){
    const panel=$(selector),body=document.createElement('div');body.className='fold-body';while(panel.firstChild)body.append(panel.firstChild);panel.append(body);const header=document.createElement('div');header.className='fold-heading';const label=document.createElement('strong');label.textContent=title;const button=document.createElement('button');button.type='button';button.textContent='− 접기';button.setAttribute('aria-expanded','true');body.id='body-'+selector.slice(1);button.setAttribute('aria-controls',body.id);button.dataset.usageKey='action-fold-'+selector.slice(1);button.onclick=()=>{const folded=panel.classList.toggle('is-collapsed');body.hidden=folded;button.textContent=folded?'+ 펼치기':'− 접기';button.setAttribute('aria-expanded',String(!folded));if(selector==='.rank-card')rankings.setVisible(!folded);if(mapReady)resizeMap();};header.append(label,button);panel.prepend(header);
  }
  const chatBody=document.createElement('div');chatBody.id='chat-body';while($('#chat-panel').children.length>1)chatBody.append($('#chat-panel').children[1]);$('#chat-panel').append(chatBody);$('#chat-close').textContent='− 접기';$('#chat-close').setAttribute('aria-label','채팅 접기 또는 펼치기');$('#chat-close').setAttribute('aria-expanded','true');$('#chat-panel').hidden=false;
  const preview=document.createElement('div');preview.id='chat-preview';preview.className='chat-preview';preview.hidden=true;$('#chat-panel').after(preview);
  const dock=document.createElement('div');dock.id='mobile-panels';$('.chart').after(dock);
  const moving=['.navigation-mode','.voyage-sidebar','.minimap-card','#port-panel','#chat-panel','#chat-preview'].map(selector=>{const node=$(selector),placeholder=document.createComment(selector);node.before(placeholder);return {node,placeholder};});
  const right=document.createElement('div');right.id='desktop-panels';$('.game-layout').append(right);
  const mobile=matchMedia('(max-width:850px)');const layout=()=>{if(mobile.matches){for(const item of moving)dock.append(item.node);}else{$('.game-layout').prepend($('.voyage-sidebar'));$('.voyage-sidebar').prepend($('.navigation-mode'));const item=moving.find(i=>i.node.matches('.minimap-card'));item.placeholder.after(item.node);right.append($('#port-panel'),$('#chat-panel'),$('#chat-preview'));}if(mapReady)resizeMap();};mobile.addEventListener('change',layout);layout();
  toggleChat(true);
}
function renderFog(force=false){
  if(!mapReady||!force&&performance.now()-lastFogAt<250)return;lastFogAt=performance.now();
  const canvas=document.createElement('canvas');canvas.width=720;canvas.height=280;const ctx=canvas.getContext('2d'),data=ctx.createImageData(720,280);
  for(let i=0;i<720*280;i++){const seen=!!(exploration.bits[i>>3]&(1<<(i&7))),j=i*4;data.data[j]=seen?173:35;data.data[j+1]=seen?185:61;data.data[j+2]=seen?190:76;data.data[j+3]=seen?170:250;}ctx.putImageData(data,0,0);
  ctx.globalCompositeOperation='destination-out';if(explorationAllowed(state))for(const shift of [-720,0,720])for(const vertical of [-280,0,280]){ctx.beginPath();exploration.boundary(state.position).forEach((p,i)=>{let lon=p[0];while(lon-state.position[0]>180)lon-=360;while(lon-state.position[0]<-180)lon+=360;const x=(lon+180)*2+shift,y=(80-p[1])*2+vertical;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);});ctx.closePath();ctx.fill();}
  $('#exploration-fog').setAttribute('href',canvas.toDataURL());$('#sight-boundary').setAttribute('d',explorationAllowed(state)?routePath(exploration.boundary(state.position)):'');renderMinimap();
}
function exploreMove(from,to){
  exploration.frozen=!explorationAllowed(state);if(exploration.frozen)return;exploration.travel(from,to);const found=discoverPorts(state,from,to,portPoint);if(found.length){for(const p of found){log(`${p.name}의 항구를 찾았습니다. 자동 항해 목적지가 열렸어요.`,'discovery');toast(`새 항구 정보 · ${p.name}`,'discovery');}renderPorts();renderPanel();save();}renderFog();
}
function showAccount(){
  showModal('선장의 항해 기록','현실서버 · 1배속',
    '<p>항해 기록은 Google 계정에 연결돼요.</p><button class="primary-button" id="return-entry">저장하고 로그아웃</button>');
  $('#return-entry').onclick=async()=>{
    save();
    playing=false;
    $('#return-entry').disabled=true;
    try {
      await account.flushPromise;
      if(account.dirty)await account.flush();
      await fleet.publishSummary();
      await fleet.stop();
      await account.close();
      location.reload();
    } catch {
      playing=true;
      $('#return-entry').disabled=false;
      toast('로그아웃을 마치지 못했어요. 다시 시도해 주세요.','error');
    }
  };
}
function showPatchNotes(){ux?.patchNotes(false);}
const uiUsage=createUiUsage({account,enabled:()=>playing&&!sessionBlocked});
function beginPlaying(game){
  sailingClock.reset(performance.now());
  manualTrail=[];state=game;normalizeDepotDock(state);const navigationNotice=reconcileNavigation(state,nav);if(navigationNotice)toast(navigationNotice);if(state.port&&ACTIVE_PORT_BY_ID[state.port])state.legacyHarbor=false;exploration=new Exploration(state.explored);exploration.seed(state);selected=state.port||state.voyage?.target||'lisbon';planned=null;paused=!!game.offlinePaused&&!!game.voyage;delete game.offlinePaused;playing=true;sessionBlocked=false;lastPanelPort=null;manualActive=false;manualTarget=null;manualChannel=null;departedPort=null;heldKeys.clear();
  settleGuildDeadlines();uiUsage.entered?.();
  $('#entry-screen')?.remove();$$('.topbar,.statusbar,.game-layout,.bottom-bar').forEach(el=>el.inert=false);setTab('trade');checkMissions();renderHUD();renderPanel();renderPorts();renderRoutes();renderShip();renderFog(true);centerShip();save();ux?.loadPreferences();if(state.offlineRescuePending){delete state.offlineRescuePending;launchRescue(false,true);}else if(state.rescueReplanPending)launchRescue(state.voyage?.kind==='transition');else showPatchNotes();if(state.transitionPending)ux?.migration();
}
function showEntry(){
  playing=false;
  $$('.topbar,.statusbar,.game-layout,.bottom-bar').forEach(el=>el.inert=true);
  const entry=document.createElement('section');
  entry.id='entry-screen';
  entry.setAttribute('aria-label','선장 접속');
  entry.setAttribute('role','dialog');
  entry.setAttribute('aria-modal','true');
  entry.innerHTML=`
    <div class="entry-art">
      <span class="entry-kicker">WINDWARD · A TRADER'S ATLAS</span>
      <h1>당신만의 항로가<br>시작되는 곳.</h1>
      <p>바람을 따라 항구를 발견하고,<br>특산물을 거래하며 세계를 탐험하세요.</p>
      <div class="entry-ship">${icon('ship')}</div>
      <small>평면 해도 · 두 가지 세계지도 · ${PORTS.length}개의 주요 항구</small>
    </div>
    <div class="entry-card">
      <span class="entry-kicker">현실서버 · 1배속</span>
      <h2>항해 시작</h2>
      <p>Google 계정으로 로그인하면 현실서버에 바로 입장해요.</p>
      <p class="entry-reset-note">기존 항해 기록을 이어갑니다. 처음 시작하는 선장은 리스본에서 출발해요.</p>
      <button type="button" class="primary-button" id="google-login" disabled>Google로 로그인</button>
      <form id="captain-setup" hidden>
        <label for="entry-name">선장 이름</label>
        <input id="entry-name" required maxlength="16" autocomplete="off" placeholder="게임에서 사용할 이름">
        <button class="primary-button" id="captain-start">항해 시작</button>
      </form>
      <p id="entry-error" role="status">로그인을 준비하고 있어요…</p>
      <button type="button" class="service-button" id="entry-retry" hidden>다시 시도</button>
      <button type="button" class="service-button" id="entry-sign-out" hidden>다른 Google 계정으로 로그인</button>
      <p class="entry-note">입장하면 게임용 선장 이름과 접속 상태, 가까운 배의 위치, 랭킹을 다른 선장과 공유해요.</p>
      <button type="button" class="service-button" id="entry-updates">업데이트 내역</button>
    </div>`;
  document.body.append(entry);
  $('#entry-updates').onclick=()=>ux?.patchNotes(true);

  const login=$('#google-login'), status=$('#entry-error'), form=$('#captain-setup');
  const retry=$('#entry-retry'), signOut=$('#entry-sign-out'), start=$('#captain-start');
  let user, profile, busy=false, takeover=false;

  async function run(action){
    if(busy)return;
    busy=true;
    login.disabled=start.disabled=signOut.disabled=true;
    retry.hidden=true;
    status.textContent='접속을 확인하고 있어요…';
    try{await action();}
    catch(error){
      status.textContent=authMessage(error);
      if(error.code==='session'){
        offerRetry('다른 화면을 멈추고 여기서 이어하기',()=>{takeover=true;return enter();});
      }else if(error.code==='conflict'){
        offerRetry('이 기기 기록을 백업하고 서버 기록 이어하기',async()=>{
          const key=localSaveKey(user.uid);
          for(const candidate of [key,'windward-account-v3:'+user.uid]){
            const cached=storage.getItem(candidate);
            if(cached){storage.setItem(candidate+':conflict:'+Date.now(),cached);storage.removeItem(candidate);}
          }
          await enter();
        });
      }else if(user&&form.hidden){
        offerRetry('항해 기록 다시 확인',loadCaptain);
      }else if(!account.setupPromise){
        offerRetry('로그인 준비 다시 시도',prepare);
      }
    }finally{
      busy=false;
      login.disabled=start.disabled=signOut.disabled=false;
    }
  }
  function offerRetry(label,action){
    retry.textContent=label;
    retry.hidden=false;
    retry.onclick=()=>run(action);
  }
  async function enter(){
    const game=await account.enter(user,profile,{name:$('#entry-name').value,takeover});
    fleet.useAccount(account);
    await business?.syncPorts();
    beginPlaying(game);
    publishCollection(collectionProfile(game),account.revision);
    rankings.visible=!$('#body-rank-card')?.hidden;rankings.connect();
    fleet.start();
    community?.syncOwnership().catch(()=>{});
    await combat?.connect();
  }
  async function loadCaptain(){
    login.hidden=true;
    signOut.hidden=false;
    profile=await account.loadProfile(user);
    if(profile){await enter();return;}
    form.hidden=false;
    status.textContent='게임에서 사용할 선장 이름을 정해 주세요.';
    $('#entry-name').focus();
  }
  async function prepare(){
    await account.setup();
    user=account.auth.currentUser;
    if(user)await loadCaptain();
    else status.textContent='';
  }
  login.onclick=()=>run(async()=>{
    user=await account.signIn();
    await loadCaptain();
  });
  form.onsubmit=event=>{event.preventDefault();run(enter);};
  signOut.onclick=()=>run(async()=>{await account.close();location.reload();});
  run(prepare);
}

function renderFleetStatus(){
  const memberStatus=fleet.roster?.error?'접속 명단 확인 필요':fleet.roster&&!fleet.roster.ready?'접속 선장 · 확인 중…':`접속 선장 · ${fleet.onlineCaptains().length}명`;
  const labels={offline:'연결 준비 중',connecting:'연결 중…',reconnecting:'재연결 중…',online:memberStatus,permission:'접속 확인 필요',error:'연결 다시 시도',unconfigured:'연결 준비 중'};
  $('#fleet-btn').textContent=labels[fleetStatus]||'함께 항해';$('#fleet-btn').classList.toggle('online',fleetStatus==='online');
  if($('#fleet-live-list'))renderFleetList();
}
function setupRankControls(){const tabs=$('.rank-tabs');tabs.className='rank-controls';tabs.innerHTML=`<div class="rank-groups" role="group" aria-label="랭킹 분야">${RANK_GROUPS.map(([id,label])=>`<button data-rank-group="${id}">${label}</button>`).join('')}</div><label class="rank-choice">순위 기준 <select id="rank-metric-select"></select></label><p class="rank-notice">각 기준 상위 5명 · 오프라인 기록 유지</p>`;document.querySelectorAll('[data-rank-group]').forEach(b=>b.onclick=()=>{const metric=RANK_DEFINITIONS.find(m=>m.group===b.dataset.rankGroup).id;rankMetric=metric;rankings.select(metric);renderRanks();});$('#rank-metric-select').onchange=e=>{rankMetric=e.target.value;rankings.select(rankMetric);renderRanks();};paintRankControls();}
function paintRankControls(){const select=$('#rank-metric-select');if(!select)return;const definition=RANK_BY_ID[rankMetric],group=definition.group;if(select.dataset.group!==group){select.dataset.group=group;select.innerHTML=RANK_DEFINITIONS.filter(m=>m.group===group).map(m=>`<option value="${m.id}">${m.label}</option>`).join('');}select.value=rankMetric;document.querySelectorAll('[data-rank-group]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.rankGroup===group)));const notice=$('.rank-notice');notice.textContent=['pirateKills','fleetDefeats','duelWins','tradedGoodCount','bestTradeProfit'].includes(rankMetric)?'각 기준 상위 5명 · 새 횟수·최고 기록은 이번 업데이트부터 집계':'각 기준 상위 5명 · 기존 기록 포함 · 오프라인 유지';}
let ranksPaintKey='';
function renderRanks(){
  paintRankControls();
  if(rankMetric==='overallScore'&&rankings.overallAt){
    $('.rank-notice').textContent='집계 · '+new Date(rankings.overallAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'});
  }
  const players=rankings.path?(rankings.rows[rankMetric]||[]):[];
  const ranks=rankMetric==='overallScore'?players:rankFleet(players,rankMetric),top=ranks.slice(0,5),root=$('#rank-list'),id=fleet.uid||'self';
  const signature=JSON.stringify([rankMetric,id,top.map(p=>[p.id,p.name,p.rank,formatRankScore(p,rankMetric)])]);
  if(signature!==ranksPaintKey){ranksPaintKey=signature;root.replaceChildren();
  for(const player of top){const row=document.createElement('li');row.className=player.id===id?'my-rank':'';const number=document.createElement('b');number.textContent=player.rank;const name=document.createElement('span');name.textContent=player.name+(player.id===id?' (나)':'');const score=document.createElement('strong');score.textContent=formatRankScore(player,rankMetric);row.append(number,name,score);root.append(row);}
  if(!top.length){const empty=document.createElement('li');empty.textContent='선장들의 기록을 기다리는 중…';root.append(empty);}
  }
  const me=ranks.find(p=>p.id===id),mine=me?.rank||rankings.myRanks[rankMetric];$('#my-rank').textContent=rankings.path?`내 순위 ${mine?mine+'위':'조회하기 ↓'} · 전체 선장 기준`:'서버 순위 연결 중…';

$$('[data-rank]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.rank===rankMetric)));
}
function renderChatConnection(){
  const enabled=fleet.connected&&chat?.ready;
  $('#chat-send').disabled=!enabled||chat.sending;$('#chat-input').disabled=!enabled||chat.sending;
  $('#chat-connection').hidden=!!enabled;$('#chat-connection').textContent=fleetStatus==='reconnecting'||fleetStatus==='connecting'?'연결을 기다리는 중…':'서버 다시 연결';
  $('#chat-connection').disabled=fleetStatus==='reconnecting'||fleetStatus==='connecting';
  if(!fleet.connected)$('#chat-status').textContent='현실서버에 연결되면 대화할 수 있어요.';
}
function renderChat(messages){
  const root=$('#chat-messages'),nearBottom=root.scrollHeight-root.scrollTop-root.clientHeight<60;
  const highest=messages.at(-1)?.seq||0;
  if(!chatLoading&&!chatOpen)chatUnread+=messages.filter(m=>m.seq>chatSeen&&m.uid!==fleet.uid).length;
  chatSeen=Math.max(chatSeen,highest);if(chat?.ready)chatLoading=false;
  root.replaceChildren();
  if(!messages.length){const empty=document.createElement('p');empty.className='chat-empty';empty.textContent='바다 위 선장들에게 인사를 건네 보세요.';root.append(empty);}
  for(const message of messages){const item=document.createElement('article');item.className='chat-message'+(message.uid===fleet.uid?' mine':'');item.dataset.sequence=message.seq;const header=document.createElement('div');const name=document.createElement('strong');name.textContent=message.name;const time=document.createElement('time');time.textContent=new Date(message.at).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false});const body=document.createElement('p');body.textContent=message.text;header.append(name,time);item.append(header,body);const card=ux?.card(message);if(card)item.append(card);root.append(item);}
  if(nearBottom||messages.at(-1)?.uid===fleet.uid)root.scrollTop=root.scrollHeight;
  $('#chat-unread').textContent=chatUnread>99?'99+':String(chatUnread);$('#chat-unread').hidden=!chatUnread;
  const preview=$('#chat-preview');if(preview){preview.replaceChildren();for(const m of messages.slice(-5)){const line=document.createElement('p');line.textContent=m.name+' · '+m.text;preview.append(line);}preview.hidden=chatOpen||!messages.length;}
}
function toggleChat(open=!chatOpen){
  chatOpen=open;$('#chat-panel').hidden=false;$('#chat-panel').classList.toggle('is-collapsed',!open);$('#chat-body').hidden=!open;$('#chat-close').textContent=open?'− 접기':'+ 펼치기';$('#chat-close').setAttribute('aria-expanded',String(open));$('#chat-toggle').setAttribute('aria-expanded',String(open));$('#chat-preview').hidden=open||!chat.list().length;
  if(open){chatUnread=0;$('#chat-unread').hidden=true;$('#chat-messages').scrollTop=$('#chat-messages').scrollHeight;if(!$('#chat-input').disabled)$('#chat-input').focus();}
  else $('#chat-toggle').focus();
}
function renderFleetList(){
  const root=$('#fleet-live-list');if(!root)return;root.tabIndex=0;
  const players=fleet.onlineCaptains();
  if($('#fleet-online-count'))$('#fleet-online-count').textContent=!fleet.connected?'함께 항해에 연결하면 전체 접속 명단을 볼 수 있어요.':fleet.roster?.error?'명단을 불러오지 못했어요. 함께 항해를 다시 연결해 주세요.':fleet.roster&&!fleet.roster.ready?'접속 중인 선장들을 확인하고 있어요…':`나 포함 ${players.length}명 접속 중 · 내 시야의 다른 배 ${visibleShips().length}척`;
  const nearby=new Map(visibleShips().map(p=>[p.uid,p]));
  const signature=JSON.stringify([fleet.uid,players.map(p=>[p.uid,p.name,p.color,p.status,nearby.has(p.uid)])]);
  if(signature===root.dataset.rosterKey)return;
  root.dataset.rosterKey=signature;root.replaceChildren();
  for(const ship of players){const row=document.createElement('div');row.className='fleet-row';row.setAttribute('role','listitem');const dot=document.createElement('i');dot.style.background=PRESENCE_COLORS[ship.color];const name=document.createElement('strong');name.textContent=ship.name+(ship.uid===fleet.uid?' (나)':'');const status=document.createElement('span');status.textContent=ship.uid===fleet.uid?'내 배':ship.status;row.append(dot,name,status);if(nearby.has(ship.uid)){const b=document.createElement('button');b.className='chat-card-link';b.textContent='인사';b.onclick=()=>{const peer=visibleShips().find(p=>p.uid===ship.uid);if(peer)ux?.signal(peer);};row.append(b);}root.append(row);}
}
function showFleet(){
  showModal('접속 중인 모든 선장','현실서버',
    '<p>함께 항해 중인 선장들의 이름을 보여줘요. 지도와 지구본에서는 내 시야 180해리 안의 배를 볼 수 있어요.</p><p id="fleet-online-count" role="status"></p><div id="fleet-live-list" role="list" aria-label="전체 접속 선장"></div>');
  renderFleetList();
}
let piratePaintKey='',peerNodes=new Map();
const setSvg=(node,key,value)=>{const text=String(value);if(node.getAttribute(key)!==text)node.setAttribute(key,text);};
function renderPirates(){const root=$('#npc-markers');if(!root||!playing)return;const now=Date.now()+(account.serverOffset||0),zones=PIRATE_ZONES.filter(z=>mapDistance(state.position,z.point)<=SIGHT_NM&&now>=(state.pirateRespawns?.[z.id]||0)),key=zones.map(z=>z.id).join('|')+':'+screen.k;if(key===piratePaintKey)return;piratePaintKey=key;root.replaceChildren();for(const z of zones){const p=project(z.point),g=svgEl('g',{class:'fleet-ship',transform:`translate(${p[0]},${p[1]}) scale(${.85/screen.k})`});g.innerHTML=shipGlyph([5,10,16][z.tier],'#9b4a4d');const label=svgEl('text',{x:0,y:-28,'text-anchor':'middle'});label.textContent='☠ '+z.name;g.append(label);g.onclick=e=>{e.stopPropagation();combat?.showPirate(z.id);};root.append(g);}}
function renderPeers(){
 if(!mapReady)return;renderPirates();const root=$('#fleet-markers'),live=new Set();
 visibleShips().forEach((ship,i)=>{
  const id=ship.id||ship.uid,key=JSON.stringify([ship.shipTier,ship.fleetCount,ship.fleetTiers,ship.fleetKinds,ship.color,ship.name,ship.offline]);live.add(id);let item=peerNodes.get(id);
  if(!item||item.key!==key||item.group.parentNode!==root){item?.group.remove();const group=svgEl('g'),tails=svgEl('g'),g=svgEl('g',{class:'fleet-ship','data-peer':id}),hull=svgEl('g'),arrow=svgEl('path',{d:'M0-20V-29m-4 5 4-5 4 5',stroke:PRESENCE_COLORS[ship.color],'stroke-width':2}),text=svgEl('text',{x:0,y:-23,'text-anchor':'middle'}),title=svgEl('title');hull.innerHTML=shipGlyph(ship.shipTier??0,PRESENCE_COLORS[ship.color],ship.fleetKinds?.[0]);text.textContent=ship.name+(ship.offline?' · 오프라인':'')+((ship.fleetCount||1)>1?' · '+ship.fleetCount+'척':'');g.style.pointerEvents='visiblePainted';g.append(arrow,hull,text,title);group.append(tails,g);root.append(group);item={key,group,tails,g,hull,arrow,title,ship,tailNodes:[]};g.onclick=e=>{e.stopPropagation();if(!dragged)ux?.signal(item.ship);};peerNodes.set(id,item);}
  item.ship=ship;let [x,y]=project([ship.lon,ship.lat]);if(ship.status==='정박'){x+=(-35+(i%3)*25)/screen.k;y+=(-34-Math.floor(i/3)*20)/screen.k;}
  setSvg(item.g,'transform',`translate(${x},${y}) scale(${1/screen.k})`);setSvg(item.hull,'transform',`rotate(${ship.angle})`);setSvg(item.arrow,'transform',`rotate(${ship.angle})`);const title=`${ship.name} · ${ship.status}`;if(item.title.textContent!==title)item.title.textContent=title;
  const tails=ship.status==='정박'?[]:wakeFollowers([...(ship.wake||[]),[ship.lon,ship.lat]],ship.fleetCount||1).filter(t=>mapDistance(state.position,t.point)<=SIGHT_NM&&!nav?.isLand(t.point));
  for(const [index,tail] of tails.entries()){
    let node=item.tailNodes[index];
    if(!node){node=svgEl('g');item.tails.append(node);item.tailNodes.push(node);}
    const tier=ship.fleetTiers?.[tail.index]??ship.shipTier??0;
    const kind=ship.fleetKinds?.[tail.index],form=tier+'-'+(kind||'');
    if(node.dataset.tier!==form){
      node.innerHTML=shipGlyph(tier,PRESENCE_COLORS[ship.color],kind);node.dataset.tier=form;
    }
    const [x,y]=project(tail.point);
    setSvg(node,'transform',`translate(${x},${y}) scale(${.62/screen.k})`);
  }
  while(item.tailNodes.length>tails.length)item.tailNodes.pop().remove();
 });
 for(const [id,item]of peerNodes)if(!live.has(id)){item.group.remove();peerNodes.delete(id);}
}

function save(){
  if(!playing||sessionBlocked||account.busy||account.economicUncertain)return;
  state.explored=exploration.encode();
  account.save(state);
}
function log(text,type='info'){state.log.unshift({day:state.day,text,type});state.log=state.log.slice(0,50);$('#latest-log').textContent=text;}
function toast(text,type=''){const div=document.createElement('div');div.className='toast '+type;div.textContent=text;$('#toast-container').append(div);setTimeout(()=>div.remove(),4300);}
function bell(){if(!sound)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume();const now=audio.currentTime;[523.25,659.25,783.99].forEach((freq,i)=>{const osc=audio.createOscillator(),gain=audio.createGain();osc.type='sine';osc.frequency.value=freq;gain.gain.setValueAtTime(0,now+i*.13);gain.gain.linearRampToValueAtTime(.08,now+i*.13+.015);gain.gain.exponentialRampToValueAtTime(.001,now+i*.13+.9);osc.connect(gain).connect(audio.destination);osc.start(now+i*.13);osc.stop(now+i*.13+1);});}catch{}}
function showModal(title,eyebrow,content,size=null){sailingClock.reset(performance.now());if(!modal.open)modalFocus=document.activeElement;ux?.closeSheet();ux?.beforeDialog();delete modal.dataset.investigation;modal.dataset.size=size||(content.includes('atlas-grid')||content.includes('patch-history')?'wide':content.length<600?'small':'medium');$('#modal-title').textContent=title;$('#modal-eyebrow').textContent=eyebrow;$('#modal-content').innerHTML=content;if(!modal.open)modal.showModal();}
function dateText(day,short=false){const date=new Date(START_DATE+Math.floor(day)*86400000);return short?`${date.getUTCFullYear()} · ${date.getUTCMonth()+1}.${String(date.getUTCDate()).padStart(2,'0')}`:`${date.getUTCFullYear()}년 ${date.getUTCMonth()+1}월 ${date.getUTCDate()}일`;}
function coordinates(p){return `${Math.abs(p.lat).toFixed(1)}° ${p.lat>=0?'N':'S'}  /  ${Math.abs(p.lon).toFixed(1)}° ${p.lon>=0?'E':'W'}`;}

function renderHUD(){
  let note=$('#combat-reserve-note');if(!note){note=document.createElement('p');note.id='combat-reserve-note';note.className='modal-meta';$('#cargo-list').after(note);}const reserve=state.battleReserve;note.hidden=!reserve;note.textContent=reserve?`전투 정산 보관: ${fmt(reserve.money)} D · ${Object.values(JSON.parse(reserve.cargoJSON||'{}')).reduce((n,c)=>n+c.qty,0)}상자. 총 보유금·적재에 포함되며 전투 뒤 또는 입항 때 반환돼요.`:'';
  $('#latest-log').textContent=state.log[0]?.text||'당신의 항로를 시작하세요.';
  $('#money').innerHTML=`${fmt(state.money+(state.battleReserve?.money||0))} <em>D</em>`;$('#money').title=state.battleReserve?'전투 손실 정산 보관 '+fmt(state.battleReserve.money)+' D 포함':'보유 두카트';
  $('#cargo-stat').innerHTML=`${usedSpace(state)} <em>/ ${capacity(state)}</em>`;
  $('#food-stat').innerHTML=`${state.food.toFixed(1)} <em>/ ${ship(state).supply}일분</em>`;
  $('#food-bar').style.width=`${state.food/ship(state).supply*100}%`;
  $('#cargo-bar').style.width=`${usedSpace(state)/capacity(state)*100}%`;
  $('#game-date').textContent=dateText(state.day);
  $('#visited-stat').textContent=state.visited.length;
  $('#atlas-count').textContent=state.visited.length;
  $('#profit-stat').textContent=fmt(state.profit);
  renderRanks();
  $('#cargo-count').textContent=`화물 ${usedCargo(state)} + 보급 ${supplySpace(state)} / ${capacity(state)}칸`;
  const currentRiver=nav?.riverAt(state.position)?.river;
  $('#waterway-status').textContent=currentRiver?`${currentRiver.name} · 내륙 항해`:'고정 배율 평면 해도 · 외해';
  $('#waterway-status').classList.toggle('on-river',!!currentRiver);
  $('#globe-coordinates').textContent=coordinates({lon:state.position[0],lat:state.position[1]});
  $('#mobile-port-btn span').textContent=selected?`${PORT_BY_ID[selected].name} · 항구 정보 열기`:'항해 정보 열기';
  $('#mobile-port-btn').classList.toggle('hidden',!!state.voyage||manualActive);
  $('#auto-mode').setAttribute('aria-pressed',String(state.controlMode==='auto'));
  $('#manual-mode').setAttribute('aria-pressed',String(state.controlMode==='manual'));
  $('#manual-pad').classList.toggle('visible',state.controlMode==='manual');
  $('#mode-hint').textContent=state.controlMode==='manual'?'W 위 · S 아래 · A 왼쪽 · D 오른쪽 / 방향키 · Space 정지':'항구 선택 → 출항 · 배가 바다 항로를 따라 이동해요.';
  $('#current-location').textContent=state.voyage?`${toward(state.voyage.target?PORT_BY_ID[state.voyage.target].name:'선택한 해역')} 항해 중`:state.port?`${PORT_BY_ID[state.port].name}에 정박 중`:'바다 위 · 다음 항로를 정하세요';
  $('#sailing-banner').classList.toggle('hidden',!state.voyage);
  $('.voyage-progress').classList.toggle('hidden',!state.voyage);
  if(state.voyage){const v=state.voyage,percent=Math.min(100,v.travelled/v.total*100),days=voyageEstimate(state,v,v.travelled).days,name=v.target?PORT_BY_ID[v.target].name:'새로운 해역';$('#sail-title').textContent=v.kind?`${name} · 구조 중`:paused?`${name} · 일시 정지`:`${toward(name)} 항해 중`;$('#sail-percent').textContent=Math.floor(percent)+'%';$('#voyage-bar').style.width=percent+'%';$('#sail-remaining').textContent=`${fmt(v.total-v.travelled)} 해리 · 약 ${days.toFixed(1)}일 남음`;$('#pause-btn').textContent=paused?'▶':'Ⅱ';$('#pause-btn').setAttribute('aria-label',paused?'항해 재개':'항해 일시 정지');}
  else if(manualActive){$('#current-location').textContent='직접 조종 · '+coordinates({lon:state.position[0],lat:state.position[1]});}
  ux?.renderHUD();expansion?.renderHUD();shoreUI?.render();seaUI?.render();renderPirates();
  $('#world-badge')?.replaceChildren(document.createTextNode('현실서버 · 1배속'));
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
  if(!explorationAllowed(state)){renderMission();return;}
  const continents=new Set(state.visited.map(id=>PORT_BY_ID[id].region));
  const complete=[state.soldAway,state.visited.length>=5,['유럽','아프리카','아시아'].every(c=>continents.has(c)),state.profit>=3000];
  MISSIONS.forEach((m,i)=>{if(complete[i]&&!state.missions.includes(m.id)){state.missions.push(m.id);state.money+=m.reward;log(`의뢰 달성: ${m.name}. 보상 ${fmt(m.reward)} D!`,'reward');toast(`✦ ${m.name} 달성! +${fmt(m.reward)} D`,'discovery');bell();}});
  renderMission();
}

function renderPanel(){
  if(lastPanelPort!==selected){$('#port-panel').scrollTop=0;lastPanelPort=selected;}
  const p=PORT_BY_ID[selected],atPort=p&&state.port===p.id&&!state.voyage;
  const visited=p&&state.visited.includes(p.id);
  const portName=$('#port-name'),owner=p&&community?.ownerName(p.id);
  const subtitle=document.createElement('em');subtitle.textContent=p?.en||'Open Sea';
  portName.replaceChildren(p?owner?`${p.name}(${owner}) `:`${p.name} `:'바다 위 ',subtitle);
  $('#port-region').textContent=p?`${p.region} · ${p.country}`:'세상의 바다 · 새로운 항로';
  $('#port-description').textContent=p?p.fact:'바다는 이어져 있어요. 가까운 항구를 선택해 다음 여행을 준비하세요.';
  $('#port-coordinates').innerHTML=(p?coordinates(p):coordinates({lon:state.position[0],lat:state.position[1]}))+(visited&&!state.quiz.includes(p.id)?' <button class="quiz-link" id="port-quiz">지리 퀴즈 +100 D ↗</button>':'');
  if(p?.river)$('#port-coordinates').insertAdjacentHTML('beforeend',`<span class="river-badge">${nav?.rivers.find(r=>r.id===p.river)?.name||p.sea} · 강 항구</span>`);
  $('#port-quiz')?.addEventListener('click',()=>quiz(p));
  $('#port-badge').textContent=atPort?'정박 중':visited?'방문한 항구':p?'정보를 얻은 항구':'항해 가능';
  $('#port-badge').classList.toggle('unknown',!atPort&&!visited);
  $('#scene-label').textContent=p?'PORT OF '+p.en.toUpperCase():'THE OPEN SEA';
  $('#trade-heading').textContent=atPort?'이 항구의 교역품':'현지 시세 · 도착 후 거래 가능';
  $('#market').innerHTML=p?p.market.map(id=>{
    const g=GOODS[id],unit=business?.displayUnit(p.id,id)??price(p.id,id,state.day);
    return `<div class="market-row"><span class="good-icon" style="color:${g.color}">${g.icon}</span><div class="good-name"><strong>${g.name}</strong><small class="${p.specialty===id?'specialty':''}">${{producer:'✦ 대표 공급',local:'지역 공급',import:'수입·중계'}[p.economy.stock[id]]}</small></div><div class="good-price">${unit}<small>D / 상자</small></div><button class="trade-btn" data-buy="${id}" ${atPort?'':'disabled'}>구매</button></div>`;
  }).join(''):'<div class="empty-cargo">가까운 항구에 들어가면<br>교역소를 이용할 수 있어요.</div>';
  if(p?.depot){
    $('#trade-heading').textContent='공동 보급항';
    $('#market').innerHTML='<button class="service-button" id="depot-service">공동 창고와 보급 보기</button>';
    $('#depot-service').onclick=()=>projectsUI?.inspect(p.id);
  }
  business?.observe(p?.depot?null:p?.id);
  const salePort=tradingPort(state);
  $('#cargo-trade-context').textContent=salePort?`${salePort.name} 입항 완료 · 이 항구의 가격으로 판매할 수 있어요.`:'항해 중 · 항구에 입항하면 화물을 판매할 수 있어요.';
  $('#cargo-port-btn').hidden=!salePort||salePort.id===selected;
  $('#cargo-port-btn').textContent=salePort?`${salePort.name} 교역소 열기`:'';
  $('#cargo-port-btn').onclick=()=>{if(salePort)selectPort(salePort.id);};
  $('#cargo-list').innerHTML=Object.entries(state.cargo).filter(([,c])=>c.qty>0).map(([id,c])=>{
    const g=GOODS[id],unit=salePort?(business?.displayUnit(salePort.id,id,true)??sellPrice(salePort.id,id,state.day)):0,margin=unit-c.cost/c.qty;
    return `<div class="cargo-row"><span class="good-icon" style="color:${g.color}">${g.icon}</span><div class="good-name"><strong>${g.name} · ${c.qty}상자</strong><small>매입 평균 ${fmt(c.cost/c.qty)} D${salePort?` · ${margin>=0?'+':''}${fmt(margin)} D / 상자`:''}</small><button class="cargo-sale-link" data-sale-search="${id}">최고가 판매처 찾기</button></div><div class="good-price">${salePort?unit:'—'}<small>판매가</small></div><button class="trade-btn" data-sell="${id}" ${salePort?'':'disabled'}>판매</button></div>`;
  }).join('')||'<div class="empty-cargo">화물창이 비어 있어요.<small>특산물을 싣고 새로운 바다로 떠나세요.</small></div>';
  $$('[data-buy]').forEach(b=>b.onclick=()=>tradeDialog('buy',b.dataset.buy));
  $$('[data-sale-search]').forEach(b=>b.onclick=()=>saleFinder?.open(b.dataset.saleSearch));
  $$('[data-sell]').forEach(b=>b.onclick=()=>tradeDialog('sell',b.dataset.sell));
  ux?.renderShip();ux?.renderDraft();
  ux?.renderPortStory(p);
  renderTavern();renderSailButton();renderHUD();
}
function renderTavern(){
  const root=$('#tavern-content');if(!root)return;const at=state.port&&state.port===selected&&!state.voyage,candidate=at&&informationCandidate(state),infoCost=informationCost(state);
  root.innerHTML=`<div class="tavern-intro"><span>⚓</span><h3>선원들이 모이는 주점</h3><p>인근 항구의 소식을 들어보세요.<br>정보를 얻으면 자동 항해 목적지로 선택할 수 있어요.</p></div><button class="primary-button" id="info-buy" ${at&&candidate?'':'disabled'}>${!at?'이 항구에 입항하면 이용할 수 있어요':candidate?`정보 얻기 · ${infoCost} D`:'근처의 항구 정보를 모두 알고 있어요'}</button><p class="modal-meta">600해리 이내의 가장 가까운 미개방 항구 1곳. 방문 보상은 실제 입항할 때 받아요.</p>`;
  $('#info-buy').onclick=()=>{if(!at||!informationCandidate(state))return;showModal('항구 정보를 구매할까요?','주점 · 새로운 항로',`<p>인근 미개방 항구 1곳의 정보를 얻습니다.<br>비용 ${infoCost} D · 보유 ${fmt(state.money)} D</p><button class="primary-button" id="confirm-info">구매하기 · ${infoCost} D</button><button class="service-button" id="cancel-info">취소</button>`);$('#cancel-info').onclick=()=>modal.close();$('#confirm-info').onclick=()=>{const result=buyInformation(state);if(!result.ok){toast(result.error,'error');return;}log(`주점에서 ${result.port.name}의 항구 정보를 얻었습니다. −${result.cost} D`,'discovery');modal.close();toast(`${result.port.name} 개방! 자동 항해 목적지에 추가됐어요.`,'discovery');changed();};};
  if(at)rumorUI?.renderTavern(root);
}
function renderSailButton(){
  const btn=$('#sail-btn'),p=PORT_BY_ID[selected],atPort=p&&state.port===p.id;
  const box=$('#route-box');box.classList.toggle('hidden',!planned||!!state.voyage);
  if(state.controlMode==='manual'&&!state.voyage){
    box.classList.add('hidden');btn.disabled=!p||atPort;btn.innerHTML=`${icon(atPort?'anchor':'ship')}<span>${atPort?`${p.name}에 정박 중`:p?`${p.name} 쪽으로 직접 조종`:'바다 클릭 또는 방향키로 이동'}</span>`;$('#sail-hint').textContent='직접 조종은 해안을 피해 이동하세요. ■ 버튼: 정지';return;
  }
  if(planned&&!state.voyage){
    const route=planned.route,estimate=voyageEstimate(state,route),rivers=(route.waterways||[]).map(id=>nav.rivers.find(r=>r.id===id)?.name).filter(Boolean);
    const channels=route.passages?.map(p=>PROJECT_BY_ID[p.id].name);
    box.innerHTML=`<div>예상 항해 거리<strong>${fmt(route.total)} <em>해리</em></strong></div><div>예상 소요 시간<strong>${estimate.days.toFixed(1)} <em>일</em></strong></div><p>보급 ${estimate.food.toFixed(1)}일분 + 예비 ${ship(state).reserve}일분 · 도착 후 ${Math.max(0,state.food-estimate.food).toFixed(1)}일분${rivers.length?' · '+rivers.join(' → '):' · 바다 항로'}</p>${channels?.length?`<p>${channels.join(' → ')} · 출항 시 통행료 ${fmt(route.tollTotal)} D 예약</p>`:''}`;
  }
  if(state.voyage){btn.disabled=true;btn.innerHTML=`${icon('wind')}<span>${state.voyage.kind?'구조 이동 중':'항해 중'} · 도착을 기다려주세요</span>`;$('#sail-hint').textContent=state.voyage.kind?`실제 구조비 ${fmt(state.voyage.paidCost)} D`:'항해창에서 일시 정지할 수 있어요.';}
  else if(atPort&&!planned){btn.disabled=true;btn.innerHTML=`${icon('anchor')}<span>${p.name}에 정박 중</span>`;$('#sail-hint').textContent='지도에서 다음 항구를 골라보세요.';}
  else if(planned){const check=canDepart(state,planned.route);btn.disabled=!check.ok;btn.innerHTML=`${icon('ship')}<span>${check.ok?`${toward(p?p.name:'선택한 해역')} 출항`:'출항 조건을 확인하세요'}</span><b>→</b>`;$('#sail-hint').textContent=check.ok?'좋은 바람과 함께, 새로운 항로를 시작하세요.':check.error;}
  else{btn.disabled=true;btn.innerHTML=`${icon('compass')}<span>지도에서 목적지를 선택하세요</span>`;$('#sail-hint').textContent='항구나 바다를 눌러 항로를 정하세요.';}
}
function guildTime(){return Date.now()+(account.serverOffset||0);}
function baseGuildFame(game){
  return discoveryStats({...game,guild:undefined}).fame;
}
function settleGuildDeadlines(){
  const expired=expireCharters(state,guildTime(),baseGuildFame(state));
  if(expired.count)toast(`의뢰 ${expired.count}건 기한 초과 · 명성 −${expired.loss}`,'error');
}
function changed(){community?.syncOwnership().catch(()=>{});settleGuildDeadlines();checkMissions();renderHUD();renderPanel();renderPorts();renderShip();save();if(account.ready&&account.dirty)account.flush();}

function inspectNearby(id){
  if(!nav)return;stopForUI();paused=!!state.voyage;
  const result=inspectDiscovery(state,nav,id,guildTime());if(!result.ok){toast(result.error,'error');return;}
  log(`${result.discovery.name} 발견 · 명성 +${result.discovery.fame}`,'discovery');changed();expansion.found(result.discovery);toast(`✦ ${result.discovery.name} · 명성 +${result.discovery.fame}`,'discovery');account.flush();
}
function approachDiscovery(d){
 if(!nav||!explorationAllowed(state)||state.voyage?.legacy||state.voyage?.passages||currentCanal(state.voyage))return;
 const previous=state.voyage,oldPlan=planned;stopForUI();modal.close();
 const destination=previous?{target:previous.target,point:previous.path.at(-1)}:null;
 state.voyage=null;planDestination(null,d.point||[d.lon,d.lat],false);
 if(!planned||!canDepart(state,planned.route).ok){state.voyage=previous;planned=oldPlan;toast('조사 후 돌아올 보급과 항로를 확인해 주세요.','error');renderHUD();return;}
 if(destination)state.detourTarget=destination;state.investigationTarget=d.id;startVoyage();
}
async function resumeDetour(){const d=state.detourTarget;if(!d||state.voyage)return;await planDestination(d.target,d.point,false);if(planned&&canDepart(state,planned.route).ok){delete state.detourTarget;startVoyage();}}

function tradeDialog(mode,id){business?business.trade(mode,id):ux?.trade(mode,id);}

function setTab(tab){activeTab=tab;for(const id of ['trade','ship','tavern']){$('#'+id+'-tab')?.classList.toggle('active',tab===id);$('#'+id+'-content')?.classList.toggle('hidden',tab!==id);}}

function svgEl(name,attrs={}){const el=document.createElementNS('http://www.w3.org/2000/svg',name);for(const [key,value]of Object.entries(attrs))el.setAttribute(key,value);return el;}
function setupChartWrapping(manifest){
  const root=$('#map-camera'),routes=$('#routes'),labels=$('#map-labels'),grid=$('#graticule'),terrain=svgEl('g',{id:'chart-terrain','clip-path':'url(#chart-tile-clip)'}),fog=svgEl('g',{id:'chart-fog','clip-path':'url(#chart-tile-clip)'});
  const clip=svgEl('clipPath',{id:'chart-tile-clip',clipPathUnits:'userSpaceOnUse'});clip.append(svgEl('rect',{x:0,y:0,width:1600,height:800}));$('#world-map defs').append(clip);
  labels.remove();grid.remove();fog.append($('#exploration-fog'),$('#sight-boundary'));for(const [x,y]of CHART_TILES)if(x||y)fog.append(svgEl('use',{href:'#sight-boundary',x,y,'pointer-events':'none'}));
  // Remove the live noise filter; the decorative surface is baked in assets.
  root.querySelector('[filter="url(#paper)"]')?.remove();
  const ocean=root.querySelector('rect');for(const [key,value]of Object.entries({x:0,y:0,width:1600,height:800,stroke:'none',fill:'#c5e1e4'}))ocean.setAttribute(key,value);
  while(root.firstChild!==routes)terrain.append(root.firstChild);root.prepend(terrain);
  terrain.append(svgEl('image',{href:`assets/chart-tiles/${manifest.overview.file}?v=${manifest.overview.sha256.slice(0,16)}`,x:0,y:0,width:1600,height:800,preserveAspectRatio:'none','pointer-events':'none'}));
  const tiles=svgEl('g',{id:'terrain-tiles','pointer-events':'none'});routes.before(tiles,grid,labels,fog);chartTerrain=new ChartTerrain(tiles,manifest);
  for(const [x,y]of CHART_TILES)if(x||y){tiles.before(svgEl('use',{href:'#chart-terrain',x,y,'pointer-events':'none','aria-hidden':'true'}));labels.before(svgEl('use',{href:'#graticule',x,y,'pointer-events':'none','aria-hidden':'true'}));routes.before(svgEl('use',{href:'#chart-fog',x,y,'pointer-events':'none','aria-hidden':'true'}));for(const id of ['routes','fleet-markers','npc-markers','own-followers','ship-marker'])root.append(svgEl('use',{href:'#'+id,x,y,'pointer-events':'none','aria-hidden':'true'}));}
  // Geographic text stays readable above every wrapped fog tile, below ships.
  routes.before(labels);
}
function setupMap(land,manifest){
  $('#ship-marker').before(svgEl('g',{id:'npc-markers'}));
  $('#ship-marker').before(svgEl('g',{id:'own-followers','pointer-events':'none'}));
  globe=new AtlasView($('#minimap'),land,nav.rivers,atlasPorts(),point=>{followShip=false;[camera.x,camera.y]=project(wrapPosition(point));applyCamera();});
  let grid='';for(let lon=-180;lon<=180;lon+=30){const x=project([lon,0])[0];grid+=`M${x} 0V800`;const t=svgEl('text',{x:x+5,y:790});t.textContent=Math.abs(lon)+'°';$('#graticule').append(t);}for(let lat=-60;lat<=80;lat+=20){const y=project([0,lat])[1];grid+=`M0 ${y}H1600`;const t=svgEl('text',{x:12,y:y-6});t.textContent=Math.abs(lat)+'°';$('#graticule').append(t);}$('#graticule').append(svgEl('path',{d:grid}));
  setupChartWrapping(manifest);
  mapReady=true;$('#map-loading').remove();resizeMap();renderRoutes();renderShip();renderFog(true);
}
let labelNodes=new Map(),labelKey='',labelAt=-Infinity,labelTimer=null,labelView=null;
function renderChartLabels(force=false){
 if(!mapReady)return;const root=$('#map-labels'),enabled=ux?.placeNames!==false,now=performance.now();
 if(!enabled){clearTimeout(labelTimer);labelTimer=null;if(labelNodes.size){root.replaceChildren();labelNodes.clear();}labelKey='';labelView=null;return;}
 const jump=!labelView||labelView.w!==screen.w||labelView.h!==screen.h||Math.abs(camera.x-labelView.x)*screen.k>screen.w/3||Math.abs(camera.y-labelView.y)*screen.k>screen.h/3;
 if(!force&&!jump&&now-labelAt<180){if(!labelTimer)labelTimer=setTimeout(()=>{labelTimer=null;renderChartLabels(true);},180-(now-labelAt));return;}
 clearTimeout(labelTimer);labelTimer=null;
 const points=[state.position,...PORTS.filter(p=>knowsPort(state,p.id)).map(portPoint),...visibleShips().map(p=>[p.lon,p.lat]),...PIRATE_ZONES.filter(z=>mapDistance(state.position,z.point)<=180&&Date.now()>(state.pirateRespawns?.[z.id]||0)).map(z=>z.point)];
 const key=JSON.stringify([screen.w,screen.h,screen.k,Math.round(camera.x*screen.k/8),Math.round(camera.y*screen.k/8),points.map(p=>{const q=combatScreenPoint(p);return [Math.round(q.x/8),Math.round(q.y/8)];})]);labelAt=now;labelView={...camera,w:screen.w,h:screen.h};if(key===labelKey)return;labelKey=key;
 const blocked=points.map(p=>{const q=combatScreenPoint(p);return {x:q.x-48,y:q.y-32,w:96,h:56};}),live=new Set(),previous=new Map([...labelNodes].map(([id,t])=>[id,combatScreenPoint(unproject([Number(t.getAttribute('x')),Number(t.getAttribute('y'))]))]));
 const fromScreen=p=>wrapPosition(unproject([camera.x+(p.x-screen.w/2)/screen.k,camera.y+(p.y-screen.h/2)/screen.k]));
 for(const label of layoutChartLabels(PLACE_NAMES,combatScreenPoint,{width:screen.w,height:screen.h,blocked,fromScreen,previous})){
  live.add(label.id);let t=labelNodes.get(label.id);if(!t){t=svgEl('text',{class:'chart-place-name '+label.kind,'font-size':label.font/screen.k,'text-anchor':'middle','dominant-baseline':'middle','data-place':label.id});t.style.fontSize=label.font/screen.k+'px';t.textContent=label.name;root.append(t);labelNodes.set(label.id,t);}const x=camera.x+(label.screenPoint.x-screen.w/2)/screen.k,y=camera.y+(label.screenPoint.y-screen.h/2)/screen.k;setSvg(t,'x',x);setSvg(t,'y',y);
 }for(const [id,node]of labelNodes)if(!live.has(id)){node.remove();labelNodes.delete(id);}
}
function combatScreenPoint(point){if(!mapReady)return null;const [x,y]=project(point);let dx=x-camera.x,dy=y-camera.y;dx-=Math.round(dx/1600)*1600;dy-=Math.round(dy/800)*800;return {x:screen.w/2+dx*screen.k,y:screen.h/2+dy*screen.k,width:screen.w,height:screen.h};}
function focusBattleMap(point){modal.close();followShip=false;const [x,y]=project(state.position),[ex,ey]=project(point);let dx=ex-x,dy=ey-y;dx-=Math.round(dx/1600)*1600;dy-=Math.round(dy/800)*800;camera.x=x+dx/2;camera.y=y+dy/2;applyCamera();if(innerWidth<=850)$('.chart').scrollIntoView({block:'center',behavior:'smooth'});}
function resizeMap(){const box=$('.chart').getBoundingClientRect();screen.w=box.width;screen.h=box.height;$('#world-map').setAttribute('viewBox',`0 0 ${screen.w} ${screen.h}`);applyCamera();}
function applyCamera(){
  [camera.x,camera.y]=wrapCamera([camera.x,camera.y]);
  const oldScale=screen.k;
  screen.k=FIXED_MAP_SCALE;
  $('#map-camera').setAttribute('transform',`translate(${screen.w/2},${screen.h/2}) scale(${screen.k}) translate(${-camera.x},${-camera.y})`);
  chartTerrain?.update({...camera,w:screen.w,h:screen.h,k:screen.k});
  if(Math.abs(oldScale-screen.k)>.00001||!$('#port-markers').children.length)renderPorts();renderShip();renderPeers();renderMinimap();renderChartLabels();
}
const labelOffsets={lisbon:[-13,-12,'end'],seville:[10,23,'start'],london:[-12,-15,'end'],amsterdam:[12,-6,'start'],venice:[10,19,'start'],alexandria:[12,5,'start'],accra:[-11,3,'end'],cape:[-11,3,'end'],zanzibar:[12,3,'start'],muscat:[10,-9,'start'],goa:[10,1,'start'],malacca:[-12,2,'end'],batavia:[12,18,'start'],macau:[-12,-8,'end'],nagasaki:[13,13,'start'],busan:[-12,-11,'end'],havana:[-11,-10,'end'],cartagena:[-12,4,'end'],recife:[12,4,'start'],buenos:[-12,4,'end'],sydney:[12,4,'start']};
function renderPorts(){
  if(!mapReady)return;
  const root=$('#port-markers');root.replaceChildren();
  for(const p of PORTS.filter(p=>knowsPort(state,p.id)))for(const [tileX,tileY]of CHART_TILES){
    const [px,py]=project(portPoint(p)),x=px+tileX,y=py+tileY,visited=state.visited.includes(p.id),chosen=selected===p.id;
    const g=svgEl('g',{class:`port-marker ${visited?'visited':''} ${chosen?'selected':''}`,transform:`translate(${x},${y}) scale(${1/screen.k})`,role:'button',tabindex:'0','aria-label':`${p.name}, ${p.country}${visited?', 방문함':''}`,'data-port':p.id});
    if(tileX||tileY){g.setAttribute('aria-hidden','true');g.setAttribute('tabindex','-1');}
    g.append(svgEl('circle',{r:17,class:'marker-hit'}));
    if(chosen)g.append(svgEl('circle',{r:13,class:'selection-ring'}));
    g.append(svgEl('circle',{r:5,class:'marker-outer'}),svgEl('circle',{r:1.8,class:'marker-inner'}));if(p.river)g.append(svgEl('path',{d:'M-3 0q1.5-3 3 0t3 0',class:'river-marker'}));
    if(explorationGear(state)?.berthChart){
      const [cx,cy]=project([p.cityLon??p.lon,p.cityLat??p.lat]),dx=(cx-px)*screen.k,dy=(cy-py)*screen.k;
      g.prepend(svgEl('line',{x1:dx,y1:dy,x2:0,y2:0,class:'surveyed-berth'}));
    }
    const owner=community?.ownerName(p.id);
    const ownerDisplay=owner&&[...owner].length>10?[...owner].slice(0,9).join('')+'…':owner;
    const label=ownerDisplay?`${p.name}(${ownerDisplay})`:p.name;
    {const [dx,dy,anchor]=p.id==='sanlucar'?[-12,20,'end']:labelOffsets[p.id]||[12,-8,'start'];const text=svgEl('text',{x:dx,y:dy,'text-anchor':anchor,class:'port-text'});text.textContent=label;g.append(text);if(chosen){const en=svgEl('text',{x:dx,y:dy+13,'text-anchor':anchor,class:'port-text port-subtitle'});en.textContent=p.en.toUpperCase();g.append(en);}}
    const title=svgEl('title');title.textContent=`${p.name} · ${p.country} · 특산물 ${GOODS[p.specialty].name}${owner?' · 소유 '+owner:''}`;g.append(title);
    g.onclick=e=>{e.stopPropagation();if(dragged)return;selectPort(p.id);};g.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectPort(p.id);}};root.append(g);
  }
}
function routePath(path){let d='';let prev=null;for(const p of path){const [x,y]=project(p);d+=`${!prev||Math.abs(x-prev[0])>800?'M':'L'}${x},${y}`;prev=[x,y];}return d;}
function renderRoutes(){
  const root=$('#routes');root.replaceChildren();
  if(explorationGear(state)?.coastChart&&nav?.detail){
    const [lon,lat]=state.position,points=[];
    for(let i=-9;i<=9;i++){
      const y=Math.min(79.99,Math.max(-59.99,lat+i*.25)),row=nav.detail.rows[nav.detail.rowFor(y)];
      for(const x of row)if(distance([lon,lat],[x,y])<=180)points.push(project([x,y]));
    }
    root.append(svgEl('path',{d:points.map(([x,y])=>`M${x-0.18},${y}h0.36`).join(''),class:'surveyed-berth','vector-effect':'non-scaling-stroke'}));
  }
  for(const id of surveyedCanals.keys())root.append(svgEl('path',{d:routePath(PROJECT_BY_ID[id].path),class:'canal-line','vector-effect':'non-scaling-stroke'}));
  if(state.voyage)root.append(svgEl('path',{d:routePath(state.voyage.path),class:'voyage-line','vector-effect':'non-scaling-stroke'}));
  else if(planned)root.append(svgEl('path',{d:routePath(planned.route.path),class:'route-line','vector-effect':'non-scaling-stroke'}));
  if(manualTarget){const [x,y]=project(manualTarget);root.append(svgEl('path',{d:routePath(manualChannel?.path||[state.position,manualTarget]),class:'manual-route','vector-effect':'non-scaling-stroke'}),svgEl('circle',{cx:x,cy:y,r:7/screen.k,class:'manual-target','vector-effect':'non-scaling-stroke'}));}
  renderMinimap();
}
function renderMinimap(){
  if(!mapReady||!globe)return;
  const w=screen.w/screen.k/2,h=screen.h/screen.k/2,viewport=[[-w,-h],[w,-h],[w,h],[-w,h],[-w,-h]].map(([x,y])=>unproject([camera.x+x,camera.y+y]));
  globe.peers=visibleShips().map(p=>({...p,fill:PRESENCE_COLORS[p.color]}));globe.exploration=exploration;
  globe.update(state,viewport,state.voyage?.path||planned?.route.path||manualChannel?.path||[]);combat?.renderMap();
}
function renderShip(){
  if(!mapReady)return;let [x,y]=project(state.position);let angle=0;
  if(state.voyage){const next=positionAlong(state.voyage,Math.min(state.voyage.total,state.voyage.travelled+12)),p=project(next);let dx=p[0]-x;if(dx>800)dx-=1600;if(dx<-800)dx+=1600;if(Math.hypot(dx,p[1]-y)>.00001)angle=Math.atan2(p[1]-y,dx)*180/Math.PI+90;else angle=ownShipAngle;}
  if(state.controlMode==='manual'&&!state.port)angle=manualAngle;else if(!state.voyage)angle=ownShipAngle;
  ownShipAngle=angle;
  if(state.port){x-=15/screen.k;y+=9/screen.k;}
  // The map uses screen-sized icons, so the ship stays readable while zooming.
  const drawing=$('.ship-drawing'),flag=!!state.rumorProgress?.flag,kind=orderedFleet(state)[0]?.kind,appearance=shipTier(state)+'-'+flag+'-'+(kind||'');
  if(drawing&&drawing.dataset.tier!==appearance){drawing.innerHTML=shipGlyph(shipTier(state),undefined,kind)+(flag?'<path class="earned-ship-flag" d="M3 -19h9l-3 4H3z"/>':'');drawing.dataset.tier=appearance;}
  const followers=$('#own-followers');if(followers){followers.replaceChildren();let tails=[];
   if(state.voyage&&!state.voyage.kind)for(let i=1;i<fleetCount(state);i++){const at=state.voyage.travelled-i*30;if(at>0)tails.push({index:i,point:positionAlong(state.voyage,at)});}
   else if(!state.port)tails=wakeFollowers([...manualTrail,state.position],fleetCount(state));
   const vessels=orderedFleet(state);
   for(const tail of tails){
     if(nav.isLand(tail.point))continue;
     const [x,y]=project(tail.point);
     const drawing=svgEl('g',{transform:`translate(${x},${y}) scale(${.62/screen.k})`});
     drawing.innerHTML=shipGlyph(vessels[tail.index]?.tier??shipTier(state),undefined,vessels[tail.index]?.kind);
     followers.append(drawing);
   }
  }
  $('#ship-marker').setAttribute('transform',`translate(${x},${y}) scale(${.78/screen.k})`);
  $('#heading-arrow').setAttribute('transform',`rotate(${angle})`);$('#heading-arrow').setAttribute('data-fleet',fleetCount(state));
  renderMinimap();
}
function selectPort(id,open=true){
  if(!ACTIVE_PORT_BY_ID[id]){toast('이전 항구 기록이에요. 새 항로는 주요 항구에서 선택해 주세요.');return;}if(!knowsPort(state,id)){toast('탐험하거나 주점에서 정보를 얻어 항구를 먼저 개방하세요.');return;}
  selected=id;setTab('trade');
  if(state.controlMode==='manual'||state.voyage&&!state.voyage.kind){return autoToPort(id);}
  else if(!state.voyage&&state.port!==id)planDestination(id,portPoint(PORT_BY_ID[id]),false);
  else {planned=null;renderRoutes();renderPanel();renderPorts();}
  if(open&&innerWidth<=850)ux?.openPort('target',false);
}
async function autoToPort(id){
 if(!playing||!nav||sessionBlocked||account.busy||account.economicUncertain)return false;
 if(currentCanal(state.voyage)){toast('운하를 빠져나온 뒤 목적지를 선택하세요.');return false;}
 if(state.shoreTrip){shoreUI?.open();return false;}
 if(state.seaJob){seaUI?.open();return false;}
 if(state.voyage?.kind||combat?.blocked()){toast('구조·전투를 마친 뒤 항구를 선택하세요.');return false;}
 const port=ACTIVE_PORT_BY_ID[id];
 if(!port||!knowsPort(state,id)){toast('항구 정보를 먼저 얻으세요.');return false;}
 const intent=++navigationIntent;
 if(state.port===id){stopForUI();state.controlMode='auto';planned=null;renderPanel();renderRoutes();save();return false;}
 const point=portPoint(port),routeTo=async()=>{
   const request=findPortRoute(state,point);
   if(!(request instanceof Promise))return request;
   const prior=paused;stopForUI();paused=true;
   try{return await request;}finally{paused=prior;}
 };
 let route=await routeTo();
 if(intent!==navigationIntent)return false;
 let check=route?.total>=.5?canDepart(state,route):{ok:false,error:'이 항구까지 안전한 항로를 찾지 못했어요.'};
 if(!check.ok){toast(check.error,'error');return false;}
 if(!combat?.hasReserve()){
   try{await combat.prepare();}catch(error){toast(error.message,'error');return false;}
   if(intent!==navigationIntent||state.voyage?.kind||combat?.blocked())return false;
   route=await routeTo();
   if(intent!==navigationIntent)return false;
   check=route?.total>=.5?canDepart(state,route):{ok:false,error:'이 항구까지 안전한 항로를 찾지 못했어요.'};
   if(!check.ok){toast(check.error,'error');return false;}
 }
 if(route.passages){
   const previous=planned;
   planned={target:id,point,route};
   await startVoyage(intent,true);
   if(state.voyage?.target!==id){planned=previous;renderRoutes();renderPanel();}
   return state.voyage?.target===id;
 }
 stopForUI();refundCanalTolls(state);state.voyage=null;state.controlMode='auto';selected=id;setTab('trade');planned={target:id,point,route};
 await startVoyage(intent);
 return state.voyage?.target===id;
}
function quoteCanalRoute(game,route){
  if(route?.passages){
    const prices=Object.fromEntries(route.passages.map(p=>[p.id,(surveyedCanals.get(p.id)?.toll||0)*fleetCount(game)]));
    const preview={...game,money:1e12,rumorProgress:structuredClone(game.rumorProgress),voyage:structuredClone(game.voyage)};
    refundCanalTolls(preview);
    const result=reserveCanalTolls(preview,route,prices);
    route.quotedTolls=prices;
    route.tollTotal=result.total;
  }
  return route;
}
function findPortRoute(game,point){
  const options={maxOffshore:ship(game).offshore,canals:CANALS.filter(c=>surveyedCanals.has(c.id))};
  if(longRoutePlanner&&distance(game.position,point)>3200)return longRoutePlanner([...game.position],point,options).then(route=>quoteCanalRoute(game,route));
  return quoteCanalRoute(game,nav.route(game.position,point,options));
}
function planDestination(target,point,scroll=true,depot=null){
  if(!nav||state.voyage)return;
  const intent=++navigationIntent;
  if(target&&(!ACTIVE_PORT_BY_ID[target]||!knowsPort(state,target))){toast('아직 정보를 얻지 못한 항구예요.');return;}
  if(target){selected=target;point=portPoint(PORT_BY_ID[target]);}else selected=null;
  const pending=target?findPortRoute(state,point):nav.route(state.position,point,{maxOffshore:ship(state).offshore});
  if(pending instanceof Promise){
    const origin=[...state.position],game=state;
    planned=null;renderRoutes();renderPanel();toast('장거리 항로를 계산하고 있어요.');
    return pending.then(route=>{
      if(intent===navigationIntent&&game===state&&!state.voyage&&distance(state.position,origin)<.01)applyDestination(target,point,route,scroll,depot);
    });
  }
  applyDestination(target,point,pending,scroll,depot);
}
function applyDestination(target,point,route,scroll,depot){
  if(!route||route.total<.5){planned=null;toast('이곳까지의 항로를 찾지 못했어요. 가까운 바다나 다른 항구를 선택하세요.','error');renderPanel();renderRoutes();return;}
  if(!target&&!depot?.canRefill){
    let back=Infinity;const candidates=state.knownPorts.map(id=>ACTIVE_PORT_BY_ID[id]).filter(Boolean).sort((a,b)=>distance(point,portPoint(a))-distance(point,portPoint(b)));
    for(const p of candidates){if(distance(point,portPoint(p))/dailySpeed(state)>Math.min(back,state.food))break;const r=nav.route(point,portPoint(p),{maxOffshore:ship(state).offshore});if(r)back=Math.min(back,voyageEstimate(state,r).food);}
    route.returnFood=back;
  }
  planned={target,point,route,depot:depot?.id||null};renderRoutes();renderPanel();renderPorts();
  if(target&&state.rumorProgress?.items?.I007){
    const calculate=r=>Math.round(r.total)+'해리 / 보급 '+voyageEstimate(state,r).food.toFixed(1)+'일분';
    const straight=route.passages?nav.route(state.position,point,{maxOffshore:ship(state).offshore}):route;
    const near=state.knownPorts.map(id=>ACTIVE_PORT_BY_ID[id]).filter(p=>p&&p.id!==target&&p.id!==state.port)
      .sort((a,b)=>distance(state.position,portPoint(a))+distance(portPoint(a),point)-distance(state.position,portPoint(b))-distance(portPoint(b),point))
      .slice(0,2);
    const stop=near.map(p=>{
      const to=nav.route(state.position,portPoint(p),{maxOffshore:ship(state).offshore});
      return to&&canDepart(state,to).ok?{p,to}:null;
    }).find(Boolean);
    const notes=[PORT_BY_ID[target].name+' · 직항 '+(straight?calculate(straight):'없음'),...(route.passages?['운하 '+calculate(route)]:[]),...(stop?['보급 기항 '+stop.p.name+'까지 '+calculate(stop.to)]:[])];
    if(appendItemRecord(state,'comparisons',target,notes.join(' · '),guildTime()))save();
  }
  if(scroll&&innerWidth<=850)ux?.openPort('target',false);
}
async function startVoyage(intent=navigationIntent,replacing=false){
  if(typeof intent!=='number')intent=navigationIntent;
  if(!playing||sessionBlocked||account.busy||account.economicUncertain)return;
  if(state.shoreTrip)return shoreUI?.open();
  if(state.seaJob)return seaUI?.open();
  if(combat?.blocked())return toast('전투 결과를 먼저 확인하세요.');
  if(!combat?.hasReserve()){try{await combat.prepare();}catch(e){return toast(e.message,'error');}}
  if(intent!==navigationIntent)return;
  if(state.controlMode==='manual'&&!replacing){if(selected&&selected!==state.port){ux?.closeSheet();startManual(portApproaches.get(selected));}return;}
  if(!planned||state.voyage&&!replacing||planned.target&&!knowsPort(state,planned.target))return;const estimate=canDepart(state,planned.route);if(!estimate.ok){toast(estimate.error,'error');return;}
  if(planned.route.passages){
    const plan=planned,origin=state.port,quoted=plan.route.quotedTolls;
    await business.run('personal',account.uid,(game,_shared,now)=>{
      if(game.voyage&&(!replacing||game.voyage.kind||currentCanal(game.voyage))||game.port!==origin||distance(game.position,plan.route.path[0])>.01||intent!==navigationIntent)throw Error('배 위치나 목적지가 바뀌었어요. 새 항로를 확인하세요.');
      const prices={};
      for(const id of Object.keys(quoted)){
        const cached=surveyedCanals.get(id);
        if(!cached||(cached.toll||0)*fleetCount(game)!==quoted[id]||now-cached.at>300000)throw Error('공동 사업에서 현재 운하 요금을 다시 확인하세요.');
        prices[id]=quoted[id];
      }
      const check=canDepart(game,plan.route);
      if(!check.ok)throw Error(check.error);
      refundCanalTolls(game);
      const reservation=reserveCanalTolls(game,plan.route,prices);
      if(reservation.total!==plan.route.tollTotal)throw Error('적용할 통행권이 바뀌었어요. 항로의 새 통행료를 확인하세요.');
      game.voyage={...plan.route,passages:reservation.passages,target:plan.target,origin,travelled:0,foodRemaining:check.food};
      game.controlMode='auto';game.port=null;delete game.depotDock;
      return {message:'출항 · 운하 통행료 '+reservation.total+' D 예약'};
    },()=>{uiUsage.complete('action-voyage');selected=plan.target;planned=null;paused=false;modal.close();ux?.closeSheet();renderRoutes();centerShip();});
    return;
  }
  state.voyage={...planned.route,target:planned.target,origin:state.port,travelled:0,foodRemaining:estimate.food,...(planned.depot?{depot:planned.depot}:{})};state.port=null;delete state.depotDock;paused=false;planned=null;log(`${toward(state.voyage.target?PORT_BY_ID[state.voyage.target].name:PROJECT_BY_ID[state.voyage.depot]?.name||'새로운 해역')} 출항. 총 ${fmt(state.voyage.total)}해리.`, 'sailing');toast('⚓ 출항! 새로운 바다가 기다립니다.');modal.close();ux?.closeSheet();renderRoutes();renderPanel();renderHUD();centerShip();save();uiUsage.complete('action-voyage');
  if(innerWidth<=850)$('.chart').scrollIntoView({behavior:'smooth',block:'start'});
}
function arrive(manualPort=null){
  const p=PORT_BY_ID[manualPort],v=p?{path:[portPoint(p)],target:p.id}:state.voyage;
  manualTarget=null;manualChannel=null;manualActive=false;heldKeys.clear();
  state.position=[...(v.target?portPoint(PORT_BY_ID[v.target]):v.path.at(-1))];state.port=v.target;state.voyage=null;planned=null;selected=v.target;paused=false;followShip=false;
  const safeReturn=['rescue','transition'].includes(v.kind);if(safeReturn)state.hullHP=fleetMaxHP(state);let discovery=false;
  if(v.target&&!safeReturn){const p=PORT_BY_ID[v.target];discovery=!state.visited.includes(p.id);if(discovery){state.visited.push(p.id);const reward=120+Math.floor(120*(activeOfficer(state)?.firstVisit||0));state.money+=reward;log(`${p.name} 발견! ${p.country} · ${p.sea}. 발견 보상 +${reward} D`,'discovery');toast(`✦ 새로운 항구, ${p.name}! +${reward} D`,'discovery');}else{log(`${p.name}에 입항했습니다.`);toast(`⚓ ${p.name}에 도착했습니다.`);}bell();}else if(safeReturn){log('구조가 완료됐습니다. 방문한 항구에서 다시 준비하세요.');toast('구조 완료 · 지원 보급 2일분');}else{log('목표 해역에 도착했습니다. 다음 항로를 선택하세요.');toast('목표 해역에 도착했어요. 가까운 항구로 향해보세요.');}
  if(v.target){
    if(!safeReturn&&!discovery){
      const rescue=finishSeaRescue(state,v.target);
      if(rescue)toast(`구조한 선원 인도 · ${rescue.fee} D · 명성 +${rescue.fame}`);
    }
    if(safeReturn)delete state.seaPassenger;
    recordArrival(state,v.target,v);
    state.legacyHarbor=!ACTIVE_PORT_BY_ID[v.target];
    const refill=autoResupply(state);
    if(refill?.ok)toast(`자동 보급 ${refill.amount.toFixed(1)}일분 · ${refill.cost} D`);
  }
  if(v.target&&!safeReturn&&!knowsPort(state,v.target))state.knownPorts.push(v.target);exploration.frozen=!explorationAllowed(state);if(!safeReturn)exploration.reveal(state.position);renderFog(true);changed();renderRoutes();
  if(v.target){
    const arrival=combat?.onArrival();
    if(PORT_BY_ID[v.target]?.depot&&state.autoSupply&&state.food<=ship(state).supply-1&&account.ready){
      Promise.resolve(arrival).then(()=>{
        if(state.port===v.target&&!state.voyage)return business.run('projects',v.target,(game,shared,now)=>projectAction(game,shared,account.uid,v.target,'auto-supply',1000,now,nav));
      });
    }
  }
  if(v.depot&&account.ready&&!safeReturn)business.run('projects',v.depot,(game,shared,now)=>projectAction(game,shared,account.uid,v.depot,'dock',0,now,nav),()=>projectsUI?.inspect(v.depot));
  if(!v.target&&state.investigationTarget){delete state.investigationTarget;expansion?.investigate();}
  if(discovery){const p=PORT_BY_ID[v.target];showModal(`${p.name}, 새로운 발견`,'A NEW PAGE IN YOUR ATLAS',`<p style="color:var(--gold);font-size:11px">${p.country} · ${p.region} · ${coordinates(p)}</p><p>${p.fact}</p><p class="help-tip">지리 수첩에 새로운 항구가 기록됐어요.<br>발견 보상 <strong>+${120+Math.floor(120*(activeOfficer(state)?.firstVisit||0))} D</strong></p><button class="primary-button" id="discovery-quiz">지리 퀴즈에 도전 · +100 D</button><button class="service-button" id="discovery-close">항구 둘러보기 <span>→</span></button>`);$('#discovery-close').onclick=()=>modal.close();$('#discovery-quiz').onclick=()=>quiz(p);}
}

function quiz(p){
  if(!state.visited.includes(p.id)||state.quiz.includes(p.id))return;
  const alternatives=PORTS.map(q=>q.sea).filter((v,i,a)=>v!==p.sea&&a.indexOf(v)===i).slice(0,3),options=[p.sea,...alternatives].sort((a,b)=>a.localeCompare(b,'ko'));
  showModal(`${p.name}의 바다를 기억하나요?`,'GEOGRAPHY NOTEBOOK',`<p>${p.name} 항구는 ${p.country}에 있어요.<br>이 항구가 마주한 바다 또는 해역은 어디일까요?</p><div class="quiz-options">${options.map((o,i)=>`<button data-answer="${i}">${o}</button>`).join('')}</div><p class="modal-meta">정답 보상 100 D · 항구마다 한 번만 도전할 수 있어요.</p>`);
  $$('[data-answer]').forEach(b=>b.onclick=()=>{const correct=options[Number(b.dataset.answer)]===p.sea;state.quiz.push(p.id);if(correct){state.money+=100;log(`지리 퀴즈 정답: ${p.name} · ${p.sea}. +100 D`,'reward');bell();}else log(`지리 수첩: ${p.name}이 마주한 해역은 ${p.sea}입니다.`);showModal(correct?'정답! 항로를 하나 더 배웠어요.':'새로운 지식을 항해 수첩에.','GEOGRAPHY NOTEBOOK',`<p><strong style="color:var(--gold)">${p.name} → ${p.sea}</strong></p><p>${p.fact}</p><p>${correct?'보상 +100 D가 지급됐어요.':'다음 항구에서는 정답을 맞혀보세요.'}</p><button class="primary-button" id="quiz-close">다음 항해 준비하기</button>`);$('#quiz-close').onclick=()=>modal.close();changed();});
}
function showAtlas(){
  const riverPorts=PORTS.filter(p=>p.river).length;
  showModal('세계의 항구와 강','THE EXPLORER’S ATLAS',`<div class="atlas-summary"><span><b>${state.visited.filter(id=>ACTIVE_PORT_BY_ID[id]).length}<small>/ ${PORTS.length} 주요 항구 방문</small></b></span><span><b>${nav?.rivers.length||9}<small>개 강 항로</small></b></span><span><b>${riverPorts}<small>강 항구</small></b></span></div><p class="modal-meta">과거 항구 ${state.visited.filter(id=>!ACTIVE_PORT_BY_ID[id]).length}곳의 방문 기록도 보존돼요.</p><div class="atlas-search"><input id="atlas-search" type="search" aria-label="항구 검색" placeholder="항구 · 국가 · 강 이름 검색"><label><input id="river-only" type="checkbox">강 항구만</label></div><div class="atlas-grid" id="atlas-results"></div><p class="modal-meta">강의 대표 구간을 항해할 수 있어요. 해안선·강폭·입항 위치는 게임용으로 단순화했으며, 국가명은 현재 기준입니다.</p>`);
  $('#atlas-search').insertAdjacentHTML('afterend','<select id="atlas-sort" aria-label="항구 목록"><option value="near">거리순</option><option value="favorites">즐겨찾기</option><option value="recent">최근 입항</option></select>');
  const render=()=>{
    const q=$('#atlas-search').value.trim().toLocaleLowerCase(),riverOnly=$('#river-only').checked;
    const mode=$('#atlas-sort').value,ids=mode==='favorites'?state.favorites:mode==='recent'?state.recentPorts:null;
    const ports=PORTS.filter(p=>knowsPort(state,p.id)&&(!ids||ids.includes(p.id))&&(!riverOnly||p.river)&&[p.name,p.en,p.country,p.region,p.sea,nav?.rivers.find(r=>r.id===p.river)?.name||''].join(' ').toLocaleLowerCase().includes(q));
    ports.sort((a,b)=>ids?ids.indexOf(a.id)-ids.indexOf(b.id):distance(state.position,portPoint(a))-distance(state.position,portPoint(b)));
    $('#atlas-results').innerHTML=ports.map(p=>`<button class="atlas-port ${state.visited.includes(p.id)?'':'unvisited'}" data-atlas="${p.id}"><strong>${state.visited.includes(p.id)?'⚑':'◇'} ${p.name}</strong><span>${p.country} · ${p.river?'강 항구 · '+p.sea:p.region}</span></button>`).join('')||'<p>검색한 항구가 없어요.</p>';
    $$('[data-atlas]').forEach(b=>b.onclick=()=>{modal.close();selectPort(b.dataset.atlas);const p=project(portPoint(PORT_BY_ID[b.dataset.atlas]));[camera.x,camera.y]=p;followShip=false;applyCamera();});
  };
  $('#atlas-search').oninput=render;$('#river-only').onchange=render;$('#atlas-sort').onchange=render;render();
}
function showJournal(){
  showModal('파도 위에 남긴 기록','항해일지',`<div class="atlas-summary"><span><b>${Math.floor(state.day)}<small>항해 일수</small></b></span><span><b>${state.trades}<small>거래 횟수</small></b></span><span><b>${fmt(state.profit)}<small>무역 이익 D</small></b></span></div><div id="journal-routes"></div><div id="journal-log"></div><p class="modal-meta">최근 기록 50개를 보관해요.</p>`);
  for(const route of state.recentRoutes){
    const from=PORT_BY_ID[route.from],to=PORT_BY_ID[route.to],label=`${from.name} → ${to.name} · ${fmt(route.nm)}해리`;
    const button=document.createElement('button');button.className='service-button';button.dataset.usageKey='action-share-card';button.textContent=label+' 공유';
    button.onclick=()=>ux?.share(label,{kind:'route',ref:{fromPortId:from.id,toPortId:to.id,observedNm:route.nm}});$('#journal-routes').append(button);
  }
  for(const item of state.log){const row=document.createElement('div');row.className='log-entry';const time=document.createElement('time'),body=document.createElement('p');time.textContent=dateText(item.day,true);body.textContent=item.text;row.append(time,body);$('#journal-log').append(row);}
}
function showHelp(){showModal('당신만의 항로를 그려보세요','WELCOME ABOARD, CAPTAIN',`<p>뗏목으로 교역을 시작하고, 세계 ${PORTS.length}개 주요 항구와 ${DISCOVERIES.length}종 발견물을 찾아보세요.</p><div class="help-step"><b>01</b><div><h3>리스본에서 첫 교역 준비</h3><p>와인을 싣고 포르투로 향해보세요. 경로·보급·판매가를 확인하고 출항하세요.</p></div></div><div class="help-step"><b>02</b><div><h3>내 배 보기에서 성장</h3><p>20단계로 개량하고 최대 5척의 선단을 꾸려요. 항구에서 배의 매각 견적도 확인할 수 있어요.</p></div></div><div class="help-step"><b>03</b><div><h3>단서를 얻고 수집 도감 채우기</h3><p>주점의 무료 소문과 항해 중 흔적을 살펴보세요. 실제 지점에서 조사하면 그림과 명성을 얻어요.</p></div></div><p class="help-tip">자동 항해: 항구 선택 → 출항.<br>직접 조종: 바다 클릭 또는 방향키 ↑ ↓ ← → · W 위 · S 아래 · A 왼쪽 · D 오른쪽. ■ / 스페이스로 정지.<br>모바일 하단: 항해 / 항구·보급 / 화물 / 더보기.<br>세계지도는 지구본 / 평면지도 중 고릅니다. 클릭은 화면만 이동해요. 평면 해도는 고정 배율이에요.<br>보급 소진 시 방문했던 항구로 구조돼요. 구조 중에는 탐험과 발견이 진행되지 않아요.</p><p>항구 투자·활동에서 지분·세금·개발·한정 상품을, 대포·수리와 전투·해적에서 장착과 세 전투 모드를 이용하세요. 미니맵 클릭은 배 이동과 별개예요.</p><p><a class="service-button" href="guide/" target="_blank" rel="noopener">자세한 게임 설명 · JPG 10장 보기 ↗</a></p><button class="primary-button" id="start-game">좋아, 항해를 시작하자 ${icon('ship')}</button><p class="modal-meta">지도: <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener">Natural Earth</a> (퍼블릭 도메인) · 국가명은 현재 기준. 해안선·강폭·입항 위치와 선박 성능은 게임용 설정입니다. 진행은 Google 계정에 연결해 자동 저장됩니다.</p>`);$('#start-game').onclick=()=>modal.close();}


function followPosition(){const [x,y]=project(state.position),offset=innerWidth>850&&screen.w<850?80:0;camera.x=x+offset/screen.k;camera.y=y;}
function showDiscoveryOnChart(discovery){
  if(!mapReady||!state.discoveries?.[discovery.id])return;
  modal.close();
  followShip=false;
  const [x,y]=project(discovery.point||[discovery.lon,discovery.lat]);
  $('#discovery-study-pin')?.remove();
  const root=svgEl('g',{id:'discovery-study-pin','aria-label':discovery.name});
  root.style.pointerEvents='none';
  for(const [dx,dy] of CHART_TILES){
    const pin=svgEl('g',{transform:`translate(${x+dx},${y+dy}) scale(${1/FIXED_MAP_SCALE})`});
    pin.append(svgEl('circle',{r:10,fill:'#fffbe8',stroke:'#965923','stroke-width':2}),svgEl('path',{d:'M0 -6L5 0L0 6L-5 0Z',fill:'#965923',stroke:'none'}));
    const label=svgEl('text',{x:0,y:27,'text-anchor':'middle',class:'study-pin-label'});
    label.textContent=discovery.name;pin.append(label);root.append(pin);
  }
  $('#map-camera').append(root);camera.x=x;camera.y=y;applyCamera();
  if(innerWidth<=850)$('.chart').scrollIntoView({block:'center',behavior:'smooth'});
}
function centerShip(){$('#discovery-study-pin')?.remove();followPosition();followShip=!!state.voyage||state.controlMode==='manual';globe?.home();applyCamera();}
function stopManual(){stopForUI();paused=false;renderRoutes();renderHUD();save();}
function setControlMode(mode){
  navigationIntent++;
  if(currentCanal(state.voyage)){toast('운하를 빠져나온 뒤 조종을 바꿀 수 있어요.');return;}
  if(state.voyage?.kind||state.voyage?.legacy){toast('진행 중인 구조·이전 항해를 마친 뒤 조종을 바꿀 수 있어요.');return;}
  if(state.controlMode===mode)return;
  stopManual();
  if(state.voyage){refundCanalTolls(state);state.voyage=null;state.port=null;log('자동 항해를 멈추고 직접 조종으로 전환했습니다.');}
  state.controlMode=mode;planned=null;paused=false;renderRoutes();renderHUD();renderPanel();save();
  if(mode==='auto'&&selected&&selected!==state.port)planDestination(selected,portPoint(PORT_BY_ID[selected]),false);
}
function beginManual(){
  if(state.shoreTrip||state.seaJob){stopForUI();(state.shoreTrip?shoreUI:seaUI)?.open();return false;}
  if(combat?.blocked())return false;
  if(combat&&!combat.hasReserve()){combat.prepare().catch(e=>toast(e.message,'error'));return false;}
  if(!playing||sessionBlocked||account.busy||account.economicUncertain||!nav||state.food<=0||state.transitionPending||state.voyage?.kind||currentCanal(state.voyage))return false;
  if(usedSpace(state)>capacity(state)){toast('보급과 화물의 적재 공간을 먼저 정리하세요.','error');return false;}
  if(state.port){departedPort=state.port;state.position=[...portPoint(PORT_BY_ID[state.port])];state.port=null;log('직접 조종으로 출항했습니다. 방향키나 바다 클릭으로 이동하세요.','sailing');renderPanel();}
  delete state.depotDock;manualActive=true;paused=false;followShip=true;return true;
}
function startManual(point){
  if(!point||!nav)return;
  if(state.shoreTrip)return shoreUI?.open();
  if(state.food<=0){toast(state.port?'출항 전에 보급을 채워 주세요.':'보급이 떨어져 자동 구조합니다.','error');return;}
  if(combat&&!combat.hasReserve()){const intent=navigationIntent;combat.prepare().then(()=>{if(intent===navigationIntent&&state.controlMode==='manual')startManual(point);}).catch(e=>toast(e.message,'error'));return;}
  if(!beginManual())return;manualTarget=[...point];const a=nav.riverAt(state.position),b=nav.riverAt(point);manualChannel=a&&b&&a.river.id===b.river.id?{...nav.route(state.position,point),travelled:0}:null;heldKeys.clear();centerShip();renderRoutes();renderHUD();save();
  if(innerWidth<=850)$('.chart').scrollIntoView({behavior:'smooth',block:'start'});
}
function launchRescue(transition=false,damaged=false){
  if(damaged&&(state.port||state.voyage?.kind))return false;
  if(combat?.active()){combat.retreatForRescue().catch(e=>toast(e.message,'error'));return true;}
  const canal=currentCanal(state.voyage);
  if(canal&&nav?.isLand(state.position)){
    const endpoints=PROJECT_BY_ID[canal]?.path;
    if(endpoints)state.position=[...([endpoints[0],endpoints.at(-1)].sort((a,b)=>distance(state.position,a)-distance(state.position,b))[0])];
  }
  const result=beginRescue(state,nav,transition,damaged);if(!result.ok){toast(result.error,'error');return false;}
  delete state.seaJob;
  exploration.frozen=true;renderFog(true);manualActive=false;manualTarget=null;manualChannel=null;heldKeys.clear();planned=null;paused=false;
  log(`${result.port.name}까지 ${transition?'안전 귀환':'자동 구조'} · 실제 비용 ${fmt(result.cost)} D`);toast(`${result.port.name}로 ${result.emergency?'안전 귀환합니다':'구조 이동합니다'} · ${fmt(result.cost)} D`);if(result.arrived)arrive();else {changed();renderRoutes();centerShip();}return true;
}
function stopForUI(){heldKeys.clear();heldKeyboard.clear();heldPointers.clear();manualTarget=null;manualChannel=null;manualActive=false;}
async function enterReservedCanal(id){
  if(settlingCanal)return;
  settlingCanal=true;
  paused=true;
  try{
    await business.run('projects',id,(game,shared,now)=>projectAction(game,shared,account.uid,id,'passage',0,now,nav),()=>{paused=false;renderHUD();});
  }finally{settlingCanal=false;}
}
function stepManual(delta,paint=true){
  if(state.transitionPending)return;
  if(!state.port){const nearby=dockAlong(nav,state.position,state.position,portApproaches,departedPort);if(nearby){arrive(nearby.id);return;}}
  const east=Number(heldKeys.has('ArrowRight'))-Number(heldKeys.has('ArrowLeft')),north=Number(heldKeys.has('ArrowUp'))-Number(heldKeys.has('ArrowDown'));
  if(!east&&!north&&!manualTarget){if(manualActive){manualActive=false;renderHUD();save();}return;}
  if(state.food<=1e-8){launchRescue();return;}if(!manualActive&&!beginManual())return;
  if(east||north){manualTarget=null;manualChannel=null;}
  const speed=manualHelmSpeed(state,nav,state.position),miles=speed*delta/ACTIVE_SECONDS_PER_DAY;
  let rawNext;if(manualChannel)rawNext=positionAlong(manualChannel,Math.min(manualChannel.total,manualChannel.travelled+miles));else rawNext=east||north?helmStep(state.position,east,north,miles):mapToward(state.position,manualTarget,miles);
  const previous=[...state.position],motion=wrappedMotion(previous,rawNext),actual=advanceManualMotion(state,nav,motion,delta,(from,to)=>expansion?.intercept(from,to)??1);
  if(actual.error){stopManual();toast(actual.error);return;}if(actual.interrupted){stopForUI();paused=false;}
  if(manualChannel)manualChannel.travelled=Math.min(manualChannel.total,manualChannel.travelled+actual.miles);
  const a=project(previous),b=project(rawNext);let dx=b[0]-a[0];if(dx>800)dx-=1600;if(dx<-800)dx+=1600;manualAngle=Math.atan2(b[1]-a[1],dx)*180/Math.PI+90;
  for(const [from,to]of actual.legs||[]){exploreMove(from,to);if(!manualTrail.length||mapDistance(manualTrail.at(-1),to)>2.5){manualTrail.push([...to]);if(manualTrail.length>60)manualTrail.shift();}}
  if(paint){if(followShip){followPosition();applyCamera();}else renderShip();}
  const dock=(actual.legs||[]).map(([from,to])=>dockAlong(nav,from,to,portApproaches,departedPort)).find(Boolean);
  if(departedPort&&leftHarbor(departedPort,state.position,portApproaches))departedPort=null;
  if(dock){arrive(dock.id);return;}if(actual.depleted){launchRescue();return;}
  if(manualTarget&&mapDistance(state.position,manualTarget)<.1)stopManual();
}
const world=$('#world-map');
world.addEventListener('pointerdown',e=>{if(e.button!==0||!e.isPrimary){drag=null;dragged=true;return;}$('.chart').focus({preventScroll:true});dragged=false;drag={x:e.clientX,y:e.clientY,cx:camera.x,cy:camera.y,id:e.pointerId};if(!e.target.closest('.port-marker,.fleet-ship'))world.setPointerCapture(e.pointerId);});
world.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>(e.pointerType==='touch'?10:5))dragged=true;if(dragged){followShip=false;[camera.x,camera.y]=wrapCamera([drag.cx-dx/screen.k,drag.cy-dy/screen.k]);applyCamera();}});
function endDrag(e){if(!drag||drag.id!==e.pointerId)return;const didDrag=dragged;drag=null;if(world.hasPointerCapture(e.pointerId))world.releasePointerCapture(e.pointerId);if(didDrag){setTimeout(()=>dragged=false,0);return;}if(e.target.closest('.port-marker,.fleet-ship'))return;const rect=world.getBoundingClientRect(),point=wrapPosition(unproject([(e.clientX-rect.left-screen.w/2)/screen.k+camera.x,(e.clientY-rect.top-screen.h/2)/screen.k+camera.y]));if(!nav)return;if(state.voyage){toast('항해 중에는 조종 모드를 바꾼 뒤 목적지를 선택하세요.');return;}if(nav.isLand(point)){toast('육지에는 배가 갈 수 없어요. 항구나 바다를 선택하세요.');return;}if(e.pointerType==='touch')ux?.confirmSea(point);else if(state.controlMode==='manual')startManual(point);else planDestination(null,point);}
world.addEventListener('pointerup',endDrag);world.addEventListener('pointercancel',()=>{drag=null;dragged=false;});
$('#home-map').onclick=centerShip;$('#ports-map').onclick=showAtlas;
$('#auto-mode').onclick=()=>setControlMode('auto');$('#manual-mode').onclick=()=>setControlMode('manual');
$('#manual-stop').onclick=stopManual;
function releaseHelmPointer(id){const direction=heldPointers.get(id);heldPointers.delete(id);if(direction&&![...heldPointers.values(),...heldKeyboard.values()].includes(direction))heldKeys.delete(direction);}
$$('[data-direction]').forEach(button=>{button.oncontextmenu=e=>e.preventDefault();button.onpointerdown=async e=>{e.preventDefault();button.setPointerCapture(e.pointerId);if(!nav)return;setControlMode('manual');manualTarget=null;heldPointers.set(e.pointerId,button.dataset.direction);if(combat&&!combat.hasReserve()){try{await combat.prepare();}catch(error){releaseHelmPointer(e.pointerId);toast(error.message,'error');return;}if(!button.hasPointerCapture(e.pointerId)||!heldPointers.has(e.pointerId))return;}if(beginManual()){heldKeys.add(button.dataset.direction);renderHUD();}};button.onpointerup=e=>releaseHelmPointer(e.pointerId);button.onpointercancel=e=>releaseHelmPointer(e.pointerId);button.onlostpointercapture=e=>releaseHelmPointer(e.pointerId);});
$('#manual-pad').addEventListener('selectstart',e=>e.preventDefault());

$('#minimap-home').onclick=centerShip;
$('#sail-btn').onclick=startVoyage;$('#trade-tab').onclick=()=>setTab('trade');$('#ship-tab').onclick=()=>setTab('ship');
$('#mobile-port-btn').onclick=()=>$('#port-panel').scrollIntoView({behavior:'smooth',block:'start'});
$('#help-btn').onclick=showHelp;$('#journal-btn').onclick=showJournal;$('#atlas-btn').onclick=showAtlas;
$('#map-tab').onclick=()=>{modal.close();$('.chart').scrollIntoView({behavior:'smooth'});};
modal.addEventListener('close',()=>{stopForUI();if(modalFocus?.isConnected)modalFocus.focus({preventScroll:true});});$('#close-modal').onclick=()=>account.economicUncertain?location.reload():modal.close();modal.addEventListener('cancel',e=>{if(account.economicUncertain)e.preventDefault();});modal.addEventListener('click',e=>{if(e.target===modal&&!account.economicUncertain){const rect=modal.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)modal.close();}});
$('#pause-btn').onclick=()=>{sailingClock.reset(performance.now());paused=!paused;renderHUD();};
$('#sound-btn').onclick=()=>{sound=!sound;$('#sound-btn').innerHTML=`♬ <span>소리 ${sound?'켬':'끔'}</span>`;$('#sound-btn').setAttribute('aria-label',`항구 종소리 ${sound?'끄기':'켜기'}`);if(sound)bell();};
document.addEventListener('keydown',e=>{
  if(!playing||sessionBlocked||e.defaultPrevented||$('.chart').classList.contains('shore-map-open')||modal.open||ux?.isBlocking()||isTypingTarget(document.activeElement)||e.isComposing||e.ctrlKey||e.metaKey||e.altKey||document.activeElement?.closest('.rank-card,.chat-panel,#entry-screen,#port-panel'))return;
  const direction=directionForKey(e,ux?.letterKeys!==false);
  if(direction){
    e.preventDefault();if(!nav||e.repeat)return;setControlMode('manual');if(state.controlMode!=='manual')return;
    if(combat&&!combat.hasReserve()){const code=e.code||e.key;heldKeyboard.set(code,direction);combat.prepare().then(()=>{if(heldKeyboard.has(code)&&beginManual()){heldKeys.add(direction);renderHUD();}}).catch(error=>toast(error.message,'error'));return;}
    manualTarget=null;if(beginManual()){heldKeyboard.set(e.code||e.key,direction);heldKeys.add(direction);renderHUD();}return;
  }
  if(e.code==='Space'&&(state.voyage||manualActive)){e.preventDefault();if(e.repeat)return;sailingClock.reset(performance.now());if(state.controlMode==='manual')stopManual();else{paused=!paused;renderHUD();}}
});
document.addEventListener('keyup',e=>{const key=e.code||e.key,direction=heldKeyboard.get(key);heldKeyboard.delete(key);if(direction&&![...heldKeyboard.values(),...heldPointers.values()].includes(direction))heldKeys.delete(direction);});
document.addEventListener('focusin',e=>{if(isTypingTarget(e.target))stopForUI();});
window.addEventListener('blur',()=>{stopForUI();sailingClock.reset(performance.now());});
window.addEventListener('beforeunload',save);document.addEventListener('visibilitychange',()=>{sailingClock.reset(performance.now());if(document.hidden){stopForUI();save();}});
new ResizeObserver(()=>{if(mapReady)resizeMap();}).observe($('.chart'));

let lastHud=0,lastSave=0;
let ownershipCheckAt=0;
function tick(now){
 if(now>=ownershipCheckAt&&playing&&account.ready&&!document.hidden){ownershipCheckAt=now+60000;uiUsage.tick?.();community?.syncOwnership().catch(()=>{});}
 const allowed=playing&&!account.busy&&!account.economicUncertain&&!sessionBlocked&&!combat?.blocked()&&!paused&&!modal.open&&!ux?.isBlocking()&&!document.hidden;
 const mode=allowed?(state.voyage?'auto':state.controlMode==='manual'&&(manualActive||heldKeys.size||manualTarget)?'manual':null):null;
 const before=[...state.position];
 for(const delta of sailingClock.steps(now,!!mode)){
  if(mode==='auto'){
   if(!state.voyage)break;const previous=[...state.position],canal=currentCanal(state.voyage),result=advanceVoyage(state,nav,delta,canal?null:(from,to)=>expansion?.intercept(from,to)??1);if(!canal)exploreMove(previous,state.position);
   if(result.entry){save();enterReservedCanal(result.entry);sailingClock.reset(now);break;}
   if(result.interrupted){stopForUI();paused=true;renderHUD();sailingClock.reset(now);break;}if(result.arrived){arrive();sailingClock.reset(now);break;}if(result.depleted){launchRescue();sailingClock.reset(now);break;}
  }else{stepManual(delta,false);if(state.port||state.voyage||modal.open||!manualActive&&!heldKeys.size&&!manualTarget){sailingClock.reset(now);break;}}
 }
 if(before[0]!==state.position[0]||before[1]!==state.position[1]){if(followShip){followPosition();applyCamera();}else renderShip();if(now-lastHud>150){renderHUD();lastHud=now;}if(now-lastSave>(mode==='auto'?1800:1500)){save();lastSave=now;}}
 if(playing&&!account.busy&&!account.economicUncertain&&!sessionBlocked&&!state.port&&!state.depotDock&&!state.voyage&&!state.transitionPending&&state.food<=1e-8&&!modal.open&&!ux?.isBlocking())launchRescue();
 if(now-peerDrawTime>80&&fleet.peers.size){renderPeers();renderMinimap();peerDrawTime=now;}
 frame=requestAnimationFrame(tick);
}

function openMenuFinder(){
  const open={
    trade:()=>ux.openPort('port'),cargo:()=>ux.openPort('cargo'),supply:()=>ux.openPort('supply'),
    sale:()=>saleFinder.open(),note:()=>rumorUI.showNote(),album:()=>expansion.showAlbum(),
    officers:()=>rumorUI.showDirectory('officer'),items:()=>rumorUI.showDirectory('item'),
    guild:()=>guildUI.open(),ports:()=>community.showOwnedPorts(),guns:()=>business.showArmory(),
    shipyard:()=>expansion.showShipyard(),storedShips:()=>expansion.showStoredShips()
  };
  showMenuFinder({modal:showModal,mobile:matchMedia('(max-width:850px)').matches,navigate:id=>{modal.close();open[id]?.();}});
}
const menuFinderButton=document.createElement('button');
menuFinderButton.type='button';menuFinderButton.id='menu-finder';menuFinderButton.className='nav-item';
menuFinderButton.textContent='메뉴 찾기';menuFinderButton.onclick=openMenuFinder;
$('.main-nav').append(menuFinderButton);
setupInterface();ux=createUX({getState:()=>state,getAccount:()=>account,getNav:()=>nav,getSelection:()=>selected,getPlan:()=>planned,getFleet:()=>fleet,getVisibleShips:visibleShips,getChat:()=>chat,storage,onTrade:(mode,id)=>business?.trade(mode,id),onStop:stopForUI,onHome:centerShip,onSelect:selectPort,onPlan:planDestination,onSail:startVoyage,onManual:startManual,onMode:setControlMode,onSave:changed,onPanel:renderPanel,onSea:()=>seaUI?.open(),onGuild:()=>guildUI?.open(),onProjects:()=>projectsUI?.open(),onDepot:id=>projectsUI?.inspect(id),onShareRecord:(message,from,port)=>{if(appendItemRecord(state,'shares',String(message.id||((from?.id||'')+':'+port.id)),(from?from.name+' → ':'')+port.name,guildTime()))save();},onShore:()=>shoreUI?.open(),onModal:showModal,onClose:()=>modal.close(),onToast:toast,onRescue:launchRescue,onTab:setTab,onChat:toggleChat,onMapLabels:()=>renderChartLabels(true),onRankVisibility:visible=>rankings.setVisible(visible),onAtlas:showAtlas,onJournal:showJournal,onHelp:showHelp,onMenuFinder:openMenuFinder,onShip:()=>expansion?.showShip(),onCollection:()=>expansion?.showAlbum(),onBusiness:()=>business?.showHub(),onGuns:()=>business?.showArmory(),onSaleSearch:()=>saleFinder?.open(),onOfficers:()=>rumorUI?.showDirectory('officer'),onItems:()=>rumorUI?.showDirectory('item'),onCombat:()=>combat?.show(),onCombatTarget:uid=>combat?.attack(uid),onSuggestions:()=>community?.showSuggestions(true),onOwnedPorts:()=>community?.showOwnedPorts(),onCaptains:()=>expansion?.showCaptains('all',true)});renderHUD();renderMission();renderPanel();$('#latest-log').textContent=state.log[0]?.text||'당신의 항로를 시작하세요.';
expansion=createExpansion({getState:()=>state,getNav:()=>nav,getFleet:()=>fleet,getRankings:()=>rankings,getStats:()=>gameStats(state,exploration),onModal:showModal,onToast:toast,onChanged:changed,onClose:()=>modal.close(),canShowDiscovery:()=>playing&&!!nav&&!state.shoreTrip&&$('.chart')?.classList.contains('shore-map-open')===false&&!modal.open&&!state.battleId&&!state.npcBattle&&!state.raidId&&!ux?.isBlocking(),onDiscoveryPause:()=>{stopForUI();paused=!!state.voyage;},onInspect:inspectNearby,onApproach:approachDiscovery,onShowDiscoveryPoint:showDiscoveryOnChart,onResumeRoute:resumeDetour,onShipAction:fn=>business?.shipAction(fn),onStorageAction:fn=>business?.run('personal',account.uid,fn),onItems:()=>rumorUI?.showDirectory('item'),onCombat:()=>combat?.show()});
rumorUI=createRumorUI({getState:()=>state,nav:()=>nav,modal:showModal,toast,changed,depart:autoToPort,onCanals:()=>projectsUI?.open('canal'),share:(text,card)=>ux?.share(text,card),action:(id,action)=>{
  if(!account.ready)return toast('로그인 뒤 이용하세요.','error');
  const port=state.port;
  const item=ITEM_BY_ID[id], repair=action==='use'&&item?.type==='repair',distanceGear=action==='use'&&item?.type==='distance';
  if(!repair&&!distanceGear&&(!port||state.voyage))return toast('항구에 정박하세요.','error');
  const assigned=!item&&action==='equip'?state.incomeOfficerPort:null;
  return business.run(assigned?'ports':'personal',assigned||account.uid,(game,content,time)=>{
    if(assigned)setIncomeOfficer(game,content,assigned,account.uid,ownership(content).ownerUid,time,0);
    if(game.port!==port)throw Error('정박한 항구가 바뀌었어요. 다시 확인하세요.');
    const result=action==='use'?(repair?useRepairKit(game,id):distanceGear?activateDistanceGear(game,id):item?.type==='trade-voucher'?activateTradeVoucher(game,id):item?.coupon?activateCoupon(game,id):useEmergencySupplies(game,id)):performContractAction(game,id,action);
    if(action==='equip'&&usedSpace(game)>capacity(game))throw Error('적재 공간을 먼저 비우세요.');
    return result;
  });
}});
renderPanel();
business=createBusiness({account,onTradeComplete:mode=>uiUsage.complete('action-trade-'+mode),onOwnership:()=>community?.syncOwnership(true).catch(()=>{}),directory:after=>rankings.page(after),getState:()=>state,modal:showModal,toast,pause:()=>{stopForUI();paused=!!state.voyage;},beforeService:()=>combat?.releaseIfPort(),onDepot:id=>projectsUI?.inspect(id),record:(port,income,cost)=>{if(appendItemRecord(state,'income',port.id,port.name+' · 기본 세수 '+income.accrued+' D · 시간당 '+income.rate+' D · 시설 투자 '+cost+' D',guildTime()))save();},changed,render:()=>{if(mapReady)renderPanel();},nav:()=>nav,rescue:()=>{delete state.offlineRescuePending;return launchRescue(false,true);},look:point=>{modal.close();followShip=false;[camera.x,camera.y]=project(wrapPosition(point));applyCamera();},onPorts:added=>{if(nav)for(const p of added)portApproaches.set(p.id,nav.approach(p));if(globe)globe.ports=atlasPorts();const wasDocked=state.depotDock;normalizeDepotDock(state);if(wasDocked&&state.port===wasDocked){selected=state.port;changed();}if(state.port&&ACTIVE_PORT_BY_ID[state.port])state.legacyHarbor=false;renderPorts();}});
combat=createCombat({syncPosition:async()=>{await account.flush();await fleet.sendPromise;if(await fleet.send(true)!==true)throw Error('배 위치를 저장하는 중이에요. 잠시 뒤 다시 공격하세요.');},screenPoint:combatScreenPoint,focus:focusBattleMap,account,getState:()=>state,visible:visibleShips,nav:()=>nav,modal:showModal,close:()=>modal.close(),toast,changed,pause:()=>{stopForUI();paused=!!state.voyage;},rescue:()=>{delete state.offlineRescuePending;return launchRescue(false,true);},look:point=>{modal.close();followShip=false;[camera.x,camera.y]=project(wrapPosition(point));applyCamera();}});
function charterOptions(game){
  return {baseFame:baseGuildFame(game),room:capacity(game)-usedSpace(game),findRoute:port=>{
    const route=nav?.route(game.position,portPoint(port),{maxOffshore:ship(game).offshore,maxDistance:3500});
    return canDepart(game,route).ok?route:null;
  },findPointRoute:point=>{
    const route=nav?.route(game.position,point,{maxOffshore:ship(game).offshore,maxDistance:1100});
    return !!route&&voyageEstimate(game,route).food*2+ship(game).reserve<=game.food;
  }};
}
guildUI=createGuildUI({getState:()=>state,now:guildTime,modal:showModal,offers:(game,now)=>{
  const opts=charterOptions(game);
  return availableCharters(game,opts.findRoute,opts.room,now,opts.findPointRoute);
},projects:()=>projectsUI?.open('freight'),quote:async row=>{
  if(!row||row.target!==state.port||!account.ready)return null;
  try{
    if((state.cargo[row.good]?.qty||0)<row.qty)throw Error('납품할 화물이 부족해요.');
    const shared=await account.readShared('ports',row.target),content=shared.content||{};
    if(!permitted(content,account.uid))throw Error('이 항구의 교역이 제한됐어요.');
    return captainTradeQuote(state,row.target,row.good,row.qty,'sell',{...content.markets?.[row.good],revision:shared.revision},guildTime(),taxRate(content,account.uid,row.target));
  }catch(error){toast(error.message,'error');return null;}
},action:(action,id,quote)=>{
  if(!account.ready)return toast('로그인 뒤 이용하세요.','error');
  const row=state.guild?.active.find(x=>x.id===id), delivery=action==='deliver'&&row?.good;
  if(delivery&&!quote)return toast('납품 견적을 확인하세요.','error');
  return business.run(delivery?'ports':'personal',delivery?row.target:account.uid,(game,shared,time,revision)=>
    charterAction(game,action,id,time,{
      ...charterOptions(game),
      trade:delivery?order=>executeTrade(game,shared,account.uid,order.target,order.good,order.qty,'sell',quote,time,revision):null
    }),()=>{if(action==='deliver'||action==='report')uiUsage.complete('action-guild');});
}});
projectsUI=createProjectsUI({game:()=>state,uid:()=>account.uid,now:guildTime,nav:()=>nav,modal:showModal,close:()=>{modal.close();paused=false;centerShip();},
  read:async id=>{
    const record=await account.readShared('projects',id),project=PROJECT_BY_ID[id];
    if(project?.kind==='canal'&&projectView(project,record.content,account.uid,guildTime()).status==='open'){
      surveyedCanals.set(id,{toll:projectView(project,record.content,account.uid,guildTime()).toll,at:guildTime()});
      if(mapReady)renderRoutes();
    }
    if(project?.kind==='canal'&&nav&&state.rumorProgress?.items?.I050){
      const route=makeRoute(project.path),open=nav.route(project.path[0],project.path.at(-1),{maxDistance:20000});
      const text=project.name+' · 운하 '+Math.round(route.total)+'해리 · 보급 '+voyageEstimate(state,{...route,sections:[{start:0,end:route.total,river:true}]}).food.toFixed(1)+'일분 · 우회 '+(open?Math.round(open.total)+'해리':'경로 없음')+' · 척당 '+projectView(project,record.content,account.uid,guildTime()).toll+' D';
      if(appendItemRecord(state,'canals',id,text,guildTime()))save();
    }
    return record;
  },go:(project,action,view)=>{
    if(!nav||state.voyage)return toast('항해가 끝난 뒤 목적지를 선택하세요.');
    const points=action==='entrance'?[project.path[0],project.path.at(-1)]:[project.site.point];
    const point=points.reduce((a,b)=>distance(state.position,b)<distance(state.position,a)?b:a);
    state.controlMode='auto';
    if(project.kind==='depot'&&ACTIVE_PORT_BY_ID[project.id])return autoToPort(project.id);
    planDestination(null,point,false,project.kind==='depot'?{id:project.id,canRefill:view.stock>=fleetCount(state)}:null);
    if(planned)startVoyage();
  },action:async(project,action,amount,done)=>{
    if(action==='voucher')return business.run('personal',account.uid,game=>{
      designateCanalPass(game,project.id);
      return {message:project.name+'에 통행권을 지정했어요.'};
    },result=>{if(planned?.route?.passages){quoteCanalRoute(state,planned.route);renderPanel();}return done?.(result);});
    if(action==='transit'){
      if(!nav||combat?.blocked())return toast('전투가 끝난 뒤 운하로 진입하세요.');
      if(!combat?.hasReserve())try{await combat.prepare();}catch(error){return toast(error.message,'error');}
    }
    return business.run('projects',project.id,(game,shared,now)=>{
      const requested=action!=='transit'?amount:({entrance,toll})=>{
        if(toll!==amount)throw Error('운하 통행료가 바뀌었어요. 현재 요금을 다시 확인하세요.');
        const points=entrance===0?project.path:project.path.slice().reverse();
        const route=makeRoute([game.position,...points]);
        route.sections=[{start:0,end:route.total,river:true}];
        const estimate=canDepart(game,route);
        if(!estimate.ok)throw Error(estimate.error);
        game.controlMode='auto';
        return {...route,target:null,origin:null,canal:project.id,travelled:0,foodRemaining:estimate.food};
      };
      return projectAction(game,shared,account.uid,project.id,action,requested,now,nav);
    },async result=>{if(result.registry){await business.syncPorts();await community?.syncOwnership(true).catch(()=>{});}return done?.(result);});
  }});
const projectsMenu=document.createElement('button');
projectsMenu.className='nav-item';projectsMenu.dataset.usageKey='action-open-projects';
projectsMenu.textContent='공동 사업';
projectsMenu.onclick=()=>projectsUI.open();
$('.main-nav').append(projectsMenu);
shoreUI=createShoreUI({getState:()=>state,now:()=>Date.now()+(account.serverOffset||0),toast,modal:showModal,getNav:()=>nav,goBeach:site=>{
  if(state.voyage||state.shoreTrip)return;
  state.controlMode='auto';
  planDestination(null,site.point,false);
  if(planned)startVoyage();
},showMap:()=>{stopForUI();ux?.closeSheet();if(modal.open)modal.close();},action:(action,target)=>{
  if(!account.ready)return toast('로그인 뒤 이용하세요.','error');
  return business.run('personal',account.uid,(game,_shared,time)=>({...shoreAction(game,action,target,time,capacity(game)-usedSpace(game),nav),quiet:action==='start'||action==='walk'}));
}});
seaUI=createSeaActivityUI({getState:()=>state,now:guildTime,modal:showModal,go:site=>{
  if(!site||state.voyage)return;
  state.controlMode='auto';
  planDestination(null,site.point,false);
  if(planned)startVoyage();
},action:(action,id)=>{
  if(!account.ready||!nav)return toast('서버와 지도가 연결된 뒤 이용하세요.','error');
  return business.run('personal',account.uid,(game,_shared,time)=>seaActivityAction(game,action,id,time,{
    clear:nav.clear.bind(nav),room:capacity(game)-usedSpace(game)
  }));
}});
saleFinder=createSaleFinder({account,getState:()=>state,modal:showModal,toast,syncPorts:()=>business.syncPorts(),depart:autoToPort,portPoint,record:(good,qty,row,at)=>{
  if(row&&appendItemRecord(state,'prices',good+':'+at,GOODS[good].name+' '+qty+'상자 · '+row.port.name+' · '+row.quote.total+' D',at))save();
},look:point=>{modal.close();followShip=false;[camera.x,camera.y]=project(wrapPosition(point));applyCamera();}});
community=createCommunity({account,modal:showModal,toast,portPoint,onOwnership:()=>{if(!mapReady)return;renderPorts();const p=PORT_BY_ID[selected],name=$('#port-name');if(p&&name){const owner=community.ownerName(p.id);name.textContent=owner?p.name+'('+owner+')':p.name;}},look:point=>{modal.close();followShip=false;[camera.x,camera.y]=project(wrapPosition(point));applyCamera();}});
$('#fleet-btn').onclick=()=>expansion.showCaptains('online');
$$('[data-rank]').forEach(button=>button.onclick=()=>{rankMetric=button.dataset.rank;rankings.select(rankMetric);renderRanks();});
$('#chat-toggle').onclick=()=>toggleChat();$('#chat-close').onclick=()=>toggleChat();
$('#chat-connection').onclick=async()=>{
  if(!account.ready||fleet.connected)return;
  if(fleet.active)await fleet.stop();
  fleet.start();
};
$('#chat-input').oninput=()=>$('#chat-count').textContent=`${$('#chat-input').value.length}/${CHAT_MAX_LENGTH}`;
$('#chat-input').onfocus=()=>heldKeys.clear();
$('#chat-panel').addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();toggleChat(false);}else if(e.target.id==='chat-input'&&e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();$('#chat-form').requestSubmit();}});
$('#chat-form').onsubmit=async e=>{e.preventDefault();const input=$('#chat-input'),draft=input.value,text=chatText(draft);$('#chat-send').disabled=true;input.disabled=true;$('#chat-status').textContent='전송 중…';const result=await chat.send(text);if(result.ok){if(input.value===draft){input.value='';$('#chat-count').textContent='0/200';}$('#chat-status').textContent='전송했어요 · 다음 메시지는 3초 뒤에';}else $('#chat-status').textContent=result.error;renderChatConnection();if(chatOpen&&!input.disabled)input.focus();};
renderRanks();renderChatConnection();
async function maintenanceInProgress(){
  if(location.hostname!=='mathtjungsw.github.io')return false;
  try{
    const url=new URL('releaseStatus.json',FIREBASE_CONFIG.databaseURL);
    const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(3000)});
    return response.ok&&(await response.json())?.maintenance===true;
  }catch{return false;}
}
if(await maintenanceInProgress()){
  location.replace('maintenance.html');
}else try{
  const responses=await Promise.all(['assets/world-land.geojson','assets/navigation.json','assets/rivers.json','assets/islands.geojson','assets/chart-tiles/manifest.json'].map(url=>fetch(url+'?v='+RELEASE).then(r=>{if(!r.ok)throw Error('지도 데이터 오류');return r.json();})));
  responses[0].features.push(...responses[3].features);
  nav=new Navigator(responses[1],responses[2],createChartDetail(responses[0].features));
  longRoutePlanner=createRoutePlanner(nav,{grid:responses[1],rivers:responses[2],features:responses[0].features},RELEASE);
  for(const port of [...ALL_PORTS,...PORTS]){
    const berth=nav.approach(port);
    if(berth)portApproaches.set(port.id,berth);
  }
  reconcileNavigation(state,nav);
  setupMap(responses[0],responses[4]);centerShip();requestAnimationFrame(tick);
  clearLegacyStorage(storage);
  renderFleetStatus();showEntry();
}catch(error){$('#map-loading').innerHTML='<p>지도를 불러오지 못했어요.</p><button class="primary-button" style="width:180px" data-usage-key="action-reload" onclick="location.reload()">다시 불러오기</button>';console.error(error);}
