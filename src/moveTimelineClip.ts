import type { DemoSegment } from './demoTimeline';
/** Move one clip without rippling the other clips. Overlaps snap to the nearest free boundary. */
export function moveTimelineClip(list: DemoSegment[], index: number, requested: number, gap: (length:number)=>DemoSegment) {
  let elapsed=0;
  const entries=list.map((clip,i)=>{const at=elapsed;elapsed+=clip.end-clip.start;return {clip,i,at};});
  const picked=entries[index]; if (!picked || picked.clip.gap) return list;
  const length=picked.clip.end-picked.clip.start;
  const others=entries.filter(e=>e.i!==index && !e.clip.gap);
  const free=(at:number)=>at>=0 && others.every(e=>at+length<=e.at+.0001 || at>=e.at+e.clip.end-e.clip.start-.0001);
  const candidates=[Math.max(0,requested),0,...others.flatMap(e=>[e.at-length,e.at+e.clip.end-e.clip.start])].filter(free);
  const at=candidates.sort((a,b)=>Math.abs(a-requested)-Math.abs(b-requested))[0];
  if (at===undefined || Math.abs(at-picked.at)<.001) return list;
  const ordered=[...others,{...picked,at}].sort((a,b)=>a.at-b.at);
  const result:DemoSegment[]=[];let cursor=0;
  for(const item of ordered){if(item.at>cursor+.001)result.push(gap(item.at-cursor));result.push(item.clip);cursor=item.at+item.clip.end-item.clip.start;}
  if(cursor<elapsed-.001)result.push(gap(elapsed-cursor));
  return result;
}
