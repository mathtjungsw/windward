export function lastSeenText(value,online=false){
 if(online)return '최종 접속 확인: 현재 접속 중';
 if(!Number.isFinite(value)||value<=0)return '최종 접속 확인: 기록 없음';
 return '최종 접속 확인: '+new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(value)+' (한국 시간)';
}
