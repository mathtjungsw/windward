// Development-only speed comparison. The production clock and saves are untouched.
export const previewPrefix='/__qa/speed/';

export const previewHeader=`
<section id="speed-preview" aria-label="첫 배 속도 비교">
  <div class="speed-title"><strong>첫 배 속도 비교</strong><span>리스본 출발 · 테스트 전용</span></div>
  <div class="speed-options" role="group" aria-label="화면 이동 배율">
    <button type="button" data-speed="1" aria-pressed="false">이전 기준</button>
    <button type="button" data-speed="2" aria-pressed="false">2배</button>
    <button type="button" data-speed="3" aria-pressed="false">3배</button>
    <button type="button" data-speed="4" aria-pressed="false">4배</button>
    <button type="button" data-speed="6" aria-pressed="true">6배 · 적용</button>
    <label>세부 조정 <input id="speed-range" type="range" min="1" max="8" step="0.25" value="6" aria-label="화면 이동 속도 배율"><output id="speed-value" for="speed-range">6배</output></label>
  </div>
  <div class="speed-actions">
    <button type="button" id="speed-sail" disabled>세투발로 자동 출항</button>
    <button type="button" id="speed-helm" disabled>직접 조종</button>
    <button type="button" id="speed-reset" disabled>리스본으로 초기화</button>
    <span id="speed-route" role="status">해도 준비 중…</span>
  </div>
</section>`;

export const previewStyles=`
<style>
  #speed-preview { display:grid; gap:7px; padding:9px 14px; background:#f4f8ed; border-bottom:1px solid #b3c3b6; color:#244e59; }
  .speed-title, .speed-options, .speed-actions { display:flex; align-items:center; flex-wrap:wrap; gap:6px; }
  .speed-title strong { font-size:16px; }
  .speed-title span, #speed-route { font-size:12px; }
  #speed-preview button { min-height:34px; padding:4px 11px; border:1px solid #92aa9f; border-radius:6px; background:#fffdf4; color:#254e59; font-size:13px; }
  #speed-preview button[aria-pressed=true], #speed-preview #speed-sail { background:#286572; color:white; }
  .speed-options label { display:flex; align-items:center; gap:5px; font-size:12px; }
  #speed-range { accent-color:#286572; width:100px; }
  #speed-value { min-width:3em; font-weight:700; }
  #speed-preview ~ .topbar #fleet-btn, #speed-preview ~ .topbar #world-badge, #speed-preview ~ .topbar #save-status,
  #speed-preview ~ main .rank-card, #speed-preview ~ main #chat-panel, #speed-preview ~ .bottom-bar #chat-toggle { display:none!important; }
  @media (min-width:851px) {
    .game-layout { height:calc(100dvh - 330px); }
    .game-layout>.chart, #desktop-panels { max-height:calc(100dvh - 330px); }
  }
  @media (max-width:850px) {
    #speed-preview { padding:7px 8px; }
    #speed-preview button { min-height:44px; padding-inline:8px; }
    #speed-route { flex-basis:100%; }
  }
</style>`;

export const previewEntry=`
account.seenVersion=RELEASE;
beginPlaying(initialState());
const slider=$('#speed-range');
const comparePort=PORT_BY_ID.setubal;
const comparePoint=[comparePort.lon,comparePort.lat];
const compareRoute=nav.route(state.position,comparePoint,{maxOffshore:ship(state).offshore});

function choosePreviewSpeed(rate){
  setPreviewSpeed(rate);
  slider.value=String(rate);
  $('#speed-value').value=rate+'배';
  $$('[data-speed]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.speed)===rate)));
  if(compareRoute){
    const {seconds}=voyageEstimate(initialState(),compareRoute);
    $('#speed-route').textContent='리스본 → 세투발 '+Math.round(compareRoute.total)+'해리 · 약 '+seconds.toFixed(1)+'초';
  }
  renderHUD();
}

function restartPreview(){
  if(modal.open)modal.close();
  ux.closeSheet();
  beginPlaying(initialState());
}

slider.oninput=()=>choosePreviewSpeed(Number(slider.value));
$$('[data-speed]').forEach(b=>b.onclick=()=>choosePreviewSpeed(Number(b.dataset.speed)));
$('#speed-reset').onclick=restartPreview;
$('#speed-helm').onclick=()=>{
  restartPreview();
  setControlMode('manual');
  $('.chart').focus({preventScroll:true});
};
$('#speed-sail').onclick=()=>{
  restartPreview();
  planDestination(comparePort.id,comparePoint,false);
  startVoyage();
};
$('#speed-reset').disabled=false;
$('#speed-helm').disabled=false;
$('#speed-sail').disabled=!compareRoute;
choosePreviewSpeed(6);
`;

export function previewShipRules(source){
  const clock=/export const ACTIVE_SECONDS_PER_DAY\s*=\s*(\d+(?:\.\d+)?)\s*;/;
  const match=source.match(clock);
  if(!match)throw Error('Cannot find the production clock for the speed preview.');
  // Keep the original comparison baseline after the selected pace is published.
  return source.replace(clock,`const BASE_SECONDS_PER_DAY=12;
export let ACTIVE_SECONDS_PER_DAY=BASE_SECONDS_PER_DAY;
export function setPreviewSpeed(rate){
  if(!Number.isFinite(rate)||rate<1||rate>8)throw RangeError('Unsupported preview speed.');
  ACTIVE_SECONDS_PER_DAY=BASE_SECONDS_PER_DAY/rate;
}`);
}
