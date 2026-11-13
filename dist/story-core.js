import {STORIES,STORY_BY_ID} from './story-catalog.js?v=2026.11.14-supply-storage';
import {PORT_BY_ID} from './data.js?v=2026.11.14-supply-storage';
import {normalizeRumorProgress} from './rumor-progress.js?v=2026.11.14-supply-storage';

const tradeKeys=new Set(STORIES.flatMap(story=>story.steps.filter(step=>step.kind==='buy'||step.kind==='sell').map(step=>[step.kind,step.port,step.good].join(':'))));
const viewKeys=new Set(STORIES.flatMap(story=>story.steps.flatMap(step=>step.menus||[])));
const tradeCounters=value=>Object.fromEntries(Object.entries(value||{}).filter(([key,count])=>tradeKeys.has(key)&&Number.isSafeInteger(count)&&count>=0&&count<=1e9));

export function normalizeStories(game){
 const old=game.storyBook||{},entries={};
 for(const story of STORIES){
  const row=old.entries?.[story.id];
  if(!row)continue;
  entries[story.id]={index:Math.max(0,Math.min(story.steps.length,Number.isInteger(row.index)?row.index:0)),
   startedAt:Number.isSafeInteger(row.startedAt)?row.startedAt:0,
   baseline:tradeCounters(row.baseline),zones:Object.fromEntries(story.steps.filter(step=>step.kind==='zone'&&row.zones?.[step.zone]===true).map(step=>[step.zone,true])),
   chapterRewards:[...new Set(row.chapterRewards||[])].filter(n=>Number.isInteger(n)&&n>=0&&n<story.chapters.length),rewarded:row.rewarded===true};
 }
 game.storyBook={version:1,entries,views:Object.fromEntries(Object.entries(old.views||{}).filter(([key,value])=>viewKeys.has(key)&&value===true)),trades:tradeCounters(old.trades),manual:old.manual===true,
  tracked:STORY_BY_ID[old.tracked]?old.tracked:'first-route'};
 return game.storyBook;
}
const book=game=>game.storyBook||normalizeStories(game);
export function storyRequirement(game,story){
 const visits=new Set(game.visited.filter(id=>PORT_BY_ID[id]?.active)).size;
 const completed=Object.entries(book(game).entries).some(([id,row])=>STORY_BY_ID[id].level==='중급'&&row.rewarded);
 return {ok:game.shipTier+1>=story.stage&&visits>=story.visits&&(story.level!=='고급'||completed),visits,completed};
}
export function startStory(game,id,now){
 const story=STORY_BY_ID[id],ledger=book(game);
 if(!story||ledger.entries[id])throw Error('이야기의 진행 기록을 확인하세요.');
 if(!storyRequirement(game,story).ok)throw Error('선박 단계·방문 항구·중급 완료 조건을 확인하세요.');
 if(!game.port||game.voyage||game.explorationLockedUntilSailing)throw Error('항구에 정상 정박한 뒤 이야기를 시작하세요.');
 if(story.level!=='초보'&&game.port!==story.origin)throw Error(PORT_BY_ID[story.origin].name+'의 조합에서 이야기를 시작하세요.');
 ledger.entries[id]={index:0,startedAt:now,baseline:{...ledger.trades},zones:{},chapterRewards:[],rewarded:false};
 ledger.tracked=id;
 return {message:story.name+' 이야기를 시작했어요.'};
}
export function recordStoryView(game,id){book(game).views[id]=true;return refreshStories(game);}
export function recordStoryTrade(game,port,good,qty,mode){
 const ledger=book(game),key=[mode,port,good].join(':');
 if(tradeKeys.has(key))ledger.trades[key]=Math.min(1e9,(ledger.trades[key]||0)+qty);
 return refreshStories(game);
}
function stepComplete(game,story,row,step){
 const ledger=book(game);
 if(step.kind==='view')return step.menus.every(id=>ledger.views[id]);
 if(step.kind==='manual')return ledger.manual;
 if(step.kind==='port')return !game.voyage&&!game.explorationLockedUntilSailing&&game.port===step.port;
 if(step.kind==='depart')return !game.voyage?.kind&&game.voyage?.target===step.port;
 if(step.kind==='buy'||step.kind==='sell'){
  const key=[step.kind,step.port,step.good].join(':');
  if(story.id==='first-route'&&step.good==='wine')return step.kind==='buy'?game.boughtLisbonWine:game.soldAway;
  return (ledger.trades[key]||0)-(row.baseline[key]||0)>=step.qty;
 }
 if(step.kind==='rumor')return !!((game.rumors||[]).length||(game.rumorProgress?.read||[]).length);
 if(step.kind==='discovery')return !!game.discoveries?.[step.discovery];
 if(step.kind==='zone')return row.zones[step.zone]===true;
 return false;
}
export function refreshStories(game){
 const ledger=book(game);let changed=false;
 for(const [id,row] of Object.entries(ledger.entries)){
  const story=STORY_BY_ID[id];
  while(row.index<story.steps.length&&stepComplete(game,story,row,story.steps[row.index])){row.index++;changed=true;}
 }
 return changed;
}
export function recordStorySailing(game,from,to){
 if(game.explorationLockedUntilSailing||['rescue','transition'].includes(game.voyage?.kind)||Math.abs(to[1]-from[1])>90)return;
 const ledger=book(game),longitude=((to[0]-from[0]+540)%360)-180;
 for(const [id,row] of Object.entries(ledger.entries)){
  const step=STORY_BY_ID[id].steps[row.index];
  if(step?.kind!=='zone')continue;
  const [west,east,south,north]=step.bounds;
  for(let sample=0;sample<=8;sample++){
   const t=sample/8,lon=((from[0]+longitude*t+540)%360)-180,lat=from[1]+(to[1]-from[1])*t;
   if(lon>=west&&lon<=east&&lat>=south&&lat<=north){row.zones[step.zone]=true;break;}
  }
 }
 refreshStories(game);
}
export function completedChapter(story,row,index){return row.index>=story.steps.filter(step=>step.chapter<=index).length;}
export function storyAction(game,id,action,now,chapterIndex){
 const story=STORY_BY_ID[id];
 if(action==='start')return startStory(game,id,now);
 const ledger=book(game),row=ledger.entries[id];
 if(!story||!row)throw Error('먼저 이야기를 시작하세요.');
 refreshStories(game);
 const step=story.steps[row.index];
 if(action==='track'){ledger.tracked=id;return {message:'이 이야기를 항해 패널에서 추적해요.'};}
 if(action==='chapter'){
  if(story.id!=='first-route'||!Number.isInteger(chapterIndex)||!completedChapter(story,row,chapterIndex)||chapterIndex<0||chapterIndex>=6||row.chapterRewards.includes(chapterIndex))throw Error('수령할 장 보상을 확인하세요.');
  row.chapterRewards.push(chapterIndex);game.money+=200;
  return {message:(chapterIndex+1)+'장 보상 200 D 수령'};
 }
 if(action==='advance'||action==='skip'){
  if(!step||action==='skip'&&!step.optional)throw Error('이 단계는 실제 행동으로 완료하세요.');
  if(action==='advance'&&!['talk','deliver'].includes(step.kind))throw Error('안내된 행동을 먼저 완료하세요.');
  if(step.kind==='deliver'&&action!=='skip'){
   if(game.port!==step.port||game.voyage||game.explorationLockedUntilSailing)throw Error('지정한 항구에 입항해 납품하세요.');
   const cargo=game.cargo[step.good];
   if(!cargo||cargo.qty<step.qty)throw Error('납품할 화물 '+step.qty+'상자가 필요해요.');
   const remaining=cargo.qty-step.qty;
   if(remaining)game.cargo[step.good]={qty:remaining,cost:cargo.cost*remaining/cargo.qty};
   else delete game.cargo[step.good];
  }
  row.index++;refreshStories(game);
  return {message:'이야기의 다음 단계로 이어갑니다.'};
 }
 if(action==='claim'){
  if(row.index!==story.steps.length||row.rewarded)throw Error('이야기를 끝내거나 보상 수령 기록을 확인하세요.');
  if(!game.port||game.voyage||game.explorationLockedUntilSailing)throw Error('정상 입항 후 완료 보상을 받으세요.');
  game.money+=story.cash;
  if(story.reward){
   game.rumorProgress=normalizeRumorProgress(game);
   const progress=game.rumorProgress;
   if(story.reward.startsWith('O'))progress.officers=[...new Set([...progress.officers,story.reward])];
   else{progress.items[story.reward]=1;progress.acquiredItems=[...new Set([...progress.acquiredItems,story.reward])];}
   progress.read=[...new Set([...progress.read,story.reward])];
  }
  row.rewarded=true;
  return {message:story.name+' 완료 · '+story.cash+' D'+(story.reward?' · 전용 보상 획득':'')};
 }
 throw Error('이야기 행동을 확인하세요.');
}
