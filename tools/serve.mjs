import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=path.resolve(fileURLToPath(new URL('../dist/',import.meta.url)));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.geojson':'application/geo+json','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(url.pathname==='/__qa/mobile'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end('<!doctype html><html lang="ko"><meta charset="utf-8"><title>바람의 항로 모바일 화면 검증</title><style>body{margin:0;background:#dce8e8;font:14px system-ui;text-align:center}p{margin:10px}iframe{display:block;margin:auto;width:390px;height:844px;border:1px solid #8ca8aa;background:#f8f4e8;max-width:100%}</style><p>모바일 화면 검증 · 실제 게임을 너비 390px로 실행</p><iframe title="모바일 항해 게임" src="/"></iframe></html>');return;}let relative=decodeURIComponent(url.pathname);if(relative==='/')relative='/index.html';const target=path.resolve(root,'.'+relative);if(!target.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}const data=await readFile(target);res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(data);}catch{res.writeHead(404);res.end('Not found');}});
server.listen(4173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4173'));
