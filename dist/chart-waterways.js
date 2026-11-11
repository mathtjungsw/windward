import {CoastalDetail} from './coastal-detail.js?v=2026.11.12-cooperative-fleet-discoveries';

// Both straits lie on the visible shore data. These are navigable connections
// between cells of the world grid, with waypoints checked against that shore.
export const COARSE_CONNECTIONS=[
  {id:'dardanelles',path:[[26,40],[25.995,40.005],[26.31,40.065],[26.385,40.155],[26.4,40.185],[26.73,40.425],[27,40.5]]},
  {id:'marmara',path:[[27,40.5],[27.5,40.5],[29,41]]},
  {id:'bosphorus',path:[[29,41],[29.007,41.033],[29.04,41.063],[29.046,41.069],[29.073,41.132],[29.07,41.156],[29.5,41.5]]}
];
export function createChartDetail(features){
  return new CoastalDetail(features).refine(features,{west:28.8,south:40.85,east:29.55,north:41.55,step:.003});
}
