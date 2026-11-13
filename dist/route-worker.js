import {Navigator} from './engine.js?v=2026.11.14-supply-storage';
import {createChartDetail} from './chart-waterways.js?v=2026.11.14-supply-storage';

let nav;
self.onmessage=({data})=>{
  if(data.type==='chart'){
    const {grid,rivers,features}=data;
    nav=new Navigator(grid,rivers,createChartDetail(features));
    return;
  }
  const {id,from,to,options}=data;
  try{self.postMessage({id,route:nav.route(from,to,options)});}
  catch(error){self.postMessage({id,error:error.message});}
};
