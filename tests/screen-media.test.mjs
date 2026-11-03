import vm from 'node:vm'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import ts from 'typescript';
const code=ts.transpileModule(fs.readFileSync('src/screenMedia.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {assetAt,configureScreenMedia,seekMediaTime,mediaTime,mediaDuration,disconnectScreenMedia}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
let now=0;Object.defineProperty(globalThis,'performance',{value:{now:()=>now},configurable:true});
class Video extends EventTarget {
  src='first';currentTime=0;duration=2;readyState=4;paused=true;loop=false;
  getAttribute(key){return key==='src'?this.src:null;}
  load(){this.readyState=0;queueMicrotask(()=>{this.duration=this.src==='first'?2:3;this.readyState=4;this.dispatchEvent(new Event('loadedmetadata'));this.dispatchEvent(new Event('loadeddata'));});}
  play(){this.paused=false;this.dispatchEvent(new Event('play'));return Promise.resolve();}
  pause(){this.paused=true;this.dispatchEvent(new Event('pause'));}
}
const assets=[{id:'a',key:'screen',url:'first',start:0,duration:2},{id:'b',key:'b',url:'second',start:2,duration:3}];
assert.equal(assetAt(assets,2).id,'b');
const video=new Video();configureScreenMedia(video,assets);
seekMediaTime(video,3);assert.equal(video.src,'second');assert.equal(mediaTime(video),3);
await new Promise(queueMicrotask);assert.equal(video.currentTime,1);assert.equal(mediaTime(video),3);assert.equal(mediaDuration(video),5);
seekMediaTime(video,0.5);await new Promise(queueMicrotask);assert.equal(video.src,'first');assert.equal(video.currentTime,0.5);
// Reordering timeline segments just seeks their original source coordinate; no media merge is needed.
seekMediaTime(video,4);await new Promise(queueMicrotask);assert.equal(video.src,'second');assert.equal(video.currentTime,2);
configureScreenMedia(video,[...assets,{id:'blank',key:'screen',url:'first',start:5,duration:4,blank:true}]);
seekMediaTime(video,6);await new Promise(queueMicrotask);assert(video.loop);assert.equal(mediaTime(video),6);
await video.play();now=1000;assert.equal(mediaTime(video),7);video.pause();now=3000;assert.equal(mediaTime(video),7);
assert.equal(mediaDuration(video),9);disconnectScreenMedia(video);assert.equal(video.loop,false);
console.log('Passed: separate source switching, local/global seeking, clip-boundary selection, reordered playback, total duration, and blank canvas time');

const app = ts.createSourceFile('App.tsx', fs.readFileSync('src/App.tsx','utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let onTime;
function visit(node) {if(ts.isFunctionDeclaration(node) && node.name?.text === 'onRecordingTime') onTime = node.getText(app);ts.forEachChild(node,visit);}
visit(app);assert(onTime);
const transitionVideo = new Video(); configureScreenMedia(transitionVideo, assets); transitionVideo.currentTime = 2;
const position = {current:0};let stopped=false;
const context=vm.createContext({syncClipAudio(){},cameraTakeRecorder:{current:null},exporting:false,recreated:false,pointerMode:'off',
  recordSegment:position,recordingSegments:[{id:'a',start:0,end:2},{id:'b',start:2,end:5}],setTime(){},durationOf:list=>list.reduce((n,s)=>n+s.end-s.start,0),
  mediaTime,seekMediaTime,camera:{current:null},playing:true,soundPlayer:{current:{stop(){}}},setPlaying(value){stopped=!value;},
});
vm.runInContext(ts.transpileModule(onTime+';globalThis.advance=onRecordingTime;',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);
context.advance(transitionVideo);await new Promise(queueMicrotask);
assert.equal(position.current,1);assert.equal(transitionVideo.src,'second');assert.equal(mediaTime(transitionVideo),2);assert(!transitionVideo.paused);
transitionVideo.currentTime=3;context.advance(transitionVideo);assert(stopped);assert(transitionVideo.paused);
console.log('Passed: production playback advances from the first file to the second and stops at the final clip boundary');
