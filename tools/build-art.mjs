import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {SHIP_ART_NAMES,DISCOVERY_ART_IDS,shipArt,discoverySvg} from '../dist/art.js';
const root=new URL('../dist/assets/',import.meta.url),check=process.argv.includes('--check');
let count=0;
async function output(name,text){
  const target=new URL(name,root);
  if(check){if(await readFile(target,'utf8')!==text)throw Error(`그림 생성물이 원본과 다릅니다: ${name}`);}
  else {await mkdir(new URL('./',target),{recursive:true});await writeFile(target,text);}
  count++;
}
for(let i=0;i<SHIP_ART_NAMES.length;i++)await output(`ships/ship-${String(i+1).padStart(2,'0')}.svg`,shipArt(i)+'\n');
for(const id of [...DISCOVERY_ART_IDS,'unknown'])await output(`discoveries/${id}.svg`,discoverySvg(id)+'\n');
console.log(`${check?'확인':'생성'}: 선박 20종·발견물 32종·미발견 그림 1종 (${count} SVG)`);
