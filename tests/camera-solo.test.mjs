import assert from 'node:assert/strict'; import fs from 'node:fs'; import ts from 'typescript';
async function module(path){const code=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;return import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));}
const {cameraSoloMix}=await module('src/screenTrims.ts');const {soloCameraRect}=await module('src/layoutGeometry.ts');
const list=[{id:'first',start:0,end:10,visibleEnd:5},{id:'second',start:10,end:20,visibleStart:13}];
assert.equal(cameraSoloMix(list,3,true),0);assert.equal(cameraSoloMix(list,8,true),1);assert.equal(cameraSoloMix(list,16,true,1),0);
const entering=cameraSoloMix(list,5,true);assert(entering>0.4&&entering<0.6);
let previous=cameraSoloMix(list,4,true);for(let t=4+1/60;t<14;t+=1/60){const next=cameraSoloMix(list,t,true,t>=10?1:0);assert(Math.abs(next-previous)<0.05);previous=next;}
assert.equal(cameraSoloMix([{id:'a',start:0,end:5},{id:'b',start:5,end:10}],5,true,1),0,'Adjacent visible clips must not send the camera to center');
assert.equal(cameraSoloMix(list,3,false),1);
const base={x:1000,y:500,width:170,height:127.5};const center=soloCameraRect(base,{width:1280,height:720},1);
assert.equal(center.x+center.width/2,640);assert.equal(center.y+center.height/2,360);assert(Math.abs(center.width/center.height-4/3)<0.0001);assert(center.width>base.width);
assert.deepEqual(soloCameraRect(base,{width:1280,height:720},0),base);
assert.equal(cameraSoloMix([{id:'b',start:10,end:20,visibleStart:13},{id:'a',start:0,end:10,visibleEnd:5}],11,true,0),1,'Reordered source clips must keep camera-only framing');
console.log('Passed: camera-only centering, proportional enlargement, smooth transitions both ways, contiguous clips, reordered clips, and hidden screen track');
