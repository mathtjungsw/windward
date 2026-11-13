import {spawn} from 'node:child_process';
import {mkdtemp,readFile,writeFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const output=new URL('../.qa/nov13-browser/',import.meta.url);
await mkdir(output,{recursive:true});
const profile=await mkdtemp(path.join(tmpdir(),'windward-live-ui-'));
const browser=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',[
 '--headless=new','--disable-gpu','--no-first-run','--disable-extensions','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'
],{windowsHide:true,stdio:'ignore'});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let socket;
try{
 let port;
 for(let i=0;i<100;i++){
  try{port=(await readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];break;}
  catch{await sleep(100);}
 }
 if(!port)throw Error('Chrome did not start');
 const targets=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();
 socket=new WebSocket(targets[0].webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
 let serial=0;const pending=new Map(),errors=[];
 socket.addEventListener('message',event=>{
  const message=JSON.parse(event.data);
  if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);
  if(!message.id)return;
  const task=pending.get(message.id);pending.delete(message.id);
  if(message.error)task.reject(Error(message.error.message));else task.resolve(message.result);
 });
 function cdp(method,params={}){return new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});}
 async function evaluate(expression){
  const response=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(response.exceptionDetails)throw Error(JSON.stringify(response.exceptionDetails));
  return response.result.value;
 }
 async function waitFor(expression){
  for(let i=0;i<200;i++){if(await evaluate(expression))return;await sleep(100);}
  throw Error('Timed out: '+expression+'; '+errors.join('\n'));
 }
 async function capture(name){
  await evaluate("document.fonts.ready.then(()=>Promise.all([...document.images].map(image=>image.decode().catch(()=>{}))))");
  const shot=await cdp('Page.captureScreenshot',{format:'png'});
  await writeFile(new URL(name+'.png',output),Buffer.from(shot.data,'base64'));
 }
 await cdp('Runtime.enable');await cdp('Page.enable');
 await cdp('Emulation.setDeviceMetricsOverride',{width:1280,height:960,deviceScaleFactor:1,mobile:false});
 await cdp('Page.navigate',{url:'http://127.0.0.1:4195/__qa/development'});
 await waitFor('!!window.__windwardQA');
 await evaluate("document.querySelector('#close-modal').click();document.querySelector('#story-open').click()");
 assert.equal(await evaluate("document.querySelectorAll('[data-story]').length"),5);
 await capture('01-story-catalog');
 await evaluate("document.querySelector('[data-story=first-route]').click();document.querySelector('#story-start').click()");
 await waitFor("!!window.__windwardQA.game().storyBook.entries['first-route']");
 await evaluate("document.querySelector('#story-advance').click()");
 await waitFor("window.__windwardQA.game().storyBook.entries['first-route'].index>=1");
 await capture('02-story-progress');
 await evaluate("document.querySelector('#close-modal').click();document.querySelector('#ship-view-btn').click()");
 assert.ok(await evaluate("!!document.querySelector('.fleet-display-image')"));
 await capture('03-ship-desktop');
 await evaluate("document.querySelector('[data-fleet-view=gear]').click()");
 assert.equal(await evaluate("document.querySelector('#fleet-equipment').hidden"),false);
 await evaluate("document.querySelector('#close-modal').click();window.__windwardQA.openCollector()");
 await waitFor("!!document.querySelector('#collector-buy')");
 const moneyBefore=await evaluate('window.__windwardQA.game().money');
 await evaluate("document.querySelector('#collector-buy').click()");
 await waitFor('!!window.__windwardQA.game().taxCollector');
 assert.equal(await evaluate('window.__windwardQA.game().money'),moneyBefore-50000);
 await evaluate('window.__windwardQA.collectorDue()');
 const receipt=await evaluate('window.__windwardQA.game().taxCollector.receipts[0]');
 assert.ok(receipt.gross>=3000,JSON.stringify(receipt));
 const collected=await evaluate('window.__windwardQA.game().money');
 await evaluate('window.__windwardQA.openCollector()');
 assert.equal(await evaluate('window.__windwardQA.game().money'),collected);
 await capture('04-tax-collector');
 await evaluate('window.__windwardQA.openCanals()');
 await waitFor("!!document.querySelector('#auto-canal-toggle')");
 assert.equal(await evaluate("document.querySelector('#auto-canal-toggle').checked"),true);
 await evaluate("document.querySelector('#auto-canal-toggle').click()");
 assert.equal(await evaluate('window.__windwardQA.game().useCanals'),false);
 await evaluate('window.__windwardQA.openCanals()');
 assert.equal(await evaluate("document.querySelector('#auto-canal-toggle').checked"),false);
 await capture('05-canals');
 await evaluate('window.__windwardQA.openSuggestions()');
 assert.equal(await evaluate("document.querySelectorAll('.suggestion-row.is-completed').length"),3);
 assert.equal(await evaluate("document.querySelectorAll('.suggestion-row.is-completed details[open]').length"),0);
 await capture('06-completed-suggestions');
 await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
 await evaluate("document.querySelector('#close-modal').click();document.querySelector('#ship-view-btn').click()");
 const hero=await evaluate("(()=>{const r=document.querySelector('.fleet-display-image').getBoundingClientRect();return {width:r.width,height:r.height};})()");
 assert.ok(hero.width>220&&hero.width<390&&hero.height<=281);
 await capture('07-ship-mobile');
 await evaluate("document.querySelector('#close-modal').click();window.__windwardQA.openStory()");
 await capture('08-stories-mobile');
 assert.equal(await evaluate('document.documentElement.scrollWidth>window.innerWidth'),false);
 assert.deepEqual(errors,[]);
 const report={screenshots:8,checks:['five story entries','start and advance story','ship hero and gear tab','collector purchase, 5% settlement and replay','canal checkbox retained','three completed compact suggestions','390px mobile layout'],errors};
 await writeFile(new URL('report.json',output),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report));
}finally{socket?.close();browser.kill();}
