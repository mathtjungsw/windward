import {PORT_BY_ID} from './data.js?v=2026.11.12-cooperative-fleet-discoveries';
import {DISCOVERIES} from './discoveries-catalog.js?v=2026.11.12-cooperative-fleet-discoveries';
import {OFFICERS, ITEMS} from './rumor-catalog.js?v=2026.11.12-cooperative-fleet-discoveries';
import {OFFICER_HISTORY} from './officer-history.js?v=2026.11.12-cooperative-fleet-discoveries';
import {officerSnapshot,officerCombatEffect} from './officer-combat.js?v=2026.11.12-cooperative-fleet-discoveries';
import {rumorNote,setRumorHidden,rumorsAtTavern,readContractRumor,portEncounters,gearOnShip,tradeGear,explorationGear,isConsumable,itemLimit,activeCoupon,rumorRequirement,contractStatus,contractDescription,appendItemRecord,officerLevel} from './rumor-progress.js?v=2026.11.12-cooperative-fleet-discoveries';

import {readRumor} from './discoveries.js?v=2026.11.12-cooperative-fleet-discoveries';
import {fleetDisplayShips,SHIPS,ship,fleetMaxHP} from './ship-rules.js?v=2026.11.12-cooperative-fleet-discoveries';

const labels={all:'읽은 소문',hidden:'숨긴 소문'};
const headline=text=>text.length>28?text.slice(0,28).trimEnd()+'…':text;
const escape=text=>String(text??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(label,attr='')=>`<button class="service-button" type="button" ${attr}>${escape(label)}</button>`;
const portName=id=>PORT_BY_ID[id]?.name||id;
const fmt=n=>n.toLocaleString('ko-KR');

export function createRumorUI(api){
  const get=api.getState;
  let pending=false;
  function renderTavern(root){
    const game=get(), entries=rumorsAtTavern(game), read=new Set(rumorNote(game).map(note=>note.id));
    const section=document.createElement('section');
    section.className='rumor-panel';
    section.innerHTML=`<h3>소문</h3>${entries.length?entries.map((entry,i)=>button(`소문 ${i+1}${read.has(entry.id)?' · 다시 보기':''}`,`data-tavern-rumor="${entry.id}"`)).join(''):'<p>지금 들을 수 있는 소문이 없어요.</p>'}`;
    const encounters=portEncounters(game);
    if(encounters.length){
      section.insertAdjacentHTML('beforeend',`<h3>이 항구에서 만날 사람</h3>${encounters.map(entry=>button(entry.title,`data-port-encounter="${entry.id}"`)).join('')}`);
    }
    root.append(section);
    section.querySelectorAll('[data-port-encounter]').forEach(el=>{el.onclick=()=>{
      showContract(portEncounters(get()).find(entry=>entry.id===el.dataset.portEncounter));
    };});
    section.querySelectorAll('[data-tavern-rumor]').forEach(el=>{
      el.onclick=()=>{
        const id=el.dataset.tavernRumor;
        if(!readRumor(get(),id)&&!readContractRumor(get(),id))return api.toast('이 항구에 정상 정박한 뒤 소문을 들어 보세요.','error');
        api.changed();
        showNote('all',id);
      };
    });
  }
  function showNote(filter='all',openId=null){
    const notes=rumorNote(get()).filter(n=>filter==='hidden'?n.hidden:!n.hidden);
    const nav=Object.entries(labels).map(([id,label])=>button(label,`data-note-filter="${id}" aria-pressed="${id===filter}"`)).join('');
    const rows=notes.map(note=>`<article class="rumor-note-row"><details ${note.id===openId?'open':''}><summary>${escape(headline(note.text))}<small>${escape(portName(note.port))}</small></summary><p>${escape(note.text)}</p></details>${button(note.hidden?'다시 표시':'숨기기',`data-note-hide="${note.id}"`)}</article>`).join('');
    api.modal('소문노트','주점에서 읽은 이야기',`<nav class="expansion-tabs rumor-note-tabs" aria-label="소문 표시">${nav}</nav><div class="rumor-note-list">${rows||'<p>이 목록에 표시할 소문이 없어요.</p>'}</div>`,'medium');
    const root=document.querySelector('#modal-content');
    root.querySelectorAll('[data-note-filter]').forEach(el=>{el.onclick=()=>{showNote(el.dataset.noteFilter);document.querySelector('[data-note-filter="'+el.dataset.noteFilter+'"]')?.focus();};});
    root.querySelectorAll('[data-note-hide]').forEach(el=>{el.onclick=()=>{
      if(setRumorHidden(get(),el.dataset.noteHide,filter!=='hidden'))api.changed();
      showNote(filter);
      document.querySelector('[data-note-filter="'+filter+'"]')?.focus();
    };});
  }
  function itemLocation(game,entry){
    if(explorationGear(game)?.id===entry.id)return '장착 중 · 탐사 장비';
    if(tradeGear(game)?.id===entry.id)return '장착 중 · 선단 교역 장비';
    const vessels=fleetDisplayShips(game);
    const index=vessels.findIndex(v=>gearOnShip(game,v.id)?.id===entry.id);
    if(index===-1)return '보유 '+contractStatus(game,entry).owned+'개';
    const vessel=vessels[index];
    const label=index?'동행선 '+index:'기함';
    return '장착 중 · '+label+' ('+SHIPS[vessel.tier].name+')';
  }
  function showDirectory(category){
    const entries=category==='officer'?OFFICERS:ITEMS, officer=category==='officer';
    const rows=entries.map(entry=>{
      const status=contractStatus(get(),entry);
      if(!status.started&&!status.owned)return '';
      const active=officer&&get().rumorProgress?.active===entry.id;
      return `<article class="rumor-note-row"><strong>${escape(entry.name)}</strong><p>${escape(status.owned?(officer?(active?'동행 중':'고용 완료'):itemLocation(get(),entry)):status.done?'획득 가능':status.started?'의뢰 진행 중':'소문 확인')}</p>${button('자세히',`data-directory-entry="${entry.id}"`)}</article>`;
    }).join('');
    api.modal(officer?'부선장 명부':'특수 아이템 가방',officer?'고용과 동행 기록':'보유 물품과 장착 위치',
      `${rows||'<p>표시할 기록이 없어요.</p>'}`,'medium');
    const root=document.querySelector('#modal-content');
    root.querySelectorAll('[data-directory-entry]').forEach(el=>{el.onclick=()=>showContract(entries.find(entry=>entry.id===el.dataset.directoryEntry));});
  }
  function showContract(entry){
    if(!entry)return;
    const s=get(), status=contractStatus(s,entry), atTarget=s.port===entry.port&&!s.voyage;
    const req=rumorRequirement(s,entry);
    const equipped=entry.type==='flag'?!!s.rumorProgress?.flag:entry.type==='ship'?s.rumorProgress?.shipGear[s.flagshipId]===entry.id:
      entry.type==='trade'?s.rumorProgress?.tradeGear===entry.id:entry.type==='explore'?s.rumorProgress?.exploreGear===entry.id:s.rumorProgress?.active===entry.id;
    const step=status.started?`<p>${status.done?'납품을 마쳤어요.':status.remaining.length?'남은 방문 · '+escape(status.remaining.map(portName).join(', ')):'필요한 항구에 모두 들렀어요.'}</p><p>보유 화물 ${status.cargo} / ${entry.challenge.qty}상자</p>`:'';
    const action=!status.started?'start':!status.done?'deliver':'claim';
    const actionText={start:'담당자 만나고 의뢰 시작',deliver:'화물 납품',claim:fmt(entry.cost)+' D · '+(entry.type?'구입':'고용')};
    const canAdvance=atTarget&&status.known&&!pending&&
      (action!=='start'||!entry.minStage||s.shipTier+1>=entry.minStage)&&
      (action!=='deliver'||!status.remaining.length&&status.cargo>=entry.challenge.qty&&status.ready)&&
      (action!=='claim'||status.owned<itemLimit(entry));
    const locations={extension:'항구 조합의 진행 중 의뢰',activity:['I037','I046'].includes(entry.id)?'조건에 맞는 다음 해상 활동':'항구 조합의 위탁 의뢰',project:'공동 사업',facility:'항구 개발·확장','facility-pass':'항구 개발·확장','shore-consumable':'상륙 탐사','shore-pass':'지정 항구의 산길'};
    const location=locations[entry.type],inBag=['distance','supply','repair','coupon','trade-voucher'].includes(entry.type);
    const canUse=entry.type==='distance'?(entry.seaOnly?!s.port:true)&&!s.voyage:s.port||entry.type==='repair';
    const level=officerLevel(s,entry.id);
    const statusLine=!entry.type&&status.owned?`<p>숙련도 ${level}/5 · 경험 ${fmt(s.rumorProgress.officerXP?.[entry.id]||0)} · 능력 ${100+(level-1)*10}%</p>`:'';
    const profile=!entry.type?OFFICER_HISTORY[entry.id]:null;
    const tile=Number(entry.id.slice(1))-1;
    const history=profile?`<div class="officer-history"><div class="officer-portrait" style="background-position:${tile%6*20}% ${Math.floor(tile/6)*100/3}%" role="img" aria-label="${escape(entry.name)} 게임 삽화"></div><div><strong>${escape(profile[0])}</strong><p>${escape(profile[1])} · ${escape(profile[2])}</p><a href="${escape(profile[3])}" target="_blank" rel="noopener noreferrer">역사 자료</a><small> · 게임 삽화</small></div></div><details><summary>합류 이야기 · 창작</summary><p>${escape(entry.story)}</p></details>`:'';
    let preview='';
    if(profile&&status.owned){
      const candidate={...s,rumorProgress:{...s.rumorProgress,active:equipped?null:entry.id}},before=ship(s),after=ship(candidate);
      const stats=officerCombatEffect(officerSnapshot(candidate,api.nav?.())),fmtChange=(a,b)=>Number(a.toFixed(1))+' → '+Number(b.toFixed(1));
      preview=`<p>${equipped?'동행 해제':'동행 변경'} 시 해상 속도 ${fmtChange(before.speed,after.speed)}해리/일 · 강 ${fmtChange(before.riverSpeed,after.riverSpeed)}해리/일 · 최대 내구도 ${fleetMaxHP(s)} → ${fleetMaxHP(candidate)}${stats.accuracy?' · 조건 충족 시 명중 +'+stats.accuracy+'%p':''}${stats.reload?' · 재장전 −'+Math.round(stats.reload*100)+'%':''}</p>`;
    }
    const itemActions=!status.owned?'':entry.record?button('기록 펼치기','id="item-record-open"'):entry.id==='I052'&&api.onCanals?button('운하 지정하기','id="item-designate-canal"'):location?`<p>${escape(location)}에서 적용돼요.</p>`:inBag?button('사용 · '+status.owned+'개 보유',`data-rumor-action="use" ${canUse&&!pending?'':'disabled'}`):button(equipped?'해제':entry.type==='ship'?'기함에 장착':entry.type?'장착':'동행',`data-rumor-action="equip" ${s.port&&!pending?'':'disabled'}`);
    const active=s.rumorProgress?.distanceGear?.[entry.id],voucher=s.rumorProgress?.vouchers?.[entry.tradeMode]===entry.id;
    api.modal(entry.name,entry.type?'특수 아이템':'부선장 합류',
      `${history}<p><strong>${escape(entry.effect)}</strong></p>${statusLine}${preview}<p>첫 소문 · ${escape(portName(entry.tavern))} · 선박 ${req.stage}단계${req.ports?' · 방문 '+req.ports+'곳':''}</p><p>담당자 · ${escape(portName(entry.port))}</p><p>${escape(contractDescription(entry))}</p>${entry.minStage?'<p>이 의뢰에 필요한 선박 · '+entry.minStage+'단계 이상</p>':''}${step}${status.requirements.map(req=>`<p>${escape(req.text)} · ${Math.min(req.current,req.total)}/${req.total}</p>`).join('')}${entry.coupon&&activeCoupon(s,entry.coupon)?.id===entry.id||voucher?'<p>다음 해당 행동에 적용 대기 중</p>':''}${active?`<p>적용 중 · 남은 ${Math.ceil(active)}해리</p>`:''}<div class="dialog-actions">${button(actionText[action],`data-rumor-action="${action}" ${canAdvance?'':'disabled'}`)}${itemActions}${!entry.type&&api.depart&&s.knownPorts?.includes(entry.port)&&s.port!==entry.port?button('관련 항구로 항해','id="officer-depart"'):''}</div>`,'medium');
    const root=document.querySelector('#modal-content');
    root.querySelector('#item-designate-canal')?.addEventListener('click',()=>api.onCanals());
    root.querySelector('#item-record-open')?.addEventListener('click',()=>showRecord(entry));
    root.querySelector('#officer-depart')?.addEventListener('click',()=>api.depart(entry.port));
    root.querySelectorAll('[data-rumor-action]').forEach(el=>{el.onclick=async()=>{
      if(pending)return;
      pending=true;
      root.querySelectorAll('[data-rumor-action]').forEach(b=>b.disabled=true);
      try{await api.action(entry.id,el.dataset.rumorAction);}
      finally{pending=false;if(el.isConnected)showContract(entry);}
    };});
  }
  function showRecord(entry){
    const game=get(),kind=entry.record,discovered=DISCOVERIES.filter(d=>Object.hasOwn(game.discoveries||{},d.id));
    const groups=Object.groupBy(DISCOVERIES,d=>d.region),kinds={ruin:'유적',relic:'유물',animal:'동물',treasure:'보물'};
    const ports=[...new Set(game.visited||[])].map(id=>PORT_BY_ID[id]).filter(Boolean);
    let rows=game.rumorProgress?.records?.[kind]||[],extras='';
    if(kind==='rumors')rows=rumorNote(game).slice().sort((a,b)=>portName(a.port).localeCompare(portName(b.port),'ko')).map(row=>({text:portName(row.port)+' · '+row.text}));
    if(kind==='coins')rows=Object.entries(Object.groupBy(ports,p=>p.region)).map(([name,visited])=>({text:name+' 기념 주화 · '+visited.length+'곳 ('+visited.map(p=>p.name).join(', ')+')'}));
    if(kind==='coasts'){
      rows=Object.entries(groups).map(([name,list])=>({text:name+' '+list.filter(d=>discovered.includes(d)).length+'/'+list.length+'종'}));
      extras=discovered.map(d=>`<details><summary>${escape(d.name)}</summary><p>${escape(d.description)}</p></details>`).join('');
    }
    if(kind==='exhibit'){
      rows=Object.entries(Object.groupBy(discovered,d=>d.kind)).map(([name,list])=>({text:(kinds[name]||name)+' · '+list.map(d=>d.name).join(', ')}));
      if(api.share&&ports.length)extras=`<label>공유할 확인 항구 <select id="item-record-port">${ports.map(p=>`<option value="${p.id}">${escape(p.name)}</option>`).join('')}</select></label>${button('확인 항구 카드 공유','id="item-record-share"')}`;
    }
    if(kind==='notes')extras='<form id="item-record-note"><label>지명·거점 메모 <input maxlength="240" required name="note"></label><button type="submit">메모 남기기</button></form>';
    api.modal(entry.name,'항해 기록',`<ul>${rows.map(row=>`<li>${escape(row.text)}${row.at?` <small>${new Date(row.at).toLocaleString('ko-KR')}</small>`:''}${kind==='routes'&&api.depart&&PORT_BY_ID[row.key]?.active&&game.knownPorts?.includes(row.key)&&game.port!==row.key?button('현재 위치에서 다시 출항',`data-record-route="${escape(row.key)}"`):''}</li>`).join('')||'<li>아직 기록이 없어요.</li>'}</ul>${extras}${button('아이템으로 돌아가기','id="item-record-back"')}`,'medium');
    const root=document.querySelector('#modal-content');
    root.querySelector('#item-record-back').onclick=()=>showContract(entry);
    root.querySelectorAll('[data-record-route]').forEach(b=>b.onclick=()=>api.depart(b.dataset.recordRoute));
    root.querySelector('#item-record-share')?.addEventListener('click',()=>{
      const port=PORT_BY_ID[root.querySelector('#item-record-port').value];
      if(port)api.share('지도 제작자의 기록 · '+port.name,{kind:'port',ref:{portId:port.id}});
    });
    root.querySelector('#item-record-note')?.addEventListener('submit',event=>{
      event.preventDefault();
      if(appendItemRecord(get(),'notes',String(Date.now()),event.currentTarget.elements.note.value)){api.changed();showRecord(entry);}
    });
  }
  return {renderTavern,showNote,showDirectory};
}
