import {BLESSINGS,BLESSING_MS,blessingDay,blessingAvailability,withBlessingEnd,setBlessing,setBlessingClock} from './blessings.js?v=2026.11.18-captain-workflow';

const $=s=>document.querySelector(s);
const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const time=at=>new Date(at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',dateStyle:'short',timeStyle:'short'});
const left=ms=>{const minutes=Math.max(1,Math.ceil(ms/60000));return (minutes>=60?Math.floor(minutes/60)+'시간 ':'')+minutes%60+'분';};
export function createBlessings(api){
 const account=api.account,now=api.now;
 setBlessingClock(now);
 let current=null,stop,timer,rendered='',inflight=false;
 const reference=path=>account.sdk.ref(account.db,'gameV2/'+path);
 const badge=$('#server-blessing');
 const render=()=>{
  const active=current?.end>now()&&current?.start<=now(),key=active?current.start:'off';
  badge.hidden=!active;
  if(active)badge.textContent=BLESSINGS[current.effect].name+' · '+left(current.end-now())+' 남음';
  if(key!==rendered){rendered=key;api.changed();}
 };
 const disconnect=()=>{stop?.();stop=null;clearInterval(timer);current=null;setBlessing(null);badge.hidden=true;};
 function connect(){
  disconnect();
  if(!account.sdk||!account.ready)return;
  stop=account.sdk.onValue(reference('serverBlessings/current'),snapshot=>{
   const value=snapshot.val();
   if(inflight&&value?.uid===account.uid)return;
   apply(value);
  });
  timer=setInterval(render,1000);
 }
 function apply(value){
  current=Object.hasOwn(BLESSINGS,value?.effect)?withBlessingEnd(value):null;
  setBlessing(current);render();
 }
 badge.onclick=()=>open();
 async function open(){
  if(!account.ready||!account.sdk)return;
  api.modal('오늘의 전 서버 축복','종합 랭킹 1위 · 한국 시간 하루 한 번','<p id="blessings-reading">현재 상태를 확인하고 있어요…</p>','medium');
  const reading=$('#blessings-reading'),s=account.sdk;
  try{
   const [rankings,live]=await Promise.all([s.get(reference('real/overallRanking/public')),s.get(reference('serverBlessings/current'))]);
   if(!reading.isConnected)return;
   const latest=withBlessingEnd(live.val()),board=rankings.val(),leader=Object.entries(board?.top||{}).find(([,row])=>row.rank===1),at=now(),active=latest?.start<=at&&latest?.end>at&&BLESSINGS[latest.effect];
   const available=blessingAvailability(latest,at),can=leader?.[0]===account.uid&&available<=at;
   api.modal('오늘의 전 서버 축복',board?.updatedAt?'종합 랭킹 집계 · '+time(board.updatedAt):'종합 랭킹 집계 대기',`
    ${active?`<p><strong>${safe(active.name)}</strong> · ${safe(latest.name)} 선장 · ${left(latest.end-at)} 남음</p><p>${safe(active.text)}</p>`:'<p>현재 적용 중인 축복이 없어요.</p>'}
    ${leader?`<p>현재 발동 권한 · ${safe(leader[1].name)} 선장${available>at?' · 다음 가능 시각 '+time(available):''}</p>`:'<p>집계가 끝나면 종합 1위가 사용할 수 있어요.</p>'}
    ${can?`<label for="blessing-choice">발동할 효과</label><select id="blessing-choice">${Object.entries(BLESSINGS).map(([id,b])=>`<option value="${id}">${b.name}</option>`).join('')}</select><p id="blessing-preview"></p><button id="blessing-confirm" class="primary-button">12시간 발동 확정</button>`:''}
    <p id="blessing-feedback" role="status"></p><button id="blessing-history">최근 발동 기록</button><div id="blessing-history-rows"></div>`,'medium');
   $('#blessing-history').onclick=history;
   const choice=$('#blessing-choice');
   if(choice){
    const preview=()=>{$('#blessing-preview').textContent=BLESSINGS[choice.value].text+' 예상 종료 '+time(now()+BLESSING_MS);};
    choice.onchange=preview;preview();
    $('#blessing-confirm').onclick=()=>activate(choice.value,leader[1].name,board.updatedAt);
   }
  }catch{if(reading.isConnected)reading.textContent='축복 상태를 불러오지 못했어요. 다시 열어 확인해 주세요.';}
 }
 async function activate(effect,name,rankAt){
  if(inflight||!Object.hasOwn(BLESSINGS,effect))return;
  const day=blessingDay(now()),s=account.sdk,button=$('#blessing-confirm');
  const record={effect,uid:account.uid,name,rankAt,day,start:s.serverTimestamp()};
  inflight=true;button.disabled=true;
  try{
   await s.update(reference('serverBlessings'),{current:record,['history/'+day]:record});
   apply((await s.get(reference('serverBlessings/current'))).val());
   if(button.isConnected)await open();
  }catch{
   if(button.isConnected){$('#blessing-feedback').textContent='발동을 확인하지 못했어요. 창을 다시 열어 최신 순위와 사용 기록을 확인해 주세요.';}
  }finally{inflight=false;}
 }
 async function history(){
  const target=$('#blessing-history-rows'),s=account.sdk;
  try{
   const rows=(await s.get(s.query(reference('serverBlessings/history'),s.orderByKey(),s.limitToLast(30)))).val();
   if(!target.isConnected)return;
   target.innerHTML=Object.values(rows||{}).reverse().map(row=>`<p>${time(row.start)} · ${safe(BLESSINGS[row.effect]?.name)} · ${safe(row.name)}</p>`).join('')||'<p>발동 기록이 없어요.</p>';
  }catch{if(target.isConnected)target.textContent='발동 기록을 불러오지 못했어요.';}
 }
 return {connect,disconnect,open};
}
