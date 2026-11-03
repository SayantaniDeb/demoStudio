import type {Caption} from './captions';
export const maxMediaBytes=250*1024*1024;
export function validateMediaFile(file:{name:string;type:string;size:number}) {
  if(!/^(audio|video)\//.test(file.type)&&! /\.(mp3|mp4|m4a|wav|webm|mov|ogg|flac)$/i.test(file.name))throw new Error('Choose an audio or video file, such as MP3, MP4, M4A or WAV.');
  if(file.size>maxMediaBytes)throw new Error('Choose a file smaller than 250 MB.');
  if(!file.size)throw new Error('That file is empty. Choose another file.');
}
export function validCaptions(captions:Caption[],duration:number) {
  if(captions.some(c=>!Number.isFinite(c.start)||!Number.isFinite(c.end)||c.start<0||c.end<=c.start||c.end>duration+.05||!c.text.trim()))throw new Error('Each caption needs text and a valid start/end time within the file.');
  return [...captions].sort((a,b)=>a.start-b.start);
}
export function subtitleText(captions:Caption[],format:'srt'|'vtt') {
  const time=(seconds:number)=>{const ms=Math.round(seconds*1000),h=Math.floor(ms/3600000),m=Math.floor(ms/60000)%60,s=Math.floor(ms/1000)%60;return [h,m,s].map(v=>String(v).padStart(2,'0')).join(':')+(format==='srt'?',':'.')+String(ms%1000).padStart(3,'0');};
  return (format==='vtt'?'WEBVTT\n\n':'')+captions.map((c,i)=>`${i+1}\n${time(c.start)} --> ${time(c.end)}\n${c.text.trim().replace(/-->/g,'→')}\n`).join('\n');
}
export function saveMediaBlob(blob:Blob,name:string) {
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
export async function decodeMediaAudio(file:File) {
  const context=new AudioContext();
  try{return await context.decodeAudioData(await file.arrayBuffer());}
  catch{throw new Error('No decodable audio was found. The file may be silent or use a codec this browser cannot decode.');}
  finally{await context.close();}
}
export function pcmWav(channels:readonly Float32Array[],sampleRate:number) {
  const count=channels.length,frames=channels[0].length,bytes=new ArrayBuffer(44+frames*count*2),v=new DataView(bytes);
  const text=(at:number,s:string)=>[...s].forEach((c,i)=>v.setUint8(at+i,c.charCodeAt(0)));
  text(0,'RIFF');v.setUint32(4,bytes.byteLength-8,true);text(8,'WAVE');text(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,count,true);v.setUint32(24,sampleRate,true);v.setUint32(28,sampleRate*count*2,true);v.setUint16(32,count*2,true);v.setUint16(34,16,true);text(36,'data');v.setUint32(40,frames*count*2,true);
  for(let i=0;i<frames;i++)for(let c=0;c<count;c++){const sample=Math.max(-1,Math.min(1,channels[c][i]));v.setInt16(44+(i*count+c)*2,sample<0?sample*32768:sample*32767,true);}
  return bytes;
}
export async function extractMediaAudio(file:File,format:'mp3'|'wav',progress:(value:number)=>void) {
  const decoded=await decodeMediaAudio(file);
  // Normalize rate and retain at most stereo; MP3 does not accept arbitrary rates.
  const channels=Math.min(2,decoded.numberOfChannels),sampleRate=44100;
  const offline=new OfflineAudioContext(channels,Math.ceil(decoded.duration*sampleRate),sampleRate),source=offline.createBufferSource();source.buffer=decoded;source.connect(offline.destination);source.start();const audio=await offline.startRendering();
  const pcm=Array.from({length:channels},(_,i)=>new Float32Array(audio.getChannelData(i)));
  if(format==='wav'){progress(100);return new Blob([pcmWav(pcm,sampleRate)],{type:'audio/wav'});}
  return new Promise<Blob>((resolve,reject)=>{
    const worker=new Worker(new URL('./workers/mp3Encoder.ts',import.meta.url),{type:'module'});
    worker.onmessage=({data})=>{if(data.error){worker.terminate();reject(new Error(data.error));}else if(data.bytes){worker.terminate();resolve(new Blob([data.bytes],{type:'audio/mpeg'}));}else progress(data.progress);};
    worker.onerror=()=>{worker.terminate();reject(new Error('MP3 encoding failed. Try WAV instead.'));};
    worker.postMessage({pcm,sampleRate},pcm.map(channel=>channel.buffer));
  });
}
