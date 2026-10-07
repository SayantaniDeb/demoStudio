export async function transcribeAudio(audio,{key=process.env.GROQ_API_KEY,fetchImpl=fetch}={}){
 if(!key)throw new Error('Add GROQ_API_KEY to enable speech captions.');
 const form=new FormData();form.append('file',new Blob([audio],{type:'audio/wav'}),'speech.wav');form.append('model','whisper-large-v3-turbo');form.append('response_format','verbose_json');form.append('timestamp_granularities[]','segment');
 const response=await fetchImpl('https://api.groq.com/openai/v1/audio/transcriptions',{method:'POST',headers:{Authorization:`Bearer ${key}`},body:form,signal:AbortSignal.timeout(120000)});
 if(!response.ok){if(response.status===429)throw new Error('Speech transcription is rate limited. Try again shortly.');throw new Error(`Speech transcription failed (${response.status}).`)}
 const data=await response.json();const segments=(data.segments||[]).filter(s=>Number.isFinite(s.start)&&Number.isFinite(s.end)&&s.end>s.start&&typeof s.text==='string'&&s.text.trim()&&(s.no_speech_prob??0)<.8).map(s=>({start:s.start,end:s.end,text:s.text.trim().slice(0,1000)}));
 return {segments:segments.flatMap(s=>{const words=s.text.split(/\s+/),result=[];for(let i=0;i<words.length;i+=8)result.push({start:s.start+(s.end-s.start)*i/words.length,end:s.start+(s.end-s.start)*Math.min(words.length,i+8)/words.length,text:words.slice(i,i+8).join(' ')});return result})};
}
export function captionMiddleware(req,res){
 res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST'){res.statusCode=405;res.end(JSON.stringify({error:'POST required'}));return}
 if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host){res.statusCode=403;res.end(JSON.stringify({error:'Origin rejected'}));return}
 if(!req.headers['content-type']?.startsWith('audio/wav')){res.statusCode=400;res.end(JSON.stringify({error:'WAV audio required'}));return}
 const chunks=[];let size=0,tooLarge=false;req.on('data',chunk=>{size+=chunk.length;if(size>24000000){tooLarge=true;chunks.length=0}else if(!tooLarge)chunks.push(chunk)});req.on('end',async()=>{try{if(tooLarge)throw Error('Audio chunk is too large.');if(size<44)throw Error('Audio is empty.');res.end(JSON.stringify(await transcribeAudio(Buffer.concat(chunks))))}catch(e){res.statusCode=400;res.end(JSON.stringify({error:e.message}))}});
}
