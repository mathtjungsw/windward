export function createRoutePlanner(nav,chart,version){
  let worker=null,sequence=0;
  const pending=new Map();
  function stop(){
    worker?.terminate();
    worker=null;
    for(const item of pending.values())item.finish(false);
    pending.clear();
  }
  return async function route(from,to,options){
    if(typeof Worker==='undefined')return nav.route(from,to,options);
    try{
      if(!worker){
        worker=new Worker(new URL('./route-worker.js?v='+encodeURIComponent(version),import.meta.url),{type:'module'});
        worker.onmessage=({data})=>pending.get(data.id)?.finish(!data.error,data.route);
        worker.onerror=stop;
        worker.postMessage({type:'chart',...chart});
      }
      const id=++sequence;
      const result=await new Promise(resolve=>{
        const timeout=setTimeout(stop,12000);
        pending.set(id,{finish:(ok,value)=>{clearTimeout(timeout);pending.delete(id);resolve({ok,value});}});
        worker.postMessage({id,from,to,options});
      });
      if(result.ok)return result.value;
    }catch{stop();}
    return nav.route(from,to,options);
  };
}
