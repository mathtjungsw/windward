import {PORT_BY_ID,GOODS} from './data.js?v=2026.11.14-trade-access';
import {GUILD_TYPES,guildObjective,isGuildReport} from './guild-contracts.js?v=2026.11.14-trade-access';

const escape=text=>String(text).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const clock=new Intl.DateTimeFormat('ko-KR',{dateStyle:'short',timeStyle:'short',timeZone:'Asia/Seoul'});
const actionButton=(title,action,id)=>`<button type="button" class="service-button" data-charter-action="${action}" data-charter-id="${id}">${title}</button>`;

export function createGuildUI(api){
  let pending=false;
  function open(){
    const game=api.getState(), now=api.now(), active=game.guild?.active||[];
    const offers=api.offers(game,now);
    const rows=active.map(row=>{
      const type=GUILD_TYPES[row.tier], proof=Number.isSafeInteger(row.proofAt);
      const overdue=now>row.deadline&&!proof, objective=guildObjective(row);
      const subject=objective?objective.name:PORT_BY_ID[row.target].name;
      const task=objective?'보고 항구 · '+PORT_BY_ID[row.target].name:row.good?GOODS[row.good].name+' '+row.qty+'상자':'위탁 화물 '+type.qty+'상자';
      const deadline=proof?'목표 완료 · 귀항 후 보고 가능':overdue?'기한 초과':'남은 시간 약 '+Math.ceil((row.deadline-now)/60000)+'분';
      const settle=isGuildReport(row.tier)?proof?actionButton('조합에 보고','report',row.id):'':row.good?actionButton('납품 견적 확인','quote',row.id):actionButton('납품하기','deliver',row.id);
      return `<article class="investigation-row"><strong>${type.label} · ${escape(subject)}</strong><p>${escape(task)} · 보수 ${(row.reward+(row.storyBonus||0)).toLocaleString('ko-KR')} D · 명성 +${type.fame}</p><p>마감 ${clock.format(row.deadline)} (한국 시간) · ${deadline}</p><div class="dialog-actions">${!overdue&&game.port===row.target?settle:''}${actionButton(overdue?'만료 정산':'포기 · 명성 최대 '+type.fame+' 차감',overdue?'expire':'cancel',row.id)}${!overdue&&!proof&&!row.extended&&game.rumorProgress?.items.I044?actionButton('기한 25% 연장','extend',row.id):''}</div></article>`;
    }).join('');
    const choices=offers.map(row=>{
      const type=GUILD_TYPES[row.tier], objective=guildObjective(row);
      const subject=objective?objective.name:PORT_BY_ID[row.target].name;
      const task=objective?'수락 후 목표를 완료하고 '+PORT_BY_ID[row.target].name+'에 보고':row.good?GOODS[row.good].name+' '+row.qty+'상자 · 판매액 별도':'위탁 화물 '+type.qty+'상자';
      const items=game.rumorProgress?.items,extras=type.kind?'':[
        items?.I041&&actionButton('소개장 · 특별 수송 보수 +15%','I041',row.id),
        items?.I043&&actionButton('긴급 증서 · 기한 50%, 보수 +30%','I043',row.id),
        items?.I061&&actionButton('여행자의 편지 · 수집가 수송 보수 +15%','I061',row.id)
      ].filter(Boolean).join('');
      return `<article class="investigation-row"><strong>${type.label} · ${escape(subject)}</strong><p>${escape(task)} · 보수 ${row.reward.toLocaleString('ko-KR')} D · 명성 +${type.fame}</p><p>기한 ${type.hours===.5?'30분':type.hours+'시간'} · 기한 초과 시 명성 최대 ${type.fame} 차감</p>${actionButton('의뢰 수락','accept',row.id)}${extras}</article>`;
    }).join('');
    api.modal('항구 조합','현재 진행 중 '+active.length+' / 3건',
      `<div id="guild-view">${api.projects?'<button class="service-button" id="guild-projects">공동 수송 · 보급소 · 운하</button>':''}<h3>진행 중 의뢰</h3>${rows||'<p>진행 중인 의뢰가 없어요.</p>'}<h3>이 항구에서 수락</h3>${choices||'<p>정박한 항구에서 현재 선단과 보급으로 수락 가능한 의뢰를 확인하세요.</p>'}</div>`,'medium');
    const root=document.querySelector('#guild-view');
    const projects=root.querySelector('#guild-projects');if(projects)projects.onclick=api.projects;
    root.querySelectorAll('[data-charter-action]').forEach(el=>{el.onclick=async()=>{
      if(pending)return;
      pending=true;root.querySelectorAll('button').forEach(b=>b.disabled=true);
      try{
        const {charterAction:action,charterId:id}=el.dataset;
        if(action==='quote'){
          const row=active.find(entry=>entry.id===id);
          const quote=await api.quote(row);
          if(quote&&root.isConnected&&document.querySelector('#modal')?.open)showQuote(row,quote);
        }else await api.action(action,id);
      }
      finally{pending=false;if(root.isConnected&&document.querySelector('#modal')?.open)open();}
    };});
  }
  function showQuote(row,quote){
    const fmt=n=>n.toLocaleString('ko-KR');
    api.modal('조합 납품 견적',PORT_BY_ID[row.target].name,
      `<div id="guild-quote"><p>${escape(GOODS[row.good].name)} ${row.qty}상자 · 상자당 ${fmt(quote.unit)} D</p><p>세금 ${fmt(quote.tax)} D · 판매 수령액 ${fmt(quote.total)} D</p><p>조합 보수 +${fmt(row.reward)} D · 명성 +${GUILD_TYPES[row.tier].fame}</p><p>이 견적은 5초 동안 유효해요.</p><button type="button" class="primary-button" id="confirm-guild-sale">표시 금액으로 납품</button><button type="button" class="service-button" id="guild-quote-back">조합 목록</button></div>`,'small');
    const root=document.querySelector('#guild-quote'), confirm=root.querySelector('#confirm-guild-sale');
    root.querySelector('#guild-quote-back').onclick=open;
    confirm.onclick=async()=>{
      if(confirm.disabled)return;
      confirm.disabled=true;
      await api.action('deliver',row.id,quote);
      if(root.isConnected&&document.querySelector('#modal')?.open)open();
    };
  }
  return {open};
}
