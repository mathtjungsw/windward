import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {initialState} from '../dist/engine.js';
const root=path.resolve(fileURLToPath(new URL('../dist/',import.meta.url)));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.geojson':'application/geo+json','.svg':'image/svg+xml'};
async function wrapFixture(url,game={...initialState(),port:null,position:[0,url.searchParams.get('edge')==='south'?-59.8:79.8],controlMode:'manual'}){
  const injected='<script>const fixtureMemory=new Map([["windward-save-v1",'+JSON.stringify(JSON.stringify(game))+']]);Object.defineProperty(window,"localStorage",{value:{getItem:k=>fixtureMemory.get(k)||null,setItem:(k,v)=>fixtureMemory.set(k,String(v)),removeItem:k=>fixtureMemory.delete(k)}});</script>';
  return (await readFile(path.join(root,'index.html'),'utf8')).replace('<head>','<head><base href="/">').replace('<script type="module" src="app.js"></script>',injected+'<script type="module" src="app.js"></script>');
}
async function crewFixtureScript(){
  const source=(await readFile(path.join(root,'app.js'),'utf8')).replaceAll("from './","from '/");
  return source+`\n// Local UI fixture: memory-only saved game and fictional membership; no Firebase connection.
  const enter=$('#offline-start').onclick;$('#offline-start').onclick=()=>{enter();
    const people=Array.from({length:42},(_,i)=>({uid:'qa-'+i,name:i===0?'검증 선장':i===41?'먼바다선장':'접속 선장 '+String(i).padStart(2,'0'),status:i%2?'항해':'정박',color:i%6,updatedAt:Date.now()}));
    fleet.uid='qa-0';fleet.name='검증 선장';fleet.color=0;fleet.root='worlds/peace';fleet.connected=true;fleet.active=true;fleetStatus='online';fleet.roster={ready:true,error:false,list:()=>people,stop:async()=>{}};
    const near={...people[1],lon:-10,lat:38.7,angle:90,money:100,profit:0,visited:1},far={...people[41],lon:140,lat:35,angle:0,money:100,profit:0,visited:1};
    fleet.peers=new Map([['qa-near',{from:near,to:near,received:Date.now()}],['qa-far',{from:far,to:far,received:Date.now()}]]);renderFleetStatus();renderRanks();renderPeers();renderMinimap();
  };`;
}
const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(url.pathname==='/__qa/trade'){const game={...initialState(),port:null,position:[-9.44,41],controlMode:'manual',cargo:{wine:{qty:10,cost:310}},boughtLisbonWine:true,money:2090};res.writeHead(200,{'Content-Type':types['.html'],'Cache-Control':'no-cache'});res.end(await wrapFixture(url,game));return;}if(url.pathname==='/__qa/harbor'){const game={...initialState(),port:null,position:[url.searchParams.has('near')?-9.44:-10.1,41],controlMode:'manual'};res.writeHead(200,{'Content-Type':types['.html'],'Cache-Control':'no-cache'});res.end(await wrapFixture(url,game));return;}if(url.pathname==='/__qa/crew-app.js'){res.writeHead(200,{'Content-Type':types['.js'],'Cache-Control':'no-cache'});res.end(await crewFixtureScript());return;}if(url.pathname==='/__qa/crew'){res.writeHead(200,{'Content-Type':types['.html'],'Cache-Control':'no-cache'});res.end((await wrapFixture(url,initialState())).replace('src="app.js"','src="/__qa/crew-app.js"'));return;}if(url.pathname==='/__qa/wrap'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'});res.end(await wrapFixture(url));return;}if(url.pathname==='/__qa/mobile'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end('<!doctype html><html lang="ko"><meta charset="utf-8"><title>바람의 항로 모바일 화면 검증</title><style>body{margin:0;background:#dce8e8;font:14px system-ui;text-align:center}p{margin:10px}iframe{display:block;margin:auto;width:390px;height:844px;border:1px solid #8ca8aa;background:#f8f4e8;max-width:100%}</style><p>모바일 화면 검증 · 실제 게임을 너비 390px로 실행</p><iframe title="모바일 항해 게임" src="/"></iframe></html>');return;}let relative=decodeURIComponent(url.pathname);if(relative==='/')relative='/index.html';const target=path.resolve(root,'.'+relative);if(!target.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}const data=await readFile(target);res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(data);}catch{res.writeHead(404);res.end('Not found');}});
server.listen(4173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4173'));
