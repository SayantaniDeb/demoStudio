import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';
const load=async path=>import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText).toString('base64'));
const {automaticCursorOutline}=await load('src/cursorMorph.ts'),{pointerLayers}=await load('src/automaticPointer.ts');
const samples=[{time:0,click:false,shape:'arrow'},{time:1,click:false,shape:'hand'},{time:2,click:false,shape:'ibeam'},{time:3,click:false,shape:'arrow'}];
let previous;
for(let t=0;t<=4;t+=.001){const points=automaticCursorOutline(pointerLayers(samples,t));assert.equal(points.length,96);const ys=points.map(p=>p.y);assert(Math.abs(Math.max(...ys)-Math.min(...ys)-1)<1e-9,'Pointer height stays fixed');assert(points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));if(previous)assert(Math.max(...points.map((p,i)=>Math.hypot(p.x-previous[i].x,p.y-previous[i].y)))<.04,'No outline jumps during automatic switching');previous=points;}
const layers=pointerLayers(samples,1.04);assert.deepEqual(automaticCursorOutline(layers),automaticCursorOutline(layers));
let fills=0;const ctx=new Proxy({},{get:(_,key)=>key==='fill'?()=>fills++:()=>{},set:()=>true});
const {paintAutomaticCursor}=await load('src/cursorMorph.ts');paintAutomaticCursor(ctx,0,0,28,layers);assert.equal(fills,1,'Render one silhouette instead of overlapping cursor shapes');
console.log('Passed: continuous arrow/hand/text outline changes, constant height, deterministic seeking and one rendered silhouette');
