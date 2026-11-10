import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),read=p=>readFile(new URL(p,root)),hash=b=>createHash('sha256').update(b).digest('hex');
const m=JSON.parse(await read('dist/assets/chart-tiles/manifest.json'));
for(const [file,expected]of Object.entries(m.sources))if(hash(await read('dist/assets/'+file))!==expected)throw Error('Rebuild chart terrain after changing '+file);
if(hash(await read('tools/build-chart-tiles.py'))!==m.builder)throw Error('Chart terrain builder changed; rebuild required');
let bytes=0;for(const t of [...Object.values(m.tiles),m.overview]){const file=await read('dist/assets/chart-tiles/'+t.file);if(hash(file)!==t.sha256)throw Error('Invalid chart tile '+t.file);bytes+=file.length;}
console.log(`Chart terrain verified: ${Object.keys(m.tiles).length} tiles + overview, ${bytes} bytes`);
