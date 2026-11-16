import {harborGoal,harborPresenceOutcome,harborPracticeAction,settleHarborConnection,harborBattleAction} from './harbor-battles.js?v=2026.11.16-five-eras';

const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const duration=ms=>{const n=Math.max(0,Math.ceil(ms/1000));return Math.floor(n/60)+'분 '+n%60+'초';};
const onRoute={channel:[230,162],outer:[118,134],hold:[262,104]};
const ATTACK={channel:'안쪽 항로',outer:'바깥 항로',fire:'포탑 포격',hold:'점령 유지'};
const DEFEND={channel:'안쪽 조준',outer:'바깥쪽 조준',hold:'점령지 조준'};
export function harborMap(round,shot=false){
 const ship=onRoute[round.course]||[95,199],target=onRoute[round.stance]||onRoute.channel;
 return `<svg viewBox="0 0 480 235" class="harbor-arena-map" role="img" aria-label="공방 해도. 공격 선단 내구도 ${round.ship}, 포탑 내구도 ${round.fort}">
  <path d="M480 0H246L269 37 319 64 331 87 358 112 381 143 442 182 480 191Z" fill="#e4d8b0" stroke="#a49a74" stroke-width="2"/>
  <path d="M83 195 Q177 218 230 162L262 104M83 195Q87 111 118 134L262 104" fill="none" stroke="#286477" stroke-width="2" stroke-dasharray="7 5"/>
  <circle cx="262" cy="104" r="29" fill="#fff2b9" fill-opacity=".42" stroke="#92702f" stroke-dasharray="4 3"/>
  <path d="M353 92L${target[0]} ${target[1]}" stroke="#995238" stroke-width="1.5" stroke-dasharray="4 5"/>
  <circle cx="353" cy="92" r="127" fill="none" stroke="#995238" stroke-opacity=".52"/>
  <text x="230" y="67">점령 구역</text>
  <g transform="translate(353 92)"><rect x="-10" y="-11" width="20" height="19" rx="2" fill="#a17550" stroke="#4b382e"/><path d="M-3 -2L-16 4" stroke="#41342b" stroke-width="4"/><text x="21" y="0">포탑</text><text x="21" y="19">${round.fort}/100</text></g>
  <g transform="translate(${ship[0]} ${ship[1]})"><path d="M-13 4H13L8 10H-8Z" fill="#765236" stroke="#334e52"/><path d="M0 -18V4H-9L0 -18 10 2H0" fill="#fff7d9" stroke="#315765"/><text x="17" y="9">${round.ship}/100</text></g>
  ${shot&&round.shot?.fort?`<circle r="4" fill="#e68537"><animateMotion dur=".55s" path="M${ship[0]},${ship[1]} L353,92"/></circle><circle cx="353" cy="92" r="11" fill="none" stroke="#d25635" class="harbor-impact"/>`:''}
  ${shot&&round.shot?.ship?`<circle r="4" fill="#e68537"><animateMotion dur=".62s" path="M353,92 L${ship[0]},${ship[1]}"/></circle><circle cx="${ship[0]}" cy="${ship[1]}" r="11" fill="none" stroke="#d25635" class="harbor-impact"/>`:''}
 </svg>`;
}
export function createHarborArena(api){
 const a=api.account;
 let cleanup=()=>{};
 function open(port,practice,back){
  cleanup();
  const sdk=a.sdk,uid=a.uid;
  if(!a.ready)return;
  const recordRef=sdk.ref(a.db,'gameV2/shared/ports/'+port.id),presenceRef=sdk.ref(a.db,'gameV2/harborPresence/'+port.id),mine=sdk.ref(a.db,'gameV2/harborPresence/'+port.id+'/'+uid);
  const key=practice?'harborPractice':'harborMatch';
  api.modal(practice?'선장끼리 항구 공방 연습':'항구 공방 해도',port.name,`<div id="harbor-arena">불러오는 중…</div><button id="harbor-arena-back">경합 항구로</button>`,'wide');
  const view=$('#harbor-arena'),dialog=view.closest('dialog');
  let round=null,seenTurn=0,presence={},lastBeat=0,finishing=false,signalToken='',atOpen=true;
  let recordOff=()=>{},presenceOff=()=>{};
  const rerender=()=>{if(view.isConnected&&dialog?.open)paint(false);};
  function write(action,value){
   return api.run('ports',port.id,(game,content,now)=>{
    if(practice)return harborPracticeAction(game,content,uid,port.id,action,value,now,presence);
    if(action==='finish')return settleHarborConnection(game,content,uid,port.id,presence,now,a.name);
    return harborBattleAction(game,content,uid,port.id,action,value,now,a.name);
   });
  }
  function participant(){return round&&[round.attacker,round.defender].includes(uid);}
  function heartbeat(){
   if(!view.isConnected||!dialog?.open){cleanup();return;}
   const now=api.now();
   if(round?.state!=='active'||!participant()||api.state().port!==port.id)return;
   const myself=presence[uid]?.at||0,old=now-Math.max(round.connected||round.begin,myself);
   if(old>=60000){finish();return;}
   if(now-lastBeat>14000){
    lastBeat=now;sdk.set(mine,{at:sdk.serverTimestamp()}).catch(()=>{lastBeat=0;});
   }
   if(harborPresenceOutcome(round,presence,now))finish();
  }
  function finish(){
   if(finishing)return;
   finishing=true;Promise.resolve(write('finish','')).finally(()=>{finishing=false;});
  }
  function paint(animate){
   if(!view.isConnected||!dialog?.open)return;
   const now=api.now(),ongoing=round?.state==='active',invite=round?.state==='invited'&&round.expires>now,ready=round?.state==='ready'&&round.expires>now;
   const online=api.online().filter(p=>(p.uid||p.id)!==uid);
   const myself=participant(),attack=round?.attacker===uid;
   const button=(action,label,value='')=>`<button data-arena-action="${action}" data-value="${esc(value)}">${label}</button>`;
   let actions='';
   if(ongoing&&myself&&round.end>now){
    const buttons=attack?ATTACK:DEFEND;
    actions=Object.entries(buttons).map(([value,label])=>button(attack?'attack':'defend',label,value)).join('');
   }else if(practice&&(invite||ready)&&myself){
    actions=(invite&&!attack?button('accept','수락'):ready&&!(attack?round.attackerReady:round.defenderReady)?button('ready','준비'):'' )+button('cancel','취소');
   }else if(practice&&!ongoing&&!invite&&!ready){
    actions=online.length?`<label>접속 선장 <select id="arena-target">${online.map(p=>`<option value="${esc(p.uid||p.id)}">${esc(p.name)}</option>`).join('')}</select></label>`+button('invite','이 항구 연습에 초대'):'<p>현재 초대할 접속 선장이 없어요.</p>';
   }
   const token=[round?.state,round?.turn,round?.lastDefense,round?.attackerReady,round?.defenderReady,invite,ready,ongoing&&round.end>now,online.length].join(':');
   if(token!==signalToken){
    signalToken=token;
    view.innerHTML=`${practice?'<p>같은 연습용 선단·포탑·사병 5명을 사용해요. 두 선장 모두 이 항구에 정박해야 참가할 수 있어요.</p>':''}
     ${round?.ship!==undefined?harborMap(round,animate):''}<p data-arena-clock></p><div class="dialog-actions">${actions}</div>`;
   }
   const status=view.querySelector('[data-arena-clock]');
   if(status){
    const other=attack?round?.defender:round?.attacker,stale=ongoing&&myself&&other&&(attack?round.liveDefense:true)?now-Math.max(round.connected||round.begin,presence[other]?.at||0):0;
    status.textContent=ongoing?`점령 ${round.capture}/${harborGoal(round)} · ${duration(round.end-now)} 남음${stale>=25000?' · 상대 복귀 대기':''}`:
     ready?'준비 대기 · '+duration(round.expires-now):invite?'초대 응답 대기 · '+duration(round.expires-now):
     round?.state==='won'?'공격측 승리':round?.state==='defended'?'방어측 승리':round?.state==='void'?'양쪽 미복귀 · 무효':round?.state==='cancelled'?'연습 취소':'진행 중인 공방이 없어요.';
   }
  }
  view.onclick=e=>{
   const button=e.target.closest('[data-arena-action]');if(!button)return;
   const action=button.dataset.arenaAction;
   void write(action,action==='invite'?$('#arena-target').value:button.dataset.value);
  };
  $('#harbor-arena-back').onclick=()=>{cleanup();back();};
  const timer=setInterval(()=>{rerender();heartbeat();},1000);
  const observer=new MutationObserver(()=>{if(!view.isConnected||!dialog?.open)cleanup();});
  if(dialog)observer.observe(dialog,{attributes:true,attributeFilter:['open'],subtree:true,childList:true});
  cleanup=()=>{observer.disconnect();recordOff();presenceOff();clearInterval(timer);cleanup=()=>{};};
  recordOff=sdk.onValue(recordRef,snap=>{
   round=snap.val()?.content?.[key]||null;
   const changed=!atOpen&&(round?.turn||0)>seenTurn;
   seenTurn=round?.turn||0;atOpen=false;paint(changed);heartbeat();
  },()=>{if(view.isConnected)view.textContent='공방 상태를 불러오지 못했어요.';});
  presenceOff=sdk.onValue(presenceRef,snap=>{presence=snap.val()||{};rerender();heartbeat();});
 }
 return {open};
}
