import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';
const code=ts.transpileModule(fs.readFileSync('src/recordedPointer.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const {recordedPointerAt}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const samples=Array.from({length:31},(_,i)=>({time:i/30,x:i/30,y:.5}));
const at=t=>recordedPointerAt(samples,t).x;
const epsilon=.00001,edge=.5;
const left=(at(edge)-at(edge-epsilon))/epsilon,right=(at(edge+epsilon)-at(edge))/epsilon;
assert(Math.abs(left-right)<.005);assert(left>.9,'Movement must not stop at a telemetry sample');
assert.deepEqual(recordedPointerAt(samples,.42),recordedPointerAt(samples,.42));
for(let t=0;t<=1;t+=.01){const p=recordedPointerAt(samples,t);assert(p.x>=0&&p.x<=1);assert(Math.abs(p.y-.5)<.00001);}
assert.equal(recordedPointerAt([],0),null);
console.log('Passed: continuous cursor velocity through sample boundaries, stable seeking, bounded position, and empty telemetry');
const stop=[{time:0,x:.1,y:.2},{time:.1,x:.1,y:.2},{time:.2,x:.8,y:.2},{time:.3,x:.8,y:.2},{time:.4,x:.8,y:.2}];
let last=-1;
for(let t=0;t<=.4;t+=.001){const p=recordedPointerAt(stop,t);assert(p.x>=.1-1e-8&&p.x<=.8+1e-8);assert(p.x>=last-1e-8,'A straight cursor movement must not reverse or overshoot');last=p.x;}
console.log('Passed: smoothed cursor glides into a stop without reversing or overshooting');
