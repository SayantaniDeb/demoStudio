import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';
const code=ts.transpileModule(fs.readFileSync('src/moveTimelineClip.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ES2022}}).outputText;
const {moveTimelineClip}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
let n=0; const gap=length=>({id:'gap'+n++,start:100,end:100+length,visibleEnd:100,gap:true});
const a={id:'a',start:0,end:5},b={id:'b',start:5,end:10};
let moved=moveTimelineClip([a,b],0,12,gap);
let at=0,positions={};for(const s of moved){if(!s.gap)positions[s.id]=at;at+=s.end-s.start;}
assert.equal(positions.b,5);assert.equal(positions.a,12);assert.equal(at,17);
moved=moveTimelineClip(moved,moved.findIndex(s=>s.id==='a'),0,gap);
assert.equal(moved[0],a);assert.equal(moved[1],b);
assert.equal(a.start,0);assert.equal(a.end,5);
assert.equal(moveTimelineClip([a,b],0,0,gap)[0],a);
console.log('Passed: free placement creates gaps, preserves source media and other clip positions, and supports moving backward');
