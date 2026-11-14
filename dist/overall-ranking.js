import {RANK_DEFINITIONS,RANK_GROUPS} from './rank-metrics.js?v=2026.11.14-harbor-chart';

const baseline={money:2400,visited:1,fleetGrowth:1};
const groups=RANK_GROUPS.filter(([id])=>id!=='overall');
const mean=values=>values.reduce((sum,n)=>sum+n,0)/values.length;
export function overallRanking(summaries,portSummaries){
  const players=Object.entries(summaries).filter(([,row])=>typeof row?.name==='string').map(([id,row])=>({
    ...row,id,ownedPortCount:portSummaries[id]?.ownedPortCount||0,points:{}
  }));
  for(const {id} of RANK_DEFINITIONS.filter(metric=>metric.group!=='overall')){
    const ranked=players.filter(row=>Number.isFinite(row[id])&&row[id]>(baseline[id]||0)).sort((a,b)=>b[id]-a[id]);
    let rank=0;
    ranked.forEach((row,index)=>{
      if(!index||row[id]!==ranked[index-1][id])rank=index+1;
      row.points[id]=100*(ranked.length-rank+1)/ranked.length;
    });
  }
  const rows=players.map(({id,name,points})=>{
    const fields=Object.fromEntries(groups.map(([group])=>[group,
      mean(RANK_DEFINITIONS.filter(metric=>metric.group===group).map(metric=>points[metric.id]||0))
    ]));
    return {id,name,overallScore:Math.round(mean(Object.values(fields))*100),
      groups:Object.fromEntries(Object.entries(fields).map(([key,value])=>[key,Math.round(value*100)])),
      points:Object.fromEntries(Object.entries(points).map(([key,value])=>[key,Math.round(value*100)]))};
  }).filter(row=>row.overallScore>0).sort((a,b)=>b.overallScore-a.overallScore||String(a.id).localeCompare(String(b.id)));
  let rank=0;
  rows.forEach((row,index)=>{if(!index||row.overallScore!==rows[index-1].overallScore)rank=index+1;row.rank=rank;});
  return {
    top:Object.fromEntries(rows.slice(0,5).map(({id,name,overallScore,rank})=>[id,{name,overallScore,rank}])),
    captains:Object.fromEntries(rows.map(({id,name,...result})=>[id,result]))
  };
}
