const CODES={KeyW:'ArrowUp',KeyS:'ArrowDown',KeyA:'ArrowLeft',KeyD:'ArrowRight'};
const LETTERS={w:'ArrowUp',s:'ArrowDown',a:'ArrowLeft',d:'ArrowRight'};
export function directionForKey(e,letters=true){
  if(e.isComposing||e.ctrlKey||e.altKey||e.metaKey)return null;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return e.key;
  return letters?(CODES[e.code]||LETTERS[String(e.key||'').toLowerCase()]||null):null;
}
export const isTypingTarget=target=>!!target?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"])');
