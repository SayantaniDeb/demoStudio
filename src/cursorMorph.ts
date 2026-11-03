import type { CursorAppearance } from './cursor';
type Point={x:number;y:number};
type Layer={shape:CursorAppearance;opacity:number};
// Equal-height silhouettes, all measured from the interaction hotspot.
const contours:Record<string,number[][]>={
  arrow:[[0,0],[.035,.82],[.22,.64],[.39,1],[.54,.925],[.37,.565],[.63,.56]],
  hand:[[0,0],[-.06,.025],[-.08,.075],[-.08,.51],[-.18,.40],[-.24,.39],[-.28,.43],[-.27,.49],[-.02,.82],[.09,.95],[.44,.95],[.54,.60],[.55,.48],[.52,.40],[.44,.36],[.35,.35],[.25,.37],[.16,.39],[.08,.43],[.08,.075],[.06,.025]],
  ibeam:[[0,-.5],[-.18,-.5],[-.18,-.44],[-.035,-.44],[-.035,.44],[-.18,.44],[-.18,.5],[.18,.5],[.18,.44],[.035,.44],[.035,-.44],[.18,-.44],[.18,-.5]],
};
const count=96;
function sampleContour(input:number[][]):Point[]{
  let points=input.map(([x,y])=>({x,y}));
  const height=Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y));
  points=points.map(p=>({x:p.x/height,y:p.y/height}));
  const area=points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p.x*q.y-q.x*p.y;},0);
  // Match winding while preserving the first vertex at the top of the cursor.
  if(area>0)points=[points[0],...points.slice(1).reverse()];
  const lengths=points.map((p,i)=>{const q=points[(i+1)%points.length];return Math.hypot(q.x-p.x,q.y-p.y);});
  const perimeter=lengths.reduce((a,b)=>a+b,0);
  return Array.from({length:count},(_,i)=>{
    let distance=i/count*perimeter,edge=0;
    while(edge<lengths.length-1&&distance>lengths[edge])distance-=lengths[edge++];
    const a=points[edge],b=points[(edge+1)%points.length],mix=distance/lengths[edge];
    return {x:a.x+(b.x-a.x)*mix,y:a.y+(b.y-a.y)*mix};
  });
}
const shapes=Object.fromEntries(Object.entries(contours).map(([key,value])=>[key,sampleContour(value)]));
/** A single continuous silhouette avoids the double cursor produced by opacity fades. */
export function automaticCursorOutline(layers:readonly Layer[]):Point[]{
  const valid=layers.filter(layer=>shapes[layer.shape]&&layer.opacity>0);
  const total=valid.reduce((sum,layer)=>sum+layer.opacity,0);
  if(!total)return shapes.arrow;
  const points=Array.from({length:count},(_,i)=>valid.reduce((p,layer)=>({
    x:p.x+shapes[layer.shape][i].x*layer.opacity/total,
    y:p.y+shapes[layer.shape][i].y*layer.opacity/total,
  }),{x:0,y:0}));
  // Different contour perimeters must not make intermediate pointers shrink.
  const height=Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y));
  return points.map(p=>({x:p.x/height,y:p.y/height}));
}
export function paintAutomaticCursor(ctx:CanvasRenderingContext2D,x:number,y:number,size:number,layers:readonly Layer[]){
  const points=automaticCursorOutline(layers);
  ctx.save();ctx.translate(x,y);ctx.fillStyle='#fff';ctx.strokeStyle='#25292e';
  ctx.lineWidth=Math.max(1.2,size/20);ctx.lineJoin='round';ctx.lineCap='round';
  ctx.shadowColor='#11182720';ctx.shadowBlur=size*.12;ctx.shadowOffsetY=size*.04;
  ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x*size,p.y*size):ctx.moveTo(p.x*size,p.y*size));
  ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
}
