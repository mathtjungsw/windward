import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {initialState} from '../dist/engine.js';
import {applyRaftStart} from '../dist/raft-start.js';
import {DISCOVERIES} from '../dist/discoveries-catalog.js';
import {PORTS} from '../dist/data.js';
import {previewPrefix,previewHeader,previewStyles,previewEntry,previewShipRules} from './speed-preview.mjs';

const root=fileURLToPath(new URL('../dist/',import.meta.url));
const useEmulators=process.argv.includes('--emulators');
const fixtureLogin=process.argv.includes('--fixture-login');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8','.json':'application/json','.geojson':'application/geo+json','.svg':'image/svg+xml','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.zip':'application/zip'};
const read=name=>readFile(path.join(root,name),'utf8');

const crewFixture=`
  const people=Array.from({length:42},(_,i)=>({uid:'qa-'+i,name:i===0?'검증 선장':i===41?'먼바다선장':'접속 선장 '+String(i).padStart(2,'0'),status:i%2?'항해':'정박',color:i%6,updatedAt:Date.now()}));
  fleet.uid='qa-0';fleet.name='검증 선장';fleet.color=0;fleet.root='gameV2/real';fleet.connected=true;fleet.active=true;fleetStatus='online';
  fleet.roster={ready:true,error:false,list:()=>people,stop:async()=>{}};
  const near={...people[1],lon:-10,lat:38.7,angle:90,money:100,profit:0,visited:1};
  const far={...people[41],lon:140,lat:35,angle:0,money:100,profit:0,visited:1};
  fleet.peers=new Map([['qa-near',{from:near,to:near,received:Date.now()}],['qa-far',{from:far,to:far,received:Date.now()}]]);
  renderFleetStatus();renderRanks();renderPeers();renderMinimap();
`;

async function fixturePage(game,crew=false){
  const app=(await read('app.js')).replaceAll("from './","from '/")
    .replace('clearLegacyStorage(storage);','')
    .replace('renderFleetStatus();showEntry();',()=>`account.seenVersion=RELEASE;combat.hasReserve=()=>true;combat.blocked=()=>false;combat.onArrival=async()=>{};beginPlaying(${JSON.stringify(game)});${crew?crewFixture:''}`);
  return (await read('index.html')).replace('<head>','<head><base href="/">')
    .replace(/<script type="module" src="app\.js(?:\?[^"]*)?"><\/script>/,()=>'<script type="module">'+app.replace(/<\/script/gi,'<\\/script')+'</script>');
}

async function expeditionPage(mode){
 const game=initialState();
 if(mode==='raft'){game.shipTier=4;delete game.raftStart;applyRaftStart(game,123);}
 if(mode==='ship'){Object.assign(game,{shipTier:9,fleetCount:2,money:150000,food:20});}
 if(mode==='album'){game.day=30;game.shipTier=9;game.food=20;for(const d of DISCOVERIES.slice(0,6))game.discoveries[d.id]={foundDay:1,foundAt:1000,catalogVersion:'2026.11.06'};}
 if(mode==='discovery'){const d=DISCOVERIES.find(d=>d.id==='relic-compass');game.port=null;game.position=[...d.point];}
 if(mode==='rescue'){game.port=null;game.position=[-12,39];game.food=0;}
 const fixture=`
 const mock=Array.from({length:26},(_,i)=>({id:'qa-'+String(i).padStart(2,'0'),uid:'qa-'+String(i).padStart(2,'0'),name:i?'검증 선장 '+i:'나',money:10000-i*100,profit:500-i*10,visited:i+1,explorationScore:500000-i*1000,explorationPercent:50-i*.1,explorationArea:1000000,foundCount:3,fame:500-i*10,shipTier:9,fleetCount:2,statsVersion:3,status:i%2?'항해':'정박',color:i%6,updatedAt:Date.now()}));
 fleet.uid='qa-00';fleet.name='나';fleet.connected=true;fleet.active=false;fleetStatus='online';fleet.roster={ready:true,error:false,list:()=>mock.slice(0,3),stop:async()=>{}};
 rankings.path='qa';for(const metric of ['money','profit','visited','explorationScore','fame'])rankings.rows[metric]=rankFleet(mock,metric).slice(0,5);rankings.select=()=>{};rankings.page=async after=>mock.filter(p=>!after||p.id>after).slice(0,20);rankings.captain=async uid=>mock.find(p=>p.id===uid);rankings.myRank=async()=>1;
 renderHUD();renderFleetStatus();
 `;
 return (await fixturePage(game)).replace('account.seenVersion=RELEASE;beginPlaying('+JSON.stringify(game)+');',()=>`account.seenVersion=RELEASE;beginPlaying(${JSON.stringify(game)});${fixture}`);
}

async function speedPreviewPage(){
  const app=await read('app.js');
  const entry='clearLegacyStorage(storage);\n  renderFleetStatus();showEntry();';
  const normalized=app.replaceAll('\r\n','\n');
  if(!normalized.includes(entry))throw Error('Speed preview could not find the game entry point.');
  const code=`import {setPreviewSpeed} from './ship-rules.js';\n`+normalized
    .replace(entry,()=>previewEntry)
    .replace("}catch(error){$('#map-loading').innerHTML=", "}catch(error){console.error(error);$('#speed-route').textContent='테스트 화면을 불러오지 못했어요. 새로고침해 주세요.';const loading=$('#map-loading');if(loading)loading.innerHTML=");
  return (await read('index.html'))
    .replace('<body>','<body>'+previewHeader)
    .replace('</head>',previewStyles+'</head>')
    .replace(/<script type="module" src="app\.js(?:\?[^"]*)?"><\/script>/,()=>'<script type="module">'+code.replace(/<\/script/gi,'<\\/script')+'</script>');
}

async function emulatorAccount(){
  let account= (await read('account.js'))
    .replace("appSdk.initializeApp(FIREBASE_CONFIG, 'windward-google')",
      "appSdk.initializeApp({...FIREBASE_CONFIG, projectId:'demo-windward-chat', apiKey:'demo-windward-key', databaseURL:'https://demo-windward-chat.firebaseio.com'}, 'windward-emulator')")
    .replace('await this.auth.authStateReady();',`
      authSdk.connectAuthEmulator(this.auth,'http://127.0.0.1:9099',{disableWarnings:true});
      dbSdk.connectDatabaseEmulator(this.db,'127.0.0.1',9000);
      this.restEndpoint='http://127.0.0.1:9000';this.restNamespace='demo-windward-chat';
      await this.auth.authStateReady();
    `);
  if(fixtureLogin){
    const token=Buffer.from(JSON.stringify({alg:'none',typ:'JWT'})).toString('base64url')+'.'+
      Buffer.from(JSON.stringify({sub:'windward-worldfleet-qa',email:'windward-worldfleet-qa@example.test',email_verified:true,
        name:'QA account',iss:'https://accounts.google.com',aud:'demo-windward-chat'})).toString('base64url')+'.';
    account=account.replace('return (await this.authSdk.signInWithPopup(this.auth, provider)).user;',
      `return (await this.authSdk.signInWithCredential(this.auth,
        this.authSdk.GoogleAuthProvider.credential(${JSON.stringify(token)}))).user;`);
  }
  return account;
}

function reply(res,type,data){
  res.writeHead(200,{'Content-Type':types[type]||'application/octet-stream','Cache-Control':'no-cache'});
  res.end(data);
}

const server=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    if(url.pathname===previewPrefix.slice(0,-1)){
      res.writeHead(302,{Location:previewPrefix});res.end();return;
    }
    if(url.pathname===previewPrefix)return reply(res,'.html',await speedPreviewPage());
    if(url.pathname===previewPrefix+'ship-rules.js')return reply(res,'.js',previewShipRules(await read('ship-rules.js')));
    if(useEmulators&&url.pathname==='/account.js')return reply(res,'.js',await emulatorAccount());
    const manual={...initialState(),port:null,controlMode:'manual'};
    if(url.pathname==='/__qa/expedition')return reply(res,'.html',await expeditionPage(url.searchParams.get('mode')));
    if(url.pathname==='/__qa/harbor')return reply(res,'.html',await fixturePage({...manual,position:[url.searchParams.has('near')?-9.44:-10.1,41]}));
    if(url.pathname==='/__qa/trade')return reply(res,'.html',await fixturePage({...manual,position:[-9.44,41],cargo:{wine:{qty:10,cost:310}},boughtLisbonWine:true,money:2090}));
    if(url.pathname==='/__qa/wrap')return reply(res,'.html',await fixturePage({...manual,position:[0,url.searchParams.get('edge')==='south'?-59.8:79.8]}));
    if(url.pathname==='/__qa/crew')return reply(res,'.html',await fixturePage(initialState(),true));
    if(url.pathname==='/__qa/mobile')return reply(res,'.html','<!doctype html><html lang="ko"><meta charset="utf-8"><title>바람의 항로 모바일 화면 검증</title><style>body{margin:0;background:#dce8e8;text-align:center}iframe{display:block;margin:auto;width:390px;height:844px;border:0;max-width:100%}</style><iframe title="모바일 항해 게임" src="/"></iframe></html>');
    const relative=url.pathname.startsWith(previewPrefix)?'/'+url.pathname.slice(previewPrefix.length):url.pathname;
    const target=path.resolve(root,'.'+decodeURIComponent(relative)+(relative.endsWith('/')?'index.html':''));
    if(!target.startsWith(path.resolve(root)+path.sep)){res.writeHead(403);res.end();return;}
    reply(res,path.extname(target),await readFile(target));
  }catch{res.writeHead(404);res.end('Not found');}
});
server.listen(4173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4173'+(useEmulators?' (Firebase emulators)':'')));
