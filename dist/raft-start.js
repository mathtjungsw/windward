import {SHIPS,shipTier,fleetCount,syncFleet} from './ship-rules.js?v=2026.11.12-collections-ranks-historic-ships';
import {PORT_BY_ID,ACTIVE_PORT_BY_ID} from './data.js?v=2026.11.12-collections-ranks-historic-ships';

export const RAFT_START_ID='raft-start-2026-11-06';
// Replacement value: one hull's cumulative upgrades plus the current quote
// for each additional hull. No historical purchase ledger exists in old saves.
export function fleetAppraisal(s){
 const tier=shipTier(s),n=fleetCount(s),upgrades=SHIPS.slice(0,tier+1).reduce((v,p)=>v+p.cost,0);
 return upgrades+Array.from({length:n-1},(_,i)=>[6000,15000,35000,75000][i]+Math.floor(upgrades*.25)).reduce((v,p)=>v+p,0);
}
export function applyRaftStart(s,at=Date.now()){
 if(s.raftStart?.id===RAFT_START_ID)return {applied:false,refund:0};
 const tier=shipTier(s),n=fleetCount(s),refund=fleetAppraisal(s),downgraded=tier>0||n>1;
 if(!Number.isSafeInteger(s.money+refund)||s.money+refund>1e12)throw Error('보상 후 자금 한도를 확인해야 해요. 원본은 유지됩니다.');
 const oldSpec=SHIPS[tier],totalFood=s.food*n,keptFood=Math.min(10,totalFood);
 let returnedPort=null;
 if(downgraded&&!s.port){
  const visited=new Set(s.visited),order=[s.voyage?.origin,...(s.recentPorts||[]),...[...s.visited].reverse()];
  returnedPort=order.find(id=>visited.has(id)&&ACTIVE_PORT_BY_ID[id])||order.find(id=>visited.has(id)&&PORT_BY_ID[id]);
  if(!returnedPort)throw Error('방문한 귀환 항구를 확인해야 해요. 원본은 유지됩니다.');
 }
 s.money+=refund;s.shipTier=0;s.fleetCount=1;s.level=0;
 syncFleet(s,[{id:'vessel-0',tier:0}],'vessel-0');
 s.food=keptFood;s.supplyCreditValue=(s.supplyCreditValue||0)+(totalFood-keptFood)*oldSpec.supplyPrice;
 const grant={id:RAFT_START_ID,fromTier:tier,fromFleetCount:n,refund,at};
 if(returnedPort){grant.returnedPort=returnedPort;grant.fromPosition=[...s.position];s.port=returnedPort;s.position=[PORT_BY_ID[returnedPort].lon,PORT_BY_ID[returnedPort].lat];s.voyage=null;s.controlMode='auto';s.legacyHarbor=!ACTIVE_PORT_BY_ID[returnedPort];s.explorationLockedUntilSailing=true;delete s.detourTarget;delete s.transitionPending;delete s.rescueReplanPending;}
 s.raftStart=grant;
 s.log=[{day:s.day,type:'reward',text:`전체 선장 뗏목 시작 적용 · 선박 차액 ${refund.toLocaleString('ko-KR')} D 지급.${returnedPort?' 방문했던 '+PORT_BY_ID[returnedPort].name+'로 무료 귀환.':''}`},...(s.log||[])].slice(0,50);
 return {applied:true,refund,downgraded,returnedPort};
}
