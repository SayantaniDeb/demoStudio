type Sample={time:number;x:number;y:number};
const tracks=new WeakMap<object,Sample[]>();
/** Smooth telemetry once, then use a velocity-continuous path at playback time. */
export function recordedPointerAt(samples:readonly Sample[],time:number){
  if(!samples.length)return null;
  let points=tracks.get(samples);
  if(!points){
    const sorted=[...samples].sort((a,b)=>a.time-b.time);
    points=sorted.map((p,i)=>{
      let x=0,y=0,weight=0;
      for(let j=i;j>=0 && p.time-sorted[j].time<=.18;j--){const w=Math.exp(-.5*((p.time-sorted[j].time)/.06)**2);x+=sorted[j].x*w;y+=sorted[j].y*w;weight+=w;}
      for(let j=i+1;j<sorted.length && sorted[j].time-p.time<=.18;j++){const w=Math.exp(-.5*((p.time-sorted[j].time)/.06)**2);x+=sorted[j].x*w;y+=sorted[j].y*w;weight+=w;}
      return {time:p.time,x:x/weight,y:y/weight};
    });tracks.set(samples,points);
  }
  if(time<=points[0].time)return {x:points[0].x,y:points[0].y};
  if(time>=points.at(-1)!.time)return {x:points.at(-1)!.x,y:points.at(-1)!.y};
  let low=0,high=points.length-1;
  while(high-low>1){const mid=(low+high)>>1;if(points[mid].time<=time)low=mid;else high=mid;}
  const a=points[low],b=points[high],before=points[Math.max(0,low-1)],after=points[Math.min(points.length-1,high+1)];
  const dt=Math.max(.00001,b.time-a.time),u=Math.max(0,Math.min(1,(time-a.time)/dt));
  const interpolate=(key:'x'|'y')=>{
    const ma=(b[key]-before[key])/Math.max(.00001,b.time-before.time)*dt;
    const mb=(after[key]-a[key])/Math.max(.00001,after.time-a.time)*dt;
    const value=(2*u**3-3*u*u+1)*a[key]+(u**3-2*u*u+u)*ma+(-2*u**3+3*u*u)*b[key]+(u**3-u*u)*mb;
    return Math.max(Math.min(a[key], b[key]), Math.min(Math.max(a[key], b[key]), value));
  };
  return {x:interpolate('x'),y:interpolate('y')};
}
