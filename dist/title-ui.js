import {TITLES,activeTitle,normalizeTitles} from './title-effects.js?v=2026.11.20-inland-auto-route';
import {titleStats,chooseTitle,reconcileTitles,refreshTitleContext} from './titles.js?v=2026.11.20-inland-auto-route';
import {RANK_BY_ID} from './rank-metrics.js?v=2026.11.20-inland-auto-route';
export function createTitleUI(api){
 let busy=false;
 const esc=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 async function open(){
  const verified=await refreshTitleContext(api.account),game=api.getState(),stats=titleStats(game,verified),profile=normalizeTitles(game),active=activeTitle(game);
  api.modal('선장의 칭호',active?'현재 사용 · '+active.name:'효과는 한 번에 하나만 선택해요',`<p>최초 달성한 칭호는 계속 보유해요. 항구에 정박한 뒤 선택하세요.</p><p>판매 효과는 장비·부선장과 합쳐 최대 3%, 일반 해상 속도 가산은 최대 20%예요. 수집 기념 깃발은 별도로 유지돼요.</p><button data-title-select="" ${profile.active?'':'disabled'}>사용 해제</button><div class="title-grid">${TITLES.map(t=>{
   const earned=Object.hasOwn(profile.earned,t.id)||stats[t.metric]>=t.target,value=stats[t.metric],label=t.metric==='explorationPercent'?'지도 탐험':RANK_BY_ID[t.metric]?.label||t.metric;
   const display=n=>t.metric==='overallScore'?(n/100).toFixed(2):Number(n).toLocaleString('ko-KR',{maximumFractionDigits:2});
   return `<article class="title-card ${earned?'earned':''}"><strong>${esc(t.name)}</strong><p>${esc(label)} ${Number.isFinite(value)?display(value):'확인 대기'} / ${display(t.target)}${t.metric==='explorationPercent'?'%':''}</p><p>${esc(t.description)}</p><button data-title-select="${t.id}" ${earned?'':'disabled'}>${profile.active===t.id?'✓ 사용 중':earned?'사용하기':'미획득'}</button></article>`;
  }).join('')}</div><p id="title-result" role="status"></p>`,'wide');
  document.querySelectorAll('[data-title-select]').forEach(button=>button.onclick=async()=>{
   if(busy)return;busy=true;button.disabled=true;
   try{
    const current=await refreshTitleContext(api.account,true);
    const result=await api.action((state,_content,now)=>chooseTitle(state,button.dataset.titleSelect,now,current));
    if(result)await open();
   }finally{busy=false;if(button.isConnected)button.disabled=false;}
  });
 }
 return {open};
}
