/** Person segmentation runs in a worker. Camera pixels never leave this device. */
let loading: Promise<void> | undefined, worker: Worker | undefined, sequence = 0;
const jobs = new Map<number, {resolve:(value:any)=>void; reject:(error:Error)=>void}>();
function request(data: object, transfer: Transferable[] = []) {
  return new Promise<any>((resolve,reject) => {
    const id=++sequence;
    const timeout=setTimeout(()=>{jobs.delete(id);reject(new Error('Camera cutout timed out'));},15000);
    jobs.set(id,{resolve:value=>{clearTimeout(timeout);resolve(value);},reject:error=>{clearTimeout(timeout);reject(error);}});
    worker!.postMessage({...data,id},transfer);
  });
}
export function prepareCameraCutout() {
  return loading ??= (async () => {
    worker = new Worker('/vision/cutout-worker.js');
    worker.onmessage = ({data}) => {
      const job=jobs.get(data.id); if(!job)return; jobs.delete(data.id);
      data.error ? job.reject(new Error(data.error)) : job.resolve(data);
    };
    worker.onerror = () => {for(const job of jobs.values())job.reject(new Error('Camera cutout worker failed'));jobs.clear();};
    await request({type:'init'});
  })().catch(error=>{worker?.terminate();worker=undefined;loading=undefined;throw error;});
}
export function cutoutAlpha(confidence:number) {
  const t=Math.max(0,Math.min(1,(confidence-.15)/.7));
  return Math.round(255*t*t*(3-2*t));
}
type Frame={mask:HTMLCanvasElement;output:HTMLCanvasElement;time:number;source:string;pending?:Promise<void>;failed?:boolean};
let frames=new WeakMap<HTMLVideoElement,Frame>();
export function resetCameraCutoutFrames(){frames=new WeakMap();}
function state(video:HTMLVideoElement) {
  let frame=frames.get(video);
  if(!frame){frame={mask:document.createElement('canvas'),output:document.createElement('canvas'),time:-1,source:''};frames.set(video,frame);}
  return frame;
}
export async function prepareCameraCutoutFrame(video:HTMLVideoElement) {
  await prepareCameraCutout();
  const frame=state(video);
  if(frame.pending){await frame.pending; if(Math.abs(frame.time-video.currentTime)<.08&&frame.source===video.currentSrc)return;}
  const time=video.currentTime,source=video.currentSrc;
  frame.pending=(async()=>{
    const image=await createImageBitmap(video,{resizeWidth:256,resizeHeight:Math.max(1,Math.round(256*video.videoHeight/video.videoWidth))});
    const result=await request({type:'frame',image},[image]);
    // Discard results from a previous asset or a seek, never show a stale person.
    if(source!==video.currentSrc || Math.abs(time-video.currentTime)>.5)return;
    frame.mask.width=result.width;frame.mask.height=result.height;
    const context=frame.mask.getContext('2d')!,pixels=context.createImageData(result.width,result.height);
    for(let i=0;i<result.pixels.length;i++){
      pixels.data[i*4]=pixels.data[i*4+1]=pixels.data[i*4+2]=255;
      pixels.data[i*4+3]=cutoutAlpha(result.pixels[i]);
    }
    context.putImageData(pixels,0,0);frame.time=time;frame.source=source;
  })();
  try{await frame.pending;}finally{frame.pending=undefined;}
}
export function cameraCutoutFrame(video:HTMLVideoElement,onError?:(error:Error)=>void):CanvasImageSource {
  const frame=state(video);
  if(!frame.failed && !frame.pending && (frame.time!==video.currentTime||frame.source!==video.currentSrc)) {
    void prepareCameraCutoutFrame(video).catch(error=>{frame.failed=true;onError?.(error);});
  }
  frame.output.width=video.videoWidth;frame.output.height=video.videoHeight;
  const ctx=frame.output.getContext('2d')!;
  if(frame.time<0||frame.source!==video.currentSrc||Math.abs(frame.time-video.currentTime)>.5)return frame.output;
  ctx.drawImage(video,0,0);
  ctx.globalCompositeOperation='destination-in';ctx.drawImage(frame.mask,0,0,frame.output.width,frame.output.height);
  ctx.globalCompositeOperation='source-over';return frame.output;
}
