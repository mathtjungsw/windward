import {readFile, writeFile, mkdir, mkdtemp} from 'node:fs/promises';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const folder = path.join(root, 'design-previews/2026-11-13-scenarios-navigation-tax');
const inlineFolder = 'C:/Users/codex/.codex/visualizations/2026/10/23/01a166b5-0b7b-7753-b33e-02b73303fa82';
const inlineFile = path.join(inlineFolder, 'windward-development-preview.html');
const assetFiles = {
  felucca: 'ship-photos/felucca.webp',
  baghlah: 'ship-photos/baghlah.webp',
  fujian: 'ship-photos/fujian.webp',
  endeavour: 'ship-photos/endeavour.webp',
  fluyt: 'ship-photos/fluyt.webp',
  kilwa: 'discovery-photos/ruin-kilwa-detail.webp',
};
const assets = {};
for (const [key, file] of Object.entries(assetFiles)) {
  const bytes = await readFile(path.join(root, 'dist/assets', file));
  assets[key] = 'data:image/webp;base64,' + bytes.toString('base64');
}

// Project the repository's Natural Earth geometry. No network access is needed by the preview.
const context = vm.createContext({});
for (const library of [
  'https://cdn.jsdelivr.net/npm/d3-array@3.2.4/dist/d3-array.min.js',
  'https://cdn.jsdelivr.net/npm/d3-geo@3.1.1/dist/d3-geo.min.js',
]) {
  const response = await fetch(library);
  if (!response.ok) throw Error('Cannot load map projection library');
  vm.runInContext(await response.text(), context);
}
const land = JSON.parse(await readFile(path.join(root, 'dist/assets/world-land.geojson'), 'utf8'));
function orientPolygon(rings) {
  const polygon = {type: 'Polygon', coordinates: rings};
  return context.d3.geoArea(polygon) > Math.PI * 2
    ? rings.map(ring => [...ring].reverse())
    : rings;
}
for (const feature of land.features) {
  const geometry = feature.geometry;
  if (geometry.type === 'Polygon') geometry.coordinates = orientPolygon(geometry.coordinates);
  if (geometry.type === 'MultiPolygon') geometry.coordinates = geometry.coordinates.map(orientPolygon);
}
const projection = context.d3.geoEquirectangular()
  .center([-9, 40.7])
  .scale(4200)
  .translate([300, 230])
  .clipExtent([[0, 0], [680, 410]]);
const coastPath = context.d3.geoPath(projection).digits(1)(land);
const port = projection([-8.72, 41.15]);
const ship = projection([-9.25, 40.9]);
const radius = 45 / 60 * Math.PI / 180 * 4200;
const portoMap = `<svg viewBox="0 0 680 410" preserveAspectRatio="xMidYMid slice" role="img" aria-label="포르투 주변 해도와 입항 범위 배치 예시"><title>Natural Earth v5.1.2 기반 포르투 해안</title><path class="map-land" d="${coastPath}"/><circle class="map-radius" cx="${port[0]}" cy="${port[1]}" r="${radius}"/><path class="map-route" d="M${ship[0]-95},${ship[1]+85}L${ship[0]},${ship[1]}L${port[0]},${port[1]}"/><circle class="map-port" cx="${port[0]}" cy="${port[1]}" r="6"/><text x="${port[0]+14}" y="${port[1]-13}">포르투</text><text x="${port[0]+14}" y="${port[1]+8}" style="font-size:10px;font-weight:400">PORTO</text><circle cx="${ship[0]}" cy="${ship[1]}" r="8" fill="#286b75" stroke="#fffbed" stroke-width="3"/><text x="${ship[0]-15}" y="${ship[1]+31}" style="font-size:12px">내 배</text><text x="140" y="95" style="font-size:18px;opacity:.75">북대서양</text></svg>`;

let fragment = await readFile(path.join(folder, 'source.html'), 'utf8');
fragment = fragment.replace('__ASSETS__', JSON.stringify(assets));
fragment = fragment.replace('__MAPS__', JSON.stringify({porto: portoMap}));
if (Buffer.byteLength(fragment) >= 1_000_000) throw Error('Preview exceeds inline limit');
await mkdir(inlineFolder, {recursive: true});
await writeFile(inlineFile, fragment);
const standalone = '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>바람의 항로 · 11월 13일 화면 시안</title><style>body{margin:0;background:#f7f6ef;padding:28px} @media(max-width:600px){body{padding:12px}}</style></head><body>' + fragment + '</body></html>';
await writeFile(path.join(folder, 'index.html'), standalone);

const server = createServer((_request, response) => {
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.end(standalone);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const profile = await mkdtemp(path.join(tmpdir(), 'windward-mockups-nov13-'));
const browser = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--disable-background-networking',
  '--no-first-run', '--disable-extensions', '--hide-scrollbars',
  '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank',
], {windowsHide: true, stdio: 'ignore'});

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let socket;
const results = [];
try {
  let debuggingPort;
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      debuggingPort = (await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0];
      break;
    } catch {
      await pause(100);
    }
  }
  if (!debuggingPort) throw Error('Chrome did not start');
  const targets = await (await fetch(`http://127.0.0.1:${debuggingPort}/json/list`)).json();
  socket = new WebSocket(targets[0].webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, {once: true});
    socket.addEventListener('error', reject, {once: true});
  });
  let sequence = 0;
  const pending = new Map();
  const runtimeErrors = [];
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') runtimeErrors.push(message.params.exceptionDetails.text);
    if (!message.id) return;
    const callbacks = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) callbacks.reject(Error(message.error.message));
    else callbacks.resolve(message.result);
  });
  function cdp(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++sequence;
      pending.set(id, {resolve, reject});
      socket.send(JSON.stringify({id, method, params}));
    });
  }
  async function evaluate(expression) {
    const result = await cdp('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true});
    if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  await cdp('Page.enable');
  await cdp('Runtime.enable');
  await cdp('Emulation.setDeviceMetricsOverride', {width: 1320, height: 1000, deviceScaleFactor: 1, mobile: false});
  await cdp('Page.navigate', {url: 'http://127.0.0.1:' + server.address().port});
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await evaluate("!!document.getElementById('windward-nov13')?.preview")) break;
    await pause(100);
  }
  const scenes = await evaluate("document.getElementById('windward-nov13').preview.scenes");
  for (const [index, [scene, title]] of scenes.entries()) {
    for (const device of ['desktop', 'mobile']) {
      const width = device === 'desktop' ? 1320 : 430;
      await cdp('Emulation.setDeviceMetricsOverride', {width, height: 1000, deviceScaleFactor: 1, mobile: false});
      await evaluate(`document.getElementById('windward-nov13').preview.show(${JSON.stringify(scene)},${JSON.stringify(device)})`);
      await evaluate("document.fonts.ready.then(()=>Promise.all([...document.images].map(image=>image.decode().catch(()=>{}))))");
      const metrics = await evaluate(`(()=>{
        const el=document.getElementById('ww-product'),r=el.getBoundingClientRect();
        const broken=[...el.querySelectorAll('img')].filter(i=>!i.complete||!i.naturalWidth).length;
        const overflow=[...el.querySelectorAll('*')].filter(e=>{if(e instanceof SVGElement)return false;const b=e.getBoundingClientRect();return b.width>0&&b.height>0&&(b.right>r.right+2||b.left<r.left-2)}).map(e=>e.tagName+'.'+e.className);
        return {x:r.x,y:r.y,width:r.width,height:r.height,broken,overflow};
      })()`);
      if (metrics.broken || metrics.overflow.length) throw Error(scene + '/' + device + ' layout ' + JSON.stringify(metrics));
      const screenshot = await cdp('Page.captureScreenshot', {
        format: 'jpeg', quality: 92, captureBeyondViewport: true,
        clip: {x: metrics.x, y: metrics.y, width: metrics.width, height: metrics.height, scale: 1},
      });
      const file = `${String(index + 1).padStart(2, '0')}-${scene}-${device}.jpg`;
      await writeFile(path.join(folder, file), Buffer.from(screenshot.data, 'base64'));
      results.push({scene, title, device, file, width: metrics.width, height: metrics.height});
    }
  }
  // Verify meaningful prototype interactions, without accessing any game account or database.
  await evaluate("document.getElementById('windward-nov13').preview.show('trade','desktop')");
  const tradeBefore = await evaluate("document.getElementById('ww-total').textContent");
  await evaluate("document.getElementById('ww-qty').value=1000;document.getElementById('ww-qty').dispatchEvent(new Event('input',{bubbles:true}))");
  const tradeAfter = await evaluate("document.getElementById('ww-total').textContent");
  await evaluate("document.getElementById('ww-trade-confirm').click();document.getElementById('ww-sell-mode').click()");
  const resale = await evaluate("document.getElementById('ww-unit').textContent");
  if (tradeBefore !== '10,000 D' || tradeAfter !== '100,000 D' || resale !== '88') throw Error('Separated price preview failed');
  await evaluate("document.getElementById('windward-nov13').preview.show('tavern');document.querySelector('[data-reveal=note-two]').click()");
  if (!await evaluate("!document.getElementById('note-two').hidden&&!!document.getElementById('ww-note')")) throw Error('Rumor expansion failed');
  await evaluate("document.getElementById('windward-nov13').preview.show('canal');document.getElementById('ww-allow-canal').click()");
  if (!await evaluate("document.getElementById('ww-canal-option').hidden&&document.getElementById('ww-toll').textContent==='0 D'")) throw Error('Canal toggle failed');
  await evaluate("document.getElementById('windward-nov13').preview.show('trade');document.getElementById('windward-nov13').preview.show('canal')");
  if (!await evaluate("!document.getElementById('ww-allow-canal').checked&&document.getElementById('ww-toll').textContent==='0 D'")) throw Error('Canal preference was lost on screen change');
  await evaluate("document.getElementById('ww-allow-canal').click()");
  if (!await evaluate("!document.getElementById('ww-canal-option').hidden&&document.getElementById('ww-toll').textContent==='240 D'")) throw Error('Canal automatic selection failed');
  await evaluate("document.getElementById('windward-nov13').preview.show('ship');document.querySelector('[data-ship-tab=yard]').click()");
  if (!await evaluate("document.getElementById('ww-ship-tools').textContent.includes('항구에 맡기기')")) throw Error('Ship tools failed');
  for (const width of [320, 360, 390, 430, 1024]) {
    await cdp('Emulation.setDeviceMetricsOverride', {width, height: 1000, deviceScaleFactor: 1, mobile: false});
    for (const [scene] of scenes) {
      await evaluate(`document.getElementById('windward-nov13').preview.show(${JSON.stringify(scene)},${JSON.stringify(width < 600 ? 'mobile' : 'desktop')})`);
      if (await evaluate('document.documentElement.scrollWidth>window.innerWidth+1')) throw Error(scene + ' viewport overflow at ' + width);
    }
  }
  if (runtimeErrors.length) throw Error('Runtime errors ' + runtimeErrors.join(', '));
  await writeFile(path.join(folder, 'manifest.json'), JSON.stringify({
    date: '2026-11-13', inlineFile, geometrySource: land.source,
    screenshots: results, verified: ['24 image renders', '320/360/390/430/1024px widths', 'trade quantity and separate prices', 'rumor expand', 'canal toggle', 'ship tabs'],
  }, null, 2));
  console.log(JSON.stringify({inlineFile, screenshots: results.length, fragmentBytes: Buffer.byteLength(fragment), folder}));
} finally {
  socket?.close();
  browser.kill();
  server.close();
}
