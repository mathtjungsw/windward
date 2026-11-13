import {PORT_BY_ID,ACTIVE_PORT_BY_ID} from './data.js?v=2026.11.13-stories-harbors-tax';
import {ship,voyageEstimate,positionAlong,makeRoute} from './engine.js?v=2026.11.13-stories-harbors-tax';

export const NAVIGATION_VERSION=3;

function extendAcapulcoVoyage(game,nav,voyage){
  const end=voyage.path.at(-1);
  if(end[0]!==-100||end[1]!==16.5)return;
  const berth=nav.approach(PORT_BY_ID.acapulco);
  if(!berth||!nav.clearOcean(end,berth))return;
  const route=nav.annotate({...voyage,...makeRoute([...voyage.path,berth])});
  if(voyage.kind!=='rescue'&&voyage.kind!=='transition'){
    route.foodRemaining=voyageEstimate(game,route,route.travelled).food;
  }
  game.voyage=route;
}

// Reconcile only navigation. This never calls arrival, rescue or discovery awards.
export function reconcileNavigation(game,nav){
  if(!nav?.detail)return null;
  if(game.voyage?.target==='acapulco')extendAcapulcoVoyage(game,nav,game.voyage);
  const previous=game.voyage;
  if(previous?.canal||previous?.passages?.length){
    const port=PORT_BY_ID[previous.target],berth=port&&nav.approach(port),end=previous.path.at(-1);
    if(berth&&(Math.abs(end[0]-berth[0])>1e-7||Math.abs(end[1]-berth[1])>1e-7)&&nav.clear(end,berth)){
      const route=nav.annotate({...previous,...makeRoute([...previous.path,berth])});
      route.foodRemaining=voyageEstimate(game,route,route.travelled).food;
      game.voyage=route;
    }
    game.navigationVersion=NAVIGATION_VERSION;return null;
  }
  if(game.port&&!previous){
    const port=PORT_BY_ID[game.port],berth=port&&nav.approach(port);
    if(berth)game.position=[...berth];
    game.navigationVersion=NAVIGATION_VERSION;
    return null;
  }
  if(game.navigationVersion===NAVIGATION_VERSION)return null;
  game.navigationVersion=NAVIGATION_VERSION;
  if(!nav.isLand(game.position)&&!previous)return null;
  if(nav.isLand(game.position)){
    const water=nav.berthNear(game.position);
    if(water)game.position=water;
  }
  if(!previous)return '위치를 확인해 가까운 바다에서 이어갑니다.';
  const safe=previous.kind==='rescue'||previous.kind==='transition', port=ACTIVE_PORT_BY_ID[previous.target];
  const target=port?nav.approach(port):previous.target?null:previous.path.at(-1);
  const route=target&&!nav.isLand(game.position)?nav.route(game.position,target,{maxOffshore:safe?Infinity:ship(game).offshore}):null;
  if(!route||route.total<.0001){
    if(safe){
      game.rescueReplanPending=true;
      return null;
    }
    game.voyage=null;
    game.controlMode='auto';
    return '새 해도에서 항로를 이어갈 수 없어요. 현재 위치에서 목적지를 다시 선택하세요.';
  }
  game.voyage={...previous,...route,travelled:0,foodRemaining:safe?0:voyageEstimate(game,{...previous,...route}).food};
  return '현재 위치에서 새 해도에 맞춰 항로를 다시 계산했어요.';
}
