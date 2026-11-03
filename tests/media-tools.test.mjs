import fs from 'node:fs';import assert from 'node:assert/strict';import ts from 'typescript';
const code=ts.transpileModule(fs.readFileSync('src/mediaTools.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const {validateMediaFile,validCaptions,subtitleText,pcmWav}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
validateMediaFile({name:'clip.mp4',type:'video/mp4',size:100});validateMediaFile({name:'audio.MP3',type:'',size:100});
assert.throws(()=>validateMediaFile({name:'image.png',type:'image/png',size:100}));assert.throws(()=>validateMediaFile({name:'clip.mp4',type:'video/mp4',size:251*1024*1024}));
assert.throws(()=>validCaptions([{start:1,end:.5,text:'bad'}],3));assert.throws(()=>validCaptions([{start:0,end:4,text:'bad'}],3));
const captions=[{start:1.9999,end:3,text:'Hello → world'}];assert(subtitleText(captions,'srt').includes('00:00:02,000 --> 00:00:03,000'));assert(subtitleText(captions,'vtt').startsWith('WEBVTT\n\n'));
const wav=pcmWav([new Float32Array([-1,0,1]),new Float32Array([.5,-.5,0])],44100),v=new DataView(wav);assert.equal(v.getUint16(22,true),2);assert.equal(v.getUint32(24,true),44100);assert.equal(v.getInt16(44,true),-32768);assert.equal(v.getInt16(52,true),32767);assert.equal(v.getUint32(40,true),12);
console.log('Passed: media validation, caption timing validation, timestamp rounding, and stereo PCM WAV encoding');
