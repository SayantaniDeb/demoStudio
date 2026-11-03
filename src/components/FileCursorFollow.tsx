import {useEffect,useRef,useState,type PointerEvent} from 'react';
import {paintCursor} from '../cursor';
import {type FocusPoint} from '../motion';
import {multipleZoomView,type FileZoomPath} from '../fileZoomPaths';
import {fittedMediaRect} from '../captionPlacement';
import {exportCaptionedVideo} from '../captionVideoExport';
import {saveMediaBlob} from '../mediaTools';
function formatTime(value:number){const t=Math.max(0,Number.isFinite(value)?value:0);return `${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;}
export function FileCursorFollow({file}:{file:File}) {
 const video=useRef<HTMLVideoElement>(null),canvas=useRef<HTMLCanvasElement>(null);
 const gesture=useRef<FocusPoint[]|null>(null),abort=useRef<AbortController|null>(null);
 const [url,setURL]=useState(''),[paths,setPaths]=useState<FileZoomPath[]>([]),[selected,setSelected]=useState<string|null>(null),[show,setShow]=useState(true),[zoom,setZoom]=useState(1.7),[busy,setBusy]=useState(''),[progress,setProgress]=useState(0),[error,setError]=useState(''),[armed,setArmed]=useState(false),[drawing,setDrawing]=useState(false),[draft,setDraft]=useState<FocusPoint[]|null>(null),[playing,setPlaying]=useState(false),[showPath,setShowPath]=useState(true),[time,setTime]=useState(0),[duration,setDuration]=useState(0);
 const points=paths.find(path=>path.id===selected)?.points||[];
 function changeZoom(amount:number){setZoom(amount);if(selected&&!draft)setPaths(old=>old.map(path=>path.id===selected?{...path,zoom:amount}:path));}
 useEffect(()=>{const next=URL.createObjectURL(file);setURL(next);return()=>{URL.revokeObjectURL(next);abort.current?.abort();};},[file]);
 function draw(ctx:CanvasRenderingContext2D,v:HTMLVideoElement,editing=false){
  const recording=gesture.current!==null;
  const frame=paths.length&&!recording&&!armed&&!(editing&&draft)?multipleZoomView(paths,v.currentTime):{zoom:1,x:50,y:50};
  const width=ctx.canvas.width,height=ctx.canvas.height,sw=width*frame.zoom,sh=height*frame.zoom;
  const left=Math.min(0,Math.max(width-sw,width/2-sw*frame.x/100)),top=Math.min(0,Math.max(height-sh,height/2-sh*frame.y/100));
  ctx.clearRect(0,0,width,height);ctx.drawImage(v,left,top,sw,sh);
  const current=recording?gesture.current!.at(-1):null;
  const currentPath=paths.find(path=>v.currentTime>=(path.points.find(p=>p.strength>0)?.time??Infinity)&&v.currentTime<=([...(path.points)].reverse().find(p=>p.strength>0)?.time??-Infinity));
  const first=currentPath?.points.find(p=>p.strength>0),last=currentPath?[...currentPath.points].reverse().find(p=>p.strength>0):undefined;
  if(show&&(current||(first&&last&&v.currentTime>=first.time&&v.currentTime<=last.time))){
   const p=current||frame;paintCursor(ctx,left+sw*p.x/100,top+sh*p.y/100,Math.max(18,width*.025),'arrow');
  }
  if(editing&&showPath){const path=(gesture.current||draft||points).filter(p=>p.strength>0);if(path.length){ctx.save();ctx.strokeStyle='#a8da60';ctx.lineWidth=Math.max(2,width/400);ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();path.forEach((p,i)=>{const x=left+sw*p.x/100,y=top+sh*p.y/100;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);});ctx.stroke();for(const p of [path[0],path[path.length-1]]){ctx.fillStyle='#a8da60';ctx.beginPath();ctx.arc(left+sw*p.x/100,top+sh*p.y/100,width/150,0,Math.PI*2);ctx.fill();}ctx.restore();}}

 }
 useEffect(()=>{let raf=0;const tick=()=>{const v=video.current,c=canvas.current;if(v&&c&&v.readyState>=2){if(c.width!==v.videoWidth)c.width=v.videoWidth;if(c.height!==v.videoHeight)c.height=v.videoHeight;const ctx=c.getContext('2d');if(ctx)draw(ctx,v,true);}raf=requestAnimationFrame(tick);};tick();return()=>cancelAnimationFrame(raf);},[paths,selected,show,zoom,url,armed,draft,showPath]);
 function sample(event:PointerEvent<HTMLCanvasElement>){const v=video.current;if(!v)return null;const rect=event.currentTarget.getBoundingClientRect(),fit=fittedMediaRect(rect.width,rect.height,v.videoWidth,v.videoHeight);return {time:v.currentTime,x:Math.max(0,Math.min(100,(event.clientX-rect.left-fit.x)/fit.width*100)),y:Math.max(0,Math.min(100,(event.clientY-rect.top-fit.y)/fit.height*100)),strength:1};}
 function finish(){const recorded=gesture.current;gesture.current=null;setDrawing(false);setArmed(false);video.current?.pause();if(!recorded?.length)return;const first=recorded[0],last=recorded[recorded.length-1];if(last.time-first.time<.05){setError('Hold and move while the video plays to record a path.');return;}setDraft([{...first,time:Math.max(0,first.time-.4),strength:0},...recorded,{...last,time:Math.min(video.current?.duration||last.time+.4,last.time+.4),strength:0}]);if(video.current)video.current.currentTime=Math.max(0,first.time-.4);}
 return <section className="file-follow-workspace"><h2>Draw zoom movement</h2><p>Choose where the zoom starts, then draw where the viewer should look.</p><ol className="file-zoom-steps"><li>Seek to a starting time</li><li>Choose Record zoom, then drag on the video</li><li>Save your zoom and press Preview</li></ol>
 <div className="file-follow-preview"><video ref={video} src={url} controls playsInline onLoadedMetadata={e=>setDuration(e.currentTarget.duration)} onTimeUpdate={e=>setTime(e.currentTarget.currentTime)} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onEnded={()=>{setPlaying(false);finish();}}/><canvas ref={canvas} className="caption-video-overlay" aria-label="Draw zoom movement on video" style={{pointerEvents:armed?'auto':'none',cursor:armed?'crosshair':'default',touchAction:'none'}} onPointerDown={e=>{if(!armed||busy)return;const v=video.current,p=sample(e);if(!v||!p)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);if(v.ended){v.currentTime=0;p.time=0;}gesture.current=[p];setError('');setDrawing(true);void v.play().catch(err=>{gesture.current=null;setDrawing(false);setArmed(false);setError(err.message);});}} onPointerMove={e=>{if(!gesture.current)return;const p=sample(e);if(!p)return;const last=gesture.current.at(-1)!;if(p.time-last.time>=.02)gesture.current.push(p);else if(p.time>last.time)gesture.current.push(p);}} onPointerUp={e=>{if(gesture.current){const p=sample(e);if(p&&p.time>gesture.current.at(-1)!.time)gesture.current.push(p);finish();}}} onPointerCancel={finish}/></div>
 <div className="file-path-timeline" aria-label="Zoom path timeline">
  <div className="file-path-time"><span>{formatTime(time)} / {formatTime(duration)}</span><button disabled={!!busy||drawing} onClick={()=>{const v=video.current;if(!v)return;v.pause();v.currentTime=Math.max(0,(points.find(p=>p.strength>0)?.time||0)-.5);}}>Back to zoom start</button></div>
  <input aria-label="Seek video timeline" type="range" min="0" max={duration||0} step=".01" value={Math.min(time,duration)} disabled={!duration||!!busy||drawing} onChange={e=>{const v=video.current;if(v){v.currentTime=+e.target.value;setTime(+e.target.value);}}}/>
  <div className="file-path-ruler"><span>0:00</span><span>{formatTime(duration/2)}</span><span>{formatTime(duration)}</span></div>
  <div className="file-path-zoom-track" style={{height:Math.max(32,paths.length*30+6)}}>{paths.length&&duration>0?paths.map((path,index)=><button key={path.id} type="button" aria-label={`Select zoom ${index+1}`} aria-pressed={selected===path.id} disabled={!!busy||drawing} style={{top:index*30+3,bottom:'auto',left:`${path.points[0].time/duration*100}%`,width:`${Math.max(.5,(path.points[path.points.length-1].time-path.points[0].time)/duration*100)}%`}} onClick={()=>{video.current?.pause();setSelected(path.id);setZoom(path.zoom);setDraft(null);setArmed(false);if(video.current)video.current.currentTime=path.points[0].time;}}>Zoom {index+1} · {path.zoom.toFixed(1)}×</button>):<small>Draw and save a movement to add zoom</small>}<i style={{left:`${duration?time/duration*100:0}%`}}/></div>

  <label className="file-path-zoom-amount">Zoom amount <input aria-label="Path follow zoom" type="range" min="1" max="3" step=".1" value={zoom} disabled={!!busy} onChange={e=>changeZoom(+e.target.value)}/><strong>{zoom.toFixed(1)}×</strong></label>
 </div>
 <div className="caption-placement-tools"><button disabled={!!busy||drawing} onClick={()=>{video.current?.pause();setSelected(null);setDraft(null);setZoom(1.7);setArmed(true);setError('');}}>{paths.length ? 'Add another zoom' : 'Record zoom'}</button><button disabled={!!busy||drawing} onClick={()=>{const v=video.current;if(!v)return;if(playing)v.pause();else {if(v.ended)v.currentTime=0;setArmed(false);void v.play().catch(e=>setError(e.message));}}}>{playing?'Pause':'Preview'}</button><button hidden={!armed&&!points.length&&!draft} disabled={!!busy||drawing} onClick={()=>{video.current?.pause();setArmed(!armed);setDraft(null);setError('');}}>{armed?'Cancel recording':'Re-record selected zoom'}</button></div>
 <details className="file-zoom-options"><summary>Cursor &amp; path display</summary><label><input type="checkbox" checked={show} disabled={!!busy} onChange={e=>setShow(e.target.checked)}/> Add a cursor to the zoom path</label><p>This adds a new pointer. A cursor already in your footage stays unchanged.</p><label><input type="checkbox" checked={showPath} onChange={e=>setShowPath(e.target.checked)}/> Show drawing guide in preview</label></details>
 {armed&&<p role="status">{drawing?'Recording movement… release to review.':'Hold and drag in the preview to start playback and draw.'}</p>}
 {draft&&<div className="caption-placement-tools"><button disabled={!!busy} onClick={()=>{const id=selected||crypto.randomUUID();setPaths(old=>selected?old.map(path=>path.id===selected?{...path,points:draft,zoom}:path):[...old,{id,points:draft,zoom}]);setSelected(id);setDraft(null);setArmed(false);}} className="file-zoom-primary">Save zoom</button><button onClick={()=>setDraft(null)}>Discard drawing</button></div>}

 {draft&&<p role="status">Review your drawn line, then save the path to apply it.</p>}
 {points.length>0&&!draft&&<p role="status">Zoom saved. Press Preview to watch it, or add another zoom.</p>}
 <button disabled={!points.length||!!busy||armed||!!draft} onClick={()=>{setPaths(old=>old.filter(path=>path.id!==selected));setSelected(null);setDraft(null);}}>Remove selected zoom</button>
 <button disabled={!paths.length||!!busy||armed||!!draft} onClick={async()=>{video.current?.pause();setBusy('Exporting video');setProgress(0);setError('');const controller=new AbortController();abort.current=controller;try{const result=await exportCaptionedVideo(file,[],controller.signal,setProgress,{style:'classic',appearance:{},drawFrame:(ctx,v)=>draw(ctx,v,false)});saveMediaBlob(result.blob,`${file.name.replace(/\.[^.]+$/,'')}-zoom-path.${result.extension}`);}catch(e){setError((e as Error).name==='AbortError'?'Export cancelled.':(e as Error).message);}finally{setBusy('');abort.current=null;}}}>Export video</button>
 {busy&&<><p role="status">{busy} · {progress}%</p><button onClick={()=>abort.current?.abort()}>Cancel export</button></>}{error&&<p role="alert">{error}</p>}
 </section>;
}
