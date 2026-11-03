import {Mp3Encoder} from '@breezystack/lamejs';
self.onmessage=({data})=>{
  try{
    const {pcm,sampleRate}=data as {pcm:Float32Array[];sampleRate:number};
    const encoder=new Mp3Encoder(pcm.length,sampleRate,192),chunks:Uint8Array[]=[];
    const toInt=(values:Float32Array)=>Int16Array.from(values,v=>Math.max(-1,Math.min(1,v))*(v<0?32768:32767));
    for(let start=0;start<pcm[0].length;start+=1152){const left=toInt(pcm[0].subarray(start,start+1152)),right=pcm[1]?toInt(pcm[1].subarray(start,start+1152)):undefined;const bytes=encoder.encodeBuffer(left,right);if(bytes.length)chunks.push(new Uint8Array(bytes));if(start%115200===0)self.postMessage({progress:Math.round(start/pcm[0].length*100)});}
    chunks.push(new Uint8Array(encoder.flush()));const bytes=new Uint8Array(chunks.reduce((n,c)=>n+c.length,0));let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}self.postMessage({bytes},{transfer:[bytes.buffer]});
  }catch(error){self.postMessage({error:String(error)});}
};
