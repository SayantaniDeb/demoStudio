import type {CursorSample} from './extensionBridge';
// Keep the real cursor as the focus; zoom activity fades after a quiet hold.
export function cursorFocusPoints(samples:CursorSample[],duration:number):FocusPoint[]{
 const sorted=samples.filter(p=>Number.isFinite(p.time)&&Number.isFinite(p.x)&&Number.isFinite(p.y)).slice().sort((a,b)=>a.time-b.time);
 if(!sorted.length)return [];
 let last=sorted[0];const events:number[]=[];
 for(const p of sorted){if(p.click||Math.hypot(p.x-last.x,p.y-last.y)>.008){events.push(p.time);last=p}}
 const points:FocusPoint[]=[];let index=0,event=-1;
 const length=Math.max(duration,sorted[sorted.length-1].time);
 for(let time=0;time<length+.1;time+=.1){const t=Math.min(time,length);
 while(index<sorted.length-1&&sorted[index+1].time<=t)index++;
 while(event<events.length-1&&events[event+1]<=t+.15)event++;
 const a=sorted[index],b=sorted[Math.min(index+1,sorted.length-1)],mix=Math.max(0,Math.min(1,(t-a.time)/Math.max(.001,b.time-a.time)));
 const idle=event<0?Infinity:t-events[event];const strength=idle<1.2?1:Math.max(0,1-(idle-1.2)/.8);
 const intro=Math.min(1,t/.6),outro=Math.min(1,(length-t)/.7);
 points.push({time:t,x:Math.max(0,Math.min(1,a.x+(b.x-a.x)*mix))*100,y:Math.max(0,Math.min(1,a.y+(b.y-a.y)*mix))*100,strength:strength*Math.max(0,Math.min(intro,outro))});
 }
 return points;
}
// Center the focus where possible, clamping the crop at the footage edges.
export function frameOffset(size:number,scaled:number,focus:number,follow:boolean){
 if(!follow)return (size-scaled)*focus/100;
 if(scaled<=size)return (size-scaled)/2;
 return Math.max(size-scaled,Math.min(0,size/2-scaled*focus/100));
}
export type FocusPoint={time:number;x:number;y:number;strength:number};
export function viewAt(points:FocusPoint[],time:number,enabled:boolean,base:number,x:number,y:number){
 if(!enabled||!points.length)return {zoom:base,x,y};
 const sample=(at:number)=>{let i=0;while(i<points.length-1&&points[i+1].time<=at)i++;const a=points[i],b=points[Math.min(i+1,points.length-1)];const p=Math.max(0,Math.min(1,(at-a.time)/Math.max(.001,b.time-a.time)));return {x:a.x+(b.x-a.x)*p,y:a.y+(b.y-a.y)*p,strength:a.strength+(b.strength-a.strength)*p}};
 let sx=0,sy=0,strength=0,weight=0;
 for(let i=-8;i<=8;i++){const offset=i*.06,w=Math.exp(-offset*offset/(2*.2*.2)),p=sample(time+offset);sx+=p.x*w;sy+=p.y*w;strength+=p.strength*w;weight+=w}
 return {zoom:1+(base-1)*strength/weight,x:sx/weight,y:sy/weight};
}
export async function analyzeActivity(url:string,onProgress:(value:number)=>void,knownDuration?:number):Promise<FocusPoint[]>{
 const v=document.createElement('video');v.src=url;v.muted=true;v.preload='auto';
 const canvas=document.createElement('canvas');canvas.width=160;canvas.height=90;const ctx=canvas.getContext('2d',{willReadFrequently:true})!;
 try{
 await new Promise<void>((resolve,reject)=>{v.onloadedmetadata=()=>resolve();v.onerror=()=>reject(new Error('Could not read this video.'))});
 const length=Number.isFinite(v.duration)?v.duration:knownDuration;if(!length)throw new Error('Video duration is unavailable.');
 const interval=Math.max(0.65,length/180);const points:FocusPoint[]=[{time:0,x:50,y:50,strength:0}];let previous:Uint8ClampedArray|undefined;let last={x:50,y:50};
 for(let t=0;t<length;t+=interval){
 await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Video analysis timed out. Try a shorter recording.')),10000);v.onseeked=()=>{clearTimeout(timer);resolve()};v.currentTime=Math.min(t+0.01,length-0.001)});
 ctx.drawImage(v,0,0,160,90);const pixels=ctx.getImageData(0,0,160,90).data;
 if(previous){let weight=0,sx=0,sy=0,count=0;for(let y=5;y<85;y++)for(let x=5;x<155;x++){const i=(y*160+x)*4;const d=(Math.abs(pixels[i]-previous[i])+Math.abs(pixels[i+1]-previous[i+1])+Math.abs(pixels[i+2]-previous[i+2]))/3;if(d>12){weight+=d;sx+=x*d;sy+=y*d;count++}}const active=count>2&&count<9000;if(active){last={x:Math.max(15,Math.min(85,sx/weight/160*100)),y:Math.max(15,Math.min(85,sy/weight/90*100))}}points.push({time:t,...last,strength:active?1:(points[points.length-1].strength*0.95)})}
 previous=pixels;onProgress(Math.min(100,Math.round(t/length*100)));
 }onProgress(100);return points;
 }finally{v.removeAttribute('src');v.load()}
}
