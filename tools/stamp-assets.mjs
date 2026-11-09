import {readFile,writeFile,readdir} from 'node:fs/promises';
const root=new URL('../dist/',import.meta.url),releases=JSON.parse(await readFile(new URL('../docs/releases.json',import.meta.url),'utf8'));
const version=releases.find(r=>r.published).id.replace(/[^a-zA-Z0-9.-]/g,''),check=process.argv.includes('--check');
for(const name of (await readdir(root)).filter(n=>n.endsWith('.js'))){const file=new URL(name,root),before=await readFile(file,'utf8'),after=before.replace(/(from\s*['"])(\.\.?\/[^'"?]+\.js)(?:\?[^'"]*)?(['"])/g,(_m,a,b,c)=>a+b+'?v='+version+c);if(before!==after){if(check)throw Error('Asset stamp differs: '+name);await writeFile(file,after);}}
const index=new URL('index.html',root),before=await readFile(index,'utf8'),after=before.replace(/((?:href|src)=["'])([^"'?:]+\.(?:css|js))(?:\?[^"']*)?(["'])/g,(_m,a,b,c)=>a+b+'?v='+version+c);if(before!==after){if(check)throw Error('Asset stamp differs: index.html');await writeFile(index,after);}
console.log('Asset version: '+version+(check?' verified':''));
