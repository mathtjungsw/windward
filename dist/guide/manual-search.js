const input=document.querySelector('#manual-search'),target=document.querySelector('#manual-results'),status=document.querySelector('#manual-status');
const original=[...target.children];
const normalize=text=>text.normalize('NFKC').toLowerCase().replace(/\s/g,'');
let index,generation=0;
function score(row,q,parts){
 const title=normalize(row.title),aliases=row.keywords.map(normalize),text=normalize(row.body.join(' '));
 if(q===title)return 12;
 if(aliases.includes(q))return 10;
 if(title.includes(q))return 8;
 if(aliases.some(a=>a.includes(q)))return 6;
 if(text.includes(q))return 4;
 return parts.every(part=>normalize([row.title,...row.keywords,...row.body].join(' ')).includes(part))?2:0;
}
async function search(){
 const current=++generation,raw=input.value.trim(),q=normalize(raw),parts=raw.split(/\s+/).map(normalize);
 if(!q){target.replaceChildren(...original);status.textContent='';return;}
 status.textContent='설명서를 검색하고 있어요…';
 try{
  index??=fetch('./search-index.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error();return r.json();}).catch(error=>{index=null;throw error;});
  const rows=await index;
  if(current!==generation)return;
  const matches=rows.map(row=>({row,priority:score(row,q,parts)})).filter(r=>r.priority).sort((a,b)=>b.priority-a.priority);
  const cards=matches.map(({row})=>{
   const a=document.createElement('a'),title=document.createElement('strong'),summary=document.createElement('span');
   a.className='manual-card';a.href='./'+row.id+'/';title.textContent=row.title;
   const excerpt=row.body.find(p=>!p.startsWith('## ')&&normalize(p).includes(q));
   summary.textContent=excerpt?excerpt.replace(/\*\*|`/g,''):row.description;
   a.append(title,summary);return a;
  });
  target.replaceChildren(...cards);status.textContent=cards.length?cards.length+'개 글을 찾았어요.':'찾은 글이 없어요. 짧은 단어로 다시 검색해 보세요.';
 }catch{if(current===generation)status.textContent='검색 자료를 불러오지 못했어요. 아래 목차에서 글을 열 수 있어요.';}
}
input.addEventListener('input',search);
const preset=new URLSearchParams(location.search).get('q');
if(preset){input.value=preset.slice(0,80);void search();}
