import type {CaptionPlacement} from './captionPlacement';
import {captionAt,renderCaption,type Caption,type CaptionStyle,type CaptionAppearance} from './captions';
export async function exportCaptionedVideo(file:File,captions:Caption[],signal:AbortSignal,progress:(n:number)=>void,design:{style:CaptionStyle;appearance:CaptionAppearance;placement?:CaptionPlacement;drawFrame?:(ctx:CanvasRenderingContext2D,video:HTMLVideoElement)=>void}={style:'classic',appearance:{}}){
  if(typeof MediaRecorder==='undefined')throw new Error('Captioned video export is unavailable in this browser. Download SRT or VTT instead.');
  const mime=['video/mp4','video/webm;codecs=vp8,opus','video/webm'].find(type=>MediaRecorder.isTypeSupported(type));
  if(!mime)throw new Error('No supported video export format. Download subtitle files instead.');
  const video=document.createElement('video'),url=URL.createObjectURL(file);video.src=url;video.playsInline=true;video.preload='auto';
  let context:AudioContext|undefined,stream:MediaStream|undefined,raf=0;
  try{
    await new Promise<void>((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('Video could not load for export.')),15000);video.onloadeddata=()=>{clearTimeout(timeout);resolve();};video.onerror=()=>{clearTimeout(timeout);reject(new Error('This video codec is not supported.'));};});
    if(signal.aborted)throw new DOMException('Cancelled','AbortError');
    const canvas=document.createElement('canvas');const scale=Math.min(1,1920/video.videoWidth,1920/video.videoHeight);canvas.width=Math.round(video.videoWidth*scale/2)*2;canvas.height=Math.round(video.videoHeight*scale/2)*2;
    const ctx=canvas.getContext('2d')!;stream=canvas.captureStream(30);
    context=new AudioContext();const source=context.createMediaElementSource(video),destination=context.createMediaStreamDestination();source.connect(destination);destination.stream.getAudioTracks().forEach(track=>stream!.addTrack(track));await context.resume();
    const chunks:Blob[]=[];const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:8000000});
    return await new Promise<{blob:Blob;extension:string}>((resolve,reject)=>{
      let stopped=false;
      const stop=()=>{if(stopped)return;stopped=true;video.pause();if(recorder.state!=='inactive')recorder.stop();};
      const abort=()=>stop();signal.addEventListener('abort',abort,{once:true});
      recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      recorder.onerror=()=>{signal.removeEventListener('abort',abort);reject(new Error('Video export failed. Try another supported desktop browser.'));};
      recorder.onstop=()=>{signal.removeEventListener('abort',abort);if(signal.aborted)reject(new DOMException('Cancelled','AbortError'));else resolve({blob:new Blob(chunks,{type:mime}),extension:mime.startsWith('video/mp4')?'mp4':'webm'});};
      const draw=()=>{if(design.drawFrame)design.drawFrame(ctx,video);else ctx.drawImage(video,0,0,canvas.width,canvas.height);renderCaption(ctx,captionAt(captions,video.currentTime),design.style,undefined,design.placement,design.appearance);progress(Math.round(video.currentTime/video.duration*100));if(video.ended){stop();return;}raf=requestAnimationFrame(draw);};
      recorder.start();draw();video.onended=stop;void video.play().catch(error=>{stop();reject(error);});
    });
  }finally{cancelAnimationFrame(raf);video.pause();video.removeAttribute('src');video.load();stream?.getTracks().forEach(t=>t.stop());await context?.close();URL.revokeObjectURL(url);}
}
