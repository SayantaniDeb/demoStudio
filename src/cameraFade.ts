/** Finish before the last decoded frame, which media playback can hold at EOF. */
export function cameraFade(time:number,start:number,end:number,hidden=false) {
  if(hidden || !Number.isFinite(time) || end<=start || time<start || time>=end) return 0;
  const length=end-start;
  const settle=Math.min(.08,length*.1);
  const finish=end-settle;
  const ramp=Math.min(.65,(finish-start)/3);
  if(time>=finish || ramp<=0) return 0;
  const ease=(n:number)=>{const t=Math.max(0,Math.min(1,n));return t*t*t*(t*(t*6-15)+10);};
  return ease((time-start)/ramp)*ease((finish-time)/ramp);
}
