import type { CursorAppearance } from './cursor';
/** A brief hand state spans each recorded click, including during seeking/export. */
export function automaticPointer(samples: readonly {time: number; click: boolean; shape?: string}[], time: number): CursorAppearance {
  let previous: typeof samples[number] | undefined;
  for (const sample of samples) { if (sample.time > time) break; previous = sample; }
  if (previous?.shape === 'ibeam' || previous?.shape === 'hand' || previous?.shape === 'arrow') return previous.shape;
  return samples.some(sample => sample.click && time >= sample.time - .08 && time <= sample.time + .24) ? 'hand' : 'arrow';
}

/** Timeline-based blending remains identical during playback, seeking, and export. */
export function pointerTransition(samples: Parameters<typeof automaticPointer>[0], time: number) {
  const duration = .16;
  const to = automaticPointer(samples,time);
  let boundary=time, from=to;
  for(let i=1;i<=16;i++) {
    const earlier=Math.max(0,time-i*duration/16);
    const shape=automaticPointer(samples,earlier);
    if(shape!==to) {
      from=shape;
      let low=earlier,high=boundary;
      for(let j=0;j<10;j++){const mid=(low+high)/2;if(automaticPointer(samples,mid)===to)high=mid;else low=mid;}
      boundary=high;
      const progress=Math.max(0,Math.min(1,(time-boundary)/duration));
      return {from,to,mix:progress*progress*(3-2*progress)};
    }
    boundary=earlier;
    if(earlier===0)break;
  }
  return {from:to,to,mix:1};
}

// Cache stable shape changes once per recording. A short hover must settle before
// it changes the rendered pointer; interrupted fades blend from the existing mix.
const stableTracks = new WeakMap<object, {time:number; shape:CursorAppearance}[]>();
export function pointerLayers(samples: Parameters<typeof automaticPointer>[0], time:number) {
  let events=stableTracks.get(samples);
  if(!events){
    const runs:{time:number;end:number;shape:CursorAppearance}[]=[];
    let known:CursorAppearance='arrow';
    const hasShapes=samples.some(s=>s.shape==='arrow'||s.shape==='hand'||s.shape==='ibeam');
    if(hasShapes){
      for(const sample of samples){
        if(sample.shape==='arrow'||sample.shape==='hand'||sample.shape==='ibeam')known=sample.shape;
        const last=runs.at(-1);
        if(last?.shape===known)last.end=sample.time;
        else {if(last)last.end=sample.time;runs.push({time:sample.time,end:sample.time,shape:known});}
      }
      events=[{time:0,shape:'arrow'}];
      for(let i=0;i<runs.length;i++){
        const run=runs[i];
        if(run.end-run.time>=.07 || i===runs.length-1)events.push({time:run.time,shape:run.shape});
      }
    }else{
      events=[{time:0,shape:'arrow'}];
      let until=-1;
      for(const sample of samples.filter(s=>s.click)){
        const start=Math.max(0,sample.time-.06);
        if(start>until){if(until>=0)events.push({time:until,shape:'arrow'});events.push({time:start,shape:'hand'});}
        until=Math.max(until,sample.time+.28);
      }
      if(until>=0)events.push({time:until,shape:'arrow'});
    }
    stableTracks.set(samples,events);
  }
  const weights = new Map<CursorAppearance,number>();
  // Integrate a smooth kernel exactly across the recorded shape intervals.
  // Centering on video time removes the previous delayed I-beam response.
  const duration=.28, center=time+duration/2;
  const cdf=(value:number)=>{const u=Math.max(0,Math.min(1,value));return u*u*(3-2*u);};
  for(let i=0;i<events.length;i++){
    const start=i===0 ? -Infinity : events[i].time;
    const end=events[i+1]?.time ?? Infinity;
    const weight=cdf((center-start)/duration)-cdf((center-end)/duration);
    if(weight>0.000001)weights.set(events[i].shape,(weights.get(events[i].shape)||0)+weight);
  }
  const total=[...weights.values()].reduce((sum,value)=>sum+value,0);
  return [...weights].map(([shape,weight])=>({shape,opacity:weight/total}));
}
