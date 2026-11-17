import {DISCOVERY_BY_ID} from './discoveries-catalog.js?v=2026.11.17-promoted-ports-and-content';
import {QUIZ_KINDS,quizStatus,quizResetAt,quizPrompt,openQuiz,answerQuiz,quizCommit} from './album-quiz.js?v=2026.11.17-promoted-ports-and-content';

const fmt=n=>Number(n).toLocaleString('ko-KR');
const $=s=>document.querySelector(s);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function createAlbumQuiz(api){
 let pending=false;
 function menu(){
  const game=api.game(),now=api.now();
  const next=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'long',day:'numeric'}).format(quizResetAt(now));
  api.modal('오늘의 도감 퀴즈','종류별로 하루 한 번',`<p>내가 발견한 기록에서 문제가 나와요. ${next} 0시에 새 기회가 열려요.</p>
   <div class="album-quiz-list">${Object.entries(QUIZ_KINDS).map(([id,label])=>{
    const {record,owned,reward}=quizStatus(game,id,now),status=record?.answer?'결과 다시 보기':record?'이어 풀기':owned.length?'문제 열기':'첫 발견 후 열림';
    return `<button class="service-button" data-album-quiz-kind="${id}" ${owned.length||record?'':'disabled'}><strong>${label}</strong><span>${status}${reward&&(owned.length||record)?' · '+fmt(reward)+' D':''}</span></button>`;
   }).join('')}</div><button id="quiz-album-return">도감으로</button>`,'medium');
  $('#quiz-album-return').onclick=()=>api.album();
  document.querySelectorAll('[data-album-quiz-kind]').forEach(b=>b.onclick=()=>choose(b.dataset.albumQuizKind,b));
 }
 async function choose(kind,button){
  const {record}=quizStatus(api.game(),kind,api.now());
  if(record){question(kind,record);return;}
  await commit(button,quizCommit(api.uid(),kind,(game,_shared,now)=>openQuiz(game,kind,now)),r=>question(kind,r.record));
 }
 async function commit(button,action,display){
  if(pending)return;
  pending=true;button.disabled=true;
  try{
   const result=await api.run(action);
   if(result&&button.isConnected)display(result);
  }finally{pending=false;if(button.isConnected)button.disabled=false;}
 }
 function question(kind,record){
  const correct=DISCOVERY_BY_ID[record.correct];
  if(!correct){menu();return;}
  if(record.answer){
   const chosen=DISCOVERY_BY_ID[record.answer];
   api.modal(record.paid?'정답이에요!':'오늘의 퀴즈 결과',QUIZ_KINDS[kind],
    `<p>${record.paid?`정답 보상 <strong>+${fmt(record.paid)} D</strong>`:`내가 고른 답 · ${esc(chosen?.name)}`}</p>
     <h3>${esc(correct.name)}</h3><p>${esc(correct.description)}</p>
     <div class="dialog-actions"><button id="quiz-study">도감 상세</button><button id="quiz-types">퀴즈 목록</button></div>`,'medium');
   $('#quiz-study').onclick=()=>api.album(correct.id);$('#quiz-types').onclick=menu;return;
  }
  api.modal(QUIZ_KINDS[kind]+' 퀴즈',`난도 ${record.difficulty}/5 · 정답 보상 ${fmt(record.reward)} D`,
   `<p>${esc(quizPrompt(correct))}</p><fieldset class="album-quiz-options"><legend>이 기록은 무엇일까요?</legend>
    ${record.options.map(id=>`<label><input type="radio" name="album-choice" value="${id}"> ${esc(DISCOVERY_BY_ID[id]?.name)}</label>`).join('')}</fieldset>
    <div class="dialog-actions"><button id="quiz-submit" class="primary-button" disabled>정답 제출</button><button id="quiz-types">퀴즈 목록</button></div>`,'medium');
  const button=$('#quiz-submit');
  document.querySelectorAll('[name=album-choice]').forEach(input=>input.onchange=()=>button.disabled=false);
  button.onclick=()=>{
   const choice=$('[name=album-choice]:checked')?.value;
   if(choice)void commit(button,quizCommit(api.uid(),kind,(game,_shared,now)=>answerQuiz(game,kind,record.id,choice,now)),r=>question(kind,r.record));
  };
  $('#quiz-types').onclick=menu;
 }
 return {menu};
}
