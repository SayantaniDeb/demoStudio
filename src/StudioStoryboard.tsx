import {useEffect,useRef} from 'react';
import {Play,Pause,ChevronLeft,ChevronRight,Layers} from 'lucide-react';

type Props={revision:unknown;chapters:{time:number;label:string}[];time:number;duration:number;playing:boolean;disabled:boolean;draw:(ctx:CanvasRenderingContext2D,time:number)=>void;seek:(time:number)=>void;toggle:()=>void;headline:string;subcopy:string;setHeadline:(value:string)=>void;setSubcopy:(value:string)=>void};
function Thumbnail({draw,time,revision}:{draw:Props['draw'];time:number;revision:unknown}){
 const ref=useRef<HTMLCanvasElement>(null);const render=useRef(draw);render.current=draw;
 useEffect(()=>{const ctx=ref.current?.getContext('2d');if(ctx){ctx.save();ctx.scale(.25,.25);render.current(ctx,time);ctx.restore()}},[revision,time]);
 return <canvas ref={ref} width={320} height={180} aria-hidden="true"/>;
}
export function StudioStoryboard(p:Props){
 const selected=Math.max(0,p.chapters.reduce((last,chapter,i)=>chapter.time<=p.time?i:last,0));
 return <section className="studio-storyboard" aria-label="Scene storyboard">
  <div className="studio-storyboard-heading"><h2><Layers size={17}/>Scene Storyboard</h2><span>{p.chapters.length} SCENES · {p.duration.toFixed(1)}S TOTAL</span><div className="studio-playback"><button aria-label="Previous scene" disabled={p.disabled||selected===0} onClick={()=>p.seek(p.chapters[selected-1].time)}><ChevronLeft size={17}/></button><button className="studio-play" aria-label={p.playing?'Pause animation':'Play animation'} disabled={p.disabled} onClick={p.toggle}>{p.playing?<Pause size={17}/>:<Play size={17}/>}</button><button aria-label="Next scene" disabled={p.disabled||selected>=p.chapters.length-1} onClick={()=>p.seek(p.chapters[selected+1].time)}><ChevronRight size={17}/></button></div></div>
  <div className="studio-scene-grid">{p.chapters.map((chapter,i)=><button key={chapter.time} className={`studio-scene ${selected===i?'active':''}`} aria-pressed={selected===i} disabled={p.disabled} onClick={()=>p.seek(chapter.time+.05)}><div className="studio-scene-image"><Thumbnail draw={p.draw} time={chapter.time+.9} revision={p.revision}/><span>{((p.chapters[i+1]?.time??p.duration)-chapter.time).toFixed(1)}s</span></div><strong>{String(i+1).padStart(2,'0')} · {chapter.label}</strong><small>{selected===i?'Active scene':'Select to preview'}</small></button>)}</div>
  <div className="studio-copy-editor"><div><span>STORY TEXT COPY</span><small>Syncs to preview and export</small></div><label>HEADLINE<input value={p.headline} onChange={e=>p.setHeadline(e.target.value)}/></label><label>SUBCOPY<input value={p.subcopy} onChange={e=>p.setSubcopy(e.target.value)}/></label></div>
 </section>;
}
