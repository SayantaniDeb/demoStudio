import {findComponents,type ComponentCrop} from './components';
import type {DemoSegment} from './demoTimeline';
import type {WebsiteDemo} from './websiteDemo';

type Observation={time:number;end:number;text:string;regions:ComponentCrop[];image:string;signature:number[]};
const words=(text:string)=>new Set(text.toLowerCase().match(/[a-z0-9]{3,}/g)||[]);
export function relatedText(a:string,b:string){const x=words(a),y=words(b);if(!x.size||!y.size)return false;return [...x].filter(w=>y.has(w)).length/Math.min(x.size,y.size)>=.65}
const difference=(a:number[],b:number[])=>a.reduce((sum,v,i)=>sum+Math.abs(v-b[i]),0)/a.length;
const imageFrom=(src:string)=>new Promise<HTMLImageElement>((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Could not compose the extracted image.'));image.src=src});

// Scan the complete source, including footage outside current timeline cuts. OCR runs
// on changed screens and periodically on stable footage to catch subtle text changes.
export async function storyboardFromUpload(source:string,_ranges:DemoSegment[],name:string,kind:'video'|'image',progress:(value:number)=>void):Promise<WebsiteDemo>{
 const video=document.createElement('video');video.muted=true;video.preload='auto';video.src=source;
 const wait=(event:string,action?:()=>void)=>new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>{cleanup();reject(new Error('Uploaded media could not be decoded in time.'))},15000);const done=()=>{cleanup();resolve()},error=()=>{cleanup();reject(new Error('Uploaded media could not be decoded.'))},cleanup=()=>{clearTimeout(timer);video.removeEventListener(event,done);video.removeEventListener('error',error)};video.addEventListener(event,done,{once:true});video.addEventListener('error',error,{once:true});action?.()});
 let worker:Awaited<ReturnType<typeof import('tesseract.js')['createWorker']>>|undefined;
 try{
  if(video.readyState<1)await wait('loadedmetadata');
  // Imported WebM may lack duration metadata. Seeking beyond its end lets the
  // decoder resolve the actual duration without relying on the editor's cuts.
  if(!Number.isFinite(video.duration))await wait('seeked',()=>{video.currentTime=1e10});
  const duration=video.duration;if(!Number.isFinite(duration)||duration<=0)throw new Error('This video does not expose a readable duration.');
  const {createWorker,PSM}=await import('tesseract.js');worker=await createWorker('eng');await worker.setParameters({tessedit_pageseg_mode:PSM.AUTO});
  const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;const ctx=canvas.getContext('2d')!;
  const small=document.createElement('canvas');small.width=160;small.height=90;const sc=small.getContext('2d',{willReadFrequently:true})!;
  const ocr=document.createElement('canvas');ocr.width=960;ocr.height=540;const oc=ocr.getContext('2d')!;
  const groups:Observation[]=[];let previous:number[]=[];let lastOCR=-10;let samples=0,recognized=0;
  const count=kind==='image'?1:Math.max(2,Math.ceil(duration)+1);
  for(let i=0;i<count;i++){
   const time=kind==='image'?Math.min(.1,duration/2):Math.min(duration-.01,i*duration/(count-1));
   if(Math.abs(video.currentTime-time)>.001||video.readyState<2)await wait('seeked',()=>{video.currentTime=time});
   ctx.fillStyle='#fff';ctx.fillRect(0,0,1280,720);const scale=Math.min(1280/video.videoWidth,720/video.videoHeight),w=video.videoWidth*scale,h=video.videoHeight*scale;ctx.drawImage(video,(1280-w)/2,(720-h)/2,w,h);
   sc.drawImage(canvas,0,0,160,90);const pixels=sc.getImageData(0,0,160,90).data;const signature:number[]=[];for(let p=0;p<pixels.length;p+=16)signature.push((pixels[p]+pixels[p+1]+pixels[p+2])/3);
   const changed=!previous.length||difference(signature,previous)>9;samples++;
   if(changed||time-lastOCR>=4||i===count-1){
    oc.drawImage(canvas,0,0,960,540);const result=await worker.recognize(ocr,{}, {text:true,blocks:true});recognized++;lastOCR=time;
    const lines=(result.data.blocks||[]).flatMap(b=>b.paragraphs.flatMap(p=>p.lines)).filter(l=>l.confidence>45&&l.text.trim().length>2);
    const text=(lines.map(l=>l.text.trim()).join(' ')||result.data.text).replace(/\s+/g,' ').slice(0,1200);
    const regions:ComponentCrop[]=lines.map(l=>({x:l.bbox.x0/960,y:l.bbox.y0/540,width:(l.bbox.x1-l.bbox.x0)/960,height:(l.bbox.y1-l.bbox.y0)/540,text:l.text.trim()}));
    const visual=findComponents(pixels,160,90).filter(c=>c.width*c.height<.75);
    const last=groups.at(-1);const same=last&&(relatedText(last.text,text)||(!text&&!last.text&&difference(signature,last.signature)<12));
    if(same){last.end=time;if(regions.length>last.regions.filter(r=>r.text).length||text.length>last.text.length){last.regions=[...regions,...visual];last.text=text;last.image=canvas.toDataURL('image/jpeg',.84)}}
    else groups.push({time,end:time,text,regions:[...regions,...visual],image:canvas.toDataURL('image/jpeg',.84),signature});
    // Bounded image memory for long uploads; retain chronological coverage.
    if(groups.length>36){let index=1;for(let j=2;j<groups.length-1;j++)if(groups[j].end-groups[j].time<groups[index].end-groups[index].time)index=j;groups.splice(index,1)}
   }
   previous=signature;progress(Math.round((i+1)/count*85));
  }
  const chosen=groups.length<=3?groups:[groups[0],groups.slice(1,-1).sort((a,b)=>(b.regions.length+(b.end-b.time)/4)-(a.regions.length+(a.end-a.time)/4))[0],groups.at(-1)!];
  const sections:{title:string;body:string}[]=[],composites:string[]=[];
  for(const [index,group] of chosen.entries()){
   const sourceImage=await imageFrom(group.image);const title=group.regions.find(r=>r.text&&r.text.length>=4)?.text?.slice(0,70)||group.text.slice(0,70)||`Visual moment ${index+1}`;
   sections.push({title,body:group.text||'Visual content detected in the uploaded source.'});
   const board=document.createElement('canvas');board.width=1280;board.height=720;const bc=board.getContext('2d')!;bc.fillStyle='#f1f0eb';bc.fillRect(0,0,1280,720);bc.fillStyle='#27272a';bc.font='600 30px Arial';bc.fillText(title,48,57,1184);
   bc.save();bc.shadowColor='#27272a25';bc.shadowBlur=24;bc.shadowOffsetY=12;bc.fillStyle='#fff';bc.beginPath();bc.roundRect(40,90,800,580,24);bc.fill();bc.restore();bc.drawImage(sourceImage,64,132,752,423);
   // Spatially nearby text and foreground regions are paired into source-backed
   // stickers. Never fabricate controls that were not present in the footage.
   const candidates=group.regions.filter(r=>r.width>.015&&r.height>.012).sort((a,b)=>Number(!!b.text)-Number(!!a.text));const stickers:ComponentCrop[]=[];
   for(const r of candidates){if(stickers.some(s=>Math.hypot(s.x-r.x,s.y-r.y)<.13))continue;const nearby=group.regions.filter(n=>Math.hypot(n.x+n.width/2-r.x-r.width/2,n.y+n.height/2-r.y-r.height/2)<.16);const x=Math.max(0,Math.min(...nearby.map(n=>n.x),r.x)-.015),y=Math.max(0,Math.min(...nearby.map(n=>n.y),r.y)-.015);stickers.push({x,y,width:Math.min(1-x,Math.max(...nearby.map(n=>n.x+n.width),r.x+r.width)-x+.015),height:Math.min(1-y,Math.max(...nearby.map(n=>n.y+n.height),r.y+r.height)-y+.015),text:r.text});if(stickers.length===3)break}
   if(!stickers.length)stickers.push({x:.1,y:.1,width:.8,height:.8});
   for(const [j,r] of stickers.entries()){const x=880,y=108+j*182;bc.save();bc.shadowColor='#27272a20';bc.shadowBlur=18;bc.shadowOffsetY=8;bc.fillStyle='#fff';bc.beginPath();bc.roundRect(x,y,352,158,18);bc.fill();bc.restore();const scale=Math.min(320/(r.width*1280),110/(r.height*720));const w=r.width*1280*scale,h=r.height*720*scale;bc.drawImage(sourceImage,r.x*1280,r.y*720,r.width*1280,r.height*720,x+16+(320-w)/2,y+14,w,h);bc.fillStyle='#667e42';bc.font='500 14px Arial';bc.fillText(r.text?.slice(0,42)||'Visual detail',x+16,y+143,320)}
   bc.fillStyle='#52525b';bc.font='16px Arial';bc.fillText(`${Math.floor(group.time)}s – ${Math.ceil(group.end)}s · ${name}`,64,633,752);composites.push(board.toDataURL('image/png'));progress(85+Math.round((index+1)/chosen.length*15));
  }
  const assets=[groups[0].image,...composites,...chosen.map(g=>g.image)].slice(0,6);
  return {sourceType:kind,url:'https://uploaded-media.invalid/',brand:name,title:sections[0].title,description:sections[0].body.slice(0,160),cta:sections.at(-1)!.title,accent:'#667e42',sections,capturedAt:new Date().toISOString(),analysis:{duration,samples,recognized,groups:groups.map(g=>({start:g.time,end:g.end,text:g.text})),imageIndices:composites.map((_,i)=>i+1)},motion:{assets,catalog:sections.map((s,i)=>({label:s.title,value:(i+1)/(assets.length-1)})),template:'cinematic'}};
 }finally{video.removeAttribute('src');video.load();await worker?.terminate()}
}
