import {GOODS,PORTS,PORT_BY_ID,MISSIONS} from './data.js';
import {SAVE_KEY,START_DATE,initialState,loadState,capacity,usedCargo,dailySpeed,price,sellPrice,buy,sell,Navigator,project,unproject,positionAlong,voyageEstimate,distance,helmStep,helmToward} from './engine.js';
import {GlobeAtlas} from './globe.js';
import {FleetPresence} from './multiplayer.js';
import {PRESENCE_COLORS} from './presence-core.js';
import {CaptainChat} from './chat.js';
import {rankFleet,chatText,CHAT_MAX_LENGTH} from './social-core.js';
import {Exploration,SIGHT_NM,DISCOVERY_NM,INFO_PRICE,informationCandidate,buyInformation,knowsPort,discoverPorts,dockAlong,worldSpeed} from './voyage-core.js';
import {CaptainAccount,authMessage,localSaveKey,parseGame} from './account.js';
import {CaptainRankings} from './rankings.js';

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const fmt=n=>Math.round(n).toLocaleString('ko-KR');
const toward=name=>{const final=(name.charCodeAt(name.length-1)-0xac00)%28;return name+(final>0&&final!==8?'으로':'로');};
const icon=(name,cls='')=>`<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
let storage;try{storage=localStorage;}catch{storage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};}
try{const legacy=storage.getItem(SAVE_KEY);if(legacy&&!storage.getItem('windward-legacy-backup-v2'))storage.setItem('windward-legacy-backup-v2',legacy);}catch{}
let state=loadState(storage),selected=state.port||state.voyage?.target||'lisbon',planned=null,nav=null,paused=false,sound=false,audio=null,activeTab='trade',mapReady=false,followShip=!!state.voyage;
let exploration=new Exploration(state.explored),playing=false,legacyMode=true,sessionBlocked=false,lastFogAt=0;
exploration.seed(state);
const account=new CaptainAccount(storage);
account.readGame=()=>{state.explored=exploration.encode();return state;};
account.onStatus=text=>{$('#save-status').textContent=text;};
account.onConflict=()=>{sessionBlocked=true;paused=true;heldKeys.clear();manualActive=false;fleet.stop();showModal('다른 화면에서 이어하고 있어요','항해 기록 보호','<p>이 화면의 항해와 저장을 멈췄어요. 이 기기의 기록은 보존했습니다. 다시 접속하려면 새로고침해 주세요.</p>');};
const FIXED_MAP_SCALE=12;
let camera={x:project(state.position)[0],y:project(state.position)[1]},screen={w:0,h:0,k:FIXED_MAP_SCALE},drag=null,dragged=false,frame=0,globe=null;
const heldKeys=new Set(),portApproaches=new Map();
let manualTarget=null,manualActive=false,departedPort=null,manualAngle=0,manualChannel=null,lastPanelPort=null;
const modal=$('#modal');
let fleetStatus='offline',peerDrawTime=0,ownShipAngle=0,rankMetric='profit',chatOpen=true,chatUnread=0,chatSeen=0,chatLoading=true;
const ownRank=()=>({id:fleet.uid||'self',name:fleet.name,money:Math.round(state.money),profit:Math.round(state.profit),visited:state.visited.length});
const fleet=new FleetPresence({storage,readShip:()=>({position:[...state.position],angle:ownShipAngle,money:state.money,profit:state.profit,visited:state.visited.length,status:state.port?'정박':paused||modal.open||document.hidden||(!state.voyage&&!manualActive)?'멈춤':'항해'}),onChange:()=>{renderFleetStatus();renderRanks();renderPeers();renderMinimap();},onStatus:status=>{fleetStatus=status;if(status==='online'){chat.connect();rankings.connect();}else if(status==='offline'){chat.disconnect();}renderFleetStatus();renderRanks();renderChatConnection();}});
const chat=new CaptainChat({fleet,onChange:messages=>renderChat(messages),onStatus:text=>{$('#chat-status').textContent=text;renderChatConnection();}});
const rankings=new CaptainRankings(fleet,()=>renderRanks());
const visibleShips=()=>fleet.captains().filter(p=>distance(state.position,[p.lon,p.lat])<=SIGHT_NM).slice(0,29);

const RELEASE='2026.10.26-explorers';
function setupInterface(){
  const worldBadge=document.createElement('button');worldBadge.id='world-badge';worldBadge.className='world-badge';worldBadge.onclick=showAccount;$('.header-end').prepend(worldBadge);
  const tavernTab=document.createElement('button');tavernTab.id='tavern-tab';tavernTab.textContent='주점';tavernTab.onclick=()=>setTab('tavern');$('.panel-tabs').append(tavernTab);
  const tavern=document.createElement('section');tavern.id='tavern-content';tavern.className='hidden';$('.panel-content').append(tavern);
  const arrow=svgEl('path',{id:'heading-arrow',d:'M0-27V-42m-5 7 5-7 5 7',stroke:'#1d667a','stroke-width':3,fill:'none'});$('#ship-marker').append(arrow);
  const fog=svgEl('image',{id:'exploration-fog',x:0,y:0,width:1600,height:802.857142857,'pointer-events':'none',preserveAspectRatio:'none'});$('#routes').before(fog);
  const sight=svgEl('path',{id:'sight-boundary',fill:'none',stroke:'#fffdf0','stroke-width':1.4,'stroke-dasharray':'6 5','vector-effect':'non-scaling-stroke','pointer-events':'none'});fog.after(sight);
  const rankButton=document.createElement('button');rankButton.id='my-rank-query';rankButton.className='service-button';rankButton.textContent='내 순위 조회';rankButton.onclick=async()=>{if(!fleet.connected||!rankings.path){toast('계정으로 함께 항해에 연결하면 조회할 수 있어요.');return;}rankButton.disabled=true;try{await rankings.myRank(rankMetric,ownRank()[rankMetric]);renderRanks();}catch{toast('순위를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.');}finally{rankButton.disabled=false;}};$('.rank-card').append(rankButton);
  for(const [selector,title] of [['.navigation-mode','항해 조작'],['.captain-card','내 항해 정보'],['.rank-card','선장 랭킹'],['.mission-card','항해사의 의뢰'],['.port-panel','항구 정보'],['.minimap-card','세계 지구본']]){
    const panel=$(selector),body=document.createElement('div');body.className='fold-body';while(panel.firstChild)body.append(panel.firstChild);panel.append(body);const header=document.createElement('div');header.className='fold-heading';const label=document.createElement('strong');label.textContent=title;const button=document.createElement('button');button.type='button';button.textContent='− 접기';button.setAttribute('aria-expanded','true');body.id='body-'+selector.slice(1);button.setAttribute('aria-controls',body.id);button.onclick=()=>{const folded=panel.classList.toggle('is-collapsed');body.hidden=folded;button.textContent=folded?'+ 펼치기':'− 접기';button.setAttribute('aria-expanded',String(!folded));if(mapReady)resizeMap();};header.append(label,button);panel.prepend(header);
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
  const canvas=document.createElement('canvas');canvas.width=720;canvas.height=281;const ctx=canvas.getContext('2d'),data=ctx.createImageData(720,281);
  for(let i=0;i<720*281;i++){const seen=!!(exploration.bits[i>>3]&(1<<(i&7))),j=i*4;data.data[j]=seen?173:35;data.data[j+1]=seen?185:61;data.data[j+2]=seen?190:76;data.data[j+3]=seen?170:250;}ctx.putImageData(data,0,0);
  ctx.globalCompositeOperation='destination-out';for(const shift of [-720,0,720]){ctx.beginPath();exploration.boundary(state.position).forEach((p,i)=>{let lon=p[0];while(lon-state.position[0]>180)lon-=360;while(lon-state.position[0]<-180)lon+=360;const x=(lon+180)*2+shift,y=(80-p[1])*2;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);});ctx.closePath();ctx.fill();}
  $('#exploration-fog').setAttribute('href',canvas.toDataURL());$('#sight-boundary').setAttribute('d',routePath(exploration.boundary(state.position)));renderMinimap();
}
function exploreMove(from,to){
  exploration.travel(from,to);const found=discoverPorts(state,from,to);if(found.length){for(const p of found){log(`${p.name}의 항구를 찾았습니다. 자동 항해 목적지가 열렸어요.`,'discovery');toast(`새 항구 정보 · ${p.name}`,'discovery');}renderPorts();renderPanel();save();}renderFog();
}
function showAccount(){
  showModal('선장의 항해 기록','계정과 세계',`<p>${account.uid?'계정의 진행은 기기와 서버에 저장됩니다.':'지금은 이 브라우저에서 혼자 항해하고 있어요.'}<br>${state.world==='real'?'현실서버 · 1배속 고정':'평화서버 · 1·2·4배속'}</p><button class="primary-button" id="return-entry">저장하고 접속 화면으로</button><p class="modal-meta">세계마다 항해·채팅·랭킹이 따로 저장돼요. 다른 이름으로 시작해도 기존 선장 기록은 남아요.</p>`);
  $('#return-entry').onclick=async()=>{save();$('#return-entry').disabled=true;await fleet.stop();await account.close();location.reload();};
}
function showPatchNotes(){
  const seen=account.uid?account.seenVersion:storage.getItem('windward-patch-legacy');if(seen===RELEASE)return;
  showModal('새로운 항해가 시작됩니다','업데이트 · 2026.10.26',`<div class="patch-list"><h3>두 개의 바다</h3><p>평화서버는 1·2·4배속, 현실서버는 1배속으로 항해해요. 기록과 대화는 세계별로 나뉘어요.</p><h3>탐험하며 여는 항구</h3><p>처음에는 리스본과 인근 3개 항구만 알아요. 40해리 이내로 접근하거나 주점에서 100 D에 정보를 얻으면 새 목적지가 열려요.</p><h3>시야와 탐험 지도</h3><p>현재 시야는 180해리예요. 지나온 곳은 회색으로 기억하고, 시야 안의 다른 배만 보여요.</p><h3>선장 기록과 편한 화면</h3><p>이름과 숫자 6자리로 이어하기. 접속을 종료해도 세 가지 랭킹에 기록이 남아요. 모든 정보창은 열린 상태로 시작하고 제목줄에서 접을 수 있어요.</p></div><p class="modal-meta">확인한 업데이트는 다시 표시하지 않아요. 채팅은 펼치면 최근 50개, 접으면 최근 5개를 미리 보여줘요.</p><button class="primary-button" id="patch-confirm">확인하고 항해하기</button><button class="service-button" id="patch-later">나중에</button>`);
  $('#patch-later').onclick=()=>modal.close();$('#patch-confirm').onclick=async()=>{const button=$('#patch-confirm');button.disabled=true;try{if(account.uid)await account.acknowledge(RELEASE);else storage.setItem('windward-patch-legacy',RELEASE);modal.close();}catch{button.disabled=false;toast('확인 기록을 저장하지 못했어요. 다시 눌러주세요.','error');}};
}
function beginPlaying(game){
  state=game;state.speed=worldSpeed(state);exploration=new Exploration(state.explored);exploration.seed(state);selected=state.port||state.voyage?.target||'lisbon';planned=null;paused=false;playing=true;sessionBlocked=false;lastPanelPort=null;manualActive=false;manualTarget=null;manualChannel=null;departedPort=null;heldKeys.clear();
  $('#entry-screen')?.remove();$$('.topbar,.statusbar,.game-layout,.bottom-bar').forEach(el=>el.inert=false);setTab('trade');checkMissions();renderHUD();renderPanel();renderPorts();renderRoutes();renderShip();renderFog(true);centerShip();save();showPatchNotes();
}
function showEntry(){
  playing=false;$$('.topbar,.statusbar,.game-layout,.bottom-bar').forEach(el=>el.inert=true);const entry=document.createElement('section');entry.id='entry-screen';entry.setAttribute('aria-label','선장 접속');entry.setAttribute('role','dialog');entry.setAttribute('aria-modal','true');
  entry.innerHTML=`<div class="entry-art"><span class="entry-kicker">WINDWARD · A TRADER'S ATLAS</span><h1>당신만의 항로가<br>시작되는 곳.</h1><p>바람을 따라 항구를 발견하고,<br>특산물을 거래하며 세계를 탐험하세요.</p><div class="entry-ship">${icon('ship')}</div><small>평면 해도 · 세계 지구본 · 64개의 항구</small></div><div class="entry-card"><h2>항해 시작</h2><p>테스트용 계정 · 이름과 숫자 6자리</p><div class="entry-tabs"><button type="button" data-entry="new" aria-pressed="true">새로하기</button><button type="button" data-entry="resume" aria-pressed="false">이어하기</button></div><form id="entry-form"><label for="entry-name">선장 이름</label><input id="entry-name" maxlength="16" autocomplete="username" required placeholder="바람선장"><label for="entry-pin">숫자 6자리 비밀번호</label><input id="entry-pin" type="password" inputmode="numeric" pattern="[0-9]{6}" minlength="6" maxlength="6" autocomplete="new-password" required placeholder="숫자 6자리를 입력하세요"><fieldset class="world-options"><legend>항해할 세계</legend><label><input type="radio" name="world" value="peace" checked><span><b>평화서버</b><small>1·2·4배속으로 여유롭게</small></span></label><label><input type="radio" name="world" value="real"><span><b>현실서버</b><small>1배속 고정 · 별도 항해 기록</small></span></label></fieldset><label class="import-choice" id="legacy-choice"><input id="legacy-import" type="checkbox"> 이 브라우저의 기존 기록을 평화서버로 가져오기</label><p id="entry-error" role="status"></p><button class="primary-button" id="entry-submit">새 항해 시작 →</button></form><button class="service-button" id="offline-start">${storage.getItem(SAVE_KEY)?'기존 저장으로 혼자 항해':'계정 없이 혼자 항해'}</button><p class="entry-note">이름은 중복 사용할 수 없어요. 테스트 비밀번호를 잊으면 새 이름으로 시작해 주세요. 혼자 항해는 현재 브라우저에 저장돼요.</p></div>`;document.body.append(entry);
  const share=document.createElement('label');share.className='import-choice';share.innerHTML='<input type="checkbox" id="entry-share" checked> 함께 항해 연결 · 배 위치와 순위 공유';$('#entry-error').before(share);
  let mode='new',takeover=false;
  $('#entry-name').value=storage.getItem('windward-last-account')||'';$('#legacy-choice').hidden=!storage.getItem(SAVE_KEY)||!!storage.getItem('windward-legacy-imported');$('#legacy-import').checked=!$('#legacy-choice').hidden;
  $$('[data-entry]').forEach(b=>b.onclick=()=>{mode=b.dataset.entry;takeover=false;$$('[data-entry]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));$('#entry-submit').textContent=mode==='new'?'새 항해 시작 →':'이어서 항해 →';$('#entry-pin').autocomplete=mode==='new'?'new-password':'current-password';$('#entry-error').textContent='';});
  $('#offline-start').onclick=()=>{try{const text=storage.getItem(SAVE_KEY),game=text?parseGame(JSON.parse(text)):initialState();legacyMode=true;beginPlaying(game);}catch{$('#entry-error').textContent='기존 저장을 확인하지 못했어요. 원본과 백업은 그대로 보존했어요. 새 계정으로 시작할 수 있어요.';}};
  $('#entry-form').onsubmit=async event=>{event.preventDefault();const button=$('#entry-submit');button.disabled=true;$('#entry-error').textContent='항해 기록을 확인하고 있어요…';const world=$('input[name="world"]:checked').value,importLegacy=$('#legacy-import').checked&&!$('#legacy-choice').hidden;
    try{const shareEnabled=$('#entry-share').checked;const game=await account.login({name:$('#entry-name').value,pin:$('#entry-pin').value,mode,world,importLegacy,takeover});storage.setItem('windward-last-account',account.name);if(importLegacy&&world==='peace')storage.setItem('windward-legacy-imported',account.uid);legacyMode=false;fleet.useAccount(account);beginPlaying(game);if(shareEnabled)fleet.start();}
    catch(error){$('#entry-error').textContent=authMessage(error);if(error.code==='session'){takeover=true;button.textContent='다른 화면을 멈추고 여기서 이어하기';}if(error.code==='conflict'){const cacheKey=localSaveKey(account.uid,world),backupKey=cacheKey+':conflict:'+Date.now();storage.setItem(backupKey,storage.getItem(cacheKey));const choose=document.createElement('button');choose.type='button';choose.className='service-button';choose.textContent='이 기기 기록을 백업하고 서버 기록 이어하기';choose.onclick=()=>{const cached=JSON.parse(storage.getItem(cacheKey));cached.pending=false;storage.setItem(cacheKey,JSON.stringify(cached));choose.remove();$('#entry-error').textContent='이 기기 기록을 별도 보존했어요. 이어하기를 다시 눌러주세요.';};$('#entry-form').append(choose);}button.disabled=false;}
  };
}

function renderFleetStatus(){
  const labels={offline:'혼자 항해',connecting:'연결 중…',reconnecting:'재연결 중…',online:`주변 항해 · ${visibleShips().length+1}명`,permission:'접속 확인 필요',error:'연결 다시 시도',unconfigured:'연결 준비 중'};
  $('#fleet-btn').textContent=labels[fleetStatus]||'함께 항해';$('#fleet-btn').classList.toggle('online',fleetStatus==='online');
  if($('#fleet-live-list'))renderFleetList();
}
function renderRanks(){
  const players=rankings.path?(rankings.rows[rankMetric]||[]):fleet.connected?[ownRank(),...fleet.captains()]:[ownRank()];
  const ranks=rankFleet(players,rankMetric),top=ranks.slice(0,5),root=$('#rank-list');root.replaceChildren();
  for(const player of top){const row=document.createElement('li');row.className=player.id===ownRank().id?'my-rank':'';const number=document.createElement('b');number.textContent=player.rank;const name=document.createElement('span');name.textContent=player.name+(player.id===ownRank().id?' (나)':'');const score=document.createElement('strong');score.textContent=fmt(player[rankMetric])+(rankMetric==='visited'?'곳':' D');row.append(number,name,score);root.append(row);}
  if(!top.length){const empty=document.createElement('li');empty.textContent='선장들의 기록을 기다리는 중…';root.append(empty);}
  const me=ranks.find(p=>p.id===ownRank().id),mine=me?.rank||rankings.myRanks[rankMetric];$('#my-rank').textContent=rankings.path?`내 순위 ${mine?mine+'위':'조회하기 ↓'} · 접속을 종료해도 기록 유지`:fleet.connected?`현재 접속 ${players.length}명 · 테스트 기록`:'혼자 항해 중 · 개인 기록';
  $$('[data-rank]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.rank===rankMetric)));
}
function renderChatConnection(){
  const enabled=fleet.connected&&chat?.ready;
  $('#chat-send').disabled=!enabled||chat.sending;$('#chat-input').disabled=!enabled||chat.sending;
  $('#chat-connection').hidden=!!enabled;$('#chat-connection').textContent=fleet.active?'연결을 기다리는 중…':'함께 항해 연결하기';
  if(!fleet.connected)$('#chat-status').textContent='함께 항해에 연결하면 대화할 수 있어요.';
}
function renderChat(messages){
  const root=$('#chat-messages'),nearBottom=root.scrollHeight-root.scrollTop-root.clientHeight<60;
  const highest=messages.at(-1)?.seq||0;
  if(!chatLoading&&!chatOpen)chatUnread+=messages.filter(m=>m.seq>chatSeen&&m.uid!==fleet.uid).length;
  chatSeen=Math.max(chatSeen,highest);if(chat?.ready)chatLoading=false;
  root.replaceChildren();
  if(!messages.length){const empty=document.createElement('p');empty.className='chat-empty';empty.textContent='바다 위 선장들에게 인사를 건네 보세요.';root.append(empty);}
  for(const message of messages){const item=document.createElement('article');item.className='chat-message'+(message.uid===fleet.uid?' mine':'');item.dataset.sequence=message.seq;const header=document.createElement('div');const name=document.createElement('strong');name.textContent=message.name;const time=document.createElement('time');time.textContent=new Date(message.at).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false});const body=document.createElement('p');body.textContent=message.text;header.append(name,time);item.append(header,body);root.append(item);}
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
  const root=$('#fleet-live-list');if(!root)return;root.replaceChildren();
  for(const ship of [{name:fleet.name,status:'내 배',color:fleet.color},...fleet.ships()]){const row=document.createElement('div');row.className='fleet-row';const dot=document.createElement('i');dot.style.background=PRESENCE_COLORS[ship.color];const name=document.createElement('strong');name.textContent=ship.name;const status=document.createElement('span');status.textContent=ship.status;row.append(dot,name,status);root.append(row);}
}
function showFleet(){
  showModal('같은 바다를 항해하는 선장들','SAIL TOGETHER',`<p>접속한 선장의 배와 이름이 해도와 지구본에 표시돼요.</p><label class="fleet-name-label" for="captain-name">내 선장 이름</label><div class="fleet-name-input"><input id="captain-name" maxlength="16" autocomplete="off"><button id="captain-name-save" class="service-button">이름 저장</button></div><div id="fleet-live-list"></div><button class="primary-button" id="fleet-toggle">${fleet.active&&fleet.connected?'혼자 항해하기':'함께 항해 연결하기'}</button><p class="modal-meta">이름·게임 속 배 위치·항해 상태와 순위용 금액·항구 수를 공유합니다. 화물과 상세 진행은 선장 본인만 볼 수 있는 기록에 저장돼요. 다른 배와의 충돌·교환·경쟁은 없어요. 위치는 약 1.5초 간격으로 전달하며 최대 30척을 표시합니다.</p>`);
  $('#captain-name').value=fleet.name;renderFleetList();
  if(account.uid){$('#captain-name').readOnly=true;$('#captain-name-save').disabled=true;$('#captain-name-save').textContent='계정 이름';}
  $('#captain-name-save').onclick=()=>{fleet.setName($('#captain-name').value);$('#captain-name').value=fleet.name;renderFleetList();toast('선장 이름을 저장했어요.');};
  $('#fleet-toggle').onclick=async()=>{const leave=fleet.active&&fleet.connected;if(!leave&&!account.ready){save();modal.close();showEntry();return;}await fleet.stop();try{storage.setItem('windward-fleet-enabled',leave?'0':'1');}catch{}if(!leave)fleet.start();modal.close();};
}
function renderPeers(){
  if(!mapReady)return;const root=$('#fleet-markers');root.replaceChildren();
  visibleShips().forEach((ship,i)=>{let [x,y]=project([ship.lon,ship.lat]);if(ship.status==='정박'){x+=(-35+(i%3)*25)/screen.k;y+=(-34-Math.floor(i/3)*20)/screen.k;}
    const g=svgEl('g',{class:'fleet-ship',transform:`translate(${x},${y}) scale(${1/screen.k})`,'data-peer':ship.id});
    const hull=svgEl('path',{d:'M-10 4H10L6 10H-5ZM0-15V4M-2-13-10 1H-2ZM3-10V1H12Z',fill:PRESENCE_COLORS[ship.color],stroke:'#fffcef','stroke-width':1.1});
    const arrow=svgEl('path',{d:'M0-20V-29m-4 5 4-5 4 5',stroke:PRESENCE_COLORS[ship.color],'stroke-width':2,transform:`rotate(${ship.angle})`});g.append(arrow);
    const text=svgEl('text',{x:0,y:-23,'text-anchor':'middle'});text.textContent=ship.name;const title=svgEl('title');title.textContent=`${ship.name} · ${ship.status}`;g.append(hull,text,title);root.append(g);
  });
}

function save(){
  if(!playing||sessionBlocked)return;state.speed=worldSpeed(state);state.explored=exploration.encode();
  if(account.uid){account.save(state);return;}
  try{storage.setItem(SAVE_KEY,JSON.stringify(state));}catch{$('#save-status').innerHTML='<i></i>저장 공간 부족';}
}
function log(text,type='info'){state.log.unshift({day:state.day,text,type});state.log=state.log.slice(0,50);$('#latest-log').textContent=text;}
function toast(text,type=''){const div=document.createElement('div');div.className='toast '+type;div.textContent=text;$('#toast-container').append(div);setTimeout(()=>div.remove(),4300);}
function bell(){if(!sound)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume();const now=audio.currentTime;[523.25,659.25,783.99].forEach((freq,i)=>{const osc=audio.createOscillator(),gain=audio.createGain();osc.type='sine';osc.frequency.value=freq;gain.gain.setValueAtTime(0,now+i*.13);gain.gain.linearRampToValueAtTime(.08,now+i*.13+.015);gain.gain.exponentialRampToValueAtTime(.001,now+i*.13+.9);osc.connect(gain).connect(audio.destination);osc.start(now+i*.13);osc.stop(now+i*.13+1);});}catch{}}
function showModal(title,eyebrow,content){$('#modal-title').textContent=title;$('#modal-eyebrow').textContent=eyebrow;$('#modal-content').innerHTML=content;if(!modal.open)modal.showModal();}
function dateText(day,short=false){const date=new Date(START_DATE+Math.floor(day)*86400000);return short?`${date.getUTCFullYear()} · ${date.getUTCMonth()+1}.${String(date.getUTCDate()).padStart(2,'0')}`:`${date.getUTCFullYear()}년 ${date.getUTCMonth()+1}월 ${date.getUTCDate()}일`;}
function coordinates(p){return `${Math.abs(p.lat).toFixed(1)}° ${p.lat>=0?'N':'S'}  /  ${Math.abs(p.lon).toFixed(1)}° ${p.lon>=0?'E':'W'}`;}

function renderHUD(){
  state.speed=worldSpeed(state);
  $('#latest-log').textContent=state.log[0]?.text||'당신의 항로를 시작하세요.';
  $('#money').innerHTML=`${fmt(state.money)} <em>D</em>`;
  $('#cargo-stat').innerHTML=`${usedCargo(state)} <em>/ ${capacity(state)}</em>`;
  $('#food-stat').innerHTML=`${Math.floor(state.food)} <em>일분</em>`;
  $('#food-bar').style.width=`${state.food/160*100}%`;
  $('#cargo-bar').style.width=`${usedCargo(state)/capacity(state)*100}%`;
  $('#game-date').textContent=dateText(state.day);
  $('#visited-stat').textContent=state.visited.length;
  $('#atlas-count').textContent=state.visited.length;
  $('#profit-stat').textContent=fmt(state.profit);
  renderRanks();
  $('#cargo-count').textContent=`${usedCargo(state)} / ${capacity(state)}`;
  const currentRiver=nav?.riverAt(state.position)?.river;
  $('#waterway-status').textContent=currentRiver?`${currentRiver.name} · 내륙 항해`:'고정 배율 평면 해도 · 외해';
  $('#waterway-status').classList.toggle('on-river',!!currentRiver);
  $('#globe-coordinates').textContent=coordinates({lon:state.position[0],lat:state.position[1]});
  $('#mobile-port-btn span').textContent=selected?`${PORT_BY_ID[selected].name} · 항구 정보 열기`:'항해 정보 열기';
  $('#mobile-port-btn').classList.toggle('hidden',!!state.voyage||manualActive);
  $('#auto-mode').setAttribute('aria-pressed',String(state.controlMode==='auto'));
  $('#manual-mode').setAttribute('aria-pressed',String(state.controlMode==='manual'));
  $('#manual-pad').classList.toggle('visible',state.controlMode==='manual');
  $('#mode-hint').textContent=state.controlMode==='manual'?'바다 클릭 / 방향키로 이동 · 항구 가까이 가면 입항해요.':'항구 선택 → 출항 · 배가 바다 항로를 따라 이동해요.';
  $('#current-location').textContent=state.voyage?`${toward(state.voyage.target?PORT_BY_ID[state.voyage.target].name:'선택한 해역')} 항해 중`:state.port?`${PORT_BY_ID[state.port].name}에 정박 중`:'바다 위 · 다음 항로를 정하세요';
  $('#sailing-banner').classList.toggle('hidden',!state.voyage&&!manualActive);
  $('.voyage-progress').classList.toggle('hidden',!state.voyage);
  if(state.voyage){const v=state.voyage,percent=Math.min(100,v.travelled/v.total*100),days=(v.total-v.travelled)/dailySpeed(state),name=v.target?PORT_BY_ID[v.target].name:'새로운 해역';$('#sail-title').textContent=paused?`${name} · 일시 정지`:`${toward(name)} 항해 중`;$('#sail-percent').textContent=Math.floor(percent)+'%';$('#voyage-bar').style.width=percent+'%';$('#sail-remaining').textContent=`${fmt(v.total-v.travelled)} 해리 · 약 ${days.toFixed(1)}일 남음`;$('#pause-btn').textContent=paused?'▶':'Ⅱ';$('#pause-btn').setAttribute('aria-label',paused?'항해 재개':'항해 일시 정지');}
  else if(manualActive){$('#sail-title').textContent=paused?'직접 조종 · 일시 정지':'직접 조종 중';$('#sail-percent').textContent='HELM';$('#sail-remaining').textContent=manualTarget?`클릭한 지점까지 ${fmt(distance(state.position,manualTarget))}해리`:'방향키를 놓으면 멈춰요 · 스페이스: 정지';$('#pause-btn').textContent=paused?'▶':'Ⅱ';$('#pause-btn').setAttribute('aria-label',paused?'항해 재개':'항해 일시 정지');$('#current-location').textContent='직접 조종 · '+coordinates({lon:state.position[0],lat:state.position[1]});}
  $$('[data-speed]').forEach(b=>{b.classList.toggle('active',Number(b.dataset.speed)===state.speed);b.disabled=state.world==='real'&&Number(b.dataset.speed)!==1;b.title=state.world==='real'?'현실서버는 1배속으로 고정됩니다.':'';});
  $('#world-badge')?.replaceChildren(document.createTextNode(state.world==='real'?'현실서버 · 1배속 고정':'평화서버 · 1·2·4배속'));
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
  if(lastPanelPort!==selected){$('#port-panel').scrollTop=0;lastPanelPort=selected;}
  const p=PORT_BY_ID[selected],atPort=p&&state.port===p.id&&!state.voyage;
  const visited=p&&state.visited.includes(p.id);
  $('#port-name').innerHTML=p?`${p.name} <em>${p.en}</em>`:'바다 위 <em>Open Sea</em>';
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
  $('#rescue-btn').onclick=()=>{if(state.port||state.voyage)return;showModal('구조선을 부를까요?','RETURN TO HARBOR',`<p>현재 위치에서 리스본으로 돌아갑니다. 구조비는 최대 150 D이며, 화물은 그대로 유지돼요. 식량 30일분과 함께 다시 출항할 수 있어요.</p><button class="primary-button" id="confirm-rescue">구조선 호출 · ${fmt(Math.min(150,state.money))} D</button>`);$('#confirm-rescue').onclick=()=>{stopManual();departedPort=null;state.money=Math.max(0,state.money-150);state.port='lisbon';state.position=[-9.14,38.72];state.food=Math.max(30,state.food);state.day+=3;selected='lisbon';planned=null;log('구조선의 도움으로 리스본에 귀환했습니다.');modal.close();changed();centerShip();};};
  renderTavern();renderSailButton();renderHUD();
}
function renderTavern(){
  const root=$('#tavern-content');if(!root)return;const at=state.port&&state.port===selected&&!state.voyage,candidate=at&&informationCandidate(state);
  root.innerHTML=`<div class="tavern-intro"><span>⚓</span><h3>선원들이 모이는 주점</h3><p>인근 항구의 소식을 들어보세요.<br>정보를 얻으면 자동 항해 목적지로 선택할 수 있어요.</p></div><button class="primary-button" id="info-buy" ${at&&candidate?'':'disabled'}>${!at?'이 항구에 입항하면 이용할 수 있어요':candidate?'정보 얻기 · 100 D':'근처의 항구 정보를 모두 알고 있어요'}</button><p class="modal-meta">600해리 이내의 가장 가까운 미개방 항구 1곳. 방문 보상은 실제 입항할 때 받아요.</p>`;
  $('#info-buy').onclick=()=>{if(!at||!informationCandidate(state))return;showModal('항구 정보를 구매할까요?','주점 · 새로운 항로',`<p>인근 미개방 항구 1곳의 정보를 얻습니다.<br>비용 100 D · 보유 ${fmt(state.money)} D</p><button class="primary-button" id="confirm-info">구매하기 · 100 D</button><button class="service-button" id="cancel-info">취소</button>`);$('#cancel-info').onclick=()=>modal.close();$('#confirm-info').onclick=()=>{const result=buyInformation(state);if(!result.ok){toast(result.error,'error');return;}log(`주점에서 ${result.port.name}의 항구 정보를 얻었습니다. −100 D`,'discovery');modal.close();toast(`${result.port.name} 개방! 자동 항해 목적지에 추가됐어요.`,'discovery');changed();};};
}
function renderSailButton(){
  const btn=$('#sail-btn'),p=PORT_BY_ID[selected],atPort=p&&state.port===p.id;
  const box=$('#route-box');box.classList.toggle('hidden',!planned||!!state.voyage);
  if(state.controlMode==='manual'){
    box.classList.add('hidden');btn.disabled=!p||atPort;btn.innerHTML=`${icon(atPort?'anchor':'ship')}<span>${atPort?`${p.name}에 정박 중`:p?`${p.name} 쪽으로 직접 조종`:'바다 클릭 또는 방향키로 이동'}</span>`;$('#sail-hint').textContent='직접 조종은 해안을 피해 이동하세요. ■ 버튼: 정지';return;
  }
  if(planned&&!state.voyage){const estimate=voyageEstimate(state,planned.route),rivers=(planned.route.waterways||[]).map(id=>nav.rivers.find(r=>r.id===id)?.name).filter(Boolean);box.innerHTML=`<div>예상 항해 거리<strong>${fmt(planned.route.total)} <em>해리</em></strong></div><div>예상 소요 시간<strong>${estimate.days.toFixed(1)} <em>일</em></strong></div><p>식량 약 ${estimate.food}일분 필요${rivers.length?' · '+rivers.join(' → '):' · 바다 항로'}</p>`;}
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

function setTab(tab){activeTab=tab;for(const id of ['trade','ship','tavern']){$('#'+id+'-tab')?.classList.toggle('active',tab===id);$('#'+id+'-content')?.classList.toggle('hidden',tab!==id);}}

function geoPath(geometry){
  const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;
  return polygons.map(rings=>rings.map(ring=>ring.map((p,i)=>{const [x,y]=project(p);return `${i?'L':'M'}${x.toFixed(2)},${y.toFixed(2)}`;}).join('')+'Z').join('')).join('');
}
function svgEl(name,attrs={}){const el=document.createElementNS('http://www.w3.org/2000/svg',name);for(const [key,value]of Object.entries(attrs))el.setAttribute(key,value);return el;}
function setupMap(land,countries){
  for(const f of land.features){const d=geoPath(f.geometry);$('#coast-shadow').append(svgEl('path',{d}));$('#land').append(svgEl('path',{d}));}
  for(const f of countries.features)$('#borders').append(svgEl('path',{d:geoPath(f.geometry)}));
  for(const r of nav.rivers){const d=routePath(r.path);$('#waterways').append(svgEl('path',{d,class:'river-shore','vector-effect':'non-scaling-stroke'}),svgEl('path',{d,class:'river-water','vector-effect':'non-scaling-stroke'}));const title=svgEl('title');title.textContent=`${r.name} · ${r.reach}`;$('#waterways').append(title);}
  let grid='';for(let lon=-180;lon<=180;lon+=30){const x=project([lon,0])[0];grid+=`M${x} 0V800`;const t=svgEl('text',{x:x+5,y:790});t.textContent=Math.abs(lon)+'°';$('#graticule').append(t);}for(let lat=-60;lat<=80;lat+=20){const y=project([0,lat])[1];grid+=`M0 ${y}H1600`;const t=svgEl('text',{x:12,y:y-6});t.textContent=Math.abs(lat)+'°';$('#graticule').append(t);}$('#graticule').append(svgEl('path',{d:grid}));
  const labels=[[-39,28,'ATLANTIC',false],[-31,18,'OCEAN',false],[73,-19,'INDIAN OCEAN',false],[-128,4,'PACIFIC',false],[164,8,'PACIFIC',false],[-105,47,'북아메리카',true],[-57,-13,'남아메리카',true],[22,13,'아프리카',true],[65,50,'아시아',true],[132,-26,'오세아니아',true]];
  for(const [lon,lat,label,continent]of labels){const [x,y]=project([lon,lat]);const t=svgEl('text',{x,y,class:continent?'continent-label':''});t.textContent=label;$('#map-labels').append(t);}
  globe=new GlobeAtlas($('#minimap'),land,nav.rivers,PORTS,point=>{followShip=false;[camera.x,camera.y]=project(point);applyCamera();});
  mapReady=true;$('#map-loading').remove();resizeMap();renderRoutes();renderShip();
  renderFog(true);
}
function resizeMap(){const box=$('.chart').getBoundingClientRect();screen.w=box.width;screen.h=box.height;$('#world-map').setAttribute('viewBox',`0 0 ${screen.w} ${screen.h}`);applyCamera();}
function applyCamera(){
  const oldScale=screen.k;
  screen.k=FIXED_MAP_SCALE;
  $('#map-camera').setAttribute('transform',`translate(${screen.w/2},${screen.h/2}) scale(${screen.k}) translate(${-camera.x},${-camera.y})`);
  if(Math.abs(oldScale-screen.k)>.00001||!$('#port-markers').children.length)renderPorts();renderShip();renderPeers();renderMinimap();
}
const labelOffsets={lisbon:[-13,-12,'end'],seville:[10,23,'start'],london:[-12,-15,'end'],amsterdam:[12,-6,'start'],venice:[10,19,'start'],alexandria:[12,5,'start'],accra:[-11,3,'end'],cape:[-11,3,'end'],zanzibar:[12,3,'start'],muscat:[10,-9,'start'],goa:[10,1,'start'],malacca:[-12,2,'end'],batavia:[12,18,'start'],macau:[-12,-8,'end'],nagasaki:[13,13,'start'],busan:[-12,-11,'end'],havana:[-11,-10,'end'],cartagena:[-12,4,'end'],recife:[12,4,'start'],buenos:[-12,4,'end'],sydney:[12,4,'start']};
function renderPorts(){
  if(!mapReady)return;
  const root=$('#port-markers');root.replaceChildren();
  for(const p of PORTS.filter(p=>knowsPort(state,p.id))){
    const [x,y]=project([p.lon,p.lat]),visited=state.visited.includes(p.id),chosen=selected===p.id;
    const g=svgEl('g',{class:`port-marker ${visited?'visited':''} ${chosen?'selected':''}`,transform:`translate(${x},${y}) scale(${1/screen.k})`,role:'button',tabindex:'0','aria-label':`${p.name}, ${p.country}${visited?', 방문함':''}`,'data-port':p.id});
    g.append(svgEl('circle',{r:17,class:'marker-hit'}));
    if(chosen)g.append(svgEl('circle',{r:13,class:'selection-ring'}));
    g.append(svgEl('circle',{r:5,class:'marker-outer'}),svgEl('circle',{r:1.8,class:'marker-inner'}));if(p.river)g.append(svgEl('path',{d:'M-3 0q1.5-3 3 0t3 0',class:'river-marker'}));
    {const [dx,dy,anchor]=p.id==='sanlucar'?[-12,20,'end']:labelOffsets[p.id]||[12,-8,'start'];const text=svgEl('text',{x:dx,y:dy,'text-anchor':anchor,class:'port-text'});text.textContent=p.name;g.append(text);if(chosen){const en=svgEl('text',{x:dx,y:dy+13,'text-anchor':anchor,class:'port-text port-subtitle'});en.textContent=p.en.toUpperCase();g.append(en);}}
    const title=svgEl('title');title.textContent=`${p.name} · ${p.country} · 특산물 ${GOODS[p.specialty].name}`;g.append(title);
    g.onclick=e=>{e.stopPropagation();if(dragged)return;selectPort(p.id);};g.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectPort(p.id);}};root.append(g);
  }
}
function routePath(path){let d='';let prev=null;for(const p of path){const [x,y]=project(p);d+=`${!prev||Math.abs(x-prev[0])>800?'M':'L'}${x},${y}`;prev=[x,y];}return d;}
function renderRoutes(){
  const root=$('#routes');root.replaceChildren();
  if(state.voyage)root.append(svgEl('path',{d:routePath(state.voyage.path),class:'voyage-line','vector-effect':'non-scaling-stroke'}));
  else if(planned)root.append(svgEl('path',{d:routePath(planned.route.path),class:'route-line','vector-effect':'non-scaling-stroke'}));
  if(manualTarget){const [x,y]=project(manualTarget);root.append(svgEl('path',{d:routePath(manualChannel?.path||[state.position,manualTarget]),class:'manual-route','vector-effect':'non-scaling-stroke'}),svgEl('circle',{cx:x,cy:y,r:7/screen.k,class:'manual-target','vector-effect':'non-scaling-stroke'}));}
  renderMinimap();
}
function renderMinimap(){
  if(!mapReady||!globe)return;
  const w=screen.w/screen.k/2,h=screen.h/screen.k/2,viewport=[[-w,-h],[w,-h],[w,h],[-w,h],[-w,-h]].map(([x,y])=>unproject([camera.x+x,camera.y+y]));
  globe.peers=visibleShips().map(p=>({...p,fill:PRESENCE_COLORS[p.color]}));globe.exploration=exploration;
  globe.update(state,viewport,state.voyage?.path||planned?.route.path||manualChannel?.path||[]);
}
function renderShip(){
  if(!mapReady)return;let [x,y]=project(state.position);let angle=0;
  if(state.voyage){const next=positionAlong(state.voyage,Math.min(state.voyage.total,state.voyage.travelled+12)),p=project(next);let dx=p[0]-x;if(dx>800)dx-=1600;if(dx<-800)dx+=1600;if(Math.hypot(dx,p[1]-y)>.00001)angle=Math.atan2(p[1]-y,dx)*180/Math.PI+90;else angle=ownShipAngle;}
  if(state.controlMode==='manual'&&!state.port)angle=manualAngle;else if(!state.voyage)angle=ownShipAngle;
  ownShipAngle=angle;
  if(state.port){x-=15/screen.k;y+=9/screen.k;}
  // The map uses screen-sized icons, so the ship stays readable while zooming.
  $('#ship-marker').setAttribute('transform',`translate(${x},${y}) scale(${.78/screen.k})`);
  $('#heading-arrow').setAttribute('transform',`rotate(${angle})`);
  renderMinimap();
}
function selectPort(id){
  if(!knowsPort(state,id)){toast('탐험하거나 주점에서 정보를 얻어 항구를 먼저 개방하세요.');return;}
  selected=id;setTab('trade');
  if(state.controlMode==='manual'){planned=null;renderRoutes();renderPanel();renderPorts();}
  else if(!state.voyage&&state.port!==id)planDestination(id,[PORT_BY_ID[id].lon,PORT_BY_ID[id].lat],false);
  else {planned=null;renderRoutes();renderPanel();renderPorts();}
  if(innerWidth<=850)$('#port-panel').scrollIntoView({behavior:'smooth',block:'start'});
}
function planDestination(target,point,scroll=true){
  if(!nav||state.voyage)return;
  if(target&&!knowsPort(state,target)){toast('아직 정보를 얻지 못한 항구예요.');return;}
  if(target)selected=target;else selected=null;
  const route=nav.route(state.position,point);
  if(!route||route.total<.5){planned=null;toast('이곳까지의 항로를 찾지 못했어요. 가까운 바다나 다른 항구를 선택하세요.','error');renderPanel();renderRoutes();return;}
  planned={target,point,route};renderRoutes();renderPanel();renderPorts();
  if(scroll&&innerWidth<=850)$('#port-panel').scrollIntoView({behavior:'smooth',block:'start'});
}
function startVoyage(){
  if(!playing||sessionBlocked)return;
  if(state.controlMode==='manual'){if(selected&&selected!==state.port)startManual(portApproaches.get(selected));return;}
  if(!planned||state.voyage||planned.target&&!knowsPort(state,planned.target))return;const estimate=voyageEstimate(state,planned.route);if(state.food<estimate.food){toast('식량을 먼저 보급하세요.','error');return;}
  state.voyage={...planned.route,target:planned.target,travelled:0,foodRemaining:estimate.food};state.port=null;paused=false;planned=null;log(`${toward(state.voyage.target?PORT_BY_ID[state.voyage.target].name:'새로운 해역')} 출항. 총 ${fmt(state.voyage.total)}해리.`, 'sailing');toast('⚓ 출항! 새로운 바다가 기다립니다.');modal.close();renderRoutes();renderPanel();renderHUD();centerShip();save();
  if(innerWidth<=850)$('.chart').scrollIntoView({behavior:'smooth',block:'start'});
}
function arrive(manualPort=null){
  const p=PORT_BY_ID[manualPort],v=p?{path:[[p.lon,p.lat]],target:p.id}:state.voyage;
  manualTarget=null;manualChannel=null;manualActive=false;heldKeys.clear();
  state.position=v.target?[PORT_BY_ID[v.target].lon,PORT_BY_ID[v.target].lat]:v.path.at(-1);state.port=v.target;state.voyage=null;planned=null;selected=v.target;paused=false;followShip=false;
  let discovery=false;
  if(v.target){const p=PORT_BY_ID[v.target];discovery=!state.visited.includes(p.id);if(discovery){state.visited.push(p.id);state.money+=120;log(`${p.name} 발견! ${p.country} · ${p.sea}. 발견 보상 +120 D`,'discovery');toast(`✦ 새로운 항구, ${p.name}! +120 D`,'discovery');}else{log(`${p.name}에 입항했습니다.`);toast(`⚓ ${p.name}에 도착했습니다.`);}bell();}else{log('목표 해역에 도착했습니다. 다음 항로를 선택하세요.');toast('목표 해역에 도착했어요. 가까운 항구로 향해보세요.');}
  if(v.target&&!knowsPort(state,v.target))state.knownPorts.push(v.target);exploration.reveal(state.position);renderFog(true);changed();renderRoutes();
  if(discovery){const p=PORT_BY_ID[v.target];showModal(`${p.name}, 새로운 발견`,'A NEW PAGE IN YOUR ATLAS',`<p style="color:var(--gold);font-size:11px">${p.country} · ${p.region} · ${coordinates(p)}</p><p>${p.fact}</p><p class="help-tip">지리 수첩에 새로운 항구가 기록됐어요.<br>발견 보상 <strong>+120 D</strong></p><button class="primary-button" id="discovery-quiz">지리 퀴즈에 도전 · +100 D</button><button class="service-button" id="discovery-close">항구 둘러보기 <span>→</span></button>`);$('#discovery-close').onclick=()=>modal.close();$('#discovery-quiz').onclick=()=>quiz(p);}
}

function quiz(p){
  if(!state.visited.includes(p.id)||state.quiz.includes(p.id))return;
  const alternatives=PORTS.map(q=>q.sea).filter((v,i,a)=>v!==p.sea&&a.indexOf(v)===i).slice(0,3),options=[p.sea,...alternatives].sort((a,b)=>a.localeCompare(b,'ko'));
  showModal(`${p.name}의 바다를 기억하나요?`,'GEOGRAPHY NOTEBOOK',`<p>${p.name} 항구는 ${p.country}에 있어요.<br>이 항구가 마주한 바다 또는 해역은 어디일까요?</p><div class="quiz-options">${options.map((o,i)=>`<button data-answer="${i}">${o}</button>`).join('')}</div><p class="modal-meta">정답 보상 100 D · 항구마다 한 번만 도전할 수 있어요.</p>`);
  $$('[data-answer]').forEach(b=>b.onclick=()=>{const correct=options[Number(b.dataset.answer)]===p.sea;state.quiz.push(p.id);if(correct){state.money+=100;log(`지리 퀴즈 정답: ${p.name} · ${p.sea}. +100 D`,'reward');bell();}else log(`지리 수첩: ${p.name}이 마주한 해역은 ${p.sea}입니다.`);showModal(correct?'정답! 항로를 하나 더 배웠어요.':'새로운 지식을 항해 수첩에.','GEOGRAPHY NOTEBOOK',`<p><strong style="color:var(--gold)">${p.name} → ${p.sea}</strong></p><p>${p.fact}</p><p>${correct?'보상 +100 D가 지급됐어요.':'다음 항구에서는 정답을 맞혀보세요.'}</p><button class="primary-button" id="quiz-close">다음 항해 준비하기</button>`);$('#quiz-close').onclick=()=>modal.close();changed();});
}
function showAtlas(){
  const riverPorts=PORTS.filter(p=>p.river).length;
  showModal('세계의 항구와 강','THE EXPLORER’S ATLAS',`<div class="atlas-summary"><span><b>${state.visited.length}<small>/ ${PORTS.length} 항구 발견</small></b></span><span><b>${nav?.rivers.length||9}<small>개 강 항로</small></b></span><span><b>${riverPorts}<small>강 항구</small></b></span></div><div class="atlas-search"><input id="atlas-search" type="search" aria-label="항구 검색" placeholder="항구 · 국가 · 강 이름 검색"><label><input id="river-only" type="checkbox">강 항구만</label></div><div class="atlas-grid" id="atlas-results"></div><p class="modal-meta">강의 대표 구간을 항해할 수 있어요. 해안선·강폭·입항 위치는 게임용으로 단순화했으며, 국가명은 현재 기준입니다.</p>`);
  const render=()=>{
    const q=$('#atlas-search').value.trim().toLocaleLowerCase(),riverOnly=$('#river-only').checked;
    const ports=PORTS.filter(p=>knowsPort(state,p.id)&&(!riverOnly||p.river)&&[p.name,p.en,p.country,p.region,p.sea,nav?.rivers.find(r=>r.id===p.river)?.name||''].join(' ').toLocaleLowerCase().includes(q));
    $('#atlas-results').innerHTML=ports.map(p=>`<button class="atlas-port ${state.visited.includes(p.id)?'':'unvisited'}" data-atlas="${p.id}"><strong>${state.visited.includes(p.id)?'⚑':'◇'} ${p.name}</strong><span>${p.country} · ${p.river?'강 항구 · '+p.sea:p.region}</span></button>`).join('')||'<p>검색한 항구가 없어요.</p>';
    $$('[data-atlas]').forEach(b=>b.onclick=()=>{modal.close();selectPort(b.dataset.atlas);const p=project([PORT_BY_ID[b.dataset.atlas].lon,PORT_BY_ID[b.dataset.atlas].lat]);[camera.x,camera.y]=p;followShip=false;applyCamera();});
  };
  $('#atlas-search').oninput=render;$('#river-only').onchange=render;render();
}
function showJournal(){showModal('파도 위에 남긴 기록','THE CAPTAIN’S JOURNAL',`<div class="atlas-summary"><span><b>${Math.floor(state.day)}<small>항해 일수</small></b></span><span><b>${state.trades}<small>거래 횟수</small></b></span><span><b>${fmt(state.profit)}<small>무역 이익 D</small></b></span></div>${state.log.map(l=>`<div class="log-entry"><time>${dateText(l.day,true)}</time><p>${l.text}</p></div>`).join('')}<p class="modal-meta">최근 50개의 기록이 보관됩니다. 게임은 이 브라우저에 자동 저장됩니다.</p>`);}
function showHelp(){showModal('당신만의 항로를 그려보세요','WELCOME ABOARD, CAPTAIN',`<p>바람을 따라 항구를 발견하고, 특산물을 거래하며<br>세계의 지리를 익히는 작은 항해 게임입니다.</p><div class="help-step"><b>01</b><div><h3>리스본의 와인을 화물창에 싣기</h3><p>교역소에서 와인을 구매하세요. 특산물은 다른 항구보다 저렴해요.</p></div></div><div class="help-step"><b>02</b><div><h3>지도에서 다음 항구 선택 → 출항</h3><p>첫 목적지는 가까운 세비야를 추천해요. 경로와 필요한 식량을 확인하고 출항하세요. 바다를 눌러 자유 항해도 할 수 있어요.</p></div></div><div class="help-step"><b>03</b><div><h3>판매하고, 발견하고, 더 멀리 나아가기</h3><p>도착한 항구에서 화물을 판매하세요. 새 항구 발견과 지리 퀴즈로 보상을 얻고 선박을 개량할 수 있어요.</p></div></div><p class="help-tip">자동 항해: 항구 선택 → 출항. 바다 항로를 따라 이동해요.<br>직접 조종: 바다 클릭 또는 방향키 ↑ ↓ ← →. ■ / 스페이스로 정지.<br>지구본 드래그: 회전 · 지구본 클릭: 해당 해도 보기<br>평면 해도는 고정 배율이에요. 드래그로 둘러보고 내 배 ↗로 돌아오세요.<br>강을 따라 18개 강 항구에 입항할 수 있어요. 좁은 강에서는 천천히 조종해요.<br>1/2/4: 배속 · 항구 찾기에서 이름과 강으로 검색</p><button class="primary-button" id="start-game">좋아, 항해를 시작하자 ${icon('ship')}</button><p class="modal-meta">지도: <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener">Natural Earth</a> (퍼블릭 도메인) · 국가명은 현재 기준. 해안선·강폭·입항 위치는 게임용으로 단순화했어요. 진행 상황은 브라우저에 자동 저장됩니다.</p><button class="reset-button" id="reset-btn">새 항해 시작 · 저장된 진행 초기화</button>`);$('#start-game').onclick=()=>{modal.close();storage.setItem('windward-intro-seen','1');};$('#reset-btn').onclick=()=>{showModal('새로운 항해를 시작할까요?','A FRESH START','<p>현재 화물, 두카트, 발견한 항구 기록이 초기화됩니다.</p><button class="primary-button" id="confirm-reset">초기화하고 리스본에서 시작</button><button class="service-button" id="cancel-reset">현재 항해 계속하기 <span>→</span></button>');$('#cancel-reset').onclick=()=>modal.close();$('#confirm-reset').onclick=()=>{if(account.uid){modal.close();showAccount();toast('기존 선장 기록을 남기고 접속 화면에서 새 이름으로 시작하세요.');return;}storage.setItem('windward-before-reset:'+Date.now(),JSON.stringify(state));stopManual();departedPort=null;state=initialState();exploration=new Exploration();exploration.seed(state);selected='lisbon';planned=null;paused=false;modal.close();setTab('trade');changed();renderFog(true);renderRoutes();centerShip();toast('이전 기록을 백업하고 리스본에서 시작합니다.');};};}

function followPosition(){const [x,y]=project(state.position),offset=innerWidth>850&&screen.w<850?80:0;camera.x=x+offset/screen.k;camera.y=y;}
function centerShip(){followPosition();followShip=!!state.voyage||state.controlMode==='manual';globe?.home();applyCamera();}
function stopManual(){manualTarget=null;manualChannel=null;manualActive=false;heldKeys.clear();paused=false;renderRoutes();renderHUD();save();}
function setControlMode(mode){
  if(state.controlMode===mode)return;
  stopManual();
  if(state.voyage){state.voyage=null;state.port=null;log('자동 항해를 멈추고 직접 조종으로 전환했습니다.');}
  state.controlMode=mode;planned=null;paused=false;renderRoutes();renderHUD();renderPanel();save();
  if(mode==='auto'&&selected&&selected!==state.port)planDestination(selected,[PORT_BY_ID[selected].lon,PORT_BY_ID[selected].lat],false);
}
function beginManual(){
  if(!playing||sessionBlocked||!nav||state.food<=0)return false;
  if(state.port){departedPort=state.port;state.position=[...portApproaches.get(state.port)];state.port=null;log('직접 조종으로 출항했습니다. 방향키나 바다 클릭으로 이동하세요.','sailing');renderPanel();}
  manualActive=true;paused=false;followShip=true;return true;
}
function startManual(point){
  if(!point||!nav)return;
  if(state.food<=0){toast('식량이 없어요. 항구에서 보급하거나 구조선을 불러주세요.','error');return;}
  if(!beginManual())return;manualTarget=[...point];const a=nav.riverAt(state.position),b=nav.riverAt(point);manualChannel=a&&b&&a.river.id===b.river.id?{...nav.route(state.position,point),travelled:0}:null;heldKeys.clear();centerShip();renderRoutes();renderHUD();save();
  if(innerWidth<=850)$('.chart').scrollIntoView({behavior:'smooth',block:'start'});
}
function stepManual(delta){
  const east=Number(heldKeys.has('ArrowRight'))-Number(heldKeys.has('ArrowLeft')),north=Number(heldKeys.has('ArrowUp'))-Number(heldKeys.has('ArrowDown'));
  if(!east&&!north&&!manualTarget){if(manualActive){manualActive=false;renderHUD();save();}return;}
  if(state.food<=0){stopManual();toast('식량이 떨어져 배가 멈췄어요. 구조선을 호출할 수 있어요.','error');renderPanel();return;}
  if(!manualActive&&!beginManual())return;
  if(east||north){manualTarget=null;manualChannel=null;}
  const onRiver=nav.riverAt(state.position),rate=onRiver?.river ? .18 : 1;
  const miles=Math.min(dailySpeed(state)*delta*.3*state.speed*rate,state.food/.9*dailySpeed(state));
  let next;if(manualChannel){manualChannel.travelled=Math.min(manualChannel.total,manualChannel.travelled+miles);next=positionAlong(manualChannel,manualChannel.travelled);}else next=east||north?helmStep(state.position,east,north,miles):helmToward(state.position,manualTarget,miles);
  if(!nav.clear(state.position,next)){stopManual();toast('해안에 닿았어요. 방향키로 바다 쪽을 향하거나 자동 항해를 이용하세요.');renderPanel();return;}
  const previous=[...state.position],moved=distance(state.position,next),days=moved/dailySpeed(state),a=project(state.position),b=project(next);
  let headingDx=b[0]-a[0];if(headingDx>800)headingDx-=1600;if(headingDx<-800)headingDx+=1600;manualAngle=Math.atan2(b[1]-a[1],headingDx)*180/Math.PI+90;
  state.position=next;state.day+=days;state.food=Math.max(0,state.food-days*.9);
  exploreMove(previous,next);
  if(followShip){followPosition();applyCamera();}else renderShip();
  const dock=dockAlong(nav,previous,next,portApproaches,departedPort);
  if(departedPort&&distance(next,portApproaches.get(departedPort))>(PORT_BY_ID[departedPort].river?5:10))departedPort=null;
  if(dock){arrive(dock.id);return;}
  if(manualTarget&&distance(next,manualTarget)<.1){const berth=dockAlong(nav,next,next,portApproaches,departedPort);if(berth){arrive(berth.id);return;}stopManual();}
  renderRoutes();
}
const world=$('#world-map');
world.addEventListener('pointerdown',e=>{if(e.button!==0)return;dragged=false;drag={x:e.clientX,y:e.clientY,cx:camera.x,cy:camera.y,id:e.pointerId};if(!e.target.closest('.port-marker'))world.setPointerCapture(e.pointerId);});
world.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>5)dragged=true;if(dragged){followShip=false;camera.x=Math.max(0,Math.min(1600,drag.cx-dx/screen.k));camera.y=Math.max(0,Math.min(800,drag.cy-dy/screen.k));applyCamera();}});
function endDrag(e){if(!drag)return;const didDrag=dragged;drag=null;if(world.hasPointerCapture(e.pointerId))world.releasePointerCapture(e.pointerId);if(didDrag){setTimeout(()=>dragged=false,0);return;}if(e.target.closest('.port-marker'))return;const rect=world.getBoundingClientRect(),point=unproject([(e.clientX-rect.left-screen.w/2)/screen.k+camera.x,(e.clientY-rect.top-screen.h/2)/screen.k+camera.y]);if(!nav)return;if(state.voyage){toast('직접 움직이려면 위에서 직접 조종 모드로 바꾸세요.');return;}if(nav.isLand(point)){toast('육지에는 배가 갈 수 없어요. 항구나 바다를 선택하세요.');return;}if(state.controlMode==='manual')startManual(point);else planDestination(null,point);}
world.addEventListener('pointerup',endDrag);world.addEventListener('pointercancel',()=>{drag=null;dragged=false;});
$('#home-map').onclick=centerShip;$('#ports-map').onclick=showAtlas;
$('#auto-mode').onclick=()=>setControlMode('auto');$('#manual-mode').onclick=()=>setControlMode('manual');
$('#manual-stop').onclick=stopManual;
$$('[data-direction]').forEach(button=>{button.onpointerdown=e=>{e.preventDefault();button.setPointerCapture(e.pointerId);if(!nav)return;setControlMode('manual');manualTarget=null;if(beginManual()){heldKeys.add(button.dataset.direction);renderHUD();}};button.onpointerup=()=>heldKeys.delete(button.dataset.direction);button.onpointercancel=()=>heldKeys.delete(button.dataset.direction);});
$('#minimap-home').onclick=centerShip;
$('#sail-btn').onclick=startVoyage;$('#trade-tab').onclick=()=>setTab('trade');$('#ship-tab').onclick=()=>setTab('ship');
$('#mobile-port-btn').onclick=()=>$('#port-panel').scrollIntoView({behavior:'smooth',block:'start'});
$('#help-btn').onclick=showHelp;$('#journal-btn').onclick=showJournal;$('#atlas-btn').onclick=showAtlas;
$('#map-tab').onclick=()=>{modal.close();$('.chart').scrollIntoView({behavior:'smooth'});};
$('#close-modal').onclick=()=>modal.close();modal.addEventListener('click',e=>{if(e.target===modal){const rect=modal.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)modal.close();}});
$('#pause-btn').onclick=()=>{paused=!paused;renderHUD();};
$$('[data-speed]').forEach(b=>b.onclick=()=>{state.speed=state.world==='real'?1:Number(b.dataset.speed);renderHUD();save();});
$('#sound-btn').onclick=()=>{sound=!sound;$('#sound-btn').innerHTML=`♬ <span>소리 ${sound?'켬':'끔'}</span>`;$('#sound-btn').setAttribute('aria-label',`항구 종소리 ${sound?'끄기':'켜기'}`);if(sound)bell();};
document.addEventListener('keydown',e=>{
  if(!playing||sessionBlocked||e.defaultPrevented||modal.open||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)||document.activeElement?.closest('.rank-card,.chat-panel,#entry-screen'))return;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();if(!nav||(e.repeat&&!heldKeys.has(e.key)))return;setControlMode('manual');manualTarget=null;if(beginManual()){heldKeys.add(e.key);renderHUD();}return;}
  if(e.code==='Space'&&(state.voyage||manualActive)){e.preventDefault();if(e.repeat)return;if(state.controlMode==='manual')stopManual();else{paused=!paused;renderHUD();}}
  if(['1','2','4'].includes(e.key)){state.speed=state.world==='real'?1:Number(e.key);renderHUD();save();}
});
document.addEventListener('keyup',e=>heldKeys.delete(e.key));
window.addEventListener('blur',()=>heldKeys.clear());
window.addEventListener('beforeunload',save);document.addEventListener('visibilitychange',()=>{if(document.hidden){heldKeys.clear();save();}});
new ResizeObserver(()=>{if(mapReady)resizeMap();}).observe($('.chart'));

let last=performance.now(),lastHud=0,lastSave=0;
function tick(now){
  const delta=Math.min((now-last)/1000,.1);last=now;
  state.speed=worldSpeed(state);
  if(playing&&!sessionBlocked&&state.voyage&&!paused&&!modal.open&&!document.hidden){
    const v=state.voyage,remaining=v.total-v.travelled,river=nav.riverAt(state.position),move=Math.min(remaining,dailySpeed(state)*delta*1.3*state.speed*(river?.river ? .18 : 1)),days=move/dailySpeed(state);
    const previous=[...state.position];v.travelled+=move;state.day+=days;state.food=Math.max(0,state.food-days*.9);v.foodRemaining=Math.max(0,v.foodRemaining-days*.9);state.position=positionAlong(v,v.travelled);exploreMove(previous,state.position);if(followShip){followPosition();applyCamera();}else renderShip();
    if(v.travelled>=v.total-.01)arrive();
    if(now-lastHud>150){renderHUD();lastHud=now;}if(now-lastSave>1800){save();lastSave=now;}
  }
  if(playing&&!sessionBlocked&&state.controlMode==='manual'&&!paused&&!modal.open&&!document.hidden){stepManual(delta);if(now-lastHud>150){renderHUD();lastHud=now;}if(manualActive&&now-lastSave>1500){save();lastSave=now;}}
  if(now-peerDrawTime>80&&fleet.peers.size){renderPeers();renderMinimap();peerDrawTime=now;}
  frame=requestAnimationFrame(tick);
}

setupInterface();renderHUD();renderMission();renderPanel();$('#latest-log').textContent=state.log[0]?.text||'당신의 항로를 시작하세요.';
$('#fleet-btn').onclick=showFleet;
$$('[data-rank]').forEach(button=>button.onclick=()=>{rankMetric=button.dataset.rank;renderRanks();});
$('#chat-toggle').onclick=()=>toggleChat();$('#chat-close').onclick=()=>toggleChat();
$('#chat-connection').onclick=async()=>{if(!account.ready){save();showEntry();return;}if(fleet.active&&!fleet.connected)await fleet.stop();fleet.start();try{storage.setItem('windward-fleet-enabled','1');}catch{}};
$('#chat-input').oninput=()=>$('#chat-count').textContent=`${$('#chat-input').value.length}/${CHAT_MAX_LENGTH}`;
$('#chat-input').onfocus=()=>heldKeys.clear();
$('#chat-panel').addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();toggleChat(false);}else if(e.target.id==='chat-input'&&e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();$('#chat-form').requestSubmit();}});
$('#chat-form').onsubmit=async e=>{e.preventDefault();const input=$('#chat-input'),draft=input.value,text=chatText(draft);$('#chat-send').disabled=true;input.disabled=true;$('#chat-status').textContent='전송 중…';const result=await chat.send(text);if(result.ok){if(input.value===draft){input.value='';$('#chat-count').textContent='0/200';}$('#chat-status').textContent='전송했어요 · 다음 메시지는 3초 뒤에';}else $('#chat-status').textContent=result.error;renderChatConnection();if(chatOpen&&!input.disabled)input.focus();};
renderRanks();renderChatConnection();
try{
  const responses=await Promise.all(['assets/world-land.geojson','assets/world-countries.geojson','assets/navigation.json','assets/rivers.json'].map(url=>fetch(url).then(r=>{if(!r.ok)throw Error('지도 데이터 오류');return r.json();})));
  nav=new Navigator(responses[2],responses[3]);PORTS.forEach(p=>portApproaches.set(p.id,nav.approach(p)));setupMap(responses[0],responses[1]);centerShip();requestAnimationFrame(tick);
  renderFleetStatus();showEntry();
  // Keep the first view playable; help is available through the ? button.
  try{if(!storage.getItem('windward-intro-seen')){toast('⚓ 환영합니다! 와인을 싣고 지도에서 다음 항구를 골라보세요.');storage.setItem('windward-intro-seen','1');}}catch{/* Sailing still works when browser storage is unavailable. */}
}catch(error){$('#map-loading').innerHTML='<p>지도를 불러오지 못했어요.</p><button class="primary-button" style="width:180px" onclick="location.reload()">다시 불러오기</button>';console.error(error);}
