import {useEffect,useState} from 'react';
const cache=new Map<string,Promise<number[]>>();
async function decode(url:string,from:number,to?:number){const context=new AudioContext();try{const response=await fetch(url);if(!response.ok)return [];const buffer=await context.decodeAudioData(await response.arrayBuffer());return waveformPeaks(buffer,from,to);}catch{return [];}finally{await context.close();}}
export function waveformPeaks(buffer:AudioBuffer,from=0,to=buffer.duration){
 const channels=Array.from({length:buffer.numberOfChannels},(_,i)=>buffer.getChannelData(i));
 const first=Math.max(0,Math.floor(from*buffer.sampleRate)),last=Math.min(buffer.length,Math.ceil(to*buffer.sampleRate));
 return Array.from({length:160},(_,i)=>{const start=Math.floor(first+(last-first)*i/160),end=Math.floor(first+(last-first)*(i+1)/160);let peak=0;for(const channel of channels)for(let j=start;j<end;j+=Math.max(1,Math.floor((end-start)/150)))peak=Math.max(peak,Math.abs(channel[j]));return peak;});
}
export function ClipWaveform({url,buffer,from=0,to}:{url?:string;buffer?:AudioBuffer;from?:number;to?:number}){
 const [values,setValues]=useState<number[]>([]);
 useEffect(()=>{let active=true;setValues([]);if(buffer)setValues(waveformPeaks(buffer,from,to));else if(url){const key=`${url}:${from}:${to??'end'}`;if(!cache.has(key))cache.set(key,decode(url,from,to));cache.get(key)!.then(data=>{if(active)setValues(data);});}return()=>{active=false;};},[url,buffer,from,to]);
 if(!values.length)return null;
 const top=values.map((v,i)=>`${i*100/159},${50-Math.min(1,v*1.6)*45}`).join(' '),bottom=[...values].reverse().map((v,i)=>`${(159-i)*100/159},${50+Math.min(1,v*1.6)*45}`).join(' ');
 return <svg className="clip-waveform" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polygon points={`${top} ${bottom}`}/></svg>;
}
