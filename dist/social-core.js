import {RANK_METRICS} from './rank-metrics.js?v=2026.11.14-supply-storage';
import {PORT_BY_ID,ALL_PORTS} from './data.js?v=2026.11.14-supply-storage';
export const CHAT_LIMIT=50,CHAT_MAX_LENGTH=200,CHAT_INTERVAL=3000;
export function validCard(card){
  if(!card||!card.ref||typeof card.ref!=='object')return false;
  const {kind,ref}=card,keys=Object.keys(ref).length,port=id=>typeof id==='string'&&Object.hasOwn(PORT_BY_ID,id);
  if(kind==='port')return keys===1&&port(ref.portId);
  if(kind==='route')return keys===3&&port(ref.fromPortId)&&port(ref.toPortId)&&ref.fromPortId!==ref.toPortId&&Number.isFinite(ref.observedNm)&&ref.observedNm>0&&ref.observedNm<=100000;
  if(kind==='signal')return keys===3&&['hello','thanks','fairwind'].includes(ref.code)&&typeof ref.targetUid==='string'&&ref.targetUid.length>0&&ref.targetUid.length<=128&&typeof ref.targetName==='string'&&ref.targetName.length>0&&ref.targetName.length<=16;
  return false;
}
export function chatText(value){return String(value||'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').trim();}
export function validChat(message){return !!message&&Number.isSafeInteger(message.seq)&&message.seq>0&&typeof message.uid==='string'&&message.uid.length>0&&typeof message.name==='string'&&message.name.length>0&&message.name.length<=16&&typeof message.text==='string'&&message.text.length>0&&message.text.length<=CHAT_MAX_LENGTH&&Number.isFinite(message.at);}
export function recentChat(messages){return [...messages].filter(validChat).sort((a,b)=>a.seq-b.seq).slice(-CHAT_LIMIT);}
export function rankStats(ship){
  return Number.isInteger(ship?.money)&&ship.money>=0&&ship.money<=1e12&&Number.isInteger(ship?.profit)&&Math.abs(ship.profit)<=1e12&&Number.isInteger(ship?.visited)&&ship.visited>=1&&ship.visited<=Object.keys(PORT_BY_ID).length;
}
export function rankFleet(players,metric){
  if(!RANK_METRICS.includes(metric))return [];
  const list=players.filter(p=>(metric==='ownedPortCount'?typeof p.name==='string'&&p.ownedPortCount>=0:rankStats(p))&&Number.isInteger(p[metric])).sort((a,b)=>b[metric]-a[metric]||String(b.id).localeCompare(String(a.id)));
  let rank=0,previous=null;return list.map((p,i)=>{if(i===0||p[metric]!==previous)rank=i+1;previous=p[metric];return {...p,rank};});
}
