import {GOODS,ACTIVE_PORT_BY_ID} from './data.js?v=2026.11.12-collections-ranks-historic-ships';
import {fleetCount} from './ship-rules.js?v=2026.11.12-collections-ranks-historic-ships';
import {PROJECTS,canalAccess,depotAccess,projectView} from './projects.js?v=2026.11.12-collections-ranks-historic-ships';
import {canalPassDiscount} from './canal-reservations.js?v=2026.11.12-collections-ranks-historic-ships';

const $=s=>document.querySelector(s), fmt=n=>Number(n||0).toLocaleString('ko-KR');
const time=at=>at?new Date(at).toLocaleString('ko-KR',{dateStyle:'short',timeStyle:'short'}):'';
const labels={freight:'공동 수송',depot:'공동 보급소',canal:'운하'};
const states={active:'납품 중',complete:'목표 달성',expired:'마감',funding:'투자 모집',building:'공사 중',open:'운영 중'};
export function createProjectsUI(api){
  let category='freight',sequence=0;
  const show=html=>api.modal('공동 사업','항구 조합 · 보급소 · 운하',html,'wide');
  function open(kind=category){
    category=kind;
    const token=++sequence;
    show(`<div class="project-actions">${Object.entries(labels).map(([key,label])=>`<button data-project-type="${key}" aria-pressed="${key===kind}">${label}</button>`).join('')}</div>
      <div class="ship-growth-grid">${PROJECTS.filter(p=>p.kind===kind).map(p=>`<button data-project-id="${p.id}">${p.name}</button>`).join('')}</div>
      <p id="project-list-note">사업을 선택하면 현재 기록을 조회해요.</p>`);
    document.querySelectorAll('[data-project-type]').forEach(b=>b.onclick=()=>open(b.dataset.projectType));
    document.querySelectorAll('[data-project-id]').forEach(b=>b.onclick=()=>inspect(b.dataset.projectId));
    if(kind==='canal'){
      const canals=PROJECTS.filter(p=>p.kind==='canal');
      Promise.allSettled(canals.map(p=>api.read(p.id))).then(results=>{
        if(token!==sequence||!$('#project-list-note'))return;
        const opened=results.filter((r,i)=>r.status==='fulfilled'&&projectView(canals[i],r.value.content,api.uid(),api.now()).status==='open').length;
        $('#project-list-note').textContent=`운영 중 ${opened}곳 · 조회한 완공 운하는 항구 자동 항로에 포함돼요.`;
      });
    }
  }
  async function inspect(id){
    const project=PROJECTS.find(p=>p.id===id);
    if(!project)return;
    const token=++sequence;
    show('<p id="project-loading">공동 사업 기록을 불러오는 중이에요.</p>');
    let record;
    try{record=await api.read(id);}
    catch(error){if(token===sequence&&$('#project-loading'))$('#project-loading').textContent=error.message;return;}
    if(token!==sequence||!$('#project-loading'))return;
    const game=api.game(),content=record.content||{},view=projectView(project,content,api.uid(),api.now());
    const button=(action,label,value='')=>`<button data-project-action="${action}" value="${value}">${label}</button>`;
    const field=(min,value,max=10000000,step=1)=>`<label>수량 또는 금액 <input type="number" inputmode="numeric" id="project-quantity" min="${min}" max="${max}" step="${step}" value="${value}"></label>`;
    const has=id=>!!game.rumorProgress?.items?.[id];
    let details,actions='';
    if(project.kind==='freight'){
      details=`<p>${GOODS[project.good].name} ${view.delivered}/${project.goal}상자 · 내 기여 ${view.mine}상자${view.pledged?' · 맡은 수량 '+view.pledged+'상자':''}</p>
        <p>보수 ${fmt(content.reward||project.reward)} D · 목표 달성 후 기여량에 따라 분배${view.deadline?' · 마감 '+time(view.deadline):''}</p>`;
      if(!view.round||view.status!=='active')actions+=button('renew','공동 수송 의뢰 열기')+(has('I047')?button('special','공동 수송 증서 사용'):'');
      if(view.round&&view.status==='active'&&game.port){
        const max=Math.min(game.cargo[project.good]?.qty||0,project.goal-view.delivered);
        actions+=field(1,game.port===project.port&&max?max:view.pledged||project.goal-view.delivered,project.goal)+button('join','이 수량 맡기');
        if(game.port===project.port&&max)actions+=button('deliver','화물 납품');
      }
      if(view.status==='complete'&&view.mine&&!view.claimed)actions+=button('claim','현재 의뢰 보수 받기',view.round);
      for(const [round,old] of Object.entries(content.history||{}))if(old.deliveries?.[api.uid()]&&!old.claimed?.[api.uid()])actions+=button('claim',round+'회차 보수 받기',round);
    }else{
      details=`<p>투자금 ${fmt(view.raised)} / ${fmt(project.cost)} D · 내 투자 ${fmt(view.mine)} D
        ${content.materialCredit?' · 자재 '+fmt(content.materialCredit)+' D':''}</p>
        <p>${view.status==='funding'&&project.kind==='depot'&&view.raised>=100000?'자재 창고 확보 · 보급 시설 투자 중':states[view.status]}${view.status==='building'?' · 완공 예정 '+time(view.readyAt):''}</p>`;
      if(view.status==='funding'){
        actions+=field(10000,10000,10000000,10000)+button('invest','투자');
        if(view.mine)actions+=button('refund','내 투자금 회수');
        if(has('I049'))actions+=button('materials','건설 자재 증서 사용');
      }
      if(view.status==='building'&&project.kind==='canal'&&has('I051')&&!content.dredged)actions+=button('dredge','준설 장비 계약 사용');
      if(view.status==='open'&&project.kind==='depot'){
        details+=`<p>재고 ${view.stock}일분(한 척 기준) · 척당 하루 4 D</p>`;
        if(!content.registeredCapital)actions+=button('register','완공한 보급항을 해도에 등록');
        else if(ACTIVE_PORT_BY_ID[id])details+='<p>해도와 항구 찾기에 등록된 보급항</p>';
        if(game.depotDock!==id&&game.port!==project.site.portId)actions+=button('go','보급소로 항해');
        if(view.owner===api.uid())details+='<p>운영자 기본 세수 · 시간당 500 D · 최대 72시간</p>';
        if(depotAccess(game,project,api.nav())){
          if(game.depotDock!==id&&game.port!==project.site.portId)actions+=button('dock','보급소 정박');
          else{
            details+='<p>정박 중 · 공격 보호</p>';
            actions+=field(1,10,1000)+button('supply','보급 구매');
            if(has('I053'))actions+=button('stock','보급 창고 증서 사용');
          }
        }
      }
      if(view.status==='open'&&project.kind==='canal'){
        const total=view.toll*fleetCount(game),discount=canalPassDiscount(game,id,total);
        details+=`<p>척당 통행료 ${fmt(view.toll)} D · 내 선단 ${fmt(total-discount)} D${discount?' (통행권 적용)':''}</p>`;
        actions+=button('entrance','가까운 운하 입구로 항해');
        if(canalAccess(game,project,api.nav())>=0)actions+=button('transit','운하 진입 · '+fmt(total-discount)+' D',total-discount);
        if(view.owner===api.uid())actions+=field(0,view.toll,200)+button('toll','척당 통행료 변경');
      }
      if(project.kind==='canal'&&has('I052')){
        const designated=PROJECTS.find(p=>p.id===game.rumorProgress.canalPass);
        details+=`<p>통행권 지정 · ${designated?.name||'선택 필요'}</p>`;
        if(designated?.id!==id&&!game.voyage)actions+=button('voucher','이 운하에 통행권 지정');
      }
      if(view.balance)actions+=button('dividend',`수입 ${fmt(view.balance)} D 받기`);
    }
    api.modal(project.name,labels[project.kind],`${details}<div class="project-actions">${actions}</div>
      <p id="business-result" role="status"></p><button id="project-list">사업 목록</button>`,'wide');
    $('#project-list').onclick=()=>open(project.kind);
    document.querySelectorAll('[data-project-action]').forEach(b=>b.onclick=async()=>{
      const action=b.dataset.projectAction;
      if(action==='go'||action==='entrance')return api.go(project,action,view);
      const number=b.value?Number(b.value):Number($('#project-quantity')?.value);
      await api.action(project,action,number,()=>action==='transit'?api.close():inspect(id));
    });
  }
  return {open,inspect};
}
