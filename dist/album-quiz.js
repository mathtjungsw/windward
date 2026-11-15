import {DISCOVERIES,DISCOVERY_BY_ID,DISCOVERY_KINDS} from './discoveries-catalog.js?v=2026.11.15-server-blessings';
import {discoveryStats} from './discoveries.js?v=2026.11.15-server-blessings';

export const QUIZ_KINDS={all:'전체 도감',...DISCOVERY_KINDS};
const DAY=86400000, KST=9*3600000;
export const quizDay=now=>Math.floor((now+KST)/DAY);
export const quizResetAt=now=>(quizDay(now)+1)*DAY-KST;
export const QUIZ_REWARD_PER_DISCOVERY=95.5;
export const quizReward=count=>count>=1?Math.max(1000,Math.ceil(count*QUIZ_REWARD_PER_DISCOVERY/100)*100):0;
const quizDifficulty=count=>count>=75?5:count>=50?4:count>=25?3:count>=10?2:1;

function shuffle(values,random){
 const items=[...values];
 for(let i=items.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[items[i],items[j]]=[items[j],items[i]];}
 return items;
}
function normal(value){return value.replace(/[·ㆍ《》\s]/g,'').toLowerCase();}
export function quizPrompt(d){
 if(!d?.description)return '';
 let text=d.description;
 // Some older cards open by repeating the entry title or a recognizable part of it.
 const words=d.name.match(/[가-힣A-Za-z]{3,}/g)||[];
 const exempt=new Set(['기록','흔적','무덤','화석','장치','유적','수로','해안','사본','항해','점토판','항구']);
 const identifying=words.filter(w=>!exempt.has(w)&&![...Object.values(DISCOVERY_KINDS)].includes(w));
 for(const phrase of [d.name,...identifying].sort((a,b)=>b.length-a.length))text=text.replaceAll(phrase,'▢');
 return text;
}
export function quizStatus(game,kind,now){
 const day=quizDay(now),record=game.albumQuiz?.[kind]?.find(q=>q.day===day);
 const owned=Object.keys(game.discoveries||{}).map(id=>DISCOVERY_BY_ID[id]).filter(d=>d&&(kind==='all'||d.kind===kind));
 const count=record?.count??discoveryStats(game).foundCount;
 return {record,owned,count,reward:record?.reward??quizReward(count),day};
}
export function openQuiz(game,kind,now,random=Math.random){
 if(!Object.hasOwn(QUIZ_KINDS,kind))return {ok:false,error:'퀴즈 종류를 확인해 주세요.'};
 const {record,owned,count,reward,day}=quizStatus(game,kind,now);
 if(record)return {noWrite:true,record};
 if(!owned.length)return {ok:false,error:'이 범위에서 발견물을 모으면 퀴즈가 열려요.'};
 const used=new Set(Object.values(game.albumQuiz||{}).flatMap(list=>list.filter(q=>q.day===day).map(q=>q.correct)));
 const recent=new Set((game.albumQuiz?.[kind]||[]).filter(q=>q.day>=day-3).map(q=>q.correct));
 const preferred=owned.filter(d=>!used.has(d.id)&&!recent.has(d.id));
 const unused=owned.filter(d=>!used.has(d.id));
 const pool=preferred.length?preferred:unused.length?unused:owned;
 const target=pool[Math.floor(random()*pool.length)];
 const difficulty=quizDifficulty(count);
 const candidates=shuffle(DISCOVERIES.filter(d=>d.id!==target.id&&normal(d.name)!==normal(target.name)),random);
 if(difficulty>=2)candidates.sort((a,b)=>affinity(b,target,game,difficulty)-affinity(a,target,game,difficulty));
 const seen=new Set([normal(target.name)]),decoys=[];
 for(const item of candidates){
  const key=normal(item.name);
  if(!seen.has(key)){decoys.push(item.id);seen.add(key);}
  if(decoys.length===4)break;
 }
 const question={day,id:`${day}-${kind}-${target.id}`,correct:target.id,options:shuffle([target.id,...decoys],random),count,reward,difficulty};
 game.albumQuiz??={};
 game.albumQuiz[kind]=[question,...(game.albumQuiz[kind]||[]).filter(q=>q.day>=day-3)].slice(0,4);
 return {ok:true,quiet:true,record:question};
}
function affinity(a,b,game,difficulty){
 return (difficulty<=3&&game.discoveries?.[a.id]?2:0)+(a.kind===b.kind?4:0)+(difficulty>=3&&a.region===b.region?2:0)+(difficulty>=4&&a.art&&a.art===b.art?1:0)+(difficulty>=4&&a.tier===b.tier?1:0);
}
export function answerQuiz(game,kind,questionId,choice,now){
 if(!Object.hasOwn(QUIZ_KINDS,kind))return {ok:false,error:'퀴즈 종류를 확인해 주세요.'};
 const record=quizStatus(game,kind,now).record;
 if(!record||record.id!==questionId)return {ok:false,error:'오늘 날짜가 바뀌었어요. 오늘의 퀴즈를 다시 열어 주세요.'};
 if(record.answer)return {noWrite:true,record};
 if(!record.options.includes(choice))return {ok:false,error:'보기에서 하나를 선택해 주세요.'};
 if(choice===record.correct&&game.money+record.reward>1e12)return {ok:false,error:'두카트 보유 한도를 확인해 주세요.'};
 record.answer=choice;record.answeredAt=now;
 record.paid=choice===record.correct?record.reward:0;
 game.money+=record.paid;
 return {ok:true,quiet:true,record};
}
export function quizCommit(uid,kind,step){
 return (game,content,now)=>{
  const result=step(game,content,now);
  if(!result?.ok||result.noWrite)return result;
  const q=result.record;
  result.extras={['albumQuizDays/'+uid+'/'+kind]:{day:q.day,question:q.id,count:q.count,reward:q.reward,correct:q.correct,...(q.answer?{choice:q.answer,paid:q.paid}:{})}};
  return result;
 };
}
