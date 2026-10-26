export const CHAT_LIMIT=50,CHAT_MAX_LENGTH=200,CHAT_INTERVAL=3000;
export function chatText(value){return String(value||'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').trim();}
export function validChat(message){return !!message&&Number.isSafeInteger(message.seq)&&message.seq>0&&typeof message.uid==='string'&&message.uid.length>0&&typeof message.name==='string'&&message.name.length>0&&message.name.length<=16&&typeof message.text==='string'&&message.text.length>0&&message.text.length<=CHAT_MAX_LENGTH&&Number.isFinite(message.at);}
export function recentChat(messages){return [...messages].filter(validChat).sort((a,b)=>a.seq-b.seq).slice(-CHAT_LIMIT);}
export function rankStats(ship){
  return Number.isInteger(ship?.money)&&ship.money>=0&&ship.money<=1e12&&Number.isInteger(ship?.profit)&&Math.abs(ship.profit)<=1e12&&Number.isInteger(ship?.visited)&&ship.visited>=1&&ship.visited<=64;
}
export function rankFleet(players,metric){
  if(!['profit','money','visited'].includes(metric))return [];
  const list=players.filter(rankStats).sort((a,b)=>b[metric]-a[metric]||a.name.localeCompare(b.name,'ko')||a.id.localeCompare(b.id));
  let rank=0,previous=null;return list.map((p,i)=>{if(i===0||p[metric]!==previous)rank=i+1;previous=p[metric];return {...p,rank};});
}
