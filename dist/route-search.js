import {canDepart,voyageEstimate,ship} from './engine.js?v=2026.11.17-promoted-ports-and-content';

const number=n=>Math.round(n).toLocaleString('ko-KR');
export function summarizeSearchRoute(game,port,route,canalNames={},preliminary=false,at){
 if(port.id===game.port&&!game.voyage)return {distance:0,text:'정박 중 · 0해리'};
 const suffix=preliminary?' · 운하 확인 전, 우회 기준':'';
 if(!route)return {distance:Infinity,text:'현재 선단으로 갈 수 있는 항로를 찾지 못했어요.'+suffix};
 const estimate=voyageEstimate(game,route,0,at),depart=canDepart(game,route,at),needed=estimate.food+ship(game).reserve;
 const routeNames=(route.passages||[]).map(pass=>canalNames[pass.id]).filter(Boolean);
 const passage=routeNames.length?' · '+routeNames.join('·')+' 경유 · 통행료 '+number(route.tollTotal||0)+' D':'';
 const supply=!depart.ok&&game.food+1e-8<needed?` · 직항 보급 부족 (필요 ${needed.toFixed(1)}일분 / 현재 ${game.food.toFixed(1)}일분)`:!depart.ok?' · '+depart.error:'';
 const toll=game.money<(route.tollTotal||0)?' · 통행료 부족':'';
 return {distance:route.total,text:`${number(route.total)}해리 · 약 ${estimate.days.toFixed(1)}일${passage}${supply}${toll}${suffix}`};
}
export function createRouteLookup(prepare,compute){
 const rows=new Map();
 let options;
 return port=>{
  if(!rows.has(port.id)){
   options??=Promise.resolve().then(prepare);
   const pending=options.then(data=>compute(port,data)).catch(()=>({distance:Infinity,text:'항로를 계산하지 못했어요. 다시 계산해 주세요.'}));
   rows.set(port.id,pending);
  }
  return rows.get(port.id);
 };
}
export async function fillSearchRoutes(ports,lookup,show,active,step=()=>new Promise(resolve=>setTimeout(resolve,0))){
 for(const port of ports){
  if(!active())return;
  await step();
  if(!active())return;
  const result=await lookup(port);
  if(active())show(port,result);
 }
}
