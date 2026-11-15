import {readFile,mkdir,readdir,writeFile} from 'node:fs/promises';
import {SHIPS} from '../dist/ship-rules.js';
import {INLAND_TIERS} from '../dist/inland.js';
import {QUIZ_REWARD_PER_DISCOVERY} from '../dist/album-quiz.js';
import {NOVICE_MAX_STAGE,NOVICE_MAX_SHIPS} from '../dist/novice.js';
import {MENU_ENTRIES} from '../dist/menu-finder.js';

const src=new URL('../docs/manual/',import.meta.url),dist=new URL('../dist/guide/',import.meta.url);
const check=process.argv.includes('--check'),utf8='utf8';
const esc=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const inline=s=>esc(s).replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/`([^`]+)`/g,'<kbd>$1</kbd>');
const numeric={'ship-tiers':SHIPS.length,'inland-tiers':INLAND_TIERS.length,'inland-max':INLAND_TIERS.at(-1).load,'quiz-factor':QUIZ_REWARD_PER_DISCOVERY,'novice-stage':NOVICE_MAX_STAGE,'novice-ships':NOVICE_MAX_SHIPS};
const menus=new Map(MENU_ENTRIES.map(row=>[row[0],row]));
const files=(await readdir(src)).filter(file=>file.endsWith('.md')).sort();
const articles=await Promise.all(files.map(async file=>{
 const data=(await readFile(new URL(file,src),utf8)).trim().replaceAll('\r','');
 const [head,...sections]=data.split('\n\n');
 const [titleLine,description,keywords,menu,version]=head.split('\n');
 if(!titleLine?.startsWith('# ')||!description||!keywords||!version?.startsWith('검토 ')||!menu?.startsWith('메뉴 '))throw Error('설명서 헤더 '+file);
 const id=file.replace(/^\d+-/,'').replace(/\.md$/,'');
 const menuIds=menu.slice(3).split(' ').filter(Boolean);
 for(const key of menuIds)if(!menus.has(key))throw Error('알 수 없는 메뉴 '+key);
 const body=sections.map(block=>block.replace(/{{([a-z-]+)}}/g,(_,key)=>{if(!Object.hasOwn(numeric,key))throw Error('알 수 없는 수치 '+key);return numeric[key];}));
 return {id,title:titleLine.slice(2),description,keywords:keywords.split('|'),version:version.slice(3),menuIds,body};
}));
const list=new Set(articles.map(a=>a.id));
if(list.size!==articles.length)throw Error('설명서 고정 주소 중복');
async function output(file,body){
 const path=new URL(file,dist);
 if(check){if(await readFile(path,utf8)!==body)throw Error('설명서 생성물이 달라요: '+file);}
 else{await mkdir(new URL('./',path),{recursive:true});await writeFile(path,body,utf8);}
}
function page(title,body,root){
 return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#f8f5e9"><title>${esc(title)} · 바람의 항로</title>
<link rel="stylesheet" href="${root}manual.css"></head><body>
<header><a href="${root}">바람의 항로 · 게임 설명서</a><a href="${root}../" data-manual-game>게임으로</a></header><main>${body}</main><script type="module" src="${root}manual-bridge.js"></script></body></html>
`;
}
function markup(text){
 if(text.startsWith('## '))return '<h2>'+inline(text.slice(3))+'</h2>';
 if(text.startsWith('- '))return '<ul>'+text.split('\n').map(line=>'<li>'+inline(line.slice(2))+'</li>').join('')+'</ul>';
 return '<p>'+inline(text.replaceAll('\n',' '))+'</p>';
}
const cards=articles.map(a=>`<a class="manual-card" href="./${a.id}/"><strong>${esc(a.title)}</strong><span>${esc(a.description)}</span></a>`).join('');
await output('index.html',page('게임 설명서',`<h1>게임 설명서</h1><label for="manual-search">어떤 도움이 필요한가요?</label>
 <input type="search" id="manual-search" placeholder="예: 배가 멈춤, 부선장 고용, 대포 사거리" maxlength="80">
 <p id="manual-status" role="status"></p><nav id="manual-quick" aria-label="처음 시작할 때"><a href="./start/">첫 출항</a><a href="./supplies/">보급·구조</a><a href="./trade/">첫 교역</a></nav>
 <div id="manual-results" class="manual-grid">${cards}</div><script type="module" src="./manual-search.js"></script>`,'./'));
for(const a of articles){
 const steps=a.menuIds.map(id=>{
  const row=menus.get(id);
  return `<li><a href="../../?menu=${id}" data-manual-menu="${id}">${esc(row[1])} 열기</a><span>PC ${esc(row[2])} · 모바일 ${esc(row[3])}</span></li>`;
 }).join('');
 const index=articles.indexOf(a),related=[articles[index-1],articles[index+1]].filter(Boolean);
 await output(a.id+'/index.html',page(a.title,`<article><h1>${esc(a.title)}</h1><p class="manual-intro">${esc(a.description)}</p>
  ${a.body.map(markup).join('\n')}
  ${steps?'<h2>게임 메뉴</h2><ul class="manual-menu">'+steps+'</ul>':''}<p class="manual-version">검토 버전 ${esc(a.version)}</p></article>
  <nav aria-label="함께 읽을 글"><a href="../">전체 글과 검색</a>${related.map(row=>`<a href="../${row.id}/">${esc(row.title)}</a>`).join('')}</nav>`,'../'));
}
await output('search-index.json',JSON.stringify(articles.map(({id,title,description,keywords,body})=>({id,title,description,keywords,body})))+'\n');
console.log('게임 설명서 '+articles.length+'편 '+(check?'확인':'생성'));
