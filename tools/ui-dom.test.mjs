// DOM interaction tests, not a browser rendering or screenshot substitute.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {Window} from 'happy-dom';
import {initialState,makeRoute,positionAlong} from '../dist/engine.js';
import {NAVIGATION_VERSION} from '../dist/navigation-migration.js';
import {DISCOVERIES,RUMORS} from '../dist/discoveries-catalog.js';
const window=new Window({url:'http://127.0.0.1:4173/',width:1280,height:800,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,disableJavaScriptEvaluation:true}});
const document=window.document;
document.write((await readFile(new URL('../dist/index.html',import.meta.url),'utf8')).replace(/<script[^>]*>[\s\S]*?<\/script>/g,'').replace(/<link[^>]*>/g,''));
for(const name of ['window','document','navigator','location','localStorage','sessionStorage','HTMLElement','SVGElement','Event','KeyboardEvent'])Object.defineProperty(globalThis,name,{value:name==='window'?window:window[name],configurable:true,writable:true});
for(const name of ['matchMedia','getComputedStyle'])globalThis[name]=window[name].bind(window);
Object.defineProperty(globalThis,'innerWidth',{get:()=>window.innerWidth,configurable:true});Object.defineProperty(globalThis,'innerHeight',{get:()=>window.innerHeight,configurable:true});
globalThis.requestAnimationFrame=()=>0;globalThis.cancelAnimationFrame=()=>{};globalThis.ResizeObserver=class{observe(){}disconnect(){}};
const ctx=new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),getImageData:(_x,_y,w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createRadialGradient:()=>({addColorStop(){}})}, {get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
window.HTMLCanvasElement.prototype.getContext=()=>ctx;window.HTMLCanvasElement.prototype.toDataURL=()=>'';
window.HTMLElement.prototype.scrollIntoView=()=>{};window.Element.prototype.getBoundingClientRect=()=>({x:0,y:0,left:0,top:0,right:900,bottom:600,width:900,height:600});
globalThis.fetch=async url=>({ok:true,json:async()=>JSON.parse(await readFile(new URL('../dist/'+url.split('?')[0],import.meta.url),'utf8'))});
await mkdir(new URL('../.qa/',import.meta.url),{recursive:true});
let code=await readFile(new URL('../dist/app.js',import.meta.url),'utf8');code=code.replaceAll("from './","from '../dist/").replace('renderFleetStatus();showEntry();','renderFleetStatus();');
code+='\nexport {chartTerrain,camera,screen,applyCamera,renderChartLabels,tick,sailingClock,renderPeers,renderMinimap,state,beginPlaying,nav,renderHUD,renderPanel,expansion,business,combat,community,account,globe,fleet,rankings,selectPort,setControlMode,planDestination,startVoyage,stopForUI,heldKeys,heldPointers,heldKeyboard};\n';
await writeFile(new URL('../.qa/app-ui-unit.mjs',import.meta.url),code);
for(const name of ['style.css','upgrade.css','ux.css','expedition.css']){const style=document.createElement('style');style.textContent=(await readFile(new URL('../dist/'+name,import.meta.url),'utf8')).replace(/@import[^;]*;/g,'');document.head.append(style);}
const app=await import('../.qa/app-ui-unit.mjs');
const $=s=>document.querySelector(s),wait=()=>new Promise(r=>setTimeout(r,5));
app.account.save=()=>{};app.account.seenVersion='2026.11.06-all-captains';
app.beginPlaying(initialState());$('#modal').close();
test('application initializes new menus and both minimap choices without runtime errors',()=>{assert.ok(app.nav);assert.ok($('.atlas-toggle'));for(const text of ['항구 투자·활동','대포·수리'])assert.ok([...document.querySelectorAll('.main-nav button')].some(b=>b.textContent.includes(text)));const point=[...app.state.position];$('[data-view=flat]').click();assert.equal(app.globe.mode,'flat');assert.deepEqual(app.state.position,point);$('[data-view=globe]').click();assert.equal(app.globe.mode,'globe');});
test('the flagship and trailing ships stay upright on a diagonal route',()=>{
  const game=initialState(),route=makeRoute([[-103,16],[-100,16.5]]),travelled=140;
  game.port=null;
  game.position=positionAlong(route,travelled);
  game.navigationVersion=NAVIGATION_VERSION;
  game.voyage={...route,travelled,target:null};
  game.fleetShips=[{id:game.flagshipId,tier:15},{id:'tail-one',tier:13},{id:'tail-two',tier:11}];
  game.shipTier=15;
  game.fleetCount=game.fleetShips.length;
  try{
    app.beginPlaying(game);
    const followers=[...$('#own-followers').children];
    assert.equal(followers.length,2);
    assert.ok(followers.every(ship=>!ship.getAttribute('transform').includes('rotate')));
    assert.notEqual(followers[0].getAttribute('transform'),followers[1].getAttribute('transform'));
    assert.match($('#heading-arrow').getAttribute('transform'),/rotate\(/);
  }finally{app.beginPlaying(initialState());$('#modal').close();}
});
test('flat canvas overrides globe clipping and mobile fixed height, and its click only moves the camera',()=>{const canvas=$('#minimap'),point=[...app.state.position];for(const width of [1280,390,360]){window.happyDOM.setViewport({width,height:844});$('[data-view=flat]').click();assert.equal(canvas.dataset.atlasMode,'flat');assert.equal(canvas.width,360);assert.equal(canvas.height,180);assert.equal(getComputedStyle(canvas).borderRadius,'4px');assert.notEqual(getComputedStyle(canvas).height,'180px');assert.doesNotMatch($('.minimap-caption').textContent,/회전/);canvas.dispatchEvent(new window.PointerEvent('pointerup',{clientX:450,clientY:300,bubbles:true}));assert.deepEqual(app.state.position,point);$('[data-view=globe]').click();assert.equal(getComputedStyle(canvas).borderRadius,'50%');assert.match($('.minimap-caption').textContent,/회전/);}});
test('ranking controls expose all twenty-two metrics in six groups on mobile',()=>{const ids=[];for(const button of document.querySelectorAll('[data-rank-group]')){button.click();for(const option of $('#rank-metric-select').options)ids.push(option.value);}assert.equal(new Set(ids).size,22);assert.ok(ids.includes('pirateKills'));assert.ok(ids.includes('ownedPortCount'));assert.ok(ids.includes('bestTradeProfit'));});
test('investigation opens large actions on desktop and mobile, closes and can reopen',async()=>{const d=DISCOVERIES.find(d=>!d.rumorIds.length);app.state.port=null;app.state.position=[...d.point];app.expansion.investigate();assert.equal($('#modal').open,true);assert.ok($('[data-popup-inspect]'));assert.equal($('[data-popup-inspect]').disabled,false);$('#investigation-close').click();assert.equal($('#modal').open,false);window.happyDOM.setViewport({width:390,height:844});app.expansion.investigate();assert.equal($('#modal').dataset.investigation,'true');assert.ok($('[data-popup-approach]'));$('#investigation-close').click();app.state.position=[-9.14,38.72];app.state.port='lisbon';await wait();});
test('all captains retain offline records and last seen time in list and detail',async()=>{app.fleet.uid='self';app.fleet.onlineCaptains=()=>[];app.rankings.page=async()=>[{id:'offline',name:'지난 선장',visited:50,statsVersion:3,explorationPercent:36.68,fame:50,shipTier:0,fleetCount:1,foundCount:1,lastSeenAt:Date.UTC(2026,10,9,0,5)}];await app.expansion.showCaptains('all',true);assert.match($('#persistent-roster').textContent,/09:05/);assert.match($('#persistent-roster').textContent,/오프라인/);$('.captain-directory-row').click();await wait();assert.match($('#modal-content').textContent,/09:05/);assert.match($('#modal-content').textContent,/한국 시간/);$('#close-modal').click();});
test('only the personal album shows the game discovery point even when both captains discovered it',async()=>{
 const discovery=DISCOVERIES[0],game=initialState();
 game.discoveries[discovery.id]={foundDay:2,foundAt:1000};
 const other={id:'other',name:'다른 선장',visited:2};
 const original={page:app.rankings.page,captain:app.rankings.captain,collection:app.rankings.collection};
 try{
  app.beginPlaying(game);$('#modal').close();
  Object.assign(app.rankings,{page:async()=>[other],captain:async()=>other,collection:async()=>({discoveries:{[discovery.id]:true}})});
  await app.expansion.showCaptains('all',true);
  $('.captain-directory-row').click();await wait();
  $('#captain-collections').click();await wait();
  $('[data-public-card="'+discovery.id+'"]').click();
  assert.match($('#captain-collection').textContent,/테르세이라섬/);
  assert.doesNotMatch($('#captain-collection').textContent,/게임 발견 지점|지도에서 보기|38\.60/);
  assert.equal($('[data-discovery-study-map]'),null);

  app.expansion.showAlbum();
  $('[data-collection="'+discovery.id+'"]').click();
  assert.match($('#modal-content').textContent,/게임 발견 지점/);
  const position=[...app.state.position];
  $('[data-discovery-study-map]').click();
  assert.equal($('#discovery-study-pin').getAttribute('aria-label'),discovery.name);
  assert.deepEqual(app.state.position,position);
 }finally{
  Object.assign(app.rankings,original);
  app.beginPlaying(initialState());$('#modal').close();
 }
});
test('manual port selection immediately switches to auto, clears held inputs, and sail button still starts a planned route',async()=>{
 const originalReserve=app.combat.hasReserve,originalBlocked=app.combat.blocked;app.combat.hasReserve=()=>true;app.combat.blocked=()=>false;
 app.beginPlaying(initialState());$('#modal').close();app.state.controlMode='manual';app.heldKeys.add('ArrowRight');app.heldKeyboard.set('KeyD','ArrowRight');app.heldPointers.set(4,'ArrowUp');await app.selectPort('porto',false);assert.equal(app.state.controlMode,'auto');assert.equal(app.state.voyage.target,'porto');assert.equal(app.heldKeys.size,0);assert.equal(app.heldPointers.size,0);assert.equal(app.heldKeyboard.size,0);
 app.beginPlaying(initialState());$('#modal').close();app.planDestination('porto',[-8.61,41.15],false);$('#sail-btn').click();await wait();assert.equal(app.state.voyage.target,'porto','DOM click event must not be mistaken for an obsolete intent number');app.combat.hasReserve=originalReserve;app.combat.blocked=originalBlocked;app.beginPlaying(initialState());$('#modal').close();
});

test('cannon inventory and pirate entry are reachable on mobile',()=>{app.business.showArmory();assert.equal($('#gun-kind').options.length,8);assert.equal($('#gun-quality').options.length,5);$('#quick-more').click();for(const id of ['business','guns','combat'])assert.ok($('[data-menu='+id+']'));$('#quick-close').click();app.combat.show();assert.equal(document.querySelectorAll('[data-pirate]').length,0);assert.ok(![...document.querySelectorAll('.main-nav button')].some(b=>b.textContent.includes('해적')));$('#close-modal').click();});
test('pirate combat stays on the map with hull labels, dock guns and a persistent fold',()=>{app.state.port=null;app.state.position=[-17,34];app.state.cannons=[{id:'test-gun',kind:'precision',quality:0,shipId:'flagship',readyAt:0}];app.combat.showPirate('atlantic');assert.equal($('#modal').open,false);assert.equal($('#combat-deck').hidden,false);assert.equal($('#combat-board'),null);assert.ok($('[data-map-gun="test-gun"]'));assert.ok($('[data-hp-side="me"]'));assert.ok($('[data-hp-side="enemy"]'));assert.ok(!$('.chart').contains($('#combat-deck')),'dock reserves space outside map');$('#combat-deck header button').click();assert.equal($('.combat-deck-body').hidden,true);app.combat.renderMap();assert.equal($('.combat-deck-body').hidden,true);$('#combat-deck header button').click();app.state.pirateRespawns={atlantic:Date.now()+10000};app.combat.renderMap();assert.equal($('#combat-deck').hidden,true);assert.equal(document.querySelectorAll('[data-hp-side]').length,0);delete app.state.pirateRespawns;app.combat.dispose();app.state.port='lisbon';app.state.position=[-9.14,38.72];delete app.state.cannons;});

test('suggestion board confirms a lost acknowledgement without creating a duplicate and escapes text',async()=>{const a=app.account,old={ready:a.ready,uid:a.uid,name:a.name,sdk:a.sdk};const posts={},owned={seville:{portName:'세비야',ownerName:'선장 B',ownerUid:'b',share:60,defaultRate:0,kind:'general'}};let writes=0;
 const snap=value=>({val:()=>value,forEach:fn=>Object.entries(value||{}).sort(([a],[b])=>a.localeCompare(b)).forEach(([key,value])=>fn({key,val:()=>value}))});
 Object.assign(a,{ready:true,uid:'self',name:'검사 선장',sdk:{ref:(_db,path)=>path,push:()=>({key:'-T000000000000000001'}),orderByKey:()=>({}),limitToLast:n=>({limit:n}),limitToFirst:n=>({limit:n}),endBefore:key=>({before:key}),query:(path,...filters)=>({path,filters}),serverTimestamp:()=>Date.now(),get:async ref=>{const path=ref.path||ref;return snap(path.endsWith('ownedPorts')?owned:path.includes('/posts/')?posts[path.split('/').at(-1)]||null:posts);},update:async(_ref,changes)=>{writes++;for(const [path,value]of Object.entries(changes))if(path.startsWith('posts/'))posts[path.slice(6)]=value;if(writes===1)throw Error('lost acknowledgement');}}});
 try{await app.community.showSuggestions(true);$('#suggestion-title').value='<img src=x onerror=alert(1)>';$('#suggestion-body').value='테스트 제안';await $('#suggestion-form').onsubmit({preventDefault(){}});assert.equal(writes,1);assert.match($('#suggestion-status').textContent,/중복 여부/);await $('#suggestion-form').onsubmit({preventDefault(){}});assert.equal(writes,1,'existing post acknowledges retry');assert.match($('#suggestion-list').textContent,/<img/);assert.equal($('#suggestion-list img'),null);assert.equal($('#suggestion-title').value,'');posts['-T000000000000000002']={name:'김부장',title:'완료된 의견',body:'원문 보존',at:Date.now(),status:'completed'};await app.community.showSuggestions(true);assert.equal($('.suggestion-row.is-completed details').open,false);assert.match($('.suggestion-row.is-completed summary').textContent,/완료/);const known=[...app.state.knownPorts];await app.community.showOwnedPorts();assert.match($('#owned-port-list').textContent,/세비야/);assert.match($('#owned-port-list').textContent,/60.00%/);$('#owned-port-list button').click();assert.deepEqual(app.state.knownPorts,known,'looking never discovers a port');$('#quick-more').click();for(const id of ['suggestions','ownedPorts'])assert.ok($('[data-menu='+id+']'));$('#quick-close').click();}finally{Object.assign(a,old);$('#modal').close();}
});
test.after(async()=>{app.combat.dispose();await window.happyDOM.close();});

test('cargo sale finder is reachable on desktop and mobile and labels the search-time price explicitly',async()=>{
 const a=app.account,old={ready:a.ready,uid:a.uid,sdk:a.sdk,auth:a.auth,restEndpoint:a.restEndpoint},originalFetch=globalThis.fetch;app.state.cargo={wine:{qty:10,cost:300}};
 Object.assign(a,{ready:true,uid:'me',restEndpoint:'https://fixture.invalid/',auth:{currentUser:{getIdToken:async()=>'fixture'}},sdk:{ref:(_,p)=>p,onValue:(_ref,fn)=>{fn({val:()=>null});return ()=>{};},get:async()=>({val:()=>({})})}});
 globalThis.fetch=async url=>({ok:true,json:async()=>String(url).includes('/markets/wine.json')?{pressure:1000,at:Date.now()}:null});
 try{app.renderPanel();assert.ok($('[data-sale-search=wine]'));$('#cargo-price-search').click();assert.match($('#modal-content').textContent,/지금 검색한 시점/);assert.match($('#modal-content').textContent,/실제 판매할 때 달라질/);assert.equal(document.querySelectorAll('.sale-search-row').length,0,'opening the form does not start a search');$('#sale-search-known').checked=true;$('#sale-search-form').requestSubmit();for(let i=0;i<60&&!$('.sale-search-timestamp');i++)await wait();assert.match($('.sale-search-timestamp').textContent,/한국 시간/);assert.equal(document.querySelectorAll('.sale-search-row').length,3);assert.match($('#sale-search-results').textContent,/10상자 수령/);$('#close-modal').click();$('#quick-more').click();assert.ok($('[data-menu=saleSearch]'));$('#quick-close').click();
 }finally{Object.assign(a,old);globalThis.fetch=originalFetch;app.state.cargo={};$('#modal').close();}
});

test('stationary and moving peers reuse SVG nodes and removed peers are cleaned up',()=>{
 const old=app.fleet.peers,now=Date.now(),boat={uid:'cache-peer',name:'정박 선장',lon:-9.14,lat:38.72,angle:0,color:0,status:'정박',persistent:true,offline:true,updatedAt:now,shipTier:9,fleetCount:1};app.fleet.peers=new Map([['cache-peer',{from:boat,to:boat,received:now}]]);app.renderPeers();const node=$('[data-peer="cache-peer"]'),hull=node.querySelector('g');assert.ok(node);for(let i=0;i<20;i++)app.renderPeers();assert.equal($('[data-peer="cache-peer"]'),node);assert.equal(node.querySelector('g'),hull);const next={...boat,lon:-9.1,status:'항해',angle:90};app.fleet.peers.set('cache-peer',{from:next,to:next,received:now});app.renderPeers();assert.equal($('[data-peer="cache-peer"]'),node);assert.equal(node.querySelector('g'),hull);app.fleet.peers.clear();app.renderPeers();assert.equal($('[data-peer="cache-peer"]'),null);app.fleet.peers=old;
});
test('both minimaps reuse pixel backgrounds, invalidate on exploration, and stop when folded or off screen',()=>{
 const globe=app.globe,canvas=$('#minimap'),card=canvas.closest('.minimap-card');for(const mode of ['globe','flat']){globe.setMode(mode);globe.draw(true);const before=globe.backgroundBuilds;for(let i=0;i<20;i++)globe.draw(true);assert.equal(globe.backgroundBuilds,before);globe.peers=[{uid:'p',lon:0,lat:0,fill:'#fff'}];globe.draw(true);assert.equal(globe.backgroundBuilds,before);globe.exploration.revision++;globe.draw(true);assert.equal(globe.backgroundBuilds,before+1);card.classList.add('is-collapsed');globe.exploration.revision++;globe.draw(true);assert.equal(globe.backgroundBuilds,before+1);card.classList.remove('is-collapsed');const rect=canvas.getBoundingClientRect;canvas.getBoundingClientRect=()=>({width:240,height:240,top:innerHeight+10,bottom:innerHeight+250,left:0,right:240});globe.draw(true);assert.equal(globe.backgroundBuilds,before+1);canvas.getBoundingClientRect=rect;globe.draw(true);assert.equal(globe.backgroundBuilds,before+2);}globe.peers=[];
});

test('application tick keeps automatic and manual sailing consistent at low FPS, and pauses while hidden',async()=>{
 const oldReserve=app.combat.hasReserve,oldBlocked=app.combat.blocked;
 app.combat.hasReserve=()=>true;app.combat.blocked=()=>false;
 try{
  for(const mode of ['auto','manual']){
   const results=[];
   for(const interval of [20,200,500]){
    app.beginPlaying(initialState());$('#modal').close();app.stopForUI();
    if(mode==='auto'){app.planDestination('porto',[-8.61,41.15],false);await app.startVoyage();}
    else{app.state.port=null;app.state.position=[-10.6,38.7];app.state.controlMode='manual';app.heldKeys.add('ArrowLeft');}
    app.sailingClock.reset(0);app.tick(0);
    for(let t=interval;t<=1000;t+=interval)app.tick(t);
    results.push({point:[...app.state.position],day:app.state.day,food:app.state.food});
   }
   for(const r of results){for(let i=0;i<2;i++)assert.ok(Math.abs(r.point[i]-results[0].point[i])<.0005,mode+' position differs by more than 0.03 nautical miles');assert.ok(Math.abs(r.day-results[0].day)<1e-7);assert.ok(Math.abs(r.food-results[0].food)<1e-7);}
  }
  app.beginPlaying(initialState());$('#modal').close();app.planDestination('porto',[-8.61,41.15],false);await app.startVoyage();app.sailingClock.reset(0);app.tick(0);app.tick(200);const point=[...app.state.position];
  Object.defineProperty(document,'hidden',{value:true,configurable:true});app.tick(10000);assert.deepEqual(app.state.position,point);Object.defineProperty(document,'hidden',{value:false,configurable:true});app.tick(11000);assert.deepEqual(app.state.position,point);app.tick(11200);assert.notDeepEqual(app.state.position,point);
 }finally{delete document.hidden;app.combat.hasReserve=oldReserve;app.combat.blocked=oldBlocked;app.stopForUI();app.beginPlaying(initialState());$('#modal').close();}
});

test('static terrain has no live coast paths, fog is independent, and labels reuse their nodes during camera updates',()=>{
 assert.equal(document.querySelectorAll('#chart-terrain path').length,0);assert.equal($('#chart-terrain #map-labels'),null);assert.equal($('#chart-terrain #exploration-fog'),null);assert.ok($('#chart-fog #exploration-fog'));assert.ok($('#terrain-tiles image'));assert.ok(!document.querySelector('#map-camera [filter="url(#paper)"]'));
 const saved={...app.camera};app.camera.x=(-38+180)*1600/360;app.camera.y=(80-30)*800/140;app.applyCamera();app.renderChartLabels(true);const label=$('[data-place="north-atlantic"]');assert.ok(label);const image=$('#terrain-tiles image');for(let i=0;i<60;i++){app.applyCamera();app.renderChartLabels(true);}assert.equal($('[data-place="north-atlantic"]'),label);assert.equal($('#terrain-tiles image'),image);assert.ok(app.chartTerrain.nodes.size<=16);Object.assign(app.camera,saved);app.applyCamera();
});

test('geographical labels use the nearest wrapped copy across the date line without rebuilding the text',()=>{
 const saved={...app.camera},w=app.screen.w;app.screen.w=1280;app.camera.x=1595;app.camera.y=(80+41)*800/140;app.applyCamera();app.renderChartLabels(true);const name=$('[data-place="new-zealand"]');assert.ok(name);assert.ok(Number(name.getAttribute('x'))>1500);app.camera.x=2;app.applyCamera();app.renderChartLabels(true);assert.equal($('[data-place="new-zealand"]'),name);assert.ok(Number(name.getAttribute('x'))<0);app.screen.w=w;Object.assign(app.camera,saved);app.applyCamera();
});

test('mobile geography is visible above all fog copies and can be disabled and restored in settings',()=>{
 const saved={...app.camera},size={w:app.screen.w,h:app.screen.h};app.beginPlaying(initialState());$('#modal').close();app.screen.w=390;app.screen.h=320;app.camera.x=(-9.14+180)*1600/360;app.camera.y=(80-38.72)*800/140;app.applyCamera();app.renderChartLabels(true);
 const labels=[...document.querySelectorAll('[data-place]')];assert.ok(labels.length>0);assert.ok(labels.some(t=>t.dataset.place==='iberia'));assert.equal(getComputedStyle(labels[0]).opacity,'1');assert.equal(getComputedStyle(labels[0]).pointerEvents,'none');
 const children=[...$('#map-camera').children],layer=children.indexOf($('#map-labels'));for(const node of children.filter(n=>n.id==='chart-fog'||n.getAttribute('href')==='#chart-fog'))assert.ok(layer>children.indexOf(node));assert.ok(layer<children.indexOf($('#port-markers')));
 const before=JSON.stringify(app.state);for(let i=0;i<10;i++)app.renderChartLabels(true);assert.equal(JSON.stringify(app.state),before);
 $('#ux-settings').click();const box=$('#place-names');assert.ok(box.checked);box.checked=false;box.dispatchEvent(new window.Event('change',{bubbles:true}));assert.equal($('#map-labels').children.length,0);box.checked=true;box.dispatchEvent(new window.Event('change',{bubbles:true}));assert.ok($('#map-labels').children.length>0);$('#modal').close();Object.assign(app.screen,size);Object.assign(app.camera,saved);app.applyCamera();
});

test('rumor note opens on desktop and mobile and restores a hidden tavern rumor',()=>{
  window.happyDOM.setViewport({width:1280,height:844});
  app.beginPlaying(initialState());
  $('#modal').close();
  app.state.shipTier=4;
  app.state.fleetShips[0].tier=4;
  $('#tavern-tab').click();
  app.renderPanel();
  $('[data-tavern-rumor="I008"]').click();
  assert.equal($('#modal').open,false);
  assert.equal($('#tavern-tab').classList.contains('active'),true);
  assert.match($('#tavern-content .tavern-rumor-text').textContent,/포르투 부두/);
  assert.equal($('[data-tavern-rumor="I008"]').getAttribute('aria-expanded'),'true');
  $('#rumor-note-tab').click();
  $('[data-note-hide="I008"]').click();
  assert.equal($('[data-note-hide="I008"]'),null);
  $('[data-note-filter="hidden"]').click();
  assert.ok($('[data-note-hide="I008"]'));
  $('[data-note-hide="I008"]').click();
  $('#close-modal').click();
  window.happyDOM.setViewport({width:390,height:844});
  $('#rumor-note-tab').click();
  assert.ok($('[data-note-hide="I008"]'));
  assert.doesNotMatch($('#modal-content').textContent,/예비 노|아이템|부선장|발견물|진행 보기/);
  assert.equal($('[data-note-contract]'),null);
  $('#modal').close();
  app.beginPlaying({...app.state,port:'porto'});
  $('#tavern-tab').click();
  $('[data-port-encounter="I008"]').click();
  assert.match($('#modal-title').textContent,/예비 노/);
  assert.equal($('[data-rumor-action="start"]').disabled,false);
  $('#modal').close();
  app.beginPlaying(initialState());
  $('#modal').close();
});


test('the tavern mixes discovery and recruitment rumors with the same presentation',()=>{
  const game=initialState();
  game.port='colombo';
  game.shipTier=9;
  game.fleetShips[0].tier=9;
  game.visited=['lisbon','porto','seville','bordeaux','dublin','london','amsterdam','marseille','venice','goa','chennai','colombo'];
  app.beginPlaying(game);
  $('#modal').close();
  $('#tavern-tab').click();
  const discovery=RUMORS.find(r=>r.portId==='colombo');
  const entries=[...document.querySelectorAll('#tavern-content [data-tavern-rumor]')];
  assert.ok(entries.some(x=>x.dataset.tavernRumor===discovery.id));
  assert.ok(entries.some(x=>x.dataset.tavernRumor==='O014'));
  assert.ok(entries.every(x=>/^소문 [0-9]+$/.test(x.textContent)));
  entries.find(x=>x.dataset.tavernRumor===discovery.id).click();
  assert.ok(app.state.rumors.includes(discovery.id));
  assert.equal($('.tavern-rumor-text').textContent,discovery.text);
  assert.equal($('#modal').open,false);
  assert.doesNotMatch($('.tavern-rumor-text').textContent,/탐험 소문|발견물|부선장|특수 아이템/);
  $('[data-tavern-rumor="O014"]').click();
  assert.equal(document.querySelectorAll('#tavern-content .tavern-rumor-text').length,1);
  assert.doesNotMatch($('.tavern-rumor-text').textContent,new RegExp(discovery.text.slice(0,12)));
  app.state.discoveries[discovery.discoveryId]={foundDay:1,foundAt:1};
  $('#rumor-note-tab').click();
  assert.equal($('#modal-content').querySelectorAll('.rumor-note-row').length,2);
  const completed=$('[data-note-entry="'+discovery.id+'"]');
  assert.equal(completed.querySelector('details').open,false);
  assert.match(completed.querySelector('.rumor-complete').textContent,/완료/);
  completed.querySelector('summary').click();
  assert.equal(completed.querySelector('details').open,true);
  assert.equal($('#modal').open,true);
  assert.doesNotMatch($('#modal-content').textContent,/쉬프랑|동행|보급 소모/);
  $('#modal').close();
  app.beginPlaying(initialState());
  $('#modal').close();
});

test('opening a tavern rumor on mobile keeps the port sheet open',()=>{
  window.happyDOM.setViewport({width:390,height:844});
  const game=initialState();game.shipTier=4;game.fleetShips[0].tier=4;
  app.beginPlaying(game);$('#modal').close();
  $('#quick-port').click();$('#tavern-tab').click();
  assert.equal($('#quick-sheet').open,true);
  $('[data-tavern-rumor="I008"]').click();
  assert.equal($('#quick-sheet').open,true);
  assert.equal($('#modal').open,false);
  assert.match($('.tavern-rumor-text').textContent,/포르투 부두/);
  $('[data-tavern-rumor="I008"]').click();
  assert.equal($('.tavern-rumor-text'),null);
  assert.equal($('#quick-sheet').open,true);
  $('#quick-close').click();
});

test('equipped items appear on the assigned ship and in the item bag after a flagship change',()=>{
  const game=initialState(), oldFlag=game.flagshipId;
  game.fleetShips=[{id:oldFlag,tier:6},{id:'new-flag',tier:7}];
  game.flagshipId='new-flag';
  game.shipTier=7;
  game.fleetCount=2;
  game.rumorProgress={read:['I001','I023'],hidden:[],contracts:{},officers:[],items:{I001:1,I023:1},shipGear:{[oldFlag]:'I001'},tradeGear:'I023',active:null};
  app.beginPlaying(game);
  $('#modal').close();
  $('#ship-view-btn').click();
  assert.match($('.fleet-trade-gear').textContent,/접이식 화물 선반/);
  const cards=[...document.querySelectorAll('#modal-content .growth-step')];
  assert.match(cards[0].querySelector('.vessel-gear').textContent,/없음/);
  assert.match(cards[1].querySelector('.vessel-gear').textContent,/강화 돛/);
  $('#fleet-items').click();
  assert.match($('#modal-content').textContent,/장착 중 · 동행선 1/);
  assert.match($('#modal-content').textContent,/장착 중 · 선단 교역 장비/);
  $('#modal').close();
  app.beginPlaying(initialState());
  $('#modal').close();
});


test('an invalid automatic destination preserves a running route and does not discard its progress',async()=>{
  const hadReserve=app.combat.hasReserve,blocked=app.combat.blocked;
  app.combat.hasReserve=()=>true;app.combat.blocked=()=>false;
  const game=initialState();
  game.knownPorts.push('london');
  app.beginPlaying(game);
  $('#modal').close();
  app.planDestination('porto',[-8.61,41.15],false);
  await app.startVoyage();
  const old=app.state.voyage;
  app.state.food=.01;
  await app.selectPort('london',false);
  assert.equal(app.state.voyage,old);
  assert.equal(app.state.voyage.target,'porto');
  app.combat.hasReserve=hadReserve;app.combat.blocked=blocked;
  app.beginPlaying(initialState());
  $('#modal').close();
});

test('a finished depot appears in the chart and the ownership directory without a visit',async()=>{
 const a=app.account,old={ready:a.ready,uid:a.uid,name:a.name,sdk:a.sdk};
 const harbor='depot-stjohns',registry={[harbor]:{kind:'depot',level:1,opensAt:Date.now()-10000,ownerUid:'captain',ownerShare:60}};
 const snapshot={val:()=>registry},empty={forEach:()=>{}};
 const sdk={ref:(_db,key)=>key,onValue:()=>()=>{},query:key=>key,orderByKey:()=>{},limitToFirst:()=>{},
   get:async key=>key.endsWith('/harborRegistry')?snapshot:empty};
 Object.assign(a,{ready:true,uid:'captain',name:'보급 선장',sdk});
 try{
   await app.business.syncPorts();
   assert.ok($('[data-port='+harbor+']'));
   await app.community.showOwnedPorts();
   assert.match($('#owned-port-list').textContent,/보급 선장.*공동 보급항.*60.00%/s);
   assert.ok(!app.state.visited.includes(harbor));
 }finally{app.business.dispose();Object.assign(a,old);$('#modal').close();}
});


test('ship hero, story menus, and canal checkbox are reachable through normal UI entry points',()=>{
 app.beginPlaying(initialState());$('#modal').close();
 $('#ship-view-btn').click();assert.ok($('.fleet-display-image'));assert.ok($('[data-fleet-view="gear"]'));
 $('[data-fleet-view="gear"]').click();assert.equal($('#fleet-equipment').hidden,false);$('#modal').close();
 $('#story-open').click();assert.equal(document.querySelectorAll('[data-story]').length,5);$('#modal').close();
 $('#quick-more').click();$('[data-menu="projects"]').click();$('[data-project-type="canal"]').click();
 assert.equal($('#auto-canal-toggle').checked,true);$('#auto-canal-toggle').click();assert.equal(app.state.useCanals,false);
 $('#auto-canal-toggle').click();assert.equal(app.state.useCanals,true);$('#modal').close();
});


test('an acquired tavern item keeps a completed encounter badge after reconnect',()=>{
 const game=initialState();game.port='porto';
 game.rumorProgress={read:['I008'],hidden:[],contracts:{},officers:[],items:{I008:1},acquiredItems:['I008'],shipGear:{},tradeGear:null,active:null};
 app.beginPlaying(game);$('#modal').close();$('#tavern-tab').click();
 assert.match($('[data-port-encounter="I008"]').textContent,/완료/);
 app.beginPlaying(initialState());$('#modal').close();
});


test('selecting a harbor already within docking range docks before the outbound food check',async()=>{
 const {PORT_BY_ID}=await import('../dist/data.js');
 app.beginPlaying(initialState());$('#modal').close();
 app.state.port=null;app.state.position=app.nav.approach(PORT_BY_ID.porto);app.state.food=.1;app.state.controlMode='manual';
 await app.selectPort('porto',false);
 assert.equal(app.state.port,'porto');assert.equal(app.state.voyage,null);assert.equal(app.state.controlMode,'auto');
 app.beginPlaying(initialState());$('#modal').close();
});

test('discovering Salalah renders the map and preserves manual and open-sea automatic movement',async()=>{
 const {RELEASE}=await import('../dist/release-notes.js');
 const data=await import('../dist/data.js?v='+RELEASE);
 const id='developed-salalah',oldPort=structuredClone(data.PORT_BY_ID[id]);
 const added=data.registerDevelopedPorts({[id]:{level:2,name:'살랄라'}});
 const oldReserve=app.combat.hasReserve,oldBlocked=app.combat.blocked;
 app.combat.hasReserve=()=>true;app.combat.blocked=()=>false;
 try{
  for(const mode of ['manual','auto']){
   const game=initialState();game.port=null;game.position=[55.133546,16.033181];game.food=54;
   game.fleetShips=[{id:game.flagshipId,tier:19}];game.shipTier=19;game.controlMode=mode;
   game.knownPorts.push(id);
   assert.doesNotThrow(()=>app.beginPlaying(game),'newly discovered Salalah must not crash map rendering');
   $('#modal').close();await wait();app.stopForUI();
   const marker=$('[data-port="'+id+'"]');assert.ok(marker);assert.match(marker.textContent,/살랄라/);
   if(mode==='manual')app.heldKeys.add('ArrowLeft');
   else{app.planDestination(null,[54.8,16.03],false);await app.startVoyage();assert.ok(app.state.voyage);assert.equal(app.state.voyage.target,null);}
   const before=[...app.state.position];app.sailingClock.reset(0);app.tick(0);
   assert.doesNotThrow(()=>app.tick(100));assert.notDeepEqual(app.state.position,before,mode+' must move after discovering Salalah');
  }
 }finally{
  app.combat.hasReserve=oldReserve;app.combat.blocked=oldBlocked;app.stopForUI();
  for(const port of added){const index=data.PORTS.findIndex(p=>p.id===port.id);if(index>=0)data.PORTS.splice(index,1);delete data.ACTIVE_PORT_BY_ID[port.id];}
  Object.assign(data.PORT_BY_ID[id],oldPort);app.beginPlaying(initialState());$('#modal').close();
 }
});
