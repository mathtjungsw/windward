import {shipyardTrade} from './historical-ships.js?v=2026.11.13-stories-harbors-tax.1';
import {recordTrade} from './rank-progress.js?v=2026.11.13-stories-harbors-tax.1';
import {PORT_BY_ID,GOODS} from './data.js?v=2026.11.13-stories-harbors-tax.1';
import {usedSpace,capacity,tradingPort} from './engine.js?v=2026.11.13-stories-harbors-tax.1';
import {tradeQuote} from './market-rules.js?v=2026.11.13-stories-harbors-tax.1';
import {advanceBasicIncome,claimBasicIncome} from './port-income.js?v=2026.11.13-stories-harbors-tax.1';
import {saleBonus,tradeVoucher} from './rumor-progress.js?v=2026.11.13-stories-harbors-tax.1';
import {recordStoryTrade} from './story-core.js?v=2026.11.13-stories-harbors-tax.1';
export function captainTradeQuote(game,portId,goodId,qty,mode,item,now,rate){
 const quote=tradeQuote(portId,goodId,qty,mode,item,now,rate);
 const bonus=mode==='sell'&&game?Math.floor(quote.total*saleBonus(game,portId,goodId)+1e-9):0;
 const voucher=tradeVoucher(game,mode,portId,goodId,qty,quote.total);
 return {...quote,voucher,bonus:bonus+(mode==='sell'?voucher:0),total:quote.total+bonus+(mode==='sell'?voucher:-voucher)};
}
export const NEUTRAL_PORTS=['lisbon','porto'];
export const LARGE_PORTS=['london','amsterdam','venice','alexandria','istanbul','macau','shanghai','nagasaki','havana','buenos','sydney'];
export const investmentBase=id=>LARGE_PORTS.includes(id)?600000:200000;
export function ownership(content={}){const entries=Object.entries(content.investors||{}).filter(([,n])=>Number.isSafeInteger(n)&&n>0),total=entries.reduce((a,[,n])=>a+n,0),owner=entries.find(([,n])=>n*2>total);return {total,ownerUid:content.developedOwner||owner?.[0]||null};}
export function taxRate(content,uid,portId){const owner=ownership(content).ownerUid;return NEUTRAL_PORTS.includes(portId)||!owner||owner===uid?0:Math.max(0,Math.min(10,content.rates?.[uid]??content.defaultRate??0));}
export function permitted(content,uid){return !ownership(content).ownerUid||!(content.blacklist||[]).includes(uid);}
export function invest(game,content,uid,portId,amount,now=Date.now()){if(game.port!==portId||game.voyage||NEUTRAL_PORTS.includes(portId)||portId.startsWith('developed-'))throw Error('이 항구에는 지분 투자할 수 없어요.');if(!Number.isSafeInteger(amount)||amount<=0||amount%10000)throw Error('투자는 10,000 D 단위로 입력하세요.');const old=ownership(content);if(!old.total&&amount<investmentBase(portId))throw Error('최초 투자는 '+investmentBase(portId).toLocaleString('ko-KR')+' D 이상이에요.');if(amount>game.money)throw Error('투자할 두카트가 부족해요.');
 advanceBasicIncome(content,portId,old.ownerUid,now);game.money-=amount;content.investors??={};content.investors[uid]=(content.investors[uid]||0)+amount;if(content.investors[uid]>1e12)throw Error('투자 한도를 확인하세요.');const next=ownership(content);content.ownerUid=next.ownerUid;if(old.ownerUid!==next.ownerUid){delete content.officerIncome;if(next.ownerUid)content.ownerSince=now;else delete content.ownerSince;}advanceBasicIncome(content,portId,next.ownerUid,now);if(old.ownerUid!==next.ownerUid){content.defaultRate=0;content.rates={};content.blacklist=[];}game.investedPorts=[...new Set([...(game.investedPorts||[]),portId])];return {ok:true,...next,share:content.investors[uid]/next.total*100};}
export function executeTrade(game,content,uid,portId,goodId,qty,mode,quote,now,revision){const p=tradingPort(game),g=GOODS[goodId];if(p?.id!==portId||!g||!permitted(content,uid))throw Error('현재 입항한 항구의 교역 권한을 확인하세요.');if(p.developable&&(content.development?.level||0)<2)throw Error('교역소 2단계 확장 뒤 거래할 수 있어요.');if(mode==='buy'&&(g.legacy||!(p.market.includes(goodId)||g.premium&&g.source===portId)))throw Error('이 항구에서 구매할 수 없어요.');if(!quote||now-quote.at>5000||now<quote.at-1000||quote.revision!==revision)throw Error('시세가 바뀌었어요. 새 금액을 확인해 주세요.');
 const item={...(content.markets?.[goodId]||{}),revision},actual=captainTradeQuote(game,portId,goodId,qty,mode,item,quote.at,taxRate(content,uid,portId));actual.next=tradeQuote(portId,goodId,qty,mode,item,now,taxRate(content,uid,portId)).next;if(actual.total!==quote.total)throw Error('시세가 바뀌었어요. 새 금액을 확인해 주세요.');const old=game.cargo[goodId]||{qty:0,cost:0};
 if(mode==='buy'){if(usedSpace(game)+qty>capacity(game)||game.money<actual.total)throw Error('화물 공간과 두카트를 확인하세요.');game.money-=actual.total;game.cargo[goodId]={qty:old.qty+qty,cost:old.cost+actual.total};if(portId==='lisbon'&&goodId==='wine')game.boughtLisbonWine=true;}
 else{if(old.qty<qty)throw Error('판매할 화물이 부족해요.');const cost=old.cost*qty/old.qty;game.money+=actual.total;game.profit+=actual.total-cost;if(old.qty===qty)delete game.cargo[goodId];else game.cargo[goodId]={qty:old.qty-qty,cost:old.cost-cost};if(portId!=='lisbon'&&goodId==='wine'&&game.boughtLisbonWine)game.soldAway=true;}
 const owner=ownership(content).ownerUid;if(owner&&!content.basicIncome?.period)advanceBasicIncome(content,portId,owner,now);if(owner&&actual.tax){content.treasury??={};content.treasury[owner]=(content.treasury[owner]||0)+actual.tax;}
 if(actual.voucher)delete game.rumorProgress.vouchers[mode];
 content.markets??={};content.markets[goodId]=actual.next;game.trades++;if(!game.explorationLockedUntilSailing)shipyardTrade(game,goodId);recordTrade(game,goodId,mode,mode==='sell'?actual.total-old.cost*qty/old.qty:0,now);recordStoryTrade(game,portId,goodId,qty,mode);return {ok:true,...actual};
}
export function changePortPolicy(content,uid,defaultRate,rates,blacklist){if(ownership(content).ownerUid!==uid)throw Error('현재 소유자만 변경할 수 있어요.');if(!Number.isFinite(defaultRate)||defaultRate<0||defaultRate>10||Object.keys(rates).length>100||Object.values(rates).some(n=>!Number.isFinite(n)||n<0||n>10)||blacklist.length>20)throw Error('세율 0~10%, 제한 선장 최대 20명을 확인하세요.');content.defaultRate=defaultRate;content.rates=rates;content.blacklist=blacklist;return {ok:true};}
export function withdrawBasicIncome(game,content,uid,portId,now){
 if(game.port!==portId||game.voyage)throw Error('해당 항구에서 기본 세수를 수령하세요.');
 const amount=claimBasicIncome(content,portId,uid,ownership(content).ownerUid,now);
 game.money+=amount;
 return {ok:true,message:amount?'기본 세수 '+amount.toLocaleString('ko-KR')+' D 수령':'이 항구의 기본 세수 적립을 시작했어요.'};
}
export function withdrawTax(game,content,uid){const n=content.treasury?.[uid]||0;if(!n)throw Error('인출할 세금이 없어요.');game.money+=n;content.treasury[uid]=0;return {ok:true,total:n};}
