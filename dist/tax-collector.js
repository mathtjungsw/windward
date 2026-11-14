import {ownership} from './commerce.js?v=2026.11.14-harbor-chart';
import {claimBasicIncome,estimateBasicIncome} from './port-income.js?v=2026.11.14-harbor-chart';
import {PORT_BY_ID} from './data.js?v=2026.11.14-harbor-chart';

export const COLLECTOR_PRICE=50000;
export const COLLECTOR_INTERVAL=30*60*1000;
const validTime=value=>Number.isSafeInteger(value)&&value>=0;
const portOrder=(a,b)=>(PORT_BY_ID[a]?.name||a).localeCompare(PORT_BY_ID[b]?.name||b,'ko')||a.localeCompare(b);

export function normalizeCollector(value){
 if(!value)return null;
 if(!validTime(value.boughtAt)||!validTime(value.routeAt))throw Error('징수선의 순회 기록을 확인하세요.');
 const order=[...new Set(value.order||[])].filter(id=>PORT_BY_ID[id]);
 const visits=Object.fromEntries(Object.entries(value.visits||{}).filter(([id,time])=>PORT_BY_ID[id]&&validTime(time)));
 const remainder=Number.isInteger(value.remainder)&&value.remainder>=0&&value.remainder<100?value.remainder:0;
 const receipts=(value.receipts||[]).filter(row=>PORT_BY_ID[row.port]&&validTime(row.at)&&['gross','fee','net'].every(key=>Number.isSafeInteger(row[key])&&row[key]>=0)&&row.net+row.fee===row.gross).slice(0,20);
 return {boughtAt:value.boughtAt,routeAt:value.routeAt,order,visits,remainder,receipts,
  gross:Number.isSafeInteger(value.gross)?Math.max(0,value.gross):0,
  fees:Number.isSafeInteger(value.fees)?Math.max(0,value.fees):0};
}

export function buyCollector(game,ports,now){
 if(game.taxCollector)throw Error('이미 세금 징수선을 보유하고 있어요.');
 if(!game.port||game.voyage)throw Error('항구에 정박해서 징수선을 구매하세요.');
 if(game.money<COLLECTOR_PRICE)throw Error('징수선 구입에 50,000 D가 필요해요.');
 game.money-=COLLECTOR_PRICE;
 game.taxCollector={boughtAt:now,routeAt:now,order:[...new Set(ports)].sort(portOrder),visits:{},remainder:0,receipts:[],gross:0,fees:0};
 return {message:'세금 징수선을 구입했어요. 첫 항구는 30분 뒤 방문합니다.'};
}

export function updateCollectorRoute(game,ports,now){
 const collector=game.taxCollector;
 if(!collector)return false;
 const ids=new Set(ports),order=collector.order.filter(id=>ids.has(id));
 order.push(...[...ids].filter(id=>!order.includes(id)).sort(portOrder));
 if(JSON.stringify(order)===JSON.stringify(collector.order))return false;
 collector.order=order;collector.routeAt=now;
 return true;
}

export function collectorVisits(collector,now){
 if(!collector?.order.length)return [];
 const cycle=collector.order.length*COLLECTOR_INTERVAL;
 return collector.order.map((port,index)=>{
  const first=collector.routeAt+(index+1)*COLLECTOR_INTERVAL;
  const due=first>now?first:first+Math.floor((now-first)/cycle)*cycle;
  const pending=due<=now&&due>(collector.visits[port]||0);
  return {port,at:due,pending,next:pending?due:Math.max(first,due+(due<=now?cycle:0))};
 }).sort((a,b)=>a.next-b.next||a.port.localeCompare(b.port));
}

export function collectPortTaxes(game,content,uid,port,dueAt,now){
 const collector=game.taxCollector;
 const visit=collectorVisits(collector,now).find(row=>row.port===port&&row.pending&&row.at===dueAt);
 if(!visit)throw Error('아직 방문 시각이 아니거나 이미 징수한 항구예요.');
 const owner=port.startsWith('depot-')?content.registeredOwner:ownership(content).ownerUid;
 if(owner!==uid||content.ownerSince>dueAt){
  collector.visits[port]=dueAt;
  return {message:'소유 기간을 확인해 이번 징수는 건너뛰었어요.',gross:0};
 }
 const income=estimateBasicIncome(content,port,uid,owner,now);
 const basic=income.canStart||income.accrued?claimBasicIncome(content,port,uid,owner,now):0;
 const trade=content.treasury?.[uid]||0;
 const gross=basic+trade;
 const feeUnits=gross*5+collector.remainder;
 const fee=Math.floor(feeUnits/100),net=gross-fee;
 if(!Number.isSafeInteger(gross)||game.money+net>1e12)throw Error('보유금 한도를 확인한 뒤 세금을 수령하세요.');
 if(content.treasury)content.treasury[uid]=0;
 game.money+=net;
 collector.remainder=feeUnits%100;collector.visits[port]=dueAt;
 collector.gross+=gross;collector.fees+=fee;
 collector.receipts.unshift({port,at:now,scheduledAt:dueAt,gross,fee,net});
 collector.receipts=collector.receipts.slice(0,20);
 return {message:PORT_BY_ID[port].name+' · 징수 '+gross+' D / 수수료 '+fee+' D / 수령 '+net+' D',gross,fee,net};
}

export function createTaxCollector(api){
 let running=false,lastCheck=0;
 const time=at=>new Date(at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',dateStyle:'short',timeStyle:'short'});
 const fmt=n=>Number(n||0).toLocaleString('ko-KR');
 async function myPorts(){return (await api.owned()).filter(row=>row.ownerUid===api.account.uid).map(row=>row.id);}
 async function tick(force=false){
  if(running||!api.game().taxCollector||!api.account.ready||api.account.busy||api.account.economicUncertain||!navigator.onLine||!force&&Date.now()-lastCheck<30000)return;
  running=true;lastCheck=Date.now();
  try{
   const ids=await myPorts();
   if(JSON.stringify(ids.slice().sort())!==JSON.stringify(api.game().taxCollector.order.slice().sort())){
    await api.account.atomicAction('personal',api.account.uid,(game,_content,now)=>{updateCollectorRoute(game,ids,now);return {ok:true};});
   }
   const due=collectorVisits(api.game().taxCollector,api.now()).filter(row=>row.pending).slice(0,10);
   for(const visit of due){
    if(!api.account.ready||api.account.economicUncertain)break;
    await api.account.atomicAction(visit.port.startsWith('depot-')?'projects':'ports',visit.port,(game,content,now)=>collectPortTaxes(game,content,api.account.uid,visit.port,visit.at,now));
   }
  }catch(error){if(force)api.toast(error.message,'error');}
  finally{running=false;}
 }
 async function open(){
  if(!api.account.ready)return api.toast('로그인한 뒤 징수선을 이용하세요.');
  await tick(true);
  const collector=api.game().taxCollector;
  const rows=collectorVisits(collector,api.now());
  const receipts=collector?.receipts||[];
  const description='<p>계정당 가상 1척 · 항구마다 현실 30분 · 징수액의 5% 수수료</p><p class="modal-meta">오프라인분은 다음 접속 때 장부의 귀속액을 합산 정산해요. 기본 세수는 기존 72시간 적립 한도를 따릅니다.</p>';
  api.modal('세금 징수선','소유 항구 자동 순회',description+(collector?`
   <p>누적 징수 ${fmt(collector.gross)} D · 누적 수수료 ${fmt(collector.fees)} D</p>
   <h3>다음 방문과 순회 목록</h3>${rows.map(row=>`<p>${PORT_BY_ID[row.port].name} · ${row.pending?'정산 대기':time(row.next)}</p>`).join('')||'<p>내 소유 항구가 생기면 순회를 시작해요.</p>'}
   <h3>최근 징수 영수증</h3><div class="tax-receipts">${receipts.map(row=>`<article><strong>${PORT_BY_ID[row.port].name} · ${time(row.at)}</strong><small>징수 ${fmt(row.gross)} / 수수료 ${fmt(row.fee)} / 실수령 ${fmt(row.net)} D</small></article>`).join('')||'<p>아직 징수한 세금이 없어요.</p>'}</div>`:
   `<p>구매가 ${fmt(COLLECTOR_PRICE)} D · 선단 정원과 보급은 사용하지 않아요.</p><button id="collector-buy">세금 징수선 구매</button>`),'medium');
  const button=document.querySelector('#collector-buy');
  if(button)button.onclick=async()=>{
   button.disabled=true;
   try{
    const ports=await myPorts();
    await api.account.atomicAction('personal',api.account.uid,(game,_content,now)=>buyCollector(game,ports,now));
    await open();
   }catch(error){api.toast(error.message,'error');button.disabled=false;}
  };
 }
 return {tick,open};
}
