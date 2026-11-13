import {STORIES,STORY_BY_ID} from './story-catalog.js?v=2026.11.13-gear-corinth';
import {PORT_BY_ID} from './data.js?v=2026.11.13-gear-corinth';
import {OFFICER_BY_ID,ITEM_BY_ID} from './rumor-catalog.js?v=2026.11.13-gear-corinth';
import {storyAction,storyRequirement,refreshStories,recordStoryView,completedChapter} from './story-core.js?v=2026.11.13-gear-corinth';

const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names={ship:'내 배 보기',cargo:'화물·보유금',route:'항구 찾기와 항로', 'porto-route':'포르투 항로',supply:'항구 보급',trade:'교역소',sale:'최고가 판매처', 'auto-route':'자동 항해 전환',favorites:'항구 즐겨찾기',minimap:'세계지도',journal:'항해일지',tavern:'주점',note:'소문노트','note-hide':'소문 숨기기','note-restore':'숨긴 소문 복원',album:'발견 도감',investigation:'흔적 조사',guild:'조합 의뢰',shipyard:'역사 선박 조선소',stored:'항구에 맡긴 배',guns:'대포 장착',items:'아이템 가방',officers:'부선장 명부',captains:'선장 목록',ranks:'선장 랭킹',chat:'선장 채팅',projects:'공동 사업',settings:'조작·화면 설정',finder:'메뉴 찾기'};

export function createStoryUI(api){
 let busy=false;
 const get=api.game;
 const button=document.createElement('button');button.id='story-open';button.className='nav-item';button.textContent='항해자의 이야기';button.onclick=()=>open();document.querySelector('.main-nav').append(button);
 async function act(id,action,chapter){
  if(busy)return;
  busy=true;
  try{
   const result=await api.action((game,now)=>storyAction(game,id,action,now,chapter));
   if(result)showStory(id);
  }catch(error){api.toast(error.message,'error');}
  finally{busy=false;}
 }
 function open(){
  refreshStories(get());
  api.modal('항해자의 이야기','초보·중급·고급 · 장별 진행 저장',`<div class="story-catalog">${STORIES.map(story=>{
   const row=get().storyBook.entries[story.id],requirement=storyRequirement(get(),story);
   const reward=OFFICER_BY_ID[story.reward]||ITEM_BY_ID[story.reward];
   return `<article><small>${story.level} · ${story.chapters.length}장 · ${story.steps.length}단계</small><h3>${escape(story.name)}</h3><p>${escape(story.summary)}</p>
    <p class="modal-meta">${row?row.rewarded?'✓ 완료':row.index+'/'+story.steps.length+'단계 완료':`선박 ${story.stage}단계 · 방문 ${story.visits}항구${story.level==='고급'?' · 중급 1편 완료':''}`}</p>
    ${reward?`<p>첫 완료 · ${escape(reward.name)} · ${story.cash.toLocaleString('ko-KR')} D</p>`:'<p>장별 200 D · 총 1,200 D</p>'}
    <button data-story="${story.id}">${row?'이야기 열기':requirement.ok?'시작 조건 보기':'해금 조건 보기'}</button></article>`;
  }).join('')}</div>`,'wide');
  document.querySelectorAll('[data-story]').forEach(element=>element.onclick=()=>showStory(element.dataset.story));
 }
 function showStory(id){
  refreshStories(get());
  const story=STORY_BY_ID[id],row=get().storyBook.entries[id],step=row&&story.steps[row.index];
  const part=story.chapters[step?.chapter??story.chapters.length-1];
  const reward=OFFICER_BY_ID[story.reward]||ITEM_BY_ID[story.reward];
  const chapterRewards=story.id==='first-route'&&row?story.chapters.map((chapter,index)=>completedChapter(story,row,index)&&!row.chapterRewards.includes(index)?`<button data-story-chapter="${index}">${index+1}장 보상 200 D 수령</button>`:'').join(''):'';
  api.modal(story.name,story.level+' · '+story.chapters.length+'장 '+story.steps.length+'단계',`
   <div class="dialog-actions"><button id="story-back">이야기 목록</button>${row?'<button id="story-track">이 이야기 추적</button>':''}</div>
   <div class="story-layout"><section><h3>${escape(part.title)}</h3><p class="story-dialogue">${escape(part.dialogue)}</p>
   ${row?`<p class="story-objective">${row.rewarded?'✓ 이야기 완료':step?escape(step.text):'모든 단계를 마쳤어요. 완료 보상을 받으세요.'}</p><p>${row.index}/${story.steps.length}단계 완료</p>`:
    `<p>시작 항구 · ${PORT_BY_ID[story.origin].name}</p><p>필요 선박 ${story.stage}단계 · 방문 ${story.visits}곳${story.level==='고급'?' · 중급 1편 완료':''}</p>`}
   <div class="dialog-actions">${!row?'<button id="story-start" class="primary-button">이야기 시작</button>':!step&&!row.rewarded?'<button id="story-claim" class="primary-button">완료 보상 받기</button>':step?.kind==='talk'?'<button id="story-advance" class="primary-button">이야기 듣고 계속</button>':step?.kind==='deliver'?'<button id="story-advance" class="primary-button">화물 납품</button>':step?.kind==='view'?'<button id="story-menu" class="primary-button">해당 메뉴 열기</button>':step?'<button id="story-guide" class="primary-button">할 일 안내</button>':''}${step?.optional?'<button id="story-skip">선택 체험 건너뛰기</button>':''}${chapterRewards}</div>
   ${reward?`<div class="story-reward"><strong>첫 완료 보상 · ${escape(reward.name)}</strong><p>${escape(reward.effect)}</p></div>`:''}
   <details><summary>역사 배경과 창작 안내</summary><p>${escape(story.history)}</p>${story.source?`<a href="${escape(story.source)}" target="_blank" rel="noopener noreferrer">역사 자료 보기</a>`:''}</details></section>
   <aside class="story-chapters">${story.chapters.map((chapter,index)=>`<details ${index===step?.chapter?'open':''}><summary>${row&&completedChapter(story,row,index)?'✓ ':''}${index+1}장 · ${escape(chapter.title)}</summary><p>${escape(chapter.dialogue)}</p><ol>${chapter.steps.map(item=>`<li>${escape(item.text)}</li>`).join('')}</ol></details>`).join('')}</aside></div>`,'wide');
  document.querySelector('#story-back').onclick=open;
  const bind=(selector,action)=>{const element=document.querySelector(selector);if(element)element.onclick=()=>act(id,action);};
  bind('#story-start','start');bind('#story-track','track');bind('#story-advance','advance');bind('#story-skip','skip');bind('#story-claim','claim');
  document.querySelectorAll('[data-story-chapter]').forEach(element=>element.onclick=()=>act(id,'chapter',Number(element.dataset.storyChapter)));
  const menu=document.querySelector('#story-menu');
  if(menu)menu.onclick=()=>showMenus(id,step.menus);
  const guide=document.querySelector('#story-guide');
  if(guide)guide.onclick=()=>showGuide(id,step);
 }
 function showMenus(id,menus){
  api.modal('이번 단계의 메뉴','한 번씩 열어 보고 익혀 보세요.',`<p>유료 행동이나 장비 구매 없이 메뉴를 확인해도 돼요. 잠긴 기능은 해금 안내를 읽어 보세요.</p><div class="story-menu-links">${menus.map(key=>`<button data-story-menu="${key}">${names[key]||key}${get().storyBook.views[key]?' · ✓ 확인':''}</button>`).join('')}</div><button id="story-resume">이야기로 돌아가기</button>`,'small');
  document.querySelector('#story-resume').onclick=()=>showStory(id);
  document.querySelectorAll('[data-story-menu]').forEach(element=>element.onclick=async()=>{
   const key=element.dataset.storyMenu;
   if(key==='note-hide'||key==='note-restore'){
    api.open.note();
    api.toast(key==='note-hide'?'소문 옆 숨기기를 눌러 보세요.':'숨긴 소문 탭에서 다시 표시를 눌러 보세요.');
    return;
   }
   try{
    api.close?.();
    if(api.open[key])await api.open[key]();
    else api.modal(names[key]||'기능 안내','초보 항해 안내','<p>흔적은 시야 안에서 찾고, 충분히 접근하면 조사하기 또는 조사지점으로 이동할 수 있어요.</p>','small');
    recordStoryView(get(),key);api.changed();
   }catch(error){api.toast(error.message,'error');}
  });
 }
 function showGuide(id,step){
  const port=PORT_BY_ID[step.port];
  api.modal('지금 할 일','이야기 단계 안내',`<p>${escape(step.text)}</p>${port?`<p>목적지 · ${port.name}</p><button id="story-port">항구 위치·항로 보기</button>`:''}<p>완료한 행동은 자동으로 기록해요. 구조 이동은 항해 통과 실적에 포함되지 않아요.</p><button id="story-guide-back">이야기로 돌아가기</button>`,'small');
  document.querySelector('#story-guide-back').onclick=()=>showStory(id);
  if(port)document.querySelector('#story-port').onclick=()=>api.port(port.id);
 }
 function renderPanel(){
  const ledger=get().storyBook;
  if(!ledger)return false;
  const id=ledger.tracked||'first-route',story=STORY_BY_ID[id],row=ledger.entries[id],step=row&&story.steps[row.index];
  document.querySelector('#mission-index').textContent=row?row.index+'/'+story.steps.length:'새 이야기';
  document.querySelector('#mission-title').textContent=story.name;
  document.querySelector('#mission-desc').textContent=row?(row.rewarded?'완료한 이야기를 다시 읽거나 다른 항해를 골라 보세요.':step?.text||'이야기를 마쳤어요. 보상을 수령하세요.'):story.summary;
  document.querySelector('#mission-reward').textContent=story.id==='first-route'?'장별 200 D':story.cash.toLocaleString('ko-KR')+' D + 전용 보상';
  document.querySelector('#mission-steps').innerHTML='<button id="story-panel-open" class="service-button">'+(row?'이야기 계속하기':'항해자의 이야기 열기')+'</button>';
  document.querySelector('#story-panel-open').onclick=()=>row?showStory(id):open();
  return true;
 }
 function onModal(title){
  const mappings=[[/내 배|내 선단|동행 선단/,'ship'],[/소문노트/,'note'],[/수집 도감|발견 도감/,'album'],[/조합 의뢰/,'guild'],[/선장 목록|모든 선장/,'captains'],[/선장 랭킹|내 순위/,'ranks'],[/항해일지/,'journal'],[/역사 선박/,'shipyard'],[/맡긴 배/,'stored'],[/대포 장착/,'guns'],[/아이템 가방/,'items'],[/부선장 명부/,'officers'],[/공동 사업|운하 이용/,'projects'],[/조작.*설정/,'settings'],[/메뉴 찾기/,'finder'],[/최고가 판매/,'sale'],[/항구 찾기|항구 목록/,'route']];
  let changed=false;
  for(const [pattern,key] of mappings)if(pattern.test(title)&&!get().storyBook?.views?.[key]){recordStoryView(get(),key);changed=true;}
  if(changed)api.changed();
 }
 return {open,showStory,renderPanel,onModal,view:key=>{recordStoryView(get(),key);api.changed();}};
}
