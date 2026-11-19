import {equityEnabled,withdrawableCapital,equityRegistry,equityExpansionPlan} from './port-equity.js?v=2026.11.20-harbor-repairs';
import {initializePortEquity} from './equity-migration.js?v=2026.11.20-harbor-repairs';
import {noviceActive} from './novice.js?v=2026.11.20-harbor-repairs';
import {createHarborArena} from './harbor-arena.js?v=2026.11.20-harbor-repairs';
import {extraHarborRumor,harborOfficerRole,HARBOR_ROLE_LABEL,freeRecalledOfficer} from './harbor-officers.js?v=2026.11.20-harbor-repairs';
import {CONTESTED_PORTS,battleWindow,harborOperator,harborBattleAction,militiaAction,createHarborPractice,reconcileHarborLoss} from './harbor-battles.js?v=2026.11.20-harbor-repairs';
import {OFFICERS} from './rumor-catalog.js?v=2026.11.20-harbor-repairs';
import {returnReserve,reserveLoss} from './combat-core.js?v=2026.11.20-harbor-repairs';
import {PORTS,PORT_BY_ID,GOODS,DEPOT_BY_CANDIDATE,registerDevelopedPorts} from './data.js?v=2026.11.20-harbor-repairs';
import {DEVELOPMENT_SITES,COASTAL_ACTIVITY_SITES} from './coastal-sites.js?v=2026.11.20-harbor-repairs';
import {mapDistance} from './world-wrap.js?v=2026.11.20-harbor-repairs';
import {ship,fleetMaxHP,fleetShips} from './ship-rules.js?v=2026.11.20-harbor-repairs';
import {capacity,usedSpace,tradingPort} from './engine.js?v=2026.11.20-harbor-repairs';
import {tradeQuote,specialtyStock} from './market-rules.js?v=2026.11.20-harbor-repairs';
import {marketKind,invest,investmentWithdrawal,withdrawInvestment,portGrowth,portMarketItem,specialtyLimit,specialtyTradePort,growthDeliveryInfo,deliverForGrowth,assignHarborOfficer,delegateTradePreview,delegateGoods,openTradeFacility,portDevelopment,setPortDevelopment,ownership,taxRate,permitted,executeTrade,captainTradeQuote,changePortPolicy,withdrawTax,withdrawBasicIncome,investmentBase,NEUTRAL_PORTS} from './commerce.js?v=2026.11.20-harbor-repairs';
import {CANNONS,QUALITIES,cannonStats,buyCannon,equipCannon,upgradeCannon,sellCannon,gunWeight,currentHP} from './cannons.js?v=2026.11.20-harbor-repairs';
import {openTavernGame,playTavernGame} from './tavern-games.js?v=2026.11.20-harbor-repairs';
import {repairHull,coastalAction} from './activities.js?v=2026.11.20-harbor-repairs';
import {advanceBasicIncome,dividendRate,dividendsEnabled,estimateBasicIncome,pendingTradeTax,setIncomeOfficer} from './port-income.js?v=2026.11.20-harbor-repairs';
import {activeOfficer,saleBonusDetails} from './rumor-progress.js?v=2026.11.20-harbor-repairs';
const developmentCost=(game,level)=>Math.ceil([400000,200000,300000,160000][level]*(1-(activeOfficer(game)?.developmentDiscount||0)))-(level>0&&game.rumorProgress?.items?.I054?300:0);
function developmentLocation(game,site,nav){
 const distance=mapDistance(game.position,site.point);
 if(distance>10)return `개발 범위까지 ${Math.max(.1,distance-10).toFixed(1)}해리 더 접근하세요.`;
 if(game.voyage||game.shoreTrip||game.seaJob||game.raidId||game.battleId||game.npcBattle)return '항해나 진행 중인 활동을 마치고 배를 멈추세요.';
 if(!nav?.clear(game.position,site.point))return '후보지와 같은 물길로 접근하세요.';
 return '';
}
const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),fmt=n=>Number(n||0).toLocaleString('ko-KR');
const random=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296;
export function createBusiness(api){const account=api.account,get=api.getState,caches=new Map();let watched=null,watchStatus=null,watchVersion=0,stopWatch=null,tradeState=null,refreshing=false,pending=false,stopRegistry=null,registry={},registryTimer=null;
 const entry=document.createElement('button');entry.className='nav-item';entry.dataset.usageKey='action-open-business';entry.textContent='⚓ 항구 투자·활동';entry.onclick=()=>showHub();$('.main-nav').append(entry);
 const guns=document.createElement('button');guns.className='nav-item';guns.dataset.usageKey='action-open-guns';guns.textContent='✦ 대포·수리';guns.onclick=()=>showArmory();$('.main-nav').append(guns);
 function content(id){return caches.get(id)||{revision:0,content:{}};}
 function now(){return Date.now()+(account.serverOffset||0);}
 function observe(portId){
  portId=account.ready&&account.sdk?portId||null:null;
  if(watched===portId)return;
  const version=++watchVersion;
  stopWatch?.();
  stopWatch=null;
  watched=portId;
  watchStatus=portId?'pending':null;
  if(!portId)return;
  const s=account.sdk;
  stopWatch=s.onValue(s.ref(account.db,`gameV2/shared/${marketKind(portId)}/${portId}`),snap=>{
   if(version!==watchVersion)return;
   caches.set(portId,snap.val()||{revision:0,content:{}});
   if(caches.size>12)caches.delete(caches.keys().next().value);
   watchStatus='loaded';
   api.render();
  },()=>{
   if(version!==watchVersion)return;
   watchStatus='unknown';
   api.render();
  });
 }
 function tradeAccess(portId){
  if(!account.ready||!portId||watched!==portId)return null;
  if(watchStatus!=='loaded')return watchStatus;
  if(!navigator.onLine)return 'unknown';
  try{return permitted(content(portId).content,account.uid)?'allowed':'restricted';}
  catch{return 'unknown';}
 }
 function displayUnit(portId,id,sell=false){const c=content(portId);try{return tradeQuote(portId,id,1,sell?'sell':'buy',{...c.content.markets?.[id],revision:c.revision},now(),0).unit;}catch{return 0;}}
 function applyRegistry(){
   clearTimeout(registryTimer);
   const time=now(),added=registerDevelopedPorts(registry,time);
   if(added.length)api.onPorts(added);else api.render();
   const next=Math.min(...Object.values(registry).filter(entry=>entry?.kind==='depot'&&entry.opensAt>time).map(entry=>entry.opensAt));
   if(Number.isFinite(next))registryTimer=setTimeout(applyRegistry,Math.min(2147483647,next-time+25));
 }
 async function syncPorts(){
   if(!account.ready||!account.sdk)return;
   const s=account.sdk,path=s.ref(account.db,'gameV2/harborRegistry');
   const receive=snap=>{registry=snap.val()||{};applyRegistry();};
   if(!stopRegistry)stopRegistry=s.onValue(path,receive);
   receive(await s.get(path));
 }
 async function run(kind,key,fn,done){if(pending)return;pending=true;api.pause();try{await api.beforeService?.();const result=await account.atomicAction(kind,key,fn);api.changed();if(!result?.quiet)api.toast(result?.message||'처리 완료');if(result?.broken)api.rescue();await done?.(result);return result;}catch(e){api.toast(e.message,'error');if($('#business-result'))$('#business-result').textContent=e.message;}finally{pending=false;}}
 async function readPort(id,kind=marketKind(id)){const c=await account.readShared(kind,id);if(kind===marketKind(id))caches.set(id,c);return c;}
 async function trade(mode,id){if(pending)return;const p=specialtyTradePort(get(),id);if(!p)return api.toast('항구에 입항하세요.');api.pause();const order=tradeState={mode,id,port:p.id,kind:marketKind(p.id,id),qty:1};try{const shared=await readPort(p.id,order.kind),{content}=shared;if(order!==tradeState)return;order.shared=shared;if(!permitted(content,account.uid))return api.toast('이 항구에서는 현재 내 화물을 거래할 수 없어요.');paintTrade();}catch(e){if(order===tradeState)api.toast(e.message,'error');}}
 function paintTrade(){const t=tradeState;if(!t)return;const s=get(),p=PORT_BY_ID[t.port],c=t.shared||content(t.port),g=GOODS[t.id],item=portMarketItem(c.content,p.id,t.id,c.revision),max=t.mode==='sell'?s.cargo[t.id]?.qty||0:Math.max(0,Math.min(1000,capacity(s)-usedSpace(s),g.premium?specialtyStock(item,now(),item.specialtyLimit,item.specialtyPeriod).stock:Infinity));let q,error='';try{q=captainTradeQuote(s,p.id,t.id,t.qty,t.mode,item,now(),taxRate(c.content,account.uid,p.id,s));}catch(e){error=e.message;}
 api.modal(`${g.name} ${t.mode==='sell'?'판매':'구매'}`,`${p.name} · 현실 시간 공동 시세`,`<p>${t.mode==='sell'?'이번 판매는 전량 같은 단가로 정산합니다.':'이번 구매는 전량 같은 단가로 정산합니다.'}</p><label>수량 <input id="market-qty" type="number" min="1" max="${max}" value="${t.qty}" inputmode="numeric"></label><div class="dialog-actions trade-quantity-options">${[1,5,10,max].map(n=>`<button data-market-qty="${n}">${n===max?'최대':n}</button>`).join('')}</div><div id="market-quote">${q?`<p>현재 단가 ${fmt(q.unit)} D · ${t.qty}상자</p><p>상품 총액 ${fmt(q.gross)} D · 세금 ${fmt(q.tax)} D${q.noviceTax?' · 초보 선장 면세':''}${q.albumDiscount?' · 칭호 할인 '+fmt(q.albumDiscount)+' D':''}${q.bonus?' · 선장 보너스 +'+fmt(q.bonus)+' D':''}${q.blessing?' · 축복 +'+fmt(q.blessing)+' D':''}</p>${t.mode==='sell'?saleEffectMarkup(s,p.id,t.id,q):''}<h3>${t.mode==='sell'?'받는':'지불할'} 금액 ${fmt(q.total)} D</h3><p>다음 ${t.mode==='sell'?'판매':'구매'} 예상 단가 ${fmt(q.afterUnit)} D/상자 · 구매·판매 시세는 따로 변하고 현실 시간으로 회복</p>`:esc(error)}</div><button id="market-confirm" data-trade-mode="${t.mode}" class="primary-button" ${q&&max?'':'disabled'} >${q?`${esc(g.name)} ${fmt(t.qty)}상자 ${t.mode==='sell'?'판매':'구매'} · ${fmt(q.total)} D ${t.mode==='sell'?'받기':'지불'}`:t.mode==='sell'?'판매 확정':'구매 확정'}</button><p id="business-result" role="status">견적 유효 5초 · 시세가 달라지면 재확인합니다.</p>`,'small');
 const update=n=>{t.qty=Math.max(1,Math.min(max,Math.floor(n)||1));paintTrade();};$('#market-qty').onchange=e=>update(Number(e.target.value));document.querySelectorAll('[data-market-qty]').forEach(b=>b.onclick=()=>update(Number(b.dataset.marketQty)));
 $('#market-confirm').onclick=async()=>{const result=await run(t.kind,p.id,(game,c,time,revision)=>executeTrade(game,c,account.uid,p.id,t.id,t.qty,t.mode,q,time,revision));if(result){api.onTradeComplete?.(t.mode);t.shared=await readPort(p.id,t.kind);paintTrade();const first=api.getState().storyBook?.firstSale;
 if(first&&t.mode==='sell'&&p.id==='porto'&&t.id==='wine'&&result.total===first.total)$('#business-result').textContent='첫 판매 완료 · 매입액 '+fmt(first.cost)+' D · 수령 '+fmt(first.total)+' D · 손익 '+fmt(first.total-first.cost)+' D';
 else $('#business-result').textContent='거래 완료 · '+fmt(result.total)+' D';}else{try{t.shared=await readPort(p.id,t.kind);paintTrade();$('#business-result').textContent='새 견적을 확인한 뒤 다시 확정하세요.';}catch{}}};
 }
 function saleEffectMarkup(game,port,good,q){
  const d=saleBonusDetails(game,port,good),pct=n=>(n*100).toLocaleString('ko-KR',{maximumFractionDigits:2})+'%';
  return `<details class="trade-effect-details"><summary>효과 자세히 · 합산 ${pct(d.raw)} → 적용 ${pct(d.applied)}</summary><p>장비·부선장·칭호 합산 상한 3% · 세후 ${fmt(q.gross-q.tax)} D에 적용</p>${d.source.map(g=>`<p>${esc(g.name)} +${pct(g.rate)} · ${!g.eligible?'이 상품·항구에는 적용되지 않아요':g.contribution<1e-8?'최대 효과에 도달해 추가 증가 없음':'현재 조건의 추가 기여 '+pct(g.contribution)}</p>`).join('')}<p>이중 상자는 후추·정향·육두구에 적용돼요. 정수 미만 보너스는 버려져요. 거래 증서·축복은 별도로 계산해요.</p></details>`;
 }
 async function showHub(force=false){if(PORT_BY_ID[get().port]?.depot&&!force)return api.onDepot?.(get().port);if(!account.ready)return api.toast('로그인 뒤 이용하세요.');const p=tradingPort(get());try{if(p)await readPort(p.id);const s=get(),c=p?content(p.id).content:{},growthContent=p?.promotionLevel>=2?(await readPort(p.id,'ports')).content:c,own=ownership(c),my=c.investors?.[account.uid]||0,income=p?estimateBasicIncome(c,p.id,account.uid,own.ownerUid,now()):null;if(p&&own.ownerUid===account.uid)api.record?.(p,income,c.facilityInvested||0);api.modal('항구 투자와 항해 활동','지분 50% 초과 소유 · 기본 세율 0%',`${p?`<h3>${esc(p.name)}</h3><p>총 투자 ${fmt(own.total)} D${dividendsEnabled(p.id,now(),c)&&own.total?" · 항구 기본 세수 시간당 "+fmt(dividendRate(c,p.id).rate)+" D (+"+fmt(dividendRate(c,p.id).boost*100)+"%)":""} · 인출 가능한 현금 원금 ${fmt(withdrawableCapital(c,account.uid))} D${c.foundingValuation?' · 창립 평가 지분은 현금 인출 대상에서 제외':''} · 내 지분 ${own.total?(my/own.total*100).toFixed(2):'0'}%</p><p>${own.ownerUid===account.uid?'내 소유 항구':own.ownerUid?'소유 선장: '+esc(c.investorNames?.[own.ownerUid]||c.developerName||own.ownerUid.slice(0,8)):'공동 투자 · 소유자 없음'}</p><p>내 세율 ${taxRate(c,account.uid,p.id,s)}% · ${permitted(c,account.uid)?'교역 이용 가능':'교역 제한 · 필수 보급과 구조는 이용 가능'}</p>${NEUTRAL_PORTS.includes(p.id)?'<p>리스본·포르투는 중립 보장 항구입니다.</p>':p.developable&&!equityEnabled(c)?'<p>교역소 2단계부터 일반 지분 투자 가능</p>':`<label>추가 투자 D <input id="invest-amount" type="number" min="10000" step="10000" value="${own.total?10000:investmentBase(p.id)}"></label><button id="invest-port">투자 확정</button>${noviceActive(s)?'<small>투자로 과반 소유자가 되면 초보 보호를 졸업해요.</small>':''}${withdrawableCapital(c,account.uid)?'<button id="withdraw-investment">투자금 인출 · 20% 손실</button>':''}`}${own.ownerUid===account.uid?'<button id="manage-port">세율·블랙리스트 관리</button><button id="trade-request-inbox">거래 재개 요청함</button><button id="harbor-officer">부선장 상주·자동 교역</button>':''}<button id="withdraw-tax">미수령 세금 ${fmt(pendingTradeTax(c,account.uid))} D 인출</button>${income?.rate||income?.accrued?`<p>기본 세수 ${fmt(income.accrued)} D${income.rate?' · 시간당 '+fmt(income.rate)+' D · 72시간 한도':''}</p><button id="basic-income" ${income.canStart||income.accrued?'':'disabled'}>${income.canStart?'기본 세수 적립 시작':'기본 세수 수령'}</button>`:''}${own.ownerUid===account.uid&&activeOfficer(s)?.incomeBonus?'<button id="assign-income-officer">'+(s.incomeOfficerPort===p.id?'부선장 세수 배정 해제':'이 항구에 부선장 세수 배정')+'</button>':''}${harborOperator(c,now())===account.uid?'<button id="harbor-message">입항 공지 편집</button>':''}${specialtyMarkup(p,growthContent)}${growthMarkup(p,growthContent,c)}${domesticMarkup(p,c)}${CONTESTED_PORTS.includes(p.id)?'<button id="harbor-battle">항구 공방·사병</button>':''}`:'<p>현재 항구 밖입니다. 후보지로 접근한 뒤 정박·개발할 수 있어요.</p>'}<div class="dialog-actions"><button id="development-open">새 항구 개발</button><button id="coast-open">해안 활동</button></div><p id="business-result"></p>`,'medium');
 $('#withdraw-investment')?.addEventListener('click',()=>showWithdrawal(p,withdrawableCapital(c,account.uid))); $('#invest-port')?.addEventListener('click',()=>run(marketKind(p.id),p.id,(game,c,time)=>{const result=invest(game,c,account.uid,p.id,Number($('#invest-amount').value),time);c.investorNames??={};c.investorNames[account.uid]=account.name;return result;},()=>{api.onOwnership?.();return showHub(true);}));$('#harbor-battle')?.addEventListener('click',()=>showHarborBattle(p));$('#harbor-message')?.addEventListener('click',()=>showHarborMessage(p,c));$('#harbor-officer')?.addEventListener('click',()=>showHarborOfficer(p));$('#trade-request-inbox')?.addEventListener('click',()=>showTradeInbox(p));$('#manage-port')?.addEventListener('click',()=>managePort(p.id));$('#withdraw-tax')?.addEventListener('click',()=>run(marketKind(p.id),p.id,(game,c)=>withdrawTax(game,c,account.uid),showHub));$('#basic-income')?.addEventListener('click',()=>run(marketKind(p.id),p.id,(game,c,time)=>withdrawBasicIncome(game,c,account.uid,p.id,time),showHub));$('#assign-income-officer')?.addEventListener('click',()=>run(marketKind(p.id),p.id,(game,content,time)=>setIncomeOfficer(game,content,p.id,account.uid,ownership(content).ownerUid,time,game.incomeOfficerPort===p.id?0:Math.round((activeOfficer(game)?.incomeBonus||0)*10000)),showHub));document.querySelectorAll('[data-port-development]').forEach(b=>b.onclick=()=>run(marketKind(p.id),p.id,(game,content,time)=>setPortDevelopment(game,content,account.uid,p.id,b.dataset.portDevelopment,time),showHub));
if(p)bindGrowthDelivery(p,()=>showHub(true));document.querySelectorAll('[data-growth-buy]').forEach(b=>b.onclick=()=>trade('buy',b.dataset.growthBuy));$('#development-open').onclick=()=>showDevelopment();$('#coast-open').onclick=()=>showCoast();}catch(e){showHarborReadError(e,()=>showHub(force));}}
 function showWithdrawal(port,principal){
  const update=(amount,confirmed=false)=>{
   const snapshot=content(port.id);
   let quote=null;
   try{quote=investmentWithdrawal(snapshot.content,account.uid,amount);}catch{}
   const owner=quote?.ownerUid;
   const ownerName=owner===account.uid?'나':snapshot.content.investorNames?.[owner]||'다른 선장';
   const before=portGrowth(snapshot.content,port.id).stage;
   const after=quote?portGrowth({...snapshot.content,investors:quote.investors},port.id).stage:before;
   const growth=after===before?'':`<p>성장 ${before}단계에서 ${after}단계로 변경 · ${after?'특산품 최대 50상자':'특산품 신규 구매 중단'}</p>`;
   api.modal('투자금 인출',port.name,`<p>내 투자 원금 ${fmt(principal)} D · 인출액의 80%를 받습니다.</p><label>장부에서 차감할 금액 <input id="withdraw-amount" type="number" inputmode="numeric" min="1" max="${principal}" value="${amount}"></label><div class="dialog-actions"><button id="withdraw-all">전액</button><button id="withdraw-review">금액 확인</button><button id="withdraw-back">돌아가기</button></div>${confirmed&&quote?`<p>받을 금액 <strong>${fmt(quote.received)} D</strong> · 손실 ${fmt(quote.loss)} D</p><p>인출 후 내 지분 ${quote.share.toFixed(2)}% · 과반 소유자 ${esc(owner?ownerName:'없음')}</p>${growth}<button id="withdraw-confirm">인출 확정</button>`:confirmed?'<p>10,000 D 단위 또는 전액을 선택하세요.</p>':''}`,'small');
   $('#withdraw-back').onclick=()=>showHub(true);
   $('#withdraw-all').onclick=()=>update(principal,true);
   $('#withdraw-review').onclick=()=>update(Number($('#withdraw-amount').value),true);
   $('#withdraw-amount').oninput=()=>{const button=$('#withdraw-confirm');if(button)button.disabled=true;};
   if(confirmed&&quote)$('#withdraw-confirm').onclick=async()=>{
    const result=await run(marketKind(port.id),port.id,(game,c,time,revision)=>withdrawInvestment(game,c,account.uid,port.id,amount,time,revision,snapshot.revision),()=>{api.onOwnership?.();return showHub(true);});
    if(!result&&$('#withdraw-confirm')?.isConnected)await showHub();
   };
  };
  update(Math.min(principal,10000));
 }
 function showHarborMessage(port,c){
  api.modal('입항 공지 편집',port.name,`<label>입항한 선장에게 보이는 공지 <textarea id="harbor-message-body" maxlength="120">${esc(c.harborMessage?.text||'')}</textarea></label><button id="harbor-message-save">저장</button><p>빈 문구를 저장하면 공지를 내립니다.</p>`,'small');
  $('#harbor-message-save').onclick=()=>{
   const text=$('#harbor-message-body').value.trim();
   run('ports',port.id,(_game,content,time)=>{
    if(harborOperator(content,time)!==account.uid||text.length>120)throw Error('항구 소유권과 공지 길이를 확인하세요.');
    if(text)content.harborMessage={owner:account.uid,text,at:Math.floor(time)};else delete content.harborMessage;
    return {message:text?'입항 공지를 저장했어요.':'입항 공지를 내렸어요.'};
   },()=>showHub(true));
  };
 }
 function harborMessage(id){
  const c=content(id).content;
  return c.harborMessage?.owner===harborOperator(c,now())?c.harborMessage?.text:null;
 }
 const requestHours=3600000;
 const requestPath=(owner,port,sender='')=>`tradeRequests/${owner}/${port}${sender?'/'+sender:''}`;
 const requestRef=path=>account.sdk.ref(account.db,'gameV2/'+path);
 async function showTradeRequest(port){
  try{
   const {content:c}=await readPort(port.id),owner=ownership(c).ownerUid;
   if(!owner||permitted(c,account.uid))return api.toast('현재 이 항구에서 거래할 수 있어요.');
   const sdk=account.sdk,ref=requestRef(requestPath(owner,port.id,account.uid)),request=(await sdk.get(ref)).val(),time=now();
   const waiting=request?.status==='pending'&&time<request.at+48*requestHours;
   const retry=request?.status==='declined'?request.answeredAt+24*requestHours:request?.status==='pending'?request.at+72*requestHours:0;
   api.modal('거래 재개 요청',port.name,`<p>응답 기한 48시간 · 거절 또는 만료 후 24시간 뒤 다시 요청할 수 있어요.</p>${waiting?'<p>답변을 기다리고 있어요.</p>':time<retry?`<p>다음 요청 ${new Date(retry).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})}</p>`:'<label>요청 문구 <textarea id="trade-request-body" maxlength="300" rows="3"></textarea></label><button id="trade-request-send">요청 보내기</button>'}<p id="request-status" role="status"></p>`,'small');
   $('#trade-request-send')?.addEventListener('click',async event=>{
    const button=event.currentTarget,status=$('#request-status'),body=$('#trade-request-body').value.trim();
    if(!body||body.length>300){status.textContent='요청을 1~300자로 작성하세요.';return;}
    button.disabled=true;
    try{
     const fresh=(await readPort(port.id)).content;
     if(ownership(fresh).ownerUid!==owner||permitted(fresh,account.uid))throw Error('거래 상태가 바뀌었어요. 항구를 다시 확인해 주세요.');
     await sdk.set(ref,{name:account.name,body,status:'pending',at:sdk.serverTimestamp()});
     if(button.isConnected)await showTradeRequest(port);
    }catch(error){if(button.isConnected){status.textContent='요청을 저장하지 못했어요. 상태를 확인하고 다시 시도해 주세요.';button.disabled=false;}}
   });
  }catch(error){api.toast(error.message,'error');}
 }
 async function showTradeInbox(port){
  try{
   const {content:c}=await readPort(port.id);
   if(ownership(c).ownerUid!==account.uid)throw Error('항구 소유 선장만 요청함을 볼 수 있어요.');
   const owner=account.uid,sdk=account.sdk,requests=(await sdk.get(requestRef(requestPath(owner,port.id)))).val()||{};
   const rows=Object.entries(requests).filter(([,r])=>r.status==='pending'&&r.at+48*requestHours>now());
   api.modal('거래 재개 요청함',port.name,rows.map(([id,r])=>`<article><strong>${esc(r.name)}</strong><p>${esc(r.body)}</p><button data-request-accept="${esc(id)}">승인</button><button data-request-decline="${esc(id)}">거절</button></article>`).join('')||'<p>대기 중인 요청이 없어요.</p>','medium');
   for(const action of ['accept','decline'])document.querySelectorAll('[data-request-'+action+']').forEach(b=>b.onclick=()=>{
    const id=b.getAttribute('data-request-'+action),request=requests[id];
    return run('ports',port.id,(_game,content,time)=>{
     if(ownership(content).ownerUid!==owner||time>=request.at+48*requestHours)throw Error('현재 요청 또는 거래 정책 권한을 확인하세요.');
     if(action==='accept')content.blacklist=(content.blacklist||[]).filter(uid=>uid!==id);
     return {message:action==='accept'?'거래 제한을 해제했어요.':'요청을 거절했어요.',extras:{[requestPath(owner,port.id,id)]:{...request,status:action==='accept'?'accepted':'declined',answeredAt:sdk.serverTimestamp()}}};
    },()=>showTradeInbox(port));
   });
  }catch(error){api.toast(error.message,'error');}
 }
 async function managePort(id){
  const c=content(id).content,rates={...(c.rates||{})},blocked=new Set(c.blacklist||[]),people=new Map();let cursor=null,more=true,defaultRate=c.defaultRate||0;
  const paint=()=>{api.modal('항구 관리','선장 이름으로 지정 · 기본 세율 0~30%',`<label>기본 세율 % <input id="port-rate" type="number" min="0" max="30" value="${defaultRate}"></label><p>개별 세율이 ‘기본’이면 위의 기본 세율을 따릅니다. 교역 제한을 해도 입항·필수 보급·구조는 이용할 수 있어요.</p><div id="port-captains">${[...people].map(([uid,p])=>`<article class="port-captain-policy"><strong>${esc(p.name)}</strong><label>개별 세율 <select data-rate="${uid}"><option value="" ${rates[uid]===undefined?'selected':''}>기본</option>${Array.from({length:31},(_,n)=>`<option value="${n}" ${rates[uid]===n?'selected':''}>${n}%</option>`).join('')}</select></label><label><input type="checkbox" data-block="${uid}" ${blocked.has(uid)?'checked':''} ${uid===account.uid?'disabled':''}> 교역·선박 서비스 제한</label></article>`).join('')}</div><button id="more-port-captains" ${more?'':'disabled'}>선장 20명 더 불러오기</button><button id="save-policy" class="primary-button">설정 저장</button><p id="business-result"></p>`,'medium');
   document.querySelectorAll('[data-rate]').forEach(el=>el.onchange=()=>{if(el.value==='')delete rates[el.dataset.rate];else rates[el.dataset.rate]=Number(el.value);});document.querySelectorAll('[data-block]').forEach(el=>el.onchange=()=>{if(el.checked)blocked.add(el.dataset.block);else blocked.delete(el.dataset.block);});$('#more-port-captains').onclick=async()=>{defaultRate=Number($('#port-rate').value);await load();paint();};$('#save-policy').onclick=()=>run(marketKind(id),id,(_game,c)=>changePortPolicy(c,account.uid,Number($('#port-rate').value),rates,[...blocked]),showHub);
  };
  async function load(){try{const rows=await api.directory(cursor);for(const p of rows)people.set(p.id,p);cursor=rows.at(-1)?.id||cursor;more=rows.length===20;}catch{api.toast('선장 명부를 불러오지 못했어요.','error');more=false;}}
  for(const uid of new Set([...Object.keys(rates),...blocked]))people.set(uid,{name:c.investorNames?.[uid]||'선장 '+uid.slice(0,8)});await load();paint();
 }
 const arena=createHarborArena({account,modal:api.modal,state:get,now,online:()=>api.online?.()||[],run});
 async function showHarborBattle(port){
  try{
   const {content:c}=await readPort(port.id),uid=account.uid,t=now(),game=get(),m=game.militia||{};
   if(c.harborLosses?.[uid]){
    await run('ports',port.id,(state,content)=>reconcileHarborLoss(state,content,uid));
   }
   const operator=harborOperator(c,t),round=c.harborMatch,active=round?.state==='active'&&round.end>t,window=battleWindow(t);
   const control=(action,label,role='')=>`<button data-harbor-action="${action}" data-harbor-value="${role}">${label}</button>`;
   const troop=(action,label)=>`<button data-militia-action="${action}">${label}</button>`;
   api.modal('경합 항구 공방',port.name,`<p>매일 한국 시간 20~22시 · ${window.open?'신청 가능 시간':'공방 대기'}</p><p>현재 운영 ${esc(!operator?'없음':operator===uid?'나':c.harborOperator?.uid===operator?c.harborOperator.name:c.investorNames?.[operator]||'다른 선장')}</p>
   ${active?`<p>공격 선단 내구도 ${round.ship} · 포탑 ${round.fort} · 점령 진행 ${round.capture} · ${round.liveDefense?'직접 방어':'자동 포탑'}</p><p>종료 ${new Date(round.end).toLocaleTimeString('ko-KR',{timeZone:'Asia/Seoul'})}</p>`:'<p>공방 승자는 기간제 운영권을 얻습니다. 공개 경기에는 초보 보호를 졸업한 뒤 참가할 수 있어요.</p>'}
   <div class="dialog-actions">${active&&round.attacker===uid?control('attack','안쪽 항로','channel')+control('attack','바깥 항로','outer')+control('attack','포탑 포격','fire')+control('attack','점령 유지','hold'):!active&&window.open&&operator!==uid&&!noviceActive(game)?control('start','도전 시작'):round?.state==='active'&&!active?control('finish','시간 종료 처리'):''}
   ${operator===uid?control(active?'defend':'defense','안쪽 포탑','channel')+control(active?'defend':'defense','바깥 포탑','outer')+control(active?'defend':'defense','점령지 포탑','hold'):''}<button id="harbor-round-refresh">새로고침</button><button id="harbor-practice">포탑 상대 연습</button><button id="harbor-practice-friend">선장끼리 연습</button>${round?'<button id="harbor-arena-open">공방 해도·복귀</button>':''}</div>
   <h3>사병·선원</h3><p>대기 ${m.reserve||0}명 · 선단 호위 ${m.escort||0}명 · 이 항구 주둔 ${m.posts?.[port.id]||0}명</p><p>고용비 1명 100 D · 한국 시간 하루 10명 · 총 보유 30명</p><label>인원 <input id="militia-qty" type="number" min="1" max="10" value="5"></label><div class="dialog-actions">${troop('hire','고용')}${troop('escort','호위 배치')}${troop('reserve','호위 해제')}${troop('station','주둔')}${troop('recall','주둔 해제')}${troop('train',m.trainingDue?'훈련 확인':'선원 훈련 · 2,000 D')}</div>`,'wide');
   $('#harbor-round-refresh').onclick=()=>showHarborBattle(port);
   $('#harbor-practice').onclick=()=>showHarborPractice(port,createHarborPractice(port,account.name,now()));
   $('#harbor-practice-friend').onclick=()=>arena.open(port,true,()=>showHarborBattle(port));
   $('#harbor-arena-open')?.addEventListener('click',()=>arena.open(port,false,()=>showHarborBattle(port)));
   document.querySelectorAll('[data-harbor-action]').forEach(b=>b.onclick=()=>run('ports',port.id,(state,content,time)=>harborBattleAction(state,content,uid,port.id,b.dataset.harborAction,b.dataset.harborValue,time,account.name),()=>b.dataset.harborAction==='start'?arena.open(port,false,()=>showHarborBattle(port)):showHarborBattle(port)));
   document.querySelectorAll('[data-militia-action]').forEach(b=>b.onclick=()=>{
    const qty=Number($('#militia-qty').value);
    run('ports',port.id,(state,content,time)=>militiaAction(state,content,uid,port.id,b.dataset.militiaAction,qty,time),()=>showHarborBattle(port));
   });
  }catch(error){api.toast(error.message,'error');}
 }
 function showHarborPractice(port,practice,message=''){
  const round=practice.open();
  const actions=[['channel','안쪽 항로'],['outer','바깥 항로'],['fire','포탑 포격'],['hold','점령 유지']];
  api.modal('항구 공방 연습',port.name,`<p>연습 상대는 자동 포탑입니다. 연습용 호위 5명 · 행동 간격 5초</p><p>내 선단 내구도 ${round.ship} · 포탑 ${round.fort} · 점령 진행 ${round.capture}</p>${round.state==='active'?actions.map(([id,label])=>`<button data-harbor-practice="${id}">${label}</button>`).join(''):''}<p role="status" id="harbor-practice-result">${esc(message)}</p><button id="harbor-practice-back">공방으로 돌아가기</button>`,'medium');
  $('#harbor-practice-back').onclick=()=>showHarborBattle(port);
  document.querySelectorAll('[data-harbor-practice]').forEach(button=>button.onclick=()=>{
   try{
    practice.act(button.dataset.harborPractice,now());
    const result=practice.open();
    showHarborPractice(port,practice,result.state==='won'?'연습 승리':result.state==='defended'?'연습 종료 · 방어 성공':'');
   }catch(error){$('#harbor-practice-result').textContent=error.message;}
  });
 }
 async function showHarborOfficer(port){
  try{
   const {content:c}=await readPort(port.id),game=get(),uid=account.uid;
   if(ownership(c).ownerUid!==uid)throw Error('현재 항구 소유권을 확인하세요.');
   const suspended=c.harborOperator?.until>now()&&c.harborOperator.uid!==uid;
   const officer=c.harborOfficer?.owner===uid?c.harborOfficer.id:null;
   const current=game.delegateTrade?.origin===port.id?game.delegateTrade:null;
   const selected=new Set(Object.entries(game.harborOfficers||{}).filter(([id])=>id!==port.id).map(([,id])=>id));
   const roster=OFFICERS.filter(row=>game.rumorProgress?.officers?.includes(row.id)&&!selected.has(row.id));
   const ports=PORTS.filter(row=>row.id!==port.id&&openTradeFacility(row)&&game.visited.includes(row.id));
   const goods=delegateGoods(port,now()),facility=openTradeFacility(port),unavailable=current&&!goods.includes(current.good);
   const kind=marketKind(port.id);
   const ready=current&&now()>=current.due;
   api.modal('부선장 상주·자동 교역',port.name,`<p>상주 중인 부선장은 승선할 수 없어요.${officer?' · '+esc(HARBOR_ROLE_LABEL[c.harborOfficer?.role||harborOfficerRole(officer)]):''}</p>${suspended?'<p>기간제 운영 중이라 상주 효과와 가상 교역을 일시 정지했어요. 기존 부선장은 회수할 수 있어요.</p>':''}<label>부선장 <select id="harbor-officer-id"><option value="">배치 해제</option>${roster.map(row=>`<option value="${row.id}" ${row.id===officer?'selected':''}>${esc(row.name)} · ${esc(HARBOR_ROLE_LABEL[harborOfficerRole(row.id)])}</option>`).join('')}</select></label><button id="harbor-officer-save">배치 변경</button>${officer&&!suspended&&!facility?'<p class="help-tip">교역소 2단계부터 자동 교역 가능</p>':officer&&!suspended?`<hr><h3>가상 교역 한 항로</h3><p>현실 4시간마다 · 최대 100상자 · 이익의 10% 수수료</p>${current?`<p>${esc(PORT_BY_ID[current.destination]?.name)} · ${esc(GOODS[current.good]?.name)} ${current.qty}상자 · ${unavailable?'이번 시대에 매입 불가':ready?'정산 가능':'다음 정산 '+new Date(current.due).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})}</p><button id="delegate-settle" ${ready&&!unavailable?'':'disabled'}>조회 시점 시세로 정산</button>${unavailable?'<button id="delegate-change">품목 변경</button>':''}<button id="delegate-cancel">항로 중지</button>`:`<label>상대 항구 <select id="delegate-destination">${ports.map(row=>`<option value="${row.id}">${esc(row.name)}</option>`).join('')}</select></label><label>품목 <select id="delegate-good">${goods.map(id=>`<option value="${id}">${esc(GOODS[id].name)}</option>`).join('')}</select></label><label>수량 <input id="delegate-qty" type="number" min="1" max="100" value="10"></label><label>매입 예산 <input id="delegate-budget" type="number" min="1" value="10000"></label><button id="delegate-start" ${ports.length&&goods.length&&!game.delegateTrade?'':'disabled'}>항로 설정</button>${!ports.length?'<p>방문한 항구 중 교역소가 열린 목적지가 없어요.</p>':!goods.length?'<p>이 시대에 매입할 일반 교역품이 없어요.</p>':''}`}`:''}`,'medium');
   $('#harbor-officer-save').onclick=()=>{
    const id=$('#harbor-officer-id').value;
    run(kind,port.id,(state,c,time)=>assignHarborOfficer(state,c,uid,port.id,id,time),()=>showHarborOfficer(port));
   };
   $('#delegate-start')?.addEventListener('click',async()=>{
    const destination=PORT_BY_ID[$('#delegate-destination').value];
    const route={origin:port.id,destination:destination?.id,good:$('#delegate-good').value,qty:Number($('#delegate-qty').value),budget:Number($('#delegate-budget').value),officer};
    if(!destination)return;
    try{
     const other=await account.readShared(marketKind(destination.id),destination.id);
     const estimate=delegateTradePreview(game,uid,port,destination,c,other.content,route,now());
     if(!api.nav()?.route([port.lon,port.lat],[destination.lon,destination.lat],{maxOffshore:Infinity}))throw Error('두 항구를 잇는 바닷길을 확인하세요.');
     if(!estimate.affordable)throw Error('현재 예상 매입액이 예산 또는 보유금보다 높아요.');
     await run(kind,port.id,(state,live,time)=>{
      if(state.delegateTrade||state.port!==port.id||ownership(live).ownerUid!==uid||live.harborOfficer?.id!==officer)throw Error('현재 소유권과 부선장을 확인하세요.');
      delegateTradePreview(state,uid,port,destination,live,other.content,route,time);
      state.delegateTrade={...route,due:time+14400000};
      return {message:'자동 교역 시작 · 현재 예상 순수익 '+fmt(estimate.net)+' D'};
     },()=>showHarborOfficer(port));
    }catch(error){api.toast(error.message,'error');}
   });
   const cancelDelegate=()=>run('personal',uid,state=>{
    if(state.delegateTrade?.origin!==port.id)throw Error('교역 항로를 다시 확인하세요.');
    delete state.delegateTrade;return {message:'자동 교역 중지'};
   },()=>showHarborOfficer(port));
   $('#delegate-cancel')?.addEventListener('click',cancelDelegate);
   $('#delegate-change')?.addEventListener('click',cancelDelegate);
   $('#delegate-settle')?.addEventListener('click',async()=>{
    const destination=PORT_BY_ID[current.destination];
    try{
     if(!destination)throw Error('교역 상대 항구를 다시 선택해 주세요.');
     const other=await account.readShared(marketKind(destination.id),destination.id);
     await run(kind,port.id,(state,live,time)=>{
      const route=state.delegateTrade;
      if(!route||route.due!==current.due||time<route.due||ownership(live).ownerUid!==uid||live.harborOperator?.until>time&&live.harborOperator.uid!==uid||live.harborOfficer?.id!==route.officer)throw Error('현재 항로와 정산 시각을 확인하세요.');
      const result=delegateTradePreview(state,uid,port,destination,live,other.content,route,time);
      route.due=time+14400000;
      if(!result.affordable||result.net<=0||state.money+result.net>1e12)return {message:'수익 또는 예산 조건이 맞지 않아 이번 회차를 건너뛰었어요.'};
      state.money+=result.net;
      return {message:'가상 교역 순수익 '+fmt(result.net)+' D 수령'};
     },()=>showHarborOfficer(port));
    }catch(error){api.toast(error.message,'error');}
   });
  }catch(error){api.toast(error.message,'error');}
 }
 function domesticMarkup(port,c){
  if(portGrowth(c,port.id).stage!==2)return '';
  const names={tourism:'관광',production:'생산',trade:'무역'},current=portDevelopment(c,port.id);
  const own=ownership(c).ownerUid===account.uid,due=(c.domestic?.at||0)+86400000;
  return `<h3>도시 내정</h3><p>현재 ${names[current]||'미설정'}${own&&due>now()?' · 다음 변경 '+new Date(due).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}):''}</p>${own?Object.entries(names).map(([kind,name])=>`<button data-port-development="${kind}" ${due>now()||kind===current?'disabled':''}>${name}</button>`).join(''):''}`;
 }
 function bindGrowthDelivery(port,refresh){
  $('#growth-deliver')?.addEventListener('click',event=>{
   const day=Number(event.currentTarget.dataset.day);
   run('ports',port.id,async(game,c,time)=>{
    const policy=port.promotionLevel>=2?(await account.readShared('projects',port.id)).content:c;
    if(!permitted(policy,account.uid))throw Error('이 항구의 공용 납품이 제한됐어요.');
    return deliverForGrowth(game,c,account.uid,port.id,time,day,policy);
   },refresh);
  });
 }
 function growthMarkup(port,c,policy=c){
  const order=growthDeliveryInfo(c,port.id,now(),account.uid);
  if(!order)return '';
  const growth=portGrowth(c,port.id);
  const progress=growth.community?`공용 납품 ${fmt(growth.contribution)}/300상자`:`투자 ${fmt(growth.total)} D · 납품 기여 ${fmt(growth.contribution)}`;
  const held=get().cargo[order.good]?.qty||0;
  const reason=growth.community&&growth.contribution>=300?'공용 납품 300상자를 모두 채웠어요.':order.done?'오늘 납품을 마쳤어요. 한국 시간 자정부터 다시 가능해요.':get().port!==port.id||get().voyage?'이 항구에 정박하세요.':!permitted(policy,account.uid)?'이 항구의 납품이 제한됐어요.':held<order.quantity?'선박 화물 '+held+'/'+order.quantity+'상자 · '+(order.quantity-held)+'상자 더 필요해요.':'';
  return `<h3>조합 성장 납품</h3><p>${progress} · 성장 ${growth.stage}단계</p><p>${esc(GOODS[order.good].name)} ${order.quantity}상자 · 보수 ${fmt(order.reward)} D · 기여 +${fmt(order.points)} · 한국 시간 자정까지</p><button id="growth-deliver" data-day="${order.day}" ${reason?'disabled':''}>${order.done?(growth.community&&growth.stage===2?'성장 완료':'오늘 납품 완료'):'성장 물품 납품'}</button>${reason?'<p>'+reason+'</p>':''}`;
 }
 async function showDepotMarket(id){
  const port=PORT_BY_ID[id];
  if(!port?.active||!port.depot||get().port!==id||get().voyage)return api.toast('공동 보급항에 정박하세요.');
  try{
   const {content}=await readPort(id,'ports');
   const policy=port.promotionLevel>=2?(await readPort(id,'projects')).content:content;
   api.modal('특산품·공용 납품',port.name,`<p>${port.promotionLevel?port.promotionLevel+'단계 항구':'공동 보급항'}</p>${specialtyMarkup(port,content)}${growthMarkup(port,content,policy)}<button id="depot-market-back">공동 창고로 돌아가기</button><p id="business-result" role="status"></p>`,'medium');
   $('#depot-market-back').onclick=()=>api.onDepot?.(id);
   bindGrowthDelivery(port,()=>showDepotMarket(id));
   document.querySelectorAll('[data-growth-buy]').forEach(b=>{b.onclick=()=>trade('buy',b.dataset.growthBuy);});
  }catch(error){showHarborReadError(error,()=>showDepotMarket(id));}
 }
 function showHarborReadError(error,retry){
  api.modal('항구 정보 확인','연결 상태','<p>'+esc(error.message)+'</p><button id="harbor-retry">다시 불러오기</button>','small');
  $('#harbor-retry').onclick=retry;
 }
 async function showDepotTaxPolicy(id){
  try{
   const {content}=await readPort(id,'projects');
   if(content.registeredOwner!==account.uid||!(content.promotion?.level>=2)||get().port!==id)return api.toast('교역소를 운영하는 과반 지분 선장만 세율을 바꿀 수 있어요.');
   api.modal('교역 세율 관리',PORT_BY_ID[id].name,`<label>기본 세율 (%) <input id="depot-tax-rate" type="number" min="0" max="30" step="1" value="${content.defaultRate||0}"></label>
    <p>교역 세금은 기존 투자 지분에 따라 나눠요. 초보 선장 면세를 적용해요.</p><button id="depot-tax-save">세율 저장</button><p id="business-result" role="status"></p>`,'small');
   $('#depot-tax-save').onclick=()=>{
    const rate=$('#depot-tax-rate').valueAsNumber;
    return run('projects',id,(game,c)=>{
     if(game.port!==id||game.voyage||!(c.promotion?.level>=2)||c.registeredOwner!==account.uid)throw Error('운영 권한과 정박 상태를 확인하세요.');
     if(!Number.isInteger(rate)||rate<0||rate>30)throw Error('0~30% 사이의 정수를 입력하세요.');
     c.defaultRate=rate;
     return {message:'교역 세율을 저장했어요.'};
    },()=>api.onDepot?.(id));
   };
  }catch(error){api.toast(error.message,'error');}
 }
 function specialtyMarkup(port,c){
  const {stage,next,community,facility}=portGrowth(c,port.id);
  return Object.entries(GOODS).filter(([,good])=>good.premium&&good.source===port.id).map(([id,good])=>{
   const limit=specialtyLimit(good,stage);
   if(!limit)return `<p><strong>${esc(good.name)}</strong> · ${community?'공용 납품 '+fmt(next)+'상자 남음':facility?'교역소 2단계에서 해금':good.unlockStage===2?'항구 성장 2단계에서 해금':'특산품 해금까지 '+fmt(next)+' D'}</p>`;
   const stock=specialtyStock(c.markets?.[id],now(),limit,portDevelopment(c,port.id)==='production'?6000000:undefined).stock;
   return `<p><strong>${esc(good.name)}</strong> · 재고 ${stock}/${limit}상자</p><button data-growth-buy="${id}" ${stock>=30&&permitted(c,account.uid)?'':'disabled'}>특산품 구매 · 재고 30상자 이상</button>`;
  }).join('');
 }
 async function showDevelopment(){
  try{await syncPorts();}
  catch{api.toast('항구 개발 기록을 불러오지 못했어요. 다시 열어 주세요.','error');return;}
  const game=get(),nav=api.nav();
  const rows=DEVELOPMENT_SITES.slice().sort((a,b)=>mapDistance(game.position,a.point)-mapDistance(game.position,b.point));
  api.modal('새 항구 개발','정식 항구 후보지 · 개발 범위 10해리',rows.map(site=>{
   const depot=DEPOT_BY_CANDIDATE[site.portId],paired=PORT_BY_ID[depot?.id];
   const distance=mapDistance(game.position,site.point),converted=!!paired?.promotionLevel;
   const level=PORT_BY_ID[site.portId]?.developmentLevel||0;
   const error=converted?'공동보급항이 정식 항구로 승격됐어요.':developmentLocation(game,site,nav);
   return `<article class="harbor-development-row"><div><h3>${esc(site.name)} 정식 항구${level?'':' 후보지'}</h3>
    <p>${distance.toFixed(1)}해리 · ${converted?'승격 완료':level?'개발 '+level+'단계':'개척 '+fmt(developmentCost(game,0))+' D'}${paired?.active&&!converted?' · 인근 공동보급항 운영 중':''}</p>
    <p class="harbor-development-status">${error||'현재 위치에서 개발할 수 있어요.'}</p></div>
    <div class="harbor-development-actions"><button data-look="${site.id}">지도에서 보기</button><button data-develop="${site.id}" ${error?'disabled':''}>${level?'확장 확인':'개발 확인'}</button></div></article>`;
  }).join('')+'<p id="business-result" role="status"></p>','wide');
  document.querySelectorAll('[data-look]').forEach(button=>button.onclick=()=>{
   const site=rows.find(row=>row.id===button.dataset.look),depot=DEPOT_BY_CANDIDATE[site.portId];
   if(PORT_BY_ID[depot?.id]?.promotionLevel)return api.look(depot.point,PORT_BY_ID[depot.id].name);
   api.look(site.point,`${site.name} ${PORT_BY_ID[site.portId]?.active?'정식 항구':'정식 항구 후보지'}`);
  });
  document.querySelectorAll('[data-develop]').forEach(button=>button.onclick=async()=>{
   button.disabled=true;
   try{await develop(rows.find(row=>row.id===button.dataset.develop));}
   catch(error){const status=$('#business-result');if(status)status.textContent=error.message;api.toast(error.message,'error');}
   finally{if(button.isConnected)button.disabled=false;}
  });
 }
 async function develop(site){
  const source=$('#business-result');
  const {content}=await readPort(site.portId);
  if(!source?.isConnected||!source.closest('dialog')?.open)return;
  const game=get(),level=content.development?.level||0;
  const expansion=equityExpansionPlan(content,account.uid);
  const canExpand=equityEnabled(content)?expansion.canConfirm:content.developedOwner===account.uid;
  const advanced=level===3&&!content.advancedSupply&&canExpand&&!!game.rumorProgress?.items?.I056;
  const title=['항구 개척','교역소 확장','조선소 확장','고급 보급 창고'][level],cost=developmentCost(game,level);
  const error=developmentLocation(game,site,api.nav())||
   (content.developedOwner&&!canExpand?'현재 과반 소유자 또는 과반 지분 동의가 필요해요.':
    level===3&&!advanced?(content.advancedSupply?'모든 확장을 완료했어요.':'고급 보급 창고 증서가 필요해요.'):
    game.money<cost?'개발에 필요한 두카트가 부족해요.':'');
  api.modal('항구 개발·확장',site.name,`<p>현재 ${level?level+'단계':'미개발'} · ${title}</p>
   <div class="harbor-cost"><span>실제 결제액</span><strong>${fmt(cost)} D</strong><small>기본 비용 ${fmt(developmentCost({},level))} D · 보유 ${fmt(game.money)} D</small></div>
   <label>항구 이름 <input id="development-name" maxlength="16" value="${esc(content.development?.name||site.name)}"></label>
   ${level===0&&noviceActive(game)?'<p class="help-tip">항구를 처음 소유하면 초보 보호를 졸업해요.</p>':''}
   <div class="harbor-development-actions"><button id="development-back">후보 목록</button><button id="development-confirm" class="primary-button" ${error?'disabled':''}>개발 확정</button></div>
   ${equityEnabled(content)&&content.investors?.[account.uid]?`<button id="development-vote">${expansion.voted?'공사 동의 철회':'공사에 동의'}</button><p>동의 지분 ${expansion.total?(expansion.support*100/expansion.total).toFixed(2):0}% · 지분 변경 시 재동의</p>`:''}<p id="business-result" role="status">${error}</p>`,'small');
  $('#development-back').onclick=showDevelopment;
  $('#development-vote')?.addEventListener('click',()=>run('ports',site.portId,(state,c)=>{
   if(!equityEnabled(c)||!c.investors?.[account.uid]||state.port!==site.portId||state.voyage)throw Error('투자한 이 항구에 정박하세요.');
   const v=equityExpansionPlan(c,account.uid);c.equityExpansionVotes??={};if(v.voted)delete c.equityExpansionVotes[account.uid];else c.equityExpansionVotes[account.uid]=v.revision;
   return {message:'공사 동의 설정 완료'};
  },()=>develop(site)));
  const confirm=$('#development-confirm');
  confirm.onclick=async()=>{
   const name=$('#development-name').value.trim();
   confirm.disabled=true;
   const result=await run('ports',site.portId,(currentGame,c,time)=>{
    const blocked=developmentLocation(currentGame,site,api.nav());
    if(blocked)throw Error(blocked);
    const depot=DEPOT_BY_CANDIDATE[site.portId];
    if(PORT_BY_ID[depot?.id]?.promotionLevel)throw Error('공동보급항이 정식 항구로 승격됐어요.');
    const current=c.development?.level||0;
    if(current!==level||current>=3&&(!advanced||c.advancedSupply||!currentGame.rumorProgress?.items?.I056)||(equityEnabled(c)?!equityExpansionPlan(c,account.uid).canConfirm:c.developedOwner&&c.developedOwner!==account.uid))throw Error('개발 상태나 소유권이 바뀌었어요. 후보 목록에서 다시 확인하세요.');
    if(name.length<2||name.length>16||/[<>\u0000-\u001f]/.test(name))throw Error('항구 이름은 2~16자로 입력하세요.');
    if(developmentCost(currentGame,current)!==cost)throw Error('개발 비용이 바뀌었어요. 후보 목록에서 새 금액을 확인하세요.');
    if(currentGame.money<cost)throw Error('개발할 두카트가 부족해요.');
    advanceBasicIncome(c,site.portId,ownership(c).ownerUid,time);
    currentGame.money-=cost;
    if(!current)c.foundingPaid=cost;
    if(current>0&&currentGame.rumorProgress?.items?.I054)currentGame.rumorProgress.items.I054--;
    c.facilityInvested=(c.facilityInvested||0)+cost;
    if(current===3){c.advancedSupply=true;advanceBasicIncome(c,site.portId,ownership(c).ownerUid,time);return {message:'고급 보급 창고 확장 완료 · 기본 세수 +500 D/시간'};}
    currentGame.developedPorts=[...new Set([...(currentGame.developedPorts||[]),site.portId])];
    if(!c.developedOwner)c.ownerSince=time;
    if(!c.developedOwner){c.developedOwner=account.uid;c.developerName=account.name;}c.development={name,level:current+1};
    initializePortEquity(c,site.portId,time);
    c.equityExpansionVotes={};
    advanceBasicIncome(c,site.portId,ownership(c).ownerUid,time);
    currentGame.knownPorts=[...new Set([...currentGame.knownPorts,site.portId])];
    return {message:'항구 개발 완료',registry:equityEnabled(c)?equityRegistry(site.portId,c):{id:site.portId,name,level:current+1,ownerUid:account.uid}};
   },async()=>{
    await syncPorts();api.onOwnership?.();
    if(level===1){
     api.modal('교역소 확장 완료',name,'<p>2단계 교역소와 지분 투자를 이용할 수 있어요.</p><button id="expanded-market">교역소 열기</button> <button id="expanded-equity">지분 투자</button>','small');
     $('#expanded-market').onclick=()=>api.onMarket?.(site.portId);
     $('#expanded-equity').onclick=()=>showHub(true);
     return;
    }
    if(level!==0)return showHub(true);
    api.modal('항구 개발 완료',name,'<p>해도에 등록했어요. 지도에서 항구를 선택해 입항하세요.</p><button id="developed-look">새 항구 지도에서 보기</button>','small');
    $('#developed-look').onclick=()=>api.look(site.point,name);
   });
   if(!result&&confirm.isConnected)confirm.disabled=false;
  };
 }
 function showCoast(){const s=get();api.modal('항구 밖 해안 정박','실패 시 파손·현금·화물 손실',COASTAL_ACTIVITY_SITES.map(site=>`<article class="investigation-row"><h3>${esc(site.name)} · ${fmt(mapDistance(s.position,site.point))}해리</h3><button data-coast-look="${site.id}">지도 보기</button><button data-coast="${site.id}" data-action="supply" ${s.port||s.voyage||mapDistance(s.position,site.point)>10?'disabled':''}>보급 · 최대 2일 / 항구가 1.5배</button><button data-coast="${site.id}" data-action="raid" ${s.port||s.voyage||mapDistance(s.position,site.point)>10?'disabled':''}>약탈 시도 · 보급 0.2일</button></article>`).join('')+'<p>약탈 성공 70%·200 D. 실패 시 최대 HP 15% 피해, 돈 5%(최대 500 D), 교역품 5%(최대 3상자) 손실. 하루 3회. 보급은 지점별 24시간 간격.</p><p id="business-result"></p>','wide');document.querySelectorAll('[data-coast-look]').forEach(b=>b.onclick=()=>api.look(COASTAL_ACTIVITY_SITES.find(p=>p.id===b.dataset.coastLook).point));document.querySelectorAll('[data-coast]').forEach(b=>b.onclick=()=>{const site=COASTAL_ACTIVITY_SITES.find(p=>p.id===b.dataset.coast);run('personal',account.uid,(game,_c,time)=>{if(!api.nav().clear(game.position,site.point))throw Error('같은 바닷길에서 접근하세요.');const had=!!game.battleReserve;if(had)returnReserve(game);const result=coastalAction(game,site,b.dataset.action,time,random());if(had)result.extras={['combatVaults/'+account.uid]:result.broken?null:reserveLoss(game,crypto.randomUUID())};return result;},showCoast);});}
 function showTavernGame(port){
  openTavernGame({game:get,modal:api.modal,toast:api.toast,portName:id=>PORT_BY_ID[id]?.name||id,
   play:(id,choice,bet,round,done)=>run('ports',id,(game,c,time)=>{
    if(!permitted(c,account.uid))throw Error('이 항구의 서비스 이용이 제한됐어요.');
    return playTavernGame(game,id,choice,bet,time,round,random);
   },done)},port);
 }
 function showArmory(){const s=get();if(PORT_BY_ID[s.port]?.depot&&!(PORT_BY_ID[s.port].promotionLevel>=3))return api.toast('조선소 3단계 확장 뒤 대포를 관리할 수 있어요.');const rows=fleetShips(s);api.modal('대포 장착과 선박 수리',`내구도 ${currentHP(s)}/${fleetMaxHP(s)} · 장착 무게 ${gunWeight(s)}`,`<button id="repair-hull" ${s.port?'':'disabled'}>항구에서 수리</button><p>대포는 선박 단계·포대 수·무게 한도를 모두 만족해야 장착할 수 있어요.</p><div class="ship-growth-grid">${(s.cannons||[]).map(g=>`<article class="growth-step"><strong>${esc(cannonStats(g).name)}</strong><p>피해 ${cannonStats(g).damage} · 명중 ${cannonStats(g).accuracy}% · ${cannonStats(g).reload}초</p><select data-gun-ship="${g.id}"><option value="">보관함 · 미장착</option>${rows.map((p,i)=>`<option value="${p.id}" ${g.shipId===p.id?'selected':''}>${i+1}호 · ${p.tier+1}단계</option>`).join('')}</select><button data-gun-upgrade="${g.id}">품질 개량</button><button data-gun-sell="${g.id}">매각 60%</button></article>`).join('')}</div><h3>대포 구입</h3><select id="gun-kind">${CANNONS.map(c=>`<option value="${c.id}">${esc(c.name)} · ${c.stage}단계부터</option>`).join('')}</select><select id="gun-quality">${QUALITIES.map((q,i)=>`<option value="${i}">${esc(q.name)} · 가격 ×${q.cost}</option>`).join('')}</select><button id="buy-gun" ${s.port?'':'disabled'}>가격 확인·구입</button><p id="business-result"></p>`,'wide');const action=fn=>run(marketKind(s.port),s.port,(game,c,time)=>{if(!game.port||game.voyage)throw Error('항구에 입항하세요.');if(!permitted(c,account.uid))throw Error('이 항구의 선박 서비스가 제한됐어요.');if(PORT_BY_ID[game.port]?.developable&&(c.development?.level||0)<3||PORT_BY_ID[game.port]?.depot&&!(c.promotion?.level>=3))throw Error('조선 시설 3단계 확장 뒤 이용할 수 있어요.');return fn(game,time);},showArmory);$('#repair-hull').onclick=()=>action(repairHull);$('#buy-gun').onclick=()=>{const kind=$('#gun-kind').value,quality=Number($('#gun-quality').value),price=cannonStats({kind,quality}).cost;api.modal('대포를 구입할까요?','대포 구입',`<p>${esc(cannonStats({kind,quality}).name)} · ${fmt(price)} D</p><button id="gun-confirm">구입 확인</button><p id="business-result"></p>`,'small');$('#gun-confirm').onclick=()=>action(game=>buyCannon(game,kind,quality));};document.querySelectorAll('[data-gun-ship]').forEach(b=>b.onchange=()=>action((game,time)=>{const r=equipCannon(game,b.dataset.gunShip,b.value,time);if(usedSpace(game)>capacity(game))throw Error('화물 공간이 부족해요.');return r;}));document.querySelectorAll('[data-gun-upgrade]').forEach(b=>b.onclick=()=>action(game=>upgradeCannon(game,b.dataset.gunUpgrade)));document.querySelectorAll('[data-gun-sell]').forEach(b=>b.onclick=()=>action(game=>sellCannon(game,b.dataset.gunSell)));}
 async function shipAction(fn){const id=get().port;if(!id||PORT_BY_ID[id]?.depot&&!(PORT_BY_ID[id].promotionLevel>=3))return api.toast('조선 시설이 있는 항구에 정박하세요.');return run(marketKind(id),id,(game,c,time)=>{if(game.port!==id||!permitted(c,account.uid))throw Error('현재 항구 서비스를 확인하세요.');if(PORT_BY_ID[id]?.developable&&(c.development?.level||0)<3)throw Error('조선 시설 3단계 확장 뒤 이용할 수 있어요.');return fn(game,time);});}
 async function reconcileHarborRecords(){
  if(!account.ready)return;
  const uid=account.uid,game=get();
  const stations=Object.entries(game.harborOfficers||{});
  const logs=await Promise.allSettled(stations.map(async([port,id])=>({port,id,content:(await readPort(port)).content})));
  if(account.uid!==uid||!account.ready)return;
  const stale=logs.filter(row=>row.status==='fulfilled'&&(ownership(row.value.content).ownerUid!==uid||row.value.content.harborOfficer?.id!==row.value.id)).map(row=>row.value);
  if(stale.length)await run('personal',uid,state=>{
   let changed=false;
   for(const row of stale)if(state.harborOfficers?.[row.port]===row.id)changed=freeRecalledOfficer(state,row.port)||changed;
   return changed?{message:'소유권을 잃은 항구에서 부선장을 복귀시켰어요.'}:{noWrite:true,quiet:true};
  });
  if(game.harborChallengePort){
   const port=game.harborChallengePort;
   const {content}=await readPort(port);
   if(content.harborLosses?.[uid])await run('ports',port,(state,live)=>reconcileHarborLoss(state,live,uid));
  }
 }
 return {showTavernGame,reconcileHarborRecords,extraRumor:(game,keepId)=>extraHarborRumor(game,content(game.port).content,account.uid,now(),keepId),shipAction,trade,showTradeRequest,harborMessage,observe,tradeAccess,displayUnit,showHub,showDevelopment,showDepotMarket,showDepotTaxPolicy,showArmory,syncPorts,run,dispose:()=>{watchVersion++;stopWatch?.();stopRegistry?.();clearTimeout(registryTimer);}};
}
