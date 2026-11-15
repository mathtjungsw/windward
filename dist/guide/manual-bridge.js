if(window.parent!==window){
 document.documentElement.dataset.inGame='true';
 document.addEventListener('click',event=>{
  const link=event.target.closest('a[data-manual-menu],a[data-manual-game]');
  if(!link||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  event.preventDefault();
  window.parent.postMessage({type:'windward-manual',menu:link.dataset.manualMenu||''},location.origin);
 });
}
