import assert from 'node:assert/strict'; import fs from 'node:fs'; import vm from 'node:vm'; import ts from 'typescript';
const file=ts.createSourceFile('App.tsx',fs.readFileSync('src/App.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let fn;function find(node){if(ts.isFunctionDeclaration(node)&&node.name?.text==='appendScreenBlob')fn=node.getText(file);ts.forEachChild(node,find);}find(file);assert(fn);
const code=ts.transpileModule(fn+'\nglobalThis.append = appendScreenBlob;', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const stored=new Map(), previous={id:'first',start:0,end:10};let settings={camera:false}, urls={};
const context=vm.createContext({Blob,URL,crypto,source:'blob:original',duration:10,recordingSegments:[previous],settings,
  allCameraClips:()=>[], setJoining(){}, soundPlayer:{current:{stop(){}}},video:{current:{pause(){}}},setPlaying(){},
  screenBlobDuration:async()=>3, storeAsset:async(key,blob)=>stored.set(key,blob),
  setScreenAssetURLs(fn){urls=fn(urls);},pendingSourceSeek:{current:null},localStorage:{setItem(){}},setDuration(){},
  setSettings(fn){settings=fn(settings);context.settings=settings;},setSelectedSegment(){},recordSegment:{current:0},setTime(){},
  durationOf:list=>list.reduce((n,s)=>n+s.end-s.start,0),setCompletedExport(){},setFloatingSaveStatus(){},announce(){},appendCapture:{current:true},
});vm.runInContext(code,context);
const blob=new Blob(['independent-second-video'],{type:'video/mp4'});
assert(await context.append(blob));
assert.equal(stored.size,1);assert(!stored.has('screen'),'Appending must never overwrite the original screen asset');
assert.equal(settings.screenAssets.length,2);assert.equal(settings.recordingSegments.length,2);
assert.equal(JSON.stringify(settings.recordingSegments[0]),JSON.stringify(previous));assert.equal(settings.recordingSegments[1].start,10);assert.equal(settings.recordingSegments[1].end,13);
assert.equal(await stored.values().next().value.text(),'independent-second-video','The saved clip must be the unchanged original blob');
assert.equal(settings.screenAssets[1].key,settings.recordingSegments[1].id);
for(const url of Object.values(urls))URL.revokeObjectURL(url);
console.log('Passed: append stores an unchanged independent asset, preserves the first clip, and adds a separate timeline segment without encoding or merging');
settings={camera:false,screenVisible:false};context.settings=settings;
assert(await context.append(blob));
assert.equal(settings.screenVisible,true);
assert.equal(settings.recordingSegments[0].visibleEnd,0,'Removed footage must remain hidden when recording a new screen');
assert.equal(settings.recordingSegments[1].visibleEnd,undefined,'New footage must be visible');
assert.equal(previous.visibleEnd,undefined,'The earlier history snapshot must stay intact for Undo');
for(const url of Object.values(urls))URL.revokeObjectURL(url);
console.log('Passed: a new recording keeps removed footage hidden and preserves the prior snapshot for Undo');
